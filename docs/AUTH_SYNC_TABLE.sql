-- auth_sync: table for the number-match magic link flow (Accounts).
-- Run this in Supabase Dashboard → SQL Editor if the table is missing.
-- If the table already exists, run only the CREATE POLICY and ALTER PUBLICATION lines as needed
-- (skip or comment out any that already exist to avoid "already exists" errors).
--
-- Flow:
-- 1. User requests magic link → INSERT (email, match_number, status 'pending').
-- 2. User clicks number in email → callback UPDATE (status 'verified', token).
-- 3. Waiting page SELECTs where status = 'verified' (or Realtime) to get token and complete sign-in.
--
-- Allowed status values only: 'pending', 'verified'. If you get error 23514 (check constraint auth_sync_status_check)
-- with status = 'active', run docs/AUTH_SYNC_FIX_STATUS_CONSTRAINT.sql and ensure no trigger/script uses 'active'.

CREATE TABLE IF NOT EXISTS public.auth_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  match_number smallint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  token text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sync_lookup ON public.auth_sync (email, match_number, status);

ALTER TABLE public.auth_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- INSERT: anon (no session) and authenticated (if user has a session cookie when requesting magic link)
CREATE POLICY "auth_sync_insert" ON public.auth_sync
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth_sync_insert_authenticated" ON public.auth_sync
  FOR INSERT TO authenticated WITH CHECK (true);
-- UPDATE: anon (legacy) and authenticated (callback/complete runs with user session, so role is authenticated)
CREATE POLICY "auth_sync_update" ON public.auth_sync
  FOR UPDATE TO anon USING (status = 'pending');

CREATE POLICY "auth_sync_update_authenticated" ON public.auth_sync
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND email = lower(auth.jwt() ->> 'email'));

-- SELECT: anon (waiting page polls for verified row)
CREATE POLICY "auth_sync_select_verified" ON public.auth_sync
  FOR SELECT TO authenticated USING (status = 'verified');

CREATE POLICY "auth_sync_select_verified" ON public.auth_sync
  FOR SELECT TO anon USING (status = 'verified');

-- Realtime (so the waiting page can subscribe to changes)
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_sync;
