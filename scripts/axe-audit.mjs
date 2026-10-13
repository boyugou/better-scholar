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
const ctx = await pw.chromium.launchPersistentContext("/tmp/pw-axe-" + Date.now(), { executablePath: chromiumPath, headless: true, viewport: { width: 1360, height: 900 }, permissions: ["clipboard-read", "clipboard-write"], args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--no-first-run"] });
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent("serviceworker");
const id = sw.url().split("/")[2];
const fx = await start({ slug: "ion-stoica", pageSize: 100 });
const run = async (page, label, include) => {
  await page.bringToFront();
  await page.evaluate(axeSrc);
  const res = await page.evaluate(async (inc) => { const r = await axe.run(inc ? { include: [[inc]] } : document, { resultTypes: ["violations"] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(1, 3).join(" ").slice(0, 160)) })); }, include || null);
  total += res.length;
  console.log(`${res.length ? "✗" : "✓"} ${label}: ${res.length} violation type(s)`);
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
// popup (aimed at the profile tab)
const tabId = await page.evaluate(() => 0).then(() => null);
const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${id}/popup/popup.html`); await popup.waitForTimeout(600);
await run(popup, "popup (no profile tab)");
// every part on, the wide layout, an RTL language, a Japanese one
const setPrefs = (patch) => opts.evaluate(async (pt) => { const r = await chrome.storage.sync.get("prefs"); await chrome.storage.sync.set({ prefs: { ...(r.prefs || {}), ...pt } }); }, patch);
await setPrefs({ panel: { show: true, summary: true, marks: true, filters: true, metrics: true, years: true, venues: true, status: true, names: true } });
await page.reload(); await page.bringToFront(); await page.waitForSelector("#rr-panel", { state: "attached" }); await page.waitForTimeout(1200);
await run(page, "panel, every part on", "#rr-panel");
await page.setViewportSize({ width: 760, height: 900 }); await page.waitForTimeout(600);
await run(page, "panel, wide layout (narrow window)", "#rr-panel");
await page.setViewportSize({ width: 1360, height: 900 });
for (const lang of ["ar", "ja", "th", "de"]) {
  await setPrefs({ language: lang });
  await page.reload(); await page.bringToFront(); await page.waitForSelector("#rr-panel", { state: "attached" }); await page.waitForTimeout(1200);
  await run(page, `panel in ${lang}`, "#rr-panel");
}
await setPrefs({ language: "auto" });
await ctx.close(); await fx.close();
console.log(total ? `\n${total} violation type(s)` : "\nno violations");
process.exit(total ? 1 : 0);
