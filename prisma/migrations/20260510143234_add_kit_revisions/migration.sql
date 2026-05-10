-- CreateTable
CREATE TABLE "kit_revisions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kit_id" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "old_kit_number" TEXT,
    "new_kit_number" TEXT,
    "old_oe_number" TEXT,
    "new_oe_number" TEXT,
    "change_description" TEXT,
    "year_start" INTEGER,
    "year_end" INTEGER,
    "interchangeable" BOOLEAN NOT NULL DEFAULT false,
    "compatibility_note" TEXT,
    "source" TEXT,
    "source_url" TEXT,
    "verified_at" DATETIME,
    "verified_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kit_revisions_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
