#!/usr/bin/env node
// Check the extension against a REAL, saved Google Scholar profile page.
//
//   node scripts/check-saved-profile.mjs page.html [--owner "Name"] [--shot out.png]
//
// Save a profile in Chrome (File → Save Page As → "Webpage, HTML Only"), or fetch it once with curl.
// The script serves that file offline as https://scholar.google.com/citations…, loads the unmodified
// extension from src/ in Chromium, and compares what the page ended up showing (row tints, rank chips,
// award marks) with the pure libraries run over an independent reading of the same HTML. It is the check
// to run when Scholar changes its markup: a missing selector or a mismatch is reported here before users
// notice. Needs Playwright and a Chromium build (see test/e2e/find-browser.mjs). Nothing is sent anywhere.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { pw, chromiumPath } = await import(path.join(repo, "test", "e2e", "find-browser.mjs"));

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const ownerArg = flag("--owner"), shot = flag("--shot");
const file = args[0];
if (!file) { console.error('usage: node scripts/check-saved-profile.mjs page.html [--owner "Name"] [--shot out.png]'); process.exit(2); }
if (!pw || !chromiumPath) { console.error("Playwright or a Chromium build was not found (set PLAYWRIGHT_PATH / CHROMIUM_PATH)."); process.exit(2); }

// ---- an independent reading of the saved HTML (deliberately not the extension's own code) ----
const bytes = fs.readFileSync(file);
const charset = (/charset=["']?([\w-]+)/i.exec(bytes.subarray(0, 4096).toString("latin1")) || [])[1] || "utf-8";
const html = new TextDecoder(charset).decode(bytes);
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (m, hex, dec, name) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(parseInt(dec, 10)) : NAMED[name.toLowerCase()] || m);
const text = (fragment) => decode(fragment.replace(/<[^>]+>/g, "")).replace(/ /g, " ").replace(/\s+/g, " ").trim();

const owner = ownerArg || text((/<div id="gsc_prf_in"[^>]*>([\s\S]*?)<\/div>/.exec(html) || [])[1] || "");
const rowsHtml = [...html.matchAll(/<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
const rows = rowsHtml.map((r) => {
  const grays = [...r.matchAll(/<div class="gs_gray">([\s\S]*?)<\/div>/g)].map((m) => text(m[1]));
  const cites = /class="gsc_a_ac[^"]*"[^>]*>(\d*)</.exec(r), year = /class="gsc_a_h[^"]*"[^>]*>(\d*)</.exec(r);
  return { title: text((/<a [^>]*class="gsc_a_at"[^>]*>([\s\S]*?)<\/a>/.exec(r) || [])[1] || ""), authors: grays[0] || "", venue: grays[1] || "",
    cites: cites && cites[1] ? parseInt(cites[1], 10) : 0, year: year && year[1] ? parseInt(year[1], 10) : null };
});
if (!owner || !rows.length) { console.error(`Could not read the page itself: owner "${owner}", ${rows.length} rows (is this a profile page saved as HTML?).`); process.exit(1); }

// ---- what the pure libraries say the page should look like ----------------------------------
const venues = require(path.join(repo, "src/lib/venues.js")), analysis = require(path.join(repo, "src/lib/analysis.js")), awardsLib = require(path.join(repo, "src/lib/awards.js"));
const ccf = require(path.join(repo, "src/data/ccf.js")), core = require(path.join(repo, "src/data/core.js")), aliases = require(path.join(repo, "src/data/aliases.js")), award = require(path.join(repo, "src/data/awards.js"));
const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });
const awardIndex = awardsLib.createIndex(award.items);
const venueWords = new Set([...ccf.venues.map((v) => v.abbr), ...core.venues.map((v) => v.acronym)].filter(Boolean).map((w) => w.toLowerCase()));
const ALL = { first: true, cofirst: true, second: true, last: true };
// the extension also reads a surname-first header the other way round when the rows show it (names.suggestVariants)
const namesLib = require(path.join(repo, "src/lib/names.js"));
const ownerSpelling = { name: owner, alternates: namesLib.suggestVariants(rows.map((r) => r.authors), { name: owner }).auto.map((v) => v.name) };
if (ownerSpelling.alternates.length) console.log(`  (the name "${owner}" is also read as ${ownerSpelling.alternates.map((a) => `"${a}"`).join(", ")} — the rows show it)`);
const want = rows.map((r) => {
  const a = analysis.analyzeRow({ title: r.title, authorsText: r.authors, venueText: r.venue, citations: r.cites, year: r.year },
    { owner: ownerSpelling, resolver, venueWord: (w) => venueWords.has(w), awards: awardIndex });
  return { role: a.status === "found" && analysis.isHighlighted(a, ALL) ? a.role : "", ccf: a.venue.ccf ? a.venue.ccf.tier : "", core: a.venue.core ? a.venue.core.rank : "",
    marks: a.marks.map((m) => `${m.kind}:${m.source}`).join(",") };
});

// ---- the real extension on that page ----------------------------------------------------------
const ext = path.join(repo, "src");
const ctx = await pw.chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "rr-saved-")), {
  executablePath: chromiumPath, headless: true, viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--no-first-run", ...(process.env.CI ? ["--no-sandbox"] : [])]
});
let failed = false;
const fail = (msg) => { failed = true; console.log("  ✗ " + msg); };
const pass = (msg) => console.log("  ✓ " + msg);
try {
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (!/^https?:/.test(url)) return route.continue();
    if (url.startsWith("https://scholar.google.com/citations")) return route.fulfill({ status: 200, headers: { "content-type": `text/html; charset=${charset}` }, body: bytes });
    return route.abort();                                   // offline: nothing else is fetched
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await page.goto("https://scholar.google.com/citations?user=SAVED&hl=en");
  console.log(`${path.basename(file)}: "${owner}", ${rows.length} rows`);

  // 1. the selectors the extension relies on (src/content/scholar.js)
  const missing = await page.evaluate(() => ["#gsc_prf_in", "#gsc_a_b", "#gsc_a_b tr.gsc_a_tr", "#gsc_a_b tr.gsc_a_tr a.gsc_a_at", "#gsc_a_b tr.gsc_a_tr td.gsc_a_t .gs_gray",
    "#gsc_a_b tr.gsc_a_tr td.gsc_a_c", "#gsc_a_b tr.gsc_a_tr td.gsc_a_y", ".gsc_rsb", "#gsc_a_tw", "#gsc_bpf_more"].filter((s) => !document.querySelector(s)));
  missing.length ? fail("Scholar's markup no longer has: " + missing.join(", ")) : pass("every selector the extension reads is present");

  // 2. the extension drew something, and what it drew equals the libraries' result
  const drawn = await page.waitForSelector("#rr-panel", { timeout: 15000 }).then(() => true, () => false);
  if (!drawn) fail("the panel did not appear");
  else {
    const got = await page.evaluate(() => {
      const trs = Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr"));
      const one = (tr, sel, attr) => { const c = tr.querySelector(sel); return c ? c.dataset[attr] : ""; };
      return {
        n: trs.length,
        role: trs.map((tr) => ["first", "cofirst", "second", "last"].find((r) => tr.classList.contains("rr-r-" + r)) || ""),
        ccf: trs.map((tr) => one(tr, '.rr-chip[data-kind="ccf"]', "tier")), core: trs.map((tr) => one(tr, '.rr-chip[data-kind="core"]', "tier")),
        marks: trs.map((tr) => Array.from(tr.querySelectorAll(".rr-chip-mark")).map((c) => `${c.dataset.mark}:${c.dataset.source}`).join(",")),
        panelIn: document.getElementById("rr-panel").parentElement.className || document.getElementById("rr-panel").parentElement.id,
        warning: !!document.querySelector('[data-rr="layout-warning"]')
      };
    });
    got.n === rows.length ? pass(`${got.n} rows read`) : fail(`the page has ${got.n} rows, the HTML ${rows.length}`);
    got.warning ? fail("the panel reports a layout it cannot read") : pass("no layout warning");
    for (const [name, mine, theirs] of [["row tints", got.role, want.map((w) => w.role)], ["CCF chips", got.ccf, want.map((w) => w.ccf)],
      ["CORE chips", got.core, want.map((w) => w.core)], ["award / talk marks", got.marks, want.map((w) => w.marks)]]) {
      const bad = theirs.map((x, i) => (mine[i] === x ? -1 : i)).filter((i) => i >= 0);
      if (!bad.length) pass(`${name} equal the library result (${theirs.filter(Boolean).length} drawn)`);
      else { fail(`${name} differ on ${bad.length} rows`); for (const i of bad.slice(0, 8)) console.log(`      row ${i + 1} “${rows[i].title.slice(0, 50)}”: page “${mine[i]}”, library “${theirs[i]}”`); }
    }
    const marked = got.marks.map((m, i) => (m ? `“${rows[i].title.slice(0, 48)}” → ${m}` : "")).filter(Boolean);
    if (marked.length) console.log("  marks:", marked.join("; "));
    console.log(`  panel in: ${got.panelIn}`);
    if (shot) { await page.screenshot({ path: shot }); console.log("  screenshot:", shot); }
  }
  errors.length ? fail("page errors: " + errors.slice(0, 3).join(" | ")) : pass("no console or page errors");
} finally {
  await ctx.close();
}
console.log(failed ? "\nFAILED" : "\nOK");
process.exit(failed ? 1 : 0);
