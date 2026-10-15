#!/usr/bin/env node
// Dev tool: the "Try the real settings page" section and the export samples of the built site, in a browser (needs `node build.mjs` first, and
// Playwright + Chromium found through the extension's repository, EXT_DIR, as for build.mjs). Exit code 1 on any failure.
//
//   node scripts/check-page.mjs
//
// What a layout screenshot cannot say: the frame does not make the page wider (phone, tablet, right to left), the page does not scroll by itself when
// the frame loads or when something inside it opens, the keyboard can get out of the frame (Tab, and the skip link), the frame has its name, the page
// inside is in the page's language and dark when the page is, the export tabs and the copy button work, and nothing logs an error.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const site = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ext = path.resolve(process.env.EXT_DIR || path.join(site, "..", "google-scholar-highlighter"));
const { pw, chromiumPath } = await import(pathToFileURL(path.join(ext, "test", "e2e", "find-browser.mjs")).href);
if (!pw || !chromiumPath) { console.log("check-page skipped: Playwright or a Chromium build was not found (set PLAYWRIGHT_PATH / CHROMIUM_PATH)."); process.exit(0); }
// the strings the demo was built with, by the extension's folder name for a site code (zh-CN is zh_CN there)
const messages = (code) => createRequire(import.meta.url)(path.join(site, "_site", "demo", "_locales", code.replace("-", "_"), "messages.json"));

const { server, origin } = await serve(path.join(site, "_site"));
const browser = await pw.chromium.launch({ executablePath: chromiumPath, args: process.env.CI ? ["--no-sandbox"] : [] });
const problems = [];
let step = 0;
const ok = (msg) => console.log(`  ✓ ${String(++step).padStart(2)}  ${msg}`);

async function open(lang, width, scheme = "light", height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push(`${lang}: console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`${lang}: pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`${lang}: ${r.status()} ${r.url()}`); });
  await page.addInitScript(() => { addEventListener("DOMContentLoaded", () => { document.documentElement.style.scrollBehavior = "auto"; }); });
  await page.goto(`${origin}/${lang}/`);
  return { context, page };
}
const frameOf = (page) => page.frameLocator(".try-frame iframe");
const ready = (page) => frameOf(page).locator('input[data-pref="roles.last"]').waitFor();
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

try {
  // -- the frame: named, lazy, in this page's language, and no wider than its page (phone, tablet, desktop; left to right and right to left)
  for (const [lang, width] of [["en", 1360], ["en", 1000], ["en", 768], ["en", 390], ["ar", 390], ["he", 1360], ["zh-CN", 390], ["de", 360]]) {
    const { context, page } = await open(lang, width);
    assert.equal(await noSideScroll(page), true, `${lang} ${width}px: the page is wider than the screen before the frame has loaded`);
    assert.ok((await page.locator(".try-frame iframe").getAttribute("title")).length > 8, "the frame has a name");
    assert.equal(await page.locator(".try-frame iframe").getAttribute("loading"), "lazy");
    await page.locator(".try-frame").scrollIntoViewIfNeeded();
    await ready(page);
    assert.equal(await noSideScroll(page), true, `${lang} ${width}px: the page is wider than the screen once the frame is in`);
    assert.equal(await frameOf(page).locator("#sub").textContent(), messages(lang).optHeading.message, `${lang}: the page in the frame speaks the page's language`);
    const box = await page.locator(".try-frame iframe").boundingBox();
    assert.ok(box.width <= width && box.height >= 480, `${lang} ${width}px: the frame is ${box.width} x ${box.height}`);
    await context.close();
  }
  ok("the frame has its name, loads when near, speaks the page's language and never makes the page wider (1360, 1000, 768, 390, 360 px; ar, he)");

  // -- the page does not scroll by itself: not when the frame loads, not when something inside it opens, moves or takes the focus
  {
    const { context, page } = await open("en", 1360, "light", 760);
    await page.evaluate(() => { const y = document.querySelector("#try").getBoundingClientRect().top + scrollY + 150; scrollTo(0, y); });     // (the frame is half in view)
    const y0 = await page.evaluate(() => scrollY);
    await ready(page);
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => scrollY), y0, "the page moved when the frame loaded");
    const frame = frameOf(page);
    await frame.locator("#pv-panel button.rr-dd").first().click();                       // the real panel's drop-down opens (and scrolls its own list into view)
    await frame.locator('a[data-card="card-3"]').click();                              // a link to a card of the settings, which scrolls the page inside
    await frame.locator('input[data-pref="roles.first"]').focus();
    await frame.locator('input[data-pref="roles.first"]').press("Space");
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => scrollY), y0, "the page moved when something inside the frame did");
    await context.close();
  }
  ok("the page does not scroll when the frame loads or when a menu, a link or a switch inside it is used");

  // -- the keyboard gets out: Tab from the last control of the page inside goes on to the page, Shift+Tab from the first goes back, the skip link jumps past
  {
    const { context, page } = await open("en", 1360);
    await page.locator(".try-frame").scrollIntoViewIfNeeded();
    await ready(page);
    const frame = frameOf(page);
    await frame.locator("#lnk-source").focus();                                         // the last link of the page inside (GitHub)
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-bibtex", "Tab from the last control of the frame did not reach the page after it");
    await page.keyboard.press("Shift+Tab");                                              // back into the frame, to its last control
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "IFRAME");
    assert.equal(await frame.locator("#lnk-source").evaluate((el) => el === el.ownerDocument.activeElement), true);
    await page.locator(".try-bar .skip").focus();
    assert.equal(await page.locator(".try-bar .skip").evaluate((el) => el.getBoundingClientRect().width > 40), true, "the skip link is seen when it has the focus");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-bibtex", "the skip link did not go past the frame");
    await page.locator(".try-open").focus();
    await page.keyboard.press("Tab");                                                    // from the link, into the frame (its first control)
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "IFRAME");
    await context.close();
  }
  ok("keyboard: Tab leaves the frame at its end, Shift+Tab goes back in, the skip link jumps past it, the link before it is reached first");

  // -- the link opens the same demo on its own, in the page's language; changes made in the frame are there too
  {
    const { context, page } = await open("pt-BR", 1360);
    const href = await page.locator(".try-open").getAttribute("href");
    assert.equal(href, "../demo/?lang=pt-BR");
    assert.equal(await page.locator(".try-open").getAttribute("target"), "_blank");
    assert.match(await page.locator(".try-open").getAttribute("rel"), /noopener/);
    await page.locator(".try-frame").scrollIntoViewIfNeeded();
    await ready(page);
    await frameOf(page).locator('input[data-pref="ranks.ccf"]').setChecked(false);
    const [tab] = await Promise.all([context.waitForEvent("page"), page.locator(".try-open").click()]);
    await tab.locator('input[data-pref="ranks.ccf"]').waitFor();
    assert.equal(await tab.locator('input[data-pref="ranks.ccf"]').isChecked(), false, "the new tab starts from what the frame saved");
    assert.equal(await tab.evaluate(() => document.documentElement.lang), "pt-BR");
    assert.equal(await tab.locator(".rr-demo-note").isVisible(), true, "on its own the demo says it keeps its changes in this browser");
    await context.close();
  }
  ok("\"Open in a new tab\" opens the same demo in the page's language, sharing what the frame saved, with its own note");

  // -- dark: the frame follows the system, like the page around it
  {
    const { context, page } = await open("en", 1360, "dark");
    await page.locator(".try-frame").scrollIntoViewIfNeeded();
    await ready(page);
    const bg = (el) => getComputedStyle(el).backgroundColor;
    const [outer, inner] = [await page.evaluate(`(${bg})(document.body)`), await frameOf(page).locator("body").evaluate(bg)];
    const dark = (c) => c.match(/\d+/g).slice(0, 3).every((n) => Number(n) < 60);
    assert.ok(dark(outer) && dark(inner), `dark mode: the page is ${outer}, the frame ${inner}`);
    await context.close();
  }
  ok("in a dark system the frame and the page around it are dark");

  // -- the export samples: tabs by mouse and keys, the button copies what is shown (what the extension's own export code wrote, for invented papers)
  {
    const { context, page } = await open("en", 1360);
    const shown = () => page.locator('.export-card [role="tabpanel"]:not([hidden])');
    assert.equal(await page.locator('.export-card [role="tabpanel"]').count(), 5);
    assert.match(await shown().textContent(), /^@inproceedings\{author2025sample,/);
    await page.locator("#tab-apa").click();
    assert.match(await shown().textContent(), /^Author, A\., Writer, B\./);
    await page.locator("#tab-apa").press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-json");
    assert.match(await shown().textContent(), /"owner": "A Author"/);
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-csv");
    await page.keyboard.press("ArrowRight");                                              // wraps round
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-bibtex");
    await page.locator("#tab-markdown").click();
    await page.locator(".copy-code-btn").click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await shown().textContent());
    assert.equal(await page.locator(".copy-code-btn").textContent(), await page.locator(".copy-code-btn").getAttribute("data-copied"));
    assert.ok((await page.locator("#tab-markdown").getAttribute("aria-selected")) === "true" && (await page.locator("#tab-bibtex").getAttribute("aria-selected")) === "false");
    await context.close();
  }
  ok("the export tabs work by mouse and by keys, and the button copies what is shown");

  // -- no error anywhere
  assert.deepEqual(problems, [], "errors:\n" + problems.join("\n"));
  ok("no console error and no failed request, in the page or in its frame");
  console.log(`\n${step} checks passed`);
} catch (e) {
  console.error("\n✗ " + (e && e.stack ? e.stack : e));
  if (problems.length) console.error("\nproblems so far:\n" + problems.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
