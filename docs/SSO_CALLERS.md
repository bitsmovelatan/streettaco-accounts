# SSO: sync with who calls (return_to)

Accounts is the IdP. **Callers** (apps that send users to Accounts for login/consent) must pass `return_to` so that after auth, the user is sent back to the **caller’s** URL, not a fixed one.

## Contract

1. **Caller** redirects to Accounts with the URL it wants the user to return to:
   - Login: `https://accounts.streettaco.com.au/login?return_to=<caller_current_url>`
   - Consent: `https://accounts.streettaco.com.au/consent?return_to=<caller_current_url>`
2. **Accounts** accepts `return_to` only for trusted hosts: **\*.streettaco.com.au** (and localhost in dev). See `lib/validations.ts` → `isTrustedReturnUrl` / `parseReturnTo`.
3. After login or consent, Accounts redirects to the validated `return_to`. If missing or invalid, fallback is `DEFAULT_RETURN_URL` (Plus).

So **redirect is always synced with the caller**: whoever sends the user to Accounts gets them back on their own origin.

## Known callers

| App | Origin | return_to default |
|-----|--------|--------------------|
| **streettaco-v0** (Plus) | `NEXT_PUBLIC_APP_URL` / plus.streettaco.com.au | Plus origin or current path |
| **streettaco-admin** | `environment.appUrl` / admin.streettaco.com.au | Admin origin or current URL |

Both use a helper like `getAccountsLoginUrl(returnTo)` and pass the **current page URL** when redirecting unauthenticated users (e.g. Plus middleware, Admin guard). Consent flows (e.g. Plus AccountGate) pass `window.location.origin + pathname` so the user returns to the same Plus page after consent.

## Env / constants (callers)

- **Plus:** `NEXT_PUBLIC_ACCOUNTS_ORIGIN` (Accounts), `NEXT_PUBLIC_APP_URL` (Plus origin for return_to). See `streettaco-v0/lib/constants.ts`.
- **Admin:** `accountsOrigin` (Accounts), `appUrl` (Admin origin for return_to). See `streettaco-admin/src/app/core/constants/sso.constants.ts`.

No fixed redirect: any subdomain \*.streettaco.com.au can be a caller and get users back on its own URL after login/consent.
