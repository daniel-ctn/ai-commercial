/**
 * TypeORM CLI Data Source — used only for running migrations from the command line.
 *
 * This is separate from the NestJS TypeORM module because the CLI runs
 * outside of NestJS (like running `prisma migrate` from terminal).
 * It needs its own connection config with explicit entity paths.
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [join(__dirname, '..', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
