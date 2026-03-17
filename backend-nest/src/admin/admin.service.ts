/**
 * Admin Service — aggregates data across all entities for the dashboard
 *
 * == Service Layer (for Next.js devs) ==
 *
 * In Next.js, you'd put this logic in server actions or API route handlers.
 * In NestJS, the service layer separates business logic from HTTP handling.
 *
 * The controller handles request/response; the service handles data.
 * This makes the logic reusable (e.g., a future GraphQL layer could
 * use the same service) and easier to test (mock the repository).
 *
 * == Repository Pattern ==
 *
 * Each @InjectRepository() gives us a TypeORM Repository<Entity> —
 * like having a separate Prisma client scoped to one table.
 * It provides .find(), .count(), .save(), .createQueryBuilder(), etc.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Product } from '../products/entities/product.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Category } from '../categories/entities/category.entity';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
  AdminUsersQueryDto,
  AdminShopsQueryDto,
  AdminProductsQueryDto,
  AdminCouponsQueryDto,
} from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Shop) private readonly shopsRepo: Repository<Shop>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Coupon) private readonly couponsRepo: Repository<Coupon>,
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
  ) {}

  async getStats() {
    const [
      totalUsers,
      totalShops,
      activeShops,
      totalProducts,
      activeProducts,
      totalCoupons,
      activeCoupons,
      totalCategories,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.shopsRepo.count(),
      this.shopsRepo.count({ where: { is_active: true } }),
      this.productsRepo.count(),
      this.productsRepo.count({ where: { is_active: true } }),
      this.couponsRepo.count(),
      this.couponsRepo.count({ where: { is_active: true } }),
      this.categoriesRepo.count(),
    ]);

    return {
      total_users: totalUsers,
      total_shops: totalShops,
      active_shops: activeShops,
      total_products: totalProducts,
      active_products: activeProducts,
      total_coupons: totalCoupons,
      active_coupons: activeCoupons,
      total_categories: totalCategories,
    };
  }

  // ── Users ─────────────────────────────────────────────────────

  async findAllUsers(query: AdminUsersQueryDto): Promise<PaginatedResponse<User>> {
    const qb = this.usersRepo.createQueryBuilder('user');

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(user.name) LIKE :search', {
              search: `%${query.search!.toLowerCase()}%`,
            })
            .orWhere('LOWER(user.email) LIKE :search', {
              search: `%${query.search!.toLowerCase()}%`,
            });
        }),
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.created_at', 'DESC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponse(items, total, query.page, query.page_size);
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.role = role;
    return this.usersRepo.save(user);
  }

  // ── Shops ─────────────────────────────────────────────────────

  async findAllShops(query: AdminShopsQueryDto): Promise<PaginatedResponse<Shop>> {
    const qb = this.shopsRepo
      .createQueryBuilder('shop')
      .leftJoinAndSelect('shop.owner', 'owner');

    if (query.search) {
      qb.andWhere('LOWER(shop.name) LIKE :search', {
        search: `%${query.search!.toLowerCase()}%`,
      });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('shop.is_active = :active', { active: query.is_active });
    }

    qb.orderBy('shop.created_at', 'DESC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponse(items, total, query.page, query.page_size);
  }

  async toggleShopActive(shopId: string): Promise<Shop> {
    const shop = await this.shopsRepo.findOne({
      where: { id: shopId },
      relations: ['owner'],
    });
    if (!shop) throw new NotFoundException('Shop not found');

    shop.is_active = !shop.is_active;
    return this.shopsRepo.save(shop);
  }

  // ── Products ──────────────────────────────────────────────────

  async findAllProducts(query: AdminProductsQueryDto): Promise<PaginatedResponse<Product>> {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('product.category', 'category');

    if (query.search) {
      qb.andWhere('LOWER(product.name) LIKE :search', {
        search: `%${query.search!.toLowerCase()}%`,
      });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('product.is_active = :active', { active: query.is_active });
    }

    if (query.shop_id) {
      qb.andWhere('product.shop_id = :shopId', { shopId: query.shop_id });
    }

    qb.orderBy('product.created_at', 'DESC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponse(items, total, query.page, query.page_size);
  }

  async toggleProductActive(productId: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id: productId },
      relations: ['shop', 'category'],
    });
    if (!product) throw new NotFoundException('Product not found');

    product.is_active = !product.is_active;
    return this.productsRepo.save(product);
  }

  // ── Coupons ───────────────────────────────────────────────────

  async findAllCoupons(query: AdminCouponsQueryDto): Promise<PaginatedResponse<Coupon>> {
    const qb = this.couponsRepo
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.shop', 'shop');

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(coupon.code) LIKE :search', {
              search: `%${query.search!.toLowerCase()}%`,
            })
            .orWhere('LOWER(coupon.description) LIKE :search', {
              search: `%${query.search!.toLowerCase()}%`,
            });
        }),
      );
    }

    if (query.is_active !== undefined) {
      qb.andWhere('coupon.is_active = :active', { active: query.is_active });
    }

    if (query.shop_id) {
      qb.andWhere('coupon.shop_id = :shopId', { shopId: query.shop_id });
    }

    qb.orderBy('coupon.valid_until', 'DESC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponse(items, total, query.page, query.page_size);
  }

  async toggleCouponActive(couponId: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({
      where: { id: couponId },
      relations: ['shop'],
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    coupon.is_active = !coupon.is_active;
    return this.couponsRepo.save(coupon);
  }
}
