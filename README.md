# Street Taco Accounts (IdP)

Identity Provider for the Street Taco ecosystem at **accounts.streettaco.com.au**.

- **Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase Auth (SSR), Tailwind CSS 4, pnpm.
- **Auth:** Google Email Login; session cookies are shared across `*.streettaco.com.au` (domain: `.streettaco.com.au`, path: `/`, sameSite: `lax`, secure).
- **Flow:** Login → Auth callback → consent check (profiles: `tos_accepted`, `privacy_accepted`; plus any active `legal_documents` → `account_consents`) → redirect to `return_to` or **https://plus.streettaco.com.au**. Consent is unified here; Plus redirects to `/consent` when the user has pending documents.

## Setup

1. **Install:** `pnpm install`
2. **Env:** Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Google OAuth (via Supabase Dashboard → Authentication → Providers)
3. **DB:** Ensure `public.profiles` has (or add) columns used by this app: `tos_accepted`, `tos_accepted_at`, `tos_version`, `privacy_accepted`, `privacy_accepted_at`, `privacy_version`, `avatar_url`.
4. **Run:** `pnpm dev`

## Routes

| Route | Description |
|-------|-------------|
| `/` | Redirect: unauthenticated → `/login?return_to=…`; no consent → `/consent?return_to=…`; else → `return_to` or plus.streettaco.com.au |
| `/login` | Branded Google sign-in; preserves `return_to` |
| `/auth/callback` | Exchange code, upsert profile, check consent; redirect to `/consent` or `return_to` |
| `/consent` | Accept ToS & Privacy (profiles) and any active legal documents (account_consents); then redirect to `return_to` |
| `/profile` | Edit `full_name`, `avatar_url` |
| `/security` | Show current session; “Sign out everywhere” (global logout for .streettaco.com.au) |

## Navigation

- **return_to** is always preferred when present.
- Fallback when no `return_to`: **https://plus.streettaco.com.au**.

## Source

Data types and config are aligned with **streettaco-v0** (database types, Supabase SSR, env vars, `public/images`, globals.css, Tailwind, and component style references).
# streettaco-accounts
# streettaco-accounts
