-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "store_code" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "pack_size" TEXT,
    "unit" TEXT,
    "selling_price" DECIMAL(65,30) NOT NULL,
    "cost_price" DECIMAL(65,30) NOT NULL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 0,
    "supplier_moq" INTEGER,
    "lead_time_days" INTEGER,
    "supplier" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_aliases" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized_alias" TEXT NOT NULL,
    "language" TEXT,

    CONSTRAINT "product_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_items" INTEGER NOT NULL,
    "total_value" DECIMAL(65,30) NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selling_price" DECIMAL(65,30) NOT NULL,
    "cost_price" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecasts" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "forecast_date" TIMESTAMP(3) NOT NULL,
    "predicted_demand" DOUBLE PRECISION NOT NULL,
    "safety_stock" DOUBLE PRECISION NOT NULL,
    "current_stock_snapshot" INTEGER NOT NULL,
    "recommended_order" INTEGER NOT NULL,
    "expected_revenue" DECIMAL(65,30),
    "expected_cost" DECIMAL(65,30),
    "expected_gross_profit" DECIMAL(65,30),
    "confidence" DOUBLE PRECISION,
    "explanation" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_data" (
    "id" TEXT NOT NULL,
    "store_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "temperature" DOUBLE PRECISION,
    "rainfall_mm" DOUBLE PRECISION,
    "weather_condition" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivals" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "festivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_forecast_configs" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "data_maturity" TEXT NOT NULL,
    "last_trained_at" TIMESTAMP(3),
    "training_data_from" TIMESTAMP(3),
    "training_data_to" TIMESTAMP(3),
    "evaluation_mae" DOUBLE PRECISION,
    "evaluation_rmse" DOUBLE PRECISION,
    "evaluation_mape" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_forecast_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_store_code_key" ON "stores"("store_code");

-- CreateIndex
CREATE INDEX "products_store_id_category_idx" ON "products"("store_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "products_store_id_normalized_name_key" ON "products"("store_id", "normalized_name");

-- CreateIndex
CREATE INDEX "product_aliases_normalized_alias_idx" ON "product_aliases"("normalized_alias");

-- CreateIndex
CREATE INDEX "sales_store_id_transaction_date_idx" ON "sales"("store_id", "transaction_date");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_store_id_product_id_created_at_idx" ON "inventory_transactions"("store_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "forecasts_store_id_forecast_date_idx" ON "forecasts"("store_id", "forecast_date");

-- CreateIndex
CREATE UNIQUE INDEX "forecasts_store_id_product_id_forecast_date_model_version_key" ON "forecasts"("store_id", "product_id", "forecast_date", "model_version");

-- CreateIndex
CREATE INDEX "weather_data_store_id_date_idx" ON "weather_data"("store_id", "date");

-- CreateIndex
CREATE INDEX "festivals_date_idx" ON "festivals"("date");

-- CreateIndex
CREATE UNIQUE INDEX "store_forecast_configs_store_id_key" ON "store_forecast_configs"("store_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_aliases" ADD CONSTRAINT "product_aliases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_data" ADD CONSTRAINT "weather_data_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_forecast_configs" ADD CONSTRAINT "store_forecast_configs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
