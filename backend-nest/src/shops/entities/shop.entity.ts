/**
 * Shop Entity — maps to the "shops" table
 *
 * Demonstrates @ManyToOne and @OneToMany relationships:
 *   - A shop belongs to ONE user (owner) → @ManyToOne
 *   - A shop has MANY products → @OneToMany
 *   - A shop has MANY coupons → @OneToMany
 *
 * @JoinColumn tells TypeORM which column holds the foreign key.
 * It's like Prisma's @relation(fields: [ownerId], references: [id])
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';

@Entity('shops')
@Index('ix_shops_owner_id', ['owner_id'])
@Index('ix_shops_is_active', ['is_active'])
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  owner_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.shops)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Product, (product) => product.shop)
  products: Product[];

  @OneToMany(() => Coupon, (coupon) => coupon.shop)
  coupons: Coupon[];
}
