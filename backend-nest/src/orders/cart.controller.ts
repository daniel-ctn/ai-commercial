import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: { id: string }) {
    const cart = await this.cartService.getOrCreateCart(user.id);
    const totals = this.cartService.calculateTotals(cart);
    return {
      id: cart.id,
      items: cart.items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product?.name ?? 'Unknown',
        product_image: item.product?.image_url ?? null,
        shop_name: item.product?.shop?.name ?? 'Unknown',
        shop_id: item.product?.shop_id ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: +(item.unit_price * item.quantity).toFixed(2),
      })),
      ...totals,
      item_count: cart.items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  @Post('items')
  async addItem(
    @CurrentUser() user: { id: string },
    @Body() dto: AddToCartDto,
  ) {
    await this.cartService.addItem(user.id, dto.product_id, dto.quantity);
    return this.getCart(user);
  }

  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: { id: string },
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    await this.cartService.updateItem(user.id, itemId, dto.quantity);
    return this.getCart(user);
  }

  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: { id: string },
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.cartService.removeItem(user.id, itemId);
    return this.getCart(user);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart(@CurrentUser() user: { id: string }) {
    await this.cartService.clearCart(user.id);
  }
}
