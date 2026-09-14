# AIDevelopment

A Next.js App Router application with a single-account sign-in. The protected page
at `/dashboard` is reachable only with a valid session; anything else is sent to the
sign-in form at `/login`.

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

The account, password, and session secret come from the environment: `ADMIN_ACCOUNT`,
`ADMIN_PASSWORD`, and `SESSION_SECRET`. `.env.local` holds the real values and is
never committed; `.env.example` documents the keys. The server reads all three when
it starts, so a missing or incomplete file leaves it serving nothing but errors,
naming the value it wants, instead of failing later as a rejected sign-in. A session
lasts eight hours; `SESSION_TTL_SECONDS` overrides that, which is what the end-to-end
suite does so that it can watch a session expire.

## Checks

```bash
npm run typecheck
npm test          # Playwright drives the production build on port 3105
npm run build
```

The end-to-end test starts its own server and passes it its own account, so it needs
no `.env.local` and no separately running dev server.
