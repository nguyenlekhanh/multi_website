-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiPublishMode" AS ENUM ('DRAFT', 'SCHEDULED', 'AUTOPILOT');

-- CreateTable
CREATE TABLE "ai_settings" (
    "site_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'ollama',
    "model" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'English',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "audience" TEXT NOT NULL DEFAULT '',
    "word_count_target" INTEGER NOT NULL DEFAULT 800,
    "format" TEXT NOT NULL DEFAULT 'article',
    "author_id" TEXT,
    "category_ids" TEXT[],
    "publish_mode" "AiPublishMode" NOT NULL DEFAULT 'DRAFT',
    "posts_per_week" INTEGER NOT NULL DEFAULT 3,
    "publish_times" TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "max_articles_per_day" INTEGER NOT NULL DEFAULT 2,
    "custom_instructions" TEXT,
    "last_generation_at" TIMESTAMP(3),
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "last_schedule_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("site_id")
);

-- CreateTable
CREATE TABLE "ai_topics" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keywords" TEXT[],
    "excluded" TEXT[],
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "topic_title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERATE_ARTICLE',
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "post_id" INTEGER,
    "worker_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_topics_site_id_active_idx" ON "ai_topics"("site_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_topics_site_id_title_key" ON "ai_topics"("site_id", "title");

-- CreateIndex
CREATE UNIQUE INDEX "ai_jobs_idempotency_key_key" ON "ai_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "ai_jobs_status_scheduled_at_idx" ON "ai_jobs"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "ai_jobs_site_id_status_idx" ON "ai_jobs"("site_id", "status");

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_topics" ADD CONSTRAINT "ai_topics_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "ai_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

