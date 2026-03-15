/**
 * User Entity — maps to the "users" table in PostgreSQL
 *
 * In Prisma, you'd write:
 *   model User { id String @id @default(uuid()) ... }
 *
 * In TypeORM, you use decorators on a class. Each decorator tells TypeORM
 * how to map the property to a database column:
 *   @Entity('users')     → table name
 *   @PrimaryGeneratedColumn('uuid') → auto-generated UUID primary key
 *   @Column()            → regular column
 *   @OneToMany()         → one-to-many relationship (like Prisma's User.posts)
 *
 * The class IS the model AND the TypeScript type — no separate schema needed
 * for basic queries (unlike Prisma where you import generated types).
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Shop } from '../../shops/entities/shop.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  oauth_provider: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  oauth_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // One user can own many shops
  // `shop.owner` is the inverse side — it points back to this User
  @OneToMany(() => Shop, (shop) => shop.owner)
  shops: Shop[];
}
