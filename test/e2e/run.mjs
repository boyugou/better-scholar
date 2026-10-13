#!/usr/bin/env node
// End-to-end test: load the real extension into Chromium and drive it against a local
// stand-in for a Scholar profile page (test/e2e/fixture-server.js).
//
//   npm run test:e2e
//
// Needs Playwright and a Chromium build (branded Chrome ≥137 ignores --load-extension, so
// use Playwright's bundled Chromium / Chrome for Testing). Locations, if not auto-found:
//   PLAYWRIGHT_PATH=/path/to/node_modules/playwright  CHROMIUM_PATH=/path/to/Chromium
// Without them the test prints a notice and exits 0 so plain `npm test` never depends on it.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(import.meta.url);

// ---- locate Playwright + Chromium (see find-browser.mjs) ----------------------
const { pw, chromiumPath } = await import("./find-browser.mjs");
if (!pw || !chromiumPath) {
  console.log("e2e skipped: Playwright or a Chromium build was not found (set PLAYWRIGHT_PATH / CHROMIUM_PATH).");
  process.exit(0);
}

// ---- expected values from the same pure libraries the extension uses -----------
const names = require(path.join(repo, "src/lib/names.js"));
const venues = require(path.join(repo, "src/lib/venues.js"));
const metrics = require(path.join(repo, "src/lib/metrics.js"));
const analysis = require(path.join(repo, "src/lib/analysis.js"));
const prefsLib = require(path.join(repo, "src/lib/prefs.js"));
const ccf = require(path.join(repo, "src/data/ccf.js"));
const core = require(path.join(repo, "src/data/core.js"));
const aliases = require(path.join(repo, "src/data/aliases.js"));
const { start } = require("./fixture-server.js");
const resolver = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases });

function expected(profile, { resolveHidden = false, extraOwner } = {}) {
  const owner = { name: profile.owner, alternates: extraOwner || [] };
  return profile.rows.map((r) => {
    const raw = { authorsText: r.authors, venueText: r.venue, citations: r.cites, year: r.year };
    let resolved = null;
    // only papers whose owner is hidden behind the truncation get looked up
    if (resolveHidden && analysis.needsDetail(analysis.analyzeRow(raw, { owner, resolver }))) {
      const visible = r.authors.split(/,\s*/).filter((t) => t && !/^\.\.\.$|…/.test(t));
      resolved = { authors: [...visible, profile.owner].join(", ") };
    }
    const a = analysis.analyzeRow(raw, { owner, resolver, resolved });
    return { status: a.status, role: a.role, venue: a.venue, citations: a.citations, year: a.year, highlighted: a.status === "found" && ["first", "cofirst", "second", "last"].includes(a.role), venueText: a.venueText };
  });
}

// ---- build a test copy of the extension that also runs on 127.0.0.1 ------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rr-e2e-"));
const extDir = path.join(tmp, "ext");
fs.cpSync(path.join(repo, "src"), extDir, { recursive: true });
const manifestPath = path.join(extDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.content_scripts[0].matches = ["http://127.0.0.1/citations*"];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
// Give the test copy a small award list aimed at the synthetic "marks-demo" profile (the shipped list is
// checked by test/awards.test.js; these entries only exercise the page behaviour).
const awardsLib = require(path.join(repo, "src/lib/awards.js"));
const testAwards = { meta: { label: "test list", edition: "test", count: 2 }, items: [
  [awardsLib.titleKey("A Plain Preprint"), awardsLib.surnameKey("A Smith"), "ICLR", 2023, "best", "Best Paper Award"],
  [awardsLib.titleKey("Deep Things for Recognition"), awardsLib.surnameKey("J Doe"), "CVPR", 2016, "best", "Best Paper Award"],
  [awardsLib.titleKey("Fast Recovery for Disaggregated Memory"), awardsLib.surnameKey("S Patel"), "OSDI", 2023, "best", "Best Paper Award"]   // the fictional showcase profile
] };
fs.writeFileSync(path.join(extDir, "data", "awards.js"),
  `(globalThis.RolesRanks = globalThis.RolesRanks || {}).data = Object.assign(globalThis.RolesRanks.data || {}, { awards: ${JSON.stringify(testAwards)} });\n`);
// unpacked-extension id = first 32 hex of sha256(realpath), digits mapped to a–p
const extId = [...crypto.createHash("sha256").update(fs.realpathSync(extDir)).digest("hex").slice(0, 32)]
  .map((c) => String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16))).join("");

const outDir = process.env.E2E_OUT || path.join(os.tmpdir(), "rr-e2e-out");
fs.mkdirSync(outDir, { recursive: true });

let step = 0;
const ok = (msg) => console.log(`  ✓ ${String(++step).padStart(2)}  ${msg}`);

async function launch() {
  return pw.chromium.launchPersistentContext(path.join(tmp, "profile-" + Math.random().toString(36).slice(2)), {
    executablePath: chromiumPath,
    headless: !process.env.E2E_HEADED,                              // E2E_HEADED=1 shows the window (background tabs then behave like a real browser's)
    viewport: { width: 1360, height: 900 },
    deviceScaleFactor: parseFloat(process.env.E2E_SCALE || "1"),   // E2E_SCALE=2 for sharp README screenshots
    permissions: ["clipboard-read", "clipboard-write"],
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, "--no-first-run", ...(process.env.CI ? ["--no-sandbox"] : [])]
  });
}


// Text in `root` whose colour against its background (the nearest opaque one up the tree) is under 4.5:1 (3:1 for large or bold text)
const lowContrast = (page, root) => page.evaluate((sel) => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; if (document.documentElement && getComputedStyle(document.documentElement).colorScheme.includes("dark") && !stack.some((c) => c.a >= 1)) acc = { r: 0, g: 0, b: 0, a: 1 }; for (const c of stack.reverse()) acc = over(c, acc); return acc; };
  const bad = [];
  for (const el of document.querySelectorAll(sel + ", " + sel + " *")) {
    if (!el.offsetParent && el !== document.querySelector(sel)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || /^[·–—-]$/.test(el.textContent.trim())) continue;          // (the dots of an empty table cell are decoration)
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || parseFloat(cs.opacity) < .1) continue;
    const fg = parse(cs.color), bg = bgOf(el);
    if (!fg) continue;
    const f = over(fg, bg), L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    if (ratio < (large ? 3 : 4.5) && !el.disabled && !el.closest("[disabled]")) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${el.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
  }
  return bad;
}, root);


// Controls (buttons, inputs, selects, links) inside `root` that a screen reader would announce without a name
const unnamed = (page, root) => page.evaluate((sel) => [...document.querySelectorAll(`${sel} button, ${sel} input, ${sel} select, ${sel} a[href], ${sel} textarea`)].filter((el) => {
  if (el.type === "hidden") return false;
  const label = el.getAttribute("aria-label") || el.getAttribute("title") || (el.labels && [...el.labels].map((l) => l.textContent).join("").trim()) || el.textContent.trim() || el.getAttribute("placeholder");
  return !label || !String(label).trim();
}).map((el) => el.outerHTML.slice(0, 90)), root);

// DOM → matrix cells { role: { A, B, C, none, total } }
const readMatrix = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll("#rr-panel tbody tr[data-role]").forEach((tr) => {
    const role = tr.dataset.role;
    if (role === "hidden") { out.hidden = parseInt(tr.querySelector(".rr-total").textContent, 10); return; }
    out[role] = {};
    tr.querySelectorAll("button.rr-cell").forEach((b) => { out[role][b.dataset.tier] = b.classList.contains("rr-zero") ? 0 : parseInt(b.textContent, 10); });
    out[role].total = parseInt(tr.querySelector(".rr-total").textContent, 10);
  });
  return out;
});

function matrixOf(papers, source = "ccf") {
  const s = metrics.summarize(papers, source);
  const out = {};
  for (const r of s.rows) { out[r.role] = Object.fromEntries([...s.columns.map((c) => [c, r[c]]), ["total", r.total]]); }
  if (s.hidden) out.hidden = s.hidden;
  return out;
}

// the year drop-down: open the list, choose the entry
const pickYear = async (page, act, value) => { await page.click(`#rr-panel button[data-act="${act}"]`); await page.click(`#rr-panel .rr-dd-list li[data-value="${value}"]:visible`); };

const visibleRows = (page) => page.locator("#gsc_a_b tr.gsc_a_tr:not(.rr-hide)").count();

// the settings page: switches are saved at once and every open profile tab redraws
const optionsUrl = `chrome-extension://${extId}/options/options.html`;
async function openOptions(context) {
  const p = await context.newPage();
  await p.goto(optionsUrl);
  await p.waitForSelector('input[data-pref="roles.last"]');
  return p;
}
// (a background tab neither paints nor can be screenshotted, so each helper first brings its own tab to the front)
const setPref = async (p, key, on) => { await p.bringToFront(); await p.setChecked(`input[data-pref="${key}"]`, on); };
const stored = (p, area, key) => p.evaluate(([a, k]) => chrome.storage[a].get(k).then((r) => r[k]), [area, key]);
const eventually = async (page, fn, arg) => { await page.bringToFront(); return page.waitForFunction(fn, arg, { polling: 100, timeout: 10000 }); };

(async () => {
  const fx = await start({ slug: "ion-stoica", pageSize: 20 });
  const profile = fx.profile;
  const context = await launch();
  const errors = [];
  context.on("page", (p) => { p.on("pageerror", (e) => errors.push("pageerror: " + e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); }); });
  try {
    // The default loads the whole paper list by itself. This first profile is looked at page by page (20 papers, then 'Load all'), so
    // its setting is switched off here; the default and the setting have their own checks (26 and 26b–26d).
    const seed = await openOptions(context);
    assert.equal(await seed.isChecked('input[data-pref="autoLoad"]'), true, "loading the whole list is on by default");
    await setPref(seed, "autoLoad", false);
    await seed.close();
    const page = await context.newPage();
    await page.goto(fx.url);
    await page.waitForSelector("#rr-panel");
    console.log("Roles & Ranks e2e — Chromium", context.browser() ? context.browser().version() : "", "| extension", extId);

    // -- 1. panel lands in the right-hand sidebar on a wide window
    const place = await page.evaluate(() => {
      const p = document.getElementById("rr-panel");
      return { inSidebar: p.parentElement.classList.contains("gsc_rsb"), first: p.parentElement.firstElementChild === p, wide: p.classList.contains("rr-wide") };
    });
    assert.deepEqual(place, { inSidebar: true, first: true, wide: false });
    ok("panel sits at the top of the sidebar on a wide window");

    // -- 2. first page (20 rows): matrix equals what the libraries compute
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr").count(), 20);
    const first20 = { owner: profile.owner, rows: profile.rows.slice(0, 20) };
    assert.deepEqual(await readMatrix(page), matrixOf(expected(first20)));
    ok("summary matrix matches the pure-library result for the first 20 papers");

    // -- 3. row decoration
    const roleCounts = await page.evaluate(() => Object.fromEntries(["first", "cofirst", "second", "last"].map((r) => [r, document.querySelectorAll("tr.rr-r-" + r).length])));
    const want20 = expected(first20);
    for (const r of ["first", "cofirst", "second", "last"]) assert.equal(roleCounts[r], want20.filter((p) => p.highlighted && p.role === r).length, "row class " + r);
    const ccfChips = await page.locator('.rr-chip[data-kind="ccf"]').count();
    assert.equal(ccfChips, want20.filter((p) => p.venue.ccf).length);
    const coreChips = await page.locator('.rr-chip[data-kind="core"]').count();
    assert.equal(coreChips, want20.filter((p) => p.venue.core).length);
    assert.ok(ccfChips > 0 && coreChips > 0);
    ok(`rows tinted by role; ${ccfChips} CCF and ${coreChips} CORE chips`);

    // -- 4. tooltips carry provenance
    const tip = await page.locator('.rr-chip[data-kind="ccf"]').first().getAttribute("title");
    assert.match(tip, /CCF [ABC]/); assert.match(tip, /CCF 2026 \(7th edition\)/); assert.match(tip, /Matched by/);
    ok("badge tooltip names the matched venue, the rule and the edition");

    // -- 4b. quiet design: no role chips, no help cursor, a chip never makes a row taller
    assert.equal(await page.locator(".rr-chip-role").count(), 0, "the role is shown by the row tint and the marked name, not a chip");
    const geometry = await page.evaluate(() => {
      const cursor = getComputedStyle(document.querySelector(".rr-chip")).cursor;
      let grew = 0, checked = 0;
      document.querySelectorAll("#gsc_a_b tr.gsc_a_tr .rr-chips").forEach((chips) => {
        const line = chips.parentElement;
        const withChips = line.getBoundingClientRect().height;
        chips.style.display = "none";
        const without = line.getBoundingClientRect().height;
        chips.style.display = "";
        checked++;
        if (withChips > without + 0.5) grew++;
      });
      return { cursor, grew, checked };
    });
    assert.notEqual(geometry.cursor, "help", "chips must not show the question-mark cursor");
    assert.ok(geometry.checked > 0 && geometry.grew === 0, `${geometry.grew} of ${geometry.checked} chip lines grew taller`);
    ok(`no role chips, no help cursor, ${geometry.checked} chip lines keep their height`);

    // -- 5. load all papers
    await page.click('[data-act="load-all"]');
    await page.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100, null, { timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector('[data-act="load-all"]'));
    const all = expected(profile);
    assert.deepEqual(await readMatrix(page), matrixOf(all));
    ok("'Load all' brings 100 rows and the matrix matches the library result");
    const stats = matrixOf(all);
    console.log("      matrix:", JSON.stringify(stats));

    // -- 6. a role switch on the settings page recolours the open profile at once (no reload)
    const opts = await openOptions(context);
    const lastRows = all.filter((p) => p.highlighted && p.role === "last").length;
    await setPref(opts, "roles.last", false);
    await eventually(page, () => document.querySelectorAll("tr.rr-r-last").length === 0);
    await setPref(opts, "roles.last", true);
    await eventually(page, (n) => document.querySelectorAll("tr.rr-r-last").length === n, lastRows);
    ok("role switches on the settings page recolour the open profile at once");

    // -- 6a. hiding Scholar's own blocks: nothing is hidden by default; each switch hides its block and brings it back
    const shown = (id) => page.evaluate((i) => getComputedStyle(document.getElementById(i)).display !== "none", id);
    for (const [key, id] of [["hide.cited", "gsc_rsb_cit"], ["hide.coauthors", "gsc_rsb_co"], ["hide.access", "gsc_rsb_mnd"]]) {
      assert.ok(await shown(id), `${id} is shown by default`);
      await setPref(opts, key, true);
      await eventually(page, (i) => getComputedStyle(document.getElementById(i)).display === "none", id);
      await setPref(opts, key, false);
      await eventually(page, (i) => getComputedStyle(document.getElementById(i)).display !== "none", id);
    }
    ok("Scholar's own Cited by / Co-authors / Public access blocks are shown by default and each can be hidden from the settings");

    // -- 6a2. merging duplicates: a twin differing only in capitals and punctuation is hidden, the more cited entry shows the total; off by default
    const twin = await page.evaluate(() => {
      const tr = document.querySelector("#gsc_a_b tr.gsc_a_tr");
      const c = tr.cloneNode(true);
      const a = c.querySelector("a.gsc_a_at");
      a.textContent = a.textContent.toUpperCase() + ".";
      a.setAttribute("href", a.getAttribute("href").replace(/citation_for_view=[^&]+/, "citation_for_view=TEST:TWIN"));
      c.querySelector("td.gsc_a_c a").textContent = "5";
      document.querySelector("#gsc_a_b").append(c);
      return { own: parseInt(tr.querySelector("td.gsc_a_c a").textContent, 10), rows: document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length };
    });
    const shownRows = () => page.evaluate(() => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).filter((r) => getComputedStyle(r).display !== "none").length);
    await page.waitForTimeout(300);
    assert.equal(await shownRows(), twin.rows, "duplicates are kept by default");
    await eventually(page, () => /: 1$/.test((document.querySelector('[data-rr="repeats"] .rr-note') || {}).textContent || ""));
    await setPref(opts, "mergeDuplicates", true);
    await eventually(page, (n) => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).filter((r) => getComputedStyle(r).display !== "none").length === n, twin.rows - 1);
    assert.equal(await page.locator('[data-rr="repeats"]').count(), 0, "with merging on the repeat hint is gone");
    const merged = await page.evaluate(() => { const a = document.querySelector("#gsc_a_b tr.gsc_a_tr td.gsc_a_c a"); return { text: a.textContent, title: a.title }; });
    assert.equal(merged.text, String(twin.own + 5), "the entry that stays shows the citations of both");
    assert.match(merged.title, /2/, "and says it stands for two entries");
    await setPref(opts, "mergeDuplicates", false);
    await eventually(page, (n) => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).filter((r) => getComputedStyle(r).display !== "none").length === n, twin.rows);
    assert.equal(await page.evaluate(() => document.querySelector("#gsc_a_b tr.gsc_a_tr td.gsc_a_c a").textContent), String(twin.own), "switched off: Scholar's own number is back");
    ok("merge duplicates: off by default; on hides the twin and shows both entries' citations on the one that stays; off restores");
    await page.evaluate(() => { for (const tr of document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")) if (/TEST:TWIN/.test(tr.innerHTML)) tr.remove(); });

    // -- 6a2b. talk rows: oral / spotlight / highlight can share a row in the panel (a paper with several counts once)
    await opts.bringToFront();
    const rowsOf = () => opts.locator(".preview [data-mark-group]").evaluateAll((els) => els.map((e) => e.getAttribute("data-mark-group") + "=" + e.querySelector("b").textContent));
    assert.deepEqual(await rowsOf(), ["award=2", "oral=1", "spotlight=1", "highlight=1"]);
    await opts.selectOption('select[data-pref="talkRows"]', "pair");
    await opts.waitForFunction(() => document.querySelectorAll(".preview [data-mark-group]").length === 3);
    assert.deepEqual(await rowsOf(), ["award=2", "oral=1", "spotlight+highlight=2"]);
    await opts.selectOption('select[data-pref="talkRows"]', "talks");
    await opts.waitForFunction(() => document.querySelectorAll(".preview [data-mark-group]").length === 2);
    assert.deepEqual(await rowsOf(), ["award=2", "oral+spotlight+highlight=3"]);
    await opts.selectOption('select[data-pref="talkRows"]', "separate");
    await opts.waitForFunction(() => document.querySelectorAll(".preview [data-mark-group]").length === 4);
    ok("talk rows: spotlight + highlight, or all three talk levels, can share one row of the panel; the counts follow");

    // -- 6a2c. the venue list (off until asked): the ranked venues of the highlighted papers, most papers first; a click lists just those papers
    assert.equal(await page.locator('[data-rr="venues"]').isVisible(), false, "the venue list is off by default");
    await opts.bringToFront();
    await setPref(opts, "panel.venues", true);
    await eventually(page, () => document.querySelectorAll('[data-rr="venues"] [data-venue]').length > 1);
    const venueRows = await page.locator('[data-rr="venues"] [data-venue]').evaluateAll((els) => els.map((e) => [e.dataset.venue, parseInt(e.querySelector("b").textContent, 10)]));
    assert.ok(venueRows.every((v, i) => i === 0 || venueRows[i - 1][1] >= v[1]), "most papers first");
    const wantVenue = all.filter((p) => p.highlighted && ((p.venue.ccf && (p.venue.ccf.abbr || p.venue.ccf.name)) || (p.venue.core && (p.venue.core.abbr || p.venue.core.name))) === venueRows[0][0]).length;
    assert.equal(venueRows[0][1], wantVenue, "the count matches the library");
    await page.bringToFront();
    await page.click(`[data-venue="${venueRows[0][0]}"]`);
    await eventually(page, (n) => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).filter((r) => getComputedStyle(r).display !== "none").length === n, venueRows[0][1]);
    // a venue filter whose venue leaves the list (no role is highlighted now) is dropped, not left hiding rows with no control to undo it
    for (const r of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + r, false);
    await eventually(page, () => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).every((r) => getComputedStyle(r).display !== "none"));
    for (const r of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + r, true);
    await setPref(opts, "panel.venues", false);
    ok("venue list: off by default; on, it lists the ranked venues most papers first, and a click shows just that venue's papers");

    // -- 6a3. role colours: a colour picked on the settings page recolours the open profile; "back to the standard" restores
    const rowColor = () => page.evaluate(() => getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).boxShadow);
    const before = await rowColor();
    await opts.bringToFront();
    await opts.locator('input[data-pref="colors.first"]').evaluate((el) => { el.value = "#ff0000"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
    await eventually(page, () => /255, 0, 0/.test(getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).boxShadow));
    await opts.click('[data-act="colors-reset"]');
    await eventually(page, () => /26, 115, 232/.test(getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).boxShadow));
    assert.equal(await rowColor(), before);
    ok("role colours: a picked colour recolours the open profile, and 'Back to the standard colours' restores it");

    // -- 6a4. language: choosing one in the settings re-draws the open profile and the settings page in it; "Follow the browser" brings English back
    const jaTitle = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "src", "_locales", "ja", "messages.json"), "utf8")).panelTitle.message;
    const enTitle = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "src", "_locales", "en", "messages.json"), "utf8")).panelTitle.message;
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="language"]', "ja");
    await page.waitForFunction((x) => (document.querySelector("#rr-panel") || {}).getAttribute && document.querySelector("#rr-panel").getAttribute("aria-label") === x, jaTitle, { timeout: 15000 });
    await opts.waitForFunction((x) => document.title.startsWith(x), jaTitle, { timeout: 15000 });
    assert.equal(await opts.locator('select[data-pref="language"]').inputValue(), "ja");
    await opts.selectOption('select[data-pref="language"]', "ar");
    await page.waitForFunction(() => document.querySelector("#rr-panel") && document.querySelector("#rr-panel").dir === "rtl", null, { timeout: 15000 });
    await opts.waitForFunction(() => document.documentElement.dir === "rtl", null, { timeout: 15000 });
    await opts.waitForTimeout(400);
    await opts.screenshot({ path: path.join(outDir, "settings-ar.png"), fullPage: true });
    await page.bringToFront(); await page.waitForTimeout(400);
    await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "panel-ar.png") });
    await opts.selectOption('select[data-pref="language"]', "auto");
    await page.waitForFunction((x) => document.querySelector("#rr-panel") && document.querySelector("#rr-panel").getAttribute("aria-label") === x, enTitle, { timeout: 15000 });
    ok("language: picking Japanese redraws the open profile and the settings page in it; 'Follow the browser' brings English back");
    // -- 6a5. "Open Scholar in": a profile opened in another language is opened again with the chosen one; "Leave as it is" stops that
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="scholarLanguage"]', "de");
    await page.waitForFunction(() => new URL(location.href).searchParams.get("hl") === "de", null, { timeout: 15000 });
    await page.waitForSelector("#rr-panel");
    await opts.selectOption('select[data-pref="scholarLanguage"]', "keep");
    await page.waitForLoadState("load");
    await page.waitForTimeout(600);                                   // (the open profile reloads itself once for the changed setting)
    await page.goto(fx.url);
    await page.waitForSelector("#rr-panel");
    assert.equal(new URL(page.url()).searchParams.get("hl"), "en", "left as it is");
    ok("Scholar language: a chosen language is put on the open profile's address (hl=), and 'Leave as it is' leaves it alone");
    // (the page was loaded afresh: bring the whole list back for what follows)
    await page.click('[data-act="load-all"]');
    await page.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100, null, { timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector('[data-act="load-all"]'));

    // -- 6a6. the card links under the header: one per card, each takes its card to the top of the window
    await opts.bringToFront();
    const links = await opts.locator(".toc a").count();
    assert.equal(links, await opts.locator("#controls > section.card").count());
    await opts.locator(".toc a").nth(3).click();
    // (polled with evaluate: the settings page's content security policy has no 'unsafe-eval', which waitForFunction needs on some builds)
    for (let i = 0; i < 50; i++) { const t = await opts.evaluate(() => document.querySelector("#card-3").getBoundingClientRect().top); if (t >= 0 && t < 140) break; await opts.waitForTimeout(100); if (i === 49) assert.fail("the card did not come to the top"); }
    await opts.locator('.toc a[data-card="card-3"][aria-current]').waitFor({ timeout: 5000 }).catch(() => assert.fail("the link of the card in view is marked"));
    await opts.evaluate(() => window.scrollTo(0, 0));
    ok(`settings page: ${links} links to its cards under the header, each one scrolls its card into view`);

    // -- 6b. the settings page's preview stays whole in view while the page scrolls, also in a short window
    await opts.bringToFront();
    await opts.setViewportSize({ width: 1360, height: 640 });
    for (const y of [0, 300, 99999]) {
      await opts.evaluate((yy) => window.scrollTo(0, yy), y);
      const r = await opts.evaluate(() => { const b = document.querySelector(".preview").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, vh: innerHeight }; });
      assert.ok(r.top >= 0 && r.bottom <= r.vh, `the preview left the window at scroll ${y}: ${JSON.stringify(r)}`);
    }
    assert.ok(await opts.evaluate(() => document.querySelector(".preview").classList.contains("more")), "a cut-off preview shows its fade");
    await opts.evaluate(() => window.scrollTo(0, 0));
    await opts.setViewportSize({ width: 1360, height: 1600 });
    await opts.waitForFunction(() => !document.querySelector(".preview").classList.contains("more"), null, { timeout: 4000 }).catch(() => assert.fail("a whole preview has no fade"));
    await opts.setViewportSize({ width: 1360, height: 900 });
    ok("the settings preview stays whole in view while the page scrolls, even in a short window");

    // -- 7. matrix cell filters the list
    const lastA = all.filter((p) => p.status === "found" && p.role === "last" && p.venue.ccf && p.venue.ccf.tier === "A").length;
    await page.click('button.rr-cell[data-role="last"][data-tier="A"]');
    assert.equal(await visibleRows(page), lastA);
    assert.equal(await page.getAttribute('button.rr-cell[data-role="last"][data-tier="A"]', "aria-pressed"), "true");
    await page.click('button.rr-cell[data-role="last"][data-tier="A"]');
    assert.equal(await visibleRows(page), 100);
    ok(`clicking last × CCF-A shows exactly ${lastA} papers; clicking again clears`);

    // -- 8. CORE tab
    await page.click('button[data-src="core"]');
    assert.deepEqual(await readMatrix(page), matrixOf(all, "core"));
    await page.click('button[data-src="ccf"]');
    ok("CCF/CORE switch recomputes the matrix");

    // -- 9. year filter + only highlighted
    const years = [...new Set(all.map((p) => p.year))].sort((a, b) => b - a);
    await pickYear(page, "year-start", String(years[2]));
    const inRange = all.filter((p) => p.year >= years[2]).length;
    assert.equal(await visibleRows(page), inRange);
    await pickYear(page, "year-start", "");
    await page.check('input[data-act="only"]');
    assert.equal(await visibleRows(page), all.filter((p) => p.highlighted).length);
    await page.uncheck('input[data-act="only"]');
    // the year list is a keyboard-operable drop-down: arrow keys move, End scrolls a long list without closing it, Escape closes and returns focus to the button
    await page.click('#rr-panel button[data-act="year-end"]');
    assert.equal(await page.getAttribute('#rr-panel button[data-act="year-end"]', "aria-expanded"), "true");
    await page.keyboard.press("End");
    await page.waitForTimeout(150);
    assert.equal(await page.getAttribute('#rr-panel button[data-act="year-end"]', "aria-expanded"), "true", "scrolling the list does not close it");
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.textContent), String(years[years.length - 1]));
    await page.keyboard.press("Escape");
    assert.equal(await page.getAttribute('#rr-panel button[data-act="year-end"]', "aria-expanded"), "false");
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.dataset.act), "year-end");
    ok("year filter and 'only highlighted' hide the right rows; the year list works from the keyboard");

    // -- 10. the owner's name is marked by default, with the role in a tooltip; switching it off keeps the tooltip on the line
    assert.ok((await page.locator(".rr-name").count()) > 0, "the owner's name is marked by default");
    const textBefore = await page.locator("#gsc_a_b tr.gsc_a_tr").first().locator(".gs_gray").first().textContent();
    assert.equal(textBefore, profile.rows[0].authors, "marking a name must not change the text");
    assert.match(await page.locator(".rr-name").first().getAttribute("title"), /author · position \d+ of \d+/);
    await setPref(opts, "markName", false);
    await eventually(page, () => document.querySelectorAll(".rr-name").length === 0);
    assert.ok((await page.locator('tr[class*="rr-r-"] .gs_gray[title]').count()) > 0, "the role tooltip stays on the author line");
    await setPref(opts, "markName", true);
    await eventually(page, () => document.querySelectorAll(".rr-name").length > 0);
    ok("the owner's name is marked by default (text untouched, role in the tooltip) and its switch on the settings page undoes it cleanly");

    // -- 10b. a paper link that leaves the page's own origin is never read (cookies go only to Scholar's origin)
    {
      const off = await context.newPage();
      let attempted = 0;
      context.on("request", (r) => { if (/other-origin\.invalid/.test(r.url())) attempted++; });
      // (the links are rewritten as the page is parsed, before the extension reads them)
      await off.addInitScript(() => document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("#gsc_a_b a.gsc_a_at").forEach((a) => { a.setAttribute("href", "http://other-origin.invalid/citations?view_op=view_citation&citation_for_view=x"); })));
      await off.goto(fx.url);
      await off.waitForSelector('[data-act="resolve"]');
      await off.bringToFront();
      await off.click('[data-act="resolve"]');
      await off.waitForTimeout(2500);
      assert.equal(fx.detailRequests(), 0, "no paper page was requested for an off-origin link");
      assert.equal(attempted, 0, "no request was even attempted to the other origin");
      assert.equal(await off.locator('[data-act="resolve"]').count(), 1, "the hidden rows stay hidden: nothing was read");
      await off.close();
      ok("a paper link that is not on the page's own origin is refused: no request is made and no cookies are sent");
    }

    // -- 11. resolve hidden roles from each paper's own page
    const hiddenBefore = (await readMatrix(page)).hidden;
    assert.equal(hiddenBefore, 28);
    await page.bringToFront();                                       // (a background tab's timers are slowed to one a second)
    await page.click('[data-act="resolve"]');
    await page.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 20000 });
    const resolvedExpect = matrixOf(expected(profile, { resolveHidden: true }));
    assert.deepEqual(await readMatrix(page), resolvedExpect);
    assert.equal(fx.detailRequests(), 28);
    ok("'Resolve' reads 28 paper pages; the hidden senior-author rows become 'last'");
    console.log("      matrix after resolve:", JSON.stringify(resolvedExpect));
    assert.ok((await page.locator('.gs_gray[title*="paper\'s page"]').count()) > 0, "roles read from a paper's own page say so in a tooltip");

    // -- 11b. Semantic Scholar: with the setting on, cut-off author lists come from its API (title only), and Scholar's own pages are not read
    {
      const fxS = await start({ slug: "ion-stoica", pageSize: 20 });
      const ctxS = await launch();
      try {
        const asked = [];
        await ctxS.route("https://api.semanticscholar.org/**", async (route) => {
          const q = new URL(route.request().url()).searchParams;
          asked.push(route.request().url());
          assert.ok(!(route.request().headers()["cookie"]), "no cookies go to Semantic Scholar");
          const r = fxS.profile.rows.find((x) => x.title.trim() === q.get("query"));
          if (r && asked.length === 1) {                                  // one answer that is another paper's author list: it must not be used
            return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ data: [{ title: r.title, authors: [{ name: "Zed Nobody" }] }] }) });
          }
          const visible = r ? r.authors.split(/,\s*/).filter((t) => t && !/\.\.\.|…/.test(t)) : [];
          await route.fulfill({ status: r ? 200 : 404, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify(r ? { data: [{ title: r.title, venue: "", authors: [...visible, fxS.profile.owner].map((name) => ({ name })) }] } : { error: "Title match not found" }) });
        });
        const optsS = await openOptions(ctxS);
        await setPref(optsS, "semanticScholar", true);
        const pg = await ctxS.newPage();
        await pg.goto(fxS.url);
        await pg.waitForSelector("#rr-panel");
        await pg.bringToFront();
        await pg.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100, null, { timeout: 30000 });
        await pg.waitForSelector('[data-act="resolve"]');
        await pg.click('[data-act="resolve"]');
        await pg.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 30000 });
        assert.deepEqual(await readMatrix(pg), resolvedExpect, "the same roles as when Scholar's own pages are read");
        assert.equal(fxS.detailRequests(), 1, "only the paper whose Semantic Scholar answer did not fit (another first author) was read from Scholar's own page");
        assert.equal(asked.length, 28);
        assert.ok(asked.every((u) => u.startsWith("https://api.semanticscholar.org/graph/v1/paper/search/match?") && !/user=|TEST/.test(u)), "only the title is sent");
        ok("Semantic Scholar: cut-off author lists completed from its API (title only); an answer whose first author is not the row's is refused and that paper is read from Scholar instead");
      } finally { await ctxS.close(); await fxS.close(); }
    }

    // -- 12. clipboard
    await page.click('[data-act="copy-text"]');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /^Ion Stoica — 100 papers on Google Scholar, by authorship role and CCF rank/);
    assert.match(clip, /Last author: \d+ \(/);
    assert.match(clip, /CCF 2026 \(7th edition\)/);
    await page.click('[data-act="copy-tsv"]');
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(tsv.split("\n")[0], /^Role\tA\tB\tC\tNot ranked\tTotal$/);
    ok("Copy summary / Copy as table put the expected text on the clipboard");
    // "Copy papers": the papers shown now, one line each
    await page.click('[data-act="copy-papers"]');
    const paperRows = (await page.evaluate(() => navigator.clipboard.readText())).split("\n").map((l) => l.split("\t"));
    assert.deepEqual(paperRows[0], ["Year", "Title", "Authors", "Role", "Venue", "CCF", "CORE", "Awards & talks", "Citations"]);
    assert.equal(paperRows.length, 1 + 100, "the header and the hundred papers loaded");
    const exp = expected(profile);
    assert.equal(paperRows[1][1], profile.rows[0].title);
    assert.equal(paperRows[1][8], String(profile.rows[0].cites));
    assert.equal(paperRows[1][5], exp[0].venue.ccf ? exp[0].venue.ccf.tier : "");
    assert.ok(paperRows.slice(1).every((r) => r.length === 9));
    await page.check('input[data-act="only"]');
    await page.click('[data-act="copy-papers"]');
    const onlyRows = (await page.evaluate(() => navigator.clipboard.readText())).split("\n");
    assert.equal(onlyRows.length, 1 + (await visibleRows(page)), "the filters count");
    assert.ok(onlyRows.length < paperRows.length);
    await page.uncheck('input[data-act="only"]');
    ok("Copy papers puts the papers shown (the filters count) on the clipboard, one line each, with role, ranks, awards and citations");

    // -- 13. collapse persists
    await page.click('[data-act="collapse"]');
    assert.ok(await page.evaluate(() => document.getElementById("rr-panel").classList.contains("rr-collapsed")));
    await page.reload();
    await page.waitForSelector("#rr-panel");
    assert.ok(await page.evaluate(() => document.getElementById("rr-panel").classList.contains("rr-collapsed")), "collapsed state survives a reload");
    await page.click('[data-act="collapse"]');
    ok("collapsed state is stored in chrome.storage and restored");

    await page.bringToFront();
    await page.screenshot({ path: path.join(outDir, "wide.png") });

    // -- 14. narrow window: the panel moves above the list
    await page.setViewportSize({ width: 840, height: 900 });
    await page.waitForFunction(() => document.getElementById("rr-panel").classList.contains("rr-wide"));
    const narrow = await page.evaluate(() => { const p = document.getElementById("rr-panel"); return p.nextElementSibling && p.nextElementSibling.id; });
    assert.equal(narrow, "gsc_a_tw");
    await page.screenshot({ path: path.join(outDir, "narrow.png") });
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.waitForFunction(() => !document.getElementById("rr-panel").classList.contains("rr-wide"));
    ok("narrow window moves the panel above the paper list (two-column layout), wide window moves it back");

    // -- 15. popup shows the same summary for the profile tab
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
    await popup.waitForSelector("#main");
    assert.match(await popup.textContent("#main"), /Open a Google Scholar author profile/);
    const tabId = await popup.evaluate(async () => {
      for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
      return null;
    });
    assert.ok(tabId != null, "a profile tab answers the popup's message");
    await popup.goto(`chrome-extension://${extId}/popup/popup.html?tab=${tabId}`);
    await popup.waitForSelector(".who");
    assert.match(await popup.textContent(".who"), /Ion Stoica/);
    assert.doesNotMatch(await popup.textContent("#main"), /\bnull\b|undefined/, "no stray null / undefined in the popup");
    const popupMatrix = await popup.evaluate(() => Array.from(document.querySelectorAll("tbody tr")).map((tr) => tr.lastElementChild.textContent));
    assert.ok(popupMatrix.length >= 3);
    await popup.screenshot({ path: path.join(outDir, "popup.png") });
    await popup.emulateMedia({ colorScheme: "dark" });
    await popup.waitForTimeout(400);                                 // (the buttons ease their colours over .15 s)
    // readable in the dark popup: every button's text against its own background is at least 4.5 : 1
    const popupLow = await popup.evaluate(() => {
      const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bad = [];
      for (const b of document.querySelectorAll("button, a.btn")) {
        if (!b.offsetParent || !b.textContent.trim()) continue;
        const cs = getComputedStyle(b);
        if (/rgba\(.*, 0\)|transparent/.test(cs.backgroundColor)) continue;
        const l1 = lum(rgb(cs.color)), l2 = lum(rgb(cs.backgroundColor)), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
        if ((hi + 0.05) / (lo + 0.05) < 4.5) bad.push(b.textContent.trim().slice(0, 20));
      }
      return bad;
    });
    assert.deepEqual(popupLow, [], "a popup button is unreadable in dark mode");
    await popup.screenshot({ path: path.join(outDir, "popup-dark.png") });
    await popup.emulateMedia({ colorScheme: "light" });
    await popup.close();
    ok("toolbar popup renders the active profile's summary (and a hint on other pages)");

    // -- 16. i18n substitutions resolved (no raw $N1$ placeholders anywhere)
    const body = await page.evaluate(() => document.getElementById("rr-panel").textContent);
    assert.ok(!/\$N\d\$|\$\d/.test(body), "placeholders substituted");
    assert.match(body, /20 papers loaded/);   // (the page was reloaded in step 13)
    ok("chrome.i18n placeholders are substituted");

    // -- S1. no preference switches are left on the page itself
    for (const sel of ['input[data-role]', 'input[data-badge]', 'input[data-act="mark-name"]']) assert.equal(await page.locator(`#rr-panel ${sel}`).count(), 0, sel);
    ok("the panel keeps no preference switches (those live on the settings page)");

    // -- S2. rank switches: CORE off → no CORE chips and no tab; both off → roles only
    const rows20 = expected(first20, { resolveHidden: true });   // (step 11's Resolve is cached, so the reload keeps it)
    await setPref(opts, "ranks.core", false);
    await eventually(page, () => !document.querySelector('.rr-chip[data-kind="core"]'));
    assert.equal(await page.locator("#rr-panel button[data-src]").count(), 0);
    assert.equal((await page.textContent("#rr-panel .rr-src")).trim(), "CCF");
    assert.deepEqual(await readMatrix(page), matrixOf(rows20, "ccf"));
    await setPref(opts, "ranks.ccf", false);
    await eventually(page, () => !document.querySelector('.rr-chip[data-kind="ccf"]'));
    assert.equal(await page.locator("#rr-panel button.rr-cell").count(), 0, "no tier columns when both lists are off");
    assert.deepEqual(await readMatrix(page), matrixOf(rows20, null));
    assert.doesNotMatch(await page.textContent("#rr-panel"), /\bnull\b|undefined/, "no stray null / undefined in the panel");
    await page.click('[data-act="copy-text"]');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^Ion Stoica — 20 papers on Google Scholar, by authorship role\n/);
    await setPref(opts, "ranks.ccf", true);
    await setPref(opts, "ranks.core", true);
    await eventually(page, () => document.querySelector('.rr-chip[data-kind="core"]') && document.querySelector("#rr-panel button[data-src]"));
    ok("CORE off: no CORE chips or tab, table by CCF; both off: roles only, copy text says so; back on restores both");

    // -- S3. panel switches: filters, citation totals, the panel itself
    await page.check('input[data-act="only"]');
    const highlighted20 = rows20.filter((p) => p.highlighted).length;
    assert.ok(highlighted20 < 20 && highlighted20 > 0);
    assert.equal(await visibleRows(page), highlighted20, "the filter is active");
    await setPref(opts, "panel.filters", false);
    await eventually(page, () => document.querySelector('[data-rr="filters"]').hidden);
    assert.equal(await visibleRows(page), 20, "a filter whose control is gone no longer hides rows");
    await setPref(opts, "panel.metrics", false);
    await eventually(page, () => document.querySelector('[data-rr="metrics"]').hidden);
    await setPref(opts, "panel.show", false);
    await eventually(page, () => document.getElementById("rr-panel").hidden);
    assert.ok((await page.locator("tr.rr-r-last").count()) > 0, "rows stay decorated with the panel off");
    assert.ok(await opts.locator('input[data-pref="panel.filters"]').isDisabled(), "the panel's sub-switches are greyed out while it is off");
    for (const key of ["panel.show", "panel.filters", "panel.metrics"]) await setPref(opts, key, true);
    await eventually(page, () => !document.getElementById("rr-panel").hidden && !document.querySelector('[data-rr="filters"]').hidden && !document.querySelector('[data-rr="metrics"]').hidden);
    ok("panel switches hide the filters, the citation totals and the whole panel; a hidden filter stops filtering");

    // -- S3b. with every role switched off nothing is highlighted: "Only highlighted" goes away instead of hiding every row
    await page.check('input[data-act="only"]');
    for (const role of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + role, false);
    await eventually(page, () => document.querySelectorAll("tr[class*='rr-r-']").length === 0 && document.querySelector('[data-act="only"]').closest(".rr-row").hidden);
    assert.equal(await visibleRows(page), 20, "no role highlighted: no row is hidden by the 'only highlighted' filter");
    for (const role of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + role, true);
    await eventually(page, () => document.querySelectorAll("tr[class*='rr-r-']").length > 0 && !document.querySelector('[data-act="only"]').closest(".rr-row").hidden);
    assert.equal(await page.isChecked('input[data-act="only"]'), false);
    ok("every role switched off: the 'Only highlighted' filter is cleared and hidden");

    // -- S4. the toolbar popup follows the settings
    await setPref(opts, "ranks.ccf", false);
    await eventually(page, () => !document.querySelector('.rr-chip[data-kind="ccf"]'));
    const pop = await context.newPage();
    await pop.goto(`chrome-extension://${extId}/popup/popup.html`);
    const profileTab = await pop.evaluate(async () => {
      for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
      return null;
    });
    await pop.goto(`chrome-extension://${extId}/popup/popup.html?tab=${profileTab}`);
    await pop.waitForSelector(".who");
    assert.equal(await pop.locator(".seg").count(), 0);
    assert.equal((await pop.textContent(".src")).trim(), "CORE");
    assert.equal(await pop.locator("table").count(), 1);
    await pop.close();
    // the table's switch applies to the popup too: no table, no Copy buttons, no data note; the name and paper count stay
    await setPref(opts, "panel.summary", false);
    await eventually(page, () => document.querySelector('[data-rr="matrix"]').closest(".rr-sec").hidden);
    const pop2 = await context.newPage();
    await pop2.goto(`chrome-extension://${extId}/popup/popup.html?tab=${profileTab}`);
    await pop2.waitForSelector(".who");
    assert.equal(await pop2.locator("table, .actions, .note, .seg").count(), 0);
    await pop2.close();
    await setPref(opts, "panel.summary", true);
    await setPref(opts, "ranks.ccf", true);
    await eventually(page, () => document.querySelector('.rr-chip[data-kind="ccf"]') && document.querySelector('[data-rr="matrix"] table'));
    ok("the popup shows only the rank lists that are switched on, and follows the table's switch");

    // -- S5. the page writes view state, the settings page writes preferences: neither overwrites the other
    await setPref(opts, "roles.last", false);
    await eventually(page, () => document.querySelectorAll("tr.rr-r-last").length === 0);
    await page.click('[data-act="collapse"]');
    await page.click('[data-act="collapse"]');
    await page.click('button[data-src="core"]');
    assert.equal((await stored(opts, "sync", "prefs")).roles.last, false, "collapsing or switching the table never rewrites the preferences");
    assert.deepEqual(await stored(opts, "local", "ui"), { collapsed: false, source: "core" });
    await page.click('button[data-src="ccf"]');
    await setPref(opts, "roles.last", true);
    await eventually(page, () => document.querySelectorAll("tr.rr-r-last").length > 0);
    ok("view state (collapsed, ranking tab) and preferences are stored separately");

    // -- S6. the pre-2.2 combined settings are split once and removed
    await opts.evaluate(async () => {
      await chrome.storage.sync.remove("prefs");
      await chrome.storage.local.remove("ui");
      await chrome.storage.sync.set({ settings: { v: 2, roles: { first: true, cofirst: true, second: true, last: false }, badges: { ccf: true, core: false, marks: true }, markName: false, matrixSource: "core", collapsed: true } });
    });
    await page.reload();
    await page.waitForSelector("#rr-panel");
    assert.equal(await page.locator("tr.rr-r-last").count(), 0);
    assert.equal(await page.locator('.rr-chip[data-kind="core"]').count(), 0);
    assert.equal(await page.locator(".rr-name").count(), 0);
    assert.ok(await page.evaluate(() => document.getElementById("rr-panel").classList.contains("rr-collapsed")));
    const migrated = await stored(opts, "sync", "prefs");
    assert.equal(migrated.roles.last, false);
    assert.equal(migrated.ranks.core, false);
    assert.equal(migrated.markName, false);
    assert.equal(await stored(opts, "sync", "settings"), undefined, "the old record is removed");
    assert.deepEqual(await stored(opts, "local", "ui"), { collapsed: true, source: "core" });
    ok("settings from the previous version carry over (roles, rank lists, collapsed) and the old record is removed");

    // -- S7. the settings page: preview, reset, clearing the saved paper details
    await opts.reload();
    await opts.waitForSelector('input[data-pref="roles.last"]');
    assert.equal(await opts.locator("#preview tr").count(), 4);
    assert.equal(await opts.locator("#preview tr.rr-r-last").count(), 0, "the preview reflects the migrated 'last' switch");
    assert.equal(await opts.locator('#preview .rr-chip[data-kind="core"]').count(), 0);
    assert.equal(await opts.locator("#preview .rr-name").count(), 0);
    await opts.click('[data-act="reset"]');
    await opts.click('[data-act="reset-cancel"]');                        // (it asks on the page: "No" leaves the settings alone)
    assert.equal(await opts.locator('[data-act="reset"]').count(), 1);
    await opts.click('[data-act="reset"]');
    await opts.click('[data-act="reset-confirm"]');
    await eventually(opts, () => document.querySelectorAll("#preview tr.rr-r-last").length === 1);
    assert.deepEqual(await stored(opts, "sync", "prefs"), prefsLib.defaults());
    assert.equal(await opts.locator("#preview tr[class*='rr-r-']").count(), 4);
    assert.equal(await opts.locator("#preview .rr-name").count(), 4);
    assert.ok((await opts.locator("#preview .rr-chip-mark").count()) >= 4);
    await setPref(opts, "marks.award", false);
    assert.equal(await opts.locator("#preview .rr-chip-mark-award").count(), 0);
    await setPref(opts, "marks.award", true);
    // the preview holds the real panel, and each of its parts has its own switch
    assert.equal(await opts.locator('#pv-panel #rr-panel [data-rr="matrix"] table').count(), 1);
    for (const [part, sel] of [["summary", '[data-rr="matrix"]'], ["marks", '[data-rr="marks"]'], ["filters", '[data-rr="filters"]'], ["metrics", '[data-rr="metrics"]'], ["status", '[data-rr="coverage"] [data-act="load-all"]'], ["names", '[data-rr="variants"]']]) {
      assert.equal(await opts.locator("#pv-panel " + sel).first().isVisible(), true, `${part} shows by default`);
      await setPref(opts, "panel." + part, false);
      assert.equal(await opts.locator("#pv-panel " + sel).first().isVisible(), false, `${part} switch hides it in the preview`);
      for (const other of ["summary", "marks", "filters", "metrics"]) if (other !== part) assert.equal(await opts.locator(`#pv-panel [data-rr="${other === "summary" ? "matrix" : other}"]`).first().isVisible(), true, `${other} stays when ${part} goes`);
      await setPref(opts, "panel." + part, true);
    }
    // the two shortcuts: compact (filters and citation totals only) and everything
    await opts.click('[data-act="panel-compact"]');
    assert.deepEqual((await stored(opts, "sync", "prefs")).panel, { show: true, summary: false, marks: false, filters: true, metrics: true, years: false, venues: false, status: false, names: false });
    assert.equal(await opts.locator('#pv-panel [data-rr="matrix"]').first().isVisible(), false);
    assert.equal(await opts.locator('#pv-panel [data-rr="metrics"]').first().isVisible(), true);
    await opts.click('[data-act="panel-full"]');
    assert.deepEqual((await stored(opts, "sync", "prefs")).panel, Object.fromEntries(prefsLib.PANEL_PARTS.map((k) => [k, true])));
    await setPref(opts, "panel.show", false);
    assert.equal(await opts.locator("#pv-panel").isVisible(), false, "no panel in the preview when the panel is off");
    await setPref(opts, "panel.show", true);
    assert.ok((await stored(opts, "local", "resolved")) !== undefined, "'Resolve' left a cache of paper details");
    await opts.reload();
    await opts.waitForSelector('[data-act="clear-cache"]');
    assert.match(await opts.textContent(".row .note"), /^\d+ papers' author lists are saved/);
    await opts.click('[data-act="clear-cache"]');
    await eventually(opts, () => /^No paper details are saved/.test(document.querySelector(".row .note").textContent));
    assert.equal(await stored(opts, "local", "resolved"), undefined);
    // (the button says "Cleared" for a moment; no waitForFunction here — polling one evaluates a string, which an extension page's CSP refuses)
    await opts.bringToFront();
    for (let i = 0; i < 50 && (await opts.textContent('[data-act="clear-cache"]')) === "Cleared"; i++) await opts.waitForTimeout(100);
    await opts.evaluate(() => window.scrollTo(0, 0));
    await opts.screenshot({ path: path.join(outDir, "settings.png"), fullPage: true });
    assert.deepEqual(await lowContrast(opts, "body"), [], "settings page (light): text under 4.5:1");
    assert.deepEqual(await unnamed(opts, "body"), [], "settings page: a control without an accessible name");
    await opts.emulateMedia({ colorScheme: "dark" });
    await opts.waitForTimeout(400);
    assert.deepEqual(await lowContrast(opts, "body"), [], "settings page (dark): text under 4.5:1");
    await opts.screenshot({ path: path.join(outDir, "settings-dark.png"), fullPage: true });
    await opts.emulateMedia({ colorScheme: "light" });
    ok("settings page: the preview follows the switches, Reset restores the defaults, saved paper details can be cleared");

    // -- S8. the panel's settings button opens the settings page
    await opts.close();
    const [opened] = await Promise.all([context.waitForEvent("page"), page.click('[data-act="settings"]')]);
    await opened.waitForLoadState();
    assert.equal(opened.url(), optionsUrl);
    ok("the settings button in the panel opens the settings page");

    assert.deepEqual(errors, [], "no console or page errors:\n" + errors.join("\n"));
    ok("no console errors");
  } finally {
    await context.close();
    await fx.close();
  }

  // -- 17. a profile whose header name cannot be read in any other order: the owner adds a spelling by hand
  const fx2 = await start({ slug: "ion-stoica", pageSize: 100, header: "Stoica-Ion", hl: "zh-CN" });
  const ctx2 = await launch();
  try {
    const page = await ctx2.newPage();
    await page.goto(fx2.url);
    await page.waitForSelector("#rr-panel");
    const absentBefore = await page.locator('[data-rr="absent"]').count();
    assert.equal(absentBefore, 1, "the panel reports papers where the name was not found");
    assert.equal(await page.locator(".rr-variant-auto").count(), 0, "nothing is guessed for a name that has no other order");
    await page.click('[data-rr="variants"] summary');
    await page.fill('input[data-act="variant-input"]', "Ion Stoica");
    await page.press('input[data-act="variant-input"]', "Enter");
    await page.waitForFunction(() => !document.querySelector('[data-rr="absent"]') || /^\d+ papers where/.test(document.querySelector('[data-rr="absent"]').textContent));
    const m = await readMatrix(page);
    const want = matrixOf(expected({ owner: "Ion Stoica", rows: fx2.profile.rows }));
    assert.deepEqual(m, want);
    ok("adding a name variant re-matches every paper");
    // the variant is remembered for this profile after a reload
    await page.reload();
    await page.waitForSelector("#rr-panel");
    assert.deepEqual(await readMatrix(page), want);
    ok("name variants persist per profile");
    // this profile is served with a Chinese interface (hl=zh-CN): detail-page labels are localised unless hl=en is requested
    await page.click('[data-act="resolve"]');
    await page.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 20000 });
    assert.equal(fx2.detailRequests(), 28);
    assert.deepEqual([...new Set(fx2.detailHls())], ["en"], "every detail request asks for English labels");
    assert.deepEqual(await readMatrix(page), matrixOf(expected({ owner: "Ion Stoica", rows: fx2.profile.rows }, { resolveHidden: true })));
    ok("Resolve works on a profile with a non-English Scholar interface (requests hl=en)");
  } finally {
    await ctx2.close();
    await fx2.close();
  }

  // -- 21. award and talk markers the authors wrote (synthetic profile; look-alikes must stay unmarked)
  const fx3 = await start({ slug: "marks-demo", pageSize: 100 });
  const ctx3 = await launch();
  try {
    const page = await ctx3.newPage();
    await page.goto(fx3.url);
    await page.waitForSelector("#rr-panel");
    const chipKinds = await page.evaluate(() => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).map((tr) => Array.from(tr.querySelectorAll(".rr-chip-mark")).map((c) => c.dataset.mark).join("+")));
    assert.deepEqual(chipKinds, ["spotlight", "oral", "best", "outstanding", "", "", "finalist", "oral", "best", "runner-up"]);
    const pill = (g) => page.locator(`#rr-panel button[data-mark-group="${g}"]`);
    assert.match(await pill("award").textContent(), /Awards\s*4/);
    assert.match(await pill("award").getAttribute("title"), /^Best paper \d+/, "the Awards count says what it is made of, on hover");
    assert.equal(await pill("oral").getAttribute("title"), null, "talk levels have no breakdown");
    assert.match(await pill("oral").textContent(), /Oral\s*2/);
    assert.match(await pill("spotlight").textContent(), /Spotlight\s*1/);
    assert.equal(await pill("highlight").count(), 0, "no pill for a group nobody has");
    const tip = await page.locator('.rr-chip-mark[data-mark="oral"]').first().getAttribute("title");
    assert.match(tip, /Written by the author \(not checked\): “Oral”/);
    const tipOf = (row) => page.locator(`#gsc_a_b tr.gsc_a_tr:nth-child(${row}) .rr-chip-mark`).first().getAttribute("title");
    assert.match(await tipOf(9), /On the award list: Best Paper Award — ICLR 2023/);
    assert.doesNotMatch(await tipOf(9), /Written by the author/);
    const both = await tipOf(3);
    assert.match(both, /On the award list: Best Paper Award — CVPR 2016/);
    assert.match(both, /Written by the author \(not checked\): “Best Paper Award”/);
    ok("chips and pills show what the authors wrote and what the award list says; Oral Oncology / Spotlight on … stay unmarked, a finalist is a chip but not an award");
    await pill("award").click();
    assert.equal(await visibleRows(page), 4);
    await pill("award").click();
    assert.equal(await visibleRows(page), 10);
    ok("a pill lists exactly those papers, and clicking again clears it");
    await page.click('[data-act="copy-text"]');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /Awards & talks: Awards 4, Oral 2, Spotlight 1 \(from the authors' own words or the award list\)/);
    ok("Copy summary includes the awards and talks line");
    await page.screenshot({ path: path.join(outDir, "marks.png") });
    // each group has its own switch on the settings page; a finalist follows the awards
    const optsM = await openOptions(ctx3);
    await pill("award").click();
    assert.equal(await visibleRows(page), 4);
    await setPref(optsM, "marks.award", false);
    await eventually(page, () => document.querySelectorAll('.rr-chip-mark[data-group="award"], .rr-chip-mark[data-group="finalist"]').length === 0);
    assert.equal(await visibleRows(page), 10, "switching a group off also ends a filter on it");
    assert.equal(await page.locator('#rr-panel .rr-markrow[data-mark-group="award"]').count(), 0);
    assert.equal(await page.locator('#rr-panel .rr-markrow[data-mark-group="oral"]').count(), 1);
    assert.ok((await page.locator('.rr-chip-mark[data-group="oral"]').count()) > 0, "talk levels keep their own switch");
    await page.click('[data-act="copy-text"]');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^Awards & talks: Oral 2, Spotlight 1 /m);
    for (const g of ["oral", "spotlight"]) await setPref(optsM, "marks." + g, false);
    await eventually(page, () => document.querySelectorAll(".rr-chip-mark").length === 0 && document.querySelectorAll("#rr-panel .rr-markrow").length === 0);
    assert.equal(await page.locator('[data-rr="marks"]').isHidden(), true, "no Awards & talks section when every group is off");
    for (const g of ["award", "oral", "spotlight"]) await setPref(optsM, "marks." + g, true);
    await eventually(page, () => document.querySelectorAll(".rr-chip-mark").length > 0 && document.querySelectorAll("#rr-panel .rr-markrow").length === 3);
    ok("each Awards & talks group has its own switch on the settings page: chips, panel rows, counts and an active filter follow");

    // each part of the panel has its own switch: the role × rank table can go while the filters and totals stay
    await setPref(optsM, "panel.summary", false);
    await eventually(page, () => document.querySelector('[data-rr="matrix"]').closest(".rr-sec").hidden);
    assert.equal(await page.locator('[data-rr="matrix"] table').isVisible(), false);
    assert.equal(await page.locator('[data-act="copy-text"]').isVisible(), false, "the Copy buttons belong to the table");
    for (const part of ["filters", "metrics", "coverage"]) assert.equal(await page.locator(`[data-rr="${part}"]`).isVisible(), true, `${part} stays`);
    assert.equal(await page.locator('[data-rr="marks"]').isVisible(), true, "the awards and talks counts stay");
    await setPref(optsM, "panel.status", false);
    await setPref(optsM, "panel.names", false);
    await eventually(page, () => document.querySelector('[data-rr="coverage"]').hidden && document.querySelector('[data-rr="variants"]').hidden);
    await setPref(optsM, "panel.summary", true); await setPref(optsM, "panel.status", true); await setPref(optsM, "panel.names", true);
    await eventually(page, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1 && !document.querySelector('[data-rr="coverage"]').hidden);
    ok("each part of the panel has its own switch: the role × rank table, the loaded-papers status and the name help can go, the rest stays");
  } finally {
    await ctx3.close();
    await fx3.close();
  }

  // -- 25. the fictional showcase profile (the README screenshot): renders cleanly, with a list-derived award
  const fx4 = await start({ slug: "showcase", pageSize: 100 });
  const ctx4 = await launch();
  try {
    const page = await ctx4.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(fx4.url);
    await page.waitForSelector("#rr-panel");
    assert.equal(await page.locator('.rr-chip-mark[data-group="award"][data-source="list"]').count(), 1);
    assert.deepEqual(errs, []);
    // a button label is never cut off, in the sidebar and in the wide panel
    const cut = () => page.evaluate(() => [...document.querySelectorAll("#rr-panel .rr-btn")].filter((b) => b.offsetParent && b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim()));
    assert.deepEqual(await cut(), [], "a panel button label is cut off in the sidebar");
    await page.screenshot({ path: path.join(outDir, "showcase.png") });
    assert.deepEqual(await lowContrast(page, "#rr-panel"), [], "panel (light): text under 4.5:1");
    assert.deepEqual(await unnamed(page, "#rr-panel"), [], "panel: a control without an accessible name");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(400);
    assert.deepEqual(await lowContrast(page, "#rr-panel"), [], "panel (dark): text under 4.5:1");
    await page.screenshot({ path: path.join(outDir, "showcase-dark.png") });
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width: 760, height: 900 });
    await page.waitForFunction(() => document.getElementById("rr-panel").classList.contains("rr-wide"));
    assert.deepEqual(await cut(), [], "a panel button label is cut off in the wide panel");
    await page.screenshot({ path: path.join(outDir, "showcase-narrow.png") });
    ok("the fictional showcase profile renders (wide and narrow) with an award from the list");
  } finally {
    await ctx4.close();
    await fx4.close();
  }

  // -- 26. a very large profile (1,000 papers), settings untouched: the whole list loads by itself, neither janking the page nor dropping rows
  const fx5 = await start({ slug: "ion-stoica", pageSize: 100, repeat: 10 });
  const ctx5 = await launch();
  try {
    const page = await ctx5.newPage();
    await page.addInitScript(() => {
      window.__long = [];
      try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ["longtask"] }); } catch (e) { /* unsupported */ }
    });
    const t0 = Date.now();
    await page.goto(fx5.url);
    await page.waitForSelector("#rr-panel");
    const firstPaint = Date.now() - t0;
    await page.waitForFunction(() => /^Loading… \d/.test((document.querySelector('[data-rr="coverage"]') || {}).textContent || ""), null, { timeout: 10000 });
    assert.equal(await page.locator('[data-act="load-all"]').count(), 0, "no button to press: it is already loading");
    await page.waitForFunction(() => /^1,?000 papers loaded/.test((document.querySelector('[data-rr="coverage"]') || {}).textContent || ""), null, { timeout: 90000 });
    const total = Date.now() - t0;
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr").count(), 1000);
    assert.equal(await page.locator('[data-act="load-all"]').count(), 0);
    assert.equal(await page.locator('[data-rr="load-msg"]').count(), 0, "nothing went wrong");
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr .rr-chips").count() > 400, true, "rows are decorated");
    const long = await page.evaluate(() => window.__long);
    const worst = Math.max(0, ...long);
    assert.ok(firstPaint < 5000, `panel appeared after ${firstPaint} ms`);
    assert.ok(worst < 1000, `a ${worst} ms long task`);
    ok(`1,000 papers, no click: the list loads by itself (the default); panel in ${firstPaint} ms, everything loaded in ${(total / 1000).toFixed(1)} s, longest main-thread task ${worst} ms`);
  } finally {
    await ctx5.close();
  }

  // -- 26b–26d. the setting: Cancel stops it for good; off means the panel offers 'Load all'; switching it on loads, switching it off stops
  const ctx5b = await launch();
  try {
    const page = await ctx5b.newPage();
    const rowsNow = () => page.locator("#gsc_a_b tr.gsc_a_tr").count();
    await page.goto(fx5.url);
    await page.waitForSelector("#rr-panel");
    await page.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length > 100, null, { timeout: 15000 });
    await page.click('#rr-panel button:has-text("Cancel")');
    await page.waitForSelector('[data-act="load-all"]');
    const atCancel = await rowsNow();
    await page.waitForTimeout(3500);
    assert.equal(await rowsNow(), atCancel, "Cancel stops it, and it does not start again by itself");
    assert.ok(atCancel > 100 && atCancel < 1000, `${atCancel} rows when cancelled`);
    ok("Cancel stops the automatic loading, and 'Load all' is offered again");

    const opts = await openOptions(ctx5b);
    await setPref(opts, "autoLoad", false);
    const off = await ctx5b.newPage();
    await off.goto(fx5.url);
    await off.waitForSelector("#rr-panel");
    await off.waitForTimeout(3500);
    assert.equal(await off.locator("#gsc_a_b tr.gsc_a_tr").count(), 100, "with the setting off the list stays at Scholar's first page");
    assert.equal(await off.locator('[data-act="load-all"]').count(), 1);
    ok("setting off: the list stays at Scholar's first 100 papers and the panel offers 'Load all'");

    await setPref(opts, "autoLoad", true);
    // (a tab presses only while it is the one in front, and the browser sometimes takes a moment to hand the front to it: ask again if it has not started)
    for (let attempt = 0; attempt < 3; attempt++) {
      await off.bringToFront();
      try { await off.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length > 100, null, { timeout: 12000 }); break; } catch (e) { if (attempt === 2) throw e; }
    }
    await setPref(opts, "autoLoad", false);
    await off.bringToFront();
    await off.waitForFunction(() => !/^Loading/.test((document.querySelector('[data-rr="coverage"]') || {}).textContent || ""), null, { timeout: 15000 });
    const stopped = await off.locator("#gsc_a_b tr.gsc_a_tr").count();
    await off.waitForTimeout(3500);
    assert.equal(await off.locator("#gsc_a_b tr.gsc_a_tr").count(), stopped, "switching it off stops what it started");
    assert.ok(stopped > 100 && stopped < 1000);
    ok("switching the setting on loads the open profile's list, switching it off stops it");
  } finally {
    await ctx5b.close();
    await fx5.close();
  }

  // -- 26e. Scholar stops answering: it is not pressed again, and the panel says so
  const fxStall = await start({ slug: "ion-stoica", pageSize: 20, repeat: 10, stopAfter: 2 });
  const ctxStall = await launch();
  try {
    const page = await ctxStall.newPage();
    await page.goto(fxStall.url);
    await page.waitForSelector("#rr-panel");
    await page.waitForSelector('[data-rr="load-msg"]', { timeout: 40000 });
    assert.match(await page.locator('[data-rr="load-msg"]').textContent(), /^Scholar sent no more papers \(180 loaded\)/);
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr").count(), 180, "20 papers and two presses of 80");
    assert.equal(await page.locator('[data-act="load-all"]').count(), 1, "'Load all' is there to try again");
    ok("when Scholar stops answering the automatic loading gives up at once and says so");
  } finally {
    await ctxStall.close();
    await fxStall.close();
  }

  // -- 27. unrecognised venues can be copied and reported; a layout Scholar changed is called out, not ignored
  const fx6 = await start({ slug: "ion-stoica", pageSize: 100 });
  const ctx6 = await launch();
  try {
    const page = await ctx6.newPage();
    await page.goto(fx6.url);
    await page.waitForSelector("#rr-panel");
    assert.equal(await page.locator('[data-rr="layout-warning"]').count(), 0);
    await page.click('[data-rr="unmatched"] summary');
    await page.click('[data-act="copy-unmatched"]');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /^\d+× \S/m);
    const unmatched = metrics.unmatchedVenues(expected(fx6.profile));
    assert.equal(text, unmatched.map((u) => `${u.count}× ${u.venue}`).join("\n"));
    const href = await page.getAttribute('[data-act="report-unmatched"]', "href");
    assert.match(href, /^https:\/\/github\.com\/boyugou\/scholar-roles-and-ranks\/issues\/new\?title=Venue%20not%20recognised&body=/);
    assert.ok(decodeURIComponent(href).includes(unmatched[0].venue), "the report names an unrecognised venue");
    assert.ok(href.length < 4000);
    ok("unrecognised venues: Copy list matches the library, and the Report link carries them to the issue tracker");
  } finally {
    await ctx6.close();
    await fx6.close();
  }
  const fx7 = await start({ slug: "ion-stoica", pageSize: 100, brokenLayout: true });
  const ctx7 = await launch();
  try {
    const page = await ctx7.newPage();
    await page.goto(fx7.url);
    await page.waitForSelector("#rr-panel");
    const warn = page.locator('[data-rr="layout-warning"]');
    assert.equal(await warn.count(), 1);
    assert.match(await warn.textContent(), /layout seems to have changed/);
    assert.match(await warn.locator("a").getAttribute("href"), /issues\/new\?title=Scholar%20page%20layout%20changed/);
    ok("a page whose author lines cannot be read says so, with a way to report it");
  } finally {
    await ctx7.close();
    await fx7.close();
  }

  // -- 28. the profile name is written surname first ("Stoica Ion"): the other order is used at once, and says so
  const fx8 = await start({ slug: "ion-stoica", pageSize: 100, header: "Stoica Ion" });
  const ctx8 = await launch();
  try {
    const page = await ctx8.newPage();
    await page.goto(fx8.url);
    await page.waitForSelector("#rr-panel");
    assert.deepEqual(await readMatrix(page), matrixOf(expected({ owner: "Ion Stoica", rows: fx8.profile.rows })));
    const auto = page.locator(".rr-variant-auto");
    assert.equal(await auto.count(), 1);
    assert.equal((await auto.textContent()).trim(), "Ion Stoica");
    assert.match(await auto.getAttribute("title"), /^Added automatically: .* \d+ papers$/);
    assert.match(await page.locator('[data-rr="absent"]').textContent(), /^2 papers where/, "only the two papers that really lack the name are left");
    assert.equal(await page.locator('[data-rr="suggest"]').count(), 0);
    await page.click('[data-rr="variants"] summary');
    await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "panel-auto-spelling.png") });
    ok("a surname-first profile name is read the other way round at once, as an automatic spelling");
  } finally {
    await ctx8.close();
    await fx8.close();
  }

  // -- 29. 'SY Philip' is what Scholar prints for Philip S. Yu in six papers: offered, one click adds it
  const fx9 = await start({ slug: "philip-yu", pageSize: 100 });
  const ctx9 = await launch();
  try {
    const page = await ctx9.newPage();
    await page.goto(fx9.url);
    await page.waitForSelector("#rr-panel");
    assert.equal(await page.locator(".rr-variant-auto").count(), 0, "a name that mostly matches is left alone");
    const sugg = page.locator('[data-act="suggest-variant"]');
    assert.equal(await sugg.count(), 1);
    assert.equal((await sugg.textContent()).trim(), "SY Philip (6)");
    const absentWas = parseInt(await page.locator('[data-rr="absent"]').textContent(), 10);
    await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "panel-suggested-spelling.png") });
    await sugg.click();
    await page.waitForFunction((n) => parseInt((document.querySelector('[data-rr="absent"]') || { textContent: "0" }).textContent, 10) === n, absentWas - 6);
    assert.equal(await page.locator('[data-rr="suggest"]').count(), 0, "once added, it is no longer suggested");
    assert.deepEqual(await readMatrix(page), matrixOf(expected({ owner: "Philip S. Yu", rows: fx9.profile.rows }, { extraOwner: ["SY Philip"] })));
    await page.click('[data-rr="variants"] summary');
    assert.equal((await page.locator(".rr-variant:not(.rr-variant-auto)").textContent()).replace("×", "").trim(), "SY Philip");
    await page.reload();
    await page.waitForSelector("#rr-panel");
    assert.equal(await page.locator('[data-rr="suggest"]').count(), 0, "and it is remembered for this profile");
    ok("a rearranged spelling in the owner's own papers is offered, and one click adds it");
  } finally {
    await ctx9.close();
    await fx9.close();
  }

  console.log(`\nAll ${step} checks passed. Screenshots: ${outDir}`);
})().catch((e) => { console.error("\nE2E FAILED:", e && e.stack || e); process.exit(1); });
