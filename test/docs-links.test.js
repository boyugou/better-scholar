"use strict";
// The repository's Markdown links where it says: every relative link names a file that exists, and every #anchor a heading of that file (GitHub's slugs). A heading
// renamed in a terminology pass ("talk levels" → "talk kinds") had left a link to nothing.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".cache"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith(".md")) files.push(p);
  }
})(root);

// GitHub's anchor of a heading: lower case, no punctuation, spaces as hyphens; a repeated heading gets "-1", "-2" …
const slug = (h) => h.trim().toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
const anchorsOf = (f) => {
  const set = new Set(), seen = new Map();
  let code = false;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (/^```/.test(line)) { code = !code; continue; }
    if (code) continue;
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) { const s = slug(m[2].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`/g, "")), n = seen.get(s) || 0; seen.set(s, n + 1); set.add(n ? `${s}-${n}` : s); }
    for (const a of line.matchAll(/\s(?:name|id)="([^"]+)"/g)) set.add(a[1]);
  }
  return set;
};

test("every relative link and anchor in the Markdown files leads somewhere", () => {
  const broken = [];
  let links = 0;
  for (const f of files) {
    let code = false;
    fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (/^```/.test(line)) { code = !code; return; }
      if (code) return;
      for (const m of line.replace(/`[^`]*`/g, "").matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)|href="([^"]+)"|src="([^"]+)"/g)) {
        const target = m[1] || m[2] || m[3];
        if (/^(?:https?:|mailto:|data:|chrome:)/.test(target)) continue;
        links++;
        const [p, hash] = target.split("#");
        const dest = p ? path.resolve(path.dirname(f), decodeURIComponent(p)) : f;
        if (p && !fs.existsSync(dest)) broken.push(`${path.relative(root, f)}:${i + 1}: no file ${target}`);
        else if (hash && dest.endsWith(".md") && !anchorsOf(dest).has(decodeURIComponent(hash))) broken.push(`${path.relative(root, f)}:${i + 1}: no heading ${target}`);
      }
    });
  }
  assert.ok(files.length > 10 && links > 50, `${files.length} files, ${links} links`);
  assert.deepEqual(broken, []);
});
