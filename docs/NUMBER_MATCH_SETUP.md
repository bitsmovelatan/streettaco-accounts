# Number Match (Magic Link) — Setup & Troubleshooting

The "Check your email and select this number to securely sign in" flow uses:

1. **Magic link request** → insert into `auth_sync` (pending), then **Supabase Admin generateLink** (no email from Supabase), then **Resend** sends a custom email with the match number and decoy numbers; the only clickable number links to our callback.
2. **User clicks the number in the email** → link goes to Supabase verify, then redirects to **our** `/auth/callback?expected_match=...&return_to=...` (Accounts).
3. **Callback / login** → set session, then **GET `/auth/callback/complete`** → server updates `auth_sync` to `verified`, then redirects the **validator** (device that clicked) to **`/actions/closer`** (Accounts). The validator never goes to Plus.
4. **Waiting page** (e.g. Chrome) → Realtime or **polling** (every 2s) detects `status = 'verified'` → sets session and redirects to **`return_to`** (e.g. Plus).

### Flujo esperado vs problemas típicos

| Dispositivo | Esperado | Si falla |
|-------------|----------|----------|
| **Chrome (esperando)** | Página "Check your email…" → al hacer clic en el móvil, recibe sesión y redirige a Plus **una vez**. | Se queda esperando: revisar §1 (Supabase Redirect), §2 (Realtime), §3 (RLS UPDATE). |
| **Móvil (validador)** | Tras clic en el número → "You can close this tab" en **accounts** (`/actions/closer`), **sin** abrir Plus. | Va a **plus.streettaco.com.au** y hace **loop**: casi siempre **Site URL o Redirect URLs** en Supabase (§1). |

If the number never “arrives” (waiting page stays stuck), check the following. If **you see no rows in `auth_sync`**, see §0 below.

---

## 0. Table `auth_sync` — create and verify

If there are **no rows** in `auth_sync` when you request a magic link, the table may be missing or RLS may be blocking the insert. The insert runs in `requestMagicLink()` **before** the email is sent; if it fails, the user sees "Could not start sign-in. Please try again." and no email is sent.

**1. Create the table** (Supabase Dashboard → SQL Editor). You can run the full script in **`docs/AUTH_SYNC_TABLE.sql`** (table + RLS + Realtime). Or run manually:

```sql
-- Number-match magic link flow (Accounts).
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
```

**2. Add RLS policies** (see §3). Without INSERT for `anon`, the server cannot insert.

**3. Verify:** After clicking "Send magic link", run `SELECT * FROM public.auth_sync ORDER BY created_at DESC LIMIT 5;` — you should see a row with `status = 'pending'`. If not, check server logs for `[requestMagicLink] auth_sync insert failed:` and the error (e.g. relation does not exist, or RLS violation).

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

3. **Env:** In production set `NEXT_PUBLIC_ACCOUNTS_ORIGIN=https://accounts.streettaco.com.au` so the magic-link redirect URL matches the Supabase allowlist (see `app/actions/magic-link.ts`).

4. **Save** and send a new magic link; the link in the email should now go to Accounts and then to your callback (number match + redirect to return_to).

### When you click the number on another device (e.g. phone)

The flow is: **PC** has the waiting page open → you click the number in the email on your **phone** → the callback runs (from the phone’s request) → it must update `auth_sync` → the **PC** sees that update (Realtime or polling) and sets the session, then redirects.

- If you end up on **login** after clicking on the phone, look at the URL: `?error=...` tells you why (e.g. `no_code`, `auth_failed`, `number_mismatch`). The login page now shows a short message for each.
- For the **PC** to get the session, the callback must receive **both** the auth payload and **`expected_match`**. The link Supabase builds must keep the full redirect URL we pass (with query params). In **Redirect URLs** you can use e.g. `https://accounts.streettaco.com.au/auth/callback` or `https://*.streettaco.com.au/auth/callback` so the full URL with `expected_match` and `return_to` is allowed. Do **not** put a path or wildcard in **Site URL** (see above).
- Supabase may redirect with tokens in the **URL hash** (`#access_token=...`) instead of `?code=...`. The hash is only visible in the browser. We handle this with a client-side callback page that runs in the browser: it reads the hash, calls `setSession`, then redirects to `/auth/callback/complete`, which updates `auth_sync` and then **redirects the validator to `/actions/closer`** (never to Plus). Only the **waiting** device (e.g. Chrome) later redirects to `return_to` (Plus) after receiving the session.
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

- **Insert** (magic-link action): the server may run with a session cookie (e.g. user still logged in), so Supabase uses **authenticated**. You need INSERT for both **anon** and **authenticated** (see policies below).
- **Update** (callback/complete): when the user clicks the link they already have a session, so Supabase uses the **authenticated** role. You need an UPDATE policy for **authenticated** (see below); if only `anon` can update, the row never becomes `verified`.
- **Select** (polling via `checkMagicLinkVerified`): anon must be able to `SELECT` the row where `email`, `match_number`, `status = 'verified'` (so the waiting page can poll and get the token).

Example permissive policies (tune to your security needs):

```sql
-- Allow insert for magic link flow
CREATE POLICY "auth_sync_insert" ON public.auth_sync
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth_sync_insert_authenticated" ON public.auth_sync
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow update for callback (match pending row). Also need auth_sync_update_authenticated (user has session when clicking link).
CREATE POLICY "auth_sync_update" ON public.auth_sync
  FOR UPDATE TO anon USING (status = 'pending');

CREATE POLICY "auth_sync_update_authenticated" ON public.auth_sync
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND email = lower(auth.jwt() ->> 'email'));

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
