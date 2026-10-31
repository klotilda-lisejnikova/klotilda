# Git commit style

Adopted from the open-procurement workspace (2026-10-31). Conventional Commits; Klotilda has no ticket
tracker, so there is no ticket bracket and no `Refs:` trailer.

> **Don't use `Co-Authored-By:` trailers, and don't add any other AI-assistance marker either.**
> Commit messages carry no signature or tag identifying that an AI wrote or assisted with the commit, full
> stop — this includes a harness-injected `Claude-Session:` trailer, which the project convention
> overrides; the same holds for pull request descriptions. Older commits with such a trailer are tolerated
> as history. A trailer that slipped into **unpushed** commits is stripped with
> `git filter-branch -f --msg-filter 'sed "/^Claude-Session: /d;/^Co-Authored-By: /d"' @{u}..HEAD`; never
> rewrite pushed history.

## Shape

```
<type>(<scope>): <subject>

<optional body — wrap ~72 cols, explain WHY not WHAT>
```

## Type prefixes

Standard Conventional Commits types — full list at [the Conventional Commits gist](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13#types):

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature visible to a user or API consumer           |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting / whitespace (no logic change)               |
| `refactor` | Internal change, no observable behaviour change         |
| `perf`     | Performance improvement                                 |
| `test`     | Test-only change                                        |
| `build`    | Build system / external deps (package.json, Dockerfile) |
| `ci`       | CI config (`.github/workflows/`)                        |
| `chore`    | Misc maintenance not covered above                      |

Pick the type that describes the **dominant** change. If a commit spans types meaningfully, that's usually a
sign it should be split.

## Scope

Optional. The package the change lives in: `api`, `web`, `admin`, `domain`. Omit it for a change across
several, or for the repository itself (docs, tooling). Don't invent novel scopes every commit.

## Subject

- Imperative present tense — "add foo", not "adds" / "added".
- Lower-case start, no trailing period.
- Under ~70 chars total including the type.
- Concrete, not vague — "fix off-by-one in pagination" beats "fix bug".

## Body — keep brief

Optional. When present, one short paragraph OR 2-3 short bullets. Stop there.

- **Don't enumerate touched files** — `git show --stat` already lists them.
- **Don't restate the subject** — if the body just rephrases the subject in longer words, drop it.
- **Keep the rationale, drop the recap** — the body's job is the _non-obvious_: a constraint, a
  chosen-among-alternatives decision, a caveat to flag for reviewers. Not what the diff already shows.

## Stage explicit paths — never `git add -A`

Name the files you changed: `git add apps/api/src/checkout/checkout-plugin.ts`, or `git commit <path>`.
Never `git add -A` / `git add .` / `git commit -a`.

**Why:** more than one session can edit the repository at once. A broad add sweeps up whatever else happens to
be dirty and buries it in a commit whose message says nothing about it — and it cuts both ways: your broad add
eats someone else's in-progress work just as easily as theirs eats yours.

**Before committing**, run `git status --short` and stage only what you changed. If something unexpected is
dirty, ask rather than sweeping it in.

**A NEW file is `git add`-ed and committed in one uninterrupted step.** The index is shared by every session
working in that checkout, so a staged file sits there waiting for _anyone's_ next plain `git commit`. Never
stage a new file and then keep working. After committing, `git log -- <newfile>` should name your commit.

## A branch must not track `origin/dev`

Create it from the local branch — `git switch -c <branch> dev` — or, when you base it on the fetched remote
state, cut the tracking: `git switch --no-track -c <branch> origin/dev`.

**Never `git checkout -b <branch> origin/dev` on its own.** That sets the new branch's upstream to
`origin/dev`, and from then on a bare `git push` sends the commit **to `dev`** — here that deploys the test
sites — and the branch never appears on the remote.

**Always push with the branch named explicitly**, whatever the upstream says:

```bash
git push -u origin <branch>
```

When handing a push command to the owner, write that full form rather than `git push`. Verify afterwards with
`git ls-remote --heads origin <branch>`.

## Worked examples

```
feat(api): order actions with e-mails and history

Each action is written to the order's history and e-mails the customer
unless notify is false; PATCHing the statuses stays for corrections.
```

```
fix(web): cart checks prices and stock before checkout
```

```
docs: how Klotilda deploys (Railway environments, Vercel projects)
```
