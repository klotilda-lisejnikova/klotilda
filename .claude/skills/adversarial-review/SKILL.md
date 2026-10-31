---
name: adversarial-review
description: Attack a change you just wrote, before committing it — the second half of the pre-commit gate beside convention-review. Dispatches a fresh-context general-purpose agent with a per-change list of things to break, and tells it to RUN code rather than read it. Use when the user says "adversarial review", "try to break this", "review before commit", or as the standing gate step after the tests go green. For declared conventions use convention-review; for a branch-wide pass, /code-review.
---

# Adversarial review

Refute the block you just wrote. The convention reviewer asks whether the code matches what the team
declared; this one asks whether the code is **wrong** — silent failure paths, shapes the fixtures never
reach, claims the comments make that the code does not keep.

It runs as a **general-purpose agent with a prompt written fresh for this change**, never a saved persona.
A persona fixes what it looks for; the value here is the opposite — a list of things to attack, derived from
this diff. This skill carries the method for building that list. That is the durable part.

## 1. Build the attack list — before writing the prompt

**Run it against the PLAN first, not only the diff.** The list below is a design checklist wearing review
clothes: most of its questions can be answered before the code exists, and answering them then costs minutes
instead of a review round plus a rebuild. Reviewing at the end stays mandatory — but arriving with the
carrier siblings and the second call site already handled is the difference between a gate that catches
your design hole and one that catches your typo.

Read your own diff and answer these. Every line below has produced a real defect in a shipped review; none
of them is speculative.

- **Every consumer of a changed type.** Grep it. For each, ask whether it was _considered_ — not whether it
  still compiles. A type that gains a field silently changes meaning for readers that ignore it.
- **The shape the code dispatches on.** If you branch on a discriminator (an order status, an action name, a
  file's `refType`, "is signed in"), find the siblings that satisfy the same test and behave differently.
- **A guard you removed.** What did it cover that the replacement does not? A guard usually covers more
  cases than the one that made you delete it.
- **Ties and collisions in whatever the new code compares.** If correctness rests on an equality or a name
  lookup, construct the case where they tie by accident: two order lines for the same product, two categories
  whose names normalize to the same slug.
- **The second call site.** A guard installed on one path and not its sibling is the signature defect: the
  checkout checks the stock but a PATCH does not; the order action e-mails but a status correction does not;
  the API revalidates the web after one catalogue write and not another. Find every caller of the thing you guarded; guard the _filter they share_, not each call.
- **What the fixtures do not exercise** — as concrete shapes, not adjectives. "The last piece bought by two
  customers at once, an inactive product in the cart, a quantity of zero, a price changed after the cart was
  filled" beats "edge cases".
- **Money, stock and state.** Anything that changes them: inside one transaction, rows locked, and what
  happens to orders already placed under the old behaviour.
- **Every claim the new comments and docs make.** Each is a testable assertion. The reviewer verifies them
  by running them, and a doc sentence that overstates what shipped is a finding.

## 2. Dispatch

Two agents in parallel — this one and `convention-reviewer` (see `convention-review`), after the test gate
is green and before the commit.

```
Agent(subagent_type: "general-purpose",
      prompt: "<what the change claims> + <the attack list> + <how to run things here>")
```

The prompt must carry:

- **What the change claims**, stated as the author would defend it — so the agent attacks the real claim.
- **The attack list from step 1**, numbered. This is what separates a review that finds things from one that
  approves the diff.
- **How to run code here** — `docker compose up -d` (Postgres :5435, Mailpit :8026), `pnpm --filter <package>
test` with `TEST_DATABASE_URL` for the integration tests, `pnpm dev` for the running apps (API :3001, web
  :3002, admin :5175). Say so explicitly: _"RUN things — probes find what reading does not."_
- **Cleanup**, when it deploys anything of its own.
- **The repository is read-only to it.** No git command that changes the repo under review; for a mutable
  copy, `cp -r` into the scratchpad and use absolute paths in every command, so a failed setup step cannot
  leave the next command running in the real tree (one did: a broken scratch clone, then `git checkout` and
  `git commit` landed in the real repo). It never pushes and never touches the Railway or Vercel
  environments.
- **The credentials rule** (`conventions.md` → _Credentials: use, never display_, and `CLAUDE.md` → _Working
  rules_): it never opens a `.env` file or `~/.npmrc` whole, never prints a value or a prefix of one, and
  deletes any copy it makes.
- **The honesty rule**: distinguish _"I ran this and it broke"_ from _"reading this worries me"_, and say so
  when a suspicion could not be reproduced.

Untracked files do not appear in `git diff` — name them in the prompt or the agent will review a change with
its tests missing.

## 3. Triage

Exactly as an external review would be triaged: right / wrong / already-solved. Fix what is confirmed, prove
each fix red first (the **`prove-red`** skill), rerun the test gate, then commit. File what you
do not fix — an unrecorded finding is a finding lost.

**Prove offline what can be proven offline.** A red proof that needs Postgres or the running apps costs a
revert, a restart, a run and a restore; the same claim in a unit test of the domain package costs seconds.
Put every claim that can be a unit test there, and spend the integration test only on what needs the
database.

**A finding is a snapshot of the tree when the agent started.** A long-running review can land after its
subject has changed — and will report the old state with full confidence. Re-verify a late finding against
the current tree before acting on it; the failure mode is "fixing" something already fixed, or reverting a
fix because a stale report calls it absent.

**Triage your own CLAIMS too, not just the code.** Every factual statement in the commit body, the doc
sentence and the summary you are about to write is an assertion someone will rely on — that a cap is
reported, that a method is called from one place, that a premise still holds. Each one is either something
you executed or read _in this session_, or something you remember. Check the second kind before it ships.

Expect findings **in your own fixes**, not only in the original code. That is the normal outcome, not a sign
the gate misfired.

## The cost, and why it is accepted

A real pass costs a review cycle and a rerun — it is the slowest step between green tests and a
commit. Take it anyway. The defects it catches are the ones that pass every test and surface as wrong answers
later: better correct than early.

## Related

- `convention-review` — the other half of the same gate, declared conventions rather than defects.
- `architecture-reviewer` (agent) — attacks a _design_ before approval, from artifacts only.
- `/code-review` — a bug-hunting pass over a diff or a whole branch.
