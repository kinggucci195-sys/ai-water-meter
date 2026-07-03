-- Migration: Leaderboard View Permissions & Security Invoker
-- Configures the leaderboard view to invoke under caller security policies (enabling RLS on raw store) and grants select permission to public roles.

-- 1. Recreate view with security_invoker = true
create or replace view public.leaderboard_entries 
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
  water_saved_ml_estimate,
  visible,
  updated_at
from public.leaderboard_entries_raw;

-- 2. Grant SELECT privileges to public API roles (anon, authenticated, service_role)
grant select on public.leaderboard_entries to anon, authenticated, service_role;
