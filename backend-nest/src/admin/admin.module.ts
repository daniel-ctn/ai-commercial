/**
 * Admin Module — aggregates all entities for admin dashboard
 *
 * == Module Imports (for Next.js devs) ==
 *
 * Unlike Next.js where everything is file-system based, NestJS modules
 * explicitly declare their dependencies. This module needs repositories
 * for User, Shop, Product, Coupon, and Category to run aggregate queries.
 *
 * TypeOrmModule.forFeature([...]) registers these repositories so
 * the AdminService can @InjectRepository() them. Think of it like
 * importing multiple Prisma models into a single server action file.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { ShopAdminController } from './shop-admin.controller';
import { AdminService } from './admin.service';
import { AiCatalogService } from './ai-catalog.service';
import { User } from '../users/entities/user.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Product } from '../products/entities/product.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Category } from '../categories/entities/category.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Shop, Product, Coupon, Category]),
    OrdersModule,
  ],
  controllers: [AdminController, ShopAdminController],
  providers: [AdminService, AiCatalogService],
  exports: [AdminService],
})
export class AdminModule {}
