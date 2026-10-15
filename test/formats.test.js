"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const f = require("../src/lib/formats.js");
const metrics = require("../src/lib/metrics.js");

const paper = (over = {}) => ({
  id: "p1", title: "Deep Residual Learning for Image Recognition", authors: "K He, X Zhang, S Ren, J Sun", venue: "Proceedings of the IEEE conference on computer vision and pattern recognition",
  year: 2016, citations: 180000, role: "first", status: "found", highlighted: true, type: "conference",
  rank: { ccf: { tier: "A", name: "CVPR" }, core: { rank: "A*", name: "CVPR" } }, marks: ["Best Paper Award"], url: "https://scholar.google.com/citations?view_op=view_citation&citation_for_view=123", ...over
});
const labels = { year: "Year", title: "Title", authors: "Authors", role: "Role", venue: "Venue", ccf: "CCF", core: "CORE", awards: "Awards", citations: "Cited by", hidden: "Role not visible", roles: { first: "First author", last: "Last author" } };
const row = (role, tier) => ({ status: "found", role, venue: tier ? { ccf: { tier } } : {}, citations: 1 });

test("summaryText / summaryTsv", () => {
  const s = metrics.summarize([row("first", "A"), row("first", null), row("last", "B")], "ccf");
  const text = f.summaryText(s, { owner: "Jane Doe", edition: "CCF 2026 (7th edition)" });
  assert.match(text, /^Jane Doe — 3 papers on Google Scholar, by authorship role and CCF rank/);
  assert.match(text, /First author: 2 \(A: 1, unranked: 1\)/);
  assert.match(text, /Last author: 1 \(B: 1\)/);
  assert.match(text, /CCF 2026 \(7th edition\)$/);
  const tsv = f.summaryTsv(s).split("\n");
  assert.equal(tsv[0], "Role\tA\tB\tC\tUnranked\tTotal");
  assert.equal(tsv[1], "First author\t1\t0\t0\t1\t2");
  assert.equal(tsv[tsv.length - 1], "\t1\t1\t0\t1\t3");
});

test("summaryText appends extra lines before the edition; with no ranking there are no tier columns", () => {
  const s = metrics.summarize([row("first", null)], "ccf");
  const lines = f.summaryText(s, { owner: "Jane Doe", extra: ["Awards & talks: Awards 1"], edition: "CCF 2026" }).split("\n");
  assert.equal(lines[lines.length - 2], "Awards & talks: Awards 1");
  assert.equal(lines[lines.length - 1], "CCF 2026");
  assert.ok(!f.summaryText(s, {}).includes("Awards"));
  const bare = metrics.summarize([row("first", "A"), row("first", null), row("last", "B"), { status: "hidden", role: null, venue: {}, citations: 0 }], null);
  assert.match(f.summaryText(bare, { owner: "A Author" }), /^A Author — 4 papers on Google Scholar, by authorship role$/m);
  assert.match(f.summaryText(bare, { owner: "A Author" }), /^First author: 2$/m, "no empty parentheses");
  assert.equal(f.summaryTsv(bare).split("\n")[0], "Role\tTotal");
});

test("rowsTsv: a header and one line per row; a tab or a line break inside a field is a space; a spreadsheet formula is made text", () => {
  assert.equal(f.rowsTsv(["Year", "Title", "Citations"], [[2023, "A\ttab and\nnewline", 12], [null, "Plain", 0], [2020, undefined, ""]]), "Year\tTitle\tCitations\n2023\tA tab and newline\t12\n\tPlain\t0\n2020\t\t");
  assert.equal(f.rowsTsv(["A"], []), "A");
  assert.equal(f.rowsTsv(["T", "N"], [["=HYPERLINK(\"http://x\",\"y\")", -3], ["+1 and -1 ways", "@user"], ["-Omics at scale", "x=y"]]),
    "T\tN\n\"'=HYPERLINK(\"\"http://x\"\",\"\"y\"\")\"\t-3\n'+1 and -1 ways\t'@user\n'-Omics at scale\tx=y");
});

test("rowsCsv: RFC 4180 with a UTF-8 byte-order mark, quotes and commas escaped, CRLF line ends, formulas made text", () => {
  const out = f.rowsCsv(["Year", "Title", "Authors"], [[2024, 'Attention is "All" You Need', "Vaswani, A., Shazeer, N."], [null, "=HYPERLINK(\"http://x\",\"y\")", -5]]);
  assert.ok(out.startsWith("\uFEFF"));
  const lines = out.slice(1).split("\r\n");
  assert.equal(lines[0], "Year,Title,Authors");
  assert.equal(lines[1], '2024,"Attention is ""All"" You Need","Vaswani, A., Shazeer, N."');
  assert.equal(lines[2], ',"\'=HYPERLINK(""http://x"",""y"")",-5');
  for (const lead of ["=1+1", "+cmd", "-cmd", "@SUM(A1)"]) assert.ok(f.rowsCsv(["x"], [[lead]]).includes("'" + lead), lead);
  assert.ok(f.rowsCsv(["x"], [["-12.5"]]).includes("\r\n-12.5"), "a plain number is left alone");
});

test("papers as a table: the columns follow the lists that are on, the role cell says why there is none", () => {
  const papers = [paper(), paper({ id: "2", status: "hidden", role: null, rank: { ccf: null, core: null }, marks: [] }), paper({ id: "3", status: "absent", role: null })];
  const t = f.table(papers, { labels });
  assert.deepEqual(t.header, ["Year", "Title", "Authors", "Role", "Venue", "CCF", "CORE", "Awards", "Cited by"]);
  assert.deepEqual(t.rows[0].slice(3), ["First author", papers[0].venue, "A", "A*", "Best Paper Award", 180000]);
  assert.equal(t.rows[1][3], "Role not visible");
  assert.equal(t.rows[2][3], "");
  assert.deepEqual(f.table(papers, { labels, ccfOn: false }).header, ["Year", "Title", "Authors", "Role", "Venue", "CORE", "Awards", "Cited by"]);
  assert.deepEqual(f.table(papers, { labels, ccfOn: false, coreOn: false }).header.slice(4), ["Venue", "Awards", "Cited by"]);
  assert.ok(f.papersTsv([paper()], { labels }).split("\n")[1].startsWith("2016\tDeep Residual"));
  assert.ok(f.papersCsv([paper()], { labels }).startsWith("\uFEFFYear,Title"));
});

test("bibtex: a standard entry with a key, authors, booktitle or journal, the address, the ranks and marks in a note", () => {
  const bib = f.bibtex([paper(), paper({ id: "2", title: "Attention Is All You Need", authors: "A Vaswani, N Shazeer", year: 2017, venue: "Advances in Neural Information Processing Systems", rank: { ccf: { tier: "A" }, core: null }, marks: [], url: "" })]);
  assert.ok(bib.includes("@inproceedings{he2016deep,"));
  assert.ok(bib.includes("  author = {K He and X Zhang and S Ren and J Sun},"));
  assert.ok(bib.includes("  booktitle = {Proceedings of the IEEE conference on computer vision and pattern recognition},"));
  assert.ok(bib.includes("  url = {https://scholar.google.com/citations?view_op=view_citation&citation_for_view=123},"));
  assert.ok(bib.includes("  note = {CCF A, CORE A*, Best Paper Award}"));
  assert.ok(bib.includes("@inproceedings{vaswani2017attention,"));
  assert.ok(!bib.includes("url = {},") && !bib.split("@inproceedings{vaswani")[1].includes("url ="), "no address, no field");
  assert.ok(f.bibtex([paper()], { ccfOn: false, coreOn: false }).includes("note = {Best Paper Award}"));
  // the kind of venue: what the lists say, then the words of the venue
  const type = (over) => /^@(\w+)\{/.exec(f.bibtex([paper(over)]))[1];
  assert.equal(type({ type: "journal", venue: "Something" }), "article");
  assert.equal(type({ type: null, venue: "IEEE Transactions on Neural Networks" }), "article");
  assert.equal(type({ type: null, venue: "arXiv preprint arXiv:2001.00001" }), "article");
  assert.equal(type({ type: null, venue: "US Patent 10,000,000" }), "misc");
  assert.equal(type({ type: null, venue: "" }), "misc");
  assert.equal(type({ type: "conference", venue: "International Conference on Computer Science" }), "inproceedings", "a 'science' conference is not a journal");
});

test("bibtex: a cut author list ends 'and others', and an entry's key is never used twice", () => {
  const cut = f.bibtex([paper({ authors: "K He, X Zhang, …" })]);
  assert.ok(cut.includes("  author = {K He and X Zhang and others},"));
  assert.ok(f.bibtex([paper({ authors: "K He, X Zhang, ..." })]).includes("and others}"));
  const twice = f.bibtex([paper(), paper({ id: "2" }), paper({ id: "3" })]);
  assert.deepEqual([...twice.matchAll(/^@\w+\{([^,]+),/gm)].map((m) => m[1]), ["he2016deep", "he2016deepb", "he2016deepc"]);
  const nonLatin = f.bibtex([paper({ title: "深度学习", authors: "李 明" }), paper({ title: "机器学习", authors: "李 明" })]);
  assert.deepEqual([...nonLatin.matchAll(/^@\w+\{([^,]+),/gm)].map((m) => m[1]), ["paper2016paper", "paper2016paperb"]);
  const many = f.bibtex(Array.from({ length: 30 }, (_, i) => paper({ id: String(i) })));
  const keys = [...many.matchAll(/^@\w+\{([^,]+),/gm)].map((m) => m[1]);
  assert.equal(new Set(keys).size, 30);
});

test("bibtex: nothing in a title or an author name can be a TeX command", () => {
  const bib = f.bibtex([paper({ title: "100% of C++ & Rust: A #1 Study of $X_y$ in O(n^2) with {BERT} \\input{/etc/passwd} ~ a", authors: "A \\write18 Author, B {Writer}" })]);
  assert.ok(bib.includes("  title = {100\\% of C++ \\& Rust: A \\#1 Study of \\$X\\_y\\$ in O(n\\textasciicircum{}2) with \\{BERT\\} \\textbackslash{}input\\{/etc/passwd\\} \\textasciitilde{} a},"));
  assert.ok(bib.includes("author = {A \\textbackslash{}write18 Author and B \\{Writer\\}}"));
  // every brace in an entry is balanced, whatever the title holds
  for (const title of ["}{", "{{{", "}}}", "a{b", "\\{"]) {
    const entry = f.bibtex([paper({ title })]);
    let depth = 0;
    for (let i = 0; i < entry.length; i++) { if (entry[i] === "\\") { i++; continue; } if (entry[i] === "{") depth++; if (entry[i] === "}") depth--; assert.ok(depth >= 0, title); }
    assert.equal(depth, 0, title);
  }
});

test("markdown: a publication list; what a title says cannot become a link or markup", () => {
  const md = f.markdown([paper(), paper({ id: "2", title: "Attention Is All You Need", authors: "A Vaswani, N Shazeer", year: 2017, venue: "Advances in Neural Information Processing Systems, 2017", rank: { ccf: { tier: "A" }, core: null }, marks: [], citations: 120000, url: "" })]);
  assert.ok(md.includes("1. **[Deep Residual Learning for Image Recognition](https://scholar.google.com/citations?view_op=view_citation&citation_for_view=123)**"));
  assert.ok(md.includes("   K He, X Zhang, S Ren, J Sun"));
  assert.ok(md.includes("**CCF A · CORE A\\***"), "the rank's star is escaped, so that it cannot close the bold");
  assert.ok(md.includes("★ Best Paper Award") && md.includes("Cited by 180,000"));
  assert.ok(md.includes("2. **Attention Is All You Need**"));
  assert.ok(md.includes("   *Advances in Neural Information Processing Systems, 2017* · **CCF A** · Cited by 120,000"));
  const evil = f.markdown([paper({ title: "Click](https://evil.example/phish) [here <img src=x onerror=alert(1)> `code` *bold*", authors: "A <b>B</b>", url: "https://scholar.google.com/x?a=(1) b" })]);
  const first = evil.split("\n")[0];
  assert.ok(first.startsWith("1. **[Click\\]\\(https://evil.example/phish\\) \\[here \\<img src=x onerror=alert\\(1\\)\\> \\`code\\` \\*bold\\*]("), first);
  assert.ok(first.trimEnd().endsWith("(https://scholar.google.com/x?a=%281%29%20b)**"), first);
  assert.ok(evil.includes("   A \\<b\\>B\\</b\\>"));
});

test("apa: authors, year, title, venue, address; a particle stays with the surname; a cut list ends with an ellipsis", () => {
  const apa = f.apa([
    paper({ title: "Chord: A scalable peer-to-peer lookup service for internet applications", authors: "I Stoica, R Morris, D Karger, MF Kaashoek, H Balakrishnan", year: 2001, venue: "ACM SIGCOMM Computer Communication Review" }),
    paper({ title: "A Mathematical Theory of Communication", authors: "CE Shannon", year: 1948, venue: "The Bell System Technical Journal", url: "" }),
    paper({ title: "Attention Is All You Need", authors: "A Vaswani, N Shazeer", year: 2017, venue: "Advances in Neural Information Processing Systems", url: "" }),
    paper({ title: "Massive Multi-Author Study", authors: "A Alpha, B Beta, C Gamma, D Delta, ...", year: null, venue: "Preprint", url: "" })
  ]);
  assert.ok(apa.includes("Stoica, I., Morris, R., Karger, D., Kaashoek, M. F., & Balakrishnan, H. (2001). Chord: A scalable peer-to-peer lookup service for internet applications. *ACM SIGCOMM Computer Communication Review*. https://scholar.google.com"));
  assert.ok(apa.includes("Shannon, C. E. (1948). A Mathematical Theory of Communication. *The Bell System Technical Journal*."));
  assert.ok(apa.includes("Vaswani, A., & Shazeer, N. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems*."));
  assert.ok(apa.includes("Alpha, A., Beta, B., Gamma, C., Delta, D., … (n.d.). Massive Multi-Author Study. *Preprint*."));
  assert.equal(f.apaAuthor("L van der Maaten"), "van der Maaten, L.");
  assert.equal(f.apaAuthor("MD de León Derby"), "de León Derby, M. D.");
  assert.equal(f.apaAuthor("J Van Der Oost"), "Van Der Oost, J.");
  assert.equal(f.apaAuthor("Le Song"), "Song, L.", "a given name that is a particle word stays a given name");
  assert.equal(f.apaAuthor("MF Kaashoek"), "Kaashoek, M. F.");
  assert.equal(f.apaAuthor("Jean-Pierre Dupont"), "Dupont, J.-P.");
  assert.equal(f.apaAuthor("Doe, Jane Ann"), "Doe, J. A.");
  assert.equal(f.apaAuthor("Plato"), "Plato");
  assert.equal(f.apaAuthor("…"), "");
  const twenty = f.apa([paper({ authors: Array.from({ length: 25 }, (_, i) => `A Name${i}`).join(", ") })]);
  assert.ok(twenty.includes("Name18, A., … Name24, A. (2016)."), "more than twenty: the first nineteen, an ellipsis, the last");
});

test("json: the owner, the ranking and the papers' records", () => {
  const out = JSON.parse(f.json({ owner: "Jane Doe", source: "ccf", papers: [paper()] }));
  assert.deepEqual([out.owner, out.source, out.total, out.papers.length], ["Jane Doe", "ccf", 1, 1]);
  assert.equal(out.papers[0].rank.ccf.tier, "A");
});
