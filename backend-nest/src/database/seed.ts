import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';

const defaultCategories: Array<Pick<Category, 'name' | 'slug'>> = [
  { name: 'AI Tools', slug: 'ai-tools' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Productivity', slug: 'productivity' },
  { name: 'Developer Tools', slug: 'developer-tools' },
];

async function seedCategories(): Promise<void> {
  const categoryRepo = dataSource.getRepository(Category);
  await categoryRepo.upsert(defaultCategories, ['slug']);
  console.log(`Seeded ${defaultCategories.length} default categories.`);
}

async function seedAdminUser(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Platform Admin';

  if (!email || !password) {
    console.log(
      'Skipping admin seed. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.',
    );
    return;
  }

  const userRepo = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await userRepo.findOne({ where: { email } });

  if (existing) {
    existing.name = name;
    existing.role = 'admin';
    existing.password_hash = passwordHash;
    await userRepo.save(existing);
    console.log(`Updated admin user ${email}.`);
    return;
  }

  await userRepo.save(
    userRepo.create({
      email,
      name,
      role: 'admin',
      password_hash: passwordHash,
    }),
  );

  console.log(`Created admin user ${email}.`);
}

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    await seedCategories();
    await seedAdminUser();
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
