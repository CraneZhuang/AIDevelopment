# AIDevelopment

A Next.js App Router application with a single-account sign-in. The protected page
at `/dashboard` is reachable only with a valid session; anything else is sent to the
sign-in form at `/login`.

## Running it

```bash
npm install
cp .env.example .env.local   # then edit the values
npm run dev
```

The account, password, and session secret come from the environment: `ADMIN_ACCOUNT`,
`ADMIN_PASSWORD`, and `SESSION_SECRET`. `.env.local` holds the real values and is
never committed; `.env.example` documents the keys. A missing value fails loudly on
the first request rather than surfacing as a failed sign-in.

## Checks

```bash
npm run typecheck
npm test          # Playwright drives the production build on port 3105
npm run build
```

The end-to-end test starts its own server, so no separate `npm run dev` is needed.
