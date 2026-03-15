import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  // We import Shop entity too because ProductsService needs to check shop ownership
  imports: [TypeOrmModule.forFeature([Product, Shop])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
