"use strict";
// Structural checks on the extension package: manifest, locales, bundled data.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const read = (p) => fs.readFileSync(path.join(src, p), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const locale = (l) => JSON.parse(read(`_locales/${l}/messages.json`));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

test("scripts/check-data-fresh.mjs is valid and reads the addresses and checksums the datasets record", () => {
  const r = spawnSync(process.execPath, ["--check", path.join(root, "scripts", "check-data-fresh.mjs")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const meta = (f) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8")).meta;
  for (const k of ["pdfUrl", "pdfSha256", "indexPage"]) assert.ok(meta("ccf-2026.json")[k], "ccf meta." + k);
  for (const k of ["exportUrl", "csvSha256", "portal", "edition"]) assert.ok(meta("core-2026.json")[k], "core meta." + k);
  assert.match(meta("ccf-2026.json").pdfSha256, /^[0-9a-f]{64}$/);
  assert.match(meta("core-2026.json").csvSha256, /^[0-9a-f]{64}$/);
  assert.ok(fs.readFileSync(path.join(root, ".github", "workflows", "data-fresh.yml"), "utf8").includes("scripts/check-data-fresh.mjs"), "the weekly workflow runs it");
});

test("manifest: MV3, least privilege, nothing in the background but the options-page relay", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.host_permissions, undefined, "content-script matches are enough");
  assert.deepEqual(manifest.background, { service_worker: "background.js" }, "a service worker and nothing else (no persistent page, no module)");
  assert.deepEqual(manifest.options_ui, { page: "options/options.html", open_in_tab: true });
  assert.equal(manifest.web_accessible_resources, undefined, "no page may reach into the extension");
  assert.equal(manifest.optional_permissions, undefined);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.default_locale, "en");
  assert.ok(Number(manifest.minimum_chrome_version) >= 110);
});

test("manifest: the panel runs only on Scholar profile pages, the language redirect on Scholar's search and profile pages; both on every Scholar domain", () => {
  const cs = manifest.content_scripts;
  assert.equal(cs.length, 2);
  const m = cs[0].matches;
  assert.equal(m.length, 187);
  assert.equal(new Set(m).size, m.length, "no duplicate patterns");
  assert.equal(m[0], "https://scholar.google.com/citations*");
  for (const p of m) assert.match(p, /^https:\/\/scholar\.google\.[a-z.]+\/citations\*$/, p);
  // the redirect: the same domains, whole sites (it checks the path itself), a tiny script at document start and nothing else
  const r = cs[1];
  assert.deepEqual(r.matches, m.map((p) => p.replace(/\/citations\*$/, "/*")));
  assert.deepEqual(r.js, ["lib/i18n.js", "content/lang-redirect.js"]);
  assert.equal(r.run_at, "document_start");
  assert.equal(r.css, undefined);
});

test("manifest: every referenced file exists, and scripts load in dependency order", () => {
  const cs = manifest.content_scripts[0];
  for (const f of [...manifest.content_scripts.flatMap((c) => [...c.js, ...(c.css || [])]), manifest.action.default_popup, manifest.options_ui.page, manifest.background.service_worker, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)]) {
    assert.ok(fs.existsSync(path.join(src, f)), "missing " + f);
  }
  const idx = (f) => cs.js.indexOf(f);
  assert.ok(idx("lib/names.js") < idx("lib/analysis.js"));
  assert.ok(idx("lib/marks.js") < idx("lib/analysis.js"));
  assert.ok(idx("lib/names.js") < idx("lib/awards.js"));
  assert.ok(idx("data/awards.js") < idx("content/main.js"));
  assert.ok(idx("lib/venues.js") < idx("content/main.js"));
  assert.ok(idx("data/ccf.js") < idx("content/main.js") && idx("data/core.js") < idx("content/main.js") && idx("data/aliases.js") < idx("content/main.js"));
  assert.ok(idx("content/dom.js") < idx("content/store.js") && idx("content/scholar.js") < idx("content/panel.js") && idx("content/panel.js") < idx("content/main.js"));
  assert.ok(idx("content/dom.js") < idx("content/chips.js") && idx("content/chips.js") < idx("content/main.js"));
  assert.ok(idx("lib/prefs.js") < idx("content/main.js"));
  // every script on disk is loaded by the manifest, the popup page or the settings page
  const pages = read("popup/popup.html") + read("options/options.html");
  for (const f of walk(path.join(src, "lib")).concat(walk(path.join(src, "content"))).filter((x) => x.endsWith(".js"))) {
    const rel = path.relative(src, f).split(path.sep).join("/");
    assert.ok(manifest.content_scripts.some((c) => c.js.includes(rel)) || pages.includes("../" + rel), `${rel} is not loaded anywhere`);
  }
});

test("pages: the popup and the settings page load only files that exist, dependencies first", () => {
  for (const [page, scripts] of [["popup/popup.html", ["lib/i18n.js", "lib/prefs.js", "lib/marks.js", "content/dom.js", "content/store.js", "popup/popup.js"]], ["options/options.html", ["lib/i18n.js", "lib/prefs.js", "lib/palette.js", "lib/query.js", "lib/agent.js", "lib/marks.js", "lib/metrics.js", "content/dom.js", "content/chips.js", "content/panel.js", "content/store.js", "options/editor.js", "options/options.js"]]]) {
    const html = read(page);
    const refs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => path.posix.normalize(path.posix.join(path.posix.dirname(page), m[1])));
    assert.deepEqual(refs, scripts, page);
    for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) assert.ok(fs.existsSync(path.join(src, path.posix.dirname(page), m[1])), `${page}: missing ${m[1]}`);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/, "no inline scripts (they would break the extension CSP)");
  }
});

test("background.js only opens the settings page and hands out this extension's own language files", () => {
  const code = read("background.js").replace(/^\s*\/\/.*$/gm, "");
  assert.match(code, /chrome\.runtime\.onMessage\.addListener/);
  assert.match(code, /chrome\.runtime\.openOptionsPage\(\)/);
  assert.match(code, /sender\.id !== chrome\.runtime\.id/, "only this extension's own scripts may ask");
  // the one fetch reads a file of this package, nothing from the network
  assert.equal((code.match(/fetch\(/g) || []).length, 1);
  assert.match(code, /fetch\(chrome\.runtime\.getURL\("_locales\//);
  for (const bad of ["XMLHttpRequest", "WebSocket", "chrome.storage", "chrome.tabs", "chrome.scripting", "importScripts", "eval(", "http"]) assert.ok(!code.includes(bad), "background.js must not use " + bad);
  assert.ok(code.split("\n").filter((l) => l.trim()).length <= 16, "keep it tiny");
});

test("locales: same keys in every language, manifest strings defined", () => {
  const en = locale("en"), zh = locale("zh_CN");
  const enKeys = Object.keys(en), zhKeys = Object.keys(zh);
  const onlyOneIn = (a, b) => a.filter((k) => !b.includes(k));
  // English may carry extra "…One" singular forms; every other key must exist in both
  assert.deepEqual(onlyOneIn(enKeys, zhKeys).filter((k) => !k.endsWith("One")), [], "keys missing from zh_CN");
  assert.deepEqual(onlyOneIn(zhKeys, enKeys), [], "keys missing from en");
  for (const field of ["name", "description"]) {
    const key = /^__MSG_(\w+)__$/.exec(manifest[field])[1];
    assert.ok(en[key] && zh[key], "manifest " + field);
  }
  assert.ok(manifest.description.length > 0 && en.extDescription.message.length <= 132, "Web Store description limit");
  // placeholders: every $N1$ in a message is declared, and declared the same in both languages
  for (const [k, v] of Object.entries(en)) {
    const used = [...v.message.matchAll(/\$N(\d)\$/g)].map((m) => m[1]);
    assert.deepEqual(Object.keys(v.placeholders || {}).sort(), [...new Set(used)].map((n) => "n" + n).sort(), k);
    if (zh[k]) {
      const zused = [...zh[k].message.matchAll(/\$N(\d)\$/g)].map((m) => m[1]);
      assert.deepEqual([...new Set(zused)].sort(), [...new Set(used)].sort(), "placeholder mismatch in zh_CN: " + k);
    }
  }
});

test("every string the UI asks for exists in the English catalog", () => {
  const en = locale("en");
  const used = new Set();
  for (const f of walk(path.join(src, "content")).concat(walk(path.join(src, "popup")), walk(path.join(src, "options"))).filter((x) => x.endsWith(".js"))) {
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(/\b(?:t|tn)\(\s*"(\w+)"/g)) used.add(m[1]);
    // dynamic keys built from small lookup tables
    // (a `path: "…"` is a settings path such as "markName", not a message)
    for (const m of text.matchAll(/(?<!\bpath):\s*"((?:role|chip|rule|copy|srcC|tip|mark[A-Z])\w*)"/g)) used.add(m[1]);
  }
  const missing = [...used].filter((k) => !en[k]);
  assert.deepEqual(missing, [], "messages used in code but not defined");
  // and no catalog entry is dead weight (singular "…One" forms are looked up dynamically)
  const code = walk(src).filter((x) => /\.(js|html)$/.test(x) && !x.includes("_locales")).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const dead = Object.keys(en).filter((k) => !k.endsWith("One") && !code.includes(`"${k}"`) && !code.includes(`__MSG_${k}__`) && !JSON.stringify(manifest).includes(`__MSG_${k}__`));
  assert.deepEqual(dead, [], "unused messages");
});

test("bundled data files are up to date with data/*.json", () => {
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "build-data.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("source files stay free of debugging leftovers and remote code", () => {
  for (const f of walk(src).filter((x) => x.endsWith(".js") && !x.includes(`${path.sep}data${path.sep}`))) {
    const text = fs.readFileSync(f, "utf8");
    assert.ok(!/\bdebugger\b/.test(text), f);
    assert.ok(!/console\.log\(/.test(text), "console.log in " + f);
    assert.ok(!/\beval\(|new Function\(|https?:\/\/[^\s"']*\.js\b/.test(text), "dynamic code in " + f);
  }
});

test("the repository root holds no stray fetched pages (*.html)", () => {
  const stray = fs.readdirSync(path.join(__dirname, "..")).filter((f) => /\.html?$/i.test(f));
  assert.deepEqual(stray, []);
});

test("text colours on the extension's own surfaces keep a 4.5:1 contrast (found by an axe-core audit)", () => {
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const css = (f) => fs.readFileSync(path.join(src, f), "utf8");
  const faint = (f, nth) => [...css(f).matchAll(/--(?:rr-)?faint:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1])[nth];
  const cases = [
    ["content/styles.css", 0, ["#ffffff", "#f6f8fb"]],
    ["options/options.css", 0, ["#ffffff", "#f6f8fb"]],
    ["options/options.css", 1, ["#202124", "#2d2e31", "#292a2d"]],
    ["popup/popup.css", 0, ["#ffffff"]],
    ["popup/popup.css", 1, ["#202124"]]
  ];
  for (const [f, nth, grounds] of cases) for (const g of grounds) assert.ok(ratio(faint(f, nth), g) >= 4.5, `${f} faint #${nth} ${faint(f, nth)} on ${g}: ${ratio(faint(f, nth), g).toFixed(2)}`);
  assert.ok(ratio("#0d652d", "#cce5d4") >= 4.5, "the last-author name on its tint");
  assert.ok(ratio("#5f6368", "#e4eefc") >= 4.5 && ratio("#5f6368", "#e4f1e8") >= 4.5, "Scholar's grey lines on the row tints");
});

test("every script in src/ parses (a syntax slip such as a duplicate declaration would otherwise only show in the browser)", () => {
  const vm = require("node:vm");
  for (const f of walk(src).filter((x) => x.endsWith(".js"))) {
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(f, "utf8"), { filename: f }), path.relative(src, f));
  }
});
