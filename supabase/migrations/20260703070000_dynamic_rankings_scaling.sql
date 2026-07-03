-- Migration: Dynamic Rankings Scaling and Trigger Optimization
-- Resolves transaction lock contention, deadlocks, and write amplification by computing ranks dynamically via a View.

-- 1. Drop existing triggers & functions temporarily to alter tables
drop trigger if exists sync_leaderboard_entry_trg on public.usage_daily;
drop trigger if exists sync_leaderboard_profile_change_trg on public.leaderboard_profiles;

-- 2. Rename existing leaderboard_entries table to raw store
alter table if exists public.leaderboard_entries rename to leaderboard_entries_raw;

-- 3. Create the updatable View with dynamic ranking calculation
create or replace view public.leaderboard_entries as
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

-- 4. Create INSTEAD OF trigger to redirect writes to the raw store
create or replace function public.write_leaderboard_entries()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.leaderboard_entries_raw 
      (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
    values 
      (new.user_id, new.period, new.period_start, new.display_name, new.score, new.water_saved_ml_estimate, new.visible)
    returning id, updated_at into new.id, new.updated_at;
    return new;
  elsif tg_op = 'UPDATE' then
    update public.leaderboard_entries_raw set
      display_name = new.display_name,
      score = new.score,
      water_saved_ml_estimate = new.water_saved_ml_estimate,
      visible = new.visible,
      updated_at = now()
    where id = old.id;
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.leaderboard_entries_raw where id = old.id;
    return old;
  end if;
end;
$$;

create trigger write_leaderboard_entries_trg
instead of insert or update or delete on public.leaderboard_entries
for each row execute function public.write_leaderboard_entries();

-- 5. Refactor sync_leaderboard_entry trigger to REMOVE rank calculation step
create or replace function public.sync_leaderboard_entry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_display_name text;
  user_email text;
  total_water numeric;
  total_tokens bigint;
  points_score integer;
begin
  -- 1. Try to get display_name from leaderboard_profiles
  select display_name into user_display_name
  from public.leaderboard_profiles
  where user_id = new.user_id;

  -- 2. If no display name, check profiles table
  if user_display_name is null then
    select display_name into user_display_name
    from public.profiles
    where id = new.user_id;
  end if;

  -- 3. If still null, fetch from auth.users email
  if user_display_name is null or user_display_name = '' then
    select email into user_email
    from auth.users
    where id = new.user_id;
    
    if user_email is not null then
      user_display_name := split_part(user_email, '@', 1);
    else
      user_display_name := 'Explorer_' || substring(new.user_id::text, 1, 8);
    end if;
  end if;

  -- 4. Calculate the user's total daily water saved and tokens for this date
  select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
  into total_water, total_tokens
  from public.usage_daily
  where user_id = new.user_id and usage_date = new.usage_date;

  points_score := floor(total_water);

  -- 5. Upsert into leaderboard_entries (which redirects to leaderboard_entries_raw via trigger)
  insert into public.leaderboard_entries (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
  values (new.user_id, 'daily', new.usage_date, user_display_name, points_score, total_water, true)
  on conflict (period, period_start, user_id) do update set
    display_name = excluded.display_name,
    score = excluded.score,
    water_saved_ml_estimate = excluded.water_saved_ml_estimate,
    visible = true;

  -- Rank recalculations are removed! Serves dynamically via views.
  return new;
end;
$$;

-- 6. Refactor sync_leaderboard_profile_change function to target raw store
create or replace function public.sync_leaderboard_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.leaderboard_entries_raw
  set display_name = new.display_name
  where user_id = new.user_id;

  return new;
end;
$$;

-- 7. Restore triggers on underlying tables
create trigger sync_leaderboard_entry_trg
after insert or update on public.usage_daily
for each row execute function public.sync_leaderboard_entry();

create trigger sync_leaderboard_profile_change_trg
after insert or update on public.leaderboard_profiles
for each row execute function public.sync_leaderboard_profile_change();

-- 8. Add composite indexes to the raw storage table for fast partitioned rank calculation
create index if not exists leaderboard_entries_raw_query_idx 
on public.leaderboard_entries_raw (period, period_start, score desc, water_saved_ml_estimate desc);

-- 9. Add partial unique index to usage_daily to enforce idempotency when device_id is null
create unique index if not exists usage_daily_idempotency_null_device_idx 
on public.usage_daily (user_id, usage_date, idempotency_key) 
where device_id is null;
