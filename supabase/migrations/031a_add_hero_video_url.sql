-- Migration 031: Add hero_video_url to landing_settings
-- Allows admin to set custom hero video URL from dashboard

ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS hero_video_url TEXT;