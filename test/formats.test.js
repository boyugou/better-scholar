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

test("the text formats: a journal titled as a proceedings, a name with 'and', accents, particles, suffixes, cut lists, list markers", () => {
  assert.match(f.bibtex([paper({ venue: "Proceedings of the National Academy of Sciences", type: null, rank: { ccf: null, core: null } })]), /^@article\{/);
  assert.ok(f.bibtex([paper({ authors: "R and D Team, B Lee" })]).includes("author = {{R and D Team} and B Lee}"));
  assert.equal(f.apaAuthor("ÉD Ölund"), "Ölund, É. D.");
  assert.equal(f.apaAuthor("Xiao Bin Li"), "Li, X. B.");
  assert.equal(f.apaAuthor("L van der Maaten"), "van der Maaten, L.");
  assert.equal(f.apaAuthor("Robert Smith Jr."), "Smith, R., Jr.");
  const cut = f.apa([paper({ authors: Array.from({ length: 25 }, (_, i) => `A Name${i}`).join(", ") + ", …" })]);
  assert.ok(!/… Name24/.test(cut), "a cut list does not name its last visible author as the last");
  assert.match(f.markdown([paper({ authors: "- Jane Doe" })]), /\n {3}\\- Jane Doe/);
});

test("html: the tables are real tables, every text is escaped, a spreadsheet formula is made text, the header is the same as the text form's", () => {
  const t = f.papersHtml([paper({ title: "A <b>bold</b> & \"quoted\" title", authors: "A <i>Author</i>", year: 2020 }), paper({ title: "=HYPERLINK(\"http://x\")" })], { labels });
  assert.match(t, /^<table border="1" cellspacing="0" cellpadding="4">\n<thead><tr><th>Year<\/th><th>Title<\/th><th>Authors<\/th><th>Role<\/th><th>Venue<\/th><th>CCF<\/th><th>CORE<\/th><th>Awards<\/th><th>Cited by<\/th><\/tr><\/thead>/);
  assert.equal((t.match(/<tr>/g) || []).length, 3, "the header and the two papers");
  assert.ok(t.includes("<td>A &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; title</td>"), t);
  assert.ok(t.includes("<td>A &lt;i&gt;Author&lt;/i&gt;</td>"));
  assert.ok(t.includes("<td>&#39;=HYPERLINK(&quot;http://x&quot;)</td>"), "a formula is text: the leading apostrophe, as in the tab-separated form");
  assert.doesNotMatch(t, /<b>|<i>|<script/i, "nothing a title says is markup");
  const tsvHeader = f.papersTsv([paper()], { labels }).split("\n")[0].split("\t");
  assert.deepEqual([...f.papersHtml([paper()], { labels }).matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]), tsvHeader);
  // the lists that are off leave their columns out, as in the text form
  assert.doesNotMatch(f.papersHtml([paper()], { labels, ccfOn: false, coreOn: false }), /<th>CCF<\/th>|<th>CORE<\/th>/);
  // the summary table: a row per role, then the totals
  const summary = metrics.summarize([row("first", "A"), row("first", "B"), row("last", "A")], "ccf");
  const sh = f.summaryHtml(summary, { label: labels.roles, header: "Role", total: "Total", notRanked: "Unranked" });
  const cells = [...sh.matchAll(/<tr>(.*)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd]>([^<]*)<\/t[hd]>/g)].map((c) => c[1]));
  assert.deepEqual(cells, f.summaryTsv(summary, { label: labels.roles }).split("\n").map((l) => l.split("\t")), "the same cells as the tab-separated table");
  assert.deepEqual(f.summaryTable(summary).rows.at(-1)[0], "", "the totals row has no role");
});

test("html: the reference list has real italics for the venue (the full stop stays outside), a link for a web address only, a hanging indent, and the text form is unchanged", () => {
  const list = [paper({ authors: "I Stoica, R Morris", year: 2001, venue: "ACM SIGCOMM <CCR>", title: "Chord & co" }), paper({ venue: "Nature.", url: "javascript:alert(1)" }), paper({ venue: "", url: "" })];
  const html = f.apaHtml(list).split("\n");
  assert.equal(html.length, 3, "a paragraph each");
  assert.ok(html[0].startsWith('<p style="margin:0 0 0.6em 0.5in;text-indent:-0.5in">Stoica, I., &amp; Morris, R. (2001). Chord &amp; co. <i>ACM SIGCOMM &lt;CCR&gt;</i>. <a href="https://scholar.google.com/citations?view_op=view_citation&amp;citation_for_view=123">'), html[0]);
  assert.ok(html[1].includes("<i>Nature.</i> javascript:alert(1)</p>"), "the venue's own full stop is inside the italics, and a script address is only text");
  assert.doesNotMatch(html[1], /<a /);
  assert.doesNotMatch(html[2], /<i>|<a /, "no venue, no address: nothing to italicise or link");
  // the text form (asterisks for the italics) is what it was
  assert.equal(f.apa(list).split("\n\n")[0], "Stoica, I., & Morris, R. (2001). Chord & co. *ACM SIGCOMM <CCR>*. https://scholar.google.com/citations?view_op=view_citation&citation_for_view=123");
  assert.ok(f.apa(list).split("\n\n")[1].includes("*Nature.* javascript:alert(1)"));
});

test("html: the owner's name is in bold in the author cells when the page marks it, as a whole name of the line and never in the text forms", () => {
  const lab = { labels };
  const bold = (p, markMe = true) => f.papersHtml([p], { ...lab, markMe });
  assert.ok(bold(paper({ authors: "K He, X Zhang, S Ren, J Sun", me: "X Zhang" })).includes("<td>K He, <b>X Zhang</b>, S Ren, J Sun</td>"));
  assert.ok(bold(paper({ authors: "Li Wei, W Li, Li", me: "Li" })).includes("<td>Li Wei, W Li, <b>Li</b></td>"), "only a whole name of the line, the first one that is the owner's");
  assert.ok(bold(paper({ authors: "J Doe, A <i>Smith</i> & Co", me: "A <i>Smith</i> & Co" })).includes("<b>A &lt;i&gt;Smith&lt;/i&gt; &amp; Co</b>"), "the name is escaped like the rest");
  assert.ok(bold(paper({ authors: "J Smith (Jr.), A Doe", me: "J Smith (Jr.)" })).includes("<b>J Smith (Jr.)</b>"), "a name with characters a pattern reads is taken as it is");
  assert.ok(!bold(paper({ authors: "K He, X Zhang", me: "X Zhang" }), false).includes("<b>"), "the page does not mark the name: nor does the copy");
  assert.ok(!bold(paper({ authors: "K He, X Zhang", me: "" })).includes("<b>"), "no name found in the line: nothing to mark");
  assert.ok(!bold(paper({ authors: "K He, X Zhang", me: "Y Nobody" })).includes("<b>"), "a name that is not in the line is not marked");
  assert.equal(f.papersTsv([paper({ me: "X Zhang" })], lab).includes("<b>"), false);
  assert.equal(f.papersCsv([paper({ me: "X Zhang" })], lab).includes("<b>"), false);
});
