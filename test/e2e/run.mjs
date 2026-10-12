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
    await page.selectOption('select[data-act="year-start"]', String(years[2]));
    const inRange = all.filter((p) => p.year >= years[2]).length;
    assert.equal(await visibleRows(page), inRange);
    await page.selectOption('select[data-act="year-start"]', "");
    await page.check('input[data-act="only"]');
    assert.equal(await visibleRows(page), all.filter((p) => p.highlighted).length);
    await page.uncheck('input[data-act="only"]');
    ok("year filter and 'only highlighted' hide the right rows");

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

    // -- 11. resolve hidden roles from each paper's own page
    const hiddenBefore = (await readMatrix(page)).hidden;
    assert.equal(hiddenBefore, 28);
    await page.click('[data-act="resolve"]');
    await page.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 20000 });
    const resolvedExpect = matrixOf(expected(profile, { resolveHidden: true }));
    assert.deepEqual(await readMatrix(page), resolvedExpect);
    assert.equal(fx.detailRequests(), 28);
    ok("'Resolve' reads 28 paper pages; the hidden senior-author rows become 'last'");
    console.log("      matrix after resolve:", JSON.stringify(resolvedExpect));
    assert.ok((await page.locator('.gs_gray[title*="paper\'s page"]').count()) > 0, "roles read from a paper's own page say so in a tooltip");

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
    await pop.close();
    await setPref(opts, "ranks.ccf", true);
    await eventually(page, () => document.querySelector('.rr-chip[data-kind="ccf"]'));
    ok("the popup shows only the rank lists that are switched on");

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
    opts.once("dialog", (d) => d.accept());
    await opts.click('[data-act="reset"]');
    await eventually(opts, () => document.querySelectorAll("#preview tr.rr-r-last").length === 1);
    assert.deepEqual(await stored(opts, "sync", "prefs"), prefsLib.defaults());
    assert.equal(await opts.locator("#preview tr[class*='rr-r-']").count(), 4);
    assert.equal(await opts.locator("#preview .rr-name").count(), 4);
    assert.ok((await opts.locator("#preview .rr-chip-mark").count()) >= 4);
    await setPref(opts, "marks.award", false);
    assert.equal(await opts.locator("#preview .rr-chip-mark-award").count(), 0);
    await setPref(opts, "marks.award", true);
    assert.ok((await stored(opts, "local", "resolved")) !== undefined, "'Resolve' left a cache of paper details");
    await opts.reload();
    await opts.waitForSelector('[data-act="clear-cache"]');
    assert.match(await opts.textContent(".row .note"), /^\d+ papers' author lists are saved/);
    await opts.click('[data-act="clear-cache"]');
    await eventually(opts, () => /^No paper details are saved/.test(document.querySelector(".row .note").textContent));
    assert.equal(await stored(opts, "local", "resolved"), undefined);
    await opts.bringToFront();
    await opts.evaluate(() => window.scrollTo(0, 0));
    await opts.screenshot({ path: path.join(outDir, "settings.png"), fullPage: true });
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

  // -- 17. a profile whose header name is spelled the other way round
  const fx2 = await start({ slug: "ion-stoica", pageSize: 100, header: "Stoica Ion", hl: "zh-CN" });
  const ctx2 = await launch();
  try {
    const page = await ctx2.newPage();
    await page.goto(fx2.url);
    await page.waitForSelector("#rr-panel");
    const absentBefore = await page.locator('[data-rr="absent"]').count();
    assert.equal(absentBefore, 1, "the panel reports papers where the name was not found");
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
    await page.screenshot({ path: path.join(outDir, "showcase.png") });
    await page.setViewportSize({ width: 760, height: 900 });
    await page.waitForFunction(() => document.getElementById("rr-panel").classList.contains("rr-wide"));
    await page.screenshot({ path: path.join(outDir, "showcase-narrow.png") });
    ok("the fictional showcase profile renders (wide and narrow) with an award from the list");
  } finally {
    await ctx4.close();
    await fx4.close();
  }

  // -- 26. a very large profile (1,000 papers): loading everything neither janks the page nor drops rows
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
    await page.click('[data-act="load-all"]');
    await page.waitForFunction(() => /^1,?000 papers loaded/.test((document.querySelector('[data-rr="coverage"]') || {}).textContent || ""), null, { timeout: 90000 });
    const total = Date.now() - t0;
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr").count(), 1000);
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr .rr-chips").count() > 400, true, "rows are decorated");
    const long = await page.evaluate(() => window.__long);
    const worst = Math.max(0, ...long);
    assert.ok(firstPaint < 5000, `panel appeared after ${firstPaint} ms`);
    assert.ok(worst < 1000, `a ${worst} ms long task`);
    ok(`1,000 papers: panel in ${firstPaint} ms, everything loaded in ${(total / 1000).toFixed(1)} s, longest main-thread task ${worst} ms`);
  } finally {
    await ctx5.close();
    await fx5.close();
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
    assert.match(href, /^https:\/\/github\.com\/boyugou\/scholar-author-roles-and-venue-ranks\/issues\/new\?title=Venue%20not%20recognised&body=/);
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

  console.log(`\nAll ${step} checks passed. Screenshots: ${outDir}`);
})().catch((e) => { console.error("\nE2E FAILED:", e && e.stack || e); process.exit(1); });
