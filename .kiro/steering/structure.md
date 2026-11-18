# EchoShelf — Structure

## Repository root

- `2026kirowen/` — the application (all code, npm scripts, docs).
- `.kiro/specs/echoshelf-mvp/` — requirements, design, tasks. Update the spec before adding features.
- `.kiro/steering/`, `.kiro/hooks/` — Kiro configuration.
- `.github/workflows/pages.yml` — GitHub Pages deploy.
- `README.md`, `PROGRESS.md` (Chinese progress log) — root docs.

## `2026kirowen/`

```
src/
  client/
    app/         App shell: App, Layout, Sidebar, Header, Dashboard, Modal, States, main
    features/
      import/      ImportModal, FolderPicker
      library/     item list/detail, add forms, filterItems, demo data and demo library
      rediscover/  rules engine (rediscover.ts), injectable clock, panel
      sources/     Subscriptions UI, feedApi (server calls), feedRefresh
    storage/     Dexie db (user + demo), itemService, sourceService
    styles/      index.css (design system, CSS custom properties)
  server/        Express feed API: index.ts, feeds/{fetchFeed,limits,rateLimit}
  shared/        Isomorphic, no DOM/Node-only deps
    import/      parsers (bookmark, OPML, feed, text), pipeline, dedupe, fingerprint, backup, limits
    models/      types.ts (data models)
    urls/        normalizeUrl, validateUrl, feedUrls
tests/
  unit/          Vitest; properties.test.ts holds fast-check property tests
  e2e/           Playwright specs
public/demo/     Demo library data
docs/            Development guide, kiro-build-log.md, kiro-usage.md
```

## Conventions

- Import via aliases `@client`, `@server`, `@shared`.
- Put pure logic (parsing, normalization, dedupe, Rediscover rules) in `src/shared` or a feature's plain `.ts` file, not in components. React components stay in `.tsx`.
- Client code never talks to IndexedDB outside `src/client/storage`. Demo and user data use separate databases.
- Only `src/client/features/sources/feedApi.ts` calls the network, and only the feed API in `src/server` fetches external URLs.
- Name unit tests `tests/unit/<module>.test.ts`; keep them offline and deterministic (inject the clock).
- Record manual checks and notable decisions in `docs/kiro-build-log.md`.
