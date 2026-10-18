#!/usr/bin/env node
// Dev tool: the "How it reads a paper" explainer of the English page as an animated GIF, for the extension's README (GitHub plays no video from a
// repository inline; a GIF it shows). The picture and, under it, the current step's words, through one round of the steps. Needs a build first
// (`node build.mjs`), Playwright found through EXT_DIR, and ffmpeg on the PATH.
//   node scripts/record-explainer.mjs [out.gif]      default: $EXT_DIR/assets/how-it-works.gif
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const site = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ext = path.resolve(process.env.EXT_DIR || path.join(site, "..", "google-scholar-highlighter"));
const out = path.resolve(process.argv[2] || path.join(ext, "assets", "how-it-works.gif"));
const { pw, chromiumPath } = await import(pathToFileURL(path.join(ext, "test", "e2e", "find-browser.mjs")).href);
const WIDTH = 720, SCALE = 2;          // (drawn at twice the size, then scaled down: sharper text)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "explainer-"));
const { server, origin } = await serve(path.join(site, "_site"));
const browser = await pw.chromium.launch({ executablePath: chromiumPath });
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: SCALE, colorScheme: "light" });
await page.goto(`${origin}/en/`);
// only the explainer: the picture, and under it the words of the step that is shown (the others are hidden; no page around it)
await page.addStyleTag({ content: `
  header.top, footer, main > section:not(.how), .how .wrap > h2, .how .wrap > .note, .how-play { display: none !important; }
  body, .how { background: #fff !important; }
  .how { padding: 16px 0 12px !important; }
  .how .wrap { width: ${WIDTH - 32}px !important; }
  .how-grid { display: flex !important; flex-direction: column; gap: 10px !important; }
  .how-figure { order: 0 !important; }
  .how-stage { box-shadow: none !important; }
  .how-steps { order: 1; min-height: 96px; }
  .how-steps li { display: none; }
  .how-steps li:has([aria-current]) { display: block; }
  .how-steps:not(:has([aria-current])) li.zero { display: block; }
  .how-steps li.zero button { background: #f8fafc; border-color: #e2e8f0; color: #0f172a; }
  .how-steps button[aria-current], .how-steps li.zero button { background: #f8fafc !important; box-shadow: none !important; border-color: #e2e8f0 !important; color: #0f172a !important; }
  .how-steps .bar { display: none; }
  * { transition-duration: 0.35s; }
` });
const frames = [];
// one round: Scholar as it is, then the four steps, each held as long as the page holds it; a frame every 1/12 s
const DWELL = [1400, 3000, 3400, 3400, 4600], FPS = 12;
await page.evaluate(() => { document.querySelector(".how-play").click(); document.querySelector(".how-play").click(); });       // (stops the page's own player)
// step 0 is Scholar's page before the extension: it gets a line of its own (in this English picture only)
await page.evaluate(() => {
  const li = document.createElement("li"); li.className = "zero";
  li.innerHTML = '<button type="button" tabindex="-1"><span class="n">0</span><b>A Scholar profile, as Scholar shows it</b><span class="d">Two made-up papers at real venues. The steps show what the extension\'s own code finds in them.</span></button>';
  document.querySelector(".how-steps").prepend(li);
});
const grid = await page.locator(".how-grid").boundingBox(), PAD = 12;
const box = { x: grid.x - PAD, y: grid.y - PAD, width: grid.width + 2 * PAD, height: grid.height + 2 * PAD };
let n = 0;
for (let step = 0; step <= 4; step++) {
  await page.evaluate((s) => {
    const buttons = document.querySelectorAll(".how-steps button");
    if (s) buttons[s - 1].click();
    else { document.querySelectorAll(".how-stage [data-from]").forEach((el) => el.classList.remove("on")); buttons.forEach((b) => b.removeAttribute("aria-current")); }
  }, step);
  for (let t = 0; t < DWELL[step]; t += 1000 / FPS) {
    const file = path.join(tmp, `f${String(n++).padStart(4, "0")}.png`);
    await page.screenshot({ path: file, clip: { x: box.x, y: box.y, width: box.width, height: Math.ceil(box.height) } });
    frames.push(file);
  }
}
await browser.close();
server.close();
// a palette made from the frames, then the GIF at the page's own size (half the pixels drawn)
const palette = path.join(tmp, "palette.png");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", path.join(tmp, "f%04d.png"), "-vf", `scale=${Math.round(box.width)}:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff`, palette]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", path.join(tmp, "f%04d.png"), "-i", palette, "-lavfi", `scale=${Math.round(box.width)}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, "-loop", "0", out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`wrote ${path.relative(process.cwd(), out)}: ${frames.length} frames, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
