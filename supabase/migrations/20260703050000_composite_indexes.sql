-- Migration: Create composite index for user usage logs (sorted desc)
-- Run this script in your Supabase SQL Editor to make dashboard metrics load and refresh instantly.

-- 1. Create a composite index to completely optimize dashboard REST query performance
create index if not exists usage_daily_user_id_date_desc_idx 
on public.usage_daily (user_id, usage_date desc);
