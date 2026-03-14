# Number Match (Magic Link) — Setup & Troubleshooting

The "Check your email and select this number to securely sign in" flow uses:

1. **Magic link request** → insert into `auth_sync` (pending), then **Supabase Admin generateLink** (no email from Supabase), then **Resend** sends a custom email with the match number and decoy numbers; the only clickable number links to our callback.
2. **User clicks the number in the email** → link goes to Supabase verify, then redirects to **our** `/auth/callback?expected_match=...&return_to=...` (Accounts).
3. **Callback** → exchanges code, updates `auth_sync` to `verified`, sets cookie, redirects to `return_to`.
4. **Waiting page** → Realtime or **polling** (every 2s) detects `status = 'verified'` → sets session and redirects.

If the number never “arrives” (waiting page stays stuck), check the following.

---

## 1. Supabase Auth: Redirect URLs (fix "click goes to Plus")

The link in the email is built by Supabase. We pass `redirectTo: https://accounts.streettaco.com.au/auth/callback?expected_match=…&return_to=…`. **If that URL is not allowlisted, Supabase ignores it and redirects to the default Site URL** (often `https://plus.streettaco.com.au`), so the user lands on Plus instead of the Accounts callback.

**Do this in Supabase Dashboard → Authentication → URL Configuration:**

1. **Site URL**  
   Set to **`https://accounts.streettaco.com.au`** only (no path, no asterisk).  
   Supabase does **not** allow wildcards here. If you use a path (e.g. `/auth/callback`) or `*`, Supabase may redirect to a wrong URL (e.g. `.../auth/callback*`) and the callback will fail.  
   This is the default when no redirect is allowed; if it’s Plus, magic links will go to Plus.

2. **Redirect URLs**  
   Add at least:
   - `https://accounts.streettaco.com.au/auth/callback`
   - Or with wildcard: `https://*.streettaco.com.au/auth/callback` (wildcards are allowed here)  
   And for local dev:
   - `http://localhost:3000/auth/callback` or `http://localhost:3000/**`

3. **Save** and send a new magic link; the link in the email should now go to Accounts and then to your callback (number match + redirect to return_to).

### When you click the number on another device (e.g. phone)

The flow is: **PC** has the waiting page open → you click the number in the email on your **phone** → the callback runs (from the phone’s request) → it must update `auth_sync` → the **PC** sees that update (Realtime or polling) and sets the session, then redirects.

- If you end up on **login** after clicking on the phone, look at the URL: `?error=...` tells you why (e.g. `no_code`, `auth_failed`, `number_mismatch`). The login page now shows a short message for each.
- For the **PC** to get the session, the callback must receive **both** the auth payload and **`expected_match`**. The link Supabase builds must keep the full redirect URL we pass (with query params). In **Redirect URLs** you can use e.g. `https://accounts.streettaco.com.au/auth/callback` or `https://*.streettaco.com.au/auth/callback` so the full URL with `expected_match` and `return_to` is allowed. Do **not** put a path or wildcard in **Site URL** (see above).
- Supabase may redirect with tokens in the **URL hash** (`#access_token=...`) instead of `?code=...`. The hash is only visible in the browser. We handle this with a client-side callback page that runs in the browser: it reads the hash, calls `setSession`, then redirects to `/auth/callback/complete`, which updates `auth_sync` and redirects to `return_to`.
- Ensure **Realtime** and **RLS** (below) are set so the PC’s waiting page can see the `auth_sync` update; otherwise only the device that clicked gets the session (via cookies), and the PC keeps waiting.

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

## 4. Email delivery (Resend)

We **do not** use Supabase’s built-in email for the number-match flow. We use **Resend** to send a custom HTML email that shows the match number and decoy numbers.

- **Env**: set `RESEND_API_KEY` and `RESEND_FROM` (e.g. `StreetTaco <noreply@yourdomain.com>`). See `.env.example`.
- **Resend**: verify your domain at https://resend.com/domains and use a `from` address on that domain.
- If the user never receives the email, check server logs for `[sendMagicLinkWithNumberMatch] Resend failed:` and the Resend dashboard for delivery status.

---

## 5. Polling fallback

The waiting page now **polls** every 2 seconds via `checkMagicLinkVerified`. So even if Realtime does not fire (table not in publication, or user opened the link in another tab), the page should still detect `status = 'verified'` and complete sign-in. For polling to work, RLS must allow `SELECT` on the verified row (see §3).
