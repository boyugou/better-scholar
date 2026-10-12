"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const prefs = require("../src/lib/prefs.js");

test("defaults: everything on, complete, and a fresh object each time", () => {
  const d = prefs.defaults();
  assert.deepEqual(d, {
    v: 3,
    roles: { first: true, cofirst: true, second: true, last: true },
    markName: true,
    ranks: { ccf: true, core: true },
    marks: { award: true, oral: true, spotlight: true, highlight: true },
    panel: { show: true, summary: true, marks: true, filters: true, metrics: true, status: true, names: true },
    autoLoad: true
  });
  d.roles.first = false;
  assert.equal(prefs.defaults().roles.first, true);
});

test("normalize: keeps real choices, drops unknown keys, repairs wrong types, never throws", () => {
  const n = prefs.normalize({ roles: { first: false, last: "no", bogus: true }, ranks: { core: false }, markName: 0, marks: null, panel: { show: false, extra: 1 }, other: 1 });
  assert.equal(n.roles.first, false);
  assert.equal(n.roles.last, true, "a non-boolean falls back to the default");
  assert.equal("bogus" in n.roles, false);
  assert.deepEqual(n.ranks, { ccf: true, core: false });
  assert.equal(n.markName, true);
  assert.deepEqual(n.marks, prefs.defaults().marks);
  assert.deepEqual(n.panel, { show: false, summary: true, marks: true, filters: true, metrics: true, status: true, names: true });
  assert.equal(n.autoLoad, true, "loading the whole list is on unless it was switched off");
  assert.equal(prefs.normalize({ autoLoad: false }).autoLoad, false);
  assert.equal(prefs.normalize({ autoLoad: "no" }).autoLoad, true, "a non-boolean falls back to the default");
  assert.equal("other" in n, false);
  for (const junk of [undefined, null, 0, "x", [], [1, 2], true, () => 1]) assert.deepEqual(prefs.normalize(junk), prefs.defaults());
  assert.deepEqual(prefs.normalize(prefs.normalize(n)), n, "idempotent");
});

test("normalizeUi", () => {
  assert.deepEqual(prefs.normalizeUi(null), { collapsed: false, source: "ccf" });
  assert.deepEqual(prefs.normalizeUi({ collapsed: true, source: "core" }), { collapsed: true, source: "core" });
  assert.deepEqual(prefs.normalizeUi({ collapsed: "yes", source: "x" }), { collapsed: false, source: "ccf" });
});

test("fromLegacy: version 2 settings become prefs and ui", () => {
  const { prefs: p, ui } = prefs.fromLegacy({ v: 2, roles: { first: true, cofirst: false, second: true, last: true }, badges: { ccf: true, core: false, marks: false }, matrixSource: "core", collapsed: true });
  assert.deepEqual(p.roles, { first: true, cofirst: false, second: true, last: true });
  assert.deepEqual(p.ranks, { ccf: true, core: false });
  assert.deepEqual(p.marks, { award: false, oral: false, spotlight: false, highlight: false }, "the old single switch turns all four off");
  assert.equal(p.markName, true, "version 2 never stored it, and it is on by default now");
  assert.deepEqual(ui, { collapsed: true, source: "core" });
  assert.equal(prefs.fromLegacy({ v: 2, markName: false }).prefs.markName, false);
});

test("fromLegacy: version 1 and junk", () => {
  assert.deepEqual(prefs.fromLegacy({ roles: { last: false }, badges: { conference: false, journal: true, ccf: true } }).prefs.ranks, { ccf: true, core: false });
  assert.equal(prefs.fromLegacy({ roles: { last: false } }).prefs.roles.last, false);
  for (const junk of [undefined, null, 5, "x", []]) {
    const r = prefs.fromLegacy(junk);
    assert.deepEqual(r.prefs, prefs.defaults());
    assert.deepEqual(r.ui, { collapsed: false, source: "ccf" });
  }
});

test("the ranking the table uses: the remembered one if it is on, else the first that is, else none", () => {
  const p = (ccf, core) => prefs.normalize({ ranks: { ccf, core } });
  assert.deepEqual(prefs.sources(p(true, true)), ["ccf", "core"]);
  assert.equal(prefs.source(p(true, true), { source: "core" }), "core");
  assert.equal(prefs.source(p(true, false), { source: "core" }), "ccf", "CORE is off, so the table falls back to CCF");
  assert.equal(prefs.source(p(false, true), { source: "ccf" }), "core");
  assert.equal(prefs.source(p(false, false), { source: "ccf" }), null);
  assert.deepEqual(prefs.sources(p(false, false)), []);
});

test("marks: each group has its switch, a finalist follows the awards", () => {
  const only = (group) => prefs.normalize({ marks: { award: false, oral: false, spotlight: false, highlight: false, [group]: true } });
  const marks = [{ kind: "best", group: "award" }, { kind: "finalist", group: "finalist" }, { kind: "oral", group: "oral" }, { kind: "spotlight", group: "spotlight" }, { kind: "highlight", group: "highlight" }];
  const kinds = (p) => prefs.visibleMarks(p, marks).map((m) => m.kind);
  assert.deepEqual(kinds(prefs.defaults()), ["best", "finalist", "oral", "spotlight", "highlight"]);
  assert.deepEqual(kinds(only("award")), ["best", "finalist"]);
  assert.deepEqual(kinds(only("oral")), ["oral"]);
  assert.deepEqual(kinds(only("spotlight")), ["spotlight"]);
  assert.deepEqual(kinds(only("highlight")), ["highlight"]);
  assert.deepEqual(kinds(prefs.normalize({ marks: { award: false, oral: false, spotlight: false, highlight: false } })), []);
  assert.deepEqual(prefs.visibleMarks(prefs.defaults(), undefined), []);
});
