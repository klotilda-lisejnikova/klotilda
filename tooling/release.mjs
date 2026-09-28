// Bumps the project version in the root package.json, commits it and tags it `vX.Y.Z`.
//   pnpm release patch|minor|major   (or an exact version, e.g. pnpm release 1.0.0)
// Then push with `git push --follow-tags`. The web shows the version in its footer.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const bump = process.argv[2];
if (!bump) fail("Usage: pnpm release patch|minor|major|<x.y.z>");
if (git("status", "--porcelain")) fail("Commit or stash your changes first.");

const file = new URL("../package.json", import.meta.url);
const text = readFileSync(file, "utf8");
const current = JSON.parse(text).version;
const [major, minor, patch] = current.split(".").map(Number);

const next =
  bump === "major" ? `${major + 1}.0.0`
  : bump === "minor" ? `${major}.${minor + 1}.0`
  : bump === "patch" ? `${major}.${minor}.${patch + 1}`
  : /^\d+\.\d+\.\d+$/.test(bump) ? bump
  : fail(`Unknown bump "${bump}".`);

writeFileSync(file, text.replace(`"version": "${current}"`, `"version": "${next}"`));
git("add", "package.json");
git("commit", "-m", `release: v${next}`);
git("tag", "-a", `v${next}`, "-m", `v${next}`);
console.log(`${current} → ${next}, tagged v${next}. Push with: git push --follow-tags`);
