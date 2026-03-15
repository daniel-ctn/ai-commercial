/**
 * Coupon Entity — maps to the "coupons" table
 *
 * Demonstrates date-based filtering: coupons have valid_from/valid_until
 * timestamps. The service layer checks `valid_from <= now <= valid_until`
 * when querying active coupons — similar to how you'd filter in Prisma:
 *   where: { valid_from: { lte: new Date() }, valid_until: { gte: new Date() } }
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shop_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  discount_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_purchase: number | null;

  @Column({ type: 'timestamptz' })
  valid_from: Date;

  @Column({ type: 'timestamptz' })
  valid_until: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToOne(() => Shop, (shop) => shop.coupons)
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;
}
