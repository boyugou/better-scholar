"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const agent = require("../src/lib/agent.js");
const prefs = require("../src/lib/prefs.js");
const query = require("../src/lib/query.js");

test("validate: a call is checked before the page does anything with it", () => {
  const ok = (m, p) => agent.validate(m, p);
  assert.deepEqual(ok("ping"), { ok: true, params: {} });
  assert.deepEqual(ok("ping", null), { ok: true, params: {} });
  assert.deepEqual(ok("papers", { filtered: false }), { ok: true, params: { filtered: false } });
  assert.deepEqual(ok("export", { format: "bibtex" }), { ok: true, params: { format: "bibtex" } });
  assert.deepEqual(ok("export", { format: "summary", source: "none" }).params, { format: "summary", source: "none" });
  assert.deepEqual(ok("filter", { query: "ccf:a", onlyHighlighted: true, yearStart: 2020, yearEnd: null, minCitations: 5, impact: "h" }).params,
    { query: "ccf:a", onlyHighlighted: true, yearStart: 2020, yearEnd: null, minCitations: 5, impact: "h" });
  assert.deepEqual(ok("filter", {}).params, {}, "a filter call may name none");
  // wrong calls say what is wrong
  assert.match(ok("nope").error, /unknown method "nope": one of ping, summary, papers, export, filter, clearFilters/);
  assert.match(ok("ping", { x: 1 }).error, /unknown parameter "x" of ping: it takes none/);
  assert.match(ok("export", {}).error, /export needs "format"/);
  assert.match(ok("export", { format: "docx" }).error, /"format" must be one of: summary, table, papers, apa, ieee, gbt, bibtex, markdown, json, csv/);
  assert.match(ok("filter", { query: 5 }).error, /"query" must be a string/);
  assert.match(ok("filter", { query: "x".repeat(501) }).error, /at most 500/);
  assert.match(ok("filter", { onlyHighlighted: "yes" }).error, /true or false/);
  for (const bad of ["2020", 2020.5, NaN, Infinity, {}, [], 999, 3001]) assert.match(ok("filter", { yearStart: bad }).error, /integer from 1000 to 3000, or null/, String(bad));
  assert.match(ok("filter", { minCitations: -1 }).error, /integer from 0/);
  assert.match(ok("filter", { impact: "h-core" }).error, /one of: h, i10/);
  for (const junk of [5, "x", [], [1]]) assert.match(ok("papers", junk).error, /params must be an object/);
  assert.match(ok("__proto__").error, /unknown method/);
  assert.match(ok("constructor").error, /unknown method/);
  assert.match(ok("filter", JSON.parse('{"__proto__": {"x": 1}}')).error, /unknown parameter "__proto__"/);
  assert.equal(ok("export", { format: "json", extra: 1 }).ok, false);
});

test("the calls' table: every call says what it does and what it returns; every parameter says what it takes", () => {
  for (const [name, m] of Object.entries(agent.METHODS)) {
    assert.ok(m.doc.length > 20 && m.result.length > 10, name);
    for (const [k, p] of Object.entries(m.params)) {
      assert.ok(["boolean", "string", "integer", "choice"].includes(p.type) && p.doc.length > 10, name + "." + k);
      if (p.type === "choice") assert.ok(p.values.length >= 2, name + "." + k);
      if (p.type === "integer") assert.ok(Number.isInteger(p.min) && Number.isInteger(p.max) && p.min < p.max, name + "." + k);
    }
  }
  assert.deepEqual(agent.FORMATS, prefs.COPY_BUTTONS, "a format is a copy button");
  assert.deepEqual(agent.METHODS.export.params.format.values, prefs.COPY_BUTTONS);
});

test("the content script implements exactly the calls of the table, and no other event or message name is made up", () => {
  const code = (f) => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8");
  const main = code("content/main.js"), bridge = code("content/bridge.js");
  const implemented = [...main.slice(main.indexOf("const methods = {")).matchAll(/^    (\w+): /gm)].map((m) => m[1]);
  assert.deepEqual(implemented.sort(), Object.keys(agent.METHODS).sort(), "the methods of main.js are the table's");
  // the transports carry the one request and the one answer
  assert.ok(bridge.includes("B.agent.EVENTS") && !/better-scholar:/.test(bridge + main), "the event names come from the table, not from the code");
  assert.deepEqual(agent.EVENTS, { request: "better-scholar:request", response: "better-scholar:response", marker: "data-rr-ready" });
  assert.ok(bridge.includes('"rr:call"'));
  assert.ok(!/rr:(summary|papers|export|filter)\b/.test(bridge + main + code("popup/popup.js")), "no second set of names for the same calls");
});

test("the guide: every setting, preset, call, parameter and operator is in it; it is the same text every time; nothing personal", () => {
  const g = agent.guide({ version: "9.9.9" });
  assert.equal(agent.guide({ version: "9.9.9" }), g);
  assert.ok(g.startsWith("# Better Scholar 9.9.9 — guide for AI agents"));
  for (const s of prefs.SETTINGS) assert.ok(g.includes("`" + s.path + "`") && g.includes(s.doc.replace(/\|/g, "\\|")), s.path);
  for (const name of Object.keys(prefs.PRESETS)) assert.ok(g.includes("`" + name + "`"), "preset " + name);
  for (const [name, m] of Object.entries(agent.METHODS)) {
    assert.ok(g.includes("### `" + name + "`"), name);
    for (const k of Object.keys(m.params)) assert.ok(g.includes("`" + k + "`"), name + "." + k);
  }
  for (const o of query.OPERATORS) assert.ok(g.includes("`" + o.example + "`"), o.name);
  for (const e of Object.values(agent.EVENTS)) assert.ok(g.includes(e), e);
  assert.ok(g.includes("zh_CN (简体中文)"), "the language codes");
  assert.ok(!/@|https?:\/\/(?!scholar\.google)/.test(g.replace(/semanticscholar/gi, "")), "no address of a person or a service in it");
});

test("the guide's examples are accepted by the settings: the one JSON example applies with nothing ignored", () => {
  const g = agent.guide({});
  const example = JSON.parse(/Example[^\n]*\n```json\n(.*)\n```/.exec(g)[1]);
  assert.deepEqual(prefs.apply(prefs.defaults(), example).ignored, []);
  assert.ok(prefs.apply(prefs.defaults(), example).applied.length >= 3);
});

test("the guide carries this user's record when it is given, and no record when it is not", () => {
  const mine = prefs.apply(prefs.defaults(), { rowStyle: "bar", panel: { years: false } }).prefs;
  const block = (text) => /### Current settings of this user\n```json\n([\s\S]*?)\n```/.exec(text)[1];
  assert.deepEqual(JSON.parse(block(agent.guide({ current: mine }))), mine);
  assert.deepEqual(JSON.parse(block(agent.guide({ current: prefs.defaults() }))), prefs.defaults());
  assert.equal(/Current settings of this user/.test(agent.guide({})), false, "no record given: the reference alone");
});
