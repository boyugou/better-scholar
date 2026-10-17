// Dev tool: what does a change to the matcher do to real venue lines? It resolves every line of test/fixtures/venues.expected.json (the 22,000+ lines read off real
// Scholar profiles) and of test/fixtures/real-titles.txt (50,000+ more titles from Crossref's and OpenAlex's public records, see scripts/pull-real-titles.mjs; they
// carry no expected answer) with the matcher of a commit and with the matcher in the working tree, and prints what differs:
//   LOST   a badge that is gone              MOVED  the badge of another venue            GAIN  a badge that was not there (only with --gains)
// Every LOST and MOVED line must be a wrong badge that was removed or a change meant on purpose; a line that is neither is a regression. Run it before every commit
// that touches src/lib/venues.js or src/data/aliases.js (the snapshot test sees only the first set of lines).
//   node scripts/diff-matcher.mjs [<commit>] [--gains[=N]]        the commit defaults to HEAD; N lines of gains, 40 if no number
// Pure Node, nothing to install; it needs git and tar for the old copy of the matcher.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const gainsArg = args.find((a) => a.startsWith("--gains"));
const showGains = gainsArg ? Number(gainsArg.split("=")[1]) || 40 : 0;
const commit = args.find((a) => !a.startsWith("--")) || "HEAD";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diff-matcher-"));
try {
  const archive = spawnSync("git", ["archive", commit, "src/lib", "src/data"], { cwd: root, maxBuffer: 1 << 30 });
  if (archive.status !== 0) { console.error(String(archive.stderr).trim() || `git archive ${commit} failed`); process.exit(2); }
  const untar = spawnSync("tar", ["-x", "-C", tmp], { input: archive.stdout });
  if (untar.status !== 0) { console.error(String(untar.stderr).trim() || "tar failed"); process.exit(2); }

  const resolver = (dir) => require(path.join(dir, "src/lib/venues.js")).createResolver({
    ccf: require(path.join(dir, "src/data/ccf.js")).venues,
    core: require(path.join(dir, "src/data/core.js")).venues,
    aliases: require(path.join(dir, "src/data/aliases.js")),
  });
  const before = resolver(tmp), after = resolver(root);

  const titles = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, "test/fixtures/venues.expected.json"), "utf8"))));
  const extra = path.join(root, "test/fixtures/real-titles.txt");
  if (fs.existsSync(extra)) for (const line of fs.readFileSync(extra, "utf8").split("\n")) if (line) titles.add(line);

  const brief = (r) => [r.ccf && `CCF ${r.ccf.tier} ${r.ccf.abbr || r.ccf.name}`, r.core && `CORE ${r.core.rank} ${r.core.abbr}`].filter(Boolean).join(" · ");
  const lost = [], moved = [], gained = [];
  for (const t of titles) {
    const a = brief(before.resolve(t)), b = brief(after.resolve(t));
    if (a === b) continue;
    if (!a) gained.push([b, t]); else if (!b) lost.push([a, t]); else moved.push([a, b, t]);
  }
  console.log(`${titles.size} lines; the working tree against ${commit}: ${lost.length} lost, ${moved.length} moved, ${gained.length} gained`);
  for (const [a, t] of lost) console.log("LOST ", a.padEnd(30), "|", t.slice(0, 120));
  for (const [a, b, t] of moved) console.log("MOVED", a.padEnd(26), "=>", b.padEnd(26), "|", t.slice(0, 80));
  for (const [b, t] of gained.slice(0, showGains)) console.log("GAIN ", b.padEnd(30), "|", t.slice(0, 120));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
