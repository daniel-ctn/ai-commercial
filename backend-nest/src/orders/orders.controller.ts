import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(
    @CurrentUser() user: { id: string },
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.createCheckoutSession(
      user.id,
      dto.coupon_code,
      dto.shipping_name,
      dto.shipping_address,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser() user: { id: string },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getUserOrders(user.id, page ?? 1, limit ?? 10);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrder(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrder(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatus(id, status as any);
  }
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false };
    }
    await this.ordersService.handleWebhookEvent(rawBody, signature);
    return { received: true };
  }
}
