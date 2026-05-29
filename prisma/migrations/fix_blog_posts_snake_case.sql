-- Migration: rename blog_posts columns from camelCase to snake_case
-- Prisma created these with quoted camelCase names; Supabase REST API expects snake_case.
-- Run this once against your Supabase PostgreSQL database.

ALTER TABLE "blog_posts" RENAME COLUMN "coverImage"  TO "cover_image";
ALTER TABLE "blog_posts" RENAME COLUMN "authorName"  TO "author_name";
ALTER TABLE "blog_posts" RENAME COLUMN "authorImage" TO "author_image";
ALTER TABLE "blog_posts" RENAME COLUMN "seoTitle"    TO "seo_title";
ALTER TABLE "blog_posts" RENAME COLUMN "seoDesc"     TO "seo_desc";
ALTER TABLE "blog_posts" RENAME COLUMN "viewCount"   TO "view_count";
ALTER TABLE "blog_posts" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "blog_posts" RENAME COLUMN "createdAt"   TO "created_at";
ALTER TABLE "blog_posts" RENAME COLUMN "updatedAt"   TO "updated_at";
