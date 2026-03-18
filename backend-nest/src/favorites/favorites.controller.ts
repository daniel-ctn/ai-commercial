import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async listFavorites(@CurrentUser() user: { id: string }) {
    return this.favoritesService.listFavorites(user.id);
  }

  @Get('ids')
  async getFavoriteIds(@CurrentUser() user: { id: string }) {
    return this.favoritesService.getFavoriteIds(user.id);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(
    @CurrentUser() user: { id: string },
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.favoritesService.addFavorite(user.id, productId);
    return { status: 'added' };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  async removeFavorite(
    @CurrentUser() user: { id: string },
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.favoritesService.removeFavorite(user.id, productId);
    return { status: 'removed' };
  }
}
