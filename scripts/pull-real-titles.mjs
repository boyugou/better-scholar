// Dev tool: collects real venue titles from public records and writes test/fixtures/real-titles.txt, the extra lines that scripts/diff-matcher.mjs replays
// (one title per line, sorted, without the lines of venues.expected.json). No key, no account and no e-mail address goes into any request (Crossref's anonymous pool is the
// slower one). Every source is saved under the git-ignored .cache/real-titles/ as it goes, and a run starts where the last one stopped.
//   crossref-venues       each conference of the two lists: the container titles of the proceedings articles Crossref finds under its official name
//   crossref-journals     each journal of the CCF list: the same for journal articles (a made-up volume, issue and pages are added, as Scholar prints them)
//   crossref-sample       the container titles of random proceedings articles: what publishers print, whatever the lists say
//   openalex-conferences  OpenAlex's conference sources with their alternate titles (the 6,000 most cited, then the next ones)
//   openalex-journals     OpenAlex's 8,000 most cited journals with their abbreviated and alternate titles
//   node scripts/pull-real-titles.mjs [--only <source>[,<source>]] [--samples N]    fetch what is missing, then rewrite the file (N more random samples of 100, default 100)
//   node scripts/pull-real-titles.mjs --merge-only                                  rewrite the file from what is cached
// OpenAlex lets an anonymous caller a small daily budget: a source that is refused (401, 403) stops there and keeps what it has.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cacheDir = path.join(root, ".cache", "real-titles");
fs.mkdirSync(cacheDir, { recursive: true });
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf("--" + name); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true); };
const only = flag("only") && flag("only") !== true ? flag("only").split(",") : null;
const mergeOnly = flag("merge-only") === true;
const samples = Number(flag("samples")) || 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load = (name, fallback) => { const f = path.join(cacheDir, name + ".json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback; };
const save = (name, value) => fs.writeFileSync(path.join(cacheDir, name + ".json"), JSON.stringify(value));
// the body of an answer, or null when it did not come; a refusal that will not pass (OpenAlex's budget) stops the source
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error("refused " + r.status), { stop: true });
    } catch (e) { if (e.stop) throw e; }
    await sleep(2000 * (i + 1));
  }
  return null;
}
const CROSSREF = "https://api.crossref.org/works?";
const officialName = (name) => name.replace(/\([^()]*\)/g, " ").replace(/\s+/g, " ").trim();
const count = (acc, t) => { if (t) acc[t] = (acc[t] || 0) + 1; };

async function crossrefVenues() {
  const { venues: ccf } = require(path.join(root, "src/data/ccf.js")), { venues: core } = require(path.join(root, "src/data/core.js"));
  const rows = [...ccf.filter((v) => v.kind === "C").map((v) => ({ key: "ccf|" + v.abbr, name: v.name })), ...core.map((v) => ({ key: "core|" + v.acronym, name: v.name }))];
  const out = load("crossref-venues", {});
  let done = 0;
  for (const row of rows) {
    if (out[row.key]) continue;
    const j = await get(`${CROSSREF}query.container-title=${encodeURIComponent(officialName(row.name))}&filter=type:proceedings-article,from-pub-date:2000&rows=60&select=container-title,event`);
    if (!j) { console.error("skip", row.key); continue; }
    const titles = {};
    for (const w of j.message.items) count(titles, (w["container-title"] || [])[0]);
    out[row.key] = { name: row.name, titles };
    if (++done % 100 === 0) { save("crossref-venues", out); console.error("crossref-venues", done); }
    await sleep(300);
  }
  save("crossref-venues", out);
}

async function crossrefJournals() {
  const { venues: ccf } = require(path.join(root, "src/data/ccf.js"));
  const out = load("crossref-journals", {});
  let done = 0;
  for (const row of ccf.filter((v) => v.kind === "J")) {
    const key = row.abbr || row.name;
    if (out[key]) continue;
    const j = await get(`${CROSSREF}query.container-title=${encodeURIComponent(officialName(row.name))}&filter=type:journal-article,from-pub-date:1990&rows=50&select=container-title,short-container-title`);
    if (!j) { console.error("skip", key); continue; }
    const titles = {}, shorts = {};
    for (const w of j.message.items) { count(titles, (w["container-title"] || [])[0]); count(shorts, (w["short-container-title"] || [])[0]); }
    out[key] = { name: row.name, titles, shorts };
    if (++done % 50 === 0) { save("crossref-journals", out); console.error("crossref-journals", done); }
    await sleep(300);
  }
  save("crossref-journals", out);
}

async function crossrefSample() {
  const out = load("crossref-sample", []);
  for (let i = 0; i < samples; i++) {
    const j = await get(`${CROSSREF}filter=type:proceedings-article,from-pub-date:2008&sample=100&select=container-title,DOI`);
    if (!j) { console.error("crossref-sample stops at", i); break; }
    for (const w of j.message.items) out.push({ doi: w.DOI, ct: (w["container-title"] || []).filter(Boolean) });
    await sleep(350);
  }
  save("crossref-sample", out);
}

// OpenAlex pages by `page` only up to 10,000 results (cursor paging is refused to an anonymous caller): the sources after the 6,000th are asked for by citations below the last one seen
async function openalexSources(name, type, pages) {
  const base = `https://api.openalex.org/sources?sort=cited_by_count:desc&per-page=200&select=display_name,alternate_titles,abbreviated_title,cited_by_count`;
  const out = load(name, []);
  if (out.length) return;
  const take = (j) => { for (const x of j.results) out.push({ name: x.display_name, alt: [...(x.abbreviated_title ? [x.abbreviated_title] : []), ...(x.alternate_titles || [])], cited: x.cited_by_count }); };
  try {
    let below = null;
    for (let page = 1; page <= pages; page++) {
      const j = await get(`${base}&filter=type:${type}&page=${page}`);
      if (!j) break;
      take(j);
      below = j.results.length ? j.results[j.results.length - 1].cited_by_count : below;
      if (j.results.length < 200) break;
      await sleep(250);
    }
    if (type === "conference" && below != null) {
      for (let page = 1; page <= 50; page++) {
        const j = await get(`${base}&filter=type:${type},cited_by_count:%3C${below}&page=${page}`);
        if (!j) break;
        take(j);
        if (j.results.length < 200) break;
        await sleep(220);
      }
    }
  } catch (e) { console.error(name, e.message, "- keeping", out.length, "sources"); }
  save(name, out);
}

const SOURCES = {
  "crossref-venues": crossrefVenues,
  "crossref-journals": crossrefJournals,
  "crossref-sample": crossrefSample,
  "openalex-conferences": () => openalexSources("openalex-conferences", "conference", 30),
  "openalex-journals": () => openalexSources("openalex-journals", "journal", 40),
};
if (!mergeOnly) for (const [name, run] of Object.entries(SOURCES)) if (!only || only.includes(name)) { console.error("==", name); await run(); }

// the file: every cached title, once, minus the lines the snapshot already holds
const decode = (s) => String(s).replace(/&amp;amp;/g, "&").replace(/&amp;/g, "&");
const snapshot = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, "test/fixtures/venues.expected.json"), "utf8"))));
const titles = new Set();
const add = (t) => { t = String(t).replace(/\s+/g, " ").trim(); if (t && !snapshot.has(t)) titles.add(t); };
for (const v of Object.values(load("crossref-venues", {}))) for (const t of Object.keys(v.titles)) add(decode(t));
for (const v of Object.values(load("crossref-journals", {}))) for (const t of Object.keys(v.titles)) add(decode(t) + " 12 (3), 123-145, 2019");
for (const it of load("crossref-sample", [])) if (it.ct[0]) add(decode(it.ct[0]));
for (const f of ["openalex-conferences", "openalex-journals"]) for (const s of load(f, [])) { add(decode(s.name)); for (const a of s.alt) add(decode(a)); }
const lines = [...titles].sort();
fs.writeFileSync(path.join(root, "test/fixtures/real-titles.txt"), lines.join("\n") + "\n");
console.log(`${lines.length} titles written to test/fixtures/real-titles.txt`);
