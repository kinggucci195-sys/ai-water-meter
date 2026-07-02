-- Trigger functions to automatically update the leaderboard_entries table in realtime when daily usage aggregates or user visibility change.

create or replace function public.sync_leaderboard_entry()
returns trigger
language plpgsql
security definer
as $$
declare
  user_visible boolean;
  user_display_name text;
  total_water numeric;
  total_tokens bigint;
  points_score integer;
begin
  -- 1. Check if the user has opted into the leaderboard
  select visible, display_name into user_visible, user_display_name
  from public.leaderboard_profiles
  where user_id = new.user_id;

  if user_visible = true then
    -- 2. Calculate the user's total daily water saved and tokens
    select coalesce(sum(water_ml_mid), 0), coalesce(sum(input_tokens_est + output_tokens_est), 0)
    into total_water, total_tokens
    from public.usage_daily
    where user_id = new.user_id and usage_date = new.usage_date;

    -- Score corresponds directly to water ml saved
    points_score := floor(total_water);

    -- 3. Upsert into leaderboard_entries for 'daily' period
    insert into public.leaderboard_entries (user_id, period, period_start, rank, display_name, score, water_saved_ml_estimate, visible)
    values (new.user_id, 'daily', new.usage_date, 1, user_display_name, points_score, total_water, true)
    on conflict (period, period_start, user_id) do update set
      display_name = excluded.display_name,
      score = excluded.score,
      water_saved_ml_estimate = excluded.water_saved_ml_estimate,
      visible = true;

    -- 4. Recalculate ranks for this specific daily period_start
    with ranked as (
      select id, row_number() over (order by score desc, water_saved_ml_estimate desc) as new_rank
      from public.leaderboard_entries
      where period = 'daily' and period_start = new.usage_date
    )
    update public.leaderboard_entries e
    set rank = r.new_rank
    from ranked r
    where e.id = r.id;

  else
    -- If user is not visible, ensure their daily entry for this date is deleted
    delete from public.leaderboard_entries
    where user_id = new.user_id and period = 'daily' and period_start = new.usage_date;

    -- Recalculate ranks for this specific daily period_start
    with ranked as (
      select id, row_number() over (order by score desc, water_saved_ml_estimate desc) as new_rank
      from public.leaderboard_entries
      where period = 'daily' and period_start = new.usage_date
    )
    update public.leaderboard_entries e
    set rank = r.new_rank
    from ranked r
    where e.id = r.id;
  end if;

  return new;
end;
$$;

-- Create the trigger on public.usage_daily
drop trigger if exists on_usage_daily_change on public.usage_daily;
create trigger on_usage_daily_change
after insert or update on public.usage_daily
for each row execute function public.sync_leaderboard_entry();


-- Trigger function to handle user visibility changes (opt-in / opt-out / name change)
create or replace function public.sync_leaderboard_profile_change()
returns trigger
language plpgsql
security definer
as $$
declare
  r record;
begin
  if new.visible = true then
    -- For each unique daily usage date the user has logs for, upsert their entry
    for r in (
      select usage_date, sum(water_ml_mid) as total_water
      from public.usage_daily
      where user_id = new.user_id
      group by usage_date
    ) loop
      insert into public.leaderboard_entries (user_id, period, period_start, rank, display_name, score, water_saved_ml_estimate, visible)
      values (new.user_id, 'daily', r.usage_date, 1, new.display_name, floor(r.total_water), r.total_water, true)
      on conflict (period, period_start, user_id) do update set
        display_name = excluded.display_name,
        score = excluded.score,
        water_saved_ml_estimate = excluded.water_saved_ml_estimate,
        visible = true;

      -- Recalculate ranks for this specific daily period_start
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
  else
    -- Delete all entries for this user when opting out
    delete from public.leaderboard_entries where user_id = new.user_id;
  end if;

  return new;
end;
$$;

-- Create the trigger on public.leaderboard_profiles
drop trigger if exists on_leaderboard_profile_change on public.leaderboard_profiles;
create trigger on_leaderboard_profile_change
after insert or update on public.leaderboard_profiles
for each row execute function public.sync_leaderboard_profile_change();
