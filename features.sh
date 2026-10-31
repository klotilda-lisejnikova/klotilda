#!/usr/bin/env bash
# features.sh — the tool for features/: list features, scaffold, rename, check links, the epic-survey clock.
#
#   features.sh [--detailed] [--hide-done] [--show-archived]   the listing (default)
#   features.sh ticket <KEY>                                   features and workstreams carrying that ticket
#   features.sh new <slug> [--ticket KEY] [--status WORD]      scaffold features/<slug>/README.md
#   features.sh new <slug> --review [--ticket KEY]             scaffold reviews/<date>-<slug>.md (a review with no feature yet)
#   features.sh new <slug> --from-review <file> [--ticket KEY] a feature created from an unattached review
#   features.sh rename <old-slug> <new-slug>                   move a feature and rewrite the references to it
#   features.sh check-links [path...]                          dangling links and anchors, old-layout mentions
#                                                              (default: the repository; in a product, what it owns)
#   features.sh due-survey                                     which open epics are due an architecture survey
#   features.sh status-drift [epic-dir]                        workstreams whose Status disagrees with their
#                                                              board.json leaf (default: every epic with a board)
#
# Layout (the feature-plans skill has the rules and the reasons):
#   features/<slug>/README.md      the feature: H1, **Ticket:**, **Status:**
#   features/<slug>/<ws>.md        a workstream: any other top-level .md carrying a **Status:**
#   features/<slug>/review/        the feature's reviews, one per file: <YYYY-MM-DD>-<subject>.md
#   features/<slug>/backlog.md     the epic backlog;  resources/  supporting material
#   reviews/<YYYY-MM-DD>-<subject>.md  reviews not attached to a feature
#
# Status vocabulary (first word): design planned active deferred shipped archived.
# The script reads files and, for new / rename, writes files and runs git mv; it never commits.
set -euo pipefail
ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
export FEATURES_ROOT="$ROOT"
# UTF-8 for both directions. The plans are UTF-8 and their prose uses em dashes and arrows; a
# Windows Python defaults its stdio and its open() to the ANSI code page (cp1250 here), which
# mojibakes what it reads and raises UnicodeEncodeError on the first arrow it prints.
export PYTHONUTF8=1
# Resolve an interpreter that actually RUNS. Existence is not enough: on Windows `python3` is
# a Store app-execution alias that sits on PATH and fails when invoked, so a PATH lookup finds it
# and the script then dies on a message about the Microsoft Store. Each candidate is probed instead.
PYTHON=""
for candidate in python3 python py; do
    if "$candidate" -c "import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)" >/dev/null 2>&1; then
        PYTHON="$candidate"
        break
    fi
done
if [ -z "$PYTHON" ]; then
    echo "features.sh: no working Python 3 on PATH (tried python3, python, py)." >&2
    exit 1
fi
exec "$PYTHON" - "$@" <<'PY'
import datetime, json, os, re, subprocess, sys, urllib.parse

ROOT = os.environ["FEATURES_ROOT"]
FEAT = "features"
REVIEWS = "reviews"
VOCAB = ("design", "planned", "active", "deferred", "shipped", "archived")
OPEN = ("design", "planned", "active", "deferred")
RESERVED = {"README.md", "review.md", "backlog.md", "mail.md"}   # review.md: the pre-2026-10 single review file
REVIEW_DIR = "review"
REVIEW_FILE = re.compile(r"^(\d{4}-\d{2}-\d{2})-[a-z0-9][a-z0-9-]*\.md$")
OLD_DIRS = ("todo", "done", "archived", "plans", "review")   # the pre-2026-09-30 layout's folders
DUE_THRESHOLD = int(os.environ.get("DUE_THRESHOLD", "20"))
# an orchestration board's machine-written files, at any depth under an epic: bookkeeping, not design (the
# orchestrator skill's orchestrator.py carries the same list as BOOKKEEPING; a test compares them)
BOARD_BOOKKEEPING = ("review/**", "board.json", "board.yml", "decisions.*", "sessions.json")
IS_PLATFORM = os.path.basename(ROOT) == "openplatform-claude"
# a product repository also carries documents synced verbatim from openplatform-claude, whose links point at
# openplatform-claude's own files; a product checks only what it owns
DEFAULT_ROOTS = ["."] if IS_PLATFORM else [FEAT, REVIEWS, "CLAUDE.md", "README.md"]


def git(*a, check=False):
    r = subprocess.run(["git", "-C", ROOT, *a], capture_output=True, text=True)
    if check and r.returncode:
        sys.exit(f"git {' '.join(a)}: {r.stderr.strip()}")
    return r.stdout if r.returncode == 0 else ""


def read(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            return fh.read()
    except (FileNotFoundError, IsADirectoryError, UnicodeDecodeError):
        return ""


def field(text, name):
    m = re.search(r"^\*\*" + name + r":\*\*[ \t]*(.*)$", text, re.M)
    return m.group(1).strip() if m else ""


def title(text):
    m = re.search(r"^# (.*)$", text, re.M)
    return m.group(1).strip() if m else "?"


TICKET = re.compile(r"\b(?!UTF-|ISO-|RFC-|SHA-)[A-Z][A-Z0-9]+-[0-9]+\b")


def ticket(text):
    for src in (field(text, "Tickets?"), field(text, "Status")):
        m = TICKET.search(src)
        if m:
            return m.group(0)
    return "—"


def status_word(text):
    s = re.sub(r"^\*\*([^*]+)\*\*", r"\1", field(text, "Status"))
    m = re.match(r"[a-z]+", s.lower())
    return m.group(0) if m else ""


def pad(s, w):
    return s + " " * max(0, w - len(s))


def cut(s, w):
    return s if len(s) <= w else s[: w - 3] + "..."


# ------------------------------------------------------------------ history (one pass, not one per file)
_HIST = None


def history():
    """(born, ancestors): path -> first-added date carried across renames, and path -> every earlier path it
    had. One `git log` over the whole history; a per-file `git log --follow` costs ~85 ms each."""
    global _HIST
    if _HIST is None:
        born, anc, day = {}, {}, None
        for line in git("log", "--reverse", "-M", "--diff-filter=AR", "--name-status", "--format=@%as").split("\n"):
            if line.startswith("@"):
                day = line[1:]
            elif line.startswith("A\t"):
                born.setdefault(line[2:], day)
            elif line.startswith("R"):
                _, src, dst = line.split("\t")
                born[dst] = born.get(src, day)
                anc[dst] = anc.get(src, set()) | {src}
        _HIST = (born, anc)
    return _HIST


def created(rel):
    """a file's creation date; for a feature's README.md, the oldest file in the feature's directory."""
    born, _ = history()
    if rel.endswith("/README.md"):
        d = os.path.dirname(rel) + "/"
        dates = [v for k, v in born.items() if k.startswith(d) and v]
        if dates:
            return min(dates)
    if born.get(rel):
        return born[rel]
    p = os.path.join(ROOT, rel)
    return datetime.date.fromtimestamp(os.path.getmtime(p)).isoformat() if os.path.exists(p) else "?"


# ------------------------------------------------------------------ the store
def slugs():
    base = os.path.join(ROOT, FEAT)
    if not os.path.isdir(base):
        return []
    return sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)) and d not in OLD_DIRS)


def old_layout():
    """plan files still in the pre-2026-09-30 folders (features/todo|done|archived|plans|review)."""
    out = []
    for d in OLD_DIRS:
        p = os.path.join(ROOT, FEAT, d)
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                out += [os.path.relpath(os.path.join(root, f), ROOT) for f in files if f.endswith(".md")]
    return sorted(out)


def workstreams(slug):
    d = os.path.join(ROOT, FEAT, slug)
    out = []
    for f in sorted(os.listdir(d)):
        if f.endswith(".md") and f not in RESERVED:
            t = read(os.path.join(FEAT, slug, f))
            if field(t, "Status"):
                out.append((f, t))
    return out


def review_files(slug):
    """the feature's reviews, oldest first: (date, file name) for each review/<YYYY-MM-DD>-<subject>.md."""
    d = os.path.join(ROOT, FEAT, slug, REVIEW_DIR)
    if not os.path.isdir(d):
        return []
    return sorted((m.group(1), f) for f in os.listdir(d) if (m := REVIEW_FILE.match(f)))


def review_info(slug):
    files = review_files(slug)
    return (files[-1][0], len(files)) if files else None


REVIEW_H1 = re.compile(r"^# .+ — review \d{4}-\d{2}-\d{2}\s*$", re.M)


def review_problems():
    """every review file: not empty, and titled '# <Subject> — review YYYY-MM-DD' (the feature-plans skill).
    An emptied review breaks no link, so nothing else would notice it."""
    out = []
    paths = [os.path.join(FEAT, s, "review", f) for s in slugs() if os.path.isdir(os.path.join(ROOT, FEAT, s, "review"))
             for f in sorted(os.listdir(os.path.join(ROOT, FEAT, s, "review"))) if f.endswith(".md")]
    if os.path.isdir(os.path.join(ROOT, REVIEWS)):
        paths += [os.path.join(REVIEWS, f) for f in sorted(os.listdir(os.path.join(ROOT, REVIEWS))) if f.endswith(".md")]
    for rel in paths:
        text = read(rel)
        if not text.strip():
            out.append(f"empty review: {rel}")
        elif not REVIEW_H1.search(text.split("\n", 1)[0] + "\n"):
            out.append(f"review title is not '# <Subject> — review YYYY-MM-DD': {rel}")
    return out


def load():
    rows, warnings = [], []
    if not os.path.isdir(os.path.join(ROOT, FEAT)):
        warnings.append(f"no {FEAT}/ directory under {ROOT}")
    for slug in slugs():
        rel = os.path.join(FEAT, slug, "README.md")
        t = read(rel)
        if not t:
            warnings.append(f"no README.md: {FEAT}/{slug}/")
            continue
        sw = status_word(t)
        if sw not in VOCAB:
            warnings.append(f"unknown status '{field(t, 'Status')[:40]}': {rel}")
        ws = workstreams(slug)
        for f, wt in ws:
            if status_word(wt) not in VOCAB:
                warnings.append(f"unknown status '{field(wt, 'Status')[:40]}': {FEAT}/{slug}/{f}")
        if os.path.exists(os.path.join(ROOT, FEAT, slug, "review.md")):
            warnings.append(f"{FEAT}/{slug}/review.md: move its reviews to {REVIEW_DIR}/<YYYY-MM-DD>-<subject>.md "
                            "(feature-plans skill → Reviews)")
        rd = os.path.join(ROOT, FEAT, slug, REVIEW_DIR)
        if os.path.isdir(rd):
            for f in sorted(os.listdir(rd)):
                if not REVIEW_FILE.match(f):
                    warnings.append(f"review not named <YYYY-MM-DD>-<subject>.md: {FEAT}/{slug}/{REVIEW_DIR}/{f}")
        counted = [w for w in ws if status_word(w[1]) != "archived"]
        rows.append(dict(slug=slug, title=title(t), ticket=ticket(t), status=sw or "?", date=created(rel), ws=ws,
                         shipped=sum(1 for w in counted if status_word(w[1]) == "shipped"), total=len(counted)))
    warnings += review_problems()
    old = old_layout()
    if old:
        where = ", ".join(f"{FEAT}/{d}/" for d in sorted({o.split('/')[1] for o in old}))
        warnings.append(f"{len(old)} plan file(s) still in the old layout ({where}) — not listed; convert them "
                        "(feature-plans skill → Old layout)")
    return rows, warnings


# ------------------------------------------------------------------ listing
def print_row(r, detailed):
    prog = f" ({r['shipped']}/{r['total']} shipped)" if r["total"] else ""
    print(f"  {pad(cut(r['title'] + prog, 80), 80)}  {pad(r['ticket'], 9)}  {pad(r['status'], 9)}  {r['date']}  {r['slug']}/")
    if not detailed:
        return
    rank = {"active": 1, "design": 2, "planned": 3, "deferred": 4, "shipped": 6, "archived": 7}
    items = sorted(r["ws"], key=lambda w: (rank.get(status_word(w[1]), 5), title(w[1])))
    extra = []
    ri = review_info(r["slug"])
    if ri:
        extra.append((REVIEW_DIR + "/", f"reviews: {ri[1]}, latest {ri[0]}"))
    if os.path.isdir(os.path.join(ROOT, FEAT, r["slug"], "resources")):
        extra.append(("resources/", "supporting material"))
    n, i = len(items) + len(extra), 0
    for f, wt in items:
        i += 1
        tt = title(wt)
        code = re.search(r"\*\(([^)]*)\)\*\s*$", tt)
        tt = re.sub(r"\s*\*\([^)]*\)\*\s*$", "", tt)
        c = code.group(1).split(" —")[0] if code else "—"
        st = cut(re.sub(r"^\*\*([^*]+)\*\*", r"\1", field(wt, "Status")), 24)
        print(f"    {'└─' if i == n else '├─'} {pad(cut(tt, 52), 52)}  {pad(c, 12)}  {pad(ticket(wt), 9)}  {pad(st, 24)}  {f}")
    for f, what in extra:
        i += 1
        print(f"    {'└─' if i == n else '├─'} {pad(what, 52)}  {pad('', 12)}  {pad('', 9)}  {pad('', 24)}  {f}")


def unattached():
    d = os.path.join(ROOT, REVIEWS)
    out = []
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith(".md"):
                rel = os.path.join(REVIEWS, f)
                t = read(rel)
                dates = re.findall(r"^## Review (\d{4}-\d{2}-\d{2})", t, re.M)
                out.append((title(t), ticket(t), max(dates) if dates else created(rel), rel))
    return out


FLAGS = {"--detailed", "--hide-done", "--show-archived"}


def cmd_list(args):
    unknown = [a for a in args if a not in FLAGS]
    if unknown:
        sys.exit(f"unknown option: {' '.join(unknown)}  (features.sh --help)")
    rows, warnings = load()
    groups = [("OPEN", lambda r: r["status"] in OPEN or r["status"] not in VOCAB)]
    if "--hide-done" not in args:
        groups.append(("SHIPPED", lambda r: r["status"] == "shipped"))
    if "--show-archived" in args:
        groups.append(("ARCHIVED", lambda r: r["status"] == "archived"))
    for name, pred in groups:
        sel = sorted((r for r in rows if pred(r)), key=lambda r: r["date"], reverse=True)
        print(f"{name} ({len(sel)})")
        for r in sel:
            print_row(r, "--detailed" in args)
        print()
    ua = unattached()
    print(f"REVIEWS NOT ATTACHED TO A FEATURE ({len(ua)})")
    for t, k, d, rel in ua:
        print(f"  {pad(cut(t, 80), 80)}  {pad(k, 9)}  {pad('', 9)}  {d}  {rel}")
    bad, old = links([FEAT, REVIEWS]), [s for s in stale() if in_roots(s[0], [root_rel(r) for r in DEFAULT_ROOTS])]
    if warnings or bad or old:
        print()
        for w in warnings:
            print(f"warning: {w}")
        if bad:
            print(f"warning: {len(bad)} dangling link(s) — run: features.sh check-links")
        if old:
            print(f"warning: {len(old)} current-tense mention(s) of the old layout — run: features.sh check-links")


# ------------------------------------------------------------------ ticket
def cmd_ticket(args):
    if not args:
        sys.exit("usage: features.sh ticket <KEY>")
    rx = re.compile(r"\b" + re.escape(args[0]) + r"\b")
    found = 0
    for slug in slugs():
        t = read(os.path.join(FEAT, slug, "README.md"))
        hits = [("", t)] if rx.search(field(t, "Tickets?")) or rx.search(field(t, "Status")) else []
        hits += [(f, wt) for f, wt in workstreams(slug) if rx.search(field(wt, "Tickets?")) or rx.search(field(wt, "Status"))]
        for f, ht in hits:
            found += 1
            print(f"  {pad(cut(title(ht), 80), 80)}  {pad(status_word(ht), 9)}  {FEAT}/{slug}/{f}")
    for t, k, d, rel in unattached():
        if k == args[0]:
            found += 1
            print(f"  {pad(cut(t, 80), 80)}  {pad('review', 9)}  {rel}")
    if not found:
        print(f"no feature, workstream or review carries {args[0]}")


# ------------------------------------------------------------------ new / rename
SLUG = re.compile(r"^[a-z0-9]+(?:[.-][a-z0-9]+)*$")


def opt(rest, name):
    if name not in rest:
        return None
    i = rest.index(name)
    if i + 1 >= len(rest) or rest[i + 1].startswith("--"):
        sys.exit(f"{name} needs a value")
    return rest[i + 1]


def cmd_new(args):
    if not args or not SLUG.match(args[0]) or args[0] in OLD_DIRS:
        sys.exit("usage: features.sh new <kebab-slug> [--ticket KEY] [--status WORD] [--review | --from-review <file>]")
    slug, rest = args[0], args[1:]
    key = opt(rest, "--ticket") or "none yet"
    status = opt(rest, "--status") or "design"
    if status not in VOCAB:
        sys.exit(f"--status must be one of: {' '.join(VOCAB)}")
    if "--review" in rest:
        rel = os.path.join(REVIEWS, f"{datetime.date.today().isoformat()}-{slug}.md")
        if os.path.exists(os.path.join(ROOT, rel)):
            sys.exit(f"exists: {rel}")
        os.makedirs(os.path.join(ROOT, REVIEWS), exist_ok=True)
        with open(os.path.join(ROOT, rel), "w") as fh:
            fh.write(f"# {slug} — review {datetime.date.today().isoformat()}\n\n**Ticket:** {key}\n\n")
        print(rel)
        return
    title = slug
    # A plan is named by its creation date, which never changes (Martin, 2026-10-17): the listing reads in order.
    if not re.match(r"\d{4}-\d{2}-\d{2}-", slug):
        slug = f"{datetime.date.today().isoformat()}-{slug}"
    d = os.path.join(ROOT, FEAT, slug)
    if os.path.exists(d):
        sys.exit(f"exists: {FEAT}/{slug}/")
    src, srel = opt(rest, "--from-review"), None
    if src:
        # validated before anything is created: the path as given from the cwd, or relative to the repository
        # or to reviews/; a tracked file under reviews/
        cands = [os.path.abspath(src), os.path.join(ROOT, src), os.path.join(ROOT, REVIEWS, src)]
        hit = next((c for c in cands if os.path.isfile(c)), None)
        if not hit:
            sys.exit(f"no such review: {src}")
        srel = os.path.relpath(hit, ROOT)
        if not srel.startswith(REVIEWS + "/"):
            sys.exit(f"--from-review takes a file under {REVIEWS}/, not {srel}")
        if not git("ls-files", "--error-unmatch", srel).strip():
            sys.exit(f"{srel} is not tracked; commit it first so its history follows the move")
    os.makedirs(d)
    ctx = ""
    if srel:
        name = os.path.basename(srel)
        if not REVIEW_FILE.match(name):
            name = f"{datetime.date.today().isoformat()}-{name}"
        target = os.path.join(FEAT, slug, REVIEW_DIR, name)
        os.makedirs(os.path.join(ROOT, FEAT, slug, REVIEW_DIR))
        git("mv", srel, target, check=True)
        ids = sorted(set(re.findall(r"^[-#|]+ \*{0,2}`?((?:[A-Z]+-)?[HMLCX][0-9]+)`?\b", read(target), re.M)))
        link = f"{REVIEW_DIR}/{name}"
        ctx = f"\n## Context\n\nFrom [{link}]({link})" + (": findings " + ", ".join(f"`{i}`" for i in ids) if ids else "") + ".\n"
    with open(os.path.join(d, "README.md"), "w") as fh:
        fh.write(f"# {title}\n\n**Ticket:** {key}\n**Status:** {status}\n{ctx}")
    print(os.path.join(FEAT, slug, "README.md"))
    if srel:
        print(f"{srel} was moved with git mv (staged); commit that move on its own before editing it")


LINK = re.compile(r"(\]\()(<[^>]*>|[^)\s]+)((?:\s+\"[^\"]*\")?\))")
REFDEF = re.compile(r"^ {0,3}\[[^\]]+\]:\s*(\S+)", re.M)


def norm(p):
    out = []
    for part in p.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if out and out[-1] != "..":
                out.pop()
            else:
                out.append("..")
        else:
            out.append(part)
    return "/".join(out)


def cmd_rename(args):
    if len(args) != 2 or not SLUG.match(args[1]) or args[1] in OLD_DIRS:
        sys.exit("usage: features.sh rename <old-slug> <new-slug>")
    old, new = args
    if old not in slugs():
        sys.exit(f"no such feature: {FEAT}/{old}/")
    o, n = os.path.join(FEAT, old), os.path.join(FEAT, new)
    if os.path.exists(os.path.join(ROOT, n)):
        sys.exit(f"exists: {n}/")
    before = len(links(["."]))
    git("mv", o, n, check=True)
    changed = 0
    for rel in [x for x in git("ls-files", "*.md").split("\n") if x]:
        t = read(rel)
        now_dir = os.path.dirname(rel)
        then_dir = os.path.dirname(o + rel[len(n):]) if rel.startswith(n + "/") else now_dir

        def fix(mo):
            tgt = mo.group(2)
            if re.match(r"^[a-z]+:", tgt) or tgt.startswith(("#", "/", "<")):
                return mo.group(0)
            path, sep, anchor = tgt.partition("#")
            a = norm(os.path.join(then_dir, path))
            if a == o or a.startswith(o + "/"):
                a = n + a[len(o):]
            elif then_dir == now_dir:
                return mo.group(0)
            r = os.path.relpath(a, now_dir or ".") + ("/" if path.endswith("/") else "")
            return mo.group(1) + r + (sep + anchor if sep else "") + mo.group(3)

        t2 = LINK.sub(fix, t)
        # prose mentions: features/<old>/…, with or without the openplatform-claude/ prefix
        t2 = re.sub(r"(?<![A-Za-z0-9_-])(features/)" + re.escape(old) + r"(?=[/`)\s.,;:]|$)", r"\g<1>" + new, t2, flags=re.M)
        if t2 != t:
            with open(os.path.join(ROOT, rel), "w") as fh:
                fh.write(t2)
            changed += 1
    print(f"moved {o}/ -> {n}/ (git mv, staged); references rewritten in {changed} file(s)")
    print("commit the staged move first, then the rewrite")
    after = len(links(["."]))
    if after > before:
        print(f"warning: dangling links went from {before} to {after} — run: features.sh check-links")
        sys.exit(1)


# ------------------------------------------------------------------ check-links
PATHSPAN = re.compile(r"(?<![A-Za-z0-9_.:@-])((?:openplatform-claude/)?(?:features|reviews)/)([A-Za-z0-9_./<>-]*[A-Za-z0-9_/>-])")


def gitlab_slug(heading):
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", heading).strip().lower()
    s = re.sub(r"[^\w\- ]", "", s, flags=re.U)
    return s.replace(" ", "-")


_ANCHORS = {}


def anchors(rel):
    if rel not in _ANCHORS:
        _ANCHORS[rel] = {gitlab_slug(h) for h in re.findall(r"^#{1,6} +(.+?)\s*#*\s*$", read(rel), re.M)}
    return _ANCHORS[rel]


def blank_code(text):
    """fenced and indented code blocks blanked with their line count kept, so reported line numbers stay true."""
    text = re.sub(r"```.*?```", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    return re.sub(r"(?m)^(?: {4}|\t)(?![-*+] |\d+\. ).*$", "", text)


def root_rel(r):
    """a path argument as given from the cwd, relative to the repository; '' means the whole repository."""
    a = os.path.abspath(r)
    if a == ROOT or a.startswith(ROOT + os.sep):
        return norm(os.path.relpath(a, ROOT))
    return norm(r)


def in_roots(f, roots):
    return any(r == "" or f == r or f.startswith(r + "/") for r in roots)


def links(roots):
    roots = [root_rel(r) for r in roots]
    bad = []
    for f in [x for x in git("ls-files", "*.md").split("\n") if x]:
        if not in_roots(f, roots):
            continue
        text = read(f)
        if "<!-- check-links: off" in text:
            continue
        body = blank_code(text)
        body_nocode = re.sub(r"`[^`\n]*`", "", body)
        for tgt in [m.group(2) for m in LINK.finditer(body_nocode)] + REFDEF.findall(body_nocode):
            tgt = tgt.strip("<>")
            if re.match(r"^[a-z]+:", tgt) or tgt.startswith("/"):
                continue
            path, _, anchor = tgt.partition("#")
            a = norm(os.path.join(os.path.dirname(f), urllib.parse.unquote(path))) if path else f
            if not os.path.exists(os.path.join(ROOT, a)):
                bad.append((f, tgt))
            elif anchor and a.endswith(".md") and anchor.lower() not in anchors(a):
                bad.append((f, tgt))
        for mo in PATHSPAN.finditer(body):
            prefix, rest = mo.group(1), mo.group(2)
            if "<" not in rest:
                rest = rest.rstrip(">")        # a path written inside <…> brackets
            if "<" in rest or (prefix.startswith("openplatform-claude/") and not IS_PLATFORM):
                continue
            if rest.split("/")[0] in OLD_DIRS or rest in ("summary.sh", "migrate-layout.sh"):
                continue                  # the old layout: stale() reports current-tense mentions of it
            if not os.path.exists(os.path.join(ROOT, norm(prefix.replace("openplatform-claude/", "") + rest))):
                bad.append((f, mo.group(0)))
    return sorted(set(bad))


OLD_LAYOUT = re.compile(r"features/(?:todo|done|archived|plans|review)/|\bsummary\.sh\b|--due-survey")


def stale():
    """current-tense mentions of the pre-2026-09-30 layout. Shipped / archived features, reviews, resources/
    and reviews/ are history and skipped; a file describing the old layout on purpose opts out with
    <!-- old-layout: described -->, a single line with <!-- old-layout -->."""
    out = []
    for f in [x for x in git("ls-files", "*.md").split("\n") if x]:
        parts = f.split("/")
        if parts[0] == REVIEWS:
            continue
        if parts[0] == FEAT and len(parts) > 2:
            if parts[1] in OLD_DIRS or parts[-1] == "review.md" or REVIEW_DIR in parts[2:-1] or "resources" in parts:
                continue
            if status_word(read(os.path.join(FEAT, parts[1], "README.md"))) in ("shipped", "archived"):
                continue
        text = read(f)
        if "<!-- old-layout: described" in text:
            continue
        for n, line in enumerate(blank_code(text).split("\n"), 1):
            if OLD_LAYOUT.search(line) and "old-layout" not in line:
                out.append((f, n, line.strip()[:100]))
    return out


def cmd_check_links(args):
    roots = args or DEFAULT_ROOTS
    rel = [root_rel(r) for r in roots]
    if not any(in_roots(f, rel) for f in git("ls-files").split("\n") if f):
        sys.exit(f"no tracked file under: {' '.join(roots)}")
    bad = links(roots)
    for f, t in bad:
        print(f"DANGLING\t{f}\t{t}")
    old = [s for s in stale() if in_roots(s[0], rel)]
    for f, n, line in old:
        print(f"OLD LAYOUT\t{f}:{n}\t{line}")
    ol = old_layout()
    for f in ol:
        print(f"NOT CONVERTED\t{f}")
    print(f"dangling: {len(bad)}   old-layout mentions: {len(old)}   not converted: {len(ol)}")
    sys.exit(1 if bad or old or ol else 0)


# ------------------------------------------------------------------ due-survey
def last_survey(slug):
    """the newest review: (its date from the file name, the commit that added it when that commit is of the same
    day — a review landed as written; None for one a conversion or a move put there later). A FIXED mark never
    moves either."""
    files = review_files(slug)
    if not files:
        return None
    date, name = files[-1]
    path = os.path.join(FEAT, slug, REVIEW_DIR, name)
    added = git("log", "--diff-filter=A", "--format=%H %cs", "--", path).split()
    sha = added[-2] if len(added) >= 2 and added[-1] == date else None
    return date, sha


def cmd_due_survey(args):
    rows, _ = load()
    _, anc = history()
    print(f"Epic survey ledger (due at {DUE_THRESHOLD} commits since the newest {REVIEW_DIR}/<YYYY-MM-DD>-*.md)")
    for r in rows:
        if r["status"] not in OPEN or not r["ws"]:
            continue
        s = r["slug"]
        d = os.path.join(FEAT, s)
        rdir = os.path.join(d, REVIEW_DIR)
        # the epic's files under every path they ever had (rev-list does not follow renames); its reviews, under
        # every path they ever had, are excluded, so marking findings FIXED is not counted as epic drift, and so is
        # the orchestration board and its ledger, whose machine-written commits are bookkeeping, not design;
        # BOARD_BOOKKEEPING at any depth (a product's thin root under the board too), and the old paths of the
        # top-level ones
        reviews = [x for x in git("ls-files", rdir).split("\n") if x]
        board = [os.path.join(d, f) for f in ("board.json", "board.yml", "decisions.yml", "decisions.md",
                                              "sessions.json")]
        excl = {rdir, *board} | {a for x in reviews + board for a in anc.get(x, set())}
        globs = [f":(exclude,glob){d}/**/{name}" for name in BOARD_BOOKKEEPING]
        spec = {d}
        for f in [x for x in git("ls-files", d).split("\n") if x and not x.startswith(rdir + "/")]:
            spec |= anc.get(f, set())
        # counted from the commit that landed the newest review; for a review a conversion put there later, from
        # the start of its day — a same-day commit before it counts too, so that clock fires early, never late
        last = last_survey(s)
        rng = [f"{last[1]}..HEAD"] if last and last[1] else ([f"--since={last[0]}T00:00:00", "HEAD"] if last else ["HEAD"])
        n = int(git("rev-list", "--count", *rng, "--", *sorted(spec),
                    *[f":(exclude){x}" for x in sorted(excl)], *globs).strip() or 0)
        verdict = "DUE" if n >= DUE_THRESHOLD else "ok"
        print(f"  {pad(verdict, 4)}  {pad(s, 40)}  last survey {pad(last[0] if last else 'never', 10)}  {n}/{DUE_THRESHOLD} commits")


# ------------------------------------------------------------------ status-drift
BOARD = "board.json"
KEY = re.compile(r"[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*")
LEAF_PHRASE = re.compile(r"board\s+lea(?:f|ves)\s+([^)·;]*)")
H1_CODE = re.compile(r"\*\(([^)]*)\)\*")
H1_KEY = re.compile(r"(?<![A-Za-z0-9-])(?:[A-Z]+[0-9]+|[A-Z]+-[A-Za-z0-9]+)(?![A-Za-z0-9-])")
LEAF_DONE = ("done",)
LEAF_LIVE = ("active", "next")


def leaf_refs(f, text, board, slug):
    """the board leaves a workstream names: 'board leaf X-…' / 'board leaves X-a and X-b' before its first '## '
    heading, the codes of its H1 (`*(X-…)*`, a bare `X-…` or `I4`), and the leaves whose `plan` field is this file.
    A token that is no board key is not a reference."""
    head = re.split(r"(?m)^## ", text, maxsplit=1)[0].replace("`", "")
    h1 = title(text).replace("`", "")
    toks = [t for m in LEAF_PHRASE.finditer(head) for t in KEY.findall(m.group(1))]
    toks += [t for m in H1_CODE.finditer(h1) for t in KEY.findall(m.group(1))]
    toks += H1_KEY.findall(h1)
    toks += [k for k, v in board.items() if isinstance(v, dict) and str(v.get("plan", "")).endswith(f"{slug}/{f}")]
    return list(dict.fromkeys(t for t in toks if isinstance(board.get(t), dict)))


def drift(plan_status, leaves):
    """an open plan whose every leaf is done, or a shipped plan with a leaf still being worked on."""
    states = [l.get("status") for l in leaves]
    if plan_status in ("design", "planned", "active"):
        return all(s in LEAF_DONE for s in states)
    if plan_status == "shipped":
        return any(s in LEAF_LIVE for s in states)
    return False


def cmd_status_drift(args):
    if len(args) > 1:
        sys.exit("usage: features.sh status-drift [epic-dir]")
    if args:
        a = args[0].rstrip("/")
        rel = root_rel(a) if os.path.isdir(os.path.abspath(a)) else norm(os.path.join(FEAT, a))
        slug = rel[len(FEAT) + 1:] if rel.startswith(FEAT + "/") else ""
        if not slug or "/" in slug or slug not in slugs():
            sys.exit(f"no such feature: {args[0]}")
        if not os.path.isfile(os.path.join(ROOT, FEAT, slug, BOARD)):
            sys.exit(f"no {BOARD} in {FEAT}/{slug}/")
        epics = [slug]
    else:
        epics = [s for s in slugs() if os.path.isfile(os.path.join(ROOT, FEAT, s, BOARD))]
    checked = skipped = found = 0
    for slug in epics:
        try:
            board = json.loads(read(os.path.join(FEAT, slug, BOARD)) or "{}")
        except ValueError as ex:
            sys.exit(f"{FEAT}/{slug}/{BOARD}: not JSON ({ex})")
        for f, text in workstreams(slug):
            keys = leaf_refs(f, text, board, slug)
            if not keys:
                skipped += 1
                continue
            checked += 1
            sw = status_word(text)
            if drift(sw, [board[k] for k in keys]):
                found += 1
                leaves = ", ".join(f"{k} {board[k].get('status')}" + (f" {board[k]['doneAt']}" if board[k].get("doneAt") else "")
                                   for k in keys)
                print(f"DRIFT\t{FEAT}/{slug}/{f}\tplan {sw}\tleaf {leaves}")
    print(f"status-drift: {checked} workstream(s) checked against their leaf, {skipped} without a leaf reference "
          f"(skipped), {found} drifting", file=sys.stderr)
    sys.exit(1 if found else 0)


cmds = {"ticket": cmd_ticket, "new": cmd_new, "rename": cmd_rename, "check-links": cmd_check_links,
        "due-survey": cmd_due_survey, "status-drift": cmd_status_drift}
argv = sys.argv[1:]
if argv and argv[0] in ("-h", "--help", "help"):
    with open(os.path.join(ROOT, "features.sh")) as fh:
        for line in fh.read().split("\n")[1:]:
            if not line.startswith("#"):
                break
            print(line[2:] if line.startswith("# ") else line.lstrip("#"))
    sys.exit(0)
if argv and argv[0] in cmds:
    cmds[argv[0]](argv[1:])
elif argv and not argv[0].startswith("--"):
    sys.exit(f"unknown command: {argv[0]}  (features.sh --help)")
else:
    cmd_list(argv)
PY
