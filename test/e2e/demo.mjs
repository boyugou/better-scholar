#!/usr/bin/env node
// End-to-end test of the web demo (scripts/build-demo.mjs): the real settings page running in an ordinary Chromium page, with no extension
// loaded, as a visitor of the website meets it.
//
//   npm run test:demo
//
// Builds dist/demo, serves it from a tiny static server of its own and drives it with Playwright (found as in find-browser.mjs; without it the
// test prints a notice and exits 0, so that nothing else depends on it). Every page is opened in a context of its own, so that what one check saves
// cannot reach the next.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(import.meta.url);

const { pw, chromiumPath } = await import("./find-browser.mjs");
if (!pw || !chromiumPath) {
  console.log("demo test skipped: Playwright or a Chromium build was not found (set PLAYWRIGHT_PATH / CHROMIUM_PATH).");
  process.exit(0);
}

// ---- build, serve ------------------------------------------------------------------------------------------------------------------------------
const built = spawnSync(process.execPath, [path.join(repo, "scripts", "build-demo.mjs")], { encoding: "utf8" });
assert.equal(built.status, 0, built.stderr || built.stdout);
const root = path.join(repo, "dist", "demo");
const manifest = JSON.parse(fs.readFileSync(path.join(repo, "src", "manifest.json"), "utf8"));
const { codes } = require(path.join(repo, "src", "lib", "i18n.js"));
const { PRESETS } = require(path.join(repo, "src", "lib", "prefs.js"));
const messagesOf = (folder) => JSON.parse(fs.readFileSync(path.join(root, "_locales", folder, "messages.json"), "utf8"));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let file = path.normalize(path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) res.writeHead(404).end("not found");
    else res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(data);
  });
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await pw.chromium.launch({ executablePath: chromiumPath, args: process.env.CI ? ["--no-sandbox"] : [] });
const problems = [];                 // console errors, uncaught errors, failed requests: none is allowed
const outside = [];                  // requests to anywhere but the demo's own server

let step = 0;
const ok = (msg) => console.log(`  ✓ ${String(++step).padStart(2)}  ${msg}`);

// A page in a context of its own (`locale`: the browser's language; `init`: a script that runs before the page's own).
async function open(search = "", { locale = "en-US", init } = {}) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale });
  if (init) await context.addInitScript(init);
  await context.route(/^https?:/, (route) => {
    const url = route.request().url();
    if (url.startsWith(origin + "/")) return route.continue();
    outside.push(url);
    return route.abort();
  });
  const page = await newPage(context);
  await page.goto(origin + "/" + search);
  await page.waitForSelector('input[data-pref="roles.last"]');
  return { context, page };
}
async function newPage(context) {
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`); });
  // (a request cut off by a reload is not a failure: the page reloads itself, twice, when the interface language changes)
  page.on("requestfailed", (r) => { if (!/ERR_ABORTED/.test(r.failure() ? r.failure().errorText : "")) problems.push("request failed: " + r.url()); });
  return page;
}
// polls `fn` in the page until it holds (a page that is reloading meanwhile is asked again)
const until = async (page, fn, arg, timeout = 10000) => {
  const t0 = Date.now();
  for (;;) {
    let done = false;
    try { done = await page.evaluate(fn, arg); } catch (e) { if (!/context was destroyed|navigation/i.test(e.message)) throw e; }
    if (done) return;
    if (Date.now() - t0 > timeout) throw new Error("timed out waiting for: " + fn.toString().slice(0, 120));
    await page.waitForTimeout(50);
  }
};
const ccfChips = (page) => page.locator('#preview .rr-chip[data-kind="ccf"]').count();
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("rr-demo:sync:prefs")));

try {
  // -- 1. what the build wrote
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const listed = /data-scripts="([^"]+)"/.exec(index)[1].split(" ");
  assert.ok(listed.length >= 8 && listed.every((f) => fs.existsSync(path.join(root, f))), "every script the page loads is in the folder");
  assert.equal(listed[0], "lib/i18n.js", "the page's own order is kept");
  assert.ok(!/<script\b[^>]*\bsrc="(?!demo-shim\.js)/.test(index), "no script of the page is left in index.html (the stand-in adds them)");
  assert.equal(new RegExp(`data-version="${manifest.version}"`).test(index), true, "the version is the manifest's");
  assert.deepEqual(fs.readdirSync(path.join(root, "_locales")).sort(), [...codes].sort(), "the strings of every language are in the folder");
  ok(`built: ${listed.length} scripts in the page's order, ${codes.length} languages, version ${manifest.version}`);

  // -- 2. the page renders: its cards, the words, the preview and the real panel
  const a = await open();
  const A = a.page;
  const en = messagesOf("en");
  assert.ok((await A.locator("#controls > section.card").count()) >= 10, "the cards are drawn");
  assert.ok((await A.locator('input[data-pref]').count()) > 40, "the switches and fields are drawn");
  assert.equal(await A.locator("#sub").textContent(), en.optHeading.message, "the words are English's, not their keys");
  assert.equal(await A.title(), `${en.extName.message} — ${en.optHeading.message}`);
  assert.equal(await A.locator("#ver").textContent(), "v" + manifest.version, "chrome.runtime.getManifest() answers");
  assert.ok((await A.locator("#preview tr").count()) >= 3, "the sample rows are drawn");
  assert.ok(await A.locator("#pv-panel #rr-panel").isVisible(), "the real panel is in the preview");
  assert.ok((await ccfChips(A)) > 0, "the rows carry rank chips");
  assert.equal(await A.locator('input[data-pref="ranks.ccf"]').isChecked(), true);
  ok("the page renders its cards, the preview rows and the real panel, in English");

  // -- 3. the demo's own note
  const note = A.locator(".rr-demo-note");
  assert.ok(await note.isVisible());
  assert.match(await note.textContent(), /kept in this browser only/);
  assert.equal(await note.getAttribute("lang"), "en");
  ok("a note says the demo keeps its changes in this browser only");

  // -- 4. a switch changes the preview, and says it is saved
  const before = await ccfChips(A);
  await A.setChecked('input[data-pref="ranks.ccf"]', false);
  await until(A, () => document.querySelectorAll('#preview .rr-chip[data-kind="ccf"]').length === 0);
  assert.ok(before > 0 && (await ccfChips(A)) === 0, "the rank chips go with the switch");
  await until(A, () => document.getElementById("saved").classList.contains("on"));
  assert.equal(await A.locator("#saved").textContent(), en.optSaved.message);
  ok("clicking a switch changes the preview and says Saved");

  // -- 5. it persists: in localStorage, under the demo's prefix, and across a reload
  assert.equal((await stored(A)).ranks.ccf, false);
  const keys = await A.evaluate(() => Object.keys(localStorage));
  assert.ok(keys.length > 0 && keys.every((k) => k.startsWith("rr-demo:")), "everything the demo keeps is under its own prefix: " + keys);
  await A.reload();
  await A.waitForSelector('input[data-pref="ranks.ccf"]');
  assert.equal(await A.locator('input[data-pref="ranks.ccf"]').isChecked(), false, "the switch is still off");
  assert.equal(await ccfChips(A), 0, "and the preview agrees");
  ok("the change is kept in localStorage (rr-demo:…) and survives a reload");

  // -- 6. a second tab of the demo follows the first (the page opened on its own, next to the one in the website)
  const B = await newPage(a.context);
  await B.goto(origin + "/");
  await B.waitForSelector('input[data-pref="ranks.core"]');
  assert.equal(await B.locator('input[data-pref="ranks.ccf"]').isChecked(), false, "the second tab starts from what the first saved");
  assert.equal(await B.locator('input[data-pref="ranks.core"]').isChecked(), true);
  await A.setChecked('input[data-pref="ranks.core"]', false);
  await until(B, () => !document.querySelector('input[data-pref="ranks.core"]').checked);
  await until(B, () => document.querySelectorAll("#preview .rr-chip").length > 0 && document.querySelectorAll('#preview .rr-chip[data-kind="core"]').length === 0);
  ok("a second tab of the demo follows the first (chrome.storage.onChanged)");

  // -- 7. the page's own buttons work on the stand-in: Enable all, a preset, the configuration editor
  await A.click('button[data-act="all-on"][data-group="ranks"]');
  await until(A, () => document.querySelector('input[data-pref="ranks.ccf"]').checked && document.querySelector('input[data-pref="ranks.core"]').checked);
  await A.click('button[data-preset="minimal"]');
  await until(A, (rowStyle) => document.documentElement.classList.contains("rr-rows-" + rowStyle) && !document.querySelector('input[data-pref="panel.summary"]').checked, PRESETS.minimal.rowStyle);
  assert.equal((await stored(A)).rowStyle, PRESETS.minimal.rowStyle);
  await A.click("details.config-editor > summary");
  await A.fill('textarea[data-act="config-input"]', '{ "rowStyle": "bar" }');
  await A.click('button[data-act="config-apply"]');
  await until(A, () => document.documentElement.classList.contains("rr-rows-bar"));
  assert.equal((await stored(A)).rowStyle, "bar");
  await A.click('button[data-act="reset"]');
  await A.click('button[data-act="reset-confirm"]');
  await until(A, () => document.querySelector('input[data-pref="panel.summary"]').checked && !document.documentElement.classList.contains("rr-rows-bar"));
  assert.equal((await stored(A)).rowStyle, "full");
  ok("Enable all, a preset, the configuration editor and Reset to defaults work");
  await a.context.close();

  // -- 8. ?lang= sets the interface language: the site's codes (zh-CN, pt-BR, the hyphen form), a _locales folder (zh_TW) and a right-to-left language
  for (const [query, folder, lang, dir] of [["zh-CN", "zh_CN", "zh-CN", "ltr"], ["pt-BR", "pt_BR", "pt-BR", "ltr"], ["zh_TW", "zh_TW", "zh-TW", "ltr"], ["de", "de", "de", "ltr"], ["ar", "ar", "ar", "rtl"], ["he", "he", "he", "rtl"]]) {
    const { context, page } = await open("?lang=" + query);
    const words = messagesOf(folder);
    assert.equal(await page.evaluate(() => document.documentElement.lang), lang, `?lang=${query}: the page's language`);
    assert.equal(await page.evaluate(() => document.documentElement.dir), dir, `?lang=${query}: the page's direction`);
    assert.equal(await page.locator("#sub").textContent(), words.optHeading.message, `?lang=${query}: the heading is ${folder}'s`);
    assert.equal(await page.locator("#pv-title .card-title-text").textContent(), words.optPreviewTitle.message, `?lang=${query}: the preview's title is ${folder}'s`);
    assert.equal(await page.locator("#rr-panel").getAttribute("lang"), lang, `?lang=${query}: the real panel follows`);
    await context.close();
  }
  ok("?lang= sets the interface language (zh-CN, pt-BR, zh_TW, de, and ar / he right to left)");

  // -- 9. without ?lang= the browser's own language; a language the extension does not speak is English
  const german = await open("", { locale: "de-DE" });
  assert.equal(await german.page.evaluate(() => document.documentElement.lang), "de");
  assert.equal(await german.page.locator("#sub").textContent(), messagesOf("de").optHeading.message);
  await german.context.close();
  const unknown = await open("?lang=xx");
  assert.equal(await unknown.page.evaluate(() => document.documentElement.lang), "en");
  assert.equal(await unknown.page.locator("#sub").textContent(), en.optHeading.message);
  await unknown.context.close();
  ok("without ?lang= the browser's language is used; an unknown one is English");

  // -- 10. the language chosen in the page's own list wins over ?lang= (as it wins over the browser's in the extension), through the strings message
  const chosen = await open("?lang=en");
  await chosen.page.selectOption('select[data-pref="language"]', "de");
  await until(chosen.page, () => document.documentElement.lang === "de" && document.querySelector('select[data-pref="language"]').value === "de");
  assert.equal(await chosen.page.locator("#sub").textContent(), messagesOf("de").optHeading.message);
  await chosen.page.goto(origin + "/?lang=zh-CN");
  await chosen.page.waitForSelector('input[data-pref="roles.last"]');
  assert.equal(await chosen.page.evaluate(() => document.documentElement.lang), "de", "the saved choice is kept over ?lang=");
  await chosen.page.selectOption('select[data-pref="language"]', "auto");
  await until(chosen.page, () => document.documentElement.lang === "zh-CN");
  await chosen.context.close();
  ok("a language chosen in the page persists and wins over ?lang=; \"follow the browser\" follows ?lang= again");

  // -- 11. without localStorage (a private window, blocked site data) the page still works, in memory
  const blocked = await open("", { init: () => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("denied", "SecurityError"); } }) });
  assert.equal(await ccfChips(blocked.page) > 0, true);
  await blocked.page.setChecked('input[data-pref="ranks.ccf"]', false);
  await until(blocked.page, () => document.querySelectorAll('#preview .rr-chip[data-kind="ccf"]').length === 0);
  await blocked.page.reload();
  await blocked.page.waitForSelector('input[data-pref="ranks.ccf"]');
  assert.equal(await blocked.page.locator('input[data-pref="ranks.ccf"]').isChecked(), true, "nothing was kept: the defaults are back");
  await blocked.context.close();
  ok("without localStorage the page works and keeps its changes in memory only");

  // -- 12. no console errors, no failed request, nothing asked of any other server
  assert.deepEqual(problems, [], "console errors / failed requests:\n" + problems.join("\n"));
  assert.deepEqual(outside, [], "requests that left the demo's own server:\n" + outside.join("\n"));
  ok("no console error, no failed request, no request to any other origin");

  console.log(`\n${step} checks passed (Chromium ${browser.version()}, no extension loaded)`);
} catch (e) {
  console.error("\n✗ " + (e && e.stack ? e.stack : e));
  if (problems.length) console.error("\nconsole / request problems so far:\n" + problems.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
