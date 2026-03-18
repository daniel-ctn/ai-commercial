import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchVector202603180002 implements MigrationInterface {
  public readonly name = 'AddSearchVector202603180002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("description", '')), 'B')
      ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_product_search_vector"
      ON "products" USING gin ("search_vector")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "idx_product_search_vector"');
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "search_vector"');
  }
}
