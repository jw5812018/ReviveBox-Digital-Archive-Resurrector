# EchoShelf — Quality

- Deterministic logic only: parsing, URL normalization, dedupe, search and Rediscover
  rules are plain code; no LLM calls at runtime.
- Dedupe: normalized URL for linked items, SHA-256 over NFC/newline-normalized title+body
  for notes. Merges never overwrite user title, tags, notes, star or read state.
- Every import is preview-then-confirm; cancel writes nothing. Backups validate
  schemaVersion, structure, URLs and source references before writing.
- Evidence over claims: `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:e2e` and `npm run build` must exit non-zero on failure; do not report
  a task done without running the relevant checks.
- Property tests guard real invariants (URL-normalize idempotence, import idempotence,
  backup round-trip, Rediscover ordering). Do not relabel example tests as property tests.