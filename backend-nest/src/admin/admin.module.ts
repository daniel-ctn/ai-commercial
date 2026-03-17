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
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Product } from '../products/entities/product.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Category } from '../categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Shop, Product, Coupon, Category])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
