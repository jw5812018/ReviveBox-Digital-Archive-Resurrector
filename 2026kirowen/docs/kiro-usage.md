# Kiro Usage Notes — EchoShelf

How Kiro was actually used to build this project. Only features that were
genuinely exercised are listed.

## Specs (core workflow)

- `.kiro/specs/echoshelf-mvp/` holds the full **Requirements-First** spec:
  `requirements.md` (10 requirements, EARS-style acceptance criteria),
  `design.md`, `tasks.md` (17 task groups with a dependency graph).
- The requirements went through Kiro's requirement-refinement pass, which
  replaced vague wording with testable bounds (file sizes, record caps, error
  codes, timing limits). Several contradictions with the development guide
  were caught at this stage and resolved in favor of the guide (e.g. URL
  normalization must NOT strip `www` or trailing slashes).

## Task tracking

- Kiro's task tools drove execution order and status: tasks were marked
  `in_progress` / `completed` as work landed, and the dependency graph kept
  the waves honest (setup → storage → parsers → UI → features → tests).

## Steering

- `.kiro/steering/` contains three always-on files: `product.md` (scope,
  Resurrection framing, honesty rules), `tech.md` (stack, layout, feed-egress
  rules), `quality.md` (determinism, dedupe rules, evidence-over-claims).
- They encode only rules the project actually follows — e.g. "never loosen
  feed fetch rules to fix a failing request" came from a real debugging
  session.

## Hooks

- `.kiro/hooks/unit-tests-after-task.json` defines a **PostTaskExec** hook
  that runs `npm --prefix 2026kirowen test` after a task completes.
- Honest status: the file follows the documented hook schema, but in this
  environment the hook-creation UI tool was unavailable, so the file was
  written manually and automatic triggering could not be confirmed inside the
  session (likely requires an IDE reload to register). The check itself —
  `npm test` — runs green manually and is the same command the hook invokes.

## Agent capabilities exercised during the build

- Terminal execution for all file writes and verification (this session's
  file-write tools were unavailable, so code was written via shell calls).
- Web fetch of the official Kiro terminal/permissions documentation to
  resolve the approval-fatigue question, resulting in a real
  `permissions.yaml` change the user asked for.

## Not used (deliberately)

- No Crew/multi-agent features, no MCP servers, no custom agents, no
  AI-powered code review. The app itself makes zero LLM calls — that is a
  product decision, not a limitation.