-- CreateEnum
CREATE TYPE "ThemePackageStatus" AS ENUM ('CURRENT', 'ARCHIVED');

-- CreateTable
CREATE TABLE "theme_packages" (
    "id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "ThemePackageStatus" NOT NULL DEFAULT 'CURRENT',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "templates" JSONB NOT NULL,
    "css" TEXT NOT NULL DEFAULT '',
    "preview_image" BYTEA,
    "preview_mime" TEXT,
    "file_count" INTEGER NOT NULL,
    "total_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "theme_packages_theme_id_status_idx" ON "theme_packages"("theme_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "theme_packages_theme_id_version_key" ON "theme_packages"("theme_id", "version");

