-- AlterTable
ALTER TABLE "part_revisions" ADD COLUMN "rockauto_status" TEXT;
ALTER TABLE "part_revisions" ADD COLUMN "source" TEXT;
ALTER TABLE "part_revisions" ADD COLUMN "source_url" TEXT;
ALTER TABLE "part_revisions" ADD COLUMN "verified_at" DATETIME;
ALTER TABLE "part_revisions" ADD COLUMN "verified_by" TEXT;
