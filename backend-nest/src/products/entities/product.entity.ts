/**
 * Product Entity — maps to the "products" table
 *
 * Shows how TypeORM handles:
 *   - decimal/money columns: `{ type: 'decimal', precision: 10, scale: 2 }`
 *   - JSONB columns: `{ type: 'jsonb' }` — stores arbitrary JSON (like product specs)
 *   - Eager vs lazy relations: by default, relations are NOT loaded (you must join them)
 *     This is different from Prisma where you use `include: {}` per query.
 *     In TypeORM, you use QueryBuilder `.leftJoinAndSelect()` or `relations` option.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
@Index('ix_products_shop_id', ['shop_id'])
@Index('ix_products_category_id', ['category_id'])
@Index('ix_products_is_active', ['is_active'])
@Index('ix_products_active_category', ['is_active', 'category_id'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shop_id: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  original_price: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Shop, (shop) => shop.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
