import { pathToFileURL } from "node:url";
import fs from "node:fs"; import path from "node:path";
// Dev tool: axe-core over the built site (needs `node build.mjs` first, Playwright + Chromium and axe-core: AXE_FILE=/path/to/axe.min.js, or the
// extension repo's .cache/axe.min.js after its `node scripts/axe-audit.mjs`). Exit code 1 on any violation. The pages are served over http, because the
// demo in each of them needs it. EXT_DIR: the extension's repository, as for build.mjs.
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";
const site = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(process.env.EXT_DIR || path.join(site, "..", "google-scholar-highlighter"));
const { pw, chromiumPath } = await import(pathToFileURL(path.join(root, "test/e2e/find-browser.mjs")).href);
const axeSrc = fs.readFileSync(process.env.AXE_FILE || path.join(root, ".cache/axe.min.js"), "utf8");
const { server, origin } = await serve(path.join(site, "_site"));

const b = await pw.chromium.launch({ executablePath: chromiumPath });
let total = 0;
for (const [lang, w, scheme] of [["en", 1280, "light"], ["en", 1280, "dark"], ["ar", 390, "dark"], ["ja", 390, "light"], ["de", 1280, "light"], ["zh-CN", 1280, "dark"], ["he", 1280, "light"]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: scheme });
  await p.goto(`${origin}/${lang}/`);
  await p.locator(".try-frame").scrollIntoViewIfNeeded();                    // (the demo's frame loads when it is near)
  await p.frameLocator(".try-frame iframe").locator('input[data-pref="roles.last"]').waitFor();
  await p.evaluate(axeSrc);
  const res = await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n").slice(1, 2).join(" ").slice(0, 140)) })));
  total += res.length;
  console.log(`${res.length ? "✗" : "✓"} ${lang} ${w}px ${scheme}: ${res.length}`);
  for (const v of res) console.log(`   [${v.impact}] ${v.id}\n     ` + v.nodes.join("\n     "));
  await p.close();
}
await b.close();
server.close();
console.log(total ? `\n${total} violation type(s)` : "\nno violations");
process.exit(total ? 1 : 0);
