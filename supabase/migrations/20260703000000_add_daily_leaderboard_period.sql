-- Migration: Add 'daily' period to leaderboard entries check constraint.
-- Run this SQL script in your Supabase SQL Editor to allow daily rankings in the leaderboard.

alter table public.leaderboard_entries drop constraint if exists leaderboard_entries_period_check;

alter table public.leaderboard_entries add constraint leaderboard_entries_period_check check (period in ('daily', 'weekly', 'monthly', 'all_time'));
