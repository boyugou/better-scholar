#!/usr/bin/env node
// Validate raw award extractions and merge the verified ones into data/awards-2026.json.
//
//   node scripts/awards/merge-raw.mjs raw/cv.json raw/ml.json [--cross-check jh.json] [--write]
//
// A raw file is { entries: [{ venue, year, award, awardLabel, title, authors[], track, source, evidence }] }
// as collected from OFFICIAL pages (conference sites, proceedings, the ACL Anthology). Nothing is trusted:
//   - the quoted evidence must contain the title, the source must be https and not an aggregator,
//     the award must be one of the known kinds, the first author must have a usable surname;
//   - entries are de-duplicated and sorted; clashes (same venue/year/title, different award) are listed.
// --cross-check <file> compares against an independent list ([{venue, year, title, firstAuthor}], e.g. parsed from
// jeffhuang.com/best_paper_awards, which has no licence and is never a source) and reports, per entry, whether
// that list agrees. Entries the independent list contradicts are held back unless --keep-unconfirmed is given.
// Without --write nothing is changed: the report is the output.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const awards = require(join(root, "src", "lib", "awards.js"));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--cross-check" && args[i - 1] !== "--replace-source");
if (!files.length) { console.error("usage: merge-raw.mjs <raw.json>… [--cross-check list.json] [--replace-source <url>] [--write] [--keep-unconfirmed]"); process.exit(2); }

const BLOCKED_HOSTS = /(^|\.)(jeffhuang\.com|wikipedia\.org|wikidata\.org|researchgate\.net|semanticscholar\.org|paperswithcode\.com|medium\.com|github\.com|reddit\.com|quora\.com|linkedin\.com|x\.com|twitter\.com)$/i;
const MAX_YEAR = 2026;

const dataPath = join(root, "data", "awards-2026.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));
const kinds = new Set(Object.keys(awards.KIND));
const key = (e) => [e.venue, e.year, e.award, awards.titleKey(e.title)].join("|");
// a page's leftover character references ("but &mldr;” Demystifying": a program's data file that was never decoded) become the characters they stand for
const ENTITIES = { mldr: "…", hellip: "…", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
const decode = (t) => String(t).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10))).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

const problems = [];
const accepted = new Map();
// --replace-source <url>: the entries read from that page are dropped first, so a reader that was fixed replaces what the old one produced (and not only adds to it)
const replaced = opt("--replace-source");
for (const e of data.entries) if (!replaced || e.source !== replaced) accepted.set(key(e), e);
const existing = accepted.size;

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  for (const e of raw.entries || []) {
    const where = `${file.split("/").pop()}: ${e.venue} ${e.year} ${JSON.stringify((e.title || "").slice(0, 60))}`;
    const bad = [];
    if (!e.venue || !/^[A-Za-z0-9&+./ -]+$/.test(e.venue)) bad.push("venue");
    if (!Number.isInteger(e.year) || e.year < 1990 || e.year > MAX_YEAR) bad.push("year");
    if (!kinds.has(e.award)) bad.push("award kind " + e.award);
    if (!e.title || e.title.length < 8) bad.push("title");
    if (!Array.isArray(e.authors) || !e.authors.length || !awards.surnameKey(e.authors[0] || "")) bad.push("authors");
    let host = "";
    try { host = new URL(e.source).hostname; } catch (err) { bad.push("source url"); }
    if (host && (!e.source.startsWith("https://") || BLOCKED_HOSTS.test(host))) bad.push("source not allowed (" + host + ")");
    if (!e.evidence || !awards.titleKey(e.evidence).includes(awards.titleKey(e.title || ""))) bad.push("evidence does not contain the title");
    if (e.track && !["main", "datasets"].includes(e.track)) bad.push("track " + e.track);
    // further pages that print the same paper (a title restored from the conference's poster page, say): the same rules as `source`
    const also = [];
    for (const u of e.alsoAt || []) {
      let h = "";
      try { h = new URL(u).hostname; } catch (err) { /* reported below */ }
      if (!h || !u.startsWith("https://") || BLOCKED_HOSTS.test(h)) bad.push("alsoAt not allowed (" + u + ")"); else also.push(u);
    }
    if (bad.length) { problems.push({ where, why: bad.join("; ") }); continue; }
    const clean = {
      venue: e.venue, year: e.year, award: e.award, ...(e.awardLabel ? { awardLabel: e.awardLabel } : {}),
      title: decode(e.title).replace(/\s+/g, " ").trim(), authors: e.authors.map((a) => decode(a).replace(/\s+/g, " ").trim()),
      ...(e.track ? { track: e.track } : {}), ...(e.paperYear ? { paperYear: e.paperYear } : {}),
      source: e.source, ...(also.length ? { alsoAt: also } : {}), evidence: decode(e.evidence).replace(/\s+/g, " ").trim()
    };
    const k = key(clean);
    if (accepted.has(k)) {
      const prev = accepted.get(k);
      if (prev.source !== clean.source && !prev.alsoAt) prev.alsoAt = [clean.source];
      continue;
    }
    accepted.set(k, clean);
  }
}

// what a page prints among the authors that is no author: an organisation ("Monash University"), a template placeholder ("[node:field-speakers-first-name]"), the tail of a wrapped line ("and School of …")
const NOT_A_NAME = /\[node:|^and\s|\b(?:University|Universit[a-zé]\w*|Institute|Institut|Laborator(?:y|ies)|Department|College|School of|Corporation)\b|\bInc\.?$/i;
let cleaned = 0;
for (const e of accepted.values()) {
  if (/&[a-z#0-9]+;/i.test(e.title + e.evidence)) { e.title = decode(e.title); e.evidence = decode(e.evidence); cleaned++; }
  const keep = [];
  for (const a of e.authors) if (!NOT_A_NAME.test(a) && !keep.includes(a)) keep.push(a);
  if (keep.length !== e.authors.length) {
    cleaned++;
    if (!keep.length || !awards.surnameKey(keep[0])) problems.push({ where: `${e.venue} ${e.year} ${JSON.stringify(e.title.slice(0, 60))}`, why: "no author left after the organisations are dropped" });
    else e.authors = keep;
  }
}

// entries an official page gets wrong (data/exclusions.json), dropped from every merge
const exclusions = JSON.parse(readFileSync(join(root, "data", "exclusions.json"), "utf8")).exclude.map((x) => [x.venue, x.year, awards.titleKey(x.title)].join("|"));
let excluded = 0;
for (const [k, e] of [...accepted]) if (exclusions.includes([e.venue, e.year, awards.titleKey(e.title)].join("|"))) { accepted.delete(k); excluded++; }
const corrections = new Map((JSON.parse(readFileSync(join(root, "data", "exclusions.json"), "utf8")).correct || []).flatMap((x) => [[[x.venue, x.year, awards.titleKey(x.title)].join("|"), x], ...(x.newTitle ? [[[x.venue, x.year, awards.titleKey(x.newTitle)].join("|"), x]] : [])]));      // (found by the misprinted title in a fresh read, by the right one once it is in the list)
let corrected = 0;
for (const e of accepted.values()) {
  const x = corrections.get([e.venue, e.year, awards.titleKey(e.title)].join("|"));
  if (!x) continue;
  if (x.authors && x.authors.join() !== e.authors.join()) { e.authors = x.authors; corrected++; }
  if (x.newTitle && x.newTitle !== e.title) { e.title = x.newTitle; corrected++; }
  if (x.newTitle && !awards.titleKey(e.evidence).includes(awards.titleKey(e.title))) e.evidence += ` [the page misprints the title; the paper is "${e.title}" — data/exclusions.json]`;
}

// clashes: the same paper listed with two different award kinds at one venue-year
const byPaper = new Map();
for (const e of accepted.values()) {
  const k = [e.venue, e.year, awards.titleKey(e.title)].join("|");
  if (!byPaper.has(k)) byPaper.set(k, []);
  byPaper.get(k).push(e);
}
const clashes = [...byPaper.values()].filter((l) => l.length > 1);

// independent cross-check
let report = null;
const crossFile = opt("--cross-check");
if (crossFile) {
  const other = JSON.parse(readFileSync(crossFile, "utf8"));
  const index = new Map();
  for (const o of other) index.set([o.venue, o.year, awards.titleKey(o.title)].join("|"), o);
  const venuesCovered = new Set(other.map((o) => o.venue));
  report = { agree: 0, notInOther: [], otherOnly: [] };
  const seenOther = new Set();
  for (const e of accepted.values()) {
    if (!venuesCovered.has(e.venue)) continue;
    const k = [e.venue, e.year, awards.titleKey(e.title)].join("|");
    if (index.has(k)) { report.agree++; seenOther.add(k); e.confirmedBy = "independent list"; }
    else report.notInOther.push(e);
  }
  const ours = new Set([...accepted.values()].map((e) => [e.venue, e.year, awards.titleKey(e.title)].join("|")));
  const years = new Set([...accepted.values()].map((e) => e.year));
  const yearRange = [Math.min(...years), Math.max(...years)];
  for (const [k, o] of index) {
    if (o.year >= yearRange[0] && o.year <= yearRange[1] && ours.size && !ours.has(k) && [...accepted.values()].some((e) => e.venue === o.venue)) report.otherOnly.push(o);
  }
}

const sorted = [...accepted.values()].sort((a, b) => a.venue.localeCompare(b.venue) || a.year - b.year || a.award.localeCompare(b.award) || a.title.localeCompare(b.title));
const perVenue = {};
for (const e of sorted) (perVenue[e.venue] ||= new Set()).add(e.year);

console.log(`entries: ${sorted.length} (${sorted.length - existing} new) from ${files.length} file(s); ${problems.length} rejected, ${clashes.length} clash(es)`);
if (corrected) console.log(`author lists put right by data/exclusions.json: ${corrected}`);
if (excluded) console.log(`dropped by data/exclusions.json: ${excluded}`);
if (cleaned) console.log(`authors cleaned (organisations and placeholders dropped): ${cleaned} entr${cleaned === 1 ? "y" : "ies"}`);
console.log("venues:", Object.entries(perVenue).map(([v, ys]) => `${v}×${ys.size}y`).join("  "));
if (problems.length) { console.log("\nREJECTED"); for (const p of problems.slice(0, 60)) console.log(" -", p.where, "->", p.why); }
if (clashes.length) { console.log("\nCLASHES (same paper, different award kinds)"); for (const c of clashes) console.log(" -", c[0].venue, c[0].year, JSON.stringify(c[0].title.slice(0, 60)), c.map((e) => e.award).join(" / ")); }
if (report) {
  console.log(`\nCROSS-CHECK vs ${crossFile}: ${report.agree} agree, ${report.notInOther.length} of ours not in it, ${report.otherOnly.length} of its not in ours`);
  for (const e of report.notInOther.slice(0, 40)) console.log("  ours-only :", e.venue, e.year, e.award, JSON.stringify(e.title.slice(0, 70)));
  for (const o of report.otherOnly.slice(0, 40)) console.log("  theirs-only:", o.venue, o.year, JSON.stringify(o.title.slice(0, 70)));
}

if (flag("--write")) {
  const keep = flag("--keep-unconfirmed") || !report;
  const out = sorted.filter((e) => keep || e.confirmedBy || !report.notInOther.includes(e));
  data.entries = out.map(({ confirmedBy, ...rest }) => rest);
  data.meta.count = out.length;
  writeFileSync(dataPath, JSON.stringify(data, null, 1) + "\n");
  console.log(`\nwrote data/awards-2026.json with ${out.length} entries — now run: node scripts/build-data.mjs`);
}
