#!/usr/bin/env node
// Dev tool: crop (and optionally scale) a PNG with Chromium, for the README / website / Web Store pictures.
//   node scripts/crop-image.mjs <in.png> <out.png> <x> <y> <width> <height> [outWidth]
// (macOS `sips -c` crops around the centre, which is rarely what is wanted.) Needs Playwright + Chromium, found as in test/e2e/find-browser.mjs.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const here = path.dirname(fileURLToPath(import.meta.url));
const { pw, chromiumPath } = await import(pathToFileURL(path.join(here, "..", "test", "e2e", "find-browser.mjs")).href);
const [input, output, x, y, w, h, outW] = process.argv.slice(2);
if (!input || !output || [x, y, w, h].some((v) => v == null)) { console.error("usage: crop-image.mjs <in> <out> <x> <y> <width> <height> [outWidth]"); process.exit(2); }
const [X, Y, W, H] = [x, y, w, h].map(Number);
const scale = outW ? Number(outW) / W : 1;
const browser = await pw.chromium.launch({ executablePath: chromiumPath });
const page = await browser.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: scale });
// (an <img> at its natural size inside a page: a bare image document would be shrunk to fit the window)
const wrapper = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "crop-")), "w.html");
fs.writeFileSync(wrapper, `<!doctype html><body style="margin:0"><img id="i" src="${pathToFileURL(path.resolve(input)).href}" style="display:block">`);
await page.goto(pathToFileURL(wrapper).href);
await page.waitForFunction(() => document.getElementById("i").complete);
const natural = await page.evaluate(() => document.getElementById("i").naturalWidth);
await page.evaluate((w) => { document.getElementById("i").style.width = w + "px"; }, natural);
await page.screenshot({ path: path.resolve(output), fullPage: true, clip: { x: X, y: Y, width: W, height: H } });
await browser.close();
console.log("wrote", output);
