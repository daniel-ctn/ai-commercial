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
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
      missingImages,
      missingDescriptions,
      missingAttributes,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.shopsRepo.count(),
      this.shopsRepo.count({ where: { is_active: true } }),
      this.productsRepo.count(),
      this.productsRepo.count({ where: { is_active: true } }),
      this.couponsRepo.count(),
      this.couponsRepo.count({ where: { is_active: true } }),
      this.categoriesRepo.count(),
      this.productsRepo.createQueryBuilder('p')
        .where('p.image_url IS NULL OR p.image_url = :empty', { empty: '' })
        .getCount(),
      this.productsRepo.createQueryBuilder('p')
        .where('p.description IS NULL OR p.description = :empty', { empty: '' })
        .getCount(),
      this.productsRepo.createQueryBuilder('p')
        .where("p.attributes IS NULL OR p.attributes = :empty", { empty: '{}' })
        .getCount(),
    ]);

    const productsByCategory = await this.productsRepo
      .createQueryBuilder('p')
      .select('c.name', 'category')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('p.category', 'c')
      .groupBy('c.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      total_users: totalUsers,
      total_shops: totalShops,
      active_shops: activeShops,
      total_products: totalProducts,
      active_products: activeProducts,
      total_coupons: totalCoupons,
      active_coupons: activeCoupons,
      total_categories: totalCategories,
      data_quality: {
        missing_images: missingImages,
        missing_descriptions: missingDescriptions,
        missing_attributes: missingAttributes,
      },
      products_by_category: productsByCategory,
    };
  }

  async getShopStats(shopId: string) {
    const shop = await this.shopsRepo.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const [totalProducts, activeProducts, totalCoupons, activeCoupons, missingImages, missingDescriptions] =
      await Promise.all([
        this.productsRepo.count({ where: { shop_id: shopId } }),
        this.productsRepo.count({ where: { shop_id: shopId, is_active: true } }),
        this.couponsRepo.count({ where: { shop_id: shopId } }),
        this.couponsRepo.count({ where: { shop_id: shopId, is_active: true } }),
        this.productsRepo.createQueryBuilder('p')
          .where('p.shop_id = :shopId', { shopId })
          .andWhere('(p.image_url IS NULL OR p.image_url = :empty)', { empty: '' })
          .getCount(),
        this.productsRepo.createQueryBuilder('p')
          .where('p.shop_id = :shopId', { shopId })
          .andWhere('(p.description IS NULL OR p.description = :empty)', { empty: '' })
          .getCount(),
      ]);

    const qualityScore = this.calculateQualityScore(totalProducts, missingImages, missingDescriptions);

    return {
      shop_id: shopId,
      shop_name: shop.name,
      total_products: totalProducts,
      active_products: activeProducts,
      total_coupons: totalCoupons,
      active_coupons: activeCoupons,
      data_quality: {
        missing_images: missingImages,
        missing_descriptions: missingDescriptions,
        quality_score: qualityScore,
      },
    };
  }

  private calculateQualityScore(
    total: number,
    missingImages: number,
    missingDescriptions: number,
  ): number {
    if (total === 0) return 100;
    const imageScore = ((total - missingImages) / total) * 50;
    const descScore = ((total - missingDescriptions) / total) * 50;
    return Math.round(imageScore + descScore);
  }

  async bulkToggleProducts(productIds: string[], activate: boolean): Promise<{ affected: number }> {
    if (productIds.length === 0) {
      return { affected: 0 };
    }

    const result = await this.productsRepo
      .createQueryBuilder()
      .update()
      .set({ is_active: activate })
      .whereInIds(productIds)
      .execute();
    return { affected: result.affected ?? 0 };
  }

  async bulkToggleCoupons(couponIds: string[], activate: boolean): Promise<{ affected: number }> {
    if (couponIds.length === 0) {
      return { affected: 0 };
    }

    const result = await this.couponsRepo
      .createQueryBuilder()
      .update()
      .set({ is_active: activate })
      .whereInIds(couponIds)
      .execute();
    return { affected: result.affected ?? 0 };
  }

  async bulkAssignCategory(productIds: string[], categoryId: string): Promise<{ affected: number }> {
    if (productIds.length === 0) {
      return { affected: 0 };
    }

    await this.ensureCategoryExists(categoryId);

    const result = await this.productsRepo
      .createQueryBuilder()
      .update()
      .set({ category_id: categoryId })
      .whereInIds(productIds)
      .execute();
    return { affected: result.affected ?? 0 };
  }

  async bulkToggleProductsForShop(
    productIds: string[],
    activate: boolean,
    shopId: string,
  ): Promise<{ affected: number }> {
    if (productIds.length === 0) {
      return { affected: 0 };
    }

    const result = await this.productsRepo
      .createQueryBuilder()
      .update()
      .set({ is_active: activate })
      .whereInIds(productIds)
      .andWhere('shop_id = :shopId', { shopId })
      .execute();

    return { affected: result.affected ?? 0 };
  }

  async bulkAssignCategoryForShop(
    productIds: string[],
    categoryId: string,
    shopId: string,
  ): Promise<{ affected: number }> {
    if (productIds.length === 0) {
      return { affected: 0 };
    }

    await this.ensureCategoryExists(categoryId);

    const result = await this.productsRepo
      .createQueryBuilder()
      .update()
      .set({ category_id: categoryId })
      .whereInIds(productIds)
      .andWhere('shop_id = :shopId', { shopId })
      .execute();

    return { affected: result.affected ?? 0 };
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
    const product = await this.findProductOrThrow(productId);

    product.is_active = !product.is_active;
    return this.productsRepo.save(product);
  }

  async toggleProductActiveForShop(productId: string, shopId: string): Promise<Product> {
    const product = await this.findProductOrThrow(productId);
    if (product.shop_id !== shopId) {
      throw new ForbiddenException('Product does not belong to your shop');
    }

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
    const coupon = await this.findCouponOrThrow(couponId);

    coupon.is_active = !coupon.is_active;
    return this.couponsRepo.save(coupon);
  }

  async toggleCouponActiveForShop(couponId: string, shopId: string): Promise<Coupon> {
    const coupon = await this.findCouponOrThrow(couponId);
    if (coupon.shop_id !== shopId) {
      throw new ForbiddenException('Coupon does not belong to your shop');
    }

    coupon.is_active = !coupon.is_active;
    return this.couponsRepo.save(coupon);
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categoriesRepo.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async findProductOrThrow(productId: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id: productId },
      relations: ['shop', 'category'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async findCouponOrThrow(couponId: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({
      where: { id: couponId },
      relations: ['shop'],
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }
}
