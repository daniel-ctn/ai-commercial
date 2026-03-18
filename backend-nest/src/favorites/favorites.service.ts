import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepo: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async addFavorite(userId: string, productId: string): Promise<Favorite> {
    const product = await this.productsRepo.findOne({ where: { id: productId, is_active: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.favoritesRepo.findOne({
      where: { user_id: userId, product_id: productId },
    });
    if (existing) {
      throw new ConflictException('Product already in favorites');
    }

    const favorite = this.favoritesRepo.create({
      user_id: userId,
      product_id: productId,
    });
    return this.favoritesRepo.save(favorite);
  }

  async removeFavorite(userId: string, productId: string): Promise<void> {
    const result = await this.favoritesRepo.delete({
      user_id: userId,
      product_id: productId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Favorite not found');
    }
  }

  async listFavorites(userId: string) {
    const favorites = await this.favoritesRepo.find({
      where: { user_id: userId },
      relations: ['product', 'product.shop', 'product.category'],
      order: { created_at: 'DESC' },
    });

    return favorites.map((fav) => ({
      id: fav.product.id,
      name: fav.product.name,
      price: fav.product.price,
      original_price: fav.product.original_price,
      image_url: fav.product.image_url,
      shop_id: fav.product.shop_id,
      shop_name: fav.product.shop?.name ?? null,
      category_id: fav.product.category_id,
      category_name: fav.product.category?.name ?? null,
      favorited_at: fav.created_at,
    }));
  }

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    const count = await this.favoritesRepo.count({
      where: { user_id: userId, product_id: productId },
    });
    return count > 0;
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.favoritesRepo.find({
      where: { user_id: userId },
      select: ['product_id'],
    });
    return favorites.map((f) => f.product_id);
  }
}
