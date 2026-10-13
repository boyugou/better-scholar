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
  const co = t(3); co[0].cofirst = co[1].cofirst = true; co[0].marks = co[1].marks = ["*"];
  assert.equal(names.roleFor(1, co, false), "cofirst");
});

test("co-first marks: a leading group that shares a mark counts; a lone mark, or one further down (a corresponding or co-senior author), does not", () => {
  const role = (text, i) => { const r = names.parseAuthors(text); return names.roleFor(i, r.tokens, r.truncated); };
  assert.deepEqual(["A Smith*, B Jones*, C Lee"].flatMap((s) => [0, 1, 2].map((i) => role(s, i))), ["cofirst", "cofirst", "last"]);
  assert.equal(role("A Smith*, B Jones, C Lee", 0), "first", "a lone mark on the first author is a note or a corresponding author");
  assert.equal(role("A Smith, B Jones, C Lee*", 2), "last", "a corresponding author at the end is the last author");
  assert.equal(role("A Smith, B Jones, C Lee*, D Kim*", 3), "last", "co-senior authors are last authors");
  assert.equal(role("A Smith, B Jones*, C Lee*, D Kim", 1), "second", "marks that do not begin with the first author are not co-first");
  assert.equal(role("A Smith, B Jones*, C Lee*, D Kim", 2), "middle");
  assert.equal(role("A Smith*†, B Jones*, C Lee†", 2), "last", "the first author's extra mark does not make the corresponding author co-first");
  assert.equal(role("A Smith*†, B Jones*, C Lee†, D Kim", 2), "middle");
  assert.equal(role("A Smith*†, B Jones*†, C Lee*†, D Kim", 2), "cofirst", "a group that shares both marks");
  assert.equal(role("A Smith†, B Jones†, C Lee‡, D Kim‡", 1), "cofirst");
  assert.equal(role("A Smith†, B Jones†, C Lee‡, D Kim‡", 2), "middle", "a second group with another mark is not co-first");
  assert.equal(role("A Smith†, B Jones‡, C Lee", 1), "second", "two different marks on the first two are two different notes");
  assert.equal(role("A Smith∗, B Jones*, C Lee", 1), "cofirst", "the star-like characters are one mark");
  assert.equal(role("A Smith✉, B Jones✉, C Lee", 1), "second", "the envelope is a corresponding author, never equal contribution");
  assert.deepEqual(names.parseAuthors("A Smith✉, B Jones*").tokens.map((t) => [t.name, t.cofirst]), [["A Smith", false], ["B Jones", true]]);
  // the live profile of 2026-10-13 (test/fixtures/profiles/gou-osu.json): its rows keep the same answers under the old rule and the new one (the cases above are where they differ)
  assert.equal(role("B Gou*, Z Huang*, Y Ning*, Y Gu, M Lin, W Qi, A Kopanev, B Yu, ...", 0), "cofirst");
  assert.equal(role("B Zheng*, B Gou*, S Salisbury*, Z Du*, H Sun, Y Su", 1), "cofirst");
  assert.equal(role("Y Gu*, K Zhang*, Y Ning*, B Zheng*, B Gou, T Xue, C Chang, ...", 4), "middle");
});

test("an all-caps initials + surname name (a patent's inventor) is offered as a spelling, never used by itself", () => {
  const owner = { name: "Jennifer Doudna", alternates: [] };
  assert.equal(names.matchesAuthor("JA DOUDNA", owner), false, "an all-caps name is just shouting: it is not read as initials");
  assert.equal(names.matchesAuthor("JA Doudna", owner), true);
  assert.equal(names.isShoutedInitials("JA DOUDNA", "Jennifer Doudna"), true);
  assert.equal(names.isShoutedInitials("J DOUDNA", "Jennifer Doudna"), true);
  assert.equal(names.isShoutedInitials("KJ DOUDNA", "Jennifer Doudna"), false, "the initials must fit the given names");
  assert.equal(names.isShoutedInitials("JA DOUDNA", "Jane Smith"), false, "and the surname must be the owner's");
  assert.equal(names.isShoutedInitials("JA Doudna", "Jennifer Doudna"), false, "only an all-caps name");
  assert.equal(names.isShoutedInitials("DOUDNA", "Jennifer Doudna"), false);
  assert.equal(names.isShoutedInitials("JENNIFER DOUDNA", "Jennifer Doudna"), false, "a whole given name is not initials (and the usual matching finds it)");
  assert.equal(names.matchesAuthor("JENNIFER DOUDNA", owner), true);
  const lines = ["JA DOUDNA, M Jinek, E Charpentier", "A Smith, JA DOUDNA, B Lee", "X Yu, Z Wang", "JA Doudna, K Chylinski"];
  assert.deepEqual(names.suggestVariants(lines, owner).suggestions, [{ name: "JA DOUDNA", rows: 2 }], "two papers: one click offered");
  assert.deepEqual(names.suggestVariants(lines.slice(0, 1), owner).suggestions, [], "one paper is not enough");
  assert.deepEqual(names.suggestVariants(lines.slice(0, 3), owner).suggestions, [], "and the same initials written as usual must find the owner somewhere in the profile");
  // "WU LI" is not "Wei Li" unless the profile itself writes the owner as "WU Li"
  const wei = { name: "Wei Li", alternates: [] };
  const shouted = ["WU LI, X ZHANG, Y CHEN", "A WANG, WU LI", "W Li, Q Sun", "Wei Li, K Ho"];
  assert.deepEqual(names.suggestVariants(shouted, wei).suggestions, [], "nothing offered on the strength of the capitals alone");
  assert.deepEqual(names.suggestVariants([...shouted, "WU Li, K Ho"], wei).suggestions, [{ name: "WU LI", rows: 2 }], "offered once 'WU Li' is how the profile writes the owner");
  // once the person adds it, it finds the owner
  assert.equal(names.matchesAuthor("JA DOUDNA", { name: "Jennifer Doudna", alternates: ["JA DOUDNA"] }), true);
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

test("reorderings: the rotations of a two- or three-part name, nothing else", () => {
  assert.deepEqual(names.reorderings("Tang Jie"), ["Jie Tang"]);
  assert.deepEqual(names.reorderings("Huang Xuanjing (黄萱菁)"), ["Xuanjing Huang"]);
  assert.deepEqual(names.reorderings("Prof. Wang Xiao Ming"), ["Xiao Ming Wang", "Ming Wang Xiao"]);
  assert.deepEqual(names.reorderings("Stoica"), []);
  assert.deepEqual(names.reorderings("Jean-Luc Marie Pierre Picard"), []);
});

test("isPermutation: the owner's name with its parts moved and initials for some of them — but a different initial is another person", () => {
  for (const [author, o] of [["SY Philip", "Philip S. Yu"], ["J Tang", "Tang Jie"], ["M Tomas", "Tomas Mikolov"], ["H Jiawei", "Jiawei Han"], ["Huang X", "Xuanjing Huang"]]) {
    assert.ok(names.isPermutation(author, o), `${author} ~ ${o}`);
  }
  for (const [author, o] of [["PA David", "David Patterson"], ["J Smith", "Tang Jie"], ["Jie", "Tang Jie"], ["S Y", "Philip S. Yu"], ["Tang Wei", "Tang Jie"]]) {
    assert.ok(!names.isPermutation(author, o), `${author} !~ ${o}`);
  }
});

test("suggestVariants: a surname-first profile name is read the other way at once, when the evidence is plain", () => {
  const rows = Array.from({ length: 12 }, (_, i) => `J Tang, A Author${i}, B Other${i}`);
  const v = names.suggestVariants(rows, { name: "Tang Jie" });
  assert.deepEqual(v.auto, [{ name: "Jie Tang", rows: 12 }]);
  assert.deepEqual(v.suggestions, []);
  // the name as printed already finds the owner: nothing is changed
  assert.deepEqual(names.suggestVariants(rows, { name: "Jie Tang" }), { auto: [], suggestions: [] });
  // too few papers to be sure, or too few that fit
  assert.deepEqual(names.suggestVariants(rows.slice(0, 6), { name: "Tang Jie" }).auto, []);
  assert.deepEqual(names.suggestVariants([...rows.slice(0, 5), ...Array.from({ length: 20 }, (_, i) => `X Nobody${i}, Y Else${i}`)], { name: "Tang Jie" }).auto, []);
});

test("suggestVariants: other rearrangements are offered, only from complete author lists that name no one else's way of writing the owner", () => {
  const owner = { name: "Philip S. Yu" };
  const rows = [
    ...Array.from({ length: 14 }, (_, i) => `A Author${i}, PS Yu`),
    "C Aggarwal, SY Philip", "S Wang, J Cao, SY Philip", "K Fung, SY Philip, Z Liu",
    "A Author, B Other", "PA David, T Klundert",
    "L Truncated, SY Philip, ..."                      // a cut list proves nothing
  ];
  assert.deepEqual(names.suggestVariants(rows, owner), { auto: [], suggestions: [{ name: "SY Philip", rows: 3 }] });
  assert.deepEqual(names.suggestVariants(rows.filter((r) => !/Wang|Fung/.test(r)), owner).suggestions, [], "one paper is not a pattern");
});

test("real profiles — Tang Jie: all 100 rows say 'J Tang' under a surname-first header; Philip S. Yu: 'SY Philip' is offered; the others need nothing", () => {
  const tang = fixture("tang-jie");
  const t = names.suggestVariants(tang.rows.map((r) => r[0]), owner(tang.owner));
  assert.equal(t.auto.length, 1);
  assert.equal(t.auto[0].name, "Jie Tang");
  assert.ok(t.auto[0].rows >= 70, "rows " + t.auto[0].rows);
  const before = tang.rows.filter(([a]) => names.classifyRow(a, owner(tang.owner)).status === "found").length;
  const after = tang.rows.filter(([a]) => names.classifyRow(a, { name: tang.owner, alternates: ["Jie Tang"] }).status === "found").length;
  assert.deepEqual([before, after >= 70], [0, true]);
  const yu = fixture("philip-yu");
  assert.deepEqual(names.suggestVariants(yu.rows.map((r) => r[0]), owner(yu.owner)), { auto: [], suggestions: [{ name: "SY Philip", rows: 6 }] });
  for (const slug of ["hinton", "kaiming-he", "ion-stoica"]) {
    const f = fixture(slug);
    assert.deepEqual(names.suggestVariants(f.rows.map((r) => r[0]), owner(f.owner)), { auto: [], suggestions: [] }, slug);
  }
});
