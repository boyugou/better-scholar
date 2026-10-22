#!/usr/bin/env node
// Dev tool: the "Try the real settings page" section and the export samples of the built site, in a browser (needs `node build.mjs` first, and
// Playwright + Chromium found through the extension's repository, EXT_DIR, as for build.mjs). Exit code 1 on any failure.
//
//   node scripts/check-page.mjs
//
// What a layout screenshot cannot say: the frame does not make the page wider (phone, tablet, right to left), the page does not scroll by itself when
// the frame loads or when something inside it opens, the keyboard can get out of the frame (Tab, and the skip link), the frame has its name, the page
// inside is in the page's language and dark when the page is, the export tabs and the copy button work, on a phone no word of any page is cut in two (30 languages), and nothing logs an error.
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
    await frame.locator("button.rr-dd").first().click();                                 // the real panel's drop-down opens (and scrolls its own list into view)
    await frame.locator(".toc a").nth(3).click();                                        // a link to a card of the settings, which scrolls the page inside
    await frame.locator('input[data-pref="roles.first"]').focus();
    await frame.locator('input[data-pref="roles.first"]').press("Space");
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => scrollY), y0, "the page moved when something inside the frame did");
    await context.close();
  }
  ok("the page does not scroll when the frame loads or when a menu, a link or a switch inside it is used");

  // -- the keyboard gets out: Tab from the link before the frame goes through the whole page inside and on to the page after it (the export tabs), Shift+Tab
  //    from there goes back in, and the skip link jumps past all of it
  let presses = 0;
  {
    const { context, page } = await open("en", 1360);
    await page.locator(".try-frame").scrollIntoViewIfNeeded();
    await ready(page);
    const after = () => page.evaluate(() => document.activeElement.id === "tab-bibtex");      // (the first control of the page after the frame)
    await page.locator(".try-open").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "IFRAME", "Tab from the link before the frame did not go into it");
    presses = 1;
    while (!(await after()) && presses < 600) { await page.keyboard.press("Tab"); presses++; }
    assert.ok(presses > 30 && presses < 600, `Tab left the frame after ${presses} presses (the page inside has dozens of controls, and no trap)`);
    await page.keyboard.press("Shift+Tab");                                              // back into the frame, to its last control
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "IFRAME");
    await page.keyboard.press("Tab");
    assert.equal(await after(), true, "Tab from the last control of the frame did not reach the page after it");
    await page.locator(".try-bar .skip").focus();
    assert.equal(await page.locator(".try-bar .skip").evaluate((el) => el.getBoundingClientRect().width > 40), true, "the skip link is seen when it has the focus");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    assert.equal(await after(), true, "the skip link did not go past the frame");
    await context.close();
  }
  ok(`keyboard: Tab goes through the frame (${presses} presses) and out at its end, Shift+Tab goes back in, the skip link jumps past it`);

  // -- the link opens the same demo on its own, in the page's language; changes made in the frame are there too
  {
    const { context, page } = await open("pt-BR", 1360);
    const href = await page.locator(".try-open").getAttribute("href");
    assert.equal(href, "../demo/?lang=pt-BR");
    assert.equal(await page.locator(".try-open").getAttribute("target"), "_blank");
    assert.match(await page.locator(".try-open").getAttribute("rel"), /noopener/);
    await page.locator(".try-frame").scrollIntoViewIfNeeded();
    await ready(page);
    await frameOf(page).locator('input[data-pref="rows.ccf"]').setChecked(false);
    const [tab] = await Promise.all([context.waitForEvent("page"), page.locator(".try-open").click()]);
    await tab.locator('input[data-pref="rows.ccf"]').waitFor();
    assert.equal(await tab.locator('input[data-pref="rows.ccf"]').isChecked(), false, "the new tab starts from what the frame saved");
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
    assert.equal(await page.locator('.export-card [role="tabpanel"]').count(), 7);
    assert.match(await shown().textContent(), /^@inproceedings\{author2025sample,/);
    await page.locator("#tab-apa").click();
    assert.match(await shown().textContent(), /^Author, A\., Writer, B\./);
    await page.locator("#tab-apa").press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-ieee");
    assert.match(await shown().textContent(), /^\[1\] A\. Author, B\. Writer, C\. Writer, and D\. Writer, "Sample paper 1," in \*ICLR 2025 \(Oral\)\*, 2025\./);
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-gbt");
    assert.match(await shown().textContent(), /^\[1\] AUTHOR A, WRITER B, WRITER C, et al\. Sample paper 1\[C\]\/\/ICLR 2025 \(Oral\)\. 2025\./);
    await page.keyboard.press("ArrowRight");
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

  // -- the explainer: it plays once in view, a chosen step stops it and shows that step's parts of the picture, the button plays it again; with reduced
  //    motion nothing moves by itself and the picture stays at the whole story (step 4)
  {
    const { context, page } = await open("en", 1360);
    const playing = () => page.evaluate(() => document.querySelector(".how").classList.contains("playing"));
    const shown = (sel) => page.locator(`.how-stage ${sel}.on`).count();
    await page.locator(".how-stage").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    assert.equal(await playing(), true, "the explainer plays once it is in view");
    await page.locator('.how-steps button[data-step="2"]').click();
    assert.equal(await playing(), false, "a chosen step stops it");
    assert.equal(await page.locator('.how-steps button[data-step="2"]').getAttribute("aria-current"), "step");
    assert.equal(await shown(".chip"), 1, "step 2: the rank chip");
    assert.equal(await shown("mark.sec"), 0, "step 2: the track word is not marked yet");
    await page.locator('.how-steps button[data-step="3"]').click();
    assert.equal(await shown("mark.sec"), 1, "step 3: the track word is marked");
    await page.locator('.how-steps button[data-step="1"]').click();
    assert.equal((await shown(".chip")) + (await shown("mark.sec")) + (await shown("td.hit")), 0, "step 1: no chip, no track word, no count yet");
    assert.equal(await shown(".nm"), 2, "step 1: the name in both author lines");
    await page.waitForTimeout(4200);
    assert.equal(await page.locator('.how-steps button[data-step="1"]').getAttribute("aria-current"), "step", "a chosen step stays");
    await page.locator(".how-play").click();
    assert.equal(await playing(), true, "the button plays it again");
    assert.equal(await page.locator(".how-play span").textContent(), await page.locator(".how-play").getAttribute("data-pause"), "the button then says Pause");
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${origin}/en/`);
    await page.locator(".how-stage").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500);
    assert.equal(await page.evaluate(() => document.querySelector(".how").classList.contains("playing")), false, "with reduced motion it does not play by itself");
    assert.equal(await page.locator('.how-steps button[data-step="4"]').getAttribute("aria-current"), "step", "with reduced motion it shows the whole story");
    assert.equal(await page.locator(".how-stage td.hit.on").count() > 0, true);
    await context.close();
  }
  ok("the explainer plays in view, stops at a chosen step and shows that step, plays again from its button, and stays still with reduced motion");

  // -- a phone: in every language no word of a page is cut in two by the end of a line (a text squeezed beside something, a button, a badge) and the page does not scroll sideways
  {
    const languages = JSON.parse((await import("node:fs")).readFileSync(path.join(site, "src", "languages.json"), "utf8")).map((l) => l.code);
    const cut = [];
    for (const width of [390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      for (const lang of languages) for (const sub of ["", "privacy/"]) {
        await page.goto(`${origin}/${lang}/${sub}`, { waitUntil: "load" });
        const r = await page.evaluate(() => {
          const WORD = /[A-Za-zÀ-ÖØ-öø-ÿĀ-žА-яͰ-Ͽ\u0590-\u06ff\u0900-\u097f][A-Za-zÀ-ÖØ-öø-ÿĀ-žА-яͰ-Ͽ\u0590-\u06ff\u0900-\u097f.'’]{4,}/g;
          const range = document.createRange(), words = new Set(), d = document.documentElement;
          for (const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); walker.nextNode();) {
            const node = walker.currentNode, el = node.parentElement;
            if (!el || ["SCRIPT", "STYLE", "CODE", "PRE"].includes(el.tagName) || el.closest("pre, code, iframe, [hidden]") || !el.getClientRects().length || getComputedStyle(el).visibility === "hidden") continue;
            for (const m of node.data.matchAll(WORD)) {
              if (m[0].length >= 16 && d.clientWidth <= 330) continue;          // (a compound of 16 letters or more is cut on a phone whatever the page does)
              range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
              if (new Set([...range.getClientRects()].filter((q) => q.width > 0.5).map((q) => Math.round(q.top / 4))).size > 1) words.add(m[0]);
            }
          }
          return { sideways: d.scrollWidth - d.clientWidth, words: [...words] };
        });
        if (r.sideways > 1 || r.words.length) cut.push(`${lang}/${sub}@${width}: ${r.sideways > 1 ? `sideways ${r.sideways}px; ` : ""}${r.words.join(", ")}`);
      }
      await context.close();
    }
    assert.deepEqual(cut, [], "on a phone:\n" + cut.join("\n"));
  }
  ok("on a phone (390 and 320 px) no word of any page, in any of the 30 languages, is cut in two and no page scrolls sideways");

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
