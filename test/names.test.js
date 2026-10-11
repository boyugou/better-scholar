"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const names = require("../src/lib/names.js");

const fixture = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "profiles", f + ".json"), "utf8"));
const owner = (name, alternates) => ({ name, alternates });
const match = (author, name, alternates) => names.matchesAuthor(author, owner(name, alternates));

test("parseAuthors splits, flags truncation and co-first marks", () => {
  const r = names.parseAuthors("A Smith†, B Jones‡, C Lee, ...");
  assert.deepEqual(r.tokens.map((t) => t.name), ["A Smith", "B Jones", "C Lee"]);
  assert.deepEqual(r.tokens.map((t) => t.cofirst), [true, true, false]);
  assert.equal(r.truncated, true);
  assert.equal(names.parseAuthors("A Smith, B Jones").truncated, false);
  assert.equal(names.parseAuthors("P Dollár…").truncated, true);
  assert.deepEqual(names.parseAuthors("张伟、李明，王芳").tokens.map((t) => t.name), ["张伟", "李明", "王芳"]);
});

test("roleFor: first, second, last, middle; a 2-author paper's second author is last", () => {
  const t = (n) => Array.from({ length: n }, (_, i) => ({ name: "A" + i, cofirst: false }));
  assert.equal(names.roleFor(0, t(5), false), "first");
  assert.equal(names.roleFor(1, t(5), false), "second");
  assert.equal(names.roleFor(2, t(5), false), "middle");
  assert.equal(names.roleFor(4, t(5), false), "last");
  assert.equal(names.roleFor(1, t(2), false), "last");
  assert.equal(names.roleFor(0, t(1), false), "first");
  // a truncated list never claims the last slot
  assert.equal(names.roleFor(4, t(5), true), "middle");
  const co = t(3); co[2].cofirst = true;
  assert.equal(names.roleFor(2, co, false), "cofirst");
});

test("middle initials: profile 'Geoffrey Hinton' matches 'GE Hinton'", () => {
  assert.ok(match("GE Hinton", "Geoffrey Hinton"));
  assert.ok(match("G Hinton", "Geoffrey Hinton"));
  assert.ok(match("GE Hinton", "Geoffrey E Hinton"));
  assert.ok(match("JB Tenenbaum", "Joshua Tenenbaum"));
  assert.ok(match("JB Tenenbaum", "Joshua B. Tenenbaum"));
  assert.ok(match("J Tenenbaum", "Joshua B. Tenenbaum"));
  assert.ok(match("YW Teh", "Yee Whye Teh"));
  assert.ok(match("JP Dupont", "Jean-Pierre Dupont"));
  assert.ok(match("AK Monsefi", "Amin Karimi Monsefi"));
});

test("distinct full given names never match", () => {
  assert.ok(!match("Jane Smith", "John Smith"));
  assert.ok(!match("Jean Smith", "John Smith"));
  assert.ok(!match("J Smith", "Jane Doe"));
  assert.ok(!match("Jo Smith", "John Smith"));
  assert.ok(!match("Al Smith", "John Smith"));
  assert.ok(!match("AB Wu", "Carl Wu"));
  assert.ok(!match("JANE SMITH", "John Smith"));
  assert.ok(match("JOHN SMITH", "John Smith"), "an all-caps name is not an initials cluster");
});

test("non-ASCII letters and non-Latin scripts", () => {
  assert.ok(match("Ł Kaiser", "Łukasz Kaiser"));
  assert.ok(match("L Kaiser", "Łukasz Kaiser"));
  assert.ok(match("Ø Hansen", "Øystein Hansen"));
  assert.ok(match("J Müller", "Jürgen Müller"));
  assert.ok(match("J Muller", "Jürgen Müller"), "accents are folded");
  assert.ok(match("张伟", "张伟"));
  assert.ok(!match("李明", "张伟"));
  assert.ok(match("W Zhang", "Wei Zhang (张伟)"));
  assert.ok(match("W Zhang", "张伟 Wei Zhang"));
});

test("profile header: honorifics, suffixes and parentheticals are stripped", () => {
  for (const header of ["John Smith, PhD", "Prof. John Smith", "Dr. John Smith", "John Smith Jr.", "John Smith (MIT)", "Prof. Dr. John Smith, Ph.D."]) {
    assert.ok(match("J Smith", header), header);
  }
  assert.equal(names.cleanOwnerHeader("Prof. John Smith, Ph.D."), "John Smith");
  assert.equal(names.cleanOwnerHeader("Al"), "Al", "never strips the last remaining token");
});

test("surname particles", () => {
  assert.ok(match("L van der Maaten", "Laurens van der Maaten"));
  assert.ok(match("LJP van der Maaten", "Laurens van der Maaten"));
  assert.ok(match("L Maaten", "Laurens van der Maaten"), "a dropped particle is tolerated");
  assert.ok(!match("L van den Maaten", "Laurens van der Maaten"), "conflicting particles are not");
  // 'Le' / 'Da' are given names in many cultures, not particles
  assert.ok(match("L Song", "Le Song"));
  assert.ok(match("W Li", "Wei Da Li"));
});

test("alternates let a user cover spellings the heuristics cannot", () => {
  assert.ok(!match("Y Su", "Su Yu"));
  assert.ok(match("Y Su", "Su Yu", ["Yu Su"]));
});

test("findOwner prefers the most specific match over an earlier initial collision", () => {
  const { tokens } = names.parseAuthors("W Wang, Wei Wang, X Li");
  assert.equal(names.findOwner(tokens, owner("Wei Wang")), 1);
  const none = names.parseAuthors("A Smith, B Jones");
  assert.equal(names.findOwner(none.tokens, owner("Wei Wang")), -1);
});

test("classifyRow reports found / hidden / absent", () => {
  const o = owner("Ion Stoica");
  const found = names.classifyRow("W Kwon, Z Li, I Stoica", o);
  assert.deepEqual([found.status, found.role], ["found", "last"]);
  const hidden = names.classifyRow("W Kwon, Z Li, S Zhuang, Y Sheng, ...", o);
  assert.deepEqual([hidden.status, hidden.role], ["hidden", null]);
  const absent = names.classifyRow("A Smith, B Jones", o);
  assert.equal(absent.status, "absent");
});

test("real profile — Geoffrey Hinton: the owner is found in 96 of 100 rows", () => {
  const f = fixture("hinton");
  const rows = f.rows.map(([authors]) => names.classifyRow(authors, owner(f.owner)));
  const count = (s) => rows.filter((r) => r.status === s).length;
  assert.equal(count("found"), 96);
  assert.equal(count("hidden"), 2);
  // the two 'absent' rows are Scholar data glitches: a mis-attributed paper and 'GEH JL McClelland'
  assert.equal(count("absent"), 2);
  const roles = {};
  rows.filter((r) => r.role).forEach((r) => (roles[r.role] = (roles[r.role] || 0) + 1));
  assert.deepEqual(roles, { first: 34, second: 10, last: 48, middle: 4 });
});

test("real profile — Kaiming He: every row resolves", () => {
  const f = fixture("kaiming-he");
  const rows = f.rows.map(([authors]) => names.classifyRow(authors, owner(f.owner)));
  const count = (s) => rows.filter((r) => r.status === s).length;
  assert.equal(count("absent"), 0);
  assert.ok(count("found") >= 90, "found " + count("found"));
  assert.equal(count("found") + count("hidden"), 100);
});

test("real profile — Ion Stoica: 28 senior-author rows are hidden behind Scholar's truncation", () => {
  const f = fixture("ion-stoica");
  const rows = f.rows.map(([authors]) => names.classifyRow(authors, owner(f.owner)));
  const count = (s) => rows.filter((r) => r.status === s).length;
  assert.equal(count("hidden"), 28);
  assert.equal(count("absent"), 2); // single-author 'R Fonseca' row and a mis-attributed paper
  assert.equal(count("found"), 70);
});
