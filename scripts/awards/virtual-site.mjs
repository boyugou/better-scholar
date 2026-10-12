#!/usr/bin/env node
// Paper awards of ICLR, NeurIPS and ICML, read from each conference's own awards page on its virtual site.
//
//   node scripts/awards/virtual-site.mjs --out raw/virtual-site.json [--dir cache/]
//
// Writes the raw format that scripts/awards/merge-raw.mjs validates. The pages are the conferences' own
// (https://iclr.cc/virtual/<year>/awards_detail, likewise neurips.cc and icml.cc); nothing is taken from
// aggregators. Coverage per year is printed, including years whose page lists no paper awards.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseAwardsPage, parseRecipientsPage, parsePaperAwardPage, parseTestOfTimeDetail } from "./parse-virtual.mjs";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const outFile = opt("--out", "virtual-site.json");
const dir = opt("--dir", null);
if (dir) mkdirSync(dir, { recursive: true });

const SITES = [
  { venue: "ICLR", host: "iclr.cc" },
  { venue: "NeurIPS", host: "neurips.cc" },
  { venue: "ICML", host: "icml.cc" }
];
const YEARS = Array.from({ length: 8 }, (_, i) => 2019 + i);
const UA = "Mozilla/5.0 (compatible; research; github boyugou)";

async function fetchPage(url, cacheName) {
  const cached = dir && join(dir, cacheName);
  if (cached && existsSync(cached)) return readFileSync(cached, "utf8");
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) return null;
  const text = await res.text();
  if (cached) writeFileSync(cached, text);
  await new Promise((r) => setTimeout(r, 800));           // be polite to the conference servers
  return text;
}

const entries = [];
const seen = new Set();
let duplicates = 0;   // the same paper printed twice on one page (e.g. ICLR 2022: an oral and a poster entry)
for (const site of SITES) {
  for (const year of YEARS) {
    const html = await fetchPage(`https://${site.host}/virtual/${year}/awards_detail`, `${site.venue.toLowerCase()}-${year}.html`);
    if (html == null) { console.log(`${site.venue} ${year}: page not available`); continue; }
    const { entries: got, skipped } = parseAwardsPage(html, { venue: site.venue, year, host: site.host });
    for (const e of got) {
      const key = [e.venue, e.year, e.award, e.title.toLowerCase().replace(/[^a-z0-9]/g, "")].join("|");
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key);
      entries.push(e);
    }
    // test-of-time rows whose list entry omits the paper's title: the award page names the paper
    for (const s of skipped) {
      if (!s.href) continue;
      const url = new URL(s.href, `https://${site.host}/`).toString();
      const detailHtml = await fetchPage(url, `${site.venue.toLowerCase()}-tot-${year}-${url.split("/").pop()}.html`);
      const detail = detailHtml ? parseTestOfTimeDetail(detailHtml) : null;
      const surname = (s.authors[0] || "").split(/\s+/).pop().toLowerCase();
      if (!detail || !surname || !detail.authorsText.toLowerCase().includes(surname)) {
        console.log(`${site.venue} ${year}: test-of-time paper not confirmed on its award page; not added`);
        continue;
      }
      const e = {
        venue: site.venue, year, award: "tot", awardLabel: s.label, title: detail.title, authors: s.authors,
        track: "main", source: url, evidence: `${detail.title} — ${s.label}`, verified: "official (conference test-of-time page)"
      };
      const key = [e.venue, e.year, e.award, e.title.toLowerCase().replace(/[^a-z0-9]/g, "")].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(e);
      console.log(`${site.venue} ${year}: test of time paper read from its award page`);
    }
    const notKept = [...new Set(skipped.map((s) => s.label))];
    console.log(`${site.venue} ${year}: ${got.length} paper award(s)` + (notKept.length ? `; not kept: ${notKept.join(" | ")}` : ""));
  }
}
// The conferences' own award pages, where the virtual site does not list the paper awards. Each is read only for
// the years named, and an entry the virtual pages already have is merged away (same venue, year, award, title).
const OFFICIAL = [
  { venue: "ICML", years: YEARS, page: (y) => `https://icml.cc/Conferences/${y}/Awards`, parse: parseRecipientsPage },
  { venue: "CVPR", years: [2025], page: (y) => `https://cvpr.thecvf.com/Conferences/${y}/BestPapersDemos`, parse: parsePaperAwardPage },
  { venue: "ECCV", years: [2024], page: (y) => `https://eccv.ecva.net/Conferences/${y}/Awards`, parse: parsePaperAwardPage }
];
for (const src of OFFICIAL) {
  for (const year of src.years) {
    const url = src.page(year);
    const html = await fetchPage(url, `${src.venue.toLowerCase()}-official-${year}.html`);
    if (html == null) continue;
    const { entries: got } = src.parse(html, { venue: src.venue, year, source: url });
    let added = 0;
    for (const e of got) {
      const key = [e.venue, e.year, e.award, e.title.toLowerCase().replace(/[^a-z0-9]/g, "")].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(e);
      added++;
    }
    if (got.length) console.log(`${src.venue} ${year} (official awards page): ${got.length} read, ${added} new`);
  }
}
writeFileSync(outFile, JSON.stringify({ slice: "virtual-site", generatedBy: "scripts/awards/virtual-site.mjs", entries }, null, 1) + "\n");
console.log(`\n${entries.length} entries (${duplicates} repeated listings dropped) -> ${outFile}`);
