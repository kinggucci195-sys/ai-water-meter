-- Migration: Enable Realtime Synchronization for Leaderboard Raw Table
-- Resolves view logical replication limitations by allowing client realtime subscription directly to the raw table.

-- 1. Ensure RLS is enabled on the raw table
alter table public.leaderboard_entries_raw enable row level security;

-- 2. Grant SELECT privileges on the raw table to public roles (required for realtime changes selection)
grant select on public.leaderboard_entries_raw to anon, authenticated, service_role;

-- 3. Set replica identity to full for detailed update payload diffing
alter table public.leaderboard_entries_raw replica identity full;

-- 4. Check and add the raw table to the Supabase Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'leaderboard_entries_raw'
  ) then
    alter publication supabase_realtime add table public.leaderboard_entries_raw;
  end if;
end;
$$;
