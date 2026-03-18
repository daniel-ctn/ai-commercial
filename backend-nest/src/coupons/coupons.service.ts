import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { Shop } from '../shops/entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { RedisService } from '../redis/redis.service';

const COUPON_LIST_CACHE_VERSION_KEY = 'coupons:list:version';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepo: Repository<Coupon>,
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
    private readonly redisService: RedisService,
  ) {}

  async findAll(query: QueryCouponsDto): Promise<PaginatedResponse<Coupon>> {
    const listVersion = await this.getListCacheVersion(COUPON_LIST_CACHE_VERSION_KEY);
    const cacheKey = `coupons:list:v${listVersion}:${query.page}:${query.page_size}:${query.shop_id || ''}:${query.active_only}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return new PaginatedResponse(parsed.items, parsed.total, parsed.page, parsed.page_size);
    }

    const qb = this.couponsRepo.createQueryBuilder('coupon');

    if (query.shop_id) {
      qb.andWhere('coupon.shop_id = :shopId', { shopId: query.shop_id });
    }

    if (query.active_only) {
      const now = new Date().toISOString();
      qb.andWhere('coupon.is_active = :active', { active: true });
      qb.andWhere('coupon.valid_from <= :now', { now });
      qb.andWhere('coupon.valid_until >= :now', { now });
    }

    qb.orderBy('coupon.valid_until', 'ASC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    const response = new PaginatedResponse(items, total, query.page, query.page_size);
    
    await this.redisService.set(cacheKey, JSON.stringify(response), 60);
    
    return response;
  }

  async findById(id: string): Promise<Coupon> {
    const cacheKey = `coupon:detail:${id}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const coupon = await this.findByIdFromDb(id);

    await this.redisService.set(cacheKey, JSON.stringify(coupon), 60);
    return coupon;
  }

  private async findByIdFromDb(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async create(dto: CreateCouponDto, user: User): Promise<Coupon> {
    await this.assertShopOwnership(dto.shop_id, user);

    const validFrom = new Date(dto.valid_from);
    const validUntil = new Date(dto.valid_until);
    this.validateCouponRules(dto.discount_type, dto.discount_value, validFrom, validUntil);

    const coupon = this.couponsRepo.create({
      ...dto,
      valid_from: validFrom,
      valid_until: validUntil,
    });
    const saved = await this.couponsRepo.save(coupon);
    await this.bumpListCacheVersion(COUPON_LIST_CACHE_VERSION_KEY);
    return saved;
  }

  async update(id: string, dto: UpdateCouponDto, user: User): Promise<Coupon> {
    const coupon = await this.findByIdFromDb(id);
    await this.assertShopOwnership(coupon.shop_id, user);

    const discountType = dto.discount_type ?? coupon.discount_type;
    const discountValue = dto.discount_value ?? coupon.discount_value;
    const validFrom = dto.valid_from ? new Date(dto.valid_from) : coupon.valid_from;
    const validUntil = dto.valid_until ? new Date(dto.valid_until) : coupon.valid_until;

    this.validateCouponRules(discountType, discountValue, validFrom, validUntil);

    const { valid_from, valid_until, ...rest } = dto;
    Object.assign(coupon, rest);

    if (valid_from) coupon.valid_from = new Date(valid_from);
    if (valid_until) coupon.valid_until = new Date(valid_until);

    const saved = await this.couponsRepo.save(coupon);
    await this.redisService.del(`coupon:detail:${id}`);
    await this.bumpListCacheVersion(COUPON_LIST_CACHE_VERSION_KEY);
    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const coupon = await this.findByIdFromDb(id);
    await this.assertShopOwnership(coupon.shop_id, user);
    await this.couponsRepo.remove(coupon);
    await this.redisService.del(`coupon:detail:${id}`);
    await this.bumpListCacheVersion(COUPON_LIST_CACHE_VERSION_KEY);
  }

  private async assertShopOwnership(
    shopId: string,
    user: User,
  ): Promise<void> {
    if (user.role === 'admin') return;

    const shop = await this.shopsRepo.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.owner_id !== user.id) {
      throw new ForbiddenException('You do not own this shop');
    }
  }

  private validateCouponRules(
    discountType: string,
    discountValue: number,
    validFrom: Date,
    validUntil: Date,
  ): void {
    if (discountType === 'percentage' && discountValue > 100) {
      throw new BadRequestException(
        'discount_value cannot exceed 100 for percentage type',
      );
    }

    if (Number.isNaN(validFrom.getTime())) {
      throw new BadRequestException('valid_from must be a valid date');
    }

    if (Number.isNaN(validUntil.getTime())) {
      throw new BadRequestException('valid_until must be a valid date');
    }

    if (validUntil <= validFrom) {
      throw new BadRequestException('valid_until must be after valid_from');
    }
  }

  private async getListCacheVersion(key: string): Promise<string> {
    const version = await this.redisService.get(key);
    return version ?? '0';
  }

  private async bumpListCacheVersion(key: string): Promise<void> {
    try {
      await this.redisService.incr(key);
    } catch (error) {
      this.logger.warn(`Redis version bump failed for key ${key}: ${String(error)}`);
    }
  }
}
