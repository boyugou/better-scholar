#!/usr/bin/env node
// The numbers that say how much the extension is made of — counted from the code and the data, never typed. Each one says what it counts (a row of the table below, the third column of
// the README's), so that nobody has to take it on trust. What grows with every fix (the alias names, the indexes, the tests) is given rounded down ("470+"): it stays true until the
// next step; what is a fact of the design (the settings, the lists, the languages) is exact.
//
//   node scripts/numbers.mjs            the numbers as JSON
//   node scripts/numbers.mjs --readme   rewrite the block between <!-- numbers:begin --> and <!-- numbers:end --> in README.md and README.zh-CN.md
//   node scripts/numbers.mjs --check    exit 1 when those blocks are not what the numbers say (a test does the same: test/numbers.test.js)
//
// The website's build imports numbers() and headline() from here (it reads the extension's repository at build time), and states the headline numbers in each language.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const count = (text, re) => (text.match(re) || []).length;
const floorTo = (n, step) => Math.floor(n / step) * step;

export function numbers() {
  const prefs = require("../src/lib/prefs.js"), venues = require("../src/lib/venues.js"), i18n = require("../src/lib/i18n.js");
  const ccf = require("../src/data/ccf.js"), core = require("../src/data/core.js"), aliases = require("../src/data/aliases.js"), awards = require("../src/data/awards.js");

  // ---- what can be changed: the settings tree (lib/prefs.js) -----------------------------------------------------------------------------------
  const rows = prefs.SETTINGS, byPath = new Map(rows.map((s) => [s.path, s]));
  const depth = (s) => { let d = 1; for (let c = s; c.parent; c = byPath.get(c.parent)) d++; return d; };
  const kind = (k) => rows.filter((s) => s.kind === k).length;
  const settings = {
    total: rows.length, cards: prefs.CARDS.length, nodes: rows.length + prefs.CARDS.length, levels: Math.max(...rows.map(depth)) + 1,          // (+1: the card above the settings)
    switches: kind("bool"), names: kind("text"), other: rows.length - kind("bool") - kind("text")
  };
  const arrange = { parts: prefs.SECTIONS.length, copy: prefs.COPY_BUTTONS.length, filters: prefs.PILLS.length, looks: prefs.CHIP_THEMES.length, presets: Object.keys(prefs.PRESETS).length };
  const strings = Object.keys(JSON.parse(read("src/_locales/en/messages.json"))).length;
  const languages = { total: i18n.codes.length, strings, translated: (i18n.codes.length - 1) * strings };          // (English is the source of the others)

  // ---- what it knows about venues -------------------------------------------------------------------------------------------------------------
  const lists = {
    ccfConferences: ccf.venues.filter((v) => v.kind === "C").length, ccfJournals: ccf.venues.filter((v) => v.kind === "J").length, coreConferences: core.venues.length
  };
  lists.total = lists.ccfConferences + lists.ccfJournals + lists.coreConferences;          // (rows: a venue that both lists rank is two of them)
  const index = venues.createResolver({ ccf: ccf.venues, core: core.venues, aliases }).index;
  const norm = (x) => String(x).toLowerCase().replace(/\([^()]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  // the venues behind the rows: the rows the matcher links as one venue (a row of each list), and the rows of CCF that name one venue twice, are one
  const allRows = [...index.sources.ccf.C.all, ...index.sources.ccf.J.all, ...index.sources.core.C.all];
  const parent = new Map(allRows.map((r) => [r, r]));
  const find = (r) => { while (parent.get(r) !== r) { parent.set(r, parent.get(parent.get(r))); r = parent.get(r); } return r; };
  const join = (a, b) => { const x = find(a), y = find(b); if (x !== y) parent.set(x, y); };
  for (const [row, others] of index.partners) for (const o of others) join(row, o);
  const twice = new Map();
  for (const r of allRows) if (r.src === "ccf") { const k = r.kind + "|" + norm(r.name); if (twice.has(k)) join(r, twice.get(k)); else twice.set(k, r); }
  lists.distinct = new Set(allRows.map(find)).size;
  // the names Scholar prints that the lists do not have: the names of the alias entries (and the visible starts of cut names) that are not the official name of the row they belong to
  const officialNames = (a) => [
    ...(a.ccf ? ccf.venues.filter((v) => (v.abbr || v.name) === a.ccf && v.kind === (a.kind || "C") && (!a.ccfTier || v.tier === a.ccfTier)).map((v) => v.name) : []),
    ...(a.core ? core.venues.filter((v) => v.acronym === a.core && (!a.coreRank || v.rank === a.coreRank)).map((v) => v.name) : [])
  ].map(norm);
  const curated = aliases.reduce((n, a) => { const own = officialNames(a); return n + ["names", "former", "exact", "fullOnly", "uncut", "volume", "starts"].reduce((m, f) => m + (a[f] || []).filter((x) => !own.includes(norm(x))).length, 0); }, 0);
  let forms = 0, linked = 0, links = 0;
  for (const side of Object.values(index.sources)) for (const list of Object.values(side)) forms += list.names.size;
  const keyOf = (x) => venues.canonTokens(String(x).replace(/\([^()]*\)/g, " "), "noOrg").join(" ");
  for (const [row, others] of index.partners) if (row.src === "ccf") for (const o of others) { linked++; if (keyOf(row.name) !== keyOf(o.name)) links++; }          // (links: the two lists word the venue differently — other content words, not another case, sponsor or "the")
  const venueSrc = read("src/lib/venues.js");
  const stages = new Set(Array.from(venueSrc.matchAll(/^\s*\/\/ (R\d+b?(?:\/R\d+)?)\b/gm), (m) => m[1])).size;          // (R1/R2, R2b, R3, R4, R5)
  const arch = read("docs/ARCHITECTURE.md"), guardTable = arch.slice(arch.indexOf("**Guards.**"), arch.indexOf("**The same venue in the other list.**"));
  // a guard is a row of the table: the checks it names in code, or the plain name of a rule that is not one function
  const guardCells = guardTable.split("\n").filter((l) => /^\| /.test(l) && !/^\|---|^\| Guard/.test(l)).map((l) => l.split("|")[1].trim());
  const guards = [...new Set(guardCells.flatMap((c) => { const names = Array.from(c.matchAll(/`([^`]+)`/g), (m) => m[1]); return names.length ? names : [c]; }))];
  const guardNames = guards.filter((g) => guardCells.some((c) => c.includes("`" + g + "`")));
  const matching = { aliasEntries: aliases.length, curatedNames: curated, forms, acronyms: index.known.size, links, linked, stages, guards: guards.length, guardNames };
  const awardVenues = new Set(awards.items.map((i) => i[2]));
  const years = awards.items.map((i) => i[3]);
  // (papers: one that won twice is one; a paper whose awards are all honorable mentions or runner-up places is counted apart)
  const kindsOf = new Map(); for (const i of awards.items) (kindsOf.get(i[0]) || kindsOf.set(i[0], new Set()).get(i[0])).add(i[4]);
  const mentions = [...kindsOf.values()].filter((k) => [...k].every((x) => x === "runner-up")).length;
  const award = { papers: kindsOf.size - mentions, mentions, entries: awards.items.length, venues: awardVenues.size, from: Math.min(...years), to: Math.max(...years) };

  // ---- what stands behind it: the tests and the real strings they run on ---------------------------------------------------------------------
  const testDir = path.join(root, "test");
  const unit = fs.readdirSync(testDir).filter((f) => f.endsWith(".test.js")).reduce((n, f) => n + count(read("test/" + f), /^test\(/gm), 0);
  const tests = {
    unit, e2e: count(read("test/e2e/run.mjs"), /^\s*ok\(/gm), demo: count(read("test/e2e/demo.mjs"), /^\s*ok\(/gm),
    realLines: Object.keys(JSON.parse(read("test/fixtures/venues.expected.json"))).length
  };
  const pkg = JSON.parse(read("package.json"));
  const dependencies = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).length;
  return { settings, arrange, languages, lists, matching, award, tests, dependencies };
}

// "470+": a count that grows is given rounded down
const plus = (n, step) => floorTo(n, step).toLocaleString("en-US") + "+";
const fmt = (n) => n.toLocaleString("en-US");

// the website's headline numbers, in order: [id, text of the number, the number itself]
export function headline(n) {
  return [
    ["settings", fmt(n.settings.total), n.settings.total],
    ["languages", fmt(n.languages.total), n.languages.total],
    ["venues", fmt(n.lists.distinct), n.lists.distinct],
    ["names", plus(n.matching.curatedNames, 50), n.matching.curatedNames],
    ["guards", fmt(n.matching.guards), n.matching.guards],
    ["awards", fmt(n.award.papers), n.award.papers],
    ["real", fmt(n.tests.realLines), n.tests.realLines],
    ["tests", plus(n.tests.unit, 100), n.tests.unit]
  ];
}

// ---- the README's table (English and Simplified Chinese) -----------------------------------------------------------------------------------
const TEXT = {
  en: {
    head: ["Number", "What", "Counted from"],
    rows: (n, f, p) => [
      [`**${n.settings.total}**`, `settings you can change, in ${n.settings.cards} cards: ${n.settings.switches} switches, ${n.settings.names} names you can set, and ${n.settings.other} colours, choices, orders and languages`, "the settings tree (`src/lib/prefs.js`)"],
      [`**${n.settings.nodes}**`, `nodes in that tree, ${n.settings.levels} levels deep: card, part switch, item, name`, "cards and rows; each row hangs on its part's switch"],
      [`**${n.arrange.parts} · ${n.arrange.copy} · ${n.arrange.filters} · ${n.arrange.looks} · ${n.arrange.presets}**`, "panel parts, copy formats and quick filters (each with a switch, most in an order you set), then chip looks and presets", "`SECTIONS`, `COPY_BUTTONS`, `PILLS`, `CHIP_THEMES`, `PRESETS`"],
      [`**${n.languages.total}**`, `interface languages: ${f(n.languages.strings)} strings each, ${n.languages.total - 1} translated from English`, "`src/_locales/*/messages.json`"],
      [`**${f(n.lists.distinct)}**`, `ranked venues in ${f(n.lists.total)} rows of the two lists (${n.lists.ccfConferences} CCF conferences, ${n.lists.ccfJournals} CCF journals, ${n.lists.coreConferences} CORE conferences); ${f(n.matching.linked)} venues have a row in both`, "the rows of `src/data/ccf.js` and `src/data/core.js`, linked by `idx.partners`"],
      [`**${p(n.matching.curatedNames, 50)}**`, `venue names that Scholar prints but the lists do not have, in ${p(n.matching.aliasEntries, 10)} curated entries: old and renamed venues, other spellings, the lists' own typos, and look-alike events that get no chip`, "`src/data/aliases.js`"],
      [`**${p(n.matching.forms, 100)}** · **${p(n.matching.acronyms, 100)}**`, "name forms and acronyms that the matcher looks up", "the keys of its indexes"],
      [`**${p(n.matching.links, 50)}**`, "venues that the two lists name differently; a match in one list brings the other list's rank", "`idx.partners`"],
      [`**${n.matching.stages} · ${n.matching.guards}**`, "recognition stages (name, journal word set, acronym, start of a cut name, name with subtitle) and guards that stop a weaker reading from beating a stronger one", "the labelled stages of `src/lib/venues.js` and the guard table of `docs/ARCHITECTURE.md`"],
      [`**${f(n.award.papers)}**`, `award-winning papers, plus ${f(n.award.mentions)} with an honorable mention or a runner-up place (${f(n.award.entries)} awards in all), from ${n.award.venues} venues and series, ${n.award.from}–${n.award.to}`, "`src/data/awards.js`"],
      [`**${f(n.tests.realLines)}**`, "real venue lines from Scholar; each result was looked at and recorded", "`test/fixtures/venues.expected.json`"],
      [`**${p(n.tests.unit, 100)} · ${p(n.tests.e2e, 10)} · ${n.tests.demo}**`, "unit tests, end-to-end checks in Chromium with the extension loaded, and checks of the web demo", "`test/*.test.js`, `test/e2e/`"],
      [`**${n.dependencies}**`, "dependencies, and no build step", "`package.json`"]
    ],
    note: "`npm run numbers` counts these from the code and the data, and a test keeps the table true. Counts that grow with each fix are rounded down."
  },
  "zh-CN": {
    head: ["数字", "含义", "统计自"],
    rows: (n, f, p) => [
      [`**${n.settings.total}**`, `项可调整的设置，分布在 ${n.settings.cards} 张卡片中：${n.settings.switches} 个开关、${n.settings.names} 处可自定义名称，以及 ${n.settings.other} 项颜色、选项、顺序和语言`, "设置树的各行（`src/lib/prefs.js`）"],
      [`**${n.settings.nodes}**`, `个节点，共 ${n.settings.levels} 层：卡片、某个部分的开关、其中的一项、它的名字`, "卡片和各行；每一行挂在所属部分的开关下"],
      [`**${n.arrange.parts} · ${n.arrange.copy} · ${n.arrange.filters} · ${n.arrange.looks} · ${n.arrange.presets}**`, "个面板部分、复制格式和快捷筛选——每一项都有自己的开关，多数还能排顺序——以及可选的标签样式和预设", "`SECTIONS`、`COPY_BUTTONS`、`PILLS`、`CHIP_THEMES`、`PRESETS`"],
      [`**${n.languages.total}**`, `种界面语言——每种 ${f(n.languages.strings)} 条文案，${n.languages.total - 1} 种译文`, "`src/_locales/*/messages.json`"],
      [`**${f(n.lists.distinct)}**`, `个有等级的发表场所，来自两份内置名录的 ${f(n.lists.total)} 行（CCF 会议 ${n.lists.ccfConferences}、CCF 期刊 ${n.lists.ccfJournals}、CORE 会议 ${n.lists.coreConferences}）；其中 ${f(n.matching.linked)} 个在两份名录中各有一行`, "`src/data/ccf.js` 和 `src/data/core.js` 的各行，由 `idx.partners` 关联"],
      [`**${p(n.matching.curatedNames, 50)}**`, `个 Scholar 显示但名录中没有的场所名称，收录在 ${p(n.matching.aliasEntries, 10)} 条人工整理的条目中：旧名与改名、其他拼写、名录自身的笔误，以及不给标签的同名活动`, "`src/data/aliases.js`"],
      [`**${p(n.matching.forms, 100)}** · **${p(n.matching.acronyms, 100)}**`, "个名称写法和缩写，匹配器逐一查找", "各索引的键"],
      [`**${p(n.matching.links, 50)}**`, "个两份名录叫法不同、但匹配器知道是同一场所的发表场所：一份名录匹配上，另一份名录的等级也一并给出", "`idx.partners`"],
      [`**${n.matching.stages} · ${n.matching.guards}**`, "道识别步骤（全名、期刊词袋、缩写、被截断名称的可见开头、全名加副标题）和防止较弱判断压过较强判断的防护", "`src/lib/venues.js` 中标注的步骤与 `docs/ARCHITECTURE.md` 的检查表"],
      [`**${f(n.award.papers)}**`, `篇获奖论文，另有 ${f(n.award.mentions)} 篇获荣誉提名或亚军（共 ${f(n.award.entries)} 项奖项），来自 ${n.award.venues} 个会议和系列，${n.award.from}–${n.award.to} 年`, "`src/data/awards.js`"],
      [`**${f(n.tests.realLines)}**`, "行真实的 Scholar 发表场所文本，每一行的结果都逐一核对并记录", "`test/fixtures/venues.expected.json`"],
      [`**${p(n.tests.unit, 100)} · ${p(n.tests.e2e, 10)} · ${n.tests.demo}**`, "个单元测试、在加载了扩展的真实 Chromium 里运行的端到端检查、网页演示的检查", "`test/*.test.js`、`test/e2e/`"],
      [`**${n.dependencies}**`, "个依赖，也没有构建步骤", "`package.json`"]
    ],
    note: "这些数字由 `npm run numbers` 从代码和数据里统计，并有测试保证与实际一致；随每次修复增长的数目只写成向下取整的“N+”。"
  }
};

export function readmeBlock(n, lang = "en") {
  const text = TEXT[lang], f = fmt, p = plus;
  const rows = text.rows(n, f, p);
  return [`| ${text.head.join(" | ")} |`, "|---:|---|---|", ...rows.map((r) => `| ${r.join(" | ")} |`), "", text.note].join("\n");
}

const MARK = { begin: "<!-- numbers:begin -->", end: "<!-- numbers:end -->" };
const FILES = [["README.md", "en"], ["README.zh-CN.md", "zh-CN"]];
// the README text with its block replaced by the numbers' (null when the file has no markers)
export function withBlock(file, lang, n = numbers()) {
  const text = read(file), a = text.indexOf(MARK.begin), b = text.indexOf(MARK.end);
  if (a < 0 || b < a) return null;
  return text.slice(0, a + MARK.begin.length) + "\n" + readmeBlock(n, lang) + "\n" + text.slice(b);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const arg = process.argv[2];
  const n = numbers();
  if (arg === "--readme" || arg === "--check") {
    let stale = false;
    for (const [file, lang] of FILES) {
      const next = withBlock(file, lang, n);
      if (next === null) { console.error(`${file}: no ${MARK.begin} … ${MARK.end} block`); process.exit(1); }
      if (next !== read(file)) { stale = true; if (arg === "--readme") { fs.writeFileSync(path.join(root, file), next); console.log(`${file}: numbers rewritten`); } else console.error(`${file}: the numbers are out of date (npm run numbers)`); }
    }
    if (arg === "--check" && stale) process.exit(1);
    if (arg === "--readme" && !stale) console.log("the numbers are up to date");
  } else {
    console.log(JSON.stringify(n, null, 2));
  }
}
