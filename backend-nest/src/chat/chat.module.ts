import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Product } from '../products/entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Category } from '../categories/entities/category.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiService } from './ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatSession,
      ChatMessage,
      Product,
      Shop,
      Category,
      Coupon,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, AiService],
})
export class ChatModule {}
