---
name: prove-red
description: Prove a test red before trusting it, and red for the reason claimed. Use when adding a guard, a refusal, a validation or a regression test; when a test passed first try and you have not seen it fail; when a fix is "verified" only by a green suite; or when deciding whether a red run actually demonstrates the defect. Carries the revert recipe and the seven ways an assertion passes for the wrong reason.
---

# Prove it red

A test that has never failed proves nothing. It is an assertion you believe, run once, in a state where
you already believed it — which is the definition of untested. The rule is stated with the self-review gates
in `CLAUDE.md`; this is how to carry it out, and what goes wrong when you do.

**Red is not enough. It has to be red for the reason you claim.** Read the failure text, not the count.
A guard test that goes red because the fixture was malformed is indistinguishable, from the exit code, from
one that goes red because the guard works — and only one of them means anything.

## The recipe

1. **Write every assertion first**, for the whole change.
2. **Revert the fixes in one block** — all of them, together.
3. **One run.** For a proof against the running apps, restart what serves the change: `packages/domain` ships
   source and `pnpm dev` watches, so a running dev server picks a revert up, but a built `dist/` does not, and the
   "red" run then passes for the wrong reason. Confirm the reverted behaviour is what the app serves (a printed
   body, a log line) before reading the result.
4. **Read each failure message.** Not "N failures" — the actual text, against the claim it stands for.
5. **Restore, rerun green.** Verify the revert is gone (`grep` for your marker) before you trust the
   green.

Batching matters because the revert/run cycle is the expensive part. But **sequential assertions inside one
test hide each other** — the first failure ends the test and everything after it is unproven. A claim you need
to see fail _on its own_ needs its own `it(…)`.

**Prove offline what can be proven offline.** A red proof needing Postgres costs a revert, a run against the
database and a restore. The same claim as a unit test of the domain package costs seconds. Split the proof and
spend the integration test only on what genuinely needs the database.

## The seven ways an assertion passes for the wrong reason

Every one of these was hit in real work, most of them in a single session. They are the reason step 4 exists.

1. **Something else in the fixture already satisfies it.** Another change in the same test already made the
   expectation true, so the assertion never depended on the code under test.
2. **The fixture never reaches the path.** An `onCreate` hook cannot exercise a check governing the persist
   that follows it. The test runs, passes, and touches nothing you meant to guard.
3. **A second cause masks the one you care about.** A property test whose fixture makes the expectation true
   two ways. Give each claim a fixture where it is the SOLE cause.
4. **The fixture cannot exhibit the property.** Asserting no CR/LF in a header built from a name containing
   no CR/LF: true for every implementation, including the broken one it replaced. Ask what input would make
   this assertion fail, and if there isn't one, the assertion is decoration.
5. **The type is asserted where the status carries the meaning.** `expect(response.ok).toBe(false)` passes for
   a 500 from an unconfigured dependency exactly as it does for the 400 you meant. Assert the discriminating
   value — the status, the message, the field named.
6. **It went red before reaching the code.** A refusal test that fails on an unrelated precondition — a missing
   unique index, an unparseable fixture, a 422 from validation upstream of the guard. The red looks like
   proof and is not. **This is why step 4 is read the text**: assert on the response body together with the
   status (`expect({ status, body }).toMatchObject({ status: 400, body: { … } })`) so a wrong-reason red
   announces itself.
7. **It races an asynchronous step, and wins.** The worst one, because it corrupts the PROOF rather than the
   test: revert the fix, run it, and the assertion still passes because the background pass finished first.
   The red never comes, so the claim looks unprovable rather than unproven, and a second assertion in the same
   class can go red and be mistaken for the guard. Here the async steps are the e-mails and the web
   revalidation that follow a request.
   **The fix is not a longer wait.** Move the claim to a tier where nothing is async: put the system into the
   exact state under test (a unit or repository test against a real store, nothing recompiling) and assert
   there; leave the integration test to pin the eventual end state. If a claim can only be made where a race
   exists, say in the test that it is not the guard, and name the test that is.

## Refactors need it too, in the other direction

Moving a guard, hoisting a rule or unifying two copies can silently _weaken_ an unrelated test. A test-support
helper that changed URL encoding once turned a suite's "empty selector is refused" cases into "malformed
selector is refused" — still green, no longer testing the thing. After a shared-fixture change, ask which
tests could now pass for a different reason than before, and re-prove one of them red.

## What this is not

Not a substitute for exercising the change end to end. _Green tests are not verification_ — a proven-red test
says the assertion is live, not that the feature works against the running stack. Say plainly when the
end-to-end check was blocked rather than letting either stand in for the other.

## Related

- `adversarial-review` — the gate that finds the claims worth proving.
- `convention-review` — the other half of the pre-commit pair.
