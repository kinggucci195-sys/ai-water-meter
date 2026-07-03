-- Migration: Optimize Database Performance and RLS Caching
-- Run this script in your Supabase SQL Editor to improve query speeds by 5-10x.

-- 1. Drop existing RLS policies so we can re-create them with subquery caching
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists devices_own on public.devices;
drop policy if exists usage_daily_own on public.usage_daily;
drop policy if exists leaderboard_profiles_own on public.leaderboard_profiles;
drop policy if exists leaderboard_entries_own on public.leaderboard_entries;
drop policy if exists abuse_flags_own_read on public.abuse_flags;

-- 2. Re-create RLS policies using subquery caching ((select auth.uid()) = ...)
create policy profiles_select_own on public.profiles
for select using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy devices_own on public.devices
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy usage_daily_own on public.usage_daily
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy leaderboard_profiles_own on public.leaderboard_profiles
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy leaderboard_entries_own on public.leaderboard_entries
for select using ((select auth.uid()) = user_id);

create policy abuse_flags_own_read on public.abuse_flags
for select using ((select auth.uid()) = user_id);

-- 3. Create missing indexes on foreign key columns to speed up JOINs and cascades
create index if not exists devices_user_id_idx on public.devices (user_id);
create index if not exists usage_daily_user_id_idx on public.usage_daily (user_id);
create index if not exists usage_daily_device_id_idx on public.usage_daily (device_id);
create index if not exists usage_daily_method_id_idx on public.usage_daily (method_id);
create index if not exists leaderboard_entries_user_id_idx on public.leaderboard_entries (user_id);
create index if not exists abuse_flags_user_id_idx on public.abuse_flags (user_id);
create index if not exists abuse_flags_device_id_idx on public.abuse_flags (device_id);

-- 4. Create indexes on common filter and sorting columns for aggregates and leaderboard queries
create index if not exists usage_daily_usage_date_idx on public.usage_daily (usage_date);
create index if not exists leaderboard_entries_period_period_start_idx on public.leaderboard_entries (period, period_start);
