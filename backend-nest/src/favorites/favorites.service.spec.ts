import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';

function createFavoritesService() {
  const products = [
    {
      id: 'product-1',
      name: 'Phone',
      price: 499,
      original_price: 599,
      image_url: 'https://example.com/phone.jpg',
      shop_id: 'shop-1',
      shop: { name: 'Tech Store' },
      category_id: 'category-1',
      category: { name: 'Electronics' },
      is_active: true,
    },
    {
      id: 'product-2',
      name: 'Headphones',
      price: 149,
      original_price: null,
      image_url: null,
      shop_id: 'shop-1',
      shop: { name: 'Tech Store' },
      category_id: 'category-1',
      category: { name: 'Electronics' },
      is_active: false,
    },
  ];

  const favorites: Array<{
    id: string;
    user_id: string;
    product_id: string;
    created_at: Date;
    product?: (typeof products)[number];
  }> = [];

  let idCounter = 0;

  const favoritesRepo = {
    findOne: async (opts: { where: { user_id: string; product_id: string } }) => {
      return (
        favorites.find(
          (favorite) =>
            favorite.user_id === opts.where.user_id &&
            favorite.product_id === opts.where.product_id,
        ) ?? null
      );
    },
    create: (data: { user_id: string; product_id: string }) => ({
      id: `favorite-${++idCounter}`,
      created_at: new Date(Date.now() + idCounter),
      ...data,
    }),
    save: async (favorite: (typeof favorites)[number]) => {
      favorites.push(favorite);
      return favorite;
    },
    delete: async (criteria: { user_id: string; product_id: string }) => {
      const index = favorites.findIndex(
        (favorite) =>
          favorite.user_id === criteria.user_id &&
          favorite.product_id === criteria.product_id,
      );

      if (index === -1) {
        return { affected: 0 };
      }

      favorites.splice(index, 1);
      return { affected: 1 };
    },
    find: async (opts: {
      where: { user_id: string };
      relations?: string[];
      order?: { created_at: 'ASC' | 'DESC' };
      select?: Array<'product_id'>;
    }) => {
      let results = favorites
        .filter((favorite) => favorite.user_id === opts.where.user_id)
        .map((favorite) => ({
          ...favorite,
          product: favorite.product ?? products.find((product) => product.id === favorite.product_id),
        }));

      if (opts.order?.created_at === 'DESC') {
        results = results.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      }

      if (opts.select?.includes('product_id')) {
        return results.map((favorite) => ({ product_id: favorite.product_id }));
      }

      return results;
    },
    count: async (opts: { where: { user_id: string; product_id: string } }) => {
      return favorites.filter(
        (favorite) =>
          favorite.user_id === opts.where.user_id &&
          favorite.product_id === opts.where.product_id,
      ).length;
    },
  };

  const productsRepo = {
    findOne: async (opts: { where: { id: string; is_active: boolean } }) => {
      return (
        products.find(
          (product) =>
            product.id === opts.where.id && product.is_active === opts.where.is_active,
        ) ?? null
      );
    },
  };

  return {
    service: new FavoritesService(favoritesRepo as never, productsRepo as never),
    favorites,
  };
}

test('addFavorite saves a favorite for an active product', async () => {
  const { service } = createFavoritesService();

  const favorite = await service.addFavorite('user-1', 'product-1');

  assert.equal(favorite.user_id, 'user-1');
  assert.equal(favorite.product_id, 'product-1');
});

test('addFavorite rejects inactive or missing products', async () => {
  const { service } = createFavoritesService();

  await assert.rejects(service.addFavorite('user-1', 'product-2'), (error: unknown) => {
    assert.ok(error instanceof NotFoundException);
    assert.equal(error.message, 'Product not found');
    return true;
  });
});

test('addFavorite rejects duplicates', async () => {
  const { service } = createFavoritesService();

  await service.addFavorite('user-1', 'product-1');

  await assert.rejects(service.addFavorite('user-1', 'product-1'), (error: unknown) => {
    assert.ok(error instanceof ConflictException);
    assert.equal(error.message, 'Product already in favorites');
    return true;
  });
});

test('removeFavorite throws when the favorite does not exist', async () => {
  const { service } = createFavoritesService();

  await assert.rejects(service.removeFavorite('user-1', 'missing-product'), (error: unknown) => {
    assert.ok(error instanceof NotFoundException);
    assert.equal(error.message, 'Favorite not found');
    return true;
  });
});

test('listFavorites returns mapped product data in newest-first order', async () => {
  const { service, favorites } = createFavoritesService();

  favorites.push({
    id: 'favorite-1',
    user_id: 'user-1',
    product_id: 'product-1',
    created_at: new Date('2026-03-18T10:00:00Z'),
  });
  favorites.push({
    id: 'favorite-2',
    user_id: 'user-1',
    product_id: 'product-1',
    created_at: new Date('2026-03-19T10:00:00Z'),
  });

  const result = await service.listFavorites('user-1');

  assert.equal(result.length, 2);
  assert.equal(result[0]?.favorited_at.toISOString(), '2026-03-19T10:00:00.000Z');
  assert.equal(result[0]?.shop_name, 'Tech Store');
  assert.equal(result[0]?.category_name, 'Electronics');
});

test('getFavoriteIds and isFavorite reflect stored favorites', async () => {
  const { service } = createFavoritesService();

  await service.addFavorite('user-1', 'product-1');

  assert.equal(await service.isFavorite('user-1', 'product-1'), true);
  assert.equal(await service.isFavorite('user-1', 'missing-product'), false);
  assert.deepEqual(await service.getFavoriteIds('user-1'), ['product-1']);
});
