-- CreateTable
CREATE TABLE "kits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kit_number" TEXT NOT NULL,
    "oe_number" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_year_start" INTEGER,
    "vehicle_year_end" INTEGER,
    "vehicle_engine" TEXT,
    "sell_price" REAL,
    "purchase_price" REAL,
    "supplier_id" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "stock_warning" INTEGER NOT NULL DEFAULT 3,
    "rockauto_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "kits_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kit_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kit_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "role" TEXT,
    CONSTRAINT "kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "kit_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "kits_kit_number_key" ON "kits"("kit_number");
