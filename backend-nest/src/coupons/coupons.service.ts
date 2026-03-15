import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepo: Repository<Coupon>,
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
  ) {}

  async findAll(query: QueryCouponsDto): Promise<PaginatedResponse<Coupon>> {
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
    return new PaginatedResponse(items, total, query.page, query.page_size);
  }

  async findById(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async create(dto: CreateCouponDto, user: User): Promise<Coupon> {
    await this.assertShopOwnership(dto.shop_id, user);

    const coupon = this.couponsRepo.create({
      ...dto,
      valid_from: new Date(dto.valid_from),
      valid_until: new Date(dto.valid_until),
    });
    return this.couponsRepo.save(coupon);
  }

  async update(id: string, dto: UpdateCouponDto, user: User): Promise<Coupon> {
    const coupon = await this.findById(id);
    await this.assertShopOwnership(coupon.shop_id, user);

    const updateData: Partial<Coupon> = { ...dto } as Partial<Coupon>;
    const rawDto = dto as Record<string, unknown>;
    if (rawDto.valid_from) updateData.valid_from = new Date(rawDto.valid_from as string);
    if (rawDto.valid_until) updateData.valid_until = new Date(rawDto.valid_until as string);

    Object.assign(coupon, updateData);
    return this.couponsRepo.save(coupon);
  }

  async remove(id: string, user: User): Promise<void> {
    const coupon = await this.findById(id);
    await this.assertShopOwnership(coupon.shop_id, user);
    await this.couponsRepo.remove(coupon);
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
}
