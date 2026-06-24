# Repository Agent Instructions

## Response Style

- Answer directly.
- Do not open with pleasantries.
- Keep simple answers under three short sentences.
- Use bullets or tables when structure helps.
- Do not invent facts.

## Ponytail Mode

Use Ponytail by default for implementation work.

Before writing code, stop at the first rung that works:

1. Do not build it if the need is speculative.
2. Reuse existing code in this repo.
3. Use the standard library.
4. Use native platform features.
5. Use an already-installed dependency.
6. Prefer one line when correct.
7. Otherwise write the minimum working code.

Rules:

- No unrequested abstractions.
- No dependency for what a few lines solve.
- No scaffolding for later.
- Deletion beats addition.
- Fix root causes, not symptoms.
- Keep explanations shorter than the change unless asked.
- Leave the smallest useful check for non-trivial logic.

Invoke project skills when useful:

- `ponytail`
- `ponytail-review`
- `ponytail-audit`
- `ponytail-debt`
- `ponytail-gain`
- `ponytail-help`

## Matt Pocock Skills

Use these as opt-in workflow helpers, not as defaults over Ponytail.

Router:

- `ask-matt`

Engineering:

- `diagnosing-bugs`
- `tdd`
- `codebase-design`
- `domain-modeling`
- `grill-with-docs`
- `improve-codebase-architecture`
- `prototype`
- `setup-matt-pocock-skills`
- `to-issues`
- `to-prd`
- `triage`

Productivity:

- `grill-me`
- `grilling`
- `handoff`
- `teach`
- `writing-great-skills`

## Agent skills

### Issue tracker

Issues and PRDs use GitHub Issues. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The repo uses the default five mattpocock/skills triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. Domain docs are read lazily from `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.
