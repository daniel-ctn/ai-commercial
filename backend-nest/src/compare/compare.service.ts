/**
 * Compare Service — fetches products by IDs and normalizes attributes
 *
 * The key value-add over a plain product list:
 * - Collects all unique attribute keys across the compared products
 * - Returns them sorted so the frontend can render a comparison table
 *   with consistent rows even when products have different attribute sets
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../products/entities/product.entity';

export interface CompareProductItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  attributes: Record<string, unknown> | null;
  shop_name: string | null;
  category_name: string | null;
  on_sale: boolean;
}

export interface CompareResponse {
  products: CompareProductItem[];
  attribute_keys: string[];
}

@Injectable()
export class CompareService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async compare(ids: string[]): Promise<CompareResponse> {
    const orderedIds = [...new Set(ids)];
    const products = await this.productsRepo.find({
      where: { id: In(orderedIds), is_active: true },
      relations: ['shop', 'category'],
    });

    const productsById = new Map(products.map((product) => [product.id, product]));
    const orderedProducts = orderedIds
      .map((id) => productsById.get(id))
      .filter((product): product is Product => product !== undefined);

    if (orderedProducts.length < 2) {
      throw new BadRequestException(
        'Need at least 2 active products to compare',
      );
    }

    const allKeys = new Set<string>();
    const items: CompareProductItem[] = orderedProducts.map((p) => {
      if (p.attributes && typeof p.attributes === 'object') {
        Object.keys(p.attributes).forEach((k) => allKeys.add(k));
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        original_price: p.original_price,
        image_url: p.image_url,
        attributes: p.attributes,
        shop_name: p.shop?.name ?? null,
        category_name: p.category?.name ?? null,
        on_sale:
          p.original_price !== null &&
          p.original_price !== undefined &&
          p.original_price > p.price,
      };
    });

    return {
      products: items,
      attribute_keys: [...allKeys].sort(),
    };
  }
}
