/**
 * Category Entity — maps to the "categories" table
 *
 * Self-referencing relationship: a category can have a parent category.
 * This creates a tree structure (e.g., Electronics → Phones → Smartphones).
 *
 * In Prisma: model Category { parent Category? @relation("CategoryTree") }
 * In TypeORM: @ManyToOne(() => Category) + @OneToMany(() => Category)
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  // Self-referencing: parent category
  @ManyToOne(() => Category, (cat) => cat.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  // Self-referencing: child categories
  @OneToMany(() => Category, (cat) => cat.parent)
  children: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
