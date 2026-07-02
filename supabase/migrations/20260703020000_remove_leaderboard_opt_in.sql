-- Migration: Remove opt-in requirement and rank all users automatically.
-- Run this script in your Supabase SQL Editor to apply triggers and backfill all user ranks.

create or replace function public.sync_leaderboard_entry()
returns trigger
language plpgsql
security definer
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

  -- Score corresponds to water ml saved
  points_score := floor(total_water);

  -- 5. Upsert into leaderboard_entries for 'daily' period (always visible = true)
  insert into public.leaderboard_entries (user_id, period, period_start, rank, display_name, score, water_saved_ml_estimate, visible)
  values (new.user_id, 'daily', new.usage_date, 1, user_display_name, points_score, total_water, true)
  on conflict (period, period_start, user_id) do update set
    display_name = excluded.display_name,
    score = excluded.score,
    water_saved_ml_estimate = excluded.water_saved_ml_estimate,
    visible = true;

  -- 6. Recalculate ranks for this specific daily period_start
  with ranked as (
    select id, row_number() over (order by score desc, water_saved_ml_estimate desc) as new_rank
    from public.leaderboard_entries
    where period = 'daily' and period_start = new.usage_date
  )
  update public.leaderboard_entries e
  set rank = r.new_rank
  from ranked r
  where e.id = r.id;

  return new;
end;
$$;


-- Trigger function to handle user nickname changes
create or replace function public.sync_leaderboard_profile_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update all entries for this user with their new display_name
  update public.leaderboard_entries
  set display_name = new.display_name
  where user_id = new.user_id;

  return new;
end;
$$;


-- Backfill script to populate existing users' rankings
do $$
declare
  r record;
  user_display_name text;
  user_email text;
begin
  for r in (
    select user_id, usage_date, sum(water_ml_mid) as total_water
    from public.usage_daily
    group by user_id, usage_date
  ) loop
    -- Resolve name
    select display_name into user_display_name
    from public.leaderboard_profiles
    where user_id = r.user_id;

    if user_display_name is null then
      select display_name into user_display_name
      from public.profiles
      where id = r.user_id;
    end if;

    if user_display_name is null or user_display_name = '' then
      select email into user_email
      from auth.users
      where id = r.user_id;
      
      if user_email is not null then
        user_display_name := split_part(user_email, '@', 1);
      else
        user_display_name := 'Explorer_' || substring(r.user_id::text, 1, 8);
      end if;
    end if;

    -- Upsert
    insert into public.leaderboard_entries (user_id, period, period_start, rank, display_name, score, water_saved_ml_estimate, visible)
    values (r.user_id, 'daily', r.usage_date, 1, user_display_name, floor(r.total_water), r.total_water, true)
    on conflict (period, period_start, user_id) do update set
      display_name = excluded.display_name,
      score = excluded.score,
      water_saved_ml_estimate = excluded.water_saved_ml_estimate,
      visible = true;

    -- Recalculate ranks
    with ranked as (
      select id, row_number() over (order by score desc, water_saved_ml_estimate desc) as new_rank
      from public.leaderboard_entries
      where period = 'daily' and period_start = r.usage_date
    )
    update public.leaderboard_entries e
    set rank = r.new_rank
    from ranked r
    where e.id = r.id;
  end loop;
end;
$$;
