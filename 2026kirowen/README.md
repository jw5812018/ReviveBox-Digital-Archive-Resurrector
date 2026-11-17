# EchoShelf

**EchoShelf brings your forgotten web back into view.**

A personal, local-first archive for your browser bookmarks, RSS/Atom feeds and
plain-text notes — searchable, browsable, and rediscoverable. Built for the
Kiroween 2026 **Resurrection** track: it revives the era of personal web
portals, directory-style collections and self-hosted feed readers, keeping the
portable formats (bookmark HTML, OPML) that still work today.

- **No account, no cloud, no AI keys.** Your library lives in your browser's
  IndexedDB. Export a versioned JSON backup any time.
- **Deterministic by design.** Parsing, deduplication, search and the
  Rediscover rules are plain code — no model calls, no hidden ranking.

## Features

- **Try the demo** — a 50-item sample library (bilingual, clearly marked
  `Sample`) in a separate database (`echoshelf-demo`), resettable any time
  without touching your personal data.
- **Import** — Netscape bookmark HTML, OPML subscriptions, RSS 2.0 / Atom XML,
  `.txt` / `.md` notes, and EchoShelf backups. Every import shows a preview
  (new / duplicate / invalid, with a plain-English reason) before anything is
  written. Up to 1,000 records per import; bookmark files with more are
  imported folder by folder, and re-importing a folder only finds duplicates.
- **Deduplication** — normalized URLs (tracking params stripped, meaningful
  differences preserved) plus SHA-256 content fingerprints for notes. Repeats
  merge sources and tags; your edits, stars and read state are never
  overwritten.
- **Search & filters** — title, saved text, tags and URL; type, tag, starred
  and unread filters; works for Chinese continuous text.
- **Rediscover** — a transparent rule, not AI: unread items saved more than 30
  days ago, oldest first, with the reason shown on every card.
- **Feeds** — follow a feed by URL or import OPML, then refresh by hand.
  Public HTTPS feeds only, fetched through a hardened endpoint
  (SSRF-guarded, redirect-limited, size-capped, rate-limited). Sample feeds on
  reserved example domains are labelled and never fetched.
- **Backup & restore** — `schemaVersion`-tagged JSON; damaged or unknown
  versions are rejected before a single byte is written.

## Getting started

Requires Node.js (LTS recommended; built and verified on Node 24).

```bash
npm install        # first time; use npm ci with the committed lockfile
npm run dev        # web (Vite) + local feed service together
```

Open the printed URL (default http://localhost:5173). Choose **Try the demo**
or **Import your collection** — sample input files are linked on the start
screen and live in `public/demo/`.

## Commands

| Command              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Dev mode: Vite dev server + local feed API (concurrently) |
| `npm run dev:web`    | Vite dev server only                                      |
| `npm run dev:api`    | Feed API only (port 3001, tsx watch)                      |
| `npm run lint`       | ESLint                                                    |
| `npm run typecheck`  | TypeScript checks (client + node configs)                 |
| `npm test`           | Unit + property tests (Vitest, offline)                   |
| `npm run test:e2e`   | Browser flows (Playwright Chromium)                       |
| `npm run build`      | Typecheck + production build into `dist/`                 |
| `npm start`          | Production server: serves `dist/` + feed API (port 3001)  |

`npm test` never touches the network. E2E uses fixed local sample files and
does not depend on external sites either.

## Production / deployment

```bash
npm run build
npm start          # http://localhost:3001 (PORT env var supported)
```

One Node process serves the built client **and** the feed API. Deploying only
the static `dist/` folder is **not enough** for live feed refresh — the
`POST /api/feeds/fetch` endpoint is required because browsers may not fetch
arbitrary cross-origin feeds and the SSRF rules must be enforced server-side.
Everything else (import, search, Rediscover, backup) works fully client-side.

### Split deployment: static client + hosted feed API

The public demo runs the client on GitHub Pages and the feed API as a separate
Node web service. The same `src/server/index.ts` runs API-only when `dist/` is
absent.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_FEED_API_URL` | client build (repo variable `FEED_API_URL`) | Base URL of the feed API; empty means same-origin `/api` |
| `ALLOWED_ORIGINS` | API service | Comma-separated exact origins allowed to call the API cross-origin |
| `TRUST_PROXY_HOPS` | API service | Proxy hops in front of the service (1 behind a hosting proxy) |
| `FEED_RATE_LIMIT` | API service | Fetches per client IP per 10 minutes (default 20) |
| `PORT` | API service | Listen port (set by most hosts) |

The repository root contains a Render Blueprint (`render.yaml`) for the feed
service. To deploy it: in the Render dashboard choose **New → Blueprint**,
select this repository, and apply. The Blueprint installs production
dependencies only, runs `npm start` API-only, and sets `ALLOWED_ORIGINS` to the
GitHub Pages origin. Then set the repository variable `FEED_API_URL` (Settings →
Secrets and variables → Actions → Variables) to the service URL and re-run the
Pages workflow.

Free hosting plans sleep when idle. The first refresh after a pause shows
"Waking the feed service…" and can take about a minute. The app never pings
the service on page load; it only calls it when you press Refresh.

## Feed fetch rules (what the server will and will not do)

`POST /api/feeds/fetch` exists solely to fetch user-requested feeds:

- HTTPS only, standard port, no credentials in the URL
- No localhost, private, loopback, link-local or reserved targets
  (IPv4, IPv6 and IPv4-mapped IPv6 all checked); connections are pinned to the
  DNS-validated address
- At most 3 redirects, each target re-validated; 8 s overall timeout
- 2 MiB decompressed cap, 200 articles per fetch, 5 concurrent fetches
- 20 fetches per client IP per 10 minutes (429 with a retry time); at most 20
  requests wait for a slot, beyond that the service answers 503
- Cross-origin calls only from origins listed in `ALLOWED_ORIGINS`
- Feed HTML is reduced to plain text; no scripts, styles or remote images
- Full URLs are never logged

## Data model (v1)

- **Item** — bookmark / article / note: title, original + canonical URL, saved
  text, tags, source ids, `savedAt` (original save date when known, marked
  otherwise), `readAt`, `starred`, note fingerprint.
- **Source** — bookmark file / feed / note file / manual / demo / backup, with
  last fetch status for feeds.
- Personal and demo libraries are two separate IndexedDB databases
  (`echoshelf-user`, `echoshelf-demo`).

## Project layout

```
src/client/      React app (app shell, features, storage, styles)
src/server/      feed API (Express) with the fetch guardrails
src/shared/      models, validators, parsers, import pipeline (isomorphic)
tests/unit/      Vitest unit + fast-check property tests
tests/e2e/       Playwright browser flows
public/demo/     downloadable sample input files
.kiro/specs/     requirements / design / tasks for this project
docs/            development guide, build log, Kiro usage notes
```

## License

MIT — see [LICENSE](LICENSE).