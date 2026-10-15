#!/usr/bin/env node
// The Chrome Web Store pictures: five 1280×800 screenshots, the small (440×280) and marquee (1400×560) promo tiles and the
// 128 px store icon, written to store/chrome/images/ together with a README that says what each one shows.
//
//   npm run store:images
//
// Every picture is of the real extension: src/ is loaded into Playwright's Chromium (found as in test/e2e/find-browser.mjs) and
// opened on the end-to-end test's stand-in Scholar page (test/e2e/fixture-server.js) with the FICTIONAL showcase profile
// (test/fixtures/profiles/showcase.json), never a real person's papers. Each capture is taken at twice its final size and laid
// out in a small HTML page (inline CSS, the capture as a data URI, the system's own sans-serif), which Chromium photographs as a
// JPEG. Nothing is written to store/chrome/images/ unless every picture was made and has the right size.
// Run it again whenever the interface changes. No dependencies beyond Playwright.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const outDir = path.join(repo, "store", "chrome", "images");
const require = createRequire(import.meta.url);
const QUALITY = 95;                                     // JPEG quality (the store takes JPEG or 24-bit PNG without alpha)

const { pw, chromiumPath } = await import(pathToFileURL(path.join(repo, "test", "e2e", "find-browser.mjs")).href);
if (!pw || !chromiumPath) {
  console.error("store-images: Playwright or a Chromium build was not found (set PLAYWRIGHT_PATH / CHROMIUM_PATH, see test/e2e/find-browser.mjs).");
  process.exit(1);
}
const { start } = require(path.join(repo, "test", "e2e", "fixture-server.js"));

// ---- the words: one headline (six words at most) and one caption line per picture, and what the README says about it ----------
const QUERY = "role:first ccf:a cites:>100";
const SHOTS = {
  profile: {
    file: "screenshot-1.jpg", title: "See your role in every paper",
    caption: "Rows coloured by authorship role, each venue marked with today's CCF and CORE rank.",
    about: "A Scholar profile with the extension on: each paper's row is tinted by the owner's authorship role (first, second, last author), the owner's name is marked in the author line, the venue carries its CCF and CORE chips, awards and talks have their own chips (Best paper, Oral, Spotlight), and the panel at the top of the sidebar adds it up in the role × rank table."
  },
  panel: {
    file: "screenshot-2.jpg", title: "Papers by role and rank",
    caption: "One table, with awards and talks, citation totals and one-click copy or export.",
    about: "The panel up close, in the two-column layout it takes in a narrower window: the role × rank table with its CCF / CORE switch, the copy and export buttons (summary, table, papers, APA, BibTeX, Markdown, JSON, CSV), the note that the ranks are today's lists, the Awards & talks counts, the highlighted papers by year, the filters and the citation totals of the highlighted papers."
  },
  search: {
    file: "screenshot-3.jpg", title: "Filter by role, rank and citations",
    caption: "Type " + QUERY + " and the list and its citation totals follow.",
    about: "The panel's search box with the query `" + QUERY + "` typed in: the paper list keeps the five first-author CCF A papers with more than 100 citations, the filter bar at the top of the panel says \"Showing 5 of 12 papers\" and offers Clear, the matching quick-filter pills light up, and the citation totals count only those papers."
  },
  settings: {
    file: "screenshot-4.jpg", title: "Choose what you see",
    caption: "Every role, colour and part of the panel has its own switch, with a live preview.",
    about: "The settings page (light): the \"Highlight my papers\" switches for each authorship role and for marking your name, the start of the Colours section with its palettes, and on the right the live preview (sample papers and the real panel), which is always Scholar's light page."
  },
  popup: {
    file: "screenshot-5.jpg", title: "Your summary in the toolbar",
    caption: "The toolbar button shows the open profile's table, with the same copy and export.",
    about: "The toolbar popup open over the profile page: the profile owner and paper count, the role × rank table (here by CORE rank; CCF is one click away), the Awards & talks line, the copy and export buttons and the note on where the ranks come from."
  }
};
const PROMO = {
  name: "Better Scholar",
  small: "Roles and ranks on every paper",
  marquee: "Your authorship role and each venue's CCF and CORE rank, on every Scholar profile."
};

// ---- a copy of the extension that also runs on the stand-in page (as in test/e2e/run.mjs) -------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bs-store-"));
const extDir = path.join(tmp, "ext");
fs.cpSync(path.join(repo, "src"), extDir, { recursive: true });
const manifestPath = path.join(extDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.content_scripts[0].matches = ["http://127.0.0.1/citations*"];
manifest.content_scripts[1].matches = ["http://127.0.0.1/*"];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
// the shipped award list, plus the one (fictional) award of the fictional showcase profile, as in the end-to-end test
const awardsLib = require(path.join(repo, "src", "lib", "awards.js"));
const shipped = require(path.join(repo, "src", "data", "awards.js"));
const awards = { meta: shipped.meta, items: [...shipped.items, [awardsLib.titleKey("Fast Recovery for Disaggregated Memory"), awardsLib.surnameKey("S Patel"), "OSDI", 2023, "best", "Best Paper Award"]] };
fs.writeFileSync(path.join(extDir, "data", "awards.js"),
  `(globalThis.RolesRanks = globalThis.RolesRanks || {}).data = Object.assign(globalThis.RolesRanks.data || {}, { awards: ${JSON.stringify(awards)} });\n`);
// unpacked-extension id = first 32 hex of sha256(realpath), digits mapped to a–p
const extId = [...crypto.createHash("sha256").update(fs.realpathSync(extDir)).digest("hex").slice(0, 32)]
  .map((c) => String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16))).join("");
// a browser profile with spell checking off: no red underline under the search operators
const profileDir = path.join(tmp, "profile");
fs.mkdirSync(path.join(profileDir, "Default"), { recursive: true });
fs.writeFileSync(path.join(profileDir, "Default", "Preferences"), JSON.stringify({ browser: { enable_spellchecking: false }, spellcheck: { dictionaries: [] } }));

// ---- helpers -------------------------------------------------------------------------------------------------------------
const SCALE = 2;                                        // captures are taken at 2× and shown at about 1×: crisp text after the layout scales them
const dataUri = (buf, type = "image/png") => `data:${type};base64,${buf.toString("base64")}`;
const svgUri = (file) => dataUri(fs.readFileSync(path.join(repo, file)), "image/svg+xml");
const ICON = svgUri("assets/icon.svg");
const ICON_SMALL = svgUri("assets/icon-small.svg");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// extension pages: their content security policy can refuse waitForFunction's string predicates, so they are polled with evaluate
async function poll(page, fn, arg, what, timeout = 10000) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(fn, arg)) return;
    if (Date.now() - t0 > timeout) throw new Error("timed out waiting for " + what);
    await page.waitForTimeout(100);
  }
}

// a photograph of the current viewport (a background tab cannot be photographed, so the tab comes to the front first)
async function shoot(page, opts = {}) {
  await page.bringToFront();
  await page.mouse.move(0, 0);                          // (no hover state on whatever is under the pointer)
  return page.screenshot({ animations: "disabled", caret: "hide", ...opts });
}

// width and height of a JPEG (from its start-of-frame marker) and its number of colour components
function jpegInfo(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < buf.length;) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), components: buf[i + 9] };
    i += 2 + len;
  }
  return null;
}
const pngInfo = (buf) => (buf.toString("ascii", 1, 4) === "PNG" ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } : null);

// ---- the layouts ---------------------------------------------------------------------------------------------------------
const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;     // (the popup's own font stack)
const INK = "#131a2e", SUB = "#4c566c", NAVY_1 = "#27324f", NAVY_2 = "#161d33";

const BASE_CSS = `
*{box-sizing:border-box}
html,body{margin:0;overflow:hidden}
body{font-family:${FONT};color:${INK};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
img{display:block}
`;

// the screenshots: a soft light ground with a faint wash of the role colours, the headline and caption, then the capture
const SHOT_CSS = BASE_CSS + `
html,body{width:1280px;height:800px}
body{position:relative;background:
  radial-gradient(760px 360px at 8% -6%, rgba(77,143,245,.14), transparent 72%),
  radial-gradient(760px 360px at 94% -8%, rgba(179,108,246,.11), transparent 72%),
  linear-gradient(180deg,#f8f9fc 0%,#eceff6 100%)}
.copy{position:absolute;left:0;right:0;top:40px;text-align:center;padding:0 64px}
h1{margin:0;font-size:42px;line-height:50px;font-weight:700;letter-spacing:-.022em}
p.cap{margin:8px 0 0;font-size:19px;line-height:27px;color:${SUB};letter-spacing:-.003em}
p.cap code{font:600 17px/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:${INK};background:rgba(255,255,255,.75);border:1px solid #d9deea;border-radius:6px;padding:2px 7px;margin:0 2px}
.win{position:absolute;background:#fff;border-radius:12px 12px 0 0;overflow:hidden;
  box-shadow:0 0 0 1px rgba(19,26,46,.07),0 2px 6px rgba(19,26,46,.05),0 22px 56px -14px rgba(19,26,46,.26)}
.bar{height:36px;display:flex;align-items:center;gap:7px;padding:0 12px 0 14px;background:#eef0f4;border-bottom:1px solid #dfe2e8}
.bar i{width:11px;height:11px;border-radius:50%;background:#d3d7de;flex:none}
.bar .addr{flex:1;height:22px;margin:0 22px 0 18px;border-radius:7px;background:#fff;border:1px solid #e0e3e9}
.bar .ext{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex:none}
.bar .ext img{width:17px;height:17px}
.bar .ext.on{background:#dde1e8}
.card{position:absolute;overflow:hidden;background:#fff;box-shadow:0 2px 6px rgba(19,26,46,.06),0 26px 60px -16px rgba(19,26,46,.28)}
.bubble{position:absolute;overflow:hidden;background:#fff;border-radius:10px;
  box-shadow:0 0 0 1px rgba(19,26,46,.10),0 4px 10px rgba(19,26,46,.10),0 24px 52px -10px rgba(19,26,46,.36)}
`;

const COPY_TOP = 40, WIN_TOP = 156, BAR_H = 36;        // headline block, then the window from here down past the bottom edge
const PAGE_ZOOM = 0.9;                                  // the Scholar page is shown at 90 %: the whole width of the profile fits

function copyBlock(shot, captionHtml) {
  return `<div class="copy"><h1>${esc(shot.title)}</h1><p class="cap">${captionHtml || esc(shot.caption)}</p></div>`;
}
// a plain browser window (no address, no tab title: the stand-in page's address would be a local one) holding a capture
function windowHtml({ img, cssW, cssH, zoom, left, extOn = false, extra = "" }) {
  const w = Math.round(cssW * zoom), h = Math.round(cssH * zoom);
  return `<div class="win" style="left:${left}px;top:${WIN_TOP}px;width:${w}px;height:${h + BAR_H}px">` +
    `<div class="bar"><i></i><i></i><i></i><span class="addr"></span><span class="ext${extOn ? " on" : ""}"><img src="${ICON_SMALL}" alt=""></span></div>` +
    `<img src="${img}" style="width:${w}px;height:${h}px" alt="">${extra}</div>`;
}
const page1280 = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${SHOT_CSS}</style></head><body>${body}</body></html>`;

// the promo tiles: the icon's navy, the name, one line, and a crop of the real panel
const PROMO_CSS = (w, h) => BASE_CSS + `
html,body{width:${w}px;height:${h}px}
body{position:relative;color:#fff;background:
  radial-gradient(${Math.round(w * .7)}px ${Math.round(h * .9)}px at 0% 0%, rgba(77,143,245,.22), transparent 70%),
  radial-gradient(${Math.round(w * .6)}px ${Math.round(h * .9)}px at 100% 100%, rgba(179,108,246,.16), transparent 70%),
  linear-gradient(160deg,${NAVY_1} 0%,${NAVY_2} 100%)}
.name{margin:0;font-weight:750;letter-spacing:-.025em;line-height:1.05}
.line{margin:0;color:#c9d2e8;letter-spacing:-.005em}
.card{position:absolute;overflow:hidden;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.22),0 18px 48px -10px rgba(0,0,0,.55)}
.crop{position:absolute;left:0;top:0}
`;

// ---- main ----------------------------------------------------------------------------------------------------------------
let fx = null, context = null, composer = null;
const made = {};                                        // file name → Buffer
try {
  fx = await start({ slug: "showcase", pageSize: 100 });
  const total = fx.profile.rows.length;
  context = await pw.chromium.launchPersistentContext(profileDir, {
    executablePath: chromiumPath,
    headless: true,
    viewport: { width: 1232, height: 760 },
    deviceScaleFactor: SCALE,
    locale: "en-US",
    colorScheme: "light",
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, "--no-first-run", "--lang=en-US", ...(process.env.CI ? ["--no-sandbox"] : [])]
  });
  const errors = [];
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(p.url() + ": " + e.message)));

  // the profile, settled: every row in, the table drawn, the showcase's award found, the extension says it is ready
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push("profile: " + e.message));
  await page.goto(fx.url);
  await page.waitForSelector('#rr-panel [data-rr="matrix"] table', { timeout: 15000 });
  await page.waitForFunction((n) => document.documentElement.getAttribute("data-rr-ready") === "true"
    && document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length === n
    && document.querySelectorAll('.rr-chip-mark[data-group="award"][data-source="list"]').length === 1
    && !/Loading…/.test(document.getElementById("rr-panel").textContent), total, { timeout: 15000, polling: 100 });
  await page.evaluate(() => document.fonts.ready);

  // 1. the profile page as it opens: the window shows the top of the page, the stand-in's own sidebar boxes stay below the fold
  const PAGE_W = 1232;                                  // the stand-in page is 1200 px wide plus its margins, as on Scholar
  const pageH = Math.ceil((800 - WIN_TOP - BAR_H) / PAGE_ZOOM) + 24;   // (the window runs past the bottom edge)
  await page.setViewportSize({ width: PAGE_W, height: pageH });
  await page.evaluate(() => window.scrollTo(0, 0));
  const shotProfile = await shoot(page);

  // the panel by itself for the promo tiles (sidebar layout), before anything is filtered
  const panelSide = await page.locator("#rr-panel").screenshot({ animations: "disabled", caret: "hide" });
  const panelSideBox = await page.evaluate(() => {
    const p = document.getElementById("rr-panel").getBoundingClientRect();
    const rel = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height }; };
    return { w: p.width, h: p.height, matrix: rel('#rr-panel [data-rr="matrix"]'), marks: rel('#rr-panel [data-rr="marks"]') };
  });

  // 2. the panel up close, in the two-column layout a narrower window gives it
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForFunction(() => document.getElementById("rr-panel").classList.contains("rr-wide"), null, { timeout: 10000 });
  await page.waitForTimeout(300);                       // (the year chart is redrawn for the new width)
  await page.bringToFront(); await page.mouse.move(0, 0);
  const shotPanel = await page.locator("#rr-panel").screenshot({ animations: "disabled", caret: "hide" });
  const panelWideBox = await page.evaluate(() => { const r = document.getElementById("rr-panel").getBoundingClientRect(); return { w: r.width, h: r.height }; });

  // 3. the search: the query typed into the panel's box (focused from the keyboard, so no pointer hovers anything)
  await page.setViewportSize({ width: PAGE_W, height: pageH });
  await page.waitForFunction(() => !document.getElementById("rr-panel").classList.contains("rr-wide"), null, { timeout: 10000 });
  await page.locator('#rr-panel input[data-act="filter-query"]').focus();
  await page.keyboard.type(QUERY, { delay: 15 });
  // (the last word is an operator, so the suggestion list is open: Escape closes the list and keeps the text, as a person would)
  if (await page.locator("#rr-panel .rr-search-suggest").isVisible()) await page.keyboard.press("Escape");
  await page.waitForFunction((n) => {
    const bar = document.querySelector('#rr-panel [data-rr="filterbar"]');
    const shown = document.querySelectorAll("#gsc_a_b tr.gsc_a_tr:not(.rr-hide)").length;
    return bar && !bar.hidden && shown > 0 && shown < n;
  }, total, { timeout: 10000, polling: 100 });
  const searchState = await page.evaluate(() => ({
    bar: document.querySelector('#rr-panel [data-rr="filterbar"]').textContent.replace(/\s+/g, " ").trim(),
    shown: document.querySelectorAll("#gsc_a_b tr.gsc_a_tr:not(.rr-hide)").length,
    boxBottom: document.querySelector("#rr-panel .rr-search-pills").getBoundingClientRect().bottom + scrollY,
    listTop: document.querySelector("#gsc_a_t").getBoundingClientRect().top + scrollY
  }));
  if (!/Showing \d+ of \d+ papers/.test(searchState.bar)) throw new Error("the filter bar does not say how many papers are shown: " + searchState.bar);
  const searchScroll = Math.max(0, Math.min(Math.floor(searchState.listTop) - 10, Math.ceil(searchState.boxBottom + 34 - (800 - WIN_TOP - BAR_H) / PAGE_ZOOM)));
  await page.evaluate((y) => window.scrollTo(0, y), searchScroll);
  const shotSearch = await shoot(page);
  // clear the search again (Escape empties the box), so the popup and the page behind it show the whole profile
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector('#rr-panel [data-rr="filterbar"]').hidden, null, { timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));

  // 4. the settings page, scrolled to "Highlight my papers" (its heading just below the sticky row of section links)
  const SET_W = 1120, SET_ZOOM = 0.98;
  const setH = Math.ceil((800 - WIN_TOP - BAR_H) / SET_ZOOM) + 24;
  const opts = await context.newPage();
  await opts.setViewportSize({ width: SET_W, height: setH });
  await opts.goto(`chrome-extension://${extId}/options/options.html`);
  await poll(opts, () => !!document.querySelector('input[data-pref="roles.first"]') && !!document.querySelector(".toc a") && !!document.querySelector("#pv-panel #rr-panel, #pv-panel section"), null, "the settings page");
  await opts.evaluate(() => document.fonts.ready);
  const target = await opts.evaluate(() => {
    const card = document.querySelector('input[data-pref="roles.first"]').closest("section");
    const toc = document.querySelector(".toc");
    return card.getBoundingClientRect().top + scrollY - toc.getBoundingClientRect().height - 14;
  });
  await opts.evaluate((y) => window.scrollTo(0, y), Math.max(0, Math.round(target)));
  await opts.waitForTimeout(400);                       // (the section links follow the scroll)
  // the heading of the card must sit below the sticky links, not under them
  const covered = await opts.evaluate(() => {
    const head = document.querySelector('input[data-pref="roles.first"]').closest("section").querySelector("h2, h3, .card-title, header");
    const toc = document.querySelector(".toc").getBoundingClientRect();
    return head ? head.getBoundingClientRect().top < toc.bottom : false;
  });
  if (covered) throw new Error("the settings card's heading is under the sticky section links");
  const shotSettings = await shoot(opts);

  // 5. the toolbar popup for the profile tab (opened as a page, the way the end-to-end test does), by CORE rank
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 340, height: 600 });
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
  const tabId = await popup.evaluate(async () => {
    for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } }
    return null;
  });
  if (tabId == null) throw new Error("the profile tab did not answer the popup");
  await popup.goto(`chrome-extension://${extId}/popup/popup.html?tab=${tabId}`);
  await poll(popup, () => !!document.querySelector(".who") && !!document.querySelector("main table") && !!document.querySelector(".seg"), null, "the popup's table");
  await popup.evaluate(() => [...document.querySelectorAll(".seg button")].find((b) => b.textContent.trim() === "CORE").click());
  await poll(popup, () => { const b = [...document.querySelectorAll(".seg button")].find((x) => x.textContent.trim() === "CORE"); return b && b.getAttribute("aria-pressed") === "true"; }, null, "the popup's CORE table");
  await popup.evaluate(() => document.fonts.ready);
  const popupH = await popup.evaluate(() => Math.ceil(document.documentElement.getBoundingClientRect().height));
  await popup.setViewportSize({ width: 340, height: popupH });
  const shotPopup = await shoot(popup, { clip: { x: 0, y: 0, width: 340, height: popupH } });
  // and the page behind it
  await page.setViewportSize({ width: PAGE_W, height: pageH });
  await page.evaluate(() => window.scrollTo(0, 0));
  const shotBehind = await shoot(page);

  if (errors.length) throw new Error("page errors:\n  " + errors.join("\n  "));
  for (const p of context.pages()) await p.close();
  await context.close(); context = null;
  await fx.close(); fx = null;

  // ---- compose ----------------------------------------------------------------------------------------------------------
  composer = await pw.chromium.launch({ executablePath: chromiumPath, headless: true });
  const sheet = await composer.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  async function render(file, html, width, height) {
    await sheet.setViewportSize({ width, height });
    await sheet.setContent(html, { waitUntil: "load" });
    await sheet.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode())); await document.fonts.ready; });
    made[file] = await sheet.screenshot({ type: "jpeg", quality: QUALITY, animations: "disabled", caret: "hide" });
  }
  const winLeft = (cssW, zoom) => Math.round((1280 - cssW * zoom) / 2);

  // 1
  await render(SHOTS.profile.file, page1280(copyBlock(SHOTS.profile) +
    windowHtml({ img: dataUri(shotProfile), cssW: PAGE_W, cssH: pageH, zoom: PAGE_ZOOM, left: winLeft(PAGE_W, PAGE_ZOOM) })), 1280, 800);

  // 2: the panel as a card, larger than life
  {
    const zoom = Math.min(1.12, (800 - WIN_TOP - 36) / panelWideBox.h, 1120 / panelWideBox.w);
    const w = Math.round(panelWideBox.w * zoom), h = Math.round(panelWideBox.h * zoom);
    const top = WIN_TOP + Math.round((800 - WIN_TOP - 20 - h) / 2);
    await render(SHOTS.panel.file, page1280(copyBlock(SHOTS.panel) +
      `<div class="card" style="left:${Math.round((1280 - w) / 2)}px;top:${top}px;width:${w}px;height:${h}px;border-radius:${(10 * zoom).toFixed(1)}px"><img src="${dataUri(shotPanel)}" style="width:${w}px;height:${h}px" alt=""></div>`), 1280, 800);
  }

  // 3
  await render(SHOTS.search.file, page1280(copyBlock(SHOTS.search, "Type <code>" + esc(QUERY) + "</code> and the list and its citation totals follow.") +
    windowHtml({ img: dataUri(shotSearch), cssW: PAGE_W, cssH: pageH, zoom: PAGE_ZOOM, left: winLeft(PAGE_W, PAGE_ZOOM) })), 1280, 800);

  // 4
  await render(SHOTS.settings.file, page1280(copyBlock(SHOTS.settings) +
    windowHtml({ img: dataUri(shotSettings), cssW: SET_W, cssH: setH, zoom: SET_ZOOM, left: winLeft(SET_W, SET_ZOOM) })), 1280, 800);

  // 5: the popup hangs from the toolbar button at the window's top right, as Chrome draws it
  {
    const zoom = 1.06;
    const pw5 = Math.round(340 * zoom), ph5 = Math.round(popupH * zoom);
    const winW = Math.round(PAGE_W * PAGE_ZOOM);
    const bubble = `<div class="bubble" style="right:12px;top:${BAR_H + 6}px;width:${pw5}px;height:${ph5}px"><img src="${dataUri(shotPopup)}" style="width:${pw5}px;height:${ph5}px" alt=""></div>`;
    await render(SHOTS.popup.file, page1280(copyBlock(SHOTS.popup) +
      windowHtml({ img: dataUri(shotBehind), cssW: PAGE_W, cssH: pageH, zoom: PAGE_ZOOM, left: winLeft(PAGE_W, PAGE_ZOOM), extOn: true, extra: bubble })), 1280, 800);
    if (BAR_H + 6 + ph5 > 800 - WIN_TOP) throw new Error("the popup does not fit in the window");
    void winW;
  }

  // promo tiles: the panel's table (and, on the marquee, its copy row and awards) as a card on the brand navy
  const sideUri = dataUri(panelSide);
  const crop = ({ x, y, w, h, zoom, left, top, radius }) =>
    `<div class="card" style="left:${left}px;top:${top}px;width:${Math.round(w * zoom)}px;height:${Math.round(h * zoom)}px;border-radius:${radius}px">` +
    `<img class="crop" src="${sideUri}" style="width:${Math.round(panelSideBox.w * zoom)}px;height:${Math.round(panelSideBox.h * zoom)}px;left:${Math.round(-x * zoom)}px;top:${Math.round(-y * zoom)}px" alt=""></div>`;
  {
    // small (440×280): name and line at the left, the table peeking in from the bottom right
    const z = 0.82;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${PROMO_CSS(440, 280)}</style></head><body>
<img src="${ICON}" alt="" style="position:absolute;left:28px;top:30px;width:52px;height:52px">
<h1 class="name" style="position:absolute;left:28px;top:96px;font-size:31px;width:200px">${esc(PROMO.name).replace(" ", "<br>")}</h1>
<p class="line" style="position:absolute;left:28px;top:178px;font-size:15px;line-height:20px;width:170px">${esc(PROMO.small)}</p>
${crop({ x: 0, y: 0, w: panelSideBox.w, h: panelSideBox.matrix.y + panelSideBox.matrix.h, zoom: z, left: 218, top: 34, radius: 10 })}
</body></html>`;
    await render("promo-small.jpg", html, 440, 280);
  }
  {
    // marquee (1400×560): the icon, the name and the line at the left, the panel at the right running off the bottom edge
    const z = 1.16;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${PROMO_CSS(1400, 560)}</style></head><body>
<img src="${ICON}" alt="" style="position:absolute;left:112px;top:150px;width:96px;height:96px">
<h1 class="name" style="position:absolute;left:112px;top:270px;font-size:64px">${esc(PROMO.name)}</h1>
<p class="line" style="position:absolute;left:112px;top:350px;font-size:24px;line-height:33px;width:560px">${esc(PROMO.marquee)}</p>
${crop({ x: 0, y: 0, w: panelSideBox.w, h: panelSideBox.marks.y + panelSideBox.marks.h, zoom: z, left: 860, top: 64, radius: 12 })}
</body></html>`;
    await render("promo-marquee.jpg", html, 1400, 560);
  }

  // ---- check, then write ------------------------------------------------------------------------------------------------
  const want = { "promo-small.jpg": [440, 280], "promo-marquee.jpg": [1400, 560] };
  for (const s of Object.values(SHOTS)) want[s.file] = [1280, 800];
  for (const [file, [w, h]] of Object.entries(want)) {
    const info = made[file] && jpegInfo(made[file]);
    if (!info) throw new Error(file + " was not made, or is not a JPEG");
    if (info.width !== w || info.height !== h || info.components !== 3) throw new Error(`${file} is ${info.width}×${info.height} with ${info.components} components; the store wants ${w}×${h}, 3 (no alpha)`);
  }
  const icon = fs.readFileSync(path.join(repo, "src", "icons", "icon-128.png"));
  const iconInfo = pngInfo(icon);
  if (!iconInfo || iconInfo.width !== 128 || iconInfo.height !== 128) throw new Error("src/icons/icon-128.png is not a 128×128 PNG");

  fs.mkdirSync(outDir, { recursive: true });
  for (const [file, buf] of Object.entries(made)) fs.writeFileSync(path.join(outDir, file), buf);
  fs.writeFileSync(path.join(outDir, "icon-128.png"), icon);
  fs.writeFileSync(path.join(outDir, "README.md"), readme());
  for (const file of [...Object.keys(want), "icon-128.png", "README.md"]) console.log("wrote", path.relative(repo, path.join(outDir, file)));
  console.log(`(search: "${searchState.bar}", ${searchState.shown} of ${total} rows shown)`);
} catch (e) {
  console.error("store-images: " + (e && e.stack ? e.stack : e));
  process.exitCode = 1;
} finally {
  if (context) { for (const p of context.pages()) await p.close().catch(() => {}); await context.close().catch(() => {}); }
  if (composer) await composer.close().catch(() => {});
  if (fx) await fx.close().catch(() => {});
  fs.rmSync(tmp, { recursive: true, force: true });
}

function readme() {
  const shots = Object.values(SHOTS).map((s) => `## ${s.file} (1280×800)\n\n**${s.title}.** ${s.caption}\n\n${s.about}\n`).join("\n");
  return `# Chrome Web Store images

Made by \`npm run store:images\` (scripts/store-images.mjs), which rewrites every file here, this one included: edit the
words in the script, not here. The screenshots are of the real extension running in Chromium on the end-to-end test's stand-in
Scholar page, with the fictional showcase profile "Alex Example" (\`test/fixtures/profiles/showcase.json\`); no real person's data,
no Google or Scholar logo. Screenshots and promo tiles are JPEG (quality ${QUALITY}, no alpha).

${shots}
## promo-small.jpg (440×280)

The small promo tile: the icon, "${PROMO.name}", the line "${PROMO.small}", and the top of the real panel (its role × rank
table) on the icon's navy.

## promo-marquee.jpg (1400×560)

The marquee promo tile: the icon, "${PROMO.name}", the line "${PROMO.marquee}", and the real panel's table, copy and export
buttons, data note and Awards & talks counts, running off the bottom edge.

## icon-128.png (128×128)

A copy of \`src/icons/icon-128.png\`, the extension's own icon. (The store's guidance is a 96×96 artwork with 16 px of
transparent padding per side; this icon fills the whole square.)
`;
}
