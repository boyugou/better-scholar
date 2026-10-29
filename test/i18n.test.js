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

test("Scholar's language for a folder; \"keep\" and anything unknown leave the address alone", () => {
  assert.equal(i18n.scholarHl("zh_CN"), "zh-CN");
  assert.equal(i18n.scholarHl("he"), "iw");
  for (const none of ["keep", "klingon", 7, undefined, null]) assert.equal(i18n.scholarHl(none), "");
  assert.ok(i18n.isRtl("ar") && i18n.isRtl("he") && !i18n.isRtl("en"));
});

test("every listed language has its own folder, with exactly the English keys and the same placeholders; no folder is unlisted", () => {
  const en = JSON.parse(fs.readFileSync(path.join(loc, "en", "messages.json"), "utf8"));
  const dirs = fs.readdirSync(loc).sort();
  assert.deepEqual(dirs, [...i18n.codes].sort());
  assert.equal(i18n.codes.length, new Set(i18n.codes).size);
  for (const code of i18n.codes) {
    const m = JSON.parse(fs.readFileSync(path.join(loc, code, "messages.json"), "utf8"));
    const missing = Object.keys(en).filter((k) => !m[k]), extra = Object.keys(m).filter((k) => !en[k]);
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

test("fromBrowser: Norwegian Bokmål and Nynorsk browsers are given the no folder; the others are left to Chrome", () => {
  for (const ui of ["nb", "nb-NO", "nn", "nn_NO", "NB"]) assert.equal(i18n.fromBrowser(ui), "no", ui);
  for (const ui of ["no", "en-US", "de", "zh-CN", "", undefined]) assert.equal(i18n.fromBrowser(ui), "", String(ui));
});

test("resolve: the folder a browser language is served from (so that lang and number formatting match the words shown)", () => {
  const cases = { "en-US": "en", "en": "en", "de-CH": "de", "zh-CN": "zh_CN", "zh": "zh_CN", "zh-Hans": "zh_CN", "zh-TW": "zh_TW", "zh-HK": "zh_TW", "zh-Hant-TW": "zh_TW", "pt": "pt_BR", "pt-BR": "pt_BR", "pt-PT": "pt_PT", "pt-AO": "pt_PT", "nb-NO": "no", "nn": "no", "no": "no", "iw": "he", "in": "id", "es-419": "es", "ca": "en", "fa-IR": "en", "": "en", "ja_JP": "ja" };
  for (const [ui, want] of Object.entries(cases)) assert.equal(i18n.resolve(ui), want, ui);
  assert.equal(i18n.resolve(undefined), "en");
});

test("a comparison sign in a right-to-left language stands in a left-to-right isolate: '≥100' in Arabic or Hebrew would be drawn '≤100' and say the opposite", () => {
  for (const code of fs.readdirSync(loc).filter((c) => i18n.isRtl(c))) {
    const messages = JSON.parse(fs.readFileSync(path.join(loc, code, "messages.json"), "utf8"));
    for (const [key, { message }] of Object.entries(messages)) {
      const bare = message.replace(/\u2066[^\u2069]*\u2069/g, "");
      assert.ok(!/[<>≥≤]/.test(bare), `${code}/${key}: a comparison sign outside an isolate (U+2066 … U+2069): ${message}`);
    }
  }
});


test("no run of English words left in a language of another script: two English words in a row are words nobody translated (Thai's award names were)", () => {
  // kept in English on purpose: names (of the extension, of services, of a list's publisher, an author's and a venue line as Scholar prints them), what the copies
  // print ("(your mapping)"), the award's own name
  const KEPT = /Better Scholar|Semantic Scholar|Google Scholar|China Computer Federation|Zhang Wei|Proceedings of the IEEE conference on computer vision and pattern recognition|\(your mapping\)|[Tt]est of [Tt]ime/g;
  // (a language of another script: most of the letters of its messages are not Latin ones)
  const latinScript = (m) => { const all = Object.values(m).map((v) => v.message).join(" "); return (all.match(/\p{Script=Latin}/gu) || []).length > (all.match(/\p{L}/gu) || []).length / 2; };
  let looked = 0;
  const left = [];
  for (const code of i18n.codes.filter((c) => c !== "en")) {
    const messages = JSON.parse(fs.readFileSync(path.join(loc, code, "messages.json"), "utf8"));
    if (latinScript(messages)) continue;
    looked++;
    for (const [key, { message }] of Object.entries(messages)) {
      const rest = message.replace(KEPT, " ").replace(/\$[A-Z0-9_]+\$/g, " ").replace(/\b[a-z]+:[^\s,]*/g, " ");          // (and the search's operators, role:first …)
      const run = rest.match(/(?<![A-Za-z])[A-Za-z][a-z]+(?:[ -][A-Za-z][a-z]+)+(?![A-Za-z])/);          // (Latin edges only: English glued to Chinese, Japanese or Thai letters — "显示Best paper奖" — counts too)
      if (run) left.push(`${code}/${key}: "${run[0]}" in ${message}`);
    }
  }
  assert.deepEqual(left, [], "English left in a translation");
  assert.ok(looked >= 10, `${looked} languages of another script looked at`);
});
