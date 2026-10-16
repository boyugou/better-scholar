#!/usr/bin/env node
// Does every quote in store/chrome/claims.md still exist in the file its row names?
//
//   node store/chrome/check-claims.mjs [path/to/claims.md]
//
// A table whose header has a "File" (or "Files") column and a "Quote" (or "Quotes") column is checked row by row. The File cell holds the files, in backticks, relative to
// the repository root; the Quote cell holds the quotes, each in backticks. A quote is a fragment of ONE line of a file: it passes when at least one of the row's files has
// a line that contains it (a fixed string, as `grep -F` reads it; a quote with a line break in it is not a quote). `\|` in a cell is a pipe (a table cell cannot hold a bare
// one). Rows with no quote (a count, a grep, something observed) are listed, not checked.
// Exit status 1 when a quote or a file is missing. No dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const claims = path.resolve(process.argv[2] || path.join(root, "store", "chrome", "claims.md"));

// the cells of a table row (a pipe that is escaped, `\|`, stays inside its cell)
function cells(line) {
  const out = [];
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\" && line[i + 1] === "|") { cur += "\\|"; i++; } else if (line[i] === "|") { out.push(cur); cur = ""; } else cur += line[i];
  }
  out.push(cur);
  return out.slice(1, -1).map((c) => c.trim());
}
// the code spans of a cell: a run of n backticks opens a span that the next run of exactly n backticks closes
function spans(cell) {
  const out = [];
  for (let i = 0; i < cell.length;) {
    if (cell[i] !== "`") { i++; continue; }
    let n = 0;
    while (cell[i + n] === "`") n++;
    let j = i + n, close = -1;
    while (j < cell.length) {
      if (cell[j] !== "`") { j++; continue; }
      let m = 0;
      while (cell[j + m] === "`") m++;
      if (m === n) { close = j; break; }
      j += m;
    }
    if (close < 0) { i += n; continue; }
    let text = cell.slice(i + n, close);
    if (text.length > 2 && text.startsWith(" ") && text.endsWith(" ") && text.trim()) text = text.slice(1, -1);
    out.push(text);
    i = close + n;
  }
  return out;
}

const lines = fs.readFileSync(claims, "utf8").split("\n");
const cache = new Map();
const linesOf = (file) => {
  if (!cache.has(file)) cache.set(file, fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file, "utf8").split("\n") : null);
  return cache.get(file);
};
let rows = 0, quotes = 0, unquoted = [];
const problems = [];
let cols = null;
for (let n = 0; n < lines.length; n++) {
  const line = lines[n];
  if (!line.startsWith("|")) { cols = null; continue; }
  const row = cells(line);
  if (row.every((c) => /^:?-{3,}:?$/.test(c))) continue;
  if (!cols) {
    const f = row.findIndex((c) => /^files?\b/i.test(c)), q = row.findIndex((c) => /^quotes?\b/i.test(c));
    cols = f >= 0 && q >= 0 ? { f, q } : { f: -1, q: -1 };
    continue;
  }
  if (cols.f < 0) continue;
  rows++;
  const id = row[0].replace(/`/g, "").slice(0, 40) || "row";
  const files = spans(row[cols.f] || "").map((s) => s.replace(/:\d+(?:-\d+)?$/, ""));
  const wanted = spans(row[cols.q] || "").map((s) => s.replace(/\\\|/g, "|"));
  for (const f of files) if (linesOf(path.join(root, f)) === null) problems.push(`line ${n + 1} (${id}): no such file (or not a file): ${f}`);
  if (!wanted.length) { unquoted.push(`${id} (line ${n + 1})`); continue; }
  if (!files.length) problems.push(`line ${n + 1} (${id}): quotes but no file named`);
  for (const quote of wanted) {
    quotes++;
    const found = files.some((f) => (linesOf(path.join(root, f)) || []).some((l) => l.includes(quote)));
    if (!found) problems.push(`line ${n + 1} (${id}): not found in ${files.join(", ") || "(no file)"}: ${quote}`);
  }
}
console.log(`${path.relative(root, claims)}: ${quotes} quotes in ${rows} rows checked, ${problems.length} problem(s)`);
if (unquoted.length) console.log(`rows with no quote (read, not checked): ${unquoted.join("; ")}`);
for (const p of problems) console.log("  " + p);
process.exit(problems.length ? 1 : 0);
