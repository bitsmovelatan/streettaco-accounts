-- Fix: auth_sync_status_check only allows 'pending' and 'verified'.
-- If something inserted/updated a row with status = 'active', the check fails.
-- This script: (1) normalizes existing 'active' rows to 'verified'; (2) ensures the constraint allows only pending | verified.
-- Run in Supabase Dashboard → SQL Editor.

-- 1. Fix existing rows that have status = 'active' (treat as verified so waiting page can pick them up)
UPDATE public.auth_sync
SET status = 'verified'
WHERE status = 'active';

-- 2. Replace the check constraint so only 'pending' and 'verified' are allowed
ALTER TABLE public.auth_sync
  DROP CONSTRAINT IF EXISTS auth_sync_status_check;

ALTER TABLE public.auth_sync
  ADD CONSTRAINT auth_sync_status_check CHECK (status IN ('pending', 'verified'));
