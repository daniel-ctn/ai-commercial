import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ShopAdminGuard } from '../common/guards/shop-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../shops/entities/shop.entity';
import { AdminProductsQueryDto, AdminCouponsQueryDto } from './dto/admin-query.dto';

@Controller('shop-admin')
@UseGuards(JwtAuthGuard, ShopAdminGuard)
export class ShopAdminController {
  constructor(
    private readonly adminService: AdminService,
    @InjectRepository(Shop) private readonly shopsRepo: Repository<Shop>,
  ) {}

  private async getOwnedShop(userId: string): Promise<Shop> {
    const shop = await this.shopsRepo.findOne({ where: { owner_id: userId } });
    if (!shop) {
      throw new ForbiddenException('You do not own a shop');
    }
    return shop;
  }

  @Get('stats')
  async getStats(@CurrentUser() user: { id: string }) {
    const shop = await this.getOwnedShop(user.id);
    return this.adminService.getShopStats(shop.id);
  }

  @Get('products')
  async findProducts(
    @CurrentUser() user: { id: string },
    @Query() query: AdminProductsQueryDto,
  ) {
    const shop = await this.getOwnedShop(user.id);
    query.shop_id = shop.id;
    return this.adminService.findAllProducts(query);
  }

  @Patch('products/:id/toggle-active')
  async toggleProduct(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) productId: string,
  ) {
    const shop = await this.getOwnedShop(user.id);
    return this.adminService.toggleProductActiveForShop(productId, shop.id);
  }

  @Get('coupons')
  async findCoupons(
    @CurrentUser() user: { id: string },
    @Query() query: AdminCouponsQueryDto,
  ) {
    const shop = await this.getOwnedShop(user.id);
    query.shop_id = shop.id;
    return this.adminService.findAllCoupons(query);
  }

  @Patch('coupons/:id/toggle-active')
  async toggleCoupon(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) couponId: string,
  ) {
    const shop = await this.getOwnedShop(user.id);
    return this.adminService.toggleCouponActiveForShop(couponId, shop.id);
  }

  @Post('products/bulk-toggle')
  @HttpCode(HttpStatus.OK)
  async bulkToggleProducts(
    @CurrentUser() user: { id: string },
    @Body() body: { ids: string[]; activate: boolean },
  ) {
    const shop = await this.getOwnedShop(user.id);
    return this.adminService.bulkToggleProductsForShop(body.ids, body.activate, shop.id);
  }

  @Post('products/bulk-category')
  @HttpCode(HttpStatus.OK)
  async bulkAssignCategory(
    @CurrentUser() user: { id: string },
    @Body() body: { ids: string[]; category_id: string },
  ) {
    const shop = await this.getOwnedShop(user.id);
    return this.adminService.bulkAssignCategoryForShop(body.ids, body.category_id, shop.id);
  }
}
