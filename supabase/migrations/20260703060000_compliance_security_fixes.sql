-- Migration: Database Compliance and Realtime Publication fixes
-- Run this in your Supabase SQL Editor (or apply via CLI) to harden security, add indexes, and enable realtime updates.

-- 1. Secure trigger functions by setting search_path (prevents search path hijacking)
alter function public.sync_leaderboard_entry() set search_path = public, pg_temp;
alter function public.sync_leaderboard_profile_change() set search_path = public, pg_temp;

-- 2. Add composite index for leaderboard query optimization
create index if not exists leaderboard_entries_period_rank_idx 
on public.leaderboard_entries (period, rank);

-- 3. Add composite index for rank recalculation optimization
create index if not exists leaderboard_entries_recalc_rank_idx 
on public.leaderboard_entries (period, period_start, score desc, water_saved_ml_estimate desc);

-- 4. Add usage_daily table to realtime publication (enables realtime telemetry sync updates)
alter publication supabase_realtime add table public.usage_daily;
