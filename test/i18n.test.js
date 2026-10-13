const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const i18n = require("../src/lib/i18n.js");

const loc = path.join(__dirname, "..", "src", "_locales");

test("format: placeholders, arguments and dollar signs as Chrome reads them", () => {
  assert.equal(i18n.format({ message: "Scholar sent no more papers ($N1$ loaded).", placeholders: { n1: { content: "$1" } } }, ["12"]), "Scholar sent no more papers (12 loaded).");
  assert.equal(i18n.format({ message: "$1 of $2" }, [3, 4]), "3 of 4");
  assert.equal(i18n.format({ message: "costs $$5" }), "costs $5");
  assert.equal(i18n.format({ message: "Merged from $N$ entries", placeholders: { N: { content: "$1" } } }, "2"), "Merged from 2 entries");
  assert.equal(i18n.format(undefined), "");
});

test("settings values: anything unknown means auto / keep", () => {
  assert.equal(i18n.normalizeLanguage("ja"), "ja");
  assert.equal(i18n.normalizeLanguage("klingon"), "auto");
  assert.equal(i18n.normalizeScholarLanguage("zh_CN"), "zh_CN");
  assert.equal(i18n.normalizeScholarLanguage(7), "keep");
  assert.equal(i18n.scholarHl("zh_CN"), "zh-CN");
  assert.ok(i18n.isRtl("ar") && i18n.isRtl("he") && !i18n.isRtl("en"));
});

test("every listed language has its own folder, with exactly the English keys and the same placeholders; no folder is unlisted", () => {
  const en = JSON.parse(fs.readFileSync(path.join(loc, "en", "messages.json"), "utf8"));
  const dirs = fs.readdirSync(loc).sort();
  assert.deepEqual(dirs, [...i18n.codes].sort());
  assert.equal(i18n.codes.length, new Set(i18n.codes).size);
  for (const code of i18n.codes) {
    const m = JSON.parse(fs.readFileSync(path.join(loc, code, "messages.json"), "utf8"));
    const missing = Object.keys(en).filter((k) => !m[k] && !k.endsWith("One")), extra = Object.keys(m).filter((k) => !en[k]);
    assert.deepEqual(missing, [], code + ": missing keys");
    assert.deepEqual(extra, [], code + ": extra keys");
    for (const [k, v] of Object.entries(m)) {
      assert.equal(typeof v.message, "string", code + " " + k);
      const used = (s) => [...new Set([...s.matchAll(/\$N(\d)\$/g)].map((x) => x[1]))].sort().join();
      assert.equal(used(v.message), used(en[k].message), `${code}: placeholders of ${k}`);
      assert.deepEqual(Object.keys(v.placeholders || {}).sort(), Object.keys(en[k].placeholders || {}).sort(), `${code}: declared placeholders of ${k}`);
    }
    assert.ok(m.extName.message.length <= 75 && m.extDescription.message.length <= 132, code + ": store limits");
  }
});
