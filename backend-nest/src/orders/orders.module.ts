import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CartService } from './cart.service';
import { OrdersService } from './orders.service';
import { CartController } from './cart.controller';
import { OrdersController, WebhooksController } from './orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Order, OrderItem, Product, Coupon]),
  ],
  controllers: [CartController, OrdersController, WebhooksController],
  providers: [CartService, OrdersService],
  exports: [CartService, OrdersService],
})
export class OrdersModule {}
