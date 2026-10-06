-- CreateTable
CREATE TABLE "product_variant_channel_listings" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "price_amount" DECIMAL(12,2) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_variant_channel_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_variant_channel_listings_channel_id_idx" ON "product_variant_channel_listings"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_channel_listings_variant_id_channel_id_key" ON "product_variant_channel_listings"("variant_id", "channel_id");

-- AddForeignKey
ALTER TABLE "product_variant_channel_listings" ADD CONSTRAINT "product_variant_channel_listings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_channel_listings" ADD CONSTRAINT "product_variant_channel_listings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
