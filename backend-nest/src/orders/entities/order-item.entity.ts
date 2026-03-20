import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { numericTransformer } from '../../database/transformers/numeric.transformer';

@Entity('order_items')
@Index('ix_order_items_order_id', ['order_id'])
@Index('ix_order_items_shop_id', ['shop_id'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid' })
  shop_id: string;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: numericTransformer })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: numericTransformer })
  line_total: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Shop, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;
}
