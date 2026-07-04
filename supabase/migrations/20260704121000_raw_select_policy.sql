-- Migration: Add select policy to leaderboard_entries_raw
-- Without a SELECT policy, RLS blocks Supabase Realtime from broadcasting changes to client WebSockets.

create policy raw_select_public on public.leaderboard_entries_raw
for select using (visible = true);
