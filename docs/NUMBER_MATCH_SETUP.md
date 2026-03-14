# Number Match (Magic Link) — Setup & Troubleshooting

The "Check your email and select this number to securely sign in" flow uses:

1. **Magic link request** → insert into `auth_sync` (pending), then Supabase `signInWithOtp` sends the email.
2. **User clicks link in email** → lands on `/auth/callback?code=...&expected_match=...` → callback exchanges code, updates `auth_sync` to `verified` with session token.
3. **Waiting page** → either receives a **Realtime** UPDATE on `auth_sync`, or **polling** (every 2s) detects `status = 'verified'` → sets session and redirects.

If the number never “arrives” (waiting page stays stuck), check the following.

---

## 1. Supabase Auth: Redirect URLs

The link in the email must point to your callback. In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `https://accounts.streettaco.com.au` (or your Accounts origin).
- **Redirect URLs**: add at least:
  - `https://accounts.streettaco.com.au/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

If the callback URL is not allowlisted, Supabase may redirect elsewhere and the callback (and thus `auth_sync` update) never runs.

---

## 2. Realtime for `auth_sync`

The waiting page subscribes to **Postgres Changes** on `public.auth_sync`. If Realtime is not enabled for this table, the UPDATE from the callback will not be broadcast and the page relies on **polling** (every 2s).

To enable Realtime:

1. **Supabase Dashboard → Database → Replication** (or **Realtime**).
2. Ensure `public.auth_sync` is in the **supabase_realtime** publication (or your project’s publication used for Realtime).

SQL (run in SQL Editor if needed):

```sql
-- Add auth_sync to the realtime publication so the waiting page receives UPDATEs
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_sync;
```

---

## 3. RLS and `auth_sync`

- **Insert** (magic-link action): anon/service role must be able to `INSERT` into `auth_sync`.
- **Update** (callback route): anon must be able to `UPDATE` the row where `email`, `match_number`, `status = 'pending'`.
- **Select** (polling via `checkMagicLinkVerified`): anon must be able to `SELECT` the row where `email`, `match_number`, `status = 'verified'` (so the waiting page can poll and get the token).

Example permissive policies (tune to your security needs):

```sql
-- Allow insert for magic link flow
CREATE POLICY "auth_sync_insert" ON public.auth_sync
  FOR INSERT TO anon WITH CHECK (true);

-- Allow update for callback (match pending row)
CREATE POLICY "auth_sync_update" ON public.auth_sync
  FOR UPDATE TO anon USING (status = 'pending');

-- Allow select for polling when verified (so waiting page can read token)
CREATE POLICY "auth_sync_select_verified" ON public.auth_sync
  FOR SELECT TO anon USING (status = 'verified');
```

---

## 4. Email delivery (Supabase Auth)

If the user never receives the email:

- **Authentication → Providers → Email**: confirm "Confirm email" / magic link is enabled.
- **Authentication → Email Templates**: ensure the magic link template uses `{{ .ConfirmationURL }}` or the correct redirect.
- Check **Supabase → Logs** for auth/send errors.
- If using custom SMTP, verify SMTP settings in **Project Settings → Auth**.

---

## 5. Polling fallback

The waiting page now **polls** every 2 seconds via `checkMagicLinkVerified`. So even if Realtime does not fire (table not in publication, or user opened the link in another tab), the page should still detect `status = 'verified'` and complete sign-in. For polling to work, RLS must allow `SELECT` on the verified row (see §3).
