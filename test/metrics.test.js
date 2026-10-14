"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../src/lib/metrics.js");

const paper = (role, ccfTier, extra = {}) => ({
  status: role ? "found" : "hidden",
  role,
  venue: { ccf: ccfTier ? { tier: ccfTier } : null, core: extra.core ? { rank: extra.core } : null },
  citations: extra.citations || 0,
  year: extra.year || 2020,
  highlighted: !!role && role !== "middle",
  venueText: extra.venueText || "",
  ...extra
});

test("hIndex / i10", () => {
  assert.equal(m.hIndex([10, 8, 5, 4, 3]), 4);
  assert.equal(m.hIndex([]), 0);
  assert.equal(m.hIndex([0, 0]), 0);
  assert.equal(m.hIndex([100]), 1);
  assert.equal(m.i10Index([10, 9, 11, 100]), 3);
});

test("citationMetrics splits highlighted from all", () => {
  const rows = [paper("first", "A", { citations: 50 }), paper("middle", "B", { citations: 5 }), paper("last", null, { citations: 12 })];
  const r = m.citationMetrics(rows);
  assert.deepEqual(r.highlighted, { papers: 2, citations: 62, h: 2, i10: 2 });
  assert.deepEqual(r.all, { papers: 3, citations: 67, h: 3, i10: 2 });
});

test("summarize: role x CCF tier matrix", () => {
  const rows = [
    paper("first", "A"), paper("first", "A"), paper("first", "B"), paper("first", null),
    paper("second", "C"), paper("last", "A"), paper("middle", "A"),
    paper(null, null),                        // hidden behind a truncated author list
    { status: "absent", role: null, venue: {}, citations: 0 }
  ];
  const s = m.summarize(rows, "ccf");
  assert.deepEqual(s.columns, ["A", "B", "C", "none"]);
  const get = (role) => s.rows.find((r) => r.role === role);
  assert.deepEqual([get("first").A, get("first").B, get("first").none, get("first").total], [2, 1, 1, 4]);
  assert.deepEqual([get("second").C, get("second").total], [1, 1]);
  assert.equal(get("last").A, 1);
  assert.equal(get("middle").total, 1);
  assert.equal(s.rows.find((r) => r.role === "cofirst"), undefined, "co-first row only when non-empty");
  assert.equal(s.hidden, 1);
  assert.equal(s.absent, 1);
  assert.equal(s.totals.total, 7);
  assert.equal(s.totals.A, 4);
  assert.equal(s.papers, 9);
});

test("summarize: CORE source uses A* / A / B / C", () => {
  const rows = [paper("first", "B", { core: "A*" }), paper("first", null, { core: "A" }), paper("last", "A")];
  const s = m.summarize(rows, "core");
  assert.deepEqual(s.columns, ["A*", "A", "B", "C", "none"]);
  const first = s.rows.find((r) => r.role === "first");
  assert.deepEqual([first["A*"], first.A, first.none], [1, 1, 0]);
  assert.equal(s.rows.find((r) => r.role === "last").none, 1);
});

test("inSelection filters by role, tier and the hidden bucket", () => {
  const p = paper("first", "A");
  assert.ok(m.inSelection(p, null));
  assert.ok(m.inSelection(p, { role: "first" }));
  assert.ok(m.inSelection(p, { role: "first", tier: "A" }));
  assert.ok(!m.inSelection(p, { role: "first", tier: "B" }));
  assert.ok(!m.inSelection(p, { role: "last" }));
  assert.ok(m.inSelection(p, { tier: "A" }));
  assert.ok(m.inSelection(paper(null, null), { role: "hidden" }));
  assert.ok(!m.inSelection(paper(null, null), { role: "first" }));
});

test("unmatchedVenues lists unplaced venues, ignoring preprints and secondary tracks", () => {
  const rows = [
    paper("first", null, { venueText: "Some Obscure Journal 4 (2), 1-9" }),
    paper("first", null, { venueText: "Some Obscure Journal 4 (2), 1-9" }),
    paper("first", null, { venueText: "arXiv preprint arXiv:1234.5678" }),
    paper("first", null, { venueText: "NeurIPS Workshop on X", venue: { secondary: "workshop" } }),
    paper("first", "A", { venueText: "CVPR" })
  ];
  assert.deepEqual(m.unmatchedVenues(rows), [{ venue: "Some Obscure Journal 4 (2), 1-9", count: 2 }]);
});

test("toText / toTsv", () => {
  const s = m.summarize([paper("first", "A"), paper("first", null), paper("last", "B")], "ccf");
  const text = m.toText(s, { owner: "Jane Doe", edition: "CCF 2026 (7th edition)" });
  assert.match(text, /^Jane Doe — 3 papers on Google Scholar, by authorship role and CCF rank/);
  assert.match(text, /First author: 2 \(A: 1, unranked: 1\)/);
  assert.match(text, /Last author: 1 \(B: 1\)/);
  assert.match(text, /CCF 2026 \(7th edition\)$/);
  const tsv = m.toTsv(s).split("\n");
  assert.equal(tsv[0], "Role\tA\tB\tC\tUnranked\tTotal");
  assert.equal(tsv[1], "First author\t1\t0\t0\t1\t2");
  assert.equal(tsv[tsv.length - 1], "\t1\t1\t0\t1\t3");
});

test("toText appends extra lines (the awards and talks line) before the edition", () => {
  const s = m.summarize([{ status: "found", role: "first", venue: {}, citations: 1 }], "ccf");
  const text = m.toText(s, { owner: "Jane Doe", extra: ["Awards & talks: Awards 1"], edition: "CCF 2026" });
  const lines = text.split("\n");
  assert.equal(lines[lines.length - 2], "Awards & talks: Awards 1");
  assert.equal(lines[lines.length - 1], "CCF 2026");
  assert.ok(!m.toText(s, {}).includes("Awards"));
});

test("summarize with no ranking (both rank lists switched off): roles only, no tier columns", () => {
  const rows = [paper("first", "A"), paper("first", null), paper("last", "B"), paper(null, null), { status: "absent", role: null, venue: {}, citations: 0 }];
  const s = m.summarize(rows, null);
  assert.deepEqual(s.columns, []);
  assert.equal(s.source, null);
  assert.deepEqual(s.rows.map((r) => [r.role, r.total]), [["first", 2], ["second", 0], ["last", 1]]);
  assert.equal(s.totals.total, 3);
  assert.equal(s.hidden, 1);
  assert.equal(s.absent, 1);
  const text = m.toText(s, { owner: "A Author" });
  assert.match(text, /^A Author — 5 papers on Google Scholar, by authorship role$/m);
  assert.match(text, /^First author: 2$/m, "no empty parentheses");
  assert.equal(m.toTsv(s).split("\n")[0], "Role\tTotal");
  assert.ok(m.inSelection(paper("first", "A"), { role: "first" }, null));
});

test("toRowsTsv: a header and one line per row; a tab or a line break inside a field is a space; missing values are empty", () => {
  assert.equal(m.toRowsTsv(["Year", "Title", "Citations"], [[2023, "A\ttab and\nnewline", 12], [null, "Plain", 0], [2020, undefined, ""]]),
    "Year\tTitle\tCitations\n2023\tA tab and newline\t12\n\tPlain\t0\n2020\t\t");
  assert.equal(m.toRowsTsv(["A"], []), "A");
  assert.equal(m.toRowsTsv(["T", "N"], [["=HYPERLINK(\"http://x\",\"y\")", -3], ["+1 and -1 ways", "@user"], ["-Omics at scale", "x=y"]]),
    "T\tN\n\"'=HYPERLINK(\"\"http://x\"\",\"\"y\"\")\"\t-3\n'+1 and -1 ways\t'@user\n'-Omics at scale\tx=y");
});

test("toRowsCsv: RFC-4180 CSV with UTF-8 BOM, escaped quotes and commas, CRLF endings, formula protection", () => {
  const out = m.toRowsCsv(["Year", "Title", "Authors"], [
    [2024, 'Attention is "All" You Need', "Vaswani, A., Shazeer, N."],
    [null, "=HYPERLINK(\"http://x\",\"y\")", -5]
  ]);
  assert.ok(out.startsWith("\uFEFF"), "starts with UTF-8 BOM");
  const lines = out.slice(1).split("\r\n");
  assert.equal(lines[0], "Year,Title,Authors");
  assert.equal(lines[1], '2024,"Attention is ""All"" You Need","Vaswani, A., Shazeer, N."');
  assert.equal(lines[2], ',"\'=HYPERLINK(""http://x"",""y"")",-5');
});

test("toBibTeX: generates standard BibTeX entries with citekey, author and, booktitle/journal, rankings note", () => {
  const papers = [
    {
      title: "Deep Residual Learning for Image Recognition",
      authorsText: "K He, X Zhang, S Ren, J Sun, …",
      year: 2016,
      venueText: "Proceedings of the IEEE conference on computer vision and pattern recognition",
      venue: { ccf: { tier: "A" }, core: { rank: "A*" } },
      awards: ["Best Paper Award"]
    },
    {
      title: "Attention Is All You Need",
      authorsText: "A Vaswani, N Shazeer",
      year: 2017,
      venueText: "Advances in Neural Information Processing Systems",
      venue: { ccf: { tier: "A" } }
    }
  ];
  const bib = m.toBibTeX(papers);
  assert.ok(bib.includes("@inproceedings{he2016deep,"));
  assert.ok(bib.includes("  title = {Deep Residual Learning for Image Recognition},"));
  assert.ok(bib.includes("  author = {K He and X Zhang and S Ren and J Sun},"));
  assert.ok(bib.includes("  year = {2016},"));
  assert.ok(bib.includes("  note = {CCF A, CORE A*, Best Paper Award}"));
  assert.ok(bib.includes("@inproceedings{vaswani2017attention,"));
  assert.ok(bib.includes("  author = {A Vaswani and N Shazeer},"));
  assert.ok(bib.includes("  note = {CCF A}"));

  const latexSpecial = [
    {
      title: "100% Analysis of C++ & Rust: A #1 Study of $X_y$",
      authorsText: "A Author",
      year: 2024,
      venueText: "ACM Conference on Security & Privacy",
      href: "/citations?view_op=view_citation&citation_for_view=456"
    }
  ];
  const bibSpecial = m.toBibTeX(latexSpecial);
  assert.ok(bibSpecial.includes("  title = {100\\% Analysis of C++ \\& Rust: A \\#1 Study of \\$X\\_y\\$},"));
  assert.ok(bibSpecial.includes("  booktitle = {ACM Conference on Security \\& Privacy},"));
  assert.ok(bibSpecial.includes("  url = {https://scholar.google.com/citations?view_op=view_citation&citation_for_view=456}"));
});

test("toMarkdown: standard publication list in markdown format", () => {
  const papers = [
    {
      title: "Deep Residual Learning for Image Recognition",
      authorsText: "K He, X Zhang, S Ren, J Sun",
      year: 2016,
      venueText: "Proceedings of the IEEE conference on computer vision and pattern recognition",
      venue: { ccf: { tier: "A" }, core: { rank: "A*" } },
      awards: ["Best Paper Award"],
      citations: 180000,
      href: "/citations?view_op=view_citation&citation_for_view=123"
    },
    {
      title: "Attention Is All You Need",
      authorsText: "A Vaswani, N Shazeer",
      year: 2017,
      venueText: "Advances in Neural Information Processing Systems, 2017",
      venue: { ccf: { tier: "A" } },
      citations: 120000
    }
  ];
  const md = m.toMarkdown(papers);
  assert.ok(md.includes("1. **[Deep Residual Learning for Image Recognition](https://scholar.google.com/citations?view_op=view_citation&citation_for_view=123)**"));
  assert.ok(md.includes("   K He, X Zhang, S Ren, J Sun"));
  assert.ok(md.includes("**CCF A · CORE A***"));
  assert.ok(md.includes("★ Best Paper Award"));
  assert.ok(md.includes("Cited by 180,000"));
  assert.ok(md.includes("2. **Attention Is All You Need**"));
  assert.ok(md.includes("   *Advances in Neural Information Processing Systems, 2017* · **CCF A** · Cited by 120,000"));
});

test("byYear: highlighted papers per year and role, every year in between, none without a year", () => {
  const r = (year, role, highlighted = true) => ({ year, role, highlighted });
  const out = m.byYear([r(2020, "first"), r(2020, "last"), r(2022, "second"), r(2022, "first", false), r(null, "first"), r(2021, "middle")]);
  assert.deepEqual(out.map((e) => [e.year, e.first, e.last, e.second, e.total]), [[2020, 1, 1, 0, 2], [2021, 0, 0, 0, 0], [2022, 0, 0, 1, 1]]);
  assert.deepEqual(m.byYear([]), []);
});

test("yearBars: the last 50 years only; a paper dated 1803 or a typo year ahead does not stretch the chart, a whole career still fits", () => {
  const r = (year, role = "first") => ({ year, role, highlighted: true });
  const out = m.yearBars([r(1803), r(1960), r(1980), r(2000), r(2025), r(2026, "last"), r(2099)], { now: 2026 });
  assert.deepEqual([out.bars[0].year, out.bars[out.bars.length - 1].year, out.bars.length], [1980, 2026, 47], "the window is 1977–2026; it starts at the first year with a paper");
  assert.equal(out.older, 2, "1803 and 1960 are not drawn, and counted");
  assert.deepEqual([1980, 2000, 2025, 2026].map((y) => out.bars.find((b) => b.year === y).total), [1, 1, 1, 1]);
  const veteran = m.yearBars([r(1981), r(2024)], { now: 2026 });              // (the real profile of a veteran: 44 years)
  assert.deepEqual([veteran.bars.length, veteran.older], [44, 0]);
  assert.ok(!out.bars.some((b) => b.year > 2027), "2099 is no year: nothing is drawn for it");
  const small = m.yearBars([r(2020), r(2022)], { now: 2026 });
  assert.deepEqual(small.bars.map((b) => b.year), [2020, 2021, 2022]);
  assert.equal(small.older, 0);
  assert.deepEqual(m.yearBars([]), { bars: [], older: 0 });
  assert.equal(m.yearBars([r(1990), r(2026)], { now: 2026, maxYears: 5 }).older, 1, "the window is a parameter");
  assert.equal(m.YEAR_BARS, 50);
});

test("topVenues: ranked venues of the highlighted papers, most papers first, ties by name, at most n", () => {
  const v = (abbr, highlighted = true) => ({ highlighted, venue: { ccf: { abbr, name: abbr + " full" } } });
  const rows = [v("ICML"), v("ICML"), v("NeurIPS"), v("ACL"), v("ACL"), v("CVPR", false), { highlighted: true, venue: {} }, { highlighted: true, venue: { core: { name: "Journal Of Things" } } }];
  assert.deepEqual(m.topVenues(rows), [
    { key: "ACL", count: 2, name: "ACL full", ccf: null, core: null },
    { key: "ICML", count: 2, name: "ICML full", ccf: null, core: null },
    { key: "Journal Of Things", count: 1, name: "Journal Of Things", ccf: null, core: null },
    { key: "NeurIPS", count: 1, name: "NeurIPS full", ccf: null, core: null }
  ]);
  assert.equal(m.topVenues(rows, 2).length, 2);
  assert.equal(m.venueKey(undefined), "");
});
