-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_lines" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_token_key" ON "carts"("token");

-- CreateIndex
CREATE INDEX "carts_channel_id_idx" ON "carts"("channel_id");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "cart_lines_variant_id_idx" ON "cart_lines"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_lines_cart_id_variant_id_key" ON "cart_lines"("cart_id", "variant_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: Prisma cannot express CHECK constraints (database-side safety net for the domain rules)
ALTER TABLE "carts" ADD CONSTRAINT "carts_status_check" CHECK ("status" IN ('ACTIVE', 'ORDERED'));
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_quantity_check" CHECK ("quantity" > 0);

