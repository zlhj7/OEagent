-- CreateTable
CREATE TABLE "part_revisions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "part_id" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "old_part_number" TEXT,
    "new_part_number" TEXT,
    "change_description" TEXT,
    "year_start" INTEGER,
    "year_end" INTEGER,
    "interchangeable" BOOLEAN NOT NULL DEFAULT false,
    "compatibility_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_revisions_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
