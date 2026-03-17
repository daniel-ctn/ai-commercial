/**
 * Shops Service — business logic for shop CRUD
 *
 * Demonstrates TypeORM QueryBuilder — like Prisma's findMany with where/include,
 * but more SQL-like. You chain methods:
 *   .where()        → WHERE clause
 *   .andWhere()     → AND condition
 *   .leftJoinAndSelect() → JOIN + load relation (like Prisma include)
 *   .skip() / .take()    → pagination (like Prisma skip/take)
 *   .getManyAndCount()   → returns [items, totalCount] in one query
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { QueryShopsDto } from './dto/query-shops.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryShopsDto): Promise<PaginatedResponse<Shop>> {
    const qb = this.shopsRepo.createQueryBuilder('shop');

    qb.where('shop.is_active = :active', { active: true });

    if (query.search) {
      qb.andWhere('LOWER(shop.name) LIKE :search', {
        search: `%${query.search.toLowerCase()}%`,
      });
    }

    qb.orderBy('shop.created_at', 'DESC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponse(items, total, query.page, query.page_size);
  }

  async findById(id: string): Promise<Shop> {
    const shop = await this.shopsRepo.findOne({ where: { id } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return shop;
  }

  async create(dto: CreateShopDto, user: User): Promise<Shop> {
    return this.dataSource.transaction(async (manager) => {
      const shop = manager.create(Shop, {
        ...dto,
        owner_id: user.id,
      });

      const saved = await manager.save(shop);

      if (user.role === 'user') {
        await manager.update(User, user.id, { role: 'shop_admin' });
      }

      return saved;
    });
  }

  async update(id: string, dto: UpdateShopDto, user: User): Promise<Shop> {
    const shop = await this.findById(id);
    this.assertOwnership(shop, user);
    Object.assign(shop, dto);
    return this.shopsRepo.save(shop);
  }

  async remove(id: string, user: User): Promise<void> {
    const shop = await this.findById(id);
    this.assertOwnership(shop, user);
    await this.shopsRepo.remove(shop);
  }

  private assertOwnership(shop: Shop, user: User): void {
    if (user.role === 'admin') return;
    if (shop.owner_id !== user.id) {
      throw new ForbiddenException('You do not own this shop');
    }
  }
}
