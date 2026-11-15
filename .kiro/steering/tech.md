# EchoShelf — Tech

- React 18 + TypeScript 5.9 + Vite 8 (client), Express 5 + tsx (feed API), Dexie 4
  (IndexedDB). Plain CSS with custom properties; no CSS framework.
- Data stays in the browser: two isolated IndexedDB databases, `echoshelf-user` and
  `echoshelf-demo`. Only user-requested feed URLs leave the machine, via the local API.
- Layout: `src/client` (app, features, storage, styles), `src/server` (feed API),
  `src/shared` (isomorphic models/parsers/pipeline), `tests/unit`, `tests/e2e`,
  `public/demo`. Aliases: `@client`, `@server`, `@shared`.
- Commands: see README. `npm test` must stay offline; external feed checks are manual
  and recorded in docs/kiro-build-log.md.
- The feed API is the only network egress: HTTPS-only, public targets, pinned DNS
  address, ≤3 redirects, 8 s timeout, 2 MiB cap, 200 items, 5 concurrent. Never loosen
  these rules to "fix" a failing request — record the limitation instead.