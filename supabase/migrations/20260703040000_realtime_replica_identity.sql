-- Migration: Enable Replica Identity Full for Realtime latency optimization
-- Run this script in your Supabase SQL Editor to speed up server-side realtime filters.

-- 1. Alter usage_daily replica identity to full
alter table public.usage_daily replica identity full;

-- 2. Alter leaderboard_entries replica identity to full
alter table public.leaderboard_entries replica identity full;
