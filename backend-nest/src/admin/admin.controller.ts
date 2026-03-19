/**
 * Admin Controller — all endpoints require JwtAuthGuard + AdminGuard
 *
 * == Controller-level guards (for Next.js devs) ==
 *
 * Instead of decorating each method individually, we apply guards
 * at the controller level with @UseGuards(). This is like wrapping
 * an entire route group in middleware:
 *
 *   // Next.js equivalent
 *   // app/admin/layout.tsx — middleware protects all /admin/* pages
 *
 * Every endpoint in this controller automatically requires:
 *   1. A valid JWT (JwtAuthGuard)
 *   2. Admin role (AdminGuard)
 */
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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AiCatalogService } from './ai-catalog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  AdminUsersQueryDto,
  AdminShopsQueryDto,
  AdminProductsQueryDto,
  AdminCouponsQueryDto,
  UpdateUserRoleDto,
} from './dto/admin-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly aiCatalog: AiCatalogService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('shops/:id/stats')
  getShopStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getShopStats(id);
  }

  @Post('products/bulk-toggle')
  @HttpCode(HttpStatus.OK)
  bulkToggleProducts(@Body() body: { ids: string[]; activate: boolean }) {
    return this.adminService.bulkToggleProducts(body.ids, body.activate);
  }

  @Post('coupons/bulk-toggle')
  @HttpCode(HttpStatus.OK)
  bulkToggleCoupons(@Body() body: { ids: string[]; activate: boolean }) {
    return this.adminService.bulkToggleCoupons(body.ids, body.activate);
  }

  @Post('products/bulk-category')
  @HttpCode(HttpStatus.OK)
  bulkAssignCategory(@Body() body: { ids: string[]; category_id: string }) {
    return this.adminService.bulkAssignCategory(body.ids, body.category_id);
  }

  // ── Users ───────────────────────────────────────────────────

  @Get('users')
  findAllUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.findAllUsers(query);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  // ── Shops ───────────────────────────────────────────────────

  @Get('shops')
  findAllShops(@Query() query: AdminShopsQueryDto) {
    return this.adminService.findAllShops(query);
  }

  @Patch('shops/:id/toggle-active')
  toggleShopActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleShopActive(id);
  }

  // ── Products ────────────────────────────────────────────────

  @Get('products')
  findAllProducts(@Query() query: AdminProductsQueryDto) {
    return this.adminService.findAllProducts(query);
  }

  @Patch('products/:id/toggle-active')
  toggleProductActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleProductActive(id);
  }

  // ── Coupons ─────────────────────────────────────────────────

  @Get('coupons')
  findAllCoupons(@Query() query: AdminCouponsQueryDto) {
    return this.adminService.findAllCoupons(query);
  }

  @Patch('coupons/:id/toggle-active')
  toggleCouponActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleCouponActive(id);
  }

  // ── AI Catalog ────────────────────────────────────────────

  @Post('products/:id/ai-description')
  @HttpCode(HttpStatus.OK)
  generateDescription(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiCatalog.generateDescription(id);
  }

  @Post('products/:id/ai-attributes')
  @HttpCode(HttpStatus.OK)
  generateAttributes(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiCatalog.generateAttributes(id);
  }

  @Get('products/:id/quality')
  getQualityReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiCatalog.getQualityReport(id);
  }
}
