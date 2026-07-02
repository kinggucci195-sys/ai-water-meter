-- Applied to project ffgynwxpjkrkwvkrucoz via Supabase connector on 2026-07-02.
-- Source of truth for AI Water Meter auth, aggregate sync, and leaderboard tables.
-- The live migration includes RLS policies and realtime publication for leaderboard_entries.
-- See LEADERBOARD.md and ACCOUNT_SYNC.md for privacy/security boundaries.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_seed text not null default encode(gen_random_bytes(8), 'hex'),
  leaderboard_opt_in boolean not null default false,
  unranked_mode boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 2 and 40)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_kind text not null check (client_kind in ('chrome_extension', 'edge_extension', 'vscode_extension')),
  client_version text,
  refresh_token_hash text,
  last_sequence bigint not null default 0,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.estimate_methods (
  id text primary key,
  model_family text not null,
  boundary text not null,
  source_url text not null,
  energy_wh_per_500_output_tokens numeric not null,
  direct_water_l_per_kwh numeric not null,
  indirect_grid_water_l_per_kwh numeric not null,
  carbon_g_per_kwh numeric not null,
  uncertainty_low_multiplier numeric not null,
  uncertainty_high_multiplier numeric not null,
  active_from date not null default current_date,
  notes text
);

create table if not exists public.usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  usage_date date not null,
  site text not null default 'unknown',
  method_id text not null references public.estimate_methods(id),
  sequence bigint not null,
  prompt_count integer not null default 0 check (prompt_count >= 0),
  input_tokens_est integer not null default 0 check (input_tokens_est >= 0),
  output_tokens_est integer not null default 0 check (output_tokens_est >= 0),
  energy_wh numeric not null default 0 check (energy_wh >= 0),
  water_ml_low numeric not null default 0 check (water_ml_low >= 0),
  water_ml_mid numeric not null default 0 check (water_ml_mid >= 0),
  water_ml_high numeric not null default 0 check (water_ml_high >= 0),
  carbon_g numeric not null default 0 check (carbon_g >= 0),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id, usage_date, idempotency_key)
);

create table if not exists public.leaderboard_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  coarse_region text,
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leaderboard_display_name_length check (char_length(display_name) between 2 and 40)
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null check (period in ('weekly', 'monthly', 'all_time')),
  period_start date not null,
  rank integer not null check (rank > 0),
  display_name text not null,
  score integer not null check (score >= 0),
  badge text not null default 'tracker',
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  water_saved_ml_estimate numeric not null default 0 check (water_saved_ml_estimate >= 0),
  visible boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (period, period_start, user_id)
);

create table if not exists public.abuse_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  reason text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.estimate_methods (
  id,
  model_family,
  boundary,
  source_url,
  energy_wh_per_500_output_tokens,
  direct_water_l_per_kwh,
  indirect_grid_water_l_per_kwh,
  carbon_g_per_kwh,
  uncertainty_low_multiplier,
  uncertainty_high_multiplier,
  notes
) values (
  'modern-text-2026',
  'unknown-frontier-text',
  'operational-estimate',
  'https://github.com/kinggucci195-sys/ai-water-meter/blob/main/DATASET.md',
  0.30,
  1.0,
  4.52,
  350,
  0.33,
  3.0,
  'Default local estimator profile. Not provider telemetry.'
) on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_usage_daily_updated_at on public.usage_daily;
create trigger set_usage_daily_updated_at
before update on public.usage_daily
for each row execute function public.set_updated_at();

drop trigger if exists set_leaderboard_profiles_updated_at on public.leaderboard_profiles;
create trigger set_leaderboard_profiles_updated_at
before update on public.leaderboard_profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.estimate_methods enable row level security;
alter table public.usage_daily enable row level security;
alter table public.leaderboard_profiles enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.abuse_flags enable row level security;

create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy devices_own on public.devices
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy estimate_methods_public_read on public.estimate_methods
for select using (true);

create policy usage_daily_own on public.usage_daily
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy leaderboard_profiles_own on public.leaderboard_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy leaderboard_profiles_public_visible on public.leaderboard_profiles
for select using (visible = true);

create policy leaderboard_entries_public_visible on public.leaderboard_entries
for select using (visible = true);
create policy leaderboard_entries_own on public.leaderboard_entries
for select using (auth.uid() = user_id);

create policy abuse_flags_own_read on public.abuse_flags
for select using (auth.uid() = user_id);

alter publication supabase_realtime add table public.leaderboard_entries;
