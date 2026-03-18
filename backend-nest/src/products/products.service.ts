/**
 * Products Service — the most complex CRUD with multiple filters
 *
 * Demonstrates advanced QueryBuilder usage:
 *   .leftJoinAndSelect() → eager-loads relations (like Prisma `include`)
 *   .andWhere() with parameters → prevents SQL injection (like Prisma's `where`)
 *   .orWhere() with Brackets → groups OR conditions
 *
 * The `category` filter accepts either a UUID or a slug string —
 * we use a UUID regex to determine which one was provided.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Shop } from '../shops/entities/shop.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { RedisService } from '../redis/redis.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
    private readonly redisService: RedisService,
  ) {}

  async findAll(
    query: QueryProductsDto,
  ): Promise<PaginatedResponse<Product>> {
    const cacheKey = `products:list:${query.page}:${query.page_size}:${query.search || ''}:${query.category || ''}:${query.shop_id || ''}:${query.min_price || ''}:${query.max_price || ''}:${query.on_sale || ''}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return new PaginatedResponse(parsed.items, parsed.total, parsed.page, parsed.page_size);
    }

    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('product.category', 'category');

    qb.where('product.is_active = :active', { active: true });

    if (query.search) {
      qb.andWhere(
        `product.search_vector @@ websearch_to_tsquery('english', :search)`,
        { search: query.search }
      );
    }

    if (query.category) {
      if (UUID_REGEX.test(query.category)) {
        qb.andWhere('product.category_id = :catId', {
          catId: query.category,
        });
      } else {
        qb.andWhere('category.slug = :catSlug', {
          catSlug: query.category,
        });
      }
    }

    if (query.shop_id) {
      qb.andWhere('product.shop_id = :shopId', { shopId: query.shop_id });
    }

    if (query.min_price !== undefined) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: query.min_price,
      });
    }

    if (query.max_price !== undefined) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: query.max_price,
      });
    }

    if (query.on_sale) {
      qb.andWhere('product.original_price IS NOT NULL');
      qb.andWhere('product.original_price > product.price');
    }

    qb.orderBy('product.created_at', 'DESC');
    qb.skip((query.page - 1) * query.page_size);
    qb.take(query.page_size);

    const [items, total] = await qb.getManyAndCount();
    const response = new PaginatedResponse(items, total, query.page, query.page_size);
    
    await this.redisService.set(cacheKey, JSON.stringify(response), 60);
    
    return response;
  }

  async findById(id: string): Promise<Product> {
    const cacheKey = `product:detail:${id}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const product = await this.findByIdFromDb(id);

    await this.redisService.set(cacheKey, JSON.stringify(product), 60);

    return product;
  }

  private async findByIdFromDb(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({
      where: { id },
      relations: ['shop', 'category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto, user: User): Promise<Product> {
    await this.assertShopOwnership(dto.shop_id, user);

    const product = this.productsRepo.create(dto);
    return this.productsRepo.save(product);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: User,
  ): Promise<Product> {
    const product = await this.findByIdFromDb(id);
    await this.assertShopOwnership(product.shop_id, user);

    Object.assign(product, dto);
    const saved = await this.productsRepo.save(product);
    await this.redisService.del(`product:detail:${id}`);
    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const product = await this.findByIdFromDb(id);
    await this.assertShopOwnership(product.shop_id, user);
    await this.productsRepo.remove(product);
    await this.redisService.del(`product:detail:${id}`);
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
