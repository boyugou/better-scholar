#!/usr/bin/env node
// Paper awards of the ACL-family conferences, straight from the ACL Anthology's own metadata.
//
//   node scripts/awards/anthology.mjs --out raw/anthology.json [--dir cache/]
//
// The Anthology (https://aclanthology.org, metadata CC BY 4.0) marks award-winning papers with an
// <award name="…"/> element in its XML (https://github.com/acl-org/acl-anthology). This reads those files for
// ACL, EMNLP, NAACL, EACL, COLING and CoNLL, keeps the main-conference paper awards (best / outstanding /
// student / runner-up) and writes them in the raw format scripts/awards/merge-raw.mjs validates. Every entry's
// source is the paper's own Anthology page and its evidence is the paper title plus the award name as the XML
// gives them. Area-chair, demo, poster, video, reviewer and short-paper awards are not paper awards here.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const outFile = opt("--out", "anthology.json");
const dir = opt("--dir", null);
if (dir) mkdirSync(dir, { recursive: true });

const RAW = "https://raw.githubusercontent.com/acl-org/acl-anthology/master/data/xml/";
const YEARS = Array.from({ length: 15 }, (_, i) => 2012 + i);
const two = (y) => String(y).slice(2);
// old-style ids (P12 … D19, N12 …) until 2019, "<year>.<venue>" afterwards; unknown files are simply skipped
const FILES = [];
const OLD = { ACL: "P", EMNLP: "D", NAACL: "N", EACL: "E", COLING: "C", CoNLL: "K" };
for (const [venue, letter] of Object.entries(OLD)) {
  for (const y of YEARS) {
    FILES.push({ venue, year: y, name: y <= 2019 ? `${letter}${two(y)}` : null });
    if (y >= 2012) FILES.push({ venue, year: y, name: `${y}.${venue.toLowerCase()}` });
  }
}

async function load(name) {
  const cached = dir && join(dir, name + ".xml");
  if (cached && existsSync(cached)) return readFileSync(cached, "utf8");
  const res = await fetch(RAW + name + ".xml");
  if (!res.ok) return null;
  const text = await res.text();
  if (cached) writeFileSync(cached, text);
  return text;
}

// A title can carry <tex-math> (LaTeX). Plain text commands are unwrapped; real math cannot be matched to what
// Scholar prints, so such a title is reported and skipped (returns null).
function texToText(src) {
  const plain = src.replace(/\\(?:textit|textbf|texttt|textsc|textrm|mathrm|mathbf|mathit|mathsf|mathtt|emph|text)\s*\{([^{}]*)\}/g, "$1").replace(/\$/g, "");
  return /[\\^_]/.test(plain) ? null : plain.replace(/[{}]/g, "");
}
function plainTitle(raw) {
  let bad = false;
  const s = raw.replace(/<tex-math>([\s\S]*?)<\/tex-math>/g, (_, t) => { const r = texToText(t); if (r == null) { bad = true; return ""; } return r; });
  return bad ? null : decode(s);
}

const decode = (s) => s
  .replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

// award name → kind; null = not a paper award for our purposes
function kindOf(name) {
  const n = name.toLowerCase();
  if (/area chair|senior area|\bsac\b|reviewer|demo|poster|video|resource and evaluation track|test of time|lifetime|short paper|nominee|nomination|finalist|candidate|panel|volunteer|diversity|social media|industry/.test(n)) return null;
  if (/student paper/.test(n)) return "student";
  if (/honou?rable mention|runner[- ]?up/.test(n)) return "runner-up";
  if (/outstanding/.test(n) && /paper/.test(n)) return "outstanding";
  // the venue's top award under its plain names; anything else that starts with "best" is a named category
  if (/^(?:best|best overall|best long)(?: paper)?(?: award)?$/.test(n) && /paper|overall|long/.test(n)) return "best";
  if (/^best\b/.test(n)) return "category";
  return null;
}

const MAIN_VENUES = { acl: "ACL", emnlp: "EMNLP", naacl: "NAACL", eacl: "EACL", coling: "COLING", conll: "CoNLL" };
const entries = [];
const seenFiles = new Set();
const report = [];
for (const f of FILES) {
  if (!f.name || seenFiles.has(f.name)) continue;
  seenFiles.add(f.name);
  const xml = await load(f.name);
  if (!xml) continue;
  let kept = 0, awardsSeen = 0, skippedMath = 0;
  for (const vol of xml.matchAll(/<volume\b[^>]*>([\s\S]*?)<\/volume>/g)) {
    const body = vol[1];
    const meta = /<meta>([\s\S]*?)<\/meta>/.exec(body);
    if (!meta) continue;
    const booktitle = decode((/<booktitle>([\s\S]*?)<\/booktitle>/.exec(meta[1]) || [, ""])[1]);
    const year = parseInt((/<year>(\d{4})<\/year>/.exec(meta[1]) || [])[1], 10);
    const venues = [...meta[1].matchAll(/<venue>([a-z0-9-]+)<\/venue>/g)].map((m) => m[1]);
    const venueKey = venues.find((v) => MAIN_VENUES[v]);
    // main proceedings only: workshops, tutorials, demos, the student research workshop and findings are other volumes
    if (!venueKey || !year || /workshop|tutorial|demonstration|findings|student research|companion/i.test(booktitle)) continue;
    for (const paper of body.matchAll(/<paper\b[^>]*>([\s\S]*?)<\/paper>/g)) {
      const pb = paper[1];
      const awardsHere = [...pb.matchAll(/<award\s+name="([^"]*)"/g)].map((m) => decode(m[1]));
      if (!awardsHere.length) continue;
      awardsSeen += awardsHere.length;
      const url = (/<!--\s*(https:\/\/aclanthology\.org\/[^\s]+?)\/?\s*-->/.exec(pb) || [])[1];
      const title = plainTitle((/<title>([\s\S]*?)<\/title>/.exec(pb) || [, ""])[1]);
      if (title == null) { skippedMath++; continue; }
      const authors = [...pb.matchAll(/<author\b[^>]*>([\s\S]*?)<\/author>/g)].map((a) => {
        const first = decode((/<first>([\s\S]*?)<\/first>/.exec(a[1]) || [, ""])[1]);
        const last = decode((/<last>([\s\S]*?)<\/last>/.exec(a[1]) || [, ""])[1]);
        return `${first} ${last}`.trim();
      }).filter(Boolean);
      if (!url || !title || !authors.length) continue;
      for (const name of awardsHere) {
        const kind = kindOf(name);
        if (!kind) continue;
        entries.push({
          venue: MAIN_VENUES[venueKey], year, award: kind, awardLabel: name, title, authors, track: "main",
          source: url + "/", evidence: `${title} — ${name}`, verified: "official (ACL Anthology metadata)"
        });
        kept++;
      }
    }
  }
  report.push(`${f.name.padEnd(12)} ${kept} kept of ${awardsSeen} award elements${skippedMath ? ` (${skippedMath} with maths in the title skipped)` : ""}`);
}

console.log(report.join("\n"));
writeFileSync(outFile, JSON.stringify({ slice: "anthology", generatedBy: "scripts/awards/anthology.mjs", entries }, null, 1) + "\n");
console.log(`\n${entries.length} entries -> ${outFile}`);
