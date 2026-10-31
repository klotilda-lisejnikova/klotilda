---
name: convention-review
description: Review the current change against Klotilda's declared conventions (CLAUDE.md, conventions.md, design-patterns.md, style/*) before committing. Use when the user says "convention review", "check this against our conventions", "review before commit", or as the pre-commit gate step. For bug-hunting use adversarial-review or /code-review instead.
---

# Convention review

Guard a change against the **declared** conventions before it ships — the judgement half, next to the tests
that enforce the mechanical half.

## How to run it

Dispatch the **`convention-reviewer`** agent (read-only) over the change:

```
Agent(subagent_type: "convention-reviewer",
      prompt: "Review the working diff. <Any extra scope or focus; name untracked files.>")
```

Default scope is the working diff plus the files it touches. Name a feature or subsystem instead when the
change is already committed, or pass several scopes to run reviewers in parallel for a large change.
Untracked files do not appear in `git diff` — name them in the prompt.

## When

- **Before committing a feature** — the step between "tests pass" and `git commit`, in parallel with
  `adversarial-review`.
- **After a plan's implementation phase**, before folding the as-built section back into the plan.
- **Not** for bug hunting or security review — that is `adversarial-review` and `/code-review`.

## What comes back

Findings via `ReportFindings`, each citing the exact convention violated with file:line and the smallest fix,
scored `(impact + risk) × (6 − effort)`. Plus the strengths, and an explicit "clean" when it is clean.

Triage each finding as right, wrong or already solved and fix what is confirmed. Anything not fixed on the
spot goes to the plan it belongs to (a backlog line in an epic, see `feature-plans`), never lost.
