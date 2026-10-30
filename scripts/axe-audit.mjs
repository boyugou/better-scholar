import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
// Dev tool: runs axe-core (fetched once into .cache/, never a dependency) over the panel (light, dark, filtered, every part on, wide layout, four
// languages), the settings page (light, dark) and the popup, against the local Scholar stand-in. Prints violations; exit code 1 if there are any.
//   node scripts/axe-audit.mjs
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { pw, chromiumPath } = await import(pathToFileURL(path.join(root, "test/e2e/find-browser.mjs")).href);
const { start } = await import(pathToFileURL(path.join(root, "test/e2e/fixture-server.js")).href).then((m) => m.default || m);
fs.mkdirSync(path.join(root, ".cache"), { recursive: true });
const axeFile = path.join(root, ".cache", "axe.min.js");
if (!fs.existsSync(axeFile)) fs.writeFileSync(axeFile, await (await fetch("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js")).text());
const axeSrc = fs.readFileSync(axeFile, "utf8");
let total = 0;
import os from "node:os";
const ext = fs.mkdtempSync(path.join(os.tmpdir(), "axe-ext-"));
fs.cpSync(path.join(root, "src"), ext, { recursive: true });
const mf = JSON.parse(fs.readFileSync(path.join(ext, "manifest.json"), "utf8"));
mf.content_scripts[0].matches = ["http://127.0.0.1/citations*"];
fs.writeFileSync(path.join(ext, "manifest.json"), JSON.stringify(mf, null, 2));
const ctx = await pw.chromium.launchPersistentContext(path.join(os.tmpdir(), "pw-axe-" + Date.now()), { executablePath: chromiumPath, headless: true, viewport: { width: 1360, height: 900 }, permissions: ["clipboard-read", "clipboard-write"], args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--no-first-run", ...(process.env.CI ? ["--no-sandbox"] : [])] });
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent("serviceworker");
const id = sw.url().split("/")[2];
const fx = await start({ slug: "ion-stoica", pageSize: 100 });
// (colours are measured once the page's transitions have ended: a note fading in or out — the settings page's "Saved" — is no colour anyone reads; on a slow
// machine axe caught it at 1.17 : 1 mid-fade. A contrast failure is measured again after the transitions running then have ended: a real one stays)
const settled = (page) => page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]));
const run = async (page, label, include) => {
  await page.bringToFront();
  await page.evaluate(axeSrc);
  const check = () => page.evaluate(async (inc) => { const r = await axe.run(inc ? { include: [[inc]] } : document, { resultTypes: ["violations"] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(1, 3).join(" ").slice(0, 160)) })); }, include || null);
  await settled(page);
  let res = await check(), again = "";
  if (res.some((v) => v.id === "color-contrast")) { await settled(page); res = await check(); again = " (contrast measured again once the transitions ended)"; }
  total += res.length;
  console.log(`${res.length ? "✗" : "✓"} ${label}: ${res.length} violation type(s)${again}`);
  for (const v of res) console.log(`- [${v.impact}] ${v.id}: ${v.help}\n    ` + v.nodes.join("\n    "));
};
// the profile page with the panel
const page = await ctx.newPage();
await page.goto(fx.url); await page.bringToFront(); await page.waitForSelector("#rr-panel", { state: "attached" }); await page.waitForTimeout(1200);
await run(page, "profile panel (light)", "#rr-panel");
await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(400);
await run(page, "profile panel (dark system)", "#rr-panel");
await page.emulateMedia({ colorScheme: "light" });
// filtered + open lists
await page.click('button.rr-cell[data-role="last"][data-tier="A"]'); await page.waitForTimeout(300);
await page.click('[data-rr="unmatched"] summary'); await page.waitForTimeout(300);
await run(page, "profile panel (filtered, list open)", "#rr-panel");
// settings, light and dark
const opts = await ctx.newPage();
await opts.goto(`chrome-extension://${id}/options/options.html`); await opts.waitForSelector(".toc a"); await opts.waitForTimeout(500);
await run(opts, "settings (light)");
await opts.emulateMedia({ colorScheme: "dark" }); await opts.waitForTimeout(400);
await run(opts, "settings (dark)");
// the settings page in the states a person puts it in: a part hovered (its tag and rail), a name being renamed on the preview, the tray of hidden things open, a venue checked, a venue being mapped and the list of mappings
for (const scheme of ["light", "dark"]) {
  await opts.emulateMedia({ colorScheme: scheme }); await opts.waitForTimeout(300);
  await opts.setViewportSize({ width: 1360, height: 1500 });
  await opts.hover('#pv-panel [data-section="metrics"] .rr-sec-title'); await opts.waitForTimeout(400);
  await run(opts, `settings (${scheme}): a part hovered, tag and rail shown`);
  await opts.dblclick('#pv-panel [data-section="metrics"] .rr-sec-title'); await opts.waitForSelector(".pv-rename-input");
  await run(opts, `settings (${scheme}): a name being renamed`);
  await opts.press(".pv-rename-input", "Escape");
  await opts.locator(".pv-tray summary").click(); await opts.waitForTimeout(200);
  await run(opts, `settings (${scheme}): the tray of hidden things open`);
  await opts.locator(".pv-tray summary").click();
  await opts.fill('[data-act="venue-check"]', "Proceedings of the IEEE conference on computer vision and pattern recognition"); await opts.waitForTimeout(200);
  await run(opts, `settings (${scheme}): a venue checked`, "#card-venue");
  // the person's own venue mappings: the search of the lists open with results, then a mapping in the list (removed again, so each scheme starts alike)
  await opts.fill('[data-act="venue-check"]', "TMLR, 2024"); await opts.click('[data-act="mine-assign"]'); await opts.fill('[data-act="mine-search"]', "machine learning"); await opts.waitForTimeout(200);
  await run(opts, `settings (${scheme}): assigning a venue line, the lists searched`, "#card-venue");
  await opts.press('[data-act="mine-search"]', "Enter"); await opts.waitForSelector(".mine-item");
  await run(opts, `settings (${scheme}): a mapped line and the list of mappings`, "#card-venue");
  await opts.click('[data-act="mine-remove"]'); await opts.waitForTimeout(300);
  await opts.fill('[data-act="venue-check"]', "");
  // your own quick filters: one with words, one with words the search cannot read (the reason in red under its field)
  await opts.fill('input[data-pref="panel.filters.searches.search1"]', "ccf:a role:first age:<5");
  await opts.fill('input[data-pref="panel.filters.searches.search2"]', "ccf:z");
  await opts.waitForTimeout(300);
  await run(opts, `settings (${scheme}): your own quick filters, one not read`, "#card-filters");
  await run(opts, `settings (${scheme}): the preview with your own quick filter`, "#pv-panel");
  for (const id of ["search1", "search2"]) await opts.fill(`input[data-pref="panel.filters.searches.${id}"]`, "");
}
await opts.setViewportSize({ width: 1360, height: 900 });
// popup (aimed at the profile tab)
const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${id}/popup/popup.html`); await popup.waitForTimeout(600);
await run(popup, "popup (no profile tab)");
// every part on, the wide layout, an RTL language, a Japanese one
const setPrefs = (patch) => opts.evaluate(async (pt) => { const B = RolesRanks, r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: B.prefs.apply(r.prefs || B.prefs.defaults(), pt).prefs }); }, patch);
await setPrefs({ panel: { venues: { show: true } } });          // (every other part is on by default)
await page.reload(); await page.bringToFront(); await page.waitForSelector("#rr-panel", { state: "attached" }); await page.waitForTimeout(1200);
await run(page, "panel, every part on", "#rr-panel");
await page.setViewportSize({ width: 760, height: 900 }); await page.waitForTimeout(600);
await run(page, "panel, wide layout (narrow window)", "#rr-panel");
await page.setViewportSize({ width: 1360, height: 900 });
// the toolbar popup over the profile tab: the table, the counts and the copy buttons, in the sizes of a popup, light and dark, in a few languages
const profileTab = await popup.evaluate(async () => { for (const t of await chrome.tabs.query({})) { try { const r = await chrome.tabs.sendMessage(t.id, { type: "rr:call", method: "summary" }); if (r && r.ok) return t.id; } catch (e) { /* not a profile */ } } return null; });
const popupAudit = async (label) => {
  await popup.goto(`chrome-extension://${id}/popup/popup.html?tab=${profileTab}`); await popup.waitForSelector(".who"); await popup.waitForTimeout(300);
  await run(popup, label);
};
for (const scheme of ["light", "dark"]) { await popup.emulateMedia({ colorScheme: scheme }); await popupAudit(`popup over a profile (${scheme})`); }
await popup.emulateMedia({ colorScheme: "light" });
for (const lang of ["ar", "ja", "th", "de"]) {
  await setPrefs({ language: lang });
  await page.waitForTimeout(1200);
  await page.bringToFront();
  await page.waitForSelector("#rr-panel", { state: "attached" });
  await run(page, `panel in ${lang}`, "#rr-panel");
  await popupAudit(`popup in ${lang}`);
}
await setPrefs({ language: "auto" });
await page.waitForTimeout(1200); await page.bringToFront(); await page.waitForSelector("#rr-panel", { state: "attached" });          // (a change of language reloads the profile page: the popup asks it for the summary)
// the popup with every renamable text at its longest (30 characters: words, full-width characters, letters with no space): does anything run into the popup's side margin
// (16 px), stick out of it or make it scroll sideways?
const NAMES = Object.keys((await import(pathToFileURL(path.join(root, "src/lib/prefs.js")).href).then((m) => m.default || m)).NAMES);
for (const [kind, text] of [["words", "Wmw Wmw Wmw Wmw Wmw Wmw Wmw Wm"], ["full-width", "漢".repeat(30)], ["no space", "W".repeat(30)], ["full-width, a button just clicked", "漢".repeat(30)]]) {
  await setPrefs({ labels: Object.fromEntries(NAMES.map((k) => [k, text])) });
  await popup.waitForTimeout(300);
  await popup.goto(`chrome-extension://${id}/popup/popup.html?tab=${profileTab}`); await popup.waitForSelector(".who"); await popup.waitForTimeout(300);
  let flashed = true;
  if (kind.includes("clicked")) {          // (a pressed button keeps its label's width while it says "Copied", 1.2 s — at most the row's; measured once it has said so)
    await popup.bringToFront();          // (a page in the back gets no animation frames: the wait polls on a timer, and the page is in front anyway; on a CI machine the copy — a call to
                                          // the page and back — has taken three seconds, once more than eight, before the button said so)
    await popup.click('.actions button.btn[data-act="copy-summary"]');
    // (a popup that draws its buttons again has none for a moment: the wait must not end there — a function that throws ends it at once)
    flashed = await popup.waitForFunction(() => { const b = document.querySelector('.actions button.btn[data-act="copy-summary"]'); return !!b && (!!b.style.minWidth || b.classList.contains("btn-flashed")); }, null, { timeout: 20000, polling: 50 }).then(() => true, () => false);
  }
  const out = await popup.evaluate(() => {          // (the popup is as wide as its body, 340 px; its content keeps 16 px from each side: what is not a full-width bar must end before that margin)
    const w = Math.round(document.body.getBoundingClientRect().width);
    const over = [...document.body.querySelectorAll("*")].filter((e) => { const r = e.getBoundingClientRect(); return !e.closest("[hidden], .sr") && r.width && (r.right > w + 1 || (r.left >= 15 && r.right > w - 15) || (e.clientWidth && e.scrollWidth > e.clientWidth + 1)); });          // (… or whose text runs out of its own box)
    return { scrollWidth: document.body.scrollWidth, w, over: over.slice(0, 4).map((e) => e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0] + " " + Math.round(e.getBoundingClientRect().right)) };
  });
  const bad = out.scrollWidth > out.w + 1 || out.over.length || !flashed;          // (a copy button's label wraps once it is wider than the row: 30 wide letters ran 5 px past the popup on Linux's fonts)
  if (bad) total++;
  const said = kind.includes("clicked") ? `, pressed: "${(await popup.textContent('.actions button.btn[data-act="copy-summary"]')).trim().slice(0, 20)}"` : "";          // (what the pressed button says: "Copied", or "Not copied" where the clipboard refuses)
  console.log(`${bad ? "✗" : "✓"} popup with every name at its longest (${kind}): width ${out.w}, scrollWidth ${out.scrollWidth}${out.over.length ? ", sticks out: " + out.over.join("; ") : ""}${flashed ? "" : ", the pressed button never said it had copied"}${said}`);
  if (kind.includes("clicked")) {          // (and the panel's: a pressed copy button stays in its row)
    await page.bringToFront();
    await page.click('#rr-panel .rr-copybar [data-act="copy-summary"]');
    const panelFlashed = await page.waitForFunction(() => { const b = document.querySelector('#rr-panel .rr-copybar [data-act="copy-summary"]'); return !!b && /min-width/.test(b.getAttribute("style") || ""); }, null, { timeout: 20000, polling: 50 }).then(() => true, () => false);
    const outside = await page.evaluate(() => { const bar = document.querySelector("#rr-panel .rr-copybar").getBoundingClientRect(); return [...document.querySelectorAll("#rr-panel .rr-copybar .rr-btn")].map((b) => b.getBoundingClientRect()).filter((r) => r.right > bar.right + 1 || r.left < bar.left - 1).map((r) => Math.round(r.width)); });
    if (outside.length || !panelFlashed) total++;
    const panelSaid = (await page.textContent('#rr-panel .rr-copybar [data-act="copy-summary"]')).trim().slice(0, 20);
    console.log(`${outside.length || !panelFlashed ? "✗" : "✓"} panel with every name at its longest (${kind}): ${!panelFlashed ? "the pressed button never said it had copied" : outside.length ? "buttons out of the copy row, " + outside.join(", ") + " px wide" : "every copy button in its row"}, pressed: "${panelSaid}"`);
  }
}
await setPrefs({ labels: Object.fromEntries(NAMES.map((k) => [k, ""])) });
await ctx.close(); await fx.close();
console.log(total ? `\n${total} violation type(s)` : "\nno violations");
process.exit(total ? 1 : 0);
