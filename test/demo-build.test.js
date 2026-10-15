"use strict";
// scripts/build-demo.mjs makes the web demo from the page the manifest names and from nothing else, and says so loudly when it cannot.
// The real page is built into a temporary folder; the refusals are tried on a small copy of the repository's layout, so that a guard
// that failed could only ever empty a temporary folder. (The demo in a browser: test/e2e/demo.mjs.)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rr-demo-test-"));
const run = (repo, ...args) => spawnSync(process.execPath, [path.join(repo, "scripts", "build-demo.mjs"), ...args], { encoding: "utf8" });
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

// a repository in miniature: the builder and the stand-in's files, and an extension of one page whose `page` is the options page
function mini(name, page, extra = {}) {
  const repo = path.join(tmp, name);
  for (const f of ["build-demo.mjs", "demo/shim.js", "demo/demo.css"]) { fs.mkdirSync(path.dirname(path.join(repo, "scripts", f)), { recursive: true }); fs.copyFileSync(path.join(root, "scripts", f), path.join(repo, "scripts", f)); }
  write(path.join(repo, "src", "manifest.json"), JSON.stringify({ version: "1.2.3", options_ui: { page: "options/options.html" }, icons: { 32: "icons/i-32.png" } }));
  write(path.join(repo, "src", "icons", "i-32.png"), "png");
  write(path.join(repo, "src", "_locales", "en", "messages.json"), "{}");
  write(path.join(repo, "src", "lib", "a.js"), "// a\n");
  write(path.join(repo, "src", "options", "options.js"), "// b\n");
  write(path.join(repo, "src", "options", "options.css"), "body { background: url(bg.png) }\n");
  write(path.join(repo, "src", "options", "bg.png"), "png");
  for (const [f, text] of Object.entries(extra)) write(path.join(repo, "src", f), text);
  write(path.join(repo, "src", "options", "options.html"), `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="options.css">\n</head>\n<body>\n  <main></main>\n${page}</body>\n</html>\n`);
  return repo;
}
const PAGE = `  <script src="../lib/a.js"></script>\n  <script src="options.js"></script>\n`;

test("the real page: its scripts in its order, every file it names, every language, one tag in place of its scripts", () => {
  const out = path.join(tmp, "real");
  const r = run(root, "--out", out);
  assert.equal(r.status, 0, r.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "src", "manifest.json"), "utf8"));
  const page = fs.readFileSync(path.join(root, "src", manifest.options_ui.page), "utf8");
  const wanted = [...page.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => path.posix.normalize(path.posix.join("options", m[1])));
  const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  assert.deepEqual(/data-scripts="([^"]+)"/.exec(html)[1].split(" "), wanted);
  assert.equal(html.match(/<script\b/g).length, 1, "the stand-in's tag is the only script tag");
  assert.ok(html.indexOf("demo-shim.js") > html.indexOf('id="controls"'), "it comes after the page's own markup, like the scripts did");
  assert.match(html, new RegExp(`data-version="${manifest.version}"`));
  for (const m of html.matchAll(/\b(?:src|href)="([^"#:]+)"/g)) assert.ok(fs.existsSync(path.join(out, m[1])), `index.html names ${m[1]}`);
  const folders = fs.readdirSync(path.join(root, "src", "_locales"));
  for (const f of folders) assert.ok(fs.existsSync(path.join(out, "_locales", f, "messages.json")), "strings of " + f);
  assert.ok(fs.existsSync(path.join(out, "demo-shim.js")) && fs.existsSync(path.join(out, "demo.css")));
  assert.ok(!/__MSG_|chrome-extension:\/\//.test(wanted.concat(["options/options.css", "content/styles.css"]).map((f) => fs.readFileSync(path.join(out, f), "utf8")).join("\n")), "nothing only an extension can read");
});

test("a small page: files keep their paths under src/, a stylesheet's url() travels with it, the icon is the favicon", () => {
  const repo = mini("small", PAGE);
  const out = path.join(repo, "out");
  const r = run(repo, "--out", out);
  assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  assert.match(html, /data-scripts="lib\/a\.js options\/options\.js"/);
  assert.match(html, /<link rel="stylesheet" href="options\/options\.css">/);
  assert.match(html, /<link rel="icon" href="icons\/i-32\.png">/);
  assert.match(html, /<link rel="preload" as="script" href="options\/options\.js">/);
  for (const f of ["options/bg.png", "lib/a.js", "icons/i-32.png", "_locales/en/messages.json"]) assert.ok(fs.existsSync(path.join(out, f)), f);
});

test("what the demo cannot run is refused, with the reason", () => {
  const refuse = (name, page, extra, message) => {
    const r = run(mini(name, page, extra), "--out", path.join(tmp, name + "-out"));
    assert.equal(r.status, 1, name);
    assert.match(r.stderr, message, name);
  };
  refuse("inline", PAGE + "  <script>window.x = 1</script>\n", {}, /not a plain <script src>/);
  refuse("module", `  <script type="module" src="options.js"></script>\n`, {}, /not a plain <script src>/);
  refuse("remote", PAGE + `  <link rel="stylesheet" href="https://example.com/x.css">\n`, {}, /not a local file/);
  refuse("missing", PAGE + `  <script src="gone.js"></script>\n`, {}, /does not exist/);
  refuse("outside", PAGE + `  <script src="../../x.js"></script>\n`, {}, /outside src\//);
  refuse("link", PAGE + `  <a href="../popup/popup.html">popup</a>\n`, {}, /a page the demo does not have/);
  refuse("import", PAGE, { "options/options.css": `@import "x.css";\n` }, /@import/);
  refuse("foreign", PAGE, { "options/options.css": `body { content: "__MSG_extName__" }\n` }, /__MSG_/);
  refuse("noscripts", "", {}, /loads no scripts/);
});

test("the folder it empties is never the repository or the extension's own files", () => {
  const repo = mini("guard", PAGE);
  for (const out of [repo, path.dirname(repo), path.join(repo, "src"), path.join(repo, "src", "lib")]) {
    const r = run(repo, "--out", out);
    assert.equal(r.status, 1, out);
    assert.match(r.stderr, /will not empty/, out);
  }
  assert.ok(fs.existsSync(path.join(repo, "src", "lib", "a.js")) && fs.existsSync(path.join(repo, "scripts", "build-demo.mjs")), "nothing was emptied");
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
