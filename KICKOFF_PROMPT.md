# How to run this with Claude Code

## Setup (do this once)
1. Create an empty repo/folder and drop these four files in the root:
   `SPEC.md`, `CLAUDE.md`, `BUILD_PLAN.md`, and this file.
2. On your `aidev` server, start Claude Code in that folder.
3. Make sure these are reachable for testing: Docker (Postgres+Redis), and Ollama
   running (`ollama pull llama3.1:8b && ollama pull nomic-embed-text`) if you want the
   AI phase to fully exercise.
4. Recommended Claude Code MCP servers to connect first (they let it self-verify without
   asking you): **Playwright MCP** (you already use it — for the Phase 5 e2e) and a
   **Postgres MCP** (so it can inspect the DB it creates). Optional but helpful.
5. Run Claude Code with auto-accept / "yolo" edits enabled and a generous turn budget so
   it can churn through phases unattended. Keep it on a branch.

## The prompt to paste

> Read `CLAUDE.md`, `SPEC.md`, and `BUILD_PLAN.md` in full before doing anything. These
> contain every decision needed to build this project — **do not ask me any questions.**
> If anything is genuinely ambiguous, pick the simplest option consistent with `SPEC.md`,
> implement it, and append a one-line note to `DECISIONS.md`.
>
> Build the project by executing `BUILD_PLAN.md` **phase by phase, in order, starting at
> Phase 0**. After each phase: run that phase's Acceptance checks, fix any failures until
> they pass, commit with a conventional-commit message, then proceed to the next phase
> without pausing for me. Keep the repo building and runnable at every commit.
>
> Continue autonomously through **all phases (0–8)**. When finished, run the Final
> self-check in `BUILD_PLAN.md` and print a summary of what you built, how to run it, and
> what is intentionally stubbed for later.
>
> Begin with Phase 0 now.

## If you'd rather review between phases (recommended for the first run)
Replace the last sentences with:

> Execute **only Phase 0 and Phase 1**, run their Acceptance checks, commit, then stop and
> show me a summary and a diff overview. Wait for me to say "continue" before Phase 2.

Then just reply `continue` after each review. This costs a little more babysitting but
catches a wrong turn early instead of 8 phases deep.

## Optional: turn repeated tasks into Claude Code skills
After Phase 2, you can have Claude Code create small skills under `.claude/skills/` so
repeated work stays consistent. Ask it to generate:
- **`new-api-endpoint`** — scaffolds a zod schema in `packages/types`, a `core` service
  method, a Hono route, and a Vitest test, wired together.
- **`drizzle-migration`** — adds a table/column to the schema, generates the migration,
  updates the seed, and the relevant zod type.
- **`widget-view`** — scaffolds a new Preact view inside the Shadow DOM widget with
  scoped styles + i18n strings.
These aren't required for the build; they make *future* iteration fast and uniform.

## Reality check
This is a large system. Even with a perfect spec, expect Claude Code to need 1–2 cleanup
passes (a failing test, a version mismatch, a missing wire-up). That's normal — the spec
pack is what keeps those to *cleanup* instead of *redesign*, and what stops it asking you
questions mid-build. Run, review per phase the first time, and keep `DECISIONS.md` as your
audit trail of everything it chose on your behalf.
