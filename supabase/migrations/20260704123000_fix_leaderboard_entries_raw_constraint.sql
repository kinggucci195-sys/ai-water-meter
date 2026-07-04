-- Migration: Fix redundant leaderboard_entries_raw constraints/indexes
-- Drops the redundant physical index public.leaderboard_entries_period_rank_idx
-- Drops the redundant physical column rank from public.leaderboard_entries_raw

drop index if exists public.leaderboard_entries_period_rank_idx;

alter table public.leaderboard_entries_raw 
  drop column if exists rank;
