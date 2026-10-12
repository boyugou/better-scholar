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

test("manifest: MV3, least privilege, no background worker", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.host_permissions, undefined, "content-script matches are enough");
  assert.equal(manifest.background, undefined, "everything runs in the content script");
  assert.equal(manifest.optional_permissions, undefined);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.default_locale, "en");
  assert.ok(Number(manifest.minimum_chrome_version) >= 110);
});

test("manifest: runs only on Scholar profile pages, on every Scholar domain", () => {
  const cs = manifest.content_scripts;
  assert.equal(cs.length, 1);
  const m = cs[0].matches;
  assert.equal(m.length, 187);
  assert.equal(new Set(m).size, m.length, "no duplicate patterns");
  assert.equal(m[0], "https://scholar.google.com/citations*");
  for (const p of m) assert.match(p, /^https:\/\/scholar\.google\.[a-z.]+\/citations\*$/, p);
});

test("manifest: every referenced file exists, and scripts load in dependency order", () => {
  const cs = manifest.content_scripts[0];
  for (const f of [...cs.js, ...cs.css, manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)]) {
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
  // every script on disk is either loaded by the manifest or by the popup page
  const popupHtml = read("popup/popup.html");
  for (const f of walk(path.join(src, "lib")).concat(walk(path.join(src, "content"))).filter((x) => x.endsWith(".js"))) {
    const rel = path.relative(src, f).split(path.sep).join("/");
    assert.ok(cs.js.includes(rel) || popupHtml.includes(rel.replace(/^/, "../")), `${rel} is not loaded anywhere`);
  }
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
  for (const f of walk(path.join(src, "content")).concat(walk(path.join(src, "popup"))).filter((x) => x.endsWith(".js"))) {
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(/\b(?:t|tn)\(\s*"(\w+)"/g)) used.add(m[1]);
    // dynamic keys built from small lookup tables
    for (const m of text.matchAll(/:\s*"((?:role|chip|rule|copy|srcC|tip|mark[A-Z])\w*)"/g)) used.add(m[1]);
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
