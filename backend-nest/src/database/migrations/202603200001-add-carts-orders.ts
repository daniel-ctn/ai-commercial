import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartsOrders202603200001 implements MigrationInterface {
  name = 'AddCartsOrders202603200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Carts ──
    await queryRunner.query(`
      CREATE TABLE "carts" (
        "id"         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"    UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_carts_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "ix_carts_user_id" ON "carts" ("user_id")`);

    // ── Cart items ──
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "cart_id"     UUID NOT NULL,
        "product_id"  UUID NOT NULL,
        "quantity"    INTEGER NOT NULL DEFAULT 1,
        "unit_price"  DECIMAL(10,2) NOT NULL,
        CONSTRAINT "FK_cart_items_cart_id" FOREIGN KEY ("cart_id")
          REFERENCES "carts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cart_items_product_id" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_cart_items_cart_product" UNIQUE ("cart_id", "product_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "ix_cart_items_cart_id" ON "cart_items" ("cart_id")`);

    // ── Orders ──
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id"                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id"                  UUID NOT NULL,
        "coupon_id"                UUID,
        "status"                   VARCHAR(20) NOT NULL DEFAULT 'pending',
        "subtotal"                 DECIMAL(10,2) NOT NULL,
        "discount"                 DECIMAL(10,2) NOT NULL DEFAULT 0,
        "total"                    DECIMAL(10,2) NOT NULL,
        "stripe_session_id"        VARCHAR(500),
        "stripe_payment_intent_id" VARCHAR(500),
        "shipping_name"            VARCHAR(255),
        "shipping_address"         TEXT,
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_orders_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_coupon_id" FOREIGN KEY ("coupon_id")
          REFERENCES "coupons"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "ix_orders_user_id" ON "orders" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "ix_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "ix_orders_stripe_session_id" ON "orders" ("stripe_session_id")`);

    // ── Order items ──
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "order_id"     UUID NOT NULL,
        "product_id"   UUID,
        "shop_id"      UUID,
        "product_name" VARCHAR(255) NOT NULL,
        "quantity"     INTEGER NOT NULL DEFAULT 1,
        "unit_price"   DECIMAL(10,2) NOT NULL,
        "line_total"   DECIMAL(10,2) NOT NULL,
        CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product_id" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_order_items_shop_id" FOREIGN KEY ("shop_id")
          REFERENCES "shops"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "ix_order_items_order_id" ON "order_items" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "ix_order_items_shop_id" ON "order_items" ("shop_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "carts"`);
  }
}
