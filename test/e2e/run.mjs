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
const venues = require(path.join(repo, "src/lib/venues.js"));
const metrics = require(path.join(repo, "src/lib/metrics.js"));
const analysis = require(path.join(repo, "src/lib/analysis.js"));
const prefsLib = require(path.join(repo, "src/lib/prefs.js"));
const paletteLib = require(path.join(repo, "src/lib/palette.js"));
const agentLib = require(path.join(repo, "src/lib/agent.js"));
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
manifest.content_scripts[1].matches = ["http://127.0.0.1/*"];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
// Give the test copy a small award list aimed at the synthetic "marks-demo" profile (the shipped list is
// checked by test/awards.test.js; these entries only exercise the page behaviour).
const awardsLib = require(path.join(repo, "src/lib/awards.js"));
const testAwards = { meta: { label: "test list", edition: "test", count: 2 }, items: [
  [awardsLib.titleKey("A Plain Preprint"), awardsLib.surnameKey("A Smith"), "ICLR", 2023, "best", "Best Paper Award"],
  [awardsLib.titleKey("Deep Things for Recognition"), awardsLib.surnameKey("J Doe"), "CVPR", 2016, "best", "Best Paper Award"],
  [awardsLib.titleKey("Fast Recovery for Disaggregated Memory"), awardsLib.surnameKey("C Writer"), "OSDI", 2023, "best", "Best Paper Award"]   // the fictional showcase profile
] };
fs.writeFileSync(path.join(extDir, "data", "awards.js"),
  `(globalThis.RolesRanks = globalThis.RolesRanks || {}).data = Object.assign(globalThis.RolesRanks.data || {}, { awards: ${JSON.stringify(testAwards)} });\n`);
// unpacked-extension id = first 32 hex of sha256(realpath), digits mapped to a–p
const extId = [...crypto.createHash("sha256").update(fs.realpathSync(extDir)).digest("hex").slice(0, 32)]
  .map((c) => String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16))).join("");

const outDir = process.env.E2E_OUT || path.join(os.tmpdir(), "rr-e2e-out");
fs.mkdirSync(outDir, { recursive: true });

let step = 0;
const t0 = Date.now();
const ok = (msg) => console.log(`  ✓ ${String(++step).padStart(2)}  ${process.env.E2E_TIMES ? `[${((Date.now() - t0) / 1000).toFixed(0).padStart(3)} s] ` : ""}${msg}`);          // (E2E_TIMES=1: the time of each check)

async function launch() {
  const ctx = await pw.chromium.launchPersistentContext(path.join(tmp, "profile-" + Math.random().toString(36).slice(2)), {
    executablePath: chromiumPath,
    headless: !process.env.E2E_HEADED,                              // E2E_HEADED=1 shows the window (background tabs then behave like a real browser's)
    viewport: { width: 1360, height: 900 },
    deviceScaleFactor: parseFloat(process.env.E2E_SCALE || "1"),   // E2E_SCALE=2 for sharp README screenshots
    permissions: ["clipboard-read", "clipboard-write"],
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, "--no-first-run", ...(process.env.CI ? ["--no-sandbox"] : [])]
  });
  // chrome.storage.sync takes 120 writes a minute from a profile and refuses the rest (the settings page then writes again 10 s later): the extension's pages report each
  // write they make (a message in the console), so that the tests can wait while the minute's allowance is nearly used (see budget())
  ctx.rrWrites = [];
  await ctx.addInitScript(() => {
    try {
      if (location.protocol !== "chrome-extension:" || !chrome.storage || !chrome.storage.sync) return;
      const set = chrome.storage.sync.set.bind(chrome.storage.sync);
      chrome.storage.sync.set = (...args) => { console.log("rr-sync-write"); return set(...args); };
    } catch (e) { /* not an extension page */ }
  });
  ctx.on("console", (m) => { if (m.text() === "rr-sync-write") ctx.rrWrites.push(Date.now()); });
  return ctx;
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
  document.querySelectorAll("#rr-panel tr[data-role]").forEach((tr) => {
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
const setPref = async (p, key, on) => { await p.bringToFront(); await p.setChecked(`input[data-pref="${key}"]`, on); await settle(p); };      // (a setting is set once it is written)
// a rank list (ccf, core) or a kind of mark (award, oral, …) on or off everywhere it is drawn: the chips on the rows, and the table's tab or the count row
const setList = async (p, list, on) => { await setPref(p, "rows." + list, on); await setPref(p, "panel.table." + list, on); };
const setMark = async (p, group, on) => { await setPref(p, "rows." + group, on); await setPref(p, "panel.marks." + group, on); };
// (the settings page writes what it was told a moment later than it was told, at most 85 times a minute: a read of its settings waits for that write)
const settle = async (p) => { await pollPage(p, () => !document.body.hasAttribute("data-rr-pending")).catch(() => {}); await budget(p); };
// (a profile may write 120 times in a minute: with fewer than `reserve` writes of the minute left, wait for the oldest ones to age out)
const budget = async (p, reserve = 40) => {
  const log = p.context().rrWrites;
  while (log) {
    const now = Date.now();
    while (log.length && now - log[0] > 61000) log.shift();
    if (log.length + reserve <= 120) return;
    await p.waitForTimeout(1000);
  }
};
const stored = async (p, area, key) => { if (area === "sync" && key === "prefs" && p.url().endsWith("/options/options.html")) await settle(p); return p.evaluate(([a, k]) => chrome.storage[a].get(k).then((r) => r[k]), [area, key]); };
// (waitForFunction evaluates its predicate as a string, which the extension pages' content security policy -- scripts from 'self' only -- can refuse
// on some builds: these pages are polled with evaluate instead)
const pollPage = async (p, fn, arg, timeout = 10000) => {
  const t0 = Date.now();
  for (;;) {
    // (a page that reloads itself while it is asked — the settings page after a language is picked — is asked again once it is back)
    try { if (await p.evaluate(fn, arg)) return; } catch (e) { if (!/Execution context was destroyed|navigation/i.test(String(e && e.message))) throw e; }
    if (Date.now() - t0 > timeout) throw new Error("timed out waiting for: " + fn.toString().slice(0, 100));
    await p.waitForTimeout(100);
  }
};

const eventually = async (page, fn, arg) => { await page.bringToFront(); try { return page.url().startsWith("chrome-extension://") ? await pollPage(page, fn, arg) : await page.waitForFunction(fn, arg, { polling: 100, timeout: 10000 }); } catch (e) { e.message += "\n  while waiting for: " + fn.toString().slice(0, 200); throw e; } };

(async () => {
  // E2E_PART=1 runs the long profile's sections 1–16 and S1–S6, E2E_PART=3 its settings-page sections S7–S8 (from a setup of their own: the state S1–S6 leave),
  // E2E_PART=2 the sections with profiles of their own from 17 to 25, E2E_PART=4 those from 26 on (the very large profile and after); unset, all in one run. The parts share nothing, so they can run at the same time (scripts/check-all.sh
  // and CI do). (The blocks below keep their old indentation: the gates are all that changed.)
  const PART = process.env.E2E_PART || "";
  if (!["", "1", "2", "3", "4"].includes(PART)) throw new Error(`E2E_PART=${PART}: the parts are 1 to 4 (unset: all)`);
  if (PART === "" || PART === "1" || PART === "3") {
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
    // where both lists rank a venue the default draws one chip: CCF's (and CORE's where CCF has none); the checks below count the chips of both lists, so they run on "Both"
    // (the default, and each choice, have their own check: S3c2b)
    assert.equal(await seed.locator('input[data-pref="rows.prefer"]:checked').getAttribute("value"), "ccf", "CCF first by default");
    await seed.click('label.seg-btn:has(input[data-pref="rows.prefer"][value="both"])');
    await settle(seed);
    await seed.close();
    const page = await context.newPage();
    await page.goto(fx.url);
    await page.waitForSelector("#rr-panel");
    console.log("Better Scholar e2e — Chromium", context.browser() ? context.browser().version() : "", "| extension", extId);
    let all, opts;          // (the records of the whole list and the settings page: what sections S7–S8 take from the ones before them)
    if (PART !== "3") {

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
    all = expected(profile);
    assert.deepEqual(await readMatrix(page), matrixOf(all));
    ok("'Load all' brings 100 rows and the matrix matches the library result");
    const stats = matrixOf(all);
    console.log("      matrix:", JSON.stringify(stats));

    // -- 6. a role switch on the settings page recolours the open profile at once (no reload)
    opts = await openOptions(context);
    const lastRows = all.filter((p) => p.highlighted && p.role === "last").length;
    assert.equal(await page.locator('[data-rr="metrics"] .rr-scope').textContent(), "First, Co-first, Second, and Last", "the highlighted papers say which roles they are");
    await setPref(opts, "roles.last", false);
    await eventually(page, () => document.querySelectorAll("tr.rr-r-last").length === 0);
    assert.equal(await page.locator('[data-rr="metrics"] .rr-scope').textContent(), "First, Co-first, and Second");
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
    // fine-grained sidebar hiding: table only or chart only
    await setPref(opts, "hide.citedTable", true);
    await eventually(page, () => getComputedStyle(document.getElementById("gsc_rsb_st")).display === "none");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".gsc_md_hist_b")).display !== "none"), true, "chart remains visible when table is hidden");
    await setPref(opts, "hide.citedTable", false);
    await eventually(page, () => getComputedStyle(document.getElementById("gsc_rsb_st")).display !== "none");

    await setPref(opts, "hide.citedChart", true);
    await eventually(page, () => getComputedStyle(document.querySelector(".gsc_md_hist_b")).display === "none");
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("gsc_rsb_st")).display !== "none"), true, "table remains visible when chart is hidden");
    await setPref(opts, "hide.citedChart", false);
    await eventually(page, () => getComputedStyle(document.querySelector(".gsc_md_hist_b")).display !== "none");
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
    await opts.click('label.seg-btn:has(input[data-pref="panel.marks.grouping"][value="pair"])');
    await pollPage(opts, () => document.querySelectorAll(".preview [data-mark-group]").length === 3);
    assert.deepEqual(await rowsOf(), ["award=2", "oral=1", "spotlight+highlight=2"]);
    await opts.click('label.seg-btn:has(input[data-pref="panel.marks.grouping"][value="talks"])');
    await pollPage(opts, () => document.querySelectorAll(".preview [data-mark-group]").length === 2);
    assert.deepEqual(await rowsOf(), ["award=2", "oral+spotlight+highlight=3"]);
    await opts.click('label.seg-btn:has(input[data-pref="panel.marks.grouping"][value="separate"])');
    await pollPage(opts, () => document.querySelectorAll(".preview [data-mark-group]").length === 4);
    ok("talk rows: spotlight + highlight, or all three talk kinds, can share one row of the panel; the counts follow");

    // -- 6a2c. the venue list (off until asked): the ranked venues of the highlighted papers, most papers first; a click lists just those papers
    assert.equal(await page.locator('[data-rr="venues"]').isVisible(), false, "the venue list is off by default");
    await opts.bringToFront();
    await setPref(opts, "panel.venues.show", true);
    await eventually(page, () => document.querySelectorAll('[data-rr="venues"] [data-venue]').length > 1);
    const venueRows = await page.locator('[data-rr="venues"] [data-venue]').evaluateAll((els) => els.map((e) => [e.dataset.venue, parseInt(e.querySelector("b").textContent, 10)]));
    assert.ok(venueRows.every((v, i) => i === 0 || venueRows[i - 1][1] >= v[1]), "most papers first");
    const toggleVenuesBtn = page.locator('#rr-panel button[data-act="toggle-venues"]');
    if (await toggleVenuesBtn.count()) {
      const initialVenueCount = await page.locator('[data-rr="venues"] [data-venue]').count();
      assert.equal(initialVenueCount, 6, "initially capped at top 6 venues");
      await toggleVenuesBtn.click();
      assert.ok((await page.locator('[data-rr="venues"] [data-venue]').count()) > 6, "expanding venues reveals more than 6");
      await toggleVenuesBtn.click();
      assert.equal(await page.locator('[data-rr="venues"] [data-venue]').count(), initialVenueCount, "collapsing venues restores top 6");
    }
    const wantVenue = all.filter((p) => p.highlighted && ((p.venue.ccf && (p.venue.ccf.abbr || p.venue.ccf.name)) || (p.venue.core && (p.venue.core.abbr || p.venue.core.name))) === venueRows[0][0]).length;
    assert.equal(venueRows[0][1], wantVenue, "the count matches the library");
    await page.bringToFront();
    await page.click(`[data-venue="${venueRows[0][0]}"]`);
    await eventually(page, (n) => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).filter((r) => getComputedStyle(r).display !== "none").length === n, venueRows[0][1]);
    // a venue filter whose venue leaves the list on a single change (the one role that owns all of its papers is switched off) is dropped on that change
    const keyOf = (p) => (p.venue.ccf && (p.venue.ccf.abbr || p.venue.ccf.name)) || (p.venue.core && (p.venue.core.abbr || p.venue.core.name)) || "";
    const ownRoles = new Set(all.filter((p) => p.highlighted && keyOf(p) === venueRows[0][0]).map((p) => p.role));
    assert.equal(ownRoles.size, 1, "the fixture's most frequent venue is one role's");
    const ownRole = [...ownRoles][0];
    await setPref(opts, "roles." + ownRole, false);
    await eventually(page, () => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).every((r) => getComputedStyle(r).display !== "none"));
    await setPref(opts, "roles." + ownRole, true);
    await page.bringToFront();
    await page.click(`[data-venue="${venueRows[0][0]}"]`);
    await eventually(page, (n) => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).filter((r) => getComputedStyle(r).display !== "none").length === n, venueRows[0][1]);
    // a venue filter whose venue leaves the list (no role is highlighted now) is dropped, not left hiding rows with no control to undo it
    for (const r of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + r, false);
    await eventually(page, () => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")).every((r) => getComputedStyle(r).display !== "none"));
    await page.bringToFront();
    await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-no-roles.png") });
    assert.match(await page.locator('[data-rr="no-roles"]').textContent(), /No author role is switched on/, "with every role off the panel says why nothing is highlighted");
    for (const r of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + r, true);
    await setPref(opts, "panel.venues.show", false);
    ok("venue list: off by default; on, it lists the ranked venues most papers first, and a click shows just that venue's papers");

    // -- 6a2d. forced colours (Windows high contrast): the row bar becomes a real border, so a role is still seen
    await page.bringToFront();
    await page.emulateMedia({ forcedColors: "active" });
    await eventually(page, () => parseFloat(getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).borderInlineStartWidth) === 4);
    await page.emulateMedia({ forcedColors: null });
    ok("forced colours: a highlighted row keeps a 4 px border where the system drops the tint and the bar");

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
    // the highlight style: bar only (no tint) / tint only (no bar) / both
    const look = () => page.evaluate(() => { const td = document.querySelector("tr.rr-r-first > td:first-child"), c = getComputedStyle(td); return { tint: c.backgroundColor !== "rgba(0, 0, 0, 0)" && c.backgroundColor !== "transparent", bar: c.boxShadow !== "none" }; });
    assert.deepEqual(await look(), { tint: true, bar: true });
    await opts.click('label.seg-btn:has(input[data-pref="rows.style"][value="bar"])');
    await eventually(page, () => getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).boxShadow !== "none" && getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).backgroundColor === "rgba(0, 0, 0, 0)");
    assert.deepEqual(await look(), { tint: false, bar: true });
    await opts.click('label.seg-btn:has(input[data-pref="rows.style"][value="tint"])');
    await eventually(page, () => getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).boxShadow === "none");
    assert.deepEqual(await look(), { tint: true, bar: false });
    await opts.click('label.seg-btn:has(input[data-pref="rows.style"][value="full"])');
    await eventually(page, () => getComputedStyle(document.querySelector("tr.rr-r-first > td:first-child")).boxShadow !== "none");
    ok("row highlight style: bar only, tint only and both change the open profile at once");

    // -- 6a4. language: choosing one in the settings re-draws the open profile and the settings page in it; "Follow the browser" brings English back
    const loc = (code, key) => JSON.parse(fs.readFileSync(path.join(here, "..", "..", "src", "_locales", code, "messages.json"), "utf8"))[key].message;
    const jaTitle = loc("ja", "extName"), enTitle = loc("en", "extName");
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="language"]', "ja");
    await page.waitForFunction((x) => (document.querySelector("#rr-panel") || {}).getAttribute && document.querySelector("#rr-panel").getAttribute("aria-label") === x, jaTitle, { timeout: 15000 });
    await pollPage(opts, (x) => document.title.startsWith(x), jaTitle, 15000);
    assert.equal(await opts.locator('select[data-pref="language"]').inputValue(), "ja");
    // ... the filter bar writes a typed query in the language's quotes (the profile may still be drawing itself again after the change of language: the text is typed again until it stays)
    await page.bringToFront();
    for (let tries = 1; ; tries++) {
      await page.fill('#rr-panel input[data-act="filter-query"]', "role:last ccf:a");
      try { await page.waitForFunction(() => /「role:last ccf:a」/.test((document.querySelector("#rr-panel .rr-fb-what") || {}).textContent || ""), null, { timeout: 2500 }); break; }
      catch (e) { if (tries >= 5) throw e; await page.waitForTimeout(500); }
    }
    await page.fill('#rr-panel input[data-act="filter-query"]', "");
    await page.waitForFunction(() => document.querySelector('[data-rr="filterbar"]').hidden, null, { timeout: 8000 });
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="language"]', "ar");
    await page.waitForFunction(() => document.querySelector("#rr-panel") && document.querySelector("#rr-panel").dir === "rtl", null, { timeout: 15000 });
    await pollPage(opts, () => document.documentElement.dir === "rtl", null, 15000);
    await opts.waitForTimeout(400);
    await opts.bringToFront(); await opts.screenshot({ path: path.join(outDir, "settings-ar.png"), fullPage: true });
    await page.bringToFront(); await page.waitForTimeout(400);
    await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "panel-ar.png") });
    // (a built-in text with a character that a name drops — the soft hyphen of Finnish "Yhteis­ensimmäinen" — opened on the preview and left as it was saves no name)
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="language"]', "fi");
    await pollPage(opts, () => document.documentElement.lang === "fi" && !!document.querySelector('#pv-panel [data-rr-label="roleCofirst"]'), null, 15000);
    await opts.dblclick('#pv-panel [data-rr-label="roleCofirst"]');
    await opts.locator(".pv-rename-input").press("Enter");
    await settle(opts);
    assert.equal((await stored(opts, "sync", "prefs")).labels.roleCofirst, "", "a Finnish text left as it was is not saved as a name");
    await opts.selectOption('select[data-pref="language"]', "auto");
    await page.waitForFunction((x) => document.querySelector("#rr-panel") && document.querySelector("#rr-panel").getAttribute("aria-label") === x, enTitle, { timeout: 15000 });
    await pollPage(opts, (x) => document.title.startsWith(x), enTitle, 15000);                  // (the settings page has been drawn again in English: it reloads once the setting is written)
    await page.waitForSelector("html[data-rr-ready]");                                           // (the profile has been drawn again and listens for settings: a change made while it loads would be missed)
    ok("language: picking Japanese redraws the open profile and the settings page in it; 'Follow the browser' brings English back");
    // -- 6a5. "Open Scholar in": a profile opened in another language is opened again with the chosen one; "Leave as it is" stops that
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="scholarLanguage"]', "de");
    await page.waitForFunction(() => new URL(location.href).searchParams.get("hl") === "de", null, { timeout: 15000 });
    await page.waitForSelector("#rr-panel");
    // the same for Scholar's search pages (a shared link), and never for a download
    const origin = new URL(fx.url).origin;
    await page.goto(`${origin}/scholar?q=caf%E9&hl=en#top`);
    await page.waitForFunction(() => new URL(location.href).searchParams.get("hl") === "de", null, { timeout: 15000 });
    assert.match(page.url(), /q=caf%E9&hl=de#top$/, "the rest of the address is kept exactly (a query in another encoding is not rewritten), and so is the hash");
    await page.goto(`${origin}/scholar.bib?hl=en`);
    await page.waitForTimeout(500);
    assert.equal(new URL(page.url()).searchParams.get("hl"), "en", "a download is not redirected");
    await page.goto(fx.url.replace("hl=en", "hl=de"));
    await opts.selectOption('select[data-pref="scholarLanguage"]', "keep");
    await page.waitForLoadState("load");
    await page.waitForTimeout(600);                                   // (the open profile reloads itself once for the changed setting)
    await page.goto(fx.url);
    await page.waitForSelector("#rr-panel");
    assert.equal(new URL(page.url()).searchParams.get("hl"), "en", "left as it is");
    ok("Scholar language: a chosen language is put on a profile's and a search page's address (hl=), a download is left alone, and 'Leave as it is' leaves everything alone");
    // (the page was loaded afresh: bring the whole list back for what follows)
    await page.click('[data-act="load-all"]');
    await page.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100, null, { timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector('[data-act="load-all"]'));

    // -- 6a5b. the bug-report details: version, browser, language and the settings, on the clipboard
    await opts.bringToFront();
    await opts.click('[data-act="copy-diagnostics"]');
    const diag = await opts.evaluate(() => navigator.clipboard.readText());
    assert.match(diag, /^Better Scholar \d+\.\d+\.\d+\n.*Chrome.*\ninterface language: .+\nsettings: \{"language":"auto",/s);
    assert.ok(!/@|user=/.test(diag), "nothing that identifies the person");
    ok("settings: 'Copy details for a bug report' puts the version, browser, language and settings on the clipboard");
    // -- 6a5b2. the preview is a picture: nothing in it is in the tab order or read out (the controls on the left are the page for a keyboard and a screen reader)
    assert.deepEqual(await opts.evaluate(() => ({ hidden: [document.getElementById("pv-panel").getAttribute("aria-hidden"), document.querySelector("table.pv").getAttribute("aria-hidden")], tabbable: [...document.querySelectorAll("#pv-panel a[href], #pv-panel button, #pv-panel input, #pv-panel select, #pv-panel summary, table.pv a[href]")].filter((e) => e.tabIndex >= 0).length })), { hidden: ["true", "true"], tabbable: 0 });
    // -- 6a5c. Check a venue: what the lists make of a text, as the rows of a profile would have it (both ranks and the rule; a secondary track; no rank)
    await opts.fill('[data-act="venue-check"]', "Proceedings of the IEEE conference on computer vision and pattern recognition");
    assert.equal(await opts.locator("#card-venue .venue-line").count(), 2);
    assert.match(await opts.locator('#card-venue .venue-line[data-kind="ccf"]').innerText(), /CCF\s*A\b[\s\S]*\(CVPR\)[\s\S]*Matched by name/);
    assert.match(await opts.locator('#card-venue .venue-line[data-kind="core"]').innerText(), /CORE\s*A\*/);
    assert.match(await opts.locator('#card-venue .venue-line[data-kind="ccf"] .venue-meta').innerText(), /^Artificial intelligence · DBLP/, "the CCF entry names its area and links to DBLP");
    assert.equal(await opts.locator('#card-venue .venue-line[data-kind="ccf"] a').getAttribute("href"), "https://dblp.org/db/conf/cvpr/");
    assert.equal(await opts.locator('#card-venue .venue-line[data-kind="ccf"] a').getAttribute("rel"), "noopener noreferrer");
    await opts.fill('[data-act="venue-check"]', "Workshop on Machine Learning for Systems");
    assert.match(await opts.locator("#card-venue .venue-none").innerText(), /“workshop” marks a secondary track/);
    await opts.fill('[data-act="venue-check"]', "asdf qwer zxcv");
    assert.match(await opts.locator("#card-venue .venue-none").innerText(), /^No rank\./);
    await opts.fill('[data-act="venue-check"]', "");
    assert.equal(await opts.locator("#card-venue .venue-out").innerText(), "");
    ok("settings: 'Check a venue' tells what the lists make of a text: both ranks with the rule, a secondary track, no rank");
    // the footer points at the project's own pages, as plain links that open only when clicked
    assert.deepEqual(await opts.evaluate(() => [...document.querySelectorAll(".foot .links a")].map((a) => [a.textContent, a.href, a.target, a.rel])), [
      ["Privacy", "https://boyugou.github.io/better-scholar/privacy/", "_blank", "noopener"],
      ["Report a problem", "https://github.com/boyugou/better-scholar/issues/new/choose", "_blank", "noopener"],
      ["GitHub", "https://github.com/boyugou/better-scholar", "_blank", "noopener"]
    ]);

    // -- 6a6. the card links under the header: one per card, each takes its card to the top of the window
    await opts.bringToFront();
    const links = await opts.locator(".toc a").count();
    assert.equal(links, await opts.locator("#controls > section.card").count());
    await opts.emulateMedia({ reducedMotion: "reduce" });                // (no smooth scrolling to wait for: it is slow on a CI machine)
    await opts.locator(".toc a").nth(3).click();
    // (polled with evaluate: the settings page's content security policy has no 'unsafe-eval', which waitForFunction needs on some builds)
    for (let i = 0; i < 50; i++) { const t = await opts.evaluate(() => document.querySelector("#card-chips").getBoundingClientRect().top); if (t >= 0 && t < 140) break; await opts.waitForTimeout(100); if (i === 49) assert.fail("the card did not come to the top: " + JSON.stringify(await opts.evaluate(() => ({ top: document.querySelector("#card-3").getBoundingClientRect().top, y: scrollY, h: innerHeight, doc: document.documentElement.scrollHeight })))); }
    await opts.locator('.toc a[data-card="card-chips"][aria-current]').waitFor({ timeout: 5000 }).catch(() => assert.fail("the link of the card in view is marked"));
    await opts.emulateMedia({ reducedMotion: "no-preference" });
    await opts.evaluate(() => window.scrollTo(0, 0));
    ok(`settings page: ${links} links to its cards under the header, each one scrolls its card into view`);
    // ... they are one stop for the Tab key, the arrows move among them (not 22 stops in front of the first setting), and a colour row is one stop too
    assert.equal(await opts.locator(".toc a[tabindex='0']").count(), 1, "one section link is the stop");
    assert.equal(await opts.locator(".toc a:not([tabindex='0'])").count(), links - 1);
    await opts.locator(".toc a[tabindex='0']").focus();
    const firstLink = await opts.evaluate(() => document.activeElement.dataset.card);
    await opts.keyboard.press("ArrowRight");
    const secondLink = await opts.evaluate(() => ({ card: document.activeElement.dataset.card, stop: document.activeElement.tabIndex }));
    assert.notEqual(secondLink.card, firstLink, "an arrow moves to the next link");
    assert.equal(secondLink.stop, 0, "and the stop moves with it");
    await opts.keyboard.press("End");
    assert.equal(await opts.evaluate(() => document.activeElement === [...document.querySelectorAll(".toc a")].pop()), true, "End moves to the last link");
    assert.equal(await opts.locator(".curated-palette-row").first().locator("button[tabindex='0']").count(), 1, "one swatch of a colour row is the stop");

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
    await opts.setViewportSize({ width: 1360, height: 2600 });             // (tall enough for the whole preview also with the wider fonts of a CI machine)
    await pollPage(opts, () => !document.querySelector(".preview").classList.contains("more"), null, 12000).catch(async () => assert.fail("a whole preview has no fade: " + JSON.stringify(await opts.evaluate(() => { const p = document.querySelector(".preview"); return { scrollH: p.scrollHeight, clientH: p.clientHeight, top: p.scrollTop, innerH: innerHeight, cls: p.className }; }))));
    // in one column (a half-screen window, 150% zoom) the preview holds the top of the window as a strip, a part of its height, and a section link lands below it
    await opts.setViewportSize({ width: 800, height: 700 });
    await opts.evaluate(() => window.scrollTo(0, 0));
    const strip = await opts.evaluate(() => { const b = document.querySelector(".preview").getBoundingClientRect(), first = document.querySelector("#controls .opt, #controls .card .row"); return { pos: getComputedStyle(document.querySelector(".preview")).position, h: b.height, vh: innerHeight, firstTop: first ? first.getBoundingClientRect().top : 0 }; });
    assert.equal(strip.pos, "sticky", "the preview is a strip at the top in one column");
    assert.ok(strip.h <= strip.vh * 0.41, `the strip is at most 40% of the window: ${JSON.stringify(strip)}`);
    assert.ok(strip.firstTop < strip.vh, `the first setting is in the first screen: ${JSON.stringify(strip)}`);
    await opts.locator(".toc a").nth(3).click();
    await opts.waitForTimeout(1200);
    const landed = await opts.evaluate(() => { const a = document.querySelectorAll(".toc a")[3], c = document.getElementById(a.dataset.card).getBoundingClientRect(); return { cardTop: c.top, previewBottom: document.querySelector(".preview").getBoundingClientRect().bottom }; });
    assert.ok(landed.cardTop >= landed.previewBottom - 2, `a section link lands the card below the preview: ${JSON.stringify(landed)}`);
    // on a phone (the website's frame is this page at 330 px): no word of a setting's name or of a role is cut in two by the end of a line (a select goes under its label), and the page does not scroll sideways
    await opts.setViewportSize({ width: 330, height: 700 });
    await opts.evaluate(() => window.scrollTo(0, 0));
    const phone = await opts.evaluate(() => {
      const range = document.createRange(), broken = [];
      for (const el of document.querySelectorAll("#controls .opt .name, .preview .rr-rolebtn, .preview .rr-matrix thead th")) {
        if (!el.getClientRects().length) continue;
        for (const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); w.nextNode();) for (const m of w.currentNode.data.matchAll(/[A-Za-z]{4,}/g)) {
          range.setStart(w.currentNode, m.index); range.setEnd(w.currentNode, m.index + m[0].length);
          if (new Set([...range.getClientRects()].filter((q) => q.width > 0.5).map((q) => Math.round(q.top / 4))).size > 1) broken.push(m[0]);
        }
      }
      const d = document.documentElement, label = document.querySelector("#controls .opt:has(select.sel) .name"), sel = document.querySelector("#controls .opt:has(select.sel) select.sel");
      return { broken, sideways: d.scrollWidth - d.clientWidth, selectBelow: !!(label && sel && sel.getBoundingClientRect().top >= label.getBoundingClientRect().bottom - 1) };
    });
    assert.deepEqual(phone.broken, [], `on a phone no word is cut in two: ${phone.broken.join(", ")}`);
    assert.ok(phone.sideways <= 1, `on a phone the page does not scroll sideways: ${phone.sideways}px`);
    assert.ok(phone.selectBelow, "on a phone a select goes under its label");
    await opts.evaluate(() => window.scrollTo(0, 0));
    await opts.setViewportSize({ width: 1360, height: 900 });
    ok("the settings preview stays whole in view while the page scrolls, even in a short window; in one column it is a strip at the top and a section link lands below it; on a phone no word is cut in two and a select goes under its label");

    // -- 7. matrix cell filters the list
    const lastA = all.filter((p) => p.status === "found" && p.role === "last" && p.venue.ccf && p.venue.ccf.tier === "A").length;
    await page.click('button.rr-cell[data-role="last"][data-tier="A"]');
    assert.equal(await visibleRows(page), lastA);
    assert.equal(await page.getAttribute('button.rr-cell[data-role="last"][data-tier="A"]', "aria-pressed"), "true");
    await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-filtered.png") });
    assert.equal(await page.locator('[data-rr="filterbar"] > span').textContent(), `Showing ${lastA} of 100 papers · Last, CCF A`, "the panel says the list is filtered, and by what");
    assert.equal(await page.locator('[data-metric="mPapers"] b').textContent(), String(lastA), "papers counted in the cell");
    assert.match(await page.locator('[data-metric="mPapers"]').getAttribute("title"), /^\d+%$/, "mPapers has percentage title");
    assert.match(await page.locator('[data-metric="mCitations"]').getAttribute("title"), /^\d+%$/, "mCitations has percentage title");
    assert.equal(await page.locator('[data-rr="metrics"] .rr-scope').textContent(), "First, Co-first, Second, and Last · Last, CCF A", "and the block says what it counts");
    await page.click('[data-act="clear-filters"]');
    assert.notEqual(await page.locator('[data-metric="mPapers"] b').textContent(), String(lastA));
    assert.equal(await visibleRows(page), 100);
    await page.click('button.rr-cell[data-role="last"][data-tier="A"]');
    assert.equal(await visibleRows(page), lastA);
    await page.keyboard.press("Escape");
    assert.equal(await visibleRows(page), 100);
    assert.equal(await page.locator('[data-rr="filterbar"]').isVisible(), false, "pressing Escape clears active filter");
    await page.click('button.rr-cell[data-role="last"][data-tier="A"]');
    await page.click('button.rr-cell[data-role="last"][data-tier="A"]');
    assert.equal(await visibleRows(page), 100);
    ok(`clicking last × CCF-A shows exactly ${lastA} papers; pressing Escape or clicking again clears`);

    // -- 7b. metrics H-core and i10 impact filtering
    const hButton = page.locator('#rr-panel button.rr-m[data-metric="mH"]');
    const i10Button = page.locator('#rr-panel button.rr-m[data-metric="mI10"]');
    if (await hButton.count()) {
      const hVal = Number(await hButton.locator("b").textContent());
      if (hVal > 0) {
        await hButton.click();
        assert.equal(await hButton.getAttribute("aria-pressed"), "true");
        const hFilteredRows = all.filter((p) => p.highlighted && (p.citations || 0) >= hVal).length;       // (the highlighted papers behind the number)
        assert.equal(await visibleRows(page), hFilteredRows);
        assert.match(await page.locator("#rr-panel .rr-fb-what").textContent(), new RegExp(`≥${hVal}`));
        // Clicking again clears
        await hButton.click();
        assert.equal(await hButton.getAttribute("aria-pressed"), "false");
        assert.equal(await visibleRows(page), all.length);
      }
    }
    if (await i10Button.count()) {
      await i10Button.click();
      assert.equal(await i10Button.getAttribute("aria-pressed"), "true");
      const i10FilteredRows = all.filter((p) => p.highlighted && (p.citations || 0) >= 10).length;
      assert.equal(await visibleRows(page), i10FilteredRows);
      assert.match(await page.locator("#rr-panel .rr-fb-what").textContent(), /≥10/);
      // Clear via filterbar clear button
      await page.click('[data-act="clear-filters"]');
      assert.equal(await i10Button.getAttribute("aria-pressed"), "false");
      assert.equal(await visibleRows(page), all.length);
    }
    ok("clicking H-index and i10 metric rows shows the highlighted papers behind the number (≥h and ≥10 citations); clicking again or clearing resets");

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
    // clicking a year bar filters to that year and highlights the bar; clicking again clears
    const sampleYear = years[1];
    const yearBar = page.locator(`#rr-panel button.rr-bar[data-year="${sampleYear}"]`);
    if (await yearBar.count()) {
      await yearBar.click();
      assert.equal(await yearBar.getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator('#rr-panel button[data-act="year-start"] .rr-dd-label').textContent(), String(sampleYear));
      assert.equal(await page.locator('#rr-panel button[data-act="year-end"] .rr-dd-label').textContent(), String(sampleYear));
      assert.equal(await visibleRows(page), all.filter((p) => p.year === sampleYear).length);
      assert.match(await page.locator("#rr-panel .rr-fb-what").textContent(), new RegExp(String(sampleYear)));
      await yearBar.click();
      assert.equal(await yearBar.getAttribute("aria-pressed"), "false");
      assert.equal(await visibleRows(page), all.length);
      // the bars are one stop for the keyboard, not one a year: the arrows, Home and End move among them, Enter presses one and the focus stays on its year after the bars are drawn again
      const barsOn = page.locator("#rr-panel button.rr-bar:not([disabled])");
      if ((await barsOn.count()) >= 3) {
        const stops = await barsOn.evaluateAll((els) => els.filter((e) => e.tabIndex === 0).map((e) => e.dataset.year));
        assert.equal(stops.length, 1, "one bar is the keyboard stop");
        const yearOn = () => page.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.year);
        await page.locator(`#rr-panel button.rr-bar[data-year="${stops[0]}"]`).focus();
        const enabledYears = await barsOn.evaluateAll((els) => els.map((e) => e.dataset.year));
        assert.equal(stops[0], enabledYears[enabledYears.length - 1], "the stop is the latest year that has a paper");
        await page.keyboard.press("ArrowLeft");
        assert.equal(await yearOn(), enabledYears[enabledYears.length - 2], "ArrowLeft moves to the year before");
        await page.keyboard.press("Home");
        assert.equal(await yearOn(), enabledYears[0], "Home moves to the first year");
        await page.keyboard.press("ArrowLeft");
        assert.equal(await yearOn(), enabledYears[0], "the first year is the end");
        await page.keyboard.press("End");
        assert.equal(await yearOn(), enabledYears[enabledYears.length - 1], "End moves to the last year");
        await page.keyboard.press("ArrowLeft"); await page.keyboard.press("Enter");
        const pressedYear = enabledYears[enabledYears.length - 2];
        await eventually(page, (y) => document.querySelector(`#rr-panel button.rr-bar[data-year="${y}"]`).getAttribute("aria-pressed") === "true", pressedYear);
        assert.equal(await yearOn(), pressedYear, "the focus stays on the year after the bars are drawn again");
        assert.equal(await page.evaluate(() => document.activeElement.tabIndex), 0, "and it is the keyboard stop");
        await page.keyboard.press("Enter");
        await eventually(page, () => document.querySelectorAll('#rr-panel button.rr-bar[aria-pressed="true"]').length === 0);
        assert.equal(await visibleRows(page), all.length);
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
      }
    }
    // quick search query filter: typing filters by title and author, clear button and Esc clear
    const queryInput = page.locator('#rr-panel input[data-act="filter-query"]');
    const clearBtn = page.locator('#rr-panel button[data-act="clear-query"]');
    const searchCount = page.locator("#rr-panel .rr-search-count");
    assert.equal(await queryInput.count(), 1, "search query input exists in filters section");
    assert.equal(await clearBtn.isVisible(), false, "clear button hidden when search is empty");
    assert.equal(await searchCount.isVisible(), false, "search count badge hidden when search is empty");
    const testWord = profile.rows[0].title.split(/\s+/).find((w) => w.length >= 4 && /^[a-zA-Z]+$/.test(w)) || "paper";
    await queryInput.fill(testWord);
    assert.equal(await clearBtn.isVisible(), true, "clear button visible when search has input");
    assert.equal(await searchCount.isVisible(), true, "search count badge visible when search has input");
    const expectedQueryCount = profile.rows.filter((r) => (r.title || "").toLowerCase().includes(testWord.toLowerCase()) || (r.authors || "").toLowerCase().includes(testWord.toLowerCase())).length;
    assert.equal(await visibleRows(page), expectedQueryCount);
    assert.equal(await searchCount.textContent(), String(expectedQueryCount));
    assert.match(await page.locator("#rr-panel .rr-fb-what").textContent(), new RegExp(testWord), "the filter bar says what was typed, as it was typed");
    // Pressing Enter navigates to the first match and adds focused glow class
    await queryInput.press("Enter");
    assert.equal(await searchCount.textContent(), `1 / ${expectedQueryCount}`);
    assert.equal(await page.locator("tr.gsc_a_tr.rr-row-focused").count(), 1);
    if (expectedQueryCount > 1) {
      await queryInput.press("Enter");
      assert.equal(await searchCount.textContent(), `2 / ${expectedQueryCount}`);
      assert.equal(await page.locator("tr.gsc_a_tr.rr-row-focused").count(), 1);
      await queryInput.press("Shift+Enter");
      assert.equal(await searchCount.textContent(), `1 / ${expectedQueryCount}`);
      assert.equal(await page.locator("tr.gsc_a_tr.rr-row-focused").count(), 1);
    }
    // Clicking clear button clears the search input, hides the button, and resets visible rows
    await clearBtn.click();
    assert.equal(await queryInput.inputValue(), "");
    assert.equal(await clearBtn.isVisible(), false);
    assert.equal(await searchCount.isVisible(), false);
    assert.equal(await page.locator("tr.gsc_a_tr.rr-row-focused").count(), 0);
    assert.equal(await visibleRows(page), all.length);
    // When a search query matches 0 papers, filterbar gets empty-state accent class
    await queryInput.fill("nonexistentqueryxyz12345");
    assert.equal(await visibleRows(page), 0);
    assert.equal(await searchCount.textContent(), "0");
    assert.equal(await searchCount.evaluate((el) => el.classList.contains("rr-search-count-empty")), true);
    assert.equal(await page.locator("#rr-panel .rr-filterbar.rr-fb-empty").count(), 1, "filterbar has empty-state class when 0 papers match");
    await clearBtn.click();
    assert.equal(await page.locator("#rr-panel .rr-filterbar.rr-fb-empty").count(), 0);
    // Multi-token / multi-field search: "Stoica 2001" matches papers by Stoica in 2001
    await queryInput.fill("Stoica 2001");
    assert.ok((await visibleRows(page)) > 0, "multi-token search matches across author and year");
    await clearBtn.click();
    // Advanced query operators: cites:>500, ccf:a tier (a number alone is a word: no operator without its name)
    await queryInput.fill("cites:>500");
    const countOver500 = (await visibleRows(page));
    assert.ok(countOver500 > 0 && countOver500 < all.length, "numeric citation comparison filters correctly");
    assert.equal(countOver500, all.filter((p) => (p.citations || 0) > 500).length);
    await queryInput.fill(">500");
    assert.equal(await visibleRows(page), 0, "'>500' without an operator is a word");
    await queryInput.fill("ccf:x");
    assert.equal(await visibleRows(page), 0, "an operator with a value it does not take finds nothing …");
    assert.equal(await queryInput.getAttribute("aria-invalid"), "true", "… and the box says it could not be read");
    assert.equal((await queryInput.getAttribute("title")).replace(/[\u2066-\u2069]/g, ""), "ccf:x — ccf takes one of: a, b, c", "in the interface's words; the operator's as typed");
    await queryInput.fill("   ");
    assert.equal(await searchCount.isVisible(), false, "a query of spaces is no query: no count");
    assert.equal(await visibleRows(page), all.length);
    assert.equal(await queryInput.getAttribute("aria-invalid"), "false");
    await queryInput.fill("ccf:a");
    const countCcfA = (await visibleRows(page));
    assert.ok(countCcfA > 0, "rank operator ccf:a filters to CCF A papers");
    await clearBtn.click();
    // Pressing "/" anywhere on the page focuses the search query input
    const kbdHint = page.locator("#rr-panel .rr-search-kbd");
    assert.equal(await kbdHint.count(), 1, "shows / keyboard hint badge");
    assert.equal(await kbdHint.textContent(), "/");
    await page.keyboard.press("/");
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-act")), "filter-query", "pressing / focuses the search query input");
    await queryInput.press("Escape");
    // Quick search operator pills
    const pills = page.locator("#rr-panel .rr-search-pills .rr-spill");
    await eventually(page, () => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100 && !/Loading/.test((document.querySelector('[data-rr="coverage"]') || { textContent: "" }).textContent));
    await eventually(page, () => !document.querySelector('.rr-spill[data-pill="award"]'));
    assert.deepEqual(await pills.evaluateAll((els) => els.map((e) => e.dataset.pill)), ["ccfA", "cites100", "first"], "the quick filters, in order: Awards is not offered, no paper of the whole list has one");
    const pillCcf = page.locator('#rr-panel .rr-spill[data-op="ccf:a"]');
    const pillCites = page.locator('#rr-panel .rr-spill[data-op="cites:>100"]');
    assert.equal(await pillCcf.getAttribute("aria-pressed"), "false");
    // Clicking CCF A pill activates operator
    await pillCcf.click();
    assert.equal(await queryInput.inputValue(), "ccf:a");
    assert.equal(await pillCcf.getAttribute("aria-pressed"), "true");
    assert.equal(await visibleRows(page), countCcfA);
    // Clicking >100 pill appends second operator
    await pillCites.click();
    assert.equal(await queryInput.inputValue(), "ccf:a cites:>100");
    assert.equal(await pillCites.getAttribute("aria-pressed"), "true");
    assert.equal(await pillCcf.getAttribute("aria-pressed"), "true");
    // Clicking CCF A again toggles it off
    await pillCcf.click();
    assert.equal(await queryInput.inputValue(), "cites:>100");
    assert.equal(await pillCcf.getAttribute("aria-pressed"), "false");
    assert.equal(await pillCites.getAttribute("aria-pressed"), "true");
    await clearBtn.click();
    assert.equal(await pillCites.getAttribute("aria-pressed"), "false");
    // Your own quick filters: words typed on the settings page make a button after the built-in ones; it shows the words until it has a name, puts them all in the search and
    // takes them out again; words the search cannot read make none (and the settings page says why), nor do words that find no paper here
    const ownWords = async (id, v) => { await opts.bringToFront(); const f = opts.locator(`input[data-pref="panel.filters.searches.${id}"]`); await f.fill(v); await f.blur(); await settle(opts); };
    await ownWords("search1", "ccf:a role:last");
    await ownWords("search2", "ccf:z");
    assert.match(await opts.locator(".opt-words").nth(1).locator(".search-bad").textContent(), /ccf:z/, "the settings page says what it cannot read");
    assert.equal(await opts.locator(".opt-words").nth(0).locator(".search-bad").isHidden(), true);
    await ownWords("search3", "year:<1900");
    // (the settings page's own search finds a filter by its words, and shows its switch with them)
    await opts.fill('[data-act="filter-settings"]', "ccf:a role:last");
    assert.deepEqual(await opts.evaluate(() => { const w = document.querySelector('input[data-pref="panel.filters.searches.search1"]').closest(".opt"); return [w.hidden, w.previousElementSibling.hidden, w.previousElementSibling.querySelector('[data-pref="panel.filters.pills.search1"]') !== null]; }), [false, false, true], "found by its words, with its switch");
    await opts.fill('[data-act="filter-settings"]', "");
    // (the page opened again shows the words — the field had stood empty until a change ran the syncers — and the reason under words it cannot read; a switch off takes the reason with it;
    // the name field and the words field take their text's own direction, so a left-to-right placeholder in a right-to-left page shows its start)
    await opts.reload(); await opts.waitForSelector('input[data-pref="panel.filters.searches.search1"]');
    assert.equal(await opts.inputValue('input[data-pref="panel.filters.searches.search1"]'), "ccf:a role:last", "the words are there when the page opens");
    assert.equal(await opts.locator(".opt-words").nth(1).locator(".search-bad").isVisible(), true, "and the reason under words it cannot read");
    await setPref(opts, "panel.filters.pills.search2", false);
    assert.equal(await opts.locator(".opt-words").nth(1).locator(".search-bad").isVisible(), false, "switched off: the reason goes with the field");
    await setPref(opts, "panel.filters.pills.search2", true);
    assert.deepEqual(await opts.evaluate(() => ["labels.pillSearch1", "panel.filters.searches.search1"].map((p) => document.querySelector(`input[data-pref="${p}"]`).getAttribute("dir"))), ["auto", "auto"]);
    assert.equal(await opts.getAttribute('input[data-pref="labels.pillSearch1"]', "placeholder"), "ccf:a role:last", "the name field's placeholder is the words");
    await page.bringToFront();
    const ownPill = page.locator('#rr-panel .rr-spill[data-pill="search1"]');
    await ownPill.waitFor();
    assert.deepEqual(await pills.evaluateAll((els) => els.map((e) => e.dataset.pill)), ["ccfA", "cites100", "first", "search1"], "your own after the built-in ones; none for words not read or that find nothing");
    assert.equal(await ownPill.textContent(), "ccf:a role:last", "with no name, the button shows its words");
    assert.equal(await ownPill.getAttribute("title"), "ccf:a role:last", "and they are whole on hover (a long one is cut on the button)");
    await ownPill.click();
    assert.equal(await queryInput.inputValue(), "ccf:a role:last");
    assert.deepEqual([await ownPill.getAttribute("aria-pressed"), await pillCcf.getAttribute("aria-pressed")], ["true", "true"], "pressed, and so is CCF A, whose word it holds");
    const ownRows = await visibleRows(page);
    assert.ok(ownRows > 0 && ownRows < countCcfA, `the papers of both words: ${ownRows} of the ${countCcfA} CCF A papers`);
    await ownPill.click();
    assert.equal(await queryInput.inputValue(), "", "pressed again, its words go");
    await opts.bringToFront();
    await opts.fill('input[data-pref="labels.pillSearch1"]', "Last-author A"); await opts.locator('input[data-pref="labels.pillSearch1"]').blur(); await settle(opts);
    await page.bringToFront();
    await eventually(page, () => document.querySelector('#rr-panel .rr-spill[data-pill="search1"]').textContent === "Last-author A");
    assert.equal(await ownPill.getAttribute("title"), "ccf:a role:last", "named: its words on hover");
    for (const id of ["search1", "search2", "search3"]) await ownWords(id, "");
    await opts.fill('input[data-pref="labels.pillSearch1"]', ""); await opts.locator('input[data-pref="labels.pillSearch1"]').blur(); await settle(opts);
    await page.bringToFront();
    await eventually(page, () => !document.querySelector('#rr-panel .rr-spill[data-pill="search1"]'));
    ok("your own quick filters: words of your own as a button after the built-in ones, named or showing the words, all put in and taken out; none for words not read or finding nothing");
    // Operator suggestion dropdown: an ordinary word offers nothing; "role:" opens the autocomplete menu (a combobox for a screen reader)
    const suggestMenu = page.locator("#rr-panel .rr-search-suggest");
    await queryInput.fill("role");
    assert.equal(await suggestMenu.isVisible(), false, "an ordinary word opens no menu: Tab moves on from it");
    await queryInput.fill("role:");
    assert.equal(await suggestMenu.isVisible(), true, "operator suggestion menu opens on role: prefix");
    assert.deepEqual(await queryInput.evaluate((el) => [el.getAttribute("role"), el.getAttribute("aria-expanded"), el.getAttribute("aria-controls"), document.getElementById(el.getAttribute("aria-controls")).getAttribute("role")]), ["combobox", "true", "rr-suggest", "listbox"]);
    const suggestItems = page.locator("#rr-panel .rr-suggest-item");
    assert.ok((await suggestItems.count()) >= 4, "shows role suggestions");
    const box = await suggestMenu.boundingBox();
    assert.ok(box.y + box.height <= 800, "the list is placed with fixed coordinates: inside the window, not clipped by the panel");
    // every operator's suggestions carry a badge (the column it filters), age: and type: too
    for (const [typed, ops, badge] of [["age:", ["age:<5", "age:<=10"], "Year"], ["type:", ["type:conference", "type:journal"], "Venue"]]) {
      await queryInput.fill(typed);
      assert.deepEqual(await suggestItems.evaluateAll((els) => els.map((e) => e.dataset.op)), ops, `${typed} suggests its values`);
      assert.equal((await suggestItems.first().locator(".rr-suggest-cat").textContent()).trim(), badge, `${typed} has a badge`);
    }
    await queryInput.fill("role:");
    // Escape: the list first (the text stays), then the text
    await queryInput.press("Escape");
    assert.equal(await suggestMenu.isVisible(), false);
    assert.equal(await queryInput.inputValue(), "role:", "the first Escape only closes the list");
    await queryInput.fill("role:");
    // Tab takes a suggestion only when one was chosen with the arrows; otherwise it moves on and the text stays
    await queryInput.press("Tab");
    assert.equal(await queryInput.inputValue(), "role:", "Tab does not take a suggestion nobody chose");
    await queryInput.fill("");
    await queryInput.fill("role:");
    // Arrow down highlights first suggestion (role:first)
    await queryInput.focus();
    await queryInput.press("ArrowDown");
    assert.equal(await suggestItems.first().evaluate((el) => el.classList.contains("rr-suggest-active")), true);
    assert.equal(await queryInput.getAttribute("aria-activedescendant"), "rr-suggest-0");
    // Pressing Enter selects role:first
    await queryInput.press("Enter");
    assert.equal(await queryInput.inputValue(), "role:first ");
    assert.equal(await suggestMenu.isVisible(), false, "menu closes after choosing suggestion");
    assert.ok((await visibleRows(page)) > 0, "filter by role:first yields matching rows");
    await clearBtn.click();
    ok("year filter and 'only highlighted' hide the right rows; year bars filter on click; the year list works from the keyboard; search input filters on query, steps matches with Enter, shows count badge, operator pills toggle, focuses on /, and auto-completes operator suggestions");

    // -- 10. the owner's name is marked by default, with the role in a tooltip; switching it off keeps the tooltip on the line
    assert.ok((await page.locator(".rr-name").count()) > 0, "the owner's name is marked by default");
    const textBefore = await page.locator("#gsc_a_b tr.gsc_a_tr").first().locator(".gs_gray").first().textContent();
    assert.equal(textBefore, profile.rows[0].authors, "marking a name must not change the text");
    assert.match(await page.locator(".rr-name").first().getAttribute("title"), /author · position \d+ of \d+/);
    await setPref(opts, "rows.name", false);
    await eventually(page, () => document.querySelectorAll(".rr-name").length === 0);
    assert.ok((await page.locator('tr[class*="rr-r-"] .gs_gray[title]').count()) > 0, "the role tooltip stays on the author line");
    await setPref(opts, "rows.name", true);
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
    await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-hidden-roles.png") });
    // the status lines keep their spacing (the slots of the status section take no room of their own)
    const gaps = await page.evaluate(() => { const l = [...document.querySelectorAll('[data-rr="coverage"] .rr-cover-line')].map((e) => e.getBoundingClientRect()); return l.slice(1).map((r, i) => Math.round(r.top - l[i].bottom)); });
    assert.ok(gaps.length >= 1 && gaps.every((g) => g >= 3), "status lines are spaced: " + gaps);
    assert.ok(await page.locator('[data-act="resolve"]').evaluate((b) => b.getBoundingClientRect().height < 24), "the action beside a status note keeps its words on one line (the note wraps instead)");
    assert.match(await page.locator('[data-rr="resolve-hint"]').textContent(), /^Reads each paper's page on Scholar in the background/, "before it is pressed the panel says what Read full lists does: it reads Scholar's pages (no tab opens)");
    assert.doesNotMatch(await page.locator('[data-rr="resolve-hint"]').textContent(), /Semantic/, "and does not name Semantic Scholar while that setting is off");
    await page.bringToFront();                                       // (a background tab's timers are slowed to one a second)
    await page.click('[data-act="resolve"]');
    await page.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 20000 });
    const resolvedExpect = matrixOf(expected(profile, { resolveHidden: true }));
    assert.deepEqual(await readMatrix(page), resolvedExpect);
    assert.equal(fx.detailRequests(), 28);
    ok("'Read full lists' reads 28 paper pages; the hidden senior-author rows become 'last'");
    assert.match(await page.locator('[data-rr="announce"]').textContent(), /Done/, "a screen reader is told when reading the lists has finished");
    console.log("      matrix after resolve:", JSON.stringify(resolvedExpect));
    assert.ok((await page.locator('.gs_gray[title*="paper\'s page"]').count()) > 0, "roles read from a paper's own page say so in a tooltip");
    // the paper page's Pages field is kept: the records of the papers read carry their page range (the reference styles use it where the profile's line has a lone number)
    const readRecords = await page.evaluate(() => new Promise((resolve) => {
      const id = "c" + Math.random();
      const on = (e) => { if (e.detail.id === id) { document.removeEventListener("better-scholar:response", on); resolve(e.detail); } };
      document.addEventListener("better-scholar:response", on);
      document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { id, method: "papers", params: { filtered: false } } }));
    }));
    assert.ok(readRecords.result.papers.some((x) => /^\d+-\d+$/.test(x.pages || "")), "a paper read from its page has its page range");

    // -- 11b. Semantic Scholar: with the setting on, cut-off author lists come from its API (title only), and Scholar's own pages are not read
    {
      const fxS = await start({ slug: "ion-stoica", pageSize: 20 });
      const ctxS = await launch();
      try {
        const asked = [];
        await ctxS.route("https://api.semanticscholar.org/**", async (route) => {
          if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "x-api-key,content-type", "access-control-allow-methods": "GET,OPTIONS" } });
          assert.equal(route.request().headers()["x-api-key"], "TESTKEY", "the person's key goes along, in the header");
          const q = new URL(route.request().url()).searchParams;
          asked.push(route.request().url());
          assert.ok(!(route.request().headers()["cookie"]), "no cookies go to Semantic Scholar");
          const r = fxS.profile.rows.find((x) => x.title.trim() === q.get("query"));
          if (asked.length === 3) return route.fulfill({ status: 429, headers: { "access-control-allow-origin": "*" }, body: "{}" });   // Semantic Scholar asks to slow down: no further question is put to it
          if (r && asked.length === 1) {                                  // one answer that is another paper's author list: it must not be used
            return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ data: [{ title: r.title, authors: [{ name: "Zed Nobody" }] }] }) });
          }
          const visible = r ? r.authors.split(/,\s*/).filter((t) => t && !/\.\.\.|…/.test(t)) : [];
          await route.fulfill({ status: r ? 200 : 404, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify(r ? { data: [{ title: r.title, venue: "", authors: [...visible, fxS.profile.owner].map((name) => ({ name })) }] } : { error: "Title match not found" }) });
        });
        const optsS = await openOptions(ctxS);
        await setPref(optsS, "semanticScholar", true);
        await optsS.fill('input[data-pref="s2key"]', "TESTKEY");
        await optsS.dispatchEvent('input[data-pref="s2key"]', "change");
        assert.equal(await stored(optsS, "local", "s2key"), "TESTKEY", "the key is kept on this device");
        assert.equal((await stored(optsS, "sync", "prefs")).s2key, undefined, "and is not in the synced settings");
        const pg = await ctxS.newPage();
        await pg.goto(fxS.url);
        await pg.waitForSelector("#rr-panel");
        await pg.bringToFront();
        await pg.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100, null, { timeout: 30000 });
        await pg.waitForSelector('[data-act="resolve"]');
        assert.match(await pg.locator('[data-rr="resolve-hint"]').textContent(), /^First asks Semantic Scholar .*it gets only the title/, "with the setting on, the panel says that titles go to Semantic Scholar before the button is pressed");
        await pg.click('[data-act="resolve"]');
        await pg.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 30000 });
        assert.deepEqual(await readMatrix(pg), resolvedExpect, "the same roles as when Scholar's own pages are read");
        assert.equal(fxS.detailRequests(), 27, "Scholar's own page is read for the paper whose answer did not fit (another first author) and for everything after Semantic Scholar asked to slow down");
        assert.match(await pg.locator('[data-rr="resolve-msg"]').textContent(), /asked to slow down/);
        assert.equal(asked.length, 3, "after the 429 it is not asked again");
        assert.ok(asked.every((u) => u.startsWith("https://api.semanticscholar.org/graph/v1/paper/search/match?") && !/user=|TEST/.test(u)), "only the title is sent");
        ok("Semantic Scholar: cut-off author lists completed from its API (title only); an answer whose first author is not the row's is refused and that paper is read from Scholar instead");
      } finally { await ctxS.close(); await fxS.close(); }
    }

    // -- 12. clipboard
    // (the buttons stay where they are while the pressed one says "Copied": a shorter word must not let the ones after it move up, and the next click land on another button)
    const copyBoxes = () => page.evaluate(() => [...document.querySelectorAll("#rr-panel .rr-copybar .rr-btn")].map((b) => { const r = b.getBoundingClientRect(); return [b.dataset.act, Math.round(r.left + scrollX), Math.round(r.top + scrollY)]; }));          // (in the page's own coordinates: the click may scroll the panel into view)
    const boxesBefore = await copyBoxes();
    await page.click('[data-act="copy-summary"]');
    await page.locator('[data-act="copy-summary"]', { hasText: "Copied" }).waitFor();
    assert.deepEqual(await copyBoxes(), boxesBefore, "the copy buttons keep their places while one says Copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /^Ion Stoica — Papers by role and rank \(CCF\) · 100 papers loaded/);
    assert.match(clip, /Last author: \d+ \(/);
    assert.match(clip, /CCF 2026 \(7th edition\)/);
    assert.match(clip, /\nSource: http:\/\/127\.0\.0\.1:\d+\/citations\?user=[^&\s·]+ · \d{4}-\d{2}-\d{2}\n/, "where it is from: the profile's link and the day");
    assert.ok(!clip.includes("Not fully loaded"), "the whole list is here: nothing to say about it");
    // (a button that also puts HTML on the clipboard is slower than one that puts text: the clipboard is read when the button says it is done)
    const copied = (act) => page.locator(`[data-act="${act}"]`, { hasText: "Copied" }).waitFor();
    await page.click('[data-act="copy-table"]');
    await copied("copy-table");
    const tsv = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(tsv.split("\n")[0], /^Role\tA\tB\tC\tNot ranked\tTotal$/);
    // (the clipboard's flavours: the table also has its HTML, a real table for a word processor; the summary is text only)
    const flavours = () => page.evaluate(async () => { const out = {}; for (const item of await navigator.clipboard.read()) for (const type of item.types) out[type] = await (await item.getType(type)).text(); return out; });
    const richTable = await flavours();
    assert.equal(richTable["text/plain"], tsv);
    assert.match(richTable["text/html"], /<table[^>]*>[\s\S]*<th>Role<\/th><th>A<\/th><th>B<\/th><th>C<\/th><th>Not ranked<\/th><th>Total<\/th>/);
    ok("Copy summary / Copy as table put the expected text on the clipboard, and the table also as a real table (HTML)");
    // "Copy papers": the papers shown now, one line each
    await page.click('[data-act="copy-papers"]');
    await copied("copy-papers");
    const paperRows = (await page.evaluate(() => navigator.clipboard.readText())).split("\n").map((l) => l.split("\t"));
    assert.deepEqual(paperRows[0], ["Year", "Title", "Authors", "Role", "Venue", "CCF", "CORE", "Awards & talks", "Citations"]);
    assert.equal(paperRows.length, 1 + 100, "the header and the hundred papers loaded");
    const richPapers = (await flavours())["text/html"];
    assert.equal((richPapers.match(/<tr>/g) || []).length, 1 + 100, "the papers also as a real table: the header and the hundred papers");
    assert.match(richPapers, /<td>[^<]*(?:<b>[^<]+<\/b>[^<]*)+<\/td>/, "the owner's name is in bold in the author cells, as the page marks it");
    const exp = expected(profile);
    assert.equal(paperRows[1][1], profile.rows[0].title);
    assert.equal(paperRows[1][8], String(profile.rows[0].cites));
    assert.equal(paperRows[1][5], exp[0].venue.ccf ? exp[0].venue.ccf.tier : "");
    assert.ok(paperRows.slice(1).every((r) => r.length === 9));
    await page.check('input[data-act="only"]');
    await page.click('[data-act="copy-papers"]');
    await page.waitForFunction((n) => navigator.clipboard.readText().then((t) => t.split("\n").length !== n), paperRows.length);          // (the button still says "Copied" from the click before: wait for the new content)
    const onlyRows = (await page.evaluate(() => navigator.clipboard.readText())).split("\n");
    assert.equal(onlyRows.length, 1 + (await visibleRows(page)), "the filters count");
    assert.ok(onlyRows.length < paperRows.length);
    await page.uncheck('input[data-act="only"]');
    ok("Copy papers puts the papers shown (the filters count) on the clipboard, one line each, with role, ranks, awards and citations");

    // "Copy BibTeX": standard BibTeX for papers shown
    await page.click('[data-act="copy-bibtex"]');
    const bibtex = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(bibtex.includes("@inproceedings{") || bibtex.includes("@article{"));
    assert.ok(bibtex.includes("  title = {"));
    assert.ok(bibtex.includes("  author = {"));
    assert.ok(bibtex.includes("  year = {"));
    assert.equal(await page.locator('[data-act="copy-bibtex"]').textContent(), "Copied");
    ok("Copy BibTeX generates standard BibTeX entries with citekey, formatted authors and note");

    // "Copy Markdown": standard Markdown list for papers shown
    await page.click('[data-act="copy-markdown"]');
    const md = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(md.includes("1. **[") || md.includes("1. **"));
    assert.ok(md.includes("Cited by"));
    assert.equal(await page.locator('[data-act="copy-markdown"]').textContent(), "Copied");
    // "Copy APA": standard APA 7th edition publication list
    await page.click('[data-act="copy-apa"]');
    await copied("copy-apa");
    const apa = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(apa.includes("(2001).") || apa.includes("(2010)."));
    assert.ok(apa.includes("Stoica, I.") || apa.includes("Paper number 1"));
    const apaFlavours = await flavours();
    assert.match(apaFlavours["text/html"], /<p style="[^"]*text-indent:-0\.5in">[^<]*<i>[^<]+<\/i>/, "the APA list also with real italics for a word processor");
    assert.equal(apaFlavours["text/plain"], apa);
    assert.equal(await page.locator('[data-act="copy-apa"]').textContent(), "Copied");
    ok("Copy APA generates standard APA 7th reference list with authors, year, title and venue");

    // "Copy IEEE" (off by default): once its switch is on, a button that writes a numbered IEEE list, with real italics for a word processor
    assert.equal(await page.locator('[data-act="copy-ieee"]').count(), 0, "Copy IEEE is off until asked for");
    await setPref(opts, "panel.copy.ieee", true);
    await page.bringToFront();
    await page.locator('[data-act="copy-ieee"]').waitFor();
    await page.click('[data-act="copy-ieee"]');
    await copied("copy-ieee");
    const ieee = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(ieee, /^\[1\] .+, ".+," /, "a numbered IEEE reference");
    assert.match((await flavours())["text/html"], /^<p style="[^"]*text-indent:-2\.2em">\[1\] /, "the IEEE list also for a word processor");
    await setPref(opts, "panel.copy.ieee", false);
    await page.bringToFront();
    await page.locator('[data-act="copy-ieee"]').waitFor({ state: "detached" });
    await setPref(opts, "panel.copy.gbt", true);
    await page.bringToFront();
    await page.locator('[data-act="copy-gbt"]').waitFor();
    await page.click('[data-act="copy-gbt"]');
    await copied("copy-gbt");
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^\[1\] [A-Z][A-Z' -]+ [A-Z]/, "a GB/T 7714 reference: the surname in capitals");
    await setPref(opts, "panel.copy.gbt", false);
    await page.bringToFront();
    // "Copy as image" (off by default): the table as a PNG on the clipboard, with the summary's text beside it
    await setPref(opts, "panel.copy.image", true);
    await page.bringToFront();
    await page.locator('[data-act="copy-image"]').waitFor();
    await page.click('[data-act="copy-image"]');
    await copied("copy-image");
    const pic = await page.evaluate(async () => { const [item] = await navigator.clipboard.read(); const b = await item.getType("image/png"); const bmp = await createImageBitmap(b); return { types: item.types, w: bmp.width, h: bmp.height, text: await (await item.getType("text/plain")).text() }; });
    assert.ok(pic.types.includes("image/png") && pic.w > 400 && pic.h > 300, "a picture of the table: " + JSON.stringify([pic.types, pic.w, pic.h]));
    assert.match(pic.text, /Papers by role/, "and the summary's text beside it");
    await setPref(opts, "panel.copy.image", false);
    await page.bringToFront();
    ok("Copy IEEE, Copy GB/T 7714 and Copy as image (off by default) write their lists or the picture once switched on");

    // "Copy JSON": structured JSON for papers shown
    await page.click('[data-act="copy-json"]');
    const jsonStr = await page.evaluate(() => navigator.clipboard.readText());
    const parsedJson = JSON.parse(jsonStr);
    assert.equal(parsedJson.owner, "Ion Stoica");
    assert.equal(parsedJson.total, 100);
    assert.ok(Array.isArray(parsedJson.papers) && parsedJson.papers.length === 100);
    assert.equal(parsedJson.papers[0].title, profile.rows[0].title);
    assert.equal(await page.locator('[data-act="copy-json"]').textContent(), "Copied");
    ok("Copy JSON puts structured publication array on clipboard with rank, role and citation count");

    // "Export CSV": downloads RFC-4180 CSV with UTF-8 BOM and sanitized filename
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click('[data-act="copy-csv"]')
    ]);
    assert.equal(download.suggestedFilename(), "Ion_Stoica-papers.csv");
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csvStr = Buffer.concat(chunks).toString("utf8");
    assert.ok(csvStr.startsWith("\uFEFF"), "starts with UTF-8 BOM");
    const csvRows = csvStr.slice(1).split("\r\n");
    assert.equal(csvRows[0], "Year,Title,Authors,Role,Venue,CCF,CORE,Awards & talks,Citations");
    assert.equal(csvRows.length, 1 + 100);
    assert.equal(await page.locator('[data-act="copy-csv"]').textContent(), "Exported");
    ok("Export CSV downloads an RFC-4180 CSV with UTF-8 BOM, sanitized filename, and confirmation");

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
      for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
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
    // a clipboard that refuses (every way the copy tries) is said on the button, not passed over in silence
    await popup.evaluate(() => {
      const no = () => Promise.reject(new DOMException("refused", "NotAllowedError"));
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: no, writeText: no } });
      document.execCommand = () => false;
    });
    await popup.click('.actions button.btn[data-act="copy-summary"]');
    await popup.locator('.actions button.btn[data-act="copy-summary"]', { hasText: "Not copied" }).waitFor({ timeout: 5000 });
    assert.equal(await popup.locator('.actions button.btn[data-act="copy-summary"].btn-flashed').count(), 0, "a copy that failed is not shown as done");
    await popup.close();
    ok("toolbar popup renders the active profile's summary (and a hint on other pages); a refused clipboard is said ('Not copied')");

    // -- 16. i18n substitutions resolved (no raw $N1$ placeholders anywhere)
    const body = await page.evaluate(() => document.getElementById("rr-panel").textContent);
    assert.ok(!/\$N\d\$|\$\d/.test(body), "placeholders substituted");
    assert.match(body, /20 papers loaded/);   // (the page was reloaded in step 13; one paper does not name the owner, so the status block still has a line to say and keeps the count)
    ok("chrome.i18n placeholders are substituted");

    // -- S1. no preference switches are left on the page itself
    for (const sel of ['input[data-role]', 'input[data-badge]', 'input[data-act="mark-name"]']) assert.equal(await page.locator(`#rr-panel ${sel}`).count(), 0, sel);
    ok("the panel keeps no preference switches (those live on the settings page)");

    // -- S2. rank switches: CORE off → no CORE chips and no tab; both off → roles only
    const rows20 = expected(first20, { resolveHidden: true });   // (step 11's Read full lists is cached, so the reload keeps it)
    await setList(opts, "core", false);
    await eventually(page, () => !document.querySelector('.rr-chip[data-kind="core"]'));
    assert.equal(await page.locator("#rr-panel button[data-src]").count(), 0);
    assert.equal((await page.textContent("#rr-panel .rr-src")).trim(), "CCF");
    assert.deepEqual(await readMatrix(page), matrixOf(rows20, "ccf"));
    await setList(opts, "ccf", false);
    await eventually(page, () => !document.querySelector('.rr-chip[data-kind="ccf"]'));
    assert.equal(await page.locator("#rr-panel button.rr-cell").count(), 0, "no tier columns when both lists are off");
    assert.deepEqual(await readMatrix(page), matrixOf(rows20, null));
    assert.doesNotMatch(await page.textContent("#rr-panel"), /\bnull\b|undefined/, "no stray null / undefined in the panel");
    await page.click('[data-act="copy-summary"]');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^Ion Stoica — Papers by role · 20 papers loaded\n/);
    await setList(opts, "ccf", true);
    await setList(opts, "core", true);
    await eventually(page, () => document.querySelector('.rr-chip[data-kind="core"]') && document.querySelector("#rr-panel button[data-src]"));
    ok("CORE off: no CORE chips or tab, table by CCF; both off: roles only, copy text says so; back on restores both");

    // -- S3. panel switches: filters, citation totals, the panel itself
    await page.check('input[data-act="only"]');
    const highlighted20 = rows20.filter((p) => p.highlighted).length;
    assert.ok(highlighted20 < 20 && highlighted20 > 0);
    assert.equal(await visibleRows(page), highlighted20, "the filter is active");
    await setPref(opts, "panel.filters.show", false);
    await eventually(page, () => document.querySelector('[data-rr="filters"]').hidden);
    assert.equal(await visibleRows(page), 20, "a filter whose control is gone no longer hides rows");
    await setPref(opts, "panel.metrics.show", false);
    await eventually(page, () => document.querySelector('[data-rr="metrics"]').hidden);
    await setPref(opts, "panel.show", false);
    await eventually(page, () => document.getElementById("rr-panel").hidden);
    assert.ok((await page.locator("tr.rr-r-last").count()) > 0, "rows stay decorated with the panel off");
    assert.ok(await opts.locator('input[data-pref="panel.filters.show"]').isDisabled(), "the panel's sub-switches are greyed out while it is off");
    for (const key of ["panel.show", "panel.filters.show", "panel.metrics.show"]) await setPref(opts, key, true);
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
    // the papers behind the h-index are a filter whose buttons are not drawn while no position is highlighted: it goes too
    await page.click('[data-metric="mH"]');
    await eventually(page, () => document.querySelector('[data-metric="mH"][aria-pressed="true"]'));
    assert.ok((await visibleRows(page)) < 20, "the h-index papers are listed");
    for (const role of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + role, false);
    await eventually(page, () => document.querySelectorAll("tr[class*='rr-r-']").length === 0 && !document.querySelector('[data-metric="mH"]'));
    assert.equal(await visibleRows(page), 20, "no position highlighted: the h-index filter that its button could undo is gone, no row is hidden");
    for (const role of ["first", "cofirst", "second", "last"]) await setPref(opts, "roles." + role, true);
    await eventually(page, () => document.querySelector('[data-metric="mH"]') && document.querySelectorAll("tr[class*='rr-r-']").length > 0);
    assert.equal(await page.locator('[data-metric="mH"][aria-pressed="true"]').count(), 0, "and it stays off when the positions come back");
    ok("every role switched off: the 'Only highlighted' filter and the h-index papers are cleared and hidden");

    // -- S3c. every thing the panel draws has its own switch, and the parts and the buttons have an order
    const patchPrefs = async (patch) => { await settle(opts); return opts.evaluate(async (pt) => { const B = RolesRanks, r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: B.prefs.apply(r.prefs, pt).prefs }); }, patch); };
    // (a call of lib/agent.js from the page: the page events the extension answers)
    const pageCall = (method, params) => page.evaluate(([m, pa]) => new Promise((resolve) => {
      const id = "c" + Math.random();
      const on = (e) => { if (e.detail.id === id) { document.removeEventListener("better-scholar:response", on); resolve(e.detail); } };
      document.addEventListener("better-scholar:response", on);
      document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { id, method: m, params: pa } }));
    }), [method, params]);
    const count = (sel) => page.locator("#rr-panel " + sel).count();
    const sectionOrder = () => page.evaluate(() => [...document.querySelectorAll("#rr-panel .rr-body > [data-section]")].filter((e) => !e.hidden).map((e) => e.dataset.section));
    const defaultOrder = await sectionOrder();
    assert.ok(defaultOrder.length >= 5 && defaultOrder.join() === [...defaultOrder].sort((x, y) => prefsLib.SECTIONS.indexOf(x) - prefsLib.SECTIONS.indexOf(y)).join(), "the parts, in the default order: " + defaultOrder);
    // the title bar
    assert.equal(await count(".rr-title"), 1);
    await patchPrefs({ panel: { header: { name: false } } });
    await eventually(page, () => document.querySelector("#rr-panel .rr-title").hidden);
    assert.equal(await page.locator('#rr-panel [data-act="settings"]').isVisible(), true, "the other buttons stay");
    await page.click('[data-act="collapse"]');                                       // (folded, with the button still there)
    await eventually(page, () => document.getElementById("rr-panel").classList.contains("rr-collapsed"));
    await patchPrefs({ panel: { header: { fold: false } } });
    await eventually(page, () => !document.getElementById("rr-panel").classList.contains("rr-collapsed") && document.querySelector('[data-act="collapse"]').hidden);
    assert.equal(await page.locator("#rr-panel .rr-body").isVisible(), true, "with no fold button a panel folded earlier is open: it could not be opened again");
    await patchPrefs({ panel: { header: { settings: false } } });
    await eventually(page, () => document.querySelector(".rr-head").hidden);
    await patchPrefs({ panel: { header: { name: true, settings: true, fold: true } } });
    await eventually(page, () => document.getElementById("rr-panel").classList.contains("rr-collapsed") && !document.querySelector(".rr-head").hidden);
    await page.click('[data-act="collapse"]');
    await eventually(page, () => !document.getElementById("rr-panel").classList.contains("rr-collapsed"));
    // the table: the title, the totals, the "not ranked" column, the Other row, the note
    assert.ok((await count(".rr-matrix th.rr-col-total")) === 1 && (await count('.rr-matrix tr[data-role="middle"]')) === 1 && (await count('.rr-matrix button[data-tier="none"]')) > 0);
    await patchPrefs({ panel: { table: { total: false, unranked: false, other: false, note: false, title: false } } });
    await eventually(page, () => !document.querySelector(".rr-matrix th.rr-col-total") && !document.querySelector('.rr-matrix button[data-tier="none"]') && !document.querySelector('.rr-matrix tr[data-role="middle"]'));
    assert.deepEqual([await count(".rr-matrix .rr-total"), await count(".rr-matrix tfoot tr"), await page.locator('[data-rr="note"]').isHidden(), await count(".rr-summary .rr-sec-title")], [0, 0, true, 0], "no totals, no note, no title");
    assert.equal(await count(".rr-matrix thead th"), 1 + 3, "only the rank columns are left (and the empty corner)");
    await patchPrefs({ panel: { table: { total: true, unranked: true, other: true, note: true, title: true } } });
    await eventually(page, () => document.querySelector(".rr-matrix th.rr-col-total") && document.querySelector('.rr-matrix tr[data-role="middle"]') && !document.querySelector('[data-rr="note"]').hidden);
    // the order of the buttons and of the parts, and the quick filters
    await patchPrefs({ panel: { copy: { order: ["csv", "json"] }, order: ["metrics", "table"], filters: { pills: { order: ["first", "ccfA"], cites100: false } } } });
    await eventually(page, () => document.querySelector('[data-rr="export-row"] button').dataset.act === "copy-csv");
    assert.deepEqual((await page.locator('[data-rr="export-row"] button').evaluateAll((els) => els.map((e) => e.dataset.act))).slice(0, 3), ["copy-csv", "copy-json", "copy-summary"], "the copy buttons in the order of the settings");
    assert.deepEqual((await sectionOrder()).slice(0, 2), ["metrics", "table"], "the parts in the order of the settings");
    assert.deepEqual((await page.locator("#rr-panel .rr-spill").evaluateAll((els) => els.map((e) => e.dataset.pill))).filter((id) => id !== "award"), ["first", "ccfA"], "the quick filters: in order, those that are off left out");
    await setList(opts, "ccf", false);
    await eventually(page, () => !document.querySelector('.rr-spill[data-pill="ccfA"]'));
    await setList(opts, "ccf", true);
    await patchPrefs({ panel: { order: prefsLib.defaults().panel.order, copy: { order: prefsLib.COPY_BUTTONS }, filters: { pills: { order: prefsLib.PILLS, cites100: true } } } });
    await eventually(page, () => document.querySelector('[data-rr="export-row"] button').dataset.act === "copy-summary" && document.querySelector('.rr-spill[data-pill="ccfA"]'));
    // the filters: each thing has its switch, and a filter whose control goes is cleared
    await page.fill(".rr-search-input", "role:first");
    await eventually(page, () => document.querySelector('[data-rr="filterbar"]') && !document.querySelector('[data-rr="filterbar"]').hidden);
    await patchPrefs({ panel: { filters: { bar: false } } });
    await eventually(page, () => document.querySelector('[data-rr="filterbar"]').hidden);
    assert.ok((await visibleRows(page)) < 20, "the bar is only the words about the filter: it filters without it");
    await patchPrefs({ panel: { filters: { bar: true, search: false, pills: { ccfA: false, cites100: false, first: false, award: false } } } });
    await eventually(page, () => document.querySelector(".rr-search").hidden && document.querySelector(".rr-search-pills").hidden);
    assert.equal(await visibleRows(page), 20, "search words with no box and no quick filter left to undo them are cleared");
    await patchPrefs({ panel: { filters: { search: true, pills: { ccfA: true, cites100: true, first: true, award: true } } } });
    await eventually(page, () => !document.querySelector(".rr-search").hidden && !document.querySelector(".rr-search-pills").hidden);
    await page.mouse.click(2, 2);                                                   // (the search box's suggestions are open over the year list: a click elsewhere closes them)
    await pickYear(page, "year-start", rows20.map((p) => p.year).filter(Boolean).sort()[Math.floor(rows20.length / 2)]);
    assert.ok((await visibleRows(page)) < 20, "a year range filters");
    await patchPrefs({ panel: { filters: { years: false }, years: { show: false } } });
    await eventually(page, () => document.querySelector(".rr-year").hidden);
    assert.equal(await visibleRows(page), 20, "a year range with no dropdown and no bar to undo it is cleared");
    // a one-year filter is never left without a control: the chart goes when nothing is highlighted, and the year filter goes with it
    await patchPrefs({ panel: { filters: { years: false, bar: false }, years: { show: true } } });
    await eventually(page, () => document.querySelector(".rr-bar:not([disabled])") && document.querySelector(".rr-bar:not([disabled])").offsetParent);
    const aYear = await page.locator(".rr-bar:not([disabled])").first().getAttribute("data-year");
    await page.locator(`.rr-bar[data-year="${aYear}"]`).click();
    await eventually(page, () => document.querySelectorAll('.rr-bar[aria-pressed="true"]').length === 1);
    assert.ok((await visibleRows(page)) < 20, "a bar filters to its year");
    await patchPrefs({ roles: { first: false, cofirst: false, second: false, last: false } });
    await eventually(page, () => document.querySelector('[data-rr="years"]').hidden);
    assert.equal(await visibleRows(page), 20, "no highlighted paper, no chart: the year filter that only a bar could undo is gone with it");
    await patchPrefs({ roles: { first: true, cofirst: true, second: true, last: true }, panel: { filters: { years: true, bar: true } } });
    await eventually(page, () => !document.querySelector('[data-rr="years"]').hidden && document.querySelector(".rr-bar") && !document.querySelector(".rr-year").hidden);
    await patchPrefs({ panel: { filters: { years: true, only: false }, years: { show: true } } });
    await eventually(page, () => !document.querySelector(".rr-year").hidden && document.querySelector('[data-act="only"]').closest(".rr-row").hidden);
    await patchPrefs({ panel: { filters: { only: true } } });
    // the citation totals and the year chart
    assert.equal(await count(".rr-m"), 4);
    await patchPrefs({ panel: { metrics: { title: false, scope: false, papers: false, h: false, of: false }, years: { title: false, axis: false } } });
    await eventually(page, () => document.querySelectorAll('[data-rr="metrics"] .rr-m').length === 2 && !document.querySelector(".rr-bars-axis"));
    assert.deepEqual([await count('[data-rr="metrics"] .rr-sec-title'), await count('[data-rr="metrics"] .rr-scope'), await count('[data-rr="metrics"] .rr-m .rr-faint'), await count('[data-rr="years"] .rr-sec-title')], [0, 0, 0, 0]);
    await patchPrefs({ panel: { metrics: { title: true, scope: true, papers: true, h: true, of: true }, years: { title: true, axis: true } } });
    await eventually(page, () => document.querySelectorAll('[data-rr="metrics"] .rr-m').length === 4 && document.querySelector(".rr-bars-axis"));
    // the h-index papers: the button goes with its switch, and so does the filter it made
    await page.click('[data-metric="mH"]');
    await eventually(page, () => document.querySelector('[data-metric="mH"][aria-pressed="true"]'));
    assert.ok((await visibleRows(page)) < 20);
    await patchPrefs({ panel: { metrics: { h: false } } });
    await eventually(page, () => !document.querySelector('[data-metric="mH"]'));
    assert.equal(await visibleRows(page), 20, "the papers behind the h-index are shown again when its button goes");
    await patchPrefs({ panel: { metrics: { h: true }, names: { add: false } } });
    await eventually(page, () => document.querySelector('[data-rr="variants"]').hidden);
    await patchPrefs({ panel: { names: { add: true } } });
    await eventually(page, () => !document.querySelector('[data-rr="variants"]').hidden);
    ok("every thing the panel draws has its own switch (title bar, table, totals, filters, citation totals, year chart, name help), the parts and the buttons follow their order, and a filter whose control goes is cleared");

    // -- S3c2. a call does not apply what the settings leave without a control (and says so), the exports follow what is drawn, a table with no rank column keeps its total,
    // and a panel with nothing in it is no frame on the page
    {
      await patchPrefs({ panel: { filters: { show: false, bar: false }, metrics: { show: false } } });
      await eventually(page, () => document.querySelector('[data-rr="filters"]').hidden && document.querySelector('[data-rr="metrics"]').hidden);
      const gone = await pageCall("filter", { query: "ccf:a", minCitations: 500, impact: "h" });
      assert.ok(gone.ok, JSON.stringify(gone));
      assert.deepEqual([...gone.result.ignored].sort(), ["impact", "minCitations", "query"], "the filters that have no control are said to be left out");
      assert.equal(gone.result.shown, gone.result.total, "and are not applied: nothing could undo them");
      await patchPrefs({ panel: { filters: { show: true, search: false, bar: true } } });
      await eventually(page, () => document.querySelector(".rr-search").hidden && !document.querySelector(".rr-search-pills").hidden);
      const kept = await pageCall("filter", { query: "role:first learning" });
      assert.equal(kept.result.filters.query, "role:first", "with no search box the words of a quick filter stay (a button takes them off), the others do not");
      assert.deepEqual(kept.result.ignored, ["query"]);
      const upper = await pageCall("filter", { query: "CCF:A learning" });
      assert.equal(upper.result.filters.query, "ccf:a", "the words that stay are the quick filters' own, in lower case: a button can take them off");
      // your own filter with no search box: its words stay while all are there; a built-in button that takes one out takes the rest with it (no button would show them)
      await pageCall("clearFilters");
      await patchPrefs({ panel: { filters: { searches: { search1: "ccf:a cites:>10" } } } });
      const ownBtn = page.locator('#rr-panel .rr-spill[data-pill="search1"]');
      await ownBtn.waitFor();
      await ownBtn.click();
      await eventually(page, () => document.querySelector('#rr-panel .rr-spill[data-pill="search1"]').getAttribute("aria-pressed") === "true");
      const pressed = await pageCall("filter", {});
      assert.equal(pressed.result.filters.query, "ccf:a cites:>10", "pressed: its words, though no box shows them");
      assert.ok(pressed.result.shown > 0 && pressed.result.shown < pressed.result.total, JSON.stringify(pressed.result));
      await page.locator('#rr-panel .rr-spill[data-pill="ccfA"]').click();
      await eventually(page, () => document.querySelector('#rr-panel .rr-spill[data-pill="search1"]').getAttribute("aria-pressed") === "false");
      const left = await pageCall("filter", {});
      assert.deepEqual([left.result.filters.query, left.result.shown], ["", left.result.total], "CCF A taken out: cites:>10, which no button shows, goes too; every row is back");
      await patchPrefs({ panel: { filters: { searches: { search1: "" } } } });
      await pageCall("clearFilters");
      await patchPrefs({ panel: { filters: { search: true }, metrics: { show: true } } });
      await eventually(page, () => !document.querySelector(".rr-search").hidden);
      const spaced = await pageCall("filter", { query: "role:first   cites:>1" });
      assert.deepEqual([spaced.result.ignored, spaced.result.filters.query], [[], "role:first cites:>1"], "a query with extra spaces is not reported as left out");
      const anyYear = await pageCall("filter", { yearStart: 2099, yearEnd: 2099, query: "" });
      assert.deepEqual(anyYear.result.ignored, [], "with the year list on, any year can be asked for: the list shows it and can undo it");
      await pageCall("clearFilters");
      await patchPrefs({ panel: { filters: { years: false } } });
      await eventually(page, () => document.querySelector(".rr-year").hidden);
      const year = await pageCall("filter", { yearStart: 2099, yearEnd: 2099, query: "" });
      assert.deepEqual([...year.result.ignored].sort(), ["yearEnd", "yearStart"], "a year with no bar to undo it is left out and said so");
      assert.equal(year.result.shown, year.result.total);
      const barYear = Number(await page.locator(".rr-bar:not([disabled])").first().getAttribute("data-year"));
      const viaBar = await pageCall("filter", { yearStart: barYear, yearEnd: barYear });
      assert.deepEqual([viaBar.result.ignored, viaBar.result.shown < viaBar.result.total], [[], true], "a year the chart has a bar for is kept: the bar undoes it");
      await pageCall("clearFilters");
      await patchPrefs({ panel: { filters: { years: true } } });
      await eventually(page, () => !document.querySelector(".rr-year").hidden);
      const noHtml = await pageCall("export", { format: "bibtex", html: true });
      assert.ok(noHtml.ok && !("html" in noHtml.result), "a format with no HTML has no html key");
      const img = await pageCall("export", { format: "image" });
      assert.match(img.result.png, /^data:image\/png;base64,.{200}/, "Copy as image: the table as a PNG");
      assert.match(img.result.text, /Papers by role/, "with the summary text beside it");
      const gbHtml = await pageCall("export", { format: "gbt", html: true });
      assert.match(gbHtml.result.html, /<b>STOICA I<\/b>/, "GB/T for a word processor: the owner's name in bold");
      assert.doesNotMatch(gbHtml.result.text, /<b>/, "and the text has no mark");
      await pageCall("clearFilters");
      await eventually(page, () => !document.querySelector(".rr-search").hidden && !document.querySelector('[data-rr="metrics"]').hidden);
      // the exports follow what is drawn: a list that no chip and no tab shows is not used, whatever the call asks for
      await patchPrefs({ rows: { core: false }, panel: { table: { core: false } } });
      await eventually(page, () => !document.querySelector('.rr-chip[data-kind="core"]'));
      const noCore = await pageCall("export", { format: "summary", source: "core" });
      assert.match(noCore.result.text, /Papers by role and rank \(CCF\)/, "a rank list nothing draws is not used by the summary");
      await patchPrefs({ rows: { core: true }, panel: { table: { core: true } } });
      // a table with no rank column has no number but the total: it is drawn whatever the switch says
      await patchPrefs({ rows: { ccf: false, core: false }, panel: { table: { ccf: false, core: false, total: false } } });
      await eventually(page, () => document.querySelector(".rr-matrix th.rr-col-total") && document.querySelectorAll(".rr-matrix .rr-total").length > 0);
      await patchPrefs({ rows: { ccf: true, core: true }, panel: { table: { ccf: true, core: true, total: true } } });
      await eventually(page, () => document.querySelector('.rr-chip[data-kind="ccf"]') && document.querySelectorAll(".rr-matrix thead th").length > 3);
      // a panel with nothing in it is hidden, not an empty frame
      const parts = { table: true, copy: true, marks: true, filters: true, metrics: true, years: true, venues: false, status: true, names: true };
      await patchPrefs({ panel: { header: { name: false, settings: false, fold: false }, ...Object.fromEntries(Object.keys(parts).map((k) => [k, { show: false }])) } });
      await eventually(page, () => document.querySelector("#rr-panel").hidden);
      await patchPrefs({ panel: { header: { name: true, settings: true, fold: true }, ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, { show: v }])) } });
      await eventually(page, () => !document.querySelector("#rr-panel").hidden && document.querySelector('[data-rr="metrics"]'));
      ok("a call leaves out (and reports) the filters the settings left without a control; the exports use only a list that is drawn; a table with no rank column keeps its total; a panel with nothing in it is hidden");
    }

    // -- S3c2b. one chip where both lists rank a venue: the list the settings prefer, and the other one only where it has no rank for the venue (`rows.prefer`; CCF first by default).
    // The tooltip names the other rank; the venue list and the notes of the BibTeX and Markdown copies follow; the table, the search and the table copies keep both lists.
    {
      const pg = await context.newPage();                                              // (a page of its own: the checks after this one count on the first twenty papers of `page`)
      await pg.goto(fx.url);
      await pg.waitForSelector("#rr-panel");
      const call = (method, params) => pg.evaluate(([m, pa]) => new Promise((resolve) => {
        const id = "c" + Math.random();
        const on = (e) => { if (e.detail.id === id) { document.removeEventListener("better-scholar:response", on); resolve(e.detail); } };
        document.addEventListener("better-scholar:response", on);
        document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { id, method: m, params: pa } }));
      }), [method, params]);
      await patchPrefs({ rows: { ccf: true, core: true }, panel: { show: true, table: { show: true, ccf: true, core: true }, venues: { show: true }, filters: { show: true }, copy: { show: true }, status: { show: true, loaded: true } } });
      await eventually(pg, () => document.querySelector('[data-act="load-all"]') || document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length >= 100);
      if (await pg.locator('[data-act="load-all"]').count()) {                        // (the first 20 papers have no venue that only CORE ranks)
        await pg.click('[data-act="load-all"]');
        await pg.waitForFunction(() => !document.querySelector('[data-act="load-all"]') && document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length >= 100);
      }
      const nRows = await pg.locator("#gsc_a_b tr.gsc_a_tr").count();
      const want = expected({ owner: profile.owner, rows: profile.rows.slice(0, nRows) });
      const tally = (pred) => want.filter((p) => pred(p.venue)).length;
      const both = tally((v) => v.ccf && v.core), coreOnly = tally((v) => v.core && !v.ccf), ccfOnly = tally((v) => v.ccf && !v.core);
      assert.ok(both >= 5 && ccfOnly >= 1 && coreOnly >= 1, `the profile has papers at venues both lists rank (${both}), only CCF ranks (${ccfOnly}) and only CORE ranks (${coreOnly}) — all loaded: ${nRows}`);
      const drawn = async (mode, ccfN, coreN) => {
        await patchPrefs({ rows: { prefer: mode } });
        await eventually(pg, ([a, b]) => document.querySelectorAll('#gsc_a_b .rr-chip[data-kind="ccf"]').length === a && document.querySelectorAll('#gsc_a_b .rr-chip[data-kind="core"]').length === b, [ccfN, coreN]);
      };
      const exported = async (format) => (await call("export", { format })).result.text;
      const times = (text, word) => (text.match(new RegExp(word, "g")) || []).length;
      const venueTitles = () => pg.locator('#rr-panel [data-venue]').evaluateAll((els) => els.map((e) => e.title));
      // the default is CCF first: CCF's chip, and CORE's where CCF has none
      await drawn("ccf", both + ccfOnly, coreOnly);
      assert.equal(await pg.locator('#gsc_a_b .rr-chip[data-kind="ccf"][data-also="core"]').count(), both, "a CCF chip that stands for both lists says so");
      const tip = await pg.locator('#gsc_a_b .rr-chip[data-kind="ccf"][data-also="core"]').first().getAttribute("title");
      assert.match(tip, /^CCF [ABC] · .+\nCORE (A\*|A|B|C) · /, "…and its tooltip names the CORE rank too");
      assert.equal(await pg.locator('#gsc_a_b .rr-chip[data-kind="core"][data-also]').count(), 0);
      assert.ok((await venueTitles()).every((t) => !(t.includes("CCF") && t.includes("CORE"))), "the venue list names one list for a venue");
      const md = await exported("markdown");
      assert.equal(times(md, "CORE"), coreOnly, "the Markdown notes: CORE only where CCF has no rank");
      assert.equal(times(md, "CCF"), both + ccfOnly);
      assert.equal(times(await exported("bibtex"), "CORE "), coreOnly, "…and the BibTeX notes");
      const tsv = (await exported("papers")).split("\n").map((l) => l.split("\t")), at = tsv[0].indexOf("CORE");
      assert.ok(at > 0 && tsv.slice(1).filter((r) => r[at]).length === both + coreOnly, "the table copy keeps a column for each list: both ranks stay");
      assert.ok((await call("export", { format: "json" })).result.text.includes('"core"'), "…and so does the JSON");
      // CORE first: the other way round
      await drawn("core", ccfOnly, both + coreOnly);
      assert.equal(await pg.locator('#gsc_a_b .rr-chip[data-kind="core"][data-also="ccf"]').count(), both);
      assert.match(await pg.locator('#gsc_a_b .rr-chip[data-kind="core"][data-also="ccf"]').first().getAttribute("title"), /\nCCF [ABC] · /);
      assert.equal(times(await exported("markdown"), "CCF"), ccfOnly);
      // both lists: both chips, as before
      await drawn("both", both + ccfOnly, both + coreOnly);
      assert.equal(await pg.locator('#gsc_a_b .rr-chip[data-also]').count(), 0);
      assert.ok((await venueTitles()).some((t) => t.includes("CCF") && t.includes("CORE")), "the venue list names both");
      // the search is not narrowed by what a chip leaves out: a CORE filter finds the papers at CORE's venues, whichever chip they wear
      await drawn("ccf", both + ccfOnly, coreOnly);
      const coreAStar = tally((v) => v.core && v.core.rank === "A*");
      assert.ok(coreAStar > coreOnly, "the profile has papers at venues CORE ranks A* that CCF ranks too");
      await pg.locator('#rr-panel input[data-act="filter-query"]').fill("core:a*");
      await eventually(pg, (n) => [...document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")].filter((tr) => !tr.classList.contains("rr-hide")).length === n, coreAStar);
      await call("clearFilters");
      // the settings page: the same choice, and the preview draws what the page will
      await opts.bringToFront();
      const previewChips = (kind) => opts.locator(`#preview .rr-chip[data-kind="${kind}"]`).count();
      await eventually(opts, () => document.querySelector('input[data-pref="rows.prefer"][value="ccf"]').checked);
      assert.deepEqual([await previewChips("ccf"), await previewChips("core")], [3, 1], "the preview: CCF's chip where CCF ranks the venue, CORE's where only it does");
      await opts.click('label.seg-btn:has(input[data-pref="rows.prefer"][value="core"])');
      await eventually(opts, () => document.querySelectorAll('#preview .rr-chip[data-kind="ccf"]').length === 0);
      assert.deepEqual([await previewChips("ccf"), await previewChips("core")], [0, 4]);
      await opts.click('label.seg-btn:has(input[data-pref="rows.prefer"][value="both"])');
      await eventually(opts, () => document.querySelectorAll('#preview .rr-chip[data-kind="ccf"]').length === 3 && document.querySelectorAll('#preview .rr-chip[data-kind="core"]').length === 4);
      await opts.click('label.seg-btn:has(input[data-pref="rows.prefer"][value="ccf"])');
      await eventually(opts, () => document.querySelectorAll('#preview .rr-chip[data-kind="core"]').length === 1);
      await settle(opts);
      assert.equal((await stored(opts, "sync", "prefs")).rows.prefer, "ccf");
      // a list that is not drawn is not left out for the sake of one that is
      await patchPrefs({ rows: { core: false }, panel: { table: { core: false } } });
      await eventually(pg, ([a]) => document.querySelectorAll('#gsc_a_b .rr-chip[data-kind="ccf"]').length === a && !document.querySelector('.rr-chip[data-kind="core"]'), [both + ccfOnly]);
      await patchPrefs({ rows: { core: true }, panel: { table: { core: true } } });
      await patchPrefs({ rows: { prefer: "both" }, panel: { venues: { show: false } } });          // (the checks that follow count the chips of both lists, and the venue list is off by default)
      await drawn("both", both + ccfOnly, both + coreOnly);
      await pg.close();
      ok("one chip where both lists rank a venue: CCF first by default, CORE first or both on request; the tooltip names the other rank, the venue list and the Markdown/BibTeX notes follow, the table, the JSON and the search keep both lists; the settings preview shows it");
    }

    // -- S3c3. the counts follow the filters: a year range narrows the table, the awards counts and the panel's copy summary and table (which say what they counted); the cell picked in
    // the table narrows no count; the toolbar popup's and the page calls' numbers stay over every paper; with the setting off nothing follows
    {
      await pageCall("clearFilters");
      await patchPrefs({ roles: { first: true, cofirst: true, second: true, last: true }, panel: { show: true, table: { show: true }, marks: { show: true }, copy: { show: true, summary: true, table: true }, filters: { show: true, years: true, follow: true, bar: true }, years: { show: true } } });
      await eventually(page, () => document.querySelector(".rr-matrix") && !document.querySelector(".rr-year").hidden && document.querySelector('[data-act="copy-summary"]') && document.querySelector('[data-act="copy-table"]'));
      const rowsOf = (role) => page.locator(`#gsc_a_b tr.gsc_a_tr.rr-r-${role}:not(.rr-hide)`).count();
      const tableIsRows = async (what) => {
        const m = await readMatrix(page);
        for (const role of ["first", "second", "last"]) assert.equal(m[role].total, await rowsOf(role), `${what}: the ${role}-author row of the table is the number of ${role}-author rows shown`);
        return m;
      };
      const sum = (m) => Object.entries(m).filter(([k]) => k !== "hidden").reduce((n, [, r]) => n + r.total, 0);
      const marksCount = () => page.evaluate(() => [...document.querySelectorAll("#rr-panel [data-mark-group] b")].reduce((n, b) => n + parseInt(b.textContent, 10), 0));
      const flavours = () => page.evaluate(async () => { const out = {}; for (const item of await navigator.clipboard.read()) for (const type of item.types) out[type] = await (await item.getType(type)).text(); return out; });
      const copied = async (kind) => {
        await page.click(`[data-act="copy-${kind}"]`);
        await eventually(page, (k) => document.querySelector(`[data-act="copy-${k}"]`).classList.contains("rr-btn-flashed"), kind);
        return flavours();
      };
      const whole = await tableIsRows("no filter");
      const marksWhole = await marksCount();
      const total = (await pageCall("papers", { filtered: false })).result.total;
      const years = (await page.$$eval("#gsc_a_b tr.gsc_a_tr .gsc_a_y", (els) => els.map((e) => parseInt(e.textContent, 10)).filter(Boolean))).sort((a, b) => a - b);
      const from = years[Math.floor(years.length / 2)];
      await pickYear(page, "year-start", from);
      await eventually(page, () => document.querySelector("#gsc_a_b tr.gsc_a_tr.rr-hide"));
      const narrow = await tableIsRows(`from ${from}`);
      assert.ok(sum(narrow) < sum(whole), "a year range narrows the table");
      const marksNarrow = await marksCount();
      assert.ok(marksNarrow <= marksWhole, "and the awards and talks counts");
      assert.deepEqual(Object.keys(narrow), Object.keys(whole), "the table keeps its rows under a filter");
      // the cell picked in the table does not narrow the table (it is where it is picked); the list is the cell's papers within the years
      const cell = 'button.rr-cell[data-role="last"][data-tier="A"]';
      await page.click(cell);
      await eventually(page, () => document.querySelector('button.rr-cell[data-role="last"][data-tier="A"][aria-pressed="true"]'));
      assert.deepEqual(await readMatrix(page), narrow, "a cell picked in the table leaves the table as it was");
      assert.equal(await marksCount(), marksNarrow, "and the awards and talks counts");
      assert.equal(await visibleRows(page), narrow.last.A, "and lists the papers of that cell within the years chosen");
      await page.click(cell);
      await eventually(page, () => !document.querySelector('button.rr-cell[aria-pressed="true"]'));
      // what the "not ranked" column holds is on its header: preprints, secondary tracks, other venues — and adds up to the column's total
      const noneTitle = await page.locator('#rr-panel th button[data-tier="none"]').getAttribute("title");
      const parts = [...noneTitle.matchAll(/(?:Preprints|Secondary tracks|Other venues) (\d+)/g)].map((x) => Number(x[1]));
      assert.ok(parts.length >= 1, "the header says: " + noneTitle);
      assert.equal(parts.reduce((a, b) => a + b, 0), Object.entries(narrow).filter(([k]) => k !== "hidden").reduce((n, [, r]) => n + (r.none || 0), 0), "and the kinds add up to the column's total: " + noneTitle);
      // the h-index filter: the counts take its minimum without the picks (a cell leaves them as they were), while the button, with a cell picked, still lists the papers behind its own number
      await page.click('[data-metric="mH"]');
      await eventually(page, () => document.querySelector('[data-metric="mH"][aria-pressed="true"]'));
      const withH = await readMatrix(page);
      await page.click(cell);
      await eventually(page, () => document.querySelector('button.rr-cell[data-role="last"][data-tier="A"][aria-pressed="true"]'));
      assert.deepEqual(await readMatrix(page), withH, "a pick, with the h-index papers listed, leaves the counts as they were");
      if (narrow.last.A) assert.ok((await visibleRows(page)) > 0, "and the button still lists the papers behind its own number");
      await page.click(cell);
      await page.click('[data-metric="mH"]');
      await eventually(page, () => !document.querySelector('[data-metric="mH"][aria-pressed="true"]') && !document.querySelector('button.rr-cell[aria-pressed="true"]'));
      // what the copy buttons put on the clipboard says what it counted
      const shown = await visibleRows(page);
      const scope = `Showing ${shown} of ${total} papers · ${from}–…`;
      const summaryText = (await copied("summary"))["text/plain"].split("\n");
      assert.equal(summaryText[1], scope, "the copied summary says what it counted: " + summaryText.slice(0, 2).join(" | "));
      if (narrow.first.total) assert.ok(summaryText.some((l) => l.startsWith(`First author: ${narrow.first.total} `)), "and has the numbers of the table: " + summaryText.join(" | "));
      const tab = await copied("table");
      const lines = tab["text/plain"].split("\n");
      assert.ok(lines.indexOf(scope) > 1, "the copied table has it as a line under it (the notes of where it is from follow)");
      assert.ok(tab["text/html"].includes(`<caption>${scope}</caption>`), "and as the caption of the real table");
      // the toolbar popup and the page calls count every paper unless asked
      const everyone = await pageCall("export", { format: "table" });
      assert.ok(!/Showing/.test(everyone.result.text), "the page call counts every paper");
      assert.ok((await pageCall("export", { format: "table", filtered: true })).result.text.includes(scope), "unless `filtered` is asked for");
      assert.equal((await pageCall("summary")).result.summaries.ccf.papers, total, "the summary call, and so the popup, counts every paper");
      const mine = (await pageCall("summary", { filtered: true })).result;
      assert.deepEqual([mine.loaded, mine.counted, mine.summaries.ccf.papers, mine.summaries.ccf.rows.find((r) => r.role === "first").total], [total, shown, shown, narrow.first.total], "and what the panel counts when asked");
      // two quick filters of one operator are "either": First author and Last author give role:first,last, not two words that nothing can satisfy
      await patchPrefs({ panel: { filters: { pills: { last: true } } } });
      await eventually(page, () => document.querySelector('.rr-spill[data-pill="last"]'));
      await page.click('.rr-spill[data-pill="first"]');
      await page.click('.rr-spill[data-pill="last"]');
      await eventually(page, () => document.querySelector(".rr-search-input").value === "role:first,last");
      assert.deepEqual(await page.locator('.rr-spill[aria-pressed="true"]').evaluateAll((els) => els.map((e) => e.dataset.pill).sort()), ["first", "last"], "both buttons show as pressed");
      assert.equal(await visibleRows(page), (await rowsOf("first")) + (await rowsOf("last")), "the papers where you are the first or the last author");
      assert.ok((await visibleRows(page)) > 0, "and there are some");
      await page.click('.rr-spill[data-pill="first"]');
      await eventually(page, () => document.querySelector(".rr-search-input").value === "role:last");
      await page.click('.rr-spill[data-pill="last"]');
      await patchPrefs({ panel: { filters: { pills: { last: false } } } });
      await pageCall("clearFilters");
      // the autocomplete completes the value under the caret in a list and leaves the rest of the word alone
      const box = ".rr-search-input";
      await page.fill(box, "role:,last");
      await page.press(box, "Home");
      for (let i = 0; i < 5; i++) await page.press(box, "ArrowRight");
      await page.keyboard.type("fi");
      await eventually(page, () => document.querySelector('.rr-suggest-item[data-op="role:first"]'));
      assert.deepEqual(await page.locator(".rr-suggest-item").evaluateAll((els) => els.map((e) => e.dataset.op)), ["role:first"], "the values that begin so, and not the one the word has already");
      await page.press(box, "ArrowDown");
      await page.press(box, "Enter");
      assert.equal(await page.inputValue(box), "role:first,last", "the value under the caret was completed, the rest of the word stayed");
      assert.equal(await page.evaluate(() => document.querySelector(".rr-search-input").selectionStart), 10, "and the caret is after the completed value");
      await pageCall("clearFilters");
      // the quick filter "Last 5 years" is age:<5: the papers of this year and the four before it, and the table is theirs
      await pageCall("clearFilters");
      await patchPrefs({ panel: { filters: { pills: { recent: true } } } });
      await eventually(page, () => document.querySelector('.rr-spill[data-pill="recent"]'));
      await page.click('.rr-spill[data-pill="recent"]');
      await eventually(page, () => document.querySelector('.rr-spill[data-pill="recent"][aria-pressed="true"]'));
      assert.equal(await page.inputValue(".rr-search-input"), "age:<5", "the pill puts its operator in the search box");
      const thisYear = new Date().getFullYear();
      const rowYears = await page.$$eval("#gsc_a_b tr.gsc_a_tr .gsc_a_y", (els) => els.map((e) => parseInt(e.textContent, 10)));
      assert.equal(await visibleRows(page), rowYears.filter((y) => y > thisYear - 5).length, "it keeps the papers of this year and the four before it");
      await tableIsRows("the last five years");
      await page.click('.rr-spill[data-pill="recent"]');
      await patchPrefs({ panel: { filters: { pills: { recent: false } } } });
      await pageCall("clearFilters");
      // the setting off: the table, the counts and the copied text are of every paper again
      await pickYear(page, "year-start", from);
      await eventually(page, () => document.querySelector("#gsc_a_b tr.gsc_a_tr.rr-hide"));
      await patchPrefs({ panel: { filters: { follow: false } } });
      await eventually(page, (n) => document.querySelector('tr[data-role="first"] .rr-total').textContent === String(n), whole.first.total);
      assert.deepEqual(await readMatrix(page), whole, "with the setting off the table counts every paper");
      assert.ok(!(await copied("summary"))["text/plain"].includes("Showing"), "and the copied summary does not say it counted less");
      await patchPrefs({ panel: { filters: { follow: true } } });
      await pageCall("clearFilters");
      await eventually(page, () => !document.querySelector("#gsc_a_b tr.gsc_a_tr.rr-hide"));
      // the line about papers whose list lacks the profile's name lists them (a click), and says so in the filter bar
      const absentCount = Number((await page.locator('[data-rr="absent"] button').textContent()).match(/\d+/)[0]);
      await page.click('[data-rr="absent"] button');
      await eventually(page, (n) => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr:not(.rr-hide)").length === n, absentCount);
      assert.match(await page.locator(".rr-fb-what").textContent(), /Name not in the author list/, "the filter bar names it");
      assert.equal(await page.locator('[data-rr="absent"] button').getAttribute("aria-pressed"), "true");
      assert.deepEqual(await readMatrix(page), whole, "the table stays as it was: the pick narrows no count");
      await page.click('[data-rr="absent"] button');
      await eventually(page, () => !document.querySelector("#gsc_a_b tr.gsc_a_tr.rr-hide"));
      // the copied summary says where it is from: the profile's link without anything else of the address, and the day
      await pageCall("clearFilters");
      const withSource = (await copied("summary"))["text/plain"].split("\n");
      const sourceLine = withSource.find((l) => l.startsWith("Source: "));
      assert.match(sourceLine, /^Source: http:\/\/127\.0\.0\.1:\d+\/citations\?user=[^&\s·]+ · \d{4}-\d{2}-\d{2}$/, "the profile's link (nothing else) and the day: " + sourceLine);
      assert.ok(withSource.includes(`Not fully loaded: ${total} papers so far`), "a list that is not all loaded says so (this page has its first twenty): " + withSource.join(" | "));
      assert.ok((await copied("table"))["text/html"].includes("<p>Source: "), "and the table has it under it");
      await patchPrefs({ panel: { copy: { source: false } } });
      await page.waitForTimeout(700);                                                  // (the page takes the new settings from the storage event)
      assert.ok(!(await copied("summary"))["text/plain"].includes("Source: "), "the switch takes it away");
      await patchPrefs({ panel: { copy: { source: true } } });
      await page.waitForTimeout(700);
      // the search looks into every name of a list that "Read full lists" has read, not only the line the page cut
      const fullPapers = (await pageCall("papers", { filtered: false })).result.papers;
      const domLines = await page.$$eval("#gsc_a_b tr.gsc_a_tr", (trs) => trs.map((tr) => ({ title: tr.querySelector("a.gsc_a_at").textContent.trim(), line: (tr.querySelector(".gs_gray").textContent || "").toLowerCase() })));
      const target = fullPapers.map((p) => {
        const dom = domLines.find((d) => d.title === p.title);
        const word = dom && p.authors.split(/,\s*/).map((n) => n.trim().split(/\s+/).pop().toLowerCase()).find((w) => /^[a-z]{4,}$/.test(w) && !dom.line.includes(w));
        return word ? { title: p.title, word } : null;
      }).find(Boolean);
      assert.ok(target, "a paper whose whole author list has a name that the page's line lacks");
      await page.fill(".rr-search-input", target.word);
      await eventually(page, (t) => [...document.querySelectorAll("#gsc_a_b tr.gsc_a_tr:not(.rr-hide) a.gsc_a_at")].some((a) => a.textContent.trim() === t), target.title);
      await pageCall("clearFilters");
      // a script on the page cannot press the panel's buttons: the click it makes is ignored, a person's is not
      await page.evaluate(() => document.querySelector('.rr-spill[data-pill="ccfA"]').click());
      await page.waitForTimeout(400);
      assert.equal(await page.inputValue(".rr-search-input"), "", "a click made by a script does nothing");
      await page.click('.rr-spill[data-pill="ccfA"]');
      await eventually(page, () => document.querySelector(".rr-search-input").value === "ccf:a");
      await page.click('.rr-spill[data-pill="ccfA"]');
      await eventually(page, () => document.querySelector(".rr-search-input").value === "");
      ok("the counts follow the filters: a year range narrows the table, the awards counts and the copied summary and table (which say what they counted); the picked cell narrows no count; the popup and the page calls count every paper; the setting off restores it; a click a script makes presses no button");
    }

    // -- S3d. names: the person's own words for a title or a name on the screen, in every language; what a machine reads keeps the standard words
    const nameOf = async (key, words) => { const f = opts.locator(`input[data-pref="labels.${key}"]`); await f.fill(words); await f.press("Enter"); await settle(opts); };
    await opts.bringToFront();
    await nameOf("metricsTitle", "My papers");
    await nameOf("roleFirst", "Lead");
    await nameOf("copySummary", "My summary");
    await nameOf("marksTitle", "Prizes");
    await eventually(page, () => document.querySelector('[data-rr="metrics"] .rr-sec-title').textContent === "My papers" && document.querySelector('[data-act="copy-summary"]').textContent === "My summary");
    assert.match(await page.locator('#rr-panel tr[data-role="first"] .rr-rolebtn').textContent(), /Lead/, "the role is named in the table…");
    assert.equal((await page.locator('#rr-panel .rr-spill[data-pill="first"]').textContent()).trim(), "Lead", "…and in its quick filter");
    assert.match(await page.locator('[data-rr="metrics"] .rr-scope').textContent(), /^Lead, /, "…and in the line that says which positions count");
    await opts.bringToFront();
    assert.equal((await opts.locator('#pv-panel [data-rr="metrics"] .rr-sec-title').textContent()).trim(), "My papers", "the preview follows");
    assert.equal((await opts.locator('label:has(input[data-pref="panel.copy.summary"]) .name').textContent()).trim(), "My summary", "a switch is named by what it shows");
    assert.equal(await opts.locator('input[data-pref="labels.copySummary"]').getAttribute("placeholder"), "Copy summary", "the field says what the standard name is");
    const popupNames = async () => { const pc = await context.newPage(); try { await pc.goto(`chrome-extension://${extId}/popup/popup.html`); const tab = await pc.evaluate(async () => { for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } } return null; }); await pc.goto(`chrome-extension://${extId}/popup/popup.html?tab=${tab}`); await pc.waitForSelector(".who"); return await pc.evaluate(() => ({ buttons: [...document.querySelectorAll(".actions button")].map((b) => b.textContent.trim()), rows: [...document.querySelectorAll("tbody th")].map((e) => e.textContent.trim()) })); } finally { await pc.close(); } };
    const popupNow = await popupNames();
    assert.ok(popupNow.buttons.includes("My summary") && popupNow.rows.includes("Lead"), "the popup uses the names too: " + JSON.stringify(popupNow));
    // what a machine reads keeps the standard words
    await page.bringToFront();
    await page.click('[data-act="copy-summary"]');
    const summaryText = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(summaryText, /First author/);
    assert.doesNotMatch(summaryText, /Lead|Prizes|My papers/, "the copied summary has the standard words");
    await page.click('[data-act="copy-json"]');
    assert.doesNotMatch(await page.evaluate(() => navigator.clipboard.readText()), /Lead|Prizes|My papers/);
    // a name beats the translation, whatever the language: Japanese everywhere but where the person chose the words
    const ja = JSON.parse(fs.readFileSync(path.join(repo, "src/_locales/ja/messages.json"), "utf8"));
    await opts.bringToFront();
    await opts.selectOption('select[data-pref="language"]', "ja");
    await page.waitForFunction((x) => { const e = document.querySelector('[data-rr="years"] .rr-sec-title'); return e && e.textContent === x; }, ja.yearsTitle.message, { timeout: 15000 });
    await page.waitForSelector("html[data-rr-ready]");
    await pollPage(opts, () => document.documentElement.lang === "ja", null, 15000);
    assert.equal((await page.locator('[data-rr="metrics"] .rr-sec-title').textContent()).trim(), "My papers", "a name is shown in every language");
    assert.equal((await page.locator('[data-rr="years"] .rr-sec-title').textContent()).trim(), ja.yearsTitle.message, "what has no name of its own is in the language");
    assert.equal((await opts.locator('#pv-panel [data-rr="metrics"] .rr-sec-title').textContent()).trim(), "My papers");
    assert.equal(await opts.locator('input[data-pref="labels.copySummary"]').getAttribute("placeholder"), ja.copySummary.message, "the field says what the language's standard name is");
    await opts.selectOption('select[data-pref="language"]', "auto");
    await page.waitForFunction(() => { const e = document.querySelector('[data-rr="years"] .rr-sec-title'); return e && e.textContent === "Highlighted papers by year"; }, null, { timeout: 15000 });
    await page.waitForSelector("html[data-rr-ready]");
    await pollPage(opts, () => document.documentElement.lang === "en", null, 15000);
    // "back to the standard name" brings the standard text back, and an empty field is the same
    await opts.locator('label:has(input[data-pref="panel.copy.summary"]) .name-reset').click();
    await settle(opts);
    await opts.locator('input[data-pref="labels.roleFirst"]').fill("");
    await opts.locator('input[data-pref="labels.roleFirst"]').press("Enter");
    await settle(opts);
    await opts.locator('input[data-pref="labels.metricsTitle"]').fill("x".repeat(40));
    assert.equal(await opts.locator('input[data-pref="labels.metricsTitle"]').inputValue(), "x".repeat(30), "a name is cut at 30 characters");
    await opts.locator('input[data-pref="labels.metricsTitle"]').press("Escape");
    assert.equal(await opts.locator('input[data-pref="labels.metricsTitle"]').inputValue(), "My papers", "Escape gives the old name back");
    await opts.locator('input[data-pref="labels.metricsTitle"]').fill("");
    await opts.locator('input[data-pref="labels.metricsTitle"]').press("Enter");
    await opts.locator('input[data-pref="labels.marksTitle"]').fill("");
    await opts.locator('input[data-pref="labels.marksTitle"]').press("Enter");
    await settle(opts);
    await eventually(page, () => document.querySelector('[data-rr="metrics"] .rr-sec-title').textContent === "Highlighted papers" && document.querySelector('[data-act="copy-summary"]').textContent === "Copy summary");
    assert.deepEqual(Object.values((await stored(opts, "sync", "prefs")).labels).filter(Boolean), [], "every name is back to the standard");
    ok("names: your own words for a title, a column or a button, on the page, in the preview and in the popup, in every language, while the exports keep the standard words");

    // -- S3d2. what is typed is kept even if the page is left first, and two settings pages do not undo each other (an older write of this page is not the other page's echo)
    {
      const second = await openOptions(context);
      await second.bringToFront();
      await second.fill('input[data-pref="labels.metricsTitle"]', "Typed only");                       // (no Enter, no leaving the field: the name is saved as it is typed)
      await settle(second);
      assert.equal((await stored(second, "sync", "prefs")).labels.metricsTitle, "Typed only", "a name typed and not confirmed is stored");
      await second.fill('input[data-pref="labels.metricsTitle"]', "");
      await settle(second);
      assert.equal((await stored(second, "sync", "prefs")).labels.metricsTitle, "");
      // A turns "Papers by year" off and on again; B (the other page) turns it off: A follows B, and A's next change does not bring the old state back
      await setPref(opts, "panel.years.show", false);
      await setPref(opts, "panel.years.show", true);
      await opts.waitForTimeout(400);
      await setPref(second, "panel.years.show", false);
      await opts.bringToFront();
      await opts.waitForFunction(() => !document.querySelector('input[data-pref="panel.years.show"]').checked, null, { timeout: 5000 });
      await setPref(opts, "panel.venues.show", true);
      assert.equal((await stored(opts, "sync", "prefs")).panel.years.show, false, "the change of the other page is still there after this page wrote something else");
      await setPref(opts, "panel.venues.show", false);
      await setPref(opts, "panel.years.show", true);
      await second.close();
      ok("settings: a name is saved as it is typed; a change made on another settings page is followed and not undone by this page's next change");
    }

    // -- S3e. the look of the chips: a style, a shape, the words of the rank chips, a colour for each family, and ready-made looks
    // (a colour mixed by the stylesheet is reported as color(srgb …): painted on a canvas it is read back as plain rgb)
    const chipStyleOn = (pg, sel) => pg.locator(sel).first().evaluate((el) => {
      const px = (c) => { const x = document.createElement("canvas").getContext("2d"); x.clearRect(0, 0, 1, 1); x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return d[3] === 0 ? "transparent" : d[3] === 255 ? `rgb(${d[0]}, ${d[1]}, ${d[2]})` : `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3]})`; };
      const c = getComputedStyle(el), k = el.querySelector(".rr-k");
      return { color: px(c.color), bg: px(c.backgroundColor), border: px(c.borderTopColor), radius: c.borderTopLeftRadius, k: k ? getComputedStyle(k).display : "" };
    });
    const chipStyle = (sel) => chipStyleOn(page, sel);
    const previewChip = async (sel) => { await opts.bringToFront(); return chipStyleOn(opts, "#preview " + sel); };       // (the settings page's preview has award and talk chips, whatever the profile has)
    const rank = '.rr-chip[data-kind="ccf"][data-tier="A"]';
    const plain = await chipStyle(rank);
    assert.deepEqual([plain.color, plain.bg, plain.radius], ["rgb(51, 69, 168)", "rgb(255, 255, 255)", "9px"], "the built-in look: indigo on white, rounded");
    await patchPrefs({ chips: { style: "soft" } });
    await eventually(page, () => document.documentElement.classList.contains("rr-chips-soft"));
    const soft = await chipStyle(rank);
    assert.ok(soft.bg !== "rgb(255, 255, 255)" && soft.border === "transparent" && soft.color === plain.color, "soft: a tint, no outline: " + JSON.stringify(soft));
    await patchPrefs({ chips: { style: "solid" } });
    await eventually(page, () => document.documentElement.classList.contains("rr-chips-solid"));
    const solid = await chipStyle(rank);
    assert.deepEqual([solid.bg, solid.color], ["rgb(51, 69, 168)", "rgb(255, 255, 255)"], "solid: the colour as a background, white text");
    await pollPage(opts, () => document.documentElement.classList.contains("rr-chips-solid"));
    assert.equal((await previewChip(".rr-chip-mark-award")).color, "rgb(16, 18, 22)", "…and readable text on the gold of an award");
    await patchPrefs({ chips: { style: "text" } });
    await eventually(page, () => document.documentElement.classList.contains("rr-chips-text"));
    const textOnly = await chipStyle(rank);
    assert.deepEqual([textOnly.bg, textOnly.border, textOnly.color], ["transparent", "transparent", "rgb(51, 69, 168)"], "text only: no box");
    await patchPrefs({ chips: { style: "outline", shape: "square", label: "tier" } });
    await eventually(page, () => document.documentElement.classList.contains("rr-chips-square") && document.documentElement.classList.contains("rr-chips-tier"));
    const shaped = await chipStyle(rank);
    assert.deepEqual([shaped.radius, shaped.k], ["3px", "none"], "square, and the tier alone (the list's name is hidden)");
    assert.match(await page.locator(rank).first().getAttribute("title"), /CCF A/, "the tooltip still names the list");
    await patchPrefs({ chips: { shape: "pill", label: "full" }, colors: { ccf: "#0f766e", award: "#7c3aed" } });          // (a colour that reads on its own: a lighter pick is darkened for the text, see palette.test.js)
    await eventually(page, () => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = getComputedStyle(document.querySelector('.rr-chip[data-kind="ccf"][data-tier="A"]')).color; x.fillRect(0, 0, 1, 1); return Array.from(x.getImageData(0, 0, 1, 1).data).slice(0, 3).join() === "15,118,110"; });
    assert.equal((await chipStyle('.rr-chip[data-kind="core"][data-tier="A"], .rr-chip[data-kind="core"][data-tier="A*"]')).color, "rgb(51, 69, 168)", "a colour is for one family: CORE keeps its own");
    await pollPage(opts, () => getComputedStyle(document.documentElement).getPropertyValue("--rr-award-fill").trim() === "#7c3aed");
    assert.notEqual((await previewChip(".rr-chip-mark-award")).color, "rgb(107, 74, 0)", "the award chips are in the picked colour");
    // a ready-made look replaces all of it; the button of the look in force is marked
    await opts.bringToFront();
    await settle(opts);
    await opts.click('[data-chip-theme="lists"]');
    await settle(opts);
    const listsInk = [1, 3, 5].map((k) => parseInt(paletteLib.vars("ccf", "#2563eb")["--rr-ccf-1-ink"].slice(k, k + 2), 16)).join();          // (the look's CCF text: the picked blue, darkened a little where it would not read on the soft tint)
    await eventually(page, (want) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = getComputedStyle(document.querySelector('.rr-chip[data-kind="ccf"][data-tier="A"]')).color; x.fillRect(0, 0, 1, 1); return document.documentElement.classList.contains("rr-chips-soft") && Array.from(x.getImageData(0, 0, 1, 1).data).slice(0, 3).join() === want; }, listsInk);
    assert.equal(await opts.locator('[data-chip-theme="lists"]').evaluate((el) => el.classList.contains("active")), true);
    await opts.click('[data-chip-theme="outline"]');
    await settle(opts);
    await eventually(page, () => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = getComputedStyle(document.querySelector('.rr-chip[data-kind="ccf"][data-tier="A"]')).color; x.fillRect(0, 0, 1, 1); return !document.documentElement.classList.contains("rr-chips-soft") && Array.from(x.getImageData(0, 0, 1, 1).data).slice(0, 3).join() === "51,69,168"; });
    assert.deepEqual([(await stored(opts, "sync", "prefs")).chips, Object.values((await stored(opts, "sync", "prefs")).colors).slice(4)], [{ style: "outline", shape: "pill", label: "full" }, ["", "", "", ""]], "the built-in look: nothing of the others is left");
    assert.deepEqual(await opts.evaluate(() => [...document.querySelectorAll(".chip-theme")].flatMap((b) => { const br = b.getBoundingClientRect(); return [...b.querySelectorAll(".rr-chip")].filter((c) => c.getBoundingClientRect().right > br.right - 1).map((c) => b.dataset.chipTheme + ": " + c.textContent); })), [], "no chip on a look's button runs out of the button");
    ok("the look of the chips: outline, soft, solid and text only; rounded or square; the list's name or the tier alone; a colour for each family; ready-made looks that replace the look in force");

    // -- S4. the toolbar popup follows the settings
    await setList(opts, "ccf", false);
    await eventually(page, () => !document.querySelector('.rr-chip[data-kind="ccf"]'));
    const pop = await context.newPage();
    await pop.goto(`chrome-extension://${extId}/popup/popup.html`);
    const profileTab = await pop.evaluate(async () => {
      for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
      return null;
    });
    await pop.goto(`chrome-extension://${extId}/popup/popup.html?tab=${profileTab}`);
    await pop.waitForSelector(".who");
    assert.equal(await pop.locator(".seg").count(), 0);
    assert.equal((await pop.textContent(".src")).trim(), "CORE");
    assert.equal(await pop.locator("table").count(), 1);
    await pop.close();
    // the table's switch applies to the popup too: no table, no data note (the copy buttons have their own switches); the name and paper count stay
    await setPref(opts, "panel.table.show", false);
    await eventually(page, () => document.querySelector('[data-rr="matrix"]').closest(".rr-sec").hidden);
    const pop2 = await context.newPage();
    await pop2.goto(`chrome-extension://${extId}/popup/popup.html?tab=${profileTab}`);
    await pop2.waitForSelector(".who");
    assert.equal(await pop2.locator("table, .note, .seg").count(), 0);
    assert.equal(await pop2.locator(".actions button").count(), 8, "the copy buttons do not depend on the table");
    await pop2.close();
    await setPref(opts, "panel.table.show", true);
    await setList(opts, "ccf", true);
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

    // -- S6. a stored record with a wrong part is read as far as it is right: the wrong part falls back to its default
    await opts.evaluate(async () => {
      await chrome.storage.sync.set({ prefs: { roles: { first: true, cofirst: true, second: true, last: false }, rows: { core: false, name: false, style: "stripes" }, panel: "no", bogus: 1 } });
      await chrome.storage.local.set({ ui: { collapsed: true, source: "core" } });
    });
    await page.reload();
    await page.waitForSelector("#rr-panel");
    assert.equal(await page.locator("tr.rr-r-last").count(), 0);
    assert.equal(await page.locator('.rr-chip[data-kind="core"]').count(), 0);
    assert.equal(await page.locator(".rr-name").count(), 0);
    assert.ok(await page.locator("tr.rr-r-first").count() > 0, "the parts that are right are used: first-author rows are coloured");
    assert.ok(await page.evaluate(() => document.getElementById("rr-panel").classList.contains("rr-collapsed")));
    assert.ok(await page.locator('[data-rr="matrix"]').count() > 0, "a panel record that is no record at all: every part is on");
    ok("a stored record with wrong parts is read as far as it is right, the rest is the defaults");

    } else {
      // (E2E_PART=3: the state the sections before S7 leave — the whole list loaded, the cut author lists read, and of the settings only these three switches off;
      // measured at S7's start, 2026-10-29. If an earlier section comes to leave another, S7 says so: run E2E_PART=1 and E2E_PART=3, and the whole run)
      await page.click('[data-act="load-all"]');
      await page.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100, null, { timeout: 15000 });
      all = expected(profile);
      await page.bringToFront();
      await page.click('[data-act="resolve"]');
      await page.waitForFunction(() => !document.querySelector('tr[data-role="hidden"]'), null, { timeout: 20000 });
      opts = await openOptions(context);
      await opts.evaluate(async () => { const B = RolesRanks; await chrome.storage.sync.set({ prefs: B.prefs.apply(B.prefs.defaults(), { roles: { last: false }, rows: { name: false, core: false } }).prefs }); });
      await settle(opts);
    }

    if (PART !== "1") {
    // -- S7. the settings page: preview, reset, clearing the saved paper details
    await opts.reload();
    await opts.waitForSelector('input[data-pref="roles.last"]');
    assert.equal(await opts.locator("#preview tr").count(), 4);
    assert.equal(await opts.locator("#preview tr.rr-r-last").count(), 0, "the preview reflects the stored 'last' switch");
    assert.equal(await opts.locator('#preview .rr-chip[data-kind="core"]').count(), 0);
    assert.equal(await opts.locator("#preview .rr-name").count(), 0);
    // quick settings search filter
    const optSearch = opts.locator(".opt-search");
    assert.equal(await optSearch.count(), 1, "settings search filter exists");
    await optSearch.fill("core");
    assert.equal(await opts.locator("#card-chips").isVisible(), true, "the chips card matches the core query");
    assert.equal(await opts.locator("#card-language").isVisible(), false, "language card is hidden");
    await optSearch.press("Escape");
    assert.equal(await optSearch.inputValue(), "");
    assert.equal(await opts.locator("#card-language").isVisible(), true, "escape restores cards");

    await opts.click('[data-act="reset"]');
    await opts.click('[data-act="reset-cancel"]');                        // (it asks on the page: "No" leaves the settings alone)
    assert.equal(await opts.locator('[data-act="reset"]').count(), 1);
    assert.equal(await opts.evaluate(() => document.activeElement && document.activeElement.dataset.act), "reset", "the focus goes back to the Reset button");
    await opts.keyboard.press("Enter");                                   // (asks again) ... and Escape says no, with the focus back on the button
    assert.equal(await opts.locator('[data-act="reset-cancel"]').count(), 1);
    await opts.keyboard.press("Escape");
    assert.equal(await opts.locator('[data-act="reset-confirm"]').count(), 0, "Escape does not reset");
    assert.equal(await opts.evaluate(() => document.activeElement && document.activeElement.dataset.act), "reset");
    await opts.click('[data-act="reset"]');
    await opts.click('[data-act="reset-confirm"]');
    await eventually(opts, () => document.querySelectorAll("#preview tr.rr-r-last").length === 1);
    assert.deepEqual(await stored(opts, "sync", "prefs"), prefsLib.defaults());
    assert.equal(await opts.locator("#preview tr[class*='rr-r-']").count(), 4);
    assert.equal(await opts.locator("#preview .rr-name").count(), 4);
    assert.ok((await opts.locator("#preview .rr-chip-mark").count()) >= 4);
    await setMark(opts, "award", false);
    assert.equal(await opts.locator("#preview .rr-chip-mark-award").count(), 0);
    await setMark(opts, "award", true);
    // the preview holds the real panel, and each of its parts has its own switch
    assert.equal(await opts.locator('#pv-panel #rr-panel [data-rr="matrix"] table').count(), 1);
    for (const [part, sel] of [["table", '[data-rr="matrix"]'], ["marks", '[data-rr="marks"]'], ["filters", '[data-rr="filters"]'], ["metrics", '[data-rr="metrics"]'], ["status", '[data-rr="coverage"] [data-act="load-all"]'], ["names", '[data-rr="variants"]']]) {
      assert.equal(await opts.locator("#pv-panel " + sel).first().isVisible(), true, `${part} shows by default`);
      await setPref(opts, `panel.${part}.show`, false);
      await opts.locator("#pv-panel " + sel).first().waitFor({ state: "hidden", timeout: 8000 }).catch(() => assert.fail(`${part} switch hides it in the preview`));   // (the preview is drawn once the setting is saved: a moment)
      for (const other of ["table", "marks", "filters", "metrics"]) if (other !== part) assert.equal(await opts.locator(`#pv-panel [data-rr="${other === "table" ? "matrix" : other}"]`).first().isVisible(), true, `${other} stays when ${part} goes`);
      await setPref(opts, `panel.${part}.show`, true);
      await opts.locator("#pv-panel " + sel).first().waitFor({ state: "visible", timeout: 8000 });
    }
    // the venue list is off until asked and then lists the sample venues; the year bars follow their switch
    assert.equal(await opts.locator('#pv-panel [data-rr="venues"]').first().isVisible(), false, "the venue list is off by default in the preview too");
    await setPref(opts, "panel.venues.show", true);
    await opts.locator('#pv-panel [data-rr="venues"]').first().waitFor({ state: "visible", timeout: 8000 });
    assert.ok((await opts.locator('#pv-panel [data-rr="venues"] [data-venue]').count()) >= 3, "the preview lists sample venues");
    await setPref(opts, "panel.venues.show", false);
    await opts.locator('#pv-panel [data-rr="venues"]').first().waitFor({ state: "hidden", timeout: 8000 });
    assert.equal(await opts.locator('#pv-panel [data-rr="years"]').first().isVisible(), true);
    await setPref(opts, "panel.years.show", false);
    await opts.locator('#pv-panel [data-rr="years"]').first().waitFor({ state: "hidden", timeout: 8000 });
    await setPref(opts, "panel.years.show", true);
    // the settings follow the preview: with everything switched on, the panel's parts and the things in them are in the order of the settings, top to bottom
    // (the chips and the name mark are in every row and the "of N" in every number, so only the panel's own parts have one place each)
    await opts.evaluate(async () => { const B = RolesRanks, r = await chrome.storage.sync.get("prefs"); const all = B.prefs.apply(r.prefs, B.prefs.PRESETS.all).prefs; await chrome.storage.sync.set({ prefs: B.prefs.apply(all, { panel: { filters: { pills: Object.fromEntries(B.prefs.PILLS.map((id) => [id, true])), searches: { search1: "ccf:a", search2: "role:first", search3: "has:award" } } } }).prefs }); });
    await pollPage(opts, () => document.querySelectorAll("#pv-panel .rr-spill").length === 13 && document.querySelector("#pv-panel [data-rr=\"venues\"]") && !document.querySelector("#pv-panel [data-rr=\"venues\"]").hidden);
    const panelPaths = prefsLib.SETTINGS.map((x) => x.path).filter((x) => x.startsWith("panel.") && x !== "panel.metrics.of" && !x.startsWith("panel.filters.searches."));          // (the words of your own quick filters are no part: their button is)
    const where = await opts.evaluate((paths) => {
      const aside = document.querySelector(".preview"), base = aside.getBoundingClientRect();
      return paths.map((p) => { const el = aside.querySelector(`#pv-panel [data-rr-part="${p}"]`); if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width && !r.height) return null; return { p, y: Math.round(r.top - base.top + aside.scrollTop), x: Math.round(r.left - base.left) }; }).filter(Boolean);
    }, panelPaths);
    const missing = panelPaths.filter((x) => !where.some((w) => w.p === x));
    assert.deepEqual(missing.filter((x) => !["panel.show", "panel.order", "panel.filters.bar", "panel.copy.order", "panel.filters.pills.order", "panel.marks.grouping", "panel.filters.follow", "panel.copy.source"].includes(x)), [], "every part of the panel is drawn in the preview, so that it can be pointed at");
    for (let i = 1; i < where.length; i++) {
      const a = where[i - 1], b = where[i];
      assert.ok(b.y > a.y + 6 || (b.y >= a.y - 6 && b.x >= a.x - 2), `the settings follow the preview: ${a.p} (${a.y}, ${a.x}) comes before ${b.p} (${b.y}, ${b.x})`);
    }
    await opts.evaluate(async () => { const B = RolesRanks, r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: B.prefs.apply(r.prefs, { panel: { venues: { show: false }, filters: { pills: B.prefs.defaults().panel.filters.pills, searches: B.prefs.defaults().panel.filters.searches } } }).prefs }); });
    await pollPage(opts, () => document.querySelectorAll("#pv-panel .rr-spill").length === 4);
    ok("the settings are in the order of the preview: the parts of the panel and the things in them, top to bottom");
    // -- the preview is edited from itself, as well as from the controls: ✕ hides a thing, a rail hides or moves a part, a double-click renames, a tray shows again
    await opts.setViewportSize({ width: 1360, height: 1500 });
    await opts.bringToFront();
    const resetPreview = async () => { await settle(opts); await opts.evaluate(async () => { const B = RolesRanks, r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: B.prefs.apply(r.prefs, { panel: { show: true, order: B.prefs.defaults().panel.order, copy: { order: B.prefs.COPY_BUTTONS }, venues: { show: false } } }).prefs }); }); };
    await opts.hover("#pv-panel th.rr-col-total");
    await opts.locator(".pv-tag .pv-x").click();
    await settle(opts);
    assert.equal(await opts.isChecked('input[data-pref="panel.table.total"]'), false, "a thing hidden on the preview: the switch on the left follows");
    assert.equal(await opts.locator("#pv-panel th.rr-col-total").count(), 0);
    await opts.locator(".pv-tray summary").click();
    await opts.locator('.pv-chip[data-restore="panel.table.total"]').click();
    await settle(opts);
    assert.equal(await opts.locator("#pv-panel th.rr-col-total").count(), 1, "the tray shows it again");
    // a part: hidden from its rail
    await opts.hover('#pv-panel [data-section="metrics"] .rr-sec-title');
    await opts.locator(".pv-rail .pv-x").click();
    await settle(opts);
    assert.equal(await opts.isChecked('input[data-pref="panel.metrics.show"]'), false);
    assert.equal(await opts.locator('#pv-panel [data-section="metrics"]').isVisible(), false);
    await opts.locator('.pv-chip[data-restore="panel.metrics.show"]').click();
    await settle(opts);
    assert.equal(await opts.locator('#pv-panel [data-section="metrics"]').isVisible(), true);
    // a part: moved by the grip of its rail (the copy row goes under the awards and talks)
    const drag = async (from, to, toAt) => {
      const a = await from.boundingBox(), b = await to.boundingBox();
      await opts.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await opts.mouse.down();
      await opts.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 6, { steps: 3 });
      await opts.mouse.move(b.x + b.width / 2, toAt === "after" ? b.y + b.height - 3 : b.y + 3, { steps: 12 });
      await opts.mouse.up();
    };
    await opts.hover('#pv-panel [data-section="copy"]', { position: { x: 4, y: 4 } });
    await drag(opts.locator(".pv-rail .pv-grip"), opts.locator('#pv-panel [data-section="marks"]'), "after");
    await settle(opts);
    assert.deepEqual((await stored(opts, "sync", "prefs")).panel.order.slice(0, 3), ["table", "marks", "copy"], "a part moved by its grip: the order of the settings follows");
    assert.deepEqual(await opts.locator("#pv-panel .rr-body > [data-section]").evaluateAll((els) => els.filter((e) => !e.hidden).map((e) => e.dataset.section).slice(0, 3)), ["table", "marks", "copy"], "…and the preview");
    assert.deepEqual(await opts.locator('.order-list[data-pref="panel.order"] li').evaluateAll((els) => els.map((e) => e.dataset.id).slice(0, 3)), ["table", "marks", "copy"], "…and the list on the left");
    // (no box on the settings page much taller than what it holds: in a row that stacks its name over its control — an order list, a row of choices — the name's
    // 10rem flex basis had become its height, a blank of 140 px under nine names)
    const stretched = await opts.evaluate(() => [...document.querySelectorAll("#controls *")].filter((el) => {
      const r = el.getBoundingClientRect(), kids = [...el.children].filter((c) => c.offsetParent !== null);
      if (r.height < 60 || !kids.length || el.offsetParent === null) return false;
      const cs = getComputedStyle(el), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      return r.height - (Math.max(...kids.map((c) => c.getBoundingClientRect().bottom)) - Math.min(...kids.map((c) => c.getBoundingClientRect().top))) - pad > 40;
    }).map((el) => el.tagName.toLowerCase() + "." + String(el.className).replace(/ /g, ".") + " " + el.textContent.trim().slice(0, 30)));
    assert.deepEqual(stretched, [], "no box of the settings page is much taller than its content");
    // a button: moved by the grip in its tag (CSV before the first)
    await opts.hover('#pv-panel [data-act="copy-csv"]');
    await drag(opts.locator(".pv-tag .pv-grip"), opts.locator('#pv-panel [data-act="copy-summary"]'), "before");
    await settle(opts);
    assert.equal((await stored(opts, "sync", "prefs")).panel.copy.order[0], "csv", "a button moved by its grip");
    assert.equal(await opts.locator('#pv-panel [data-rr="export-row"] button').first().getAttribute("data-act"), "copy-csv");
    // Escape gives a drag up
    await opts.hover('#pv-panel [data-section="copy"]', { position: { x: 4, y: 4 } });
    const grip = await opts.locator(".pv-rail .pv-grip").boundingBox();
    await opts.mouse.move(grip.x + 4, grip.y + 4); await opts.mouse.down(); await opts.mouse.move(grip.x + 4, grip.y + 400, { steps: 8 }); await opts.keyboard.press("Escape"); await opts.mouse.up();
    await settle(opts);
    assert.deepEqual((await stored(opts, "sync", "prefs")).panel.order.slice(0, 3), ["table", "marks", "copy"], "Escape: nothing moved");
    // the pencil is for a thing's own name: a sample row has none (the chips inside it have theirs, and are things of their own)
    await opts.hover('#preview tr[data-rr-part="roles.first"] td > a');
    await opts.locator(".pv-tag .pv-x").waitFor({ state: "visible", timeout: 8000 });
    assert.equal(await opts.locator(".pv-tag .pv-edit").count(), 0, "a row of the sample list offers no rename: its chips are not its name");
    // a name: a double-click, an input over the text, Enter
    await opts.dblclick('#pv-panel [data-rr="metrics"] .rr-sec-title');
    assert.equal(await opts.getAttribute(".pv-rename-input", "dir"), "auto", "the rename box takes its text's direction");
    await opts.locator(".pv-rename-input").fill("Output");
    await opts.locator(".pv-rename-input").press("Enter");
    await settle(opts);
    assert.equal((await stored(opts, "sync", "prefs")).labels.metricsTitle, "Output");
    assert.equal(await opts.inputValue('input[data-pref="labels.metricsTitle"]'), "Output", "the field on the left follows");
    assert.equal((await opts.locator('#pv-panel [data-rr="metrics"] .rr-sec-title').textContent()).trim(), "Output");
    await opts.hover('#pv-panel [data-rr="metrics"] .rr-sec-title');
    await opts.locator(".pv-tag .pv-edit").click();                                         // (the pencil does the same as the double-click; an empty box is the standard name)
    await opts.locator(".pv-rename-input").fill("");
    await opts.locator(".pv-rename-input").press("Enter");
    await settle(opts);
    assert.equal((await stored(opts, "sync", "prefs")).labels.metricsTitle, "", "an empty name: the standard one");
    await opts.dblclick('#pv-panel [data-rr="metrics"] .rr-sec-title');
    await opts.locator(".pv-rename-input").fill("Cancelled");
    await opts.locator(".pv-rename-input").press("Escape");
    await settle(opts);
    assert.equal((await stored(opts, "sync", "prefs")).labels.metricsTitle, "", "Escape: the name is not kept");
    // (a built-in text longer than a name may be, opened and left as it was, stays the built-in text — not a cut copy saved as a name)
    await opts.dblclick('#pv-panel [data-rr-label="variantsTitle"]');
    assert.equal(await opts.locator(".pv-rename-input").inputValue(), "Name not matching? Add a spelling");
    await opts.locator(".pv-rename-input").press("Enter");
    await settle(opts);
    assert.equal((await stored(opts, "sync", "prefs")).labels.variantsTitle, "", "left as it was: nothing saved");
    // from the preview to its setting: the ⚙ on a part's rail, and a double-click on anything that is not a name
    await opts.hover('#pv-panel [data-section="years"] .rr-sec-title');
    await opts.locator(".pv-rail .pv-go").click();
    await pollPage(opts, () => document.activeElement && document.activeElement.dataset.pref === "panel.years.show");
    assert.equal(await opts.locator("#card-years .opt-flash").count(), 1, "the row of the setting flashes");
    await opts.mouse.move(5, 5);
    await opts.locator('#preview tr[data-rr-part="roles.last"]').dblclick({ position: { x: 30, y: 40 } });
    await pollPage(opts, () => document.activeElement && document.activeElement.dataset.pref === "roles.last");
    // from a setting to what it draws: the part is outlined while the pointer is on the setting (and the name's field points at the text)
    await opts.hover('label:has(input[data-pref="panel.copy.json"])');
    assert.equal(await opts.locator('#pv-panel [data-act="copy-json"]').evaluate((el) => el.classList.contains("pv-hot")), true, "a setting points at what it draws");
    await opts.hover('.opt:has(input[data-pref="labels.mH"])');
    assert.equal(await opts.locator('#pv-panel [data-metric="mH"] [data-rr-label]').evaluate((el) => el.classList.contains("pv-hot")), true, "so does a name's field: the text it names");
    await opts.mouse.move(5, 5);
    assert.equal(await opts.locator(".pv-hot").count(), 0);
    await opts.locator('[data-act="reset"]').click(); await opts.locator('[data-act="reset-confirm"]').click(); await settle(opts);
    await resetPreview();
    await opts.setViewportSize({ width: 1360, height: 900 });
    ok("the preview is edited from itself: ✕ hides a thing, a rail hides or moves a part, a grip moves a button, a double-click renames, the tray shows a thing again, and a setting points at what it draws");

    // the two shortcuts: compact (filters and citation totals only) and everything
    await opts.click('[data-act="panel-compact"]');
    const compact = (await stored(opts, "sync", "prefs")).panel;
    assert.deepEqual(prefsLib.SECTIONS.map((id) => compact[id].show), [false, false, false, true, true, false, false, false, false]);
    assert.equal(await opts.locator('#pv-panel [data-rr="matrix"]').first().isVisible(), false);
    assert.equal(await opts.locator('#pv-panel [data-rr="metrics"]').first().isVisible(), true);
    await opts.click('[data-act="all-on"][data-group="panel"]');       // (the panel card's Enable all)
    await pollPage(opts, async () => { const p = (await chrome.storage.sync.get("prefs")).prefs.panel; return ["table", "copy", "marks", "filters", "metrics", "years", "venues", "status", "names"].every((id) => p[id].show); });
    const everyPart = (await stored(opts, "sync", "prefs")).panel;
    assert.deepEqual([prefsLib.SECTIONS.filter((id) => !everyPart[id].show), Object.values(everyPart.header).every(Boolean)], [[], true], "Enable all brings back every part (the venue list too) and the title bar");
    await setPref(opts, "panel.show", false);
    assert.equal(await opts.locator("#pv-panel").isVisible(), false, "no panel in the preview when the panel is off");
    await opts.click('[data-act="all-on"][data-group="panel"]');       // (Enable all of the panel's parts shows the panel too)
    await pollPage(opts, async () => (await chrome.storage.sync.get("prefs")).prefs.panel.show === true);
    await pollPage(opts, () => document.querySelector('input[data-pref="panel.show"]').checked === true);
    // "Enable all" / "Disable all" under each group of switches: the group changes at once and is saved (polled: the switches re-sync after the save)
    const groups = [
      ["highlight", ["roles.first", "roles.cofirst", "roles.second", "roles.last", "rows.name"]],
      ["chips", ["rows.ccf", "rows.core", "rows.award", "rows.oral", "rows.spotlight", "rows.highlight"]],
      ["marks", ["panel.marks.show", "panel.marks.title", "panel.marks.award", "panel.marks.oral", "panel.marks.spotlight", "panel.marks.highlight"]],
      ["copy", ["panel.copy.show", ...prefsLib.COPY_BUTTONS.map((k) => "panel.copy." + k)]],
      ["panel", ["panel.header.name", "panel.header.settings", "panel.header.fold", ...prefsLib.SECTIONS.map((id) => `panel.${id}.show`)]]
    ];
    const at = (o, path) => path.split(".").reduce((x, k) => x && x[k], o);
    const beforeBulk = Object.fromEntries(await opts.$$eval("input[data-pref]", (els) => els.map((e) => [e.dataset.pref, e.checked])));
    const switchesAre = (keys, val) => pollPage(opts, ([ks, v]) => ks.every((k) => document.querySelector(`input[data-pref="${k}"]`).checked === v), [keys, val]);
    for (const [group, keys] of groups) {
      await opts.click(`[data-act="all-off"][data-group="${group}"]`);
      await switchesAre(keys, false);
      const off = await stored(opts, "sync", "prefs");
      for (const k of keys) assert.equal(at(off, k), false, `${k} is stored as off after Disable all (${group})`);
      await opts.click(`[data-act="all-on"][data-group="${group}"]`);
      await switchesAre(keys, true);
      const on = await stored(opts, "sync", "prefs");
      for (const k of keys) assert.equal(at(on, k), true, `${k} is stored as on after Enable all (${group})`);
    }
    assert.equal(await opts.isChecked('input[data-pref="panel.show"]'), true, "Disable all of the panel's parts leaves the panel's own switch alone");
    assert.equal(await opts.locator('[data-act="all-on"][data-group="panel"]').getAttribute("disabled"), null, "the panel's buttons are never disabled");
    for (const [, keys] of groups) for (const k of keys) await setPref(opts, k, beforeBulk[k]);
    assert.equal(await opts.locator('[role="group"][aria-label]').count() >= 4, true, "each group of buttons is labelled with its card");
    ok("'Enable all' / 'Disable all' under each group of switches set the whole group at once and save it");

    // the copy row: one button for each format that is on, in the panel and in the toolbar popup, whether or not the table is shown; with none on there is no row
    // the toolbar popup, aimed at the profile tab
    const openPopup = async () => {
      const pc = await context.newPage();
      await pc.goto(`chrome-extension://${extId}/popup/popup.html`);
      const tab = await pc.evaluate(async () => {
        for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
        return null;
      });
      await pc.goto(`chrome-extension://${extId}/popup/popup.html?tab=${tab}`);
      await pc.waitForSelector(".who");
      return pc;
    };
    const popupButtons = async () => {
      const pc = await openPopup();
      try { return await pc.locator(".actions button").evaluateAll((els) => els.map((e) => e.dataset.act)); } finally { await pc.close(); }
    };
    const panelButtons = () => page.locator('[data-rr="export-row"] button').evaluateAll((els) => els.map((e) => e.dataset.act));
    const ALL_COPY = prefsLib.COPY_BUTTONS.map((k) => "copy-" + k), ON_COPY = ALL_COPY.filter((a) => prefsLib.defaults().panel.copy[a.slice(5)]);          // (Copy as image, IEEE and GB/T 7714 are off until asked for)
    assert.deepEqual(await panelButtons(), ON_COPY, "the panel's copy row: every format that is on by default, in the order of the settings");
    assert.deepEqual(await popupButtons(), ON_COPY, "and the popup's");
    await setPref(opts, "panel.copy.bibtex", false);
    await setPref(opts, "panel.copy.csv", false);
    await eventually(page, () => !document.querySelector('[data-act="copy-bibtex"]') && !document.querySelector('[data-act="copy-csv"]') && !!document.querySelector('[data-act="copy-json"]'));
    assert.deepEqual(await panelButtons(), ON_COPY.filter((a) => a !== "copy-bibtex" && a !== "copy-csv"));
    assert.deepEqual(await popupButtons(), ON_COPY.filter((a) => a !== "copy-bibtex" && a !== "copy-csv"));
    await setPref(opts, "panel.table.show", false);                                    // (the row does not belong to the table)
    await eventually(page, () => document.querySelector('[data-rr="matrix"]').closest(".rr-sec").hidden && !document.querySelector('[data-rr="export-row"]').hidden);
    assert.equal(await page.locator('[data-act="copy-json"]').count(), 1, "the copy row stays without the table");
    await setPref(opts, "panel.table.show", true);
    await opts.click('[data-act="all-off"][data-group="copy"]');
    await eventually(page, () => document.querySelector('[data-rr="export-row"]').hidden === true);
    assert.deepEqual(await popupButtons(), [], "no copy button on: no row in the popup either");
    await opts.click('[data-act="all-on"][data-group="copy"]');
    await eventually(page, () => document.querySelector('[data-rr="export-row"]').hidden === false);
    assert.deepEqual(await popupButtons(), ALL_COPY);
    // the popup's own "Copy as image": the page draws the picture, the popup turns its data: address back into a picture on the clipboard
    {
      const pc = await openPopup();
      try {
        await pc.bringToFront();
        // (at most two to a row: three short English labels used to make rows of 2, 3, 2 and 1)
        const perRow = await pc.locator(".actions button").evaluateAll((els) => Object.values(els.reduce((n, e) => ({ ...n, [Math.round(e.getBoundingClientRect().top)]: (n[Math.round(e.getBoundingClientRect().top)] || 0) + 1 }), {})));
        assert.ok(perRow.every((n) => n <= 2) && perRow.filter((n) => n === 2).length >= 4, "the popup's copy buttons, two to a row: " + perRow.join(", "));
        // (every button's icon is drawn: a custom property left without its ";" swallows the next one, and the icon becomes a square of solid colour)
        const noIcon = await pc.locator(".actions button").evaluateAll((els) => els.filter((e) => !/url\(/.test(getComputedStyle(e, "::before").webkitMaskImage || getComputedStyle(e, "::before").maskImage)).map((e) => e.dataset.act));
        assert.deepEqual(noIcon, [], "every copy button of the popup has its icon");
        const panelNoIcon = await page.locator('[data-rr="export-row"] button').evaluateAll((els) => els.filter((e) => !/url\(/.test(getComputedStyle(e, "::before").webkitMaskImage || getComputedStyle(e, "::before").maskImage)).map((e) => e.dataset.act));
        assert.deepEqual(panelNoIcon, [], "and of the panel");
        await pc.click('[data-act="copy-image"]');
        await pc.locator('[data-act="copy-image"]', { hasText: "Copied" }).waitFor();
        const types = await pc.evaluate(async () => (await navigator.clipboard.read())[0].types);
        assert.ok(types.includes("image/png") && types.includes("text/plain"), "the popup's picture is on the clipboard, with its text: " + types.join(", "));
      } finally { await pc.close(); }
      await page.bringToFront();
    }
    ok("the copy row has a switch for each format, in the panel and in the popup; it stands without the table, and with none on there is no row");

    // The calls (lib/agent.js), on the extension's own messages: the toolbar popup's transport
    const call = (method, params) => opts.evaluate(async ([m, p]) => {
      for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: m, params: p }); if (r && (r.ok || r.error)) return r; } catch (e) { /* not a profile */ } }
      return null;
    }, [method, params]);
    const papersRes = await call("papers");
    assert.ok(papersRes.ok && papersRes.result.papers.length > 0 && papersRes.result.total >= papersRes.result.papers.length, "papers: the records");
    assert.deepEqual(Object.keys(papersRes.result.papers[0]).sort(), ["authors", "citations", "highlighted", "id", "marks", "me", "rank", "role", "status", "title", "type", "url", "venue", "year"]);
    const exMd = await call("export", { format: "markdown" });
    const exApa = await call("export", { format: "apa" });
    const exJson = await call("export", { format: "json" });
    assert.ok(exMd.ok && exMd.result.text.startsWith("1. **") && exApa.ok && exApa.result.text.length > 0, "export: markdown and APA");
    assert.equal(JSON.parse(exJson.result.text).total, papersRes.result.papers.length, "export json: the same papers");
    assert.match((await call("export", { format: "summary", source: "none" })).result.text, /— Papers by role · \d+ papers? loaded\n/, "export summary: by role only when asked");
    assert.equal((await call("export", { format: "docx" })).ok, false);
    assert.match((await call("export", { format: "docx" })).error, /"format" must be one of: summary, table/);
    assert.match((await call("nope")).error, /unknown method "nope"/);
    const bad = await call("filter", { yearStart: "soon" });
    assert.equal(bad.ok, false);
    assert.match(bad.error, /integer from 1000 to 3000/);
    ok("the calls of lib/agent.js over the extension's own messages: papers, export in every format, errors for what is not a call");

    // The same calls from the page: page events (an AI browsing agent, the DevTools console)
    const bridge = await page.evaluate(async () => {
      let n = 0;
      const call = (method, params) => new Promise((resolve) => {
        const id = "call-" + ++n;
        const on = (e) => { if (e.detail.id === id) { document.removeEventListener("better-scholar:response", on); resolve(e.detail); } };
        document.addEventListener("better-scholar:response", on);
        document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { id, method, params } }));
      });
      const out = { marker: document.documentElement.getAttribute("data-rr-ready") };
      out.ping = await call("ping");
      const papers = await call("papers");
      out.papers = papers.result.papers.length;
      out.summary = await call("summary");
      out.json = JSON.parse((await call("export", { format: "json" })).result.text).papers.length;
      out.filtered = await call("filter", { query: "cites:>800" });
      out.shownRows = [...document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")].filter((r) => getComputedStyle(r).display !== "none").length;
      out.badQuery = await call("filter", { query: "ccf:x" });
      out.badType = await call("filter", { minCitations: "many" });
      out.unknown = await call("settings", {});
      out.impact = await call("filter", { query: "", impact: "h" });
      out.cleared = await call("clearFilters");
      // an event that is no request, and a request with no id, are answered or ignored without harm
      document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: "junk" }));
      document.dispatchEvent(new CustomEvent("better-scholar:request"));
      out.noId = await new Promise((resolve) => { const on = (e) => { document.removeEventListener("better-scholar:response", on); resolve(e.detail); }; document.addEventListener("better-scholar:response", on); document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { method: "ping" } })); });
      return out;
    });
    assert.equal(bridge.marker, "true", "the page is told the extension is ready");
    assert.deepEqual([bridge.ping.ok, bridge.ping.id, typeof bridge.ping.result.version, bridge.ping.result.loaded > 0], [true, "call-1", "string", true], "ping: the id comes back");
    assert.equal(bridge.ping.result.version, manifest.version, "ping: the version is the manifest's");
    assert.ok(bridge.papers > 0 && bridge.json === bridge.papers, "papers and the json export agree");
    assert.ok(bridge.summary.ok && bridge.summary.result.summaries.ccf.rows.length > 0 && bridge.summary.result.shown === bridge.papers, "summary: the numbers behind the panel");
    // what each call answers is what the guide says it answers (the keys of the result, as lib/agent.js documents them)
    const documented = (doc) => { let depth = 0, cur = "", keys = []; for (const ch of /^\{ (.*?) \}(?: —|$)/.exec(doc)[1]) { if (ch === "{") depth++; if (ch === "}") depth--; if (ch === "," && depth === 0) { keys.push(cur); cur = ""; } else cur += ch; } keys.push(cur); return keys.map((k) => k.split(":")[0].trim()).sort(); };
    for (const [method, answer] of [["ping", bridge.ping], ["summary", bridge.summary], ["filter", bridge.filtered], ["clearFilters", bridge.cleared]]) assert.deepEqual(Object.keys(answer.result).sort(), documented(agentLib.METHODS[method].result), method + ": the answer has the keys the guide documents");
    assert.ok(bridge.filtered.ok && bridge.filtered.result.shown > 0 && bridge.filtered.result.shown < bridge.filtered.result.total, "filter: a query narrows the list");
    assert.equal(bridge.shownRows, bridge.filtered.result.shown, "and the page shows exactly those papers");
    assert.deepEqual(bridge.filtered.result.errors, []);
    assert.equal(bridge.badQuery.ok, true);
    assert.equal(bridge.badQuery.result.shown, 0, "an operator with a value it does not take matches nothing");
    assert.match(bridge.badQuery.result.errors[0], /^ccf:x — the venue's CCF rank/, "and says why");
    assert.equal(bridge.badType.ok, false);
    assert.match(bridge.badType.error, /"minCitations" must be an integer/);
    assert.equal(bridge.unknown.ok, false, "the settings are not reachable from the page");
    assert.match(bridge.unknown.error, /unknown method "settings"/);
    assert.ok(bridge.impact.ok && bridge.impact.result.shown > 0 && bridge.impact.result.shown <= bridge.impact.result.total, "filter: the h-index papers");
    assert.equal(bridge.cleared.result.shown, bridge.cleared.result.total, "clearFilters: every paper again");
    assert.equal(bridge.noId.id, null, "a request with no id is answered with null");
    ok("the calls of lib/agent.js from the page (better-scholar:request / response): ping, papers, summary, export, filter with a report of what could not be read, clearFilters; the settings are out of reach");

    assert.ok((await stored(opts, "local", "resolved")) !== undefined, "'Read full lists' left a cache of paper details");
    // (an entry older than 90 days is deleted when the cache is next read — "kept for 90 days" — not only left unused until a save)
    await opts.evaluate((all) => chrome.storage.local.set({ resolved: { ...all, "rr-old": { authors: "A Old, B Older", ts: Date.now() - 91 * 24 * 3600 * 1000 } } }), await stored(opts, "local", "resolved"));
    await opts.reload();
    await opts.waitForSelector('[data-act="clear-cache"]');
    assert.match(await opts.textContent(".row .note"), /^\d+ papers' author lists are saved/);
    assert.ok(!("rr-old" in (await stored(opts, "local", "resolved"))), "an entry older than 90 days is deleted when the settings page reads the cache");

    // view saved details modal
    await opts.click('[data-act="view-cache"]');
    await opts.waitForSelector(".cache-modal", { state: "visible" });
    assert.ok((await opts.locator(".cache-table tbody tr").count()) > 0, "cache modal shows cached papers");
    await opts.click('[data-act="close-cache"]');
    await opts.waitForSelector(".cache-modal", { state: "detached" });

    // presets, the configuration editor and what it reports
    await opts.click('[data-preset="all"]');
    const allPrefs = await stored(opts, "sync", "prefs");
    assert.deepEqual([allPrefs.roles.first, allPrefs.roles.last, allPrefs.mergeDuplicates, allPrefs.panel.venues.show, allPrefs.hide.access], [true, true, true, true, false]);
    assert.deepEqual(prefsLib.COPY_BUTTONS.map((k) => allPrefs.panel.copy[k]), prefsLib.COPY_BUTTONS.map(() => true));
    assert.equal(allPrefs.semanticScholar, false, "no preset switches a network call on");
    await opts.click('[data-preset="last"]');
    assert.equal((await stored(opts, "sync", "prefs")).roles.first, false);
    assert.equal((await stored(opts, "sync", "prefs")).roles.last, true);
    const status = opts.locator('[data-rr="config-status"]');
    await pollPage(opts, () => /Changes applied/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    await opts.click(".config-editor summary");
    // a patch: what is right is applied, what is not is named with the reason
    await opts.locator('[data-act="config-input"]').fill('{\n  "rows": { "style": "tint" },\n  "panel": { "years": { "show": false }, "bogus": 1, "venues": { "show": "yes" }, "order": ["names", "names"] },\n  "nope": 2,\n  "panel.copy": false\n}');
    await opts.click('[data-act="config-apply"]');
    await pollPage(opts, () => /Changes applied: 2/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    const report = await status.textContent();
    for (const part of ["panel.bogus: unknown setting", "panel.venues.show: must be true or false", "panel.order: an id is listed twice", "nope: unknown setting", "panel.copy: unknown setting"]) assert.ok(report.includes(part), part + " in: " + report);
    assert.equal(await status.evaluate((el) => el.classList.contains("bad")), true, "a report with something ignored is marked");
    const patched = await stored(opts, "sync", "prefs");
    assert.deepEqual([patched.rows.style, patched.panel.years.show, patched.panel.venues.show, "nope" in patched], ["tint", false, true, false]);
    assert.equal(await opts.isChecked('input[data-pref="panel.years.show"]'), false, "the switches follow");
    // not JSON, and the same change again
    await opts.locator('[data-act="config-input"]').fill("rows.style = bar");
    await opts.click('[data-act="config-apply"]');
    await pollPage(opts, () => /not valid JSON/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    assert.equal((await stored(opts, "sync", "prefs")).rows.style, "tint", "nothing changed");
    await opts.locator('[data-act="config-input"]').fill('{ "rows": { "style": "tint" } }');
    await opts.click('[data-act="config-apply"]');
    await pollPage(opts, () => /Nothing to change/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    await opts.locator('[data-act="config-input"]').fill("[1, 2]");
    await opts.click('[data-act="config-apply"]');
    await pollPage(opts, () => /must be a JSON object/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    ok("presets (none switches a network call on) and the configuration editor: a patch is applied and reported, what is not a setting is named, what is not JSON changes nothing");

    // the guide for AI agents: one click puts the whole reference, with this user's own settings, on the clipboard
    await opts.click('[data-act="agent-guide-copy"]');
    const guide = await opts.evaluate(() => navigator.clipboard.readText());
    assert.ok(guide.startsWith(`# Better Scholar ${manifest.version} — guide for AI agents`));
    for (const s of prefsLib.SETTINGS) assert.ok(guide.includes("`" + s.path + "`"), s.path);
    const record = JSON.parse(/### Current settings of this user\n```json\n([\s\S]*?)\n```/.exec(guide)[1]);
    assert.deepEqual(record, await stored(opts, "sync", "prefs"), "the guide carries the user's settings as they are");
    assert.ok(guide.includes("better-scholar:request") && guide.includes("`cites:>100`"));
    // …and what an agent answers goes straight into the editor
    await opts.locator('[data-act="config-input"]').fill(JSON.stringify({ rows: { style: "bar" }, panel: { copy: { csv: false } } }));
    await opts.click('[data-act="config-apply"]');
    await pollPage(opts, () => /Changes applied: 2/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    assert.deepEqual([(await stored(opts, "sync", "prefs")).rows.style, (await stored(opts, "sync", "prefs")).panel.copy.csv], ["bar", false]);
    ok("the guide for AI agents: every setting, this user's own record, the page calls; the answer applies from the editor");

    // every setting has its control on the settings page, found by its path (the guide says so), and no control names a setting that does not exist
    const controls = await opts.$$eval("[data-pref]", (els) => els.map((e) => e.dataset.pref));
    const paths = prefsLib.SETTINGS.map((s) => s.path);
    assert.deepEqual(paths.filter((p) => !controls.includes(p)), [], "a setting with no control");
    assert.deepEqual([...new Set(controls)].filter((c) => !paths.includes(c) && c !== "s2key"), [], "a control with no setting");

    // export config file download
    const [cfgDownload] = await Promise.all([
      opts.waitForEvent("download"),
      opts.click('[data-act="config-export"]')
    ]);
    assert.equal(cfgDownload.suggestedFilename(), "better-scholar-config.json");
    const cfgStream = await cfgDownload.createReadStream();
    const cfgChunks = [];
    for await (const chunk of cfgStream) cfgChunks.push(chunk);
    const cfgParsed = JSON.parse(Buffer.concat(cfgChunks).toString("utf8"));
    assert.deepEqual(cfgParsed, await stored(opts, "sync", "prefs"), "the file is the record");
    // …and a file of that shape is read back
    await opts.setInputFiles('input[type="file"]', { name: "c.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ rows: { style: "full" } })) });
    await pollPage(opts, () => /Changes applied: 1/.test(document.querySelector('[data-rr="config-status"]').textContent), null);
    assert.equal((await stored(opts, "sync", "prefs")).rows.style, "full");
    ok("configuration export downloads the record as better-scholar-config.json; a file is read back as a patch");

    await opts.click('[data-act="clear-cache"]');
    await eventually(opts, () => /^No paper details are saved/.test(document.querySelector(".row .note").textContent));
    assert.equal(await stored(opts, "local", "resolved"), undefined);
    // (the button says "Cleared" for a moment; no waitForFunction here — polling one evaluates a string, which an extension page's CSP refuses)
    await opts.bringToFront();
    for (let i = 0; i < 50 && (await opts.textContent('[data-act="clear-cache"]')) === "Cleared"; i++) await opts.waitForTimeout(100);
    await opts.evaluate(() => window.scrollTo(0, 0));
    await opts.bringToFront(); await opts.screenshot({ path: path.join(outDir, "settings.png"), fullPage: true });
    // (the README and website picture: the header, the first cards and the whole live preview, so the window is made tall for it)
    await opts.setViewportSize({ width: 1360, height: 1500 });
    for (let i = 0; i < 40 && (await opts.evaluate(() => document.querySelector(".preview").classList.contains("more"))); i++) await opts.waitForTimeout(100);
    await opts.waitForTimeout(300);
    await opts.bringToFront(); await opts.screenshot({ path: path.join(outDir, "settings-top.png"), fullPage: true, clip: { x: 0, y: 0, width: 1360, height: 1180 } });
    await opts.setViewportSize({ width: 1360, height: 900 });
    assert.deepEqual(await lowContrast(opts, "body"), [], "settings page (light): text under 4.5:1");
    assert.deepEqual(await unnamed(opts, "body"), [], "settings page: a control without an accessible name");
    await opts.emulateMedia({ colorScheme: "dark" });
    await opts.waitForTimeout(400);
    assert.deepEqual(await lowContrast(opts, "body"), [], "settings page (dark): text under 4.5:1");
    // the preview is Scholar's own page, which is always light: the system's dark theme does not darken it, and there is no Light / Dark switch to mislead
    assert.deepEqual(await opts.evaluate(() => ({
      card: getComputedStyle(document.querySelector(".preview > .card")).backgroundColor,
      title: getComputedStyle(document.querySelector("#preview a")).color,
      switches: document.querySelectorAll(".pv-theme-toggle, .pv-theme-btn").length
    })), { card: "rgb(255, 255, 255)", title: "rgb(26, 13, 171)", switches: 0 }, "the preview stays Scholar's light page when the system is dark");
    await opts.bringToFront(); await opts.screenshot({ path: path.join(outDir, "settings-dark.png"), fullPage: true });
    await opts.emulateMedia({ colorScheme: "light" });
    ok("settings page: the preview follows the switches, Reset restores the defaults, saved paper details can be cleared");

    // -- S8. the panel's settings button opens the settings page
    await opts.close();
    const [opened] = await Promise.all([context.waitForEvent("page"), page.click('[data-act="settings"]')]);
    await opened.waitForLoadState();
    assert.equal(opened.url(), optionsUrl);
    ok("the settings button in the panel opens the settings page");

    }

    assert.deepEqual(errors, [], "no console or page errors:\n" + errors.join("\n"));
    ok("no console errors");
  } finally {
    await context.close();
    await fx.close();
  }
  }

  if (PART === "" || PART === "2") {
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
    ok("Read full lists works on a profile with a non-English Scholar interface (requests hl=en)");
  } finally {
    await ctx2.close();
    await fx2.close();
  }

  // -- 20b. nothing left to say: no status block (the count of the papers is in the totals, so a lone "3 papers loaded" would only repeat it)
  {
    const fxC = await start({ slug: "clean-demo", pageSize: 100 });
    const ctxC = await launch();
    try {
      const pg = await ctxC.newPage();
      await pg.goto(fxC.url);
      await pg.waitForSelector("#rr-panel");
      await eventually(pg, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      assert.equal(await pg.locator('[data-rr="coverage"]').isHidden(), true, "a complete, fully ranked profile has no status block");
      assert.match(await pg.locator('[data-rr="metrics"]').textContent(), /Papers\s*3\s*of\s*3/, "the count is in the totals");
      const optsC = await openOptions(ctxC);
      await setPref(optsC, "panel.metrics.show", false);                    // without the totals the count is nowhere else: the line comes back
      await eventually(pg, () => !document.querySelector('[data-rr="coverage"]').hidden && /3 papers loaded/.test(document.querySelector('[data-rr="coverage"]').textContent));
      ok("with nothing else to say the status block is gone (the totals show the count); it returns when the totals are switched off");
    } finally { await ctxC.close(); await fxC.close(); }
  }

  // -- 20c. a profile none of whose venues is on a list (a biologist's): the table is by role only (no empty tier columns, no switch between the lists) and the note says why
  {
    const fxN = await start({ slug: "non-cs-demo", pageSize: 100 });
    const ctxN = await launch();
    try {
      const pg = await ctxN.newPage();
      await pg.goto(fxN.url);
      await pg.waitForSelector("#rr-panel");
      await eventually(pg, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      assert.equal(await pg.locator("#rr-panel [data-tier]").count(), 0, "nothing is ranked: no tier columns");
      assert.equal(await pg.locator("#rr-panel .rr-seg").count(), 0, "and no switch between the lists");
      assert.equal(await pg.locator("#rr-panel .rr-summary .rr-sec-title").textContent(), "Papers by role", "the heading does not promise ranks");
      assert.match(await pg.locator('[data-rr="note"]').textContent(), /^No venue on this profile is on the .*CCF.2026.*ICORE.2026.* lists, which cover computer science\.$/s);
      const mx = await readMatrix(pg);
      assert.deepEqual([mx.first.total, mx.second.total, mx.last.total, mx.hidden], [5, 4, 3, 1], "the roles are counted as before, one paper's list is cut off");
      assert.equal(await pg.locator('[data-rr="unmatched"] .rr-list li').count(), 13, "the venues are still listed for whoever wants them");
      assert.equal(await pg.locator('[data-act="report-unmatched"]').count(), 1, "and can still be reported (a computer-science profile whose venues the lists miss is where a report helps)");
      assert.equal(await pg.locator('.rr-spill[data-pill="ccfA"]').count(), 0, "a quick filter for a rank that no paper here has is not offered");
      assert.ok(await pg.locator('.rr-spill[data-pill="first"]').count() > 0, "those that find something are");
      await pg.bringToFront(); await pg.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-no-ranks.png") });
      // the toolbar popup tells the same story
      const popN = await ctxN.newPage();
      await popN.goto(`chrome-extension://${extId}/popup/popup.html`);
      const tabN = await popN.evaluate(async () => {
        for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
        return null;
      });
      assert.ok(tabN != null, "the profile answers the popup");
      await popN.goto(`chrome-extension://${extId}/popup/popup.html?tab=${tabN}`);
      await popN.waitForSelector(".who");
      assert.equal(await popN.locator("thead th").count(), 2, "the popup's table has the role and the total, no tier columns");
      assert.match(await popN.textContent("#main"), /No venue on this profile is on the .*CCF.2026.*ICORE.2026.* lists/s);
      assert.doesNotMatch(await popN.textContent("#main"), /Not ranked|Ranks come from/, "no legend or edition note for ranks that are not there");
      assert.deepEqual(await popN.evaluate(() => [...document.querySelectorAll("tr")].map((tr) => tr.children.length)), [2, 2, 2, 2, 2, 2], "every row, the cut-off one too, has the role and the total: no cell spans columns that are not there");
      await popN.close();
      // a selection made on a tier while the list is incomplete does not outlive the columns: nothing is left to undo it
      // (the list is not loaded by itself here: the click comes first, then "Load all")
      const optsN = await openOptions(ctxN);
      await setPref(optsN, "autoLoad", false);
      const fxM = await start({ slug: "non-cs-demo", pageSize: 5 });
      const pgM = await ctxN.newPage();
      try {
        await pgM.goto(fxM.url);
        await pgM.waitForSelector('#rr-panel th button[data-tier="none"]');
        await pgM.bringToFront();
        await pgM.click('#rr-panel th button[data-tier="none"]');
        assert.equal(await pgM.locator('[data-rr="filterbar"]').isVisible(), true, "while the list is incomplete the tier column is there, and the selection filters");
        await pgM.click('[data-act="load-all"]');
        await eventually(pgM, () => !document.querySelector("#rr-panel [data-tier]") && document.querySelector('[data-rr="filterbar"]').hidden && document.querySelectorAll("#gsc_a_b tr.gsc_a_tr:not(.rr-hide)").length === 13);
      } finally { await pgM.close().catch(() => {}); await fxM.close(); }
      // a list finished by hand (Scholar's own button, our loader off) is complete too: the columns go once the button has stayed off
      const fxH = await start({ slug: "non-cs-demo", pageSize: 5 });
      const pgH = await ctxN.newPage();
      try {
        await pgH.goto(fxH.url);
        await pgH.waitForSelector('#rr-panel th button[data-tier="none"]');
        await pgH.bringToFront();
        await pgH.evaluate(() => document.getElementById("gsc_bpf_more").click());            // (the stand-in sends up to 80 rows a press: all of them)
        await eventually(pgH, () => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 13);
        assert.equal(await pgH.locator("#gsc_bpf_more").isDisabled(), true);
        await eventually(pgH, () => !document.querySelector("#rr-panel [data-tier]") && !!document.querySelector('[data-rr="note"]').textContent.startsWith("No venue on this profile"));
      } finally { await pgH.close().catch(() => {}); await fxH.close(); }
      // a press answered slowly: the button is off while the request is in flight, which says nothing about the list being whole (a pending check is dropped by the press)
      const fxS = await start({ slug: "non-cs-demo", pageSize: 5, repeat: 20, latency: 3000 });       // (260 papers, 80 a press, three seconds an answer)
      const pgS = await ctxN.newPage();
      try {
        await pgS.goto(fxS.url);
        await pgS.waitForSelector('#rr-panel th button[data-tier="none"]');
        await pgS.bringToFront();
        await pgS.evaluate(() => document.getElementById("gsc_bpf_more").click());
        await eventually(pgS, () => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 85);       // answered: the panel starts its 1.8 s check
        await pgS.waitForTimeout(500);
        await pgS.evaluate(() => document.getElementById("gsc_bpf_more").click());                          // the person presses again, the answer is three seconds away
        await pgS.waitForTimeout(2300);                                                                    // (past the moment the old check would have read the button as off)
        assert.equal(await pgS.locator("#rr-panel [data-tier]").count() > 0, true, "a request in flight is not a whole list: the tier columns stay");
        assert.equal(await pgS.locator("#gsc_a_b tr.gsc_a_tr").count(), 85);
      } finally { await pgS.close().catch(() => {}); await fxS.close(); }
      ok("a profile with no venue on any list: the table is by role only and the note says the lists cover computer science (panel and popup); a tier selection does not outlive the columns");
    } finally { await ctxN.close(); await fxN.close(); }
  }

  // -- 20d. a real profile, read on the live Scholar page (13 papers: co-first stars, cut author lists, Orals in the venue field): the panel shows what the live page showed
  {
    const fxG = await start({ slug: "gou-osu", pageSize: 100 });
    const ctxG = await launch();
    try {
      const pg = await ctxG.newPage();
      await pg.goto(fxG.url);
      await pg.waitForSelector("#rr-panel");
      await eventually(pg, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      assert.deepEqual(await readMatrix(pg), {
        first: { A: 1, B: 0, C: 0, none: 0, total: 1 },
        cofirst: { A: 1, B: 0, C: 0, none: 1, total: 2 },
        second: { A: 1, B: 0, C: 0, none: 0, total: 1 },
        last: { A: 0, B: 0, C: 0, none: 0, total: 0 },
        middle: { A: 1, B: 1, C: 0, none: 5, total: 7 },
        hidden: 2
      });
      assert.equal(await pg.locator('#gsc_a_b .rr-chip-mark[data-mark="oral"]').count(), 3, "the three Orals the author wrote");
      // a chip word the person renamed reaches the open page (the chips on the rows are drawn again)
      const optsG = await openOptions(ctxG);
      await optsG.fill('input[data-pref="labels.markOral"]', "Keynote");
      await optsG.press('input[data-pref="labels.markOral"]', "Enter");
      await settle(optsG);
      await eventually(pg, () => { const c = [...document.querySelectorAll('#gsc_a_b .rr-chip-mark[data-mark="oral"]')]; return c.length === 3 && c.every((x) => x.textContent.includes("Keynote")); });
      await optsG.fill('input[data-pref="labels.markOral"]', "");
      await optsG.press('input[data-pref="labels.markOral"]', "Enter");
      await settle(optsG);
      await eventually(pg, () => [...document.querySelectorAll('#gsc_a_b .rr-chip-mark[data-mark="oral"]')].every((x) => x.textContent.includes("Oral")));
      await optsG.close();
      // a venue of the unranked list can be checked: the settings page opens with its "Check a venue" filled in
      await pg.bringToFront();
      await pg.locator('[data-rr="unmatched"] summary').click();
      const [checkPage] = await Promise.all([ctxG.waitForEvent("page"), pg.locator('[data-rr="unmatched"] [data-act="check-venue"]').first().click()]);
      await checkPage.waitForSelector('[data-act="venue-check"]');
      await pollPage(checkPage, () => document.querySelector('[data-act="venue-check"]').value.length > 3 && !!document.querySelector("#card-venue .venue-none"));
      const askedVenue = await checkPage.inputValue('[data-act="venue-check"]');
      assert.ok((await pg.locator('[data-rr="unmatched"] li').first().textContent()).includes(askedVenue), "the box holds the venue's text: " + askedVenue);
      assert.match(await checkPage.locator("#card-venue .venue-none").innerText(), /^No rank/, "a venue of the unranked list gets no rank, and the card says so");
      // the person ties it to a listed venue: the profile page shows a dashed chip that says whose rank it is, a status line counts it, the unranked list loses it; removing it undoes all of it
      await checkPage.click('[data-act="mine-assign"]');
      await checkPage.fill('[data-act="mine-search"]', "Neural Information Processing");
      await checkPage.locator('[data-act="mine-pick"]').first().click();
      await pollPage(checkPage, () => !!document.querySelector('#card-venue .venue-line') && document.querySelectorAll(".mine-item").length === 1);
      assert.equal((await checkPage.locator('#card-venue [data-act="mine-assign"]').textContent()).trim(), "Change…", "a line already mapped offers Change…");
      await eventually(pg, () => document.querySelectorAll("#gsc_a_b .rr-chip-mine").length >= 1 && !!document.querySelector('[data-rr="mapped"]'));
      assert.match(await pg.locator("#gsc_a_b .rr-chip-mine").first().getAttribute("title"), /Your own mapping/, "the chip's tooltip says the rank is the person's mapping");
      assert.match(await pg.locator('[data-rr="mapped"]').textContent(), /ranked by your own venue mappings/);
      assert.match(await pg.locator('[data-rr="unmatched"] summary').textContent(), /^1 paper at a venue without a rank/, "the mapped venue is no longer unranked");
      await checkPage.click('[data-act="mine-remove"]');
      await eventually(pg, () => document.querySelectorAll("#gsc_a_b .rr-chip-mine").length === 0 && !document.querySelector('[data-rr="mapped"]'));
      assert.equal(await checkPage.locator(".mine-item").count(), 0, "the list of mappings is empty again");
      await checkPage.close();
      assert.match(await pg.locator('[data-rr="unmatched"] summary').textContent(), /^2 papers at venues without a rank/, "COLM and TMLR are on no list; Findings and demo tracks are not counted as missing");
      ok("a real profile read on the live page: the table is the one the live panel showed (First 1, Co-first 2, Second 1, Other 7, 2 hidden)");
    } finally { await ctxG.close(); await fxG.close(); }
  }

  // -- 20f. a biologist's real profile (100 papers read on the live page: long author lists, patents, a book): the table is by role only, and the inventor
  // printed as "JA DOUDNA" is offered as one click and then counted
  {
    const fxB = await start({ slug: "doudna", pageSize: 100 });
    const ctxB = await launch();
    try {
      const pg = await ctxB.newPage();
      await pg.goto(fxB.url);
      await pg.waitForSelector("#rr-panel");
      await eventually(pg, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      assert.equal(await pg.locator("#rr-panel [data-tier]").count(), 0, "nothing in this field is on a list: no tier columns");
      const before = await readMatrix(pg);
      assert.deepEqual([before.first.total, before.second.total, before.last.total, before.middle.total, before.hidden], [5, 0, 42, 11, 38], "the numbers of the live panel");
      assert.match(await pg.locator('[data-rr="absent"]').textContent(), /^4 papers where the profile owner's name is not in the author list/);
      const pill = pg.locator('[data-act="suggest-variant"]');
      assert.equal(await pill.count(), 1);
      assert.equal((await pill.textContent()).trim(), "JA DOUDNA (3)");
      await pill.click();
      await eventually(pg, () => /^1 paper where the profile owner's name is not in the author list/.test(document.querySelector('[data-rr="absent"]').textContent));
      const after = await readMatrix(pg);
      assert.deepEqual([after.first.total, after.second.total, after.last.total, after.middle.total, after.hidden], [6, 1, 42, 12, 38], "the three patents are counted now");
      ok("a biologist's real profile: by role only, and 'JA DOUDNA' (three patents) is one click from being counted");
    } finally { await ctxB.close(); await fxB.close(); }
  }

  // -- 20e. a paper that Scholar dates 1803 does not stretch the year chart over two centuries (a user's screenshot: every bar a pixel wide)
  {
    const fxY = await start({ slug: "old-year-demo", pageSize: 100 });
    const ctxY = await launch();
    try {
      const pg = await ctxY.newPage();
      await pg.goto(fxY.url);
      await pg.waitForSelector("#rr-panel");
      await eventually(pg, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      assert.equal(await pg.locator("#gsc_a_b tr.gsc_a_tr").count(), 3);
      assert.deepEqual(await pg.locator("#rr-panel .rr-bars-axis span").allTextContents(), ["2023", "2024"], "the chart covers at most the last fifty years, from the first year that has a paper");
      assert.equal(await pg.locator("#rr-panel .rr-bar").count(), 2);
      assert.equal(await pg.locator("#rr-panel .rr-bars-axis span").first().getAttribute("title"), "1 older paper is not drawn", "the older paper is said on hover");
      assert.match(await pg.locator("#rr-panel .rr-bars").getAttribute("aria-label"), /1 older paper is not drawn/, "and to screen readers");
      const widths = await pg.locator("#rr-panel .rr-bar").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
      assert.ok(widths.every((w) => w >= 12), "the bars are wide enough to see: " + widths);
      await pg.bringToFront(); await pg.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-old-year.png") });
      ok("a paper Scholar dates 1803 does not stretch the year chart: at most the last fifty years are drawn and the older paper is said on hover");
    } finally { await ctxY.close(); await fxY.close(); }
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
    assert.equal(await pill("oral").getAttribute("title"), null, "talk kinds have no breakdown");
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
    // while the filters leave none of a group's papers its row stays (a quiet 0): the panel does not shrink or grow under the search box when a filter is switched on
    {
      const markRowCount = () => page.locator("#rr-panel .rr-markrow").count();
      const searchTop = () => page.evaluate(() => { const i = document.querySelector('#rr-panel input[data-act="filter-query"]'); return Math.round(i.getBoundingClientRect().top + scrollY); });
      const rowsBefore = await markRowCount(), topBefore = await searchTop();
      await page.fill('#rr-panel input[data-act="filter-query"]', "zzzqq-no-such-paper");
      await eventually(page, () => document.querySelector("#rr-panel .rr-filterbar.rr-fb-empty"));
      assert.equal(await markRowCount(), rowsBefore, "the awards rows stay while the filters leave none of their papers");
      assert.equal(await searchTop(), topBefore, "the search box does not move when a filter is switched on");
      assert.match(await page.locator("#rr-panel .rr-head").textContent(), /Showing 0 of/, "the bar is in the title bar");
      assert.equal(await page.locator("#rr-panel .rr-title").isVisible(), false, "in place of the title");
      assert.equal(await page.locator("#rr-panel .rr-markrow-zero").count(), rowsBefore, "the rows are quiet");
      await page.fill('#rr-panel input[data-act="filter-query"]', "");
      await eventually(page, () => document.querySelector('[data-rr="filterbar"]').hidden);
      assert.equal(await page.locator("#rr-panel .rr-title").isVisible(), true, "the title is back");
      ok("a filter leaves the panel as tall as it was: the filter bar is in the title bar, the awards rows stay (quiet) and the search box does not move");
    }
    await page.click('[data-act="copy-summary"]');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /Awards & talks: Awards 4, Oral 2, Spotlight 1 \(from the authors' own words or the award list\)/);
    ok("Copy summary includes the awards and talks line");
    await page.screenshot({ path: path.join(outDir, "marks.png") });
    // each group has its own switch on the settings page; a finalist follows the awards
    const optsM = await openOptions(ctx3);
    await pill("award").click();
    assert.equal(await visibleRows(page), 4);
    await setMark(optsM, "award", false);
    await eventually(page, () => document.querySelectorAll('.rr-chip-mark[data-group="award"], .rr-chip-mark[data-group="finalist"]').length === 0);
    assert.equal(await visibleRows(page), 10, "switching a group off also ends a filter on it");
    assert.equal(await page.locator('#rr-panel .rr-markrow[data-mark-group="award"]').count(), 0);
    assert.equal(await page.locator('#rr-panel .rr-markrow[data-mark-group="oral"]').count(), 1);
    assert.ok((await page.locator('.rr-chip-mark[data-group="oral"]').count()) > 0, "talk kinds keep their own switch");
    await page.click('[data-act="copy-summary"]');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^Awards & talks: Oral 2, Spotlight 1 /m);
    for (const g of ["oral", "spotlight"]) await setMark(optsM, g, false);
    await eventually(page, () => document.querySelectorAll(".rr-chip-mark").length === 0 && document.querySelectorAll("#rr-panel .rr-markrow").length === 0);
    assert.equal(await page.locator('[data-rr="marks"]').isHidden(), true, "no Awards & talks section when every group is off");
    for (const g of ["award", "oral", "spotlight"]) await setMark(optsM, g, true);
    await eventually(page, () => document.querySelectorAll(".rr-chip-mark").length > 0 && document.querySelectorAll("#rr-panel .rr-markrow").length === 3);
    ok("each Awards & talks group has its own switch on the settings page: chips, panel rows, counts and an active filter follow");

    // each part of the panel has its own switch: the role × rank table can go while the filters and totals stay
    await setPref(optsM, "panel.table.show", false);
    await eventually(page, () => document.querySelector('[data-rr="matrix"]').closest(".rr-sec").hidden);
    assert.equal(await page.locator('[data-rr="matrix"] table').isVisible(), false);
    assert.equal(await page.locator('[data-act="copy-summary"]').isVisible(), true, "the copy row stays when the table goes: it has its own switches");
    for (const part of ["filters", "metrics", "coverage"]) assert.equal(await page.locator(`[data-rr="${part}"]`).isVisible(), true, `${part} stays`);
    assert.equal(await page.locator('[data-rr="marks"]').isVisible(), true, "the awards and talks counts stay");
    await setPref(optsM, "panel.status.show", false);
    await setPref(optsM, "panel.names.show", false);
    await eventually(page, () => document.querySelector('[data-rr="coverage"]').hidden && document.querySelector('[data-rr="variants"]').closest(".rr-sec").hidden);
    await setPref(optsM, "panel.table.show", true); await setPref(optsM, "panel.status.show", true); await setPref(optsM, "panel.names.show", true);
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
    if (process.env.E2E_SHOWCASE_H) await page.setViewportSize({ width: 1360, height: parseInt(process.env.E2E_SHOWCASE_H, 10) });      // (the README and website picture: tall enough for the whole panel)
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
    // a very narrow window: a row's chips (they wrap as one group) never reach beyond the title column, and the page does not scroll sideways
    await page.setViewportSize({ width: 480, height: 900 });
    await page.waitForTimeout(300);
    const spill = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").forEach((tr) => { const cell = tr.querySelector("td.gsc_a_t").getBoundingClientRect(); tr.querySelectorAll(".rr-chips").forEach((c) => { for (const r of c.getClientRects()) if (r.right > cell.right + 1) bad.push(Math.round(r.right - cell.right)); }); });
      return { chips: bad, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.deepEqual(spill, { chips: [], page: 0 }, "chips or the page spill sideways at 480 px");
    ok("the fictional showcase profile renders (wide and narrow) with an award from the list");

    // -- 25b. every interface language fits: no panel button cut off, nothing wider than the panel, in the sidebar and in the wide panel
    {
      const opts = await openOptions(ctx4);
      await opts.evaluate(async () => { const r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: { ...(r.prefs || {}), panel: { venues: { show: true } } } }); });
      const langs = fs.readdirSync(path.join(repo, "src/_locales"));
      // English left in another language's interface: every text, title, aria-label and placeholder of `scope`, outside the regions that hold data (venue names, paper titles, code),
      // with what is English on purpose taken out first (operators, format names, award names, an example venue line). In a language of another script two lower-case Latin words
      // in a row are English too. (The search's own messages were English in all 30 languages until 2026-10-29; nothing else had looked.)
      const englishLeft = (p, scope, skip, lang) => p.evaluate(([scope, skip, lang]) => {
        const latin = /^(?:cs|da|de|es|fi|fr|hu|id|it|nl|no|pl|pt|ro|sv|tr|vi)/.test(lang);
        const kept = /\b[\w*-]+:[^\s,)·]+|Proceedings of the [^…"]*|Better Scholar|Semantic Scholar|Google Scholar|[Tt]est of [Tt]ime|BibTeX|Markdown|JSON|CSV|APA|IEEE|ACM|GB\/T 7714|et al\.?|h-index|i10-index|Oral|Spotlight|Highlight|ICLR|NeurIPS|CVPR|ACL|WACV/g;
        // (word edges in any script: with \b, the "that" inside Hungarian "láthatóvá" was an English word)
        const english = (s) => { const t = s.replace(kept, " "); return /(?<![\p{L}\p{N}])(?:the|and|with|your|this|that|only|when|from|which|search|press|click)(?![\p{L}\p{N}])/iu.test(t) || (!latin && /(?<![\p{L}])[a-z]{3,}\s+[a-z]{2,}(?![\p{L}])/u.test(t)); };
        const out = new Set(), root = document.querySelector(scope);
        if (!root) return [];
        for (const el of root.querySelectorAll("*")) {
          if (skip && el.closest(skip)) continue;
          for (const a of ["title", "aria-label", "placeholder"]) { const v = el.getAttribute(a); if (v && english(v)) out.add(`[${a}] ${v.slice(0, 90)}`); }
          for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim() && english(n.nodeValue)) out.add(n.nodeValue.trim().slice(0, 90));
        }
        return [...out];
      }, [scope, skip, lang]);
      // (the open profile reloads itself when the language setting changes: a reload of ours may meet that one half way, so it is asked again)
      const reloadSafe = async () => { for (let i = 0; i < 4; i++) { try { await page.waitForLoadState("load"); await page.reload(); return; } catch (e) { await page.waitForTimeout(300); } } await page.reload(); };
      const bad = [];
      for (const lang of langs) {
        await opts.evaluate(async (l) => { const r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: { ...r.prefs, language: l } }); }, lang);
        for (const [w, mode] of [[1360, "sidebar"], [760, "wide"]]) {
          await page.setViewportSize({ width: w, height: 900 });
          await reloadSafe();
          await page.waitForSelector("#rr-panel");
          await page.waitForFunction((m) => document.getElementById("rr-panel").classList.contains("rr-wide") === (m === "wide"), mode);
          const over = await page.evaluate(() => {
            const p = document.getElementById("rr-panel"), out = [];
            for (const b of p.querySelectorAll(".rr-btn")) if (b.offsetParent && b.scrollWidth > b.clientWidth + 1) out.push("cut: " + b.textContent.trim());
            // in a right-to-left panel the ">100" pill is a left-to-right run: its sign is not mirrored to "<100"
            const cites = p.querySelector('[data-pill="cites100"]');
            if (p.dir === "rtl" && cites && getComputedStyle(cites).direction !== "ltr") out.push("mirrored: " + cites.textContent.trim());
            // a button's words stay on one line: a copy button that loses its minimum width breaks its label into single letters, and then nothing is cut or outside the box
            const range = document.createRange();
            for (const b of p.querySelectorAll(".rr-btn")) {
              if (!b.offsetParent) continue;
              const tops = new Set();
              for (const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); w.nextNode();) { range.selectNodeContents(w.currentNode); for (const q of range.getClientRects()) if (q.width > 0.5) tops.add(Math.round(q.top / 4)); }
              if (tops.size > 1) out.push("wrapped: " + b.textContent.trim());
            }
            const box = p.getBoundingClientRect();
            for (const el of p.querySelectorAll("*")) { if (!el.offsetParent) continue; const r = el.getBoundingClientRect(); if (r.width && (r.right > box.right + 1 || r.left < box.left - 1)) { out.push("outside: " + el.className + " " + el.textContent.trim().slice(0, 20)); break; } }
            return out;
          });
          if (over.length) bad.push(`${lang}/${mode}: ${over.join("; ")}`);
          if (lang !== "en" && mode === "sidebar") {
            const left = await englishLeft(page, "#rr-panel", '[data-rr="unmatched"], [data-rr="venues"], .rr-chip, pre, code', lang);
            if (left.length) bad.push(`${lang}: English in the panel: ${left.join(" | ")}`);
          }
          // (a left-to-right search typed in a right-to-left panel — operators are code — runs clear of the count and the clear button, which sit on the left there)
          if (["ar", "he"].includes(lang) && mode === "sidebar") {
            await page.fill("#rr-panel .rr-search-input", "ccf:d cites:abc");
            await page.waitForFunction(() => !document.querySelector("#rr-panel .rr-search-count").hidden);
            const clear = await page.evaluate(() => {
              const i = document.querySelector("#rr-panel .rr-search-input"), cs = getComputedStyle(i), r = i.getBoundingClientRect(), text = { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) };
              return [".rr-search-count", ".rr-search-clear"].map((q) => document.querySelector("#rr-panel " + q)).filter((e) => e && !e.hidden).every((e) => { const b = e.getBoundingClientRect(); return b.right <= text.left + 1 || b.left >= text.right - 1; });
            });
            if (!clear) bad.push(`${lang}: the typed search runs under the count or the clear button`);
            // (and what the search cannot read is said in the language, the operator's words as typed)
            await page.fill("#rr-panel .rr-search-input", "ccf:d");
            await page.waitForFunction(() => !document.querySelector("#rr-search-error").hidden);
            const said = (await page.locator("#rr-search-error").textContent()).replace(/[\u2066-\u2069]/g, "");
            if (!/ccf:d/.test(said) || /takes one of/.test(said) || !/[\u0590-\u06ff]/.test(said)) bad.push(`${lang}: the error line is not in the language: ${said}`);
            await page.fill("#rr-panel .rr-search-input", "");
          }
          // "11 of 12" in the language's own order: Hindi puts the total first
          if (lang === "hi" && mode === "sidebar") {
            const order = await page.evaluate(() => [...document.querySelector('[data-metric="mPapers"] > span:last-child').childNodes].map((n) => n.nodeName));
            if (order.join() !== "SPAN,I,B") bad.push(`hi: the total should come first: ${order.join()}`);
          }
          // the role words of the table (both rankings) stay inside their column: no label runs into a number
          for (const src of ["ccf", "core"]) {
            await page.click(`button[data-src="${src}"]`);
            const spill = await page.evaluate(() => [...document.querySelectorAll("#rr-panel .rr-matrix th, #rr-panel .rr-matrix .rr-rolebtn")].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim()));
            if (spill.length) bad.push(`${lang}/${mode}/${src}: table label spills: ${spill.join(", ")}`);
          }
          if (mode === "sidebar" && ["ja", "de", "ru", "fi", "th"].includes(lang)) { await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, `lang-${lang}.png`) }); }
        }
      }
      // the settings page and the popup too: nothing makes the page wider than the window, in a narrow window as well
      const settingsUrl = opts.url();
      for (const lang of langs) {
        await opts.evaluate(async (l) => { const r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: { ...r.prefs, language: l } }); }, lang);
        for (const w of [1360, 940, 420]) {
          await opts.setViewportSize({ width: w, height: 900 });
          await opts.goto(settingsUrl);
          await opts.waitForSelector(".toc a");
          const wide = await opts.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (wide > 1) bad.push(`${lang}/settings ${w}px: ${wide}px too wide`);
          if (lang !== "en" && w === 1360) {
            // (the sample rows of the preview are made-up papers; the agent's guide and the configuration are English and JSON on purpose)
            const left = await englishLeft(opts, "body", "#preview tr, .rr-chip, pre, code, textarea, #card-agent, #card-config, [data-rr=\"unmatched\"], [data-rr=\"venues\"]", lang);
            if (left.length) bad.push(`${lang}: English on the settings page: ${left.join(" | ")}`);
          }
          // every button of a row (the Enable all / Disable all pairs, Compact, the colour resets …) is whole and inside its card
          const cut = await opts.evaluate(() => [...document.querySelectorAll(".row .btn")].filter((b) => b.offsetParent && (b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > b.closest("section.card").getBoundingClientRect().right + 1)).map((b) => b.textContent.trim()));
          if (cut.length) bad.push(`${lang}/settings ${w}px: cut or outside its card: ${cut.join(", ")}`);
        }
      }
      await opts.evaluate(async () => { const r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: { ...r.prefs, language: "auto" } }); });
      await page.click('button[data-src="ccf"]');                       // (the loop ended on the CORE tab, which is remembered: the pictures show the usual one)
      // every part of the panel on, as a picture (light, dark, and the wide layout)
      await reloadSafe(); await page.waitForSelector("#rr-panel"); await page.bringToFront();       // (a background tab cannot be photographed)
      await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "panel-all.png") });
      await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(400);
      await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "panel-all-dark.png") });
      await page.emulateMedia({ colorScheme: "light" });
      await opts.close();
      await page.setViewportSize({ width: 1360, height: 900 });
      assert.deepEqual(bad, [], "a language does not fit the panel or the settings page");
      ok(`all ${langs.length} interface languages fit the panel (no cut-off button, nothing outside the box) in the sidebar and in the wide layout`);
    }
  } finally {
    await ctx4.close();
    await fx4.close();
  }

  }

  if (PART === "" || PART === "4") {
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
    await page.waitForFunction(() => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 1000 && !/Loading/.test((document.querySelector('[data-rr="coverage"]') || { hidden: true, textContent: "" }).textContent), null, { timeout: 90000 });
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

    // what a key and a click cost once all 1,000 are here: each filters every row, and a pick undone shows them all again (the browser lays the table out anew).
    // Measured 2026-10-29 on a laptop: a key 5–15 ms of script, the worst task 61 ms (a pick undone); at 2,000 papers 108 ms. 200 ms is where a page stops feeling instant.
    await page.evaluate(() => { window.__long = []; });
    await page.locator('[data-act="filter-query"]').click();
    await page.keyboard.type("role:first ccf:a year:>=2015", { delay: 20 });
    await page.locator('[data-act="filter-query"]').fill("");
    for (const sel of ["#rr-panel .rr-spill >> nth=0", "#rr-panel button.rr-cell:not(.rr-zero) >> nth=0", "#rr-panel th button.rr-rolebtn >> nth=0"]) {
      await page.locator(sel).click();
      await page.waitForTimeout(150);
      await page.locator(sel).click();
      await page.waitForTimeout(150);
    }
    assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr.rr-hide").count(), 0, "every pick undone");
    const worstUse = Math.max(0, ...(await page.evaluate(() => window.__long)));
    assert.ok(worstUse < 250, `a key or a click took a ${worstUse} ms task on 1,000 papers`);
    ok(`1,000 papers: typing a search, a quick filter, a table cell and a role picked and undone; longest main-thread task ${worstUse} ms`);
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
    assert.equal(await page.locator('[data-rr="layout-warning"]').isVisible(), false);
    await page.click('[data-rr="unmatched"] summary');
    // the list stays open when the panel is drawn again (a filter changes, more papers arrive)
    await page.check('input[data-act="only"]');
    assert.equal(await page.evaluate(() => document.querySelector('[data-rr="unmatched"]').open), true, "an opened list is not closed by a redraw");
    await page.uncheck('input[data-act="only"]');
    await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-unmatched.png") });
    await page.click('[data-act="copy-unmatched"]');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /^\d+× \S/m);
    const unmatched = metrics.unmatchedVenues(expected(fx6.profile));
    assert.equal(text, unmatched.map((u) => `${u.count}× ${u.venue}`).join("\n"));
    const href = await page.getAttribute('[data-act="report-unmatched"]', "href");
    assert.match(href, /^https:\/\/github\.com\/boyugou\/better-scholar\/issues\/new\?title=Venue%20not%20recognised&body=/);
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
    assert.equal(await warn.isVisible(), true);
    await page.bringToFront(); await page.locator("#rr-panel").screenshot({ path: path.join(outDir, "state-layout-warning.png") });
    assert.match(await warn.textContent(), /layout seems to have changed/);
    assert.equal(await page.locator('[data-rr="matrix"]').isVisible(), false, "no table of zeros next to the warning");
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

  // -- 30. an awards row counts the papers that may be the person's, and the list it opens holds the same: not one whose complete author list lacks the name
  {
    const award = "NeurIPS 2020 Best Paper Award";
    const rows = [["I Stoica, A Smith, B Lee", award, "Found paper"], ["A Smith, B Lee, C Kim", award, "Absent paper"], ["A Smith, B Lee, …", award, "Hidden paper"],
      ["I Stoica, R Morris", "Proceedings of the 25th Symposium on Operating Systems Principles, 2015", "Other paper"]];
    const fx11 = await start({ slug: "ion-stoica", pageSize: 20, rows, latency: 0 });
    const ctx11 = await launch();
    try {
      const page = await ctx11.newPage();
      await page.goto(fx11.url);
      await page.waitForSelector("#rr-panel");
      await eventually(page, () => document.querySelectorAll('#rr-panel .rr-markrow[data-mark-group="award"]').length === 1);
      await page.bringToFront();
      const counted = parseInt(await page.locator('#rr-panel .rr-markrow[data-mark-group="award"] .rr-markcount, #rr-panel .rr-markrow[data-mark-group="award"] b').first().textContent(), 10);
      assert.equal(counted, 2, "the row counts the paper with the name and the one whose list was cut, not the one whose whole list lacks it");
      await page.click('#rr-panel .rr-markrow[data-mark-group="award"]');
      await eventually(page, () => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr:not(.rr-hide)").length <= 2);
      assert.equal(await visibleRows(page), counted, "the list the row opens holds as many papers as the row counts");
      assert.deepEqual(await page.locator("#gsc_a_b tr.gsc_a_tr:not(.rr-hide) .gsc_a_at").allTextContents(), ["Found paper", "Hidden paper"]);
      ok("an awards row counts the papers that may be the person's, and the list it opens holds the same (a paper whose whole author list lacks the name is in neither)");
    } finally { await ctx11.close(); await fx11.close(); }
  }

  // -- 31. hostile data — markup, huge words, bidirectional controls, prototype names, empty fields — is drawn by the panel and the popup, and nothing throws
  {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const hostile = ["", " ", "…", "\u200b", "<img src=x onerror=alert(1)>", "<script>alert(1)</script>", "&lt;b&gt;x&lt;/b&gt;", "\"'`", "}{][)(", "%s %d {0} ${x} {{y}}", "javascript:alert(1)", "C:\\path\\file", "line\nbreak\ttab", "a".repeat(2500), "W".repeat(300),
      "نص عربي طويل ".repeat(30), "עברית ארוכה ".repeat(30), "😀".repeat(60), "İstanbul ß ǅ", "\u202e", "\u2066x\u2069", "0", "-1", "constructor", "__proto__", "toString", "hasOwnProperty"];
    const people = ["I Stoica", "R Morris", "D Karger", "MF Kaashoek", "…", "A <b>Bold</b>", "😀 Smile", "اسم عربي", "יוסי כהן", "I Stoica*", "R Morris*", "constructor", "__proto__"];
    const venuesReal = ["ACM SIGCOMM computer communication review 31 (4), 149-160, 2001", "Proceedings of the 25th Symposium on Operating Systems Principles, 2015", "Advances in Neural Information Processing Systems 32, 2019", "NSDI 2019", "arXiv preprint arXiv:2105.04321, 2021"];
    const rows = Array.from({ length: 120 }, (_, i) => {
      const as = Array.from({ length: 1 + Math.floor(rnd() * (rnd() < 0.1 ? 100 : 7)) }, () => pick(people));
      if (rnd() < 0.85) as.splice(Math.floor(rnd() * as.length), 0, "I Stoica");
      return [rnd() < 0.05 ? pick(hostile) : as.join(", "), rnd() < 0.5 ? pick(hostile) + (rnd() < 0.5 ? ", " + (1900 + Math.floor(rnd() * 220)) : "") : pick(venuesReal).replace(/\d{4}/, String(1950 + Math.floor(rnd() * 150))), rnd() < 0.2 ? pick(hostile) || "untitled" : "Paper " + i + " " + pick(hostile).slice(0, 40)];
    });
    const fx10 = await start({ slug: "ion-stoica", pageSize: 200, rows, latency: 0 });
    const ctx10 = await launch();
    try {
      const page = await ctx10.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
      await page.goto(fx10.url);
      await page.waitForSelector("#rr-panel");
      await eventually(page, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      await page.bringToFront();
      const state = () => page.evaluate(() => { for (const d of document.querySelectorAll("#rr-panel details")) d.open = true; const p = document.getElementById("rr-panel"); return { bad: ((p.innerText || "").match(/undefined|NaN|\[object|Infinity/g) || []).slice(0, 3), over: Math.max(p.scrollWidth - p.clientWidth, Math.round(p.getBoundingClientRect().right - window.innerWidth)) }; });
      let st = await state();
      assert.deepEqual(st.bad, [], "no undefined, NaN or [object …] where a number or a name should be");
      assert.ok(st.over <= 1, `the panel stays in its box: ${st.over}px`);
      // every button the panel has, once (not the ones that leave the page: a file, Scholar's own pages)
      const count = await page.evaluate(() => document.querySelectorAll("#rr-panel button").length);
      let clicked = 0;
      for (let i = 0; i < count && clicked < 50; i++) {
        const did = await page.evaluate((i) => { const b = document.querySelectorAll("#rr-panel button")[i]; if (!b || b.disabled || !b.offsetParent || /export csv|read full|load|report|check|settings|options/i.test((b.textContent || "") + (b.getAttribute("aria-label") || "") + (b.dataset.act || ""))) return false; b.click(); return true; }, i).catch(() => false);
        if (did) clicked++;
      }
      assert.ok(clicked >= 20, `${clicked} buttons were pressed`);
      for (const q of ["role:first ccf:a", "cites:>1e999 year:<-5", "\"unterminated", "has:", "ccf:zzz core:", "<b>", "role:\u202e", "a".repeat(400), ""]) await page.locator("#rr-panel input").first().fill(q);
      st = await state();
      assert.deepEqual(st.bad, [], "…also after the buttons and some odd queries");
      assert.ok(st.over <= 1, `…and in its box: ${st.over}px`);
      const popup = await ctx10.newPage();
      popup.on("pageerror", (e) => errors.push("popup: " + String(e).slice(0, 200)));
      await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
      const tab = await popup.evaluate(async () => { for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } } return null; });
      await popup.goto(`chrome-extension://${extId}/popup/popup.html?tab=${tab}`);
      await popup.waitForSelector(".who");
      assert.deepEqual(((await popup.evaluate(() => document.body.innerText)).match(/undefined|NaN|\[object|Infinity/g) || []), [], "the popup draws it too");
      assert.deepEqual(errors, [], "no page error, no console error");
      ok(`a profile of hostile strings (markup, 2,500-letter words, bidirectional controls, prototype names, empty fields) is drawn by the panel and the popup: ${clicked} buttons pressed, odd queries typed, nothing throws, nothing reads undefined or NaN`);
    } finally { await ctx10.close(); await fx10.close(); }
  }

  // -- 32. the page changes under the panel: an article taken away (the owner deleting it from the profile), the whole body of the table swapped, a profile with no articles, a key typed in another extension's shadow field
  {
    const fx12 = await start({ slug: "ion-stoica", pageSize: 100, latency: 0 });
    const ctx12 = await launch();
    try {
      const page = await ctx12.newPage();
      await page.goto(fx12.url);
      await page.waitForSelector("#rr-panel");
      await eventually(page, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1 && document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 100);
      assert.deepEqual(await readMatrix(page), matrixOf(expected(fx12.profile)), "the panel starts out right");
      // three articles taken away: the table follows
      await page.evaluate(() => { for (const tr of [...document.querySelectorAll("#gsc_a_b tr.gsc_a_tr")].slice(0, 3)) tr.remove(); });
      await eventually(page, () => document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === 97);
      const rest = { owner: fx12.profile.owner, rows: fx12.profile.rows.slice(3) };
      const waitMatrix = async () => { for (let i = 0; i < 60; i++) { const m = JSON.stringify(await readMatrix(page)); if (m === JSON.stringify(matrixOf(expected(rest)))) return true; await page.waitForTimeout(100); } return false; };
      assert.ok(await waitMatrix(), "three rows taken away from the page are taken out of the table");
      // the whole body of the table swapped for a copy, and a row added to the new one
      await page.evaluate(() => {
        const old = document.getElementById("gsc_a_b"), body = old.cloneNode(true);
        old.replaceWith(body);
        const tr = body.lastElementChild.cloneNode(true);
        tr.querySelector("a.gsc_a_at").href = tr.querySelector("a.gsc_a_at").href.replace(/citation_for_view=[^&]+/, "citation_for_view=TEST:PNEW");
        body.appendChild(tr);
      });
      const grown = { owner: fx12.profile.owner, rows: [...rest.rows, fx12.profile.rows[99]] };
      const waitGrown = async () => { for (let i = 0; i < 60; i++) { const m = JSON.stringify(await readMatrix(page)); if (m === JSON.stringify(matrixOf(expected(grown)))) return true; await page.waitForTimeout(100); } return false; };
      assert.ok(await waitGrown(), "a row added to a swapped body is read too");
      // a key typed in a field inside a shadow tree is that field's, not the panel's search
      await page.evaluate(() => { const host = document.createElement("div"); host.id = "shadow-host"; document.body.appendChild(host); const root = host.attachShadow({ mode: "open" }); const input = document.createElement("input"); input.id = "shadow-input"; root.appendChild(input); });
      await page.evaluate(() => document.getElementById("shadow-host").shadowRoot.getElementById("shadow-input").focus());
      await page.keyboard.type("a/b");
      assert.equal(await page.evaluate(() => document.getElementById("shadow-host").shadowRoot.getElementById("shadow-input").value), "a/b", "the slash is typed into the field of the shadow tree");
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), "shadow-host", "and the focus stays in it");
    } finally { await ctx12.close(); await fx12.close(); }
    // a profile with no articles: Scholar's message is no paper
    const fxE = await start({ slug: "ion-stoica", pageSize: 100, rows: [], latency: 0 });
    const ctxE = await launch();
    try {
      const page = await ctxE.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
      await page.goto(fxE.url);
      await page.waitForSelector("#rr-panel");
      await page.waitForTimeout(800);
      assert.equal(await page.locator("#gsc_a_b td.gsc_a_e").count(), 1, "the stand-in shows the message row");
      assert.doesNotMatch(await page.locator("#rr-panel").innerText(), /\b1 papers?\b|[1-9]\d* papers? loaded/, "the panel does not count the message as a paper");
      assert.equal(await page.locator("#gsc_a_b tr.gsc_a_tr .rr-chips").count(), 0, "and puts no chips on it");
      assert.deepEqual(errors, []);
    } finally { await ctxE.close(); await fxE.close(); }
    ok("the page changes under the panel: an article taken away, the body of the table swapped (and a row added to it), a profile with no articles (its message is no paper), a slash typed in a shadow field is that field's");
  }

  // -- 33. what the settings say is drawn is also what is counted and copied: with the "Awards & talks" part off its line is not in a copied summary; an order and a choice are greyed with the switch they hang on
  {
    const fx13 = await start({ slug: "marks-demo", pageSize: 100, latency: 0 });
    const ctx13 = await launch();
    try {
      const opts = await openOptions(ctx13);
      const page = await ctx13.newPage();
      await page.goto(fx13.url);
      await page.waitForSelector("#rr-panel");
      await eventually(page, () => document.querySelectorAll('#rr-panel button[data-mark-group="award"]').length === 1);
      const copied = async () => {
        await page.bringToFront();
        await page.click('[data-act="copy-summary"]');
        await page.locator('[data-act="copy-summary"]', { hasText: "Copied" }).waitFor();
        return page.evaluate(() => navigator.clipboard.readText());
      };
      assert.match(await copied(), /Awards & talks/, "the part is on: its line is in the summary");
      await setPref(opts, "panel.marks.show", false);
      await eventually(page, () => document.querySelectorAll('#rr-panel button[data-mark-group="award"]').length === 0);
      await page.waitForTimeout(400);
      assert.doesNotMatch(await copied(), /Awards & talks|Oral \d|Spotlight \d/, "the part is off: what is not drawn is not copied");
      await setPref(opts, "panel.marks.show", true);
      await eventually(page, () => document.querySelectorAll('#rr-panel button[data-mark-group="award"]').length === 1);
      // the settings page: a list that can be moved and a choice are greyed while the part they belong to is off, and wake with it
      await opts.bringToFront();
      const state = () => opts.evaluate(() => {
        const order = document.querySelector('ol[data-pref="panel.order"]').closest(".opt"), choice = document.querySelector('input[data-pref="panel.marks.grouping"]').closest(".opt");
        return { orderGrey: order.classList.contains("disabled"), orderButtons: [...order.querySelectorAll(".order-btn")].every((b) => b.disabled), choiceGrey: choice.classList.contains("disabled"), choiceInputs: [...choice.querySelectorAll("input")].every((i) => i.disabled) };
      });
      assert.deepEqual(await state(), { orderGrey: false, orderButtons: false, choiceGrey: false, choiceInputs: false }, "both are live while the panel and its marks part are on");
      await setPref(opts, "panel.show", false);
      let st = await state();
      assert.ok(st.orderGrey && st.orderButtons, "the panel's order of parts is greyed with the panel switch");
      await setPref(opts, "panel.show", true);
      await setPref(opts, "panel.marks.show", false);
      st = await state();
      assert.ok(st.choiceGrey && st.choiceInputs, "the grouping of the talk rows is greyed with the part's switch");
      await setPref(opts, "panel.marks.show", true);
      st = await state();
      assert.deepEqual(st, { orderGrey: false, orderButtons: false, choiceGrey: false, choiceInputs: false }, "and they wake");
      ok("what the settings say is drawn is what is counted and copied (the Awards & talks part off: not in a copied summary), and an order and a choice are greyed with the switch they hang on");
    } finally { await ctx13.close(); await fx13.close(); }
  }

  // -- 34. the accessibility review: the keyboard stays on a pill and goes to the search box after Clear, the parts have headings, the table and its buttons say the list and the tier, a drop-down button says what it is a year of,
  // the query's error is in words, the settings page says "Copied", names its chosen looks and takes a section link to the section
  {
    const fx14 = await start({ slug: "ion-stoica", pageSize: 100, latency: 0 });
    const ctx14 = await launch();
    try {
      const page = await ctx14.newPage();
      await page.goto(fx14.url);
      await page.waitForSelector("#rr-panel");
      await eventually(page, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      await page.bringToFront();
      const active = () => page.evaluate(() => { const a = document.activeElement; return a ? { tag: a.tagName, pill: a.dataset.pill || null, act: a.dataset.act || null, cls: String(a.className) } : null; });
      // a key press on a pill: the pill keeps the keyboard when the panel is drawn again
      await page.focus('#rr-panel .rr-spill[data-pill="ccfA"]');
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      assert.equal((await active()).pill, "ccfA", "the pill keeps the keyboard");
      // Clear in the filter bar by key: the bar goes with the filters, the keyboard goes to the search box
      await page.focus('#rr-panel [data-act="clear-filters"]');
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
      assert.match((await active()).cls, /rr-search-input/, "after Clear the keyboard is in the search box");
      // headings, a named table, buttons that say the list and the tier
      const sem = await page.evaluate(() => ({
        headings: [...document.querySelectorAll('#rr-panel [role="heading"]')].map((n) => [n.getAttribute("aria-level"), n.textContent.trim()]),
        table: (document.querySelector("#rr-panel table.rr-matrix") || {}).ariaLabel || document.querySelector("#rr-panel table.rr-matrix").getAttribute("aria-label"),
        cell: document.querySelector('#rr-panel button.rr-cell[data-role="first"][data-tier="A"]').getAttribute("aria-label"),
        head: document.querySelector('#rr-panel thead button[data-tier="A"]').getAttribute("aria-label"),
        none: document.querySelector('#rr-panel thead button[data-tier="none"]').getAttribute("aria-label")
      }));
      assert.ok(sem.headings.length >= 3 && sem.headings.every(([lvl, text]) => lvl === "3" && text), `the parts have headings: ${JSON.stringify(sem.headings)}`);
      assert.ok(sem.table, "the table has a name");
      assert.match(sem.cell, /^First, CCF A: \d+$/, "a cell says the role, the list and the tier");
      assert.equal(sem.head, "CCF A", "a column says its list");
      assert.match(sem.none, /ranked/i, "the column of what is not ranked is named in words");
      // a drop-down keeps its name when it shows a choice
      await page.click('#rr-panel [data-act="year-start"]');
      await page.locator("#rr-panel .rr-dd-list:not([hidden]) li").nth(2).click();
      assert.match(await page.locator('#rr-panel [data-act="year-start"]').getAttribute("aria-label"), /^[^:]+: \d{4}$/, "a year button reads 'From: 2024', not '2024'");
      // the query's error in words, linked to the box
      await page.locator("#rr-panel .rr-search-input").fill("cites:abc");
      await page.waitForTimeout(300);
      assert.equal(await page.locator("#rr-search-error").isVisible(), true, "the error is on the screen");
      assert.match(await page.locator("#rr-search-error").textContent(), /cites:abc.*cites.*takes a number, such as .*cites:>100/, "in the interface's words, the operator's as typed");
      assert.equal(await page.locator("#rr-panel .rr-search-input").getAttribute("aria-describedby"), "rr-search-error rr-search-keys");
      await page.locator("#rr-panel .rr-search-input").fill("");
      await page.waitForTimeout(300);
      assert.equal(await page.locator("#rr-search-error").isVisible(), false, "and goes with it");
      // the box's keys: in the "/" hint's tooltip, and the box's description for a screen reader
      assert.equal(await page.locator("#rr-panel .rr-search-input").getAttribute("aria-describedby"), "rr-search-keys", "with nothing wrong, the keys alone");
      assert.match(await page.locator("#rr-search-keys").textContent(), /Enter.*Shift\+Enter.*Esc/, "the keys, described");
      assert.match(await page.locator("#rr-panel .rr-search-kbd").getAttribute("title"), /\nEnter: next match/, "and in the hint's tooltip, on a line of their own");
      // the settings page
      const opts = await openOptions(ctx14);
      await opts.bringToFront();
      assert.equal(await opts.evaluate(() => [...document.querySelectorAll("h2 svg, .seg-btn svg")].filter((v) => v.getAttribute("aria-hidden") !== "true").length), 0, "no icon of the page is read out");
      assert.equal(await opts.locator('.theme-preset-card[aria-pressed="true"]').count() <= 1, true);
      assert.equal(await opts.locator(".theme-preset-card[aria-pressed]").count() > 3, true, "a look says whether it is chosen");
      assert.equal(await opts.locator(".chip-theme[aria-pressed]").count() > 3, true);
      await opts.click('[data-act="config-copy"]');
      await eventually(opts, () => document.getElementById("live").textContent === "Copied");
      const card = await opts.evaluate(() => document.querySelector("nav.toc a:nth-child(3)").dataset.card);
      await opts.focus("nav.toc a:nth-child(3)");
      await opts.keyboard.press("Enter");
      await opts.waitForTimeout(900);
      assert.equal(await opts.evaluate(() => document.activeElement && document.activeElement.id), card, "a section link taken by key leaves the keyboard in the section");
      ok("the keyboard stays on a pill and goes to the search box after Clear; headings, a named table, buttons with the list and the tier, a drop-down that keeps its name, the query's error in words; the settings page says Copied, names its looks and takes a section link to the section");
    } finally { await ctx14.close(); await fx14.close(); }
  }

  // -- 35. the "/" key is a setting (WCAG 2.1.4: a character key that does something can be switched off): on, it jumps to the search box; off, it does nothing, its hint goes, and so does the settings page's own
  {
    const fx15 = await start({ slug: "ion-stoica", pageSize: 100, latency: 0 });
    const ctx15 = await launch();
    try {
      const opts = await openOptions(ctx15);
      const page = await ctx15.newPage();
      await page.goto(fx15.url);
      await page.waitForSelector("#rr-panel");
      await eventually(page, () => document.querySelectorAll('[data-rr="matrix"] table').length === 1);
      await page.bringToFront();
      const focusedIsSearch = () => page.evaluate(() => /rr-search-input/.test(String((document.activeElement || {}).className)));
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press("/");
      assert.equal(await focusedIsSearch(), true, "on: the slash goes to the search box");
      assert.equal(await page.locator("#rr-panel .rr-search-kbd").isVisible(), true, "and its hint is drawn");
      await setPref(opts, "panel.filters.key", false);
      await eventually(page, () => document.querySelector("#rr-panel .rr-search-kbd").hidden === true);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press("/");
      assert.equal(await focusedIsSearch(), false, "off: the slash does nothing");
      await opts.bringToFront();
      assert.equal(await opts.locator(".opt-search-kbd").isVisible(), false, "the settings page's own hint goes with it");
      await opts.evaluate(() => document.activeElement && document.activeElement.blur());
      await opts.keyboard.press("/");
      assert.equal(await opts.evaluate(() => document.activeElement && document.activeElement.className.includes("opt-search")), false, "and its own slash does nothing");
      await setPref(opts, "panel.filters.key", true);
      await opts.evaluate(() => document.activeElement && document.activeElement.blur());
      await opts.keyboard.press("/");
      assert.equal(await opts.evaluate(() => document.activeElement && document.activeElement.className.includes("opt-search")), true, "on again: it jumps to the settings search");
      ok("the \"/\" key is a setting: on, it jumps to the search box (the panel's and the settings page's); off, it does nothing and its hint is gone");
    } finally { await ctx15.close(); await fx15.close(); }
  }

  }

  console.log(`\nAll ${step} checks passed${PART ? ` (part ${PART} of 4)` : ""}. Screenshots: ${outDir}`);
})().catch((e) => { console.error("\nE2E FAILED:", e && e.stack || e); process.exit(1); });
