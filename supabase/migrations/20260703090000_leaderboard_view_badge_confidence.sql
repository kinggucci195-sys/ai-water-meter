-- Migration: Add badge and confidence columns to leaderboard view
-- Fixes frontend query failure by exposing missing badge and confidence fields in the view schema.

-- 1. Drop existing view to avoid view column structure update errors
drop view if exists public.leaderboard_entries;

-- 2. Recreate view with security_invoker = true, including badge and confidence columns
create view public.leaderboard_entries 
with (security_invoker = true) as
select 
  id,
  user_id,
  period,
  period_start,
  dense_rank() over (
    partition by period, period_start 
    order by score desc, water_saved_ml_estimate desc
  )::integer as rank,
  display_name,
  score,
  badge,
  confidence,
  water_saved_ml_estimate,
  visible,
  updated_at
from public.leaderboard_entries_raw;

-- 3. Grant SELECT privileges to public API roles (anon, authenticated, service_role)
grant select on public.leaderboard_entries to anon, authenticated, service_role;
