-- Migration: Add Weekly, Monthly, and All-Time Leaderboard Period Sync
-- Writes directly to leaderboard_entries_raw (the underlying table).
-- The leaderboard_entries VIEW computes dense_rank() dynamically on read.

-- 1. Replace sync_leaderboard_entry trigger to aggregate daily, weekly, monthly, and all-time periods
create or replace function public.sync_leaderboard_entry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_display_name text;
  user_email text;
  
  -- Daily aggregates
  daily_water numeric;
  daily_tokens bigint;
  daily_points integer;
  
  -- Weekly aggregates
  week_start date;
  weekly_water numeric;
  weekly_tokens bigint;
  weekly_points integer;
  
  -- Monthly aggregates
  month_start date;
  monthly_water numeric;
  monthly_tokens bigint;
  monthly_points integer;
  
  -- All-time aggregates
  all_time_water numeric;
  all_time_tokens bigint;
  all_time_points integer;
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

  -- 4. DAILY CALCULATIONS
  select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
  into daily_water, daily_tokens
  from public.usage_daily
  where user_id = new.user_id and usage_date = new.usage_date;
  daily_points := floor(daily_water);

  -- 5. WEEKLY CALCULATIONS (Monday start via date_trunc)
  week_start := date_trunc('week', new.usage_date)::date;
  select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
  into weekly_water, weekly_tokens
  from public.usage_daily
  where user_id = new.user_id and usage_date >= week_start and usage_date < week_start + 7;
  weekly_points := floor(weekly_water);

  -- 6. MONTHLY CALCULATIONS (1st of month)
  month_start := date_trunc('month', new.usage_date)::date;
  select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
  into monthly_water, monthly_tokens
  from public.usage_daily
  where user_id = new.user_id and usage_date >= month_start and usage_date < month_start + interval '1 month';
  monthly_points := floor(monthly_water);

  -- 7. ALL-TIME CALCULATIONS (fixed epoch date 2000-01-01)
  select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
  into all_time_water, all_time_tokens
  from public.usage_daily
  where user_id = new.user_id;
  all_time_points := floor(all_time_water);

  -- 8. UPSERT DAILY into leaderboard_entries_raw (the actual table)
  insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
  values (new.user_id, 'daily', new.usage_date, user_display_name, daily_points, daily_water, true)
  on conflict (period, period_start, user_id) do update set
    display_name = excluded.display_name,
    score = excluded.score,
    water_saved_ml_estimate = excluded.water_saved_ml_estimate,
    visible = true;

  -- 9. UPSERT WEEKLY
  insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
  values (new.user_id, 'weekly', week_start, user_display_name, weekly_points, weekly_water, true)
  on conflict (period, period_start, user_id) do update set
    display_name = excluded.display_name,
    score = excluded.score,
    water_saved_ml_estimate = excluded.water_saved_ml_estimate,
    visible = true;

  -- 10. UPSERT MONTHLY
  insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
  values (new.user_id, 'monthly', month_start, user_display_name, monthly_points, monthly_water, true)
  on conflict (period, period_start, user_id) do update set
    display_name = excluded.display_name,
    score = excluded.score,
    water_saved_ml_estimate = excluded.water_saved_ml_estimate,
    visible = true;

  -- 11. UPSERT ALL-TIME
  insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
  values (new.user_id, 'all_time', '2000-01-01', user_display_name, all_time_points, all_time_water, true)
  on conflict (period, period_start, user_id) do update set
    display_name = excluded.display_name,
    score = excluded.score,
    water_saved_ml_estimate = excluded.water_saved_ml_estimate,
    visible = true;

  return new;
end;
$$;

-- 2. Backfill existing records — write directly to leaderboard_entries_raw
do $$
declare
  r record;
  user_display_name text;
  user_email text;
  
  -- Daily
  daily_water numeric;
  daily_tokens bigint;
  daily_points integer;
  
  -- Weekly
  week_start date;
  weekly_water numeric;
  weekly_tokens bigint;
  weekly_points integer;
  
  -- Monthly
  month_start date;
  monthly_water numeric;
  monthly_tokens bigint;
  monthly_points integer;
  
  -- All-time
  all_time_water numeric;
  all_time_tokens bigint;
  all_time_points integer;
begin
  for r in (
    select distinct user_id, usage_date
    from public.usage_daily
  ) loop
    -- Resolve display name
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

    -- DAILY
    select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
    into daily_water, daily_tokens
    from public.usage_daily
    where user_id = r.user_id and usage_date = r.usage_date;
    daily_points := floor(daily_water);

    -- WEEKLY
    week_start := date_trunc('week', r.usage_date)::date;
    select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
    into weekly_water, weekly_tokens
    from public.usage_daily
    where user_id = r.user_id and usage_date >= week_start and usage_date < week_start + 7;
    weekly_points := floor(weekly_water);

    -- MONTHLY
    month_start := date_trunc('month', r.usage_date)::date;
    select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
    into monthly_water, monthly_tokens
    from public.usage_daily
    where user_id = r.user_id and usage_date >= month_start and usage_date < month_start + interval '1 month';
    monthly_points := floor(monthly_water);

    -- ALL-TIME
    select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
    into all_time_water, all_time_tokens
    from public.usage_daily
    where user_id = r.user_id;
    all_time_points := floor(all_time_water);

    -- UPSERT DAILY into raw table
    insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
    values (r.user_id, 'daily', r.usage_date, user_display_name, daily_points, daily_water, true)
    on conflict (period, period_start, user_id) do update set
      display_name = excluded.display_name,
      score = excluded.score,
      water_saved_ml_estimate = excluded.water_saved_ml_estimate,
      visible = true;

    -- UPSERT WEEKLY
    insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
    values (r.user_id, 'weekly', week_start, user_display_name, weekly_points, weekly_water, true)
    on conflict (period, period_start, user_id) do update set
      display_name = excluded.display_name,
      score = excluded.score,
      water_saved_ml_estimate = excluded.water_saved_ml_estimate,
      visible = true;

    -- UPSERT MONTHLY
    insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
    values (r.user_id, 'monthly', month_start, user_display_name, monthly_points, monthly_water, true)
    on conflict (period, period_start, user_id) do update set
      display_name = excluded.display_name,
      score = excluded.score,
      water_saved_ml_estimate = excluded.water_saved_ml_estimate,
      visible = true;

    -- UPSERT ALL-TIME
    insert into public.leaderboard_entries_raw (user_id, period, period_start, display_name, score, water_saved_ml_estimate, visible)
    values (r.user_id, 'all_time', '2000-01-01', user_display_name, all_time_points, all_time_water, true)
    on conflict (period, period_start, user_id) do update set
      display_name = excluded.display_name,
      score = excluded.score,
      water_saved_ml_estimate = excluded.water_saved_ml_estimate,
      visible = true;
  end loop;
end;
$$;
