# EchoShelf — Tech

- React 18 + TypeScript 5.9 + Vite 8 (client), Express 5 + tsx (feed API), Dexie 4
  (IndexedDB). Plain CSS with custom properties; no CSS framework.
- Data stays in the browser: two isolated IndexedDB databases, `echoshelf-user` and
  `echoshelf-demo`. Only user-requested feed URLs leave the machine, via the local API.
- Layout: `src/client` (app, features, storage, styles), `src/server` (feed API),
  `src/shared` (isomorphic models/parsers/pipeline), `tests/unit`, `tests/e2e`,
  `public/demo`. Aliases: `@client`, `@server`, `@shared`.
- Other libraries: linkedom (HTML/XML parsing), Vitest + happy-dom + fast-check (unit and
  property tests), Playwright Chromium (e2e), ESLint 10 + typescript-eslint. ESM (`"type": "module"`).
- The app lives in `2026kirowen/`; run all npm commands from that directory.
- `npm test` must stay offline; external feed checks are manual and recorded in
  docs/kiro-build-log.md.

## Commands (run in `2026kirowen/`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite client and `tsx watch` feed API together |
| `npm run dev:web` / `npm run dev:api` | Client only / API only |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` for app and node configs |
| `npm test` | Vitest unit and property tests |
| `npm run test:e2e` | Playwright e2e |
| `npm run build` | Typecheck, then `vite build` |
| `npm start` | Run the feed API with tsx (API-only when `dist/` is absent) |

## Deployment

- Client: GitHub Pages via `.github/workflows/pages.yml` (reads repo variable `FEED_API_URL`).
- Feed API: hosted on Railway (Free plan, one instance; root directory `2026kirowen`,
  build command `echo "skip build"`, start command `npm start`). The Pages build points
  at it through `FEED_API_URL`; when that variable is unset, the static build hides
  Refresh and live refresh runs on the local build (`npm run dev` / `npm start`).
  Service env vars: `ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS`, `CLIENT_IP_HEADER`
  (`x-real-ip` on Railway; falls back to `req.ip` when missing or invalid), `FEED_RATE_LIMIT`.
- The feed API is the only network egress: HTTPS-only, public targets, pinned DNS
  address, ≤3 redirects, 8 s timeout, 2 MiB cap, 200 items, 5 concurrent. Never loosen
  these rules to "fix" a failing request — record the limitation instead.