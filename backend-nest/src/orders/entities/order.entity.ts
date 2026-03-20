import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { OrderItem } from './order-item.entity';
import { numericTransformer } from '../../database/transformers/numeric.transformer';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

@Entity('orders')
@Index('ix_orders_user_id', ['user_id'])
@Index('ix_orders_status', ['status'])
@Index('ix_orders_stripe_session_id', ['stripe_session_id'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  coupon_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: numericTransformer })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: numericTransformer })
  total: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  stripe_session_id: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  stripe_payment_intent_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shipping_name: string | null;

  @Column({ type: 'text', nullable: true })
  shipping_address: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Coupon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
