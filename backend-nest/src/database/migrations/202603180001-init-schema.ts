import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema202603180001 implements MigrationInterface {
  public readonly name = 'InitSchema202603180001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255),
        "name" character varying(255) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'user',
        "oauth_provider" character varying(50),
        "oauth_id" character varying(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_users_role" CHECK ("role" IN ('user', 'shop_admin', 'admin'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_oauth_provider_oauth_id"
      ON "users" ("oauth_provider", "oauth_id")
      WHERE "oauth_provider" IS NOT NULL AND "oauth_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "parent_id" uuid,
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_categories_parent_id" ON "categories" ("parent_id")',
    );
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_categories_parent_id"
      FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "shops" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "logo_url" character varying(500),
        "website" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shops_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE INDEX "ix_shops_owner_id" ON "shops" ("owner_id")');
    await queryRunner.query('CREATE INDEX "ix_shops_is_active" ON "shops" ("is_active")');
    await queryRunner.query(`
      ALTER TABLE "shops"
      ADD CONSTRAINT "FK_shops_owner_id"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "shop_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "price" numeric(10,2) NOT NULL,
        "original_price" numeric(10,2),
        "image_url" character varying(500),
        "attributes" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_products_price" CHECK ("price" >= 0),
        CONSTRAINT "CHK_products_original_price" CHECK ("original_price" IS NULL OR "original_price" >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_products_shop_id" ON "products" ("shop_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_products_category_id" ON "products" ("category_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_products_is_active" ON "products" ("is_active")',
    );
    await queryRunner.query(`
      CREATE INDEX "ix_products_active_category"
      ON "products" ("is_active", "category_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_shop_id"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_category_id"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "shop_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "description" text,
        "discount_type" character varying(20) NOT NULL,
        "discount_value" numeric(10,2) NOT NULL,
        "min_purchase" numeric(10,2),
        "valid_from" TIMESTAMPTZ NOT NULL,
        "valid_until" TIMESTAMPTZ NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_coupons_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_coupons_code" UNIQUE ("code"),
        CONSTRAINT "CHK_coupons_discount_type" CHECK ("discount_type" IN ('percentage', 'fixed')),
        CONSTRAINT "CHK_coupons_discount_value" CHECK ("discount_value" >= 0.01),
        CONSTRAINT "CHK_coupons_percentage_limit" CHECK ("discount_type" <> 'percentage' OR "discount_value" <= 100),
        CONSTRAINT "CHK_coupons_min_purchase" CHECK ("min_purchase" IS NULL OR "min_purchase" >= 0),
        CONSTRAINT "CHK_coupons_valid_window" CHECK ("valid_until" > "valid_from")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_coupons_shop_id" ON "coupons" ("shop_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_coupons_is_active" ON "coupons" ("is_active")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_coupons_valid_until" ON "coupons" ("valid_until")',
    );
    await queryRunner.query(`
      ALTER TABLE "coupons"
      ADD CONSTRAINT "FK_coupons_shop_id"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_sessions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_chat_sessions_user_id" ON "chat_sessions" ("user_id")',
    );
    await queryRunner.query(`
      ALTER TABLE "chat_sessions"
      ADD CONSTRAINT "FK_chat_sessions_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL,
        "role" character varying(20) NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_chat_messages_session_id"
      ON "chat_messages" ("session_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_session_id"
      FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "chat_messages"');
    await queryRunner.query('DROP TABLE "chat_sessions"');
    await queryRunner.query('DROP TABLE "coupons"');
    await queryRunner.query('DROP TABLE "products"');
    await queryRunner.query('DROP TABLE "shops"');
    await queryRunner.query('DROP TABLE "categories"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
