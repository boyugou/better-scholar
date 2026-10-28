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

test("a summary of the papers the filters leave says what it counted: a line under the title, the last line of the table, the caption of the real table", () => {
  const s = metrics.summarize([row("first", "A")], "ccf");
  const scope = 'Showing 1 of 9 papers · 2021–… · "vision" <b>';
  const text = f.summaryText(s, { owner: "Jane Doe", scope }).split("\n");
  assert.equal(text[0], "Jane Doe — 1 papers on Google Scholar, by authorship role and CCF rank");
  assert.equal(text[1], scope);
  assert.ok(!f.summaryText(s, { owner: "Jane Doe" }).includes("Showing"), "no scope, no line");
  const tsv = f.summaryTsv(s, { scope }).split("\n");
  assert.equal(tsv[tsv.length - 1], '"Showing 1 of 9 papers · 2021–… · ""vision"" <b>"', "a quotation mark in the line is quoted for a spreadsheet");
  assert.equal(f.summaryTsv(s).split("\n").length, tsv.length - 1, "no scope, no extra line");
  const html = f.summaryHtml(s, { scope });
  assert.match(html, /<caption>Showing 1 of 9 papers · 2021–… · &quot;vision&quot; &lt;b&gt;<\/caption>/, "escaped");
  assert.ok(!f.summaryHtml(s).includes("<caption>"));
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
  assert.ok(bib.includes("  title = {100\\% of C++ \\& Rust: A \\#1 Study of \\$X\\_y\\$ in O(n\\textasciicircum{}2) with \\textbraceleft{}BERT\\textbraceright{} \\textbackslash{}input\\textbraceleft{}/etc/passwd\\textbraceright{} \\textasciitilde{} a},"));
  assert.ok(bib.includes("author = {A \\textbackslash{}write18 Author and B \\textbraceleft{}Writer\\textbraceright{}}"));
  // every brace in an entry is balanced, whatever the title holds: counted as BibTeX counts them, every one, whatever stands before it
  for (const title of ["}{", "{{{", "}}}", "a{b", "\\{", "\\}", "x\\\\}"]) {
    const entry = f.bibtex([paper({ title, authors: title })]);
    let depth = 0;
    for (const ch of entry) { if (ch === "{") depth++; if (ch === "}") depth--; assert.ok(depth >= 0, title); }
    assert.equal(depth, 0, title);
  }
  // a title cannot close its field and open an entry of its own
  const evil = f.bibtex([paper({ title: 'Deep Learning}} @misc(evil, title = "Injected")' })]);
  assert.equal(evil.match(/^@/gm).length, 1, "one entry");
  assert.ok(evil.includes("\\textbraceright{}\\textbraceright{} @misc(evil"), "the braces are text");
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
    paper({ title: "A Mathematical Theory of Communication", authors: "CE Shannon", year: 1948, venue: "The Bell System Technical Journal", url: "", type: "journal" }),
    paper({ title: "Attention Is All You Need", authors: "A Vaswani, N Shazeer", year: 2017, venue: "Advances in Neural Information Processing Systems", url: "" }),
    paper({ title: "Massive Multi-Author Study", authors: "A Alpha, B Beta, C Gamma, D Delta, ...", year: null, venue: "Preprint", url: "", type: null })
  ]);
  assert.ok(apa.includes("Stoica, I., Morris, R., Karger, D., Kaashoek, M. F., & Balakrishnan, H. (2001). Chord: A scalable peer-to-peer lookup service for internet applications. In *ACM SIGCOMM Computer Communication Review*. https://scholar.google.com"));
  assert.ok(apa.includes("Shannon, C. E. (1948). A Mathematical Theory of Communication. *The Bell System Technical Journal*."));
  assert.ok(apa.includes("Vaswani, A., & Shazeer, N. (2017). Attention Is All You Need. In *Advances in Neural Information Processing Systems*."));
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
  assert.ok(html[0].startsWith('<p style="margin:0 0 0.6em 0.5in;text-indent:-0.5in">Stoica, I., &amp; Morris, R. (2001). Chord &amp; co. In <i>ACM SIGCOMM &lt;CCR&gt;</i>. <a href="https://scholar.google.com/citations?view_op=view_citation&amp;citation_for_view=123">'), html[0]);
  assert.ok(html[1].includes("In <i>Nature.</i> javascript:alert(1)</p>"), "the venue's own full stop is inside the italics, and a script address is only text");
  assert.doesNotMatch(html[1], /<a /);
  assert.doesNotMatch(html[2], /<i>|<a /, "no venue, no address: nothing to italicise or link");
  // the text form (asterisks for the italics) is what it was
  assert.equal(f.apa(list).split("\n\n")[0], "Stoica, I., & Morris, R. (2001). Chord & co. In *ACM SIGCOMM <CCR>*. https://scholar.google.com/citations?view_op=view_citation&citation_for_view=123");
  assert.ok(f.apa(list).split("\n\n")[1].includes("In *Nature.* javascript:alert(1)"));
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
  const formula = bold(paper({ authors: '=HYPERLINK("https://evil.example","Jane Doe"), Jane Doe', me: "Jane Doe" }));
  assert.ok(formula.includes("<td>&#39;=HYPERLINK(") && formula.includes("<b>Jane Doe</b></td>"), "a cell that begins like a formula is made text here too, owner in bold or not");
  assert.equal(f.papersTsv([paper({ me: "X Zhang" })], lab).includes("<b>"), false);
  assert.equal(f.papersCsv([paper({ me: "X Zhang" })], lab).includes("<b>"), false);
});

test("a copied summary can say where it is from: notes are lines under the title, rows under the table, paragraphs under the real table", () => {
  const s = metrics.summarize([row("first", "A")], "ccf");
  const notes = ["Source: https://scholar.google.com/citations?user=AbC123 · 2026-10-16", "Not fully loaded: 20 papers so far"];
  const text = f.summaryText(s, { owner: "Jane Doe", scope: "Showing 1 of 9 papers", notes }).split("\n");
  assert.deepEqual(text.slice(1, 4), ["Showing 1 of 9 papers", ...notes], "after the scope line, in order");
  const tsv = f.summaryTsv(s, { scope: "Showing 1 of 9 papers", notes }).split("\n");
  assert.deepEqual(tsv.slice(-3), ["Showing 1 of 9 papers", ...notes]);
  const html = f.summaryHtml(s, { notes: ["Source: <b>x</b> & y"] });
  assert.ok(html.endsWith("</table>\n<p>Source: &lt;b&gt;x&lt;/b&gt; &amp; y</p>"), "escaped, after the table");
  assert.equal(f.summaryHtml(s, {}), f.summaryHtml(s), "no notes, nothing added");
  assert.equal(f.summaryText(s, { owner: "Jane Doe" }), f.summaryText(s, { owner: "Jane Doe", notes: [] }));
});

test("the copied summary says what the not-ranked papers are, kind by kind, and nothing when none is not ranked", () => {
  const unranked = (venueText, secondary) => ({ status: "found", role: "first", venue: { ccf: null, core: null, secondary: secondary || null, refused: !!secondary }, venueText, citations: 0 });
  const s = metrics.summarize([row("first", "A"), unranked("arXiv preprint arXiv:1"), unranked("arXiv preprint arXiv:2"), unranked("Workshop X", "workshop"), unranked("Some Journal")], "ccf");
  const text = f.summaryText(s, { owner: "Jane Doe" }).split("\n");
  assert.ok(text.includes("Not ranked: 4 (preprints 2, secondary tracks of ranked venues 1, other venues 1)"), text.join(" | "));
  const ranked = metrics.summarize([row("first", "A")], "ccf");
  assert.ok(!f.summaryText(ranked, { owner: "Jane Doe" }).includes("Not ranked:"), "all ranked: no line");
  assert.ok(!f.summaryText(metrics.summarize([unranked("arXiv")], null), { owner: "Jane Doe" }).includes("Not ranked:"), "by role only: no line");
});

test("rank notes of the BibTeX and Markdown copies: where both lists rank a venue and one is preferred, its rank stands alone (the table and the JSON keep both)", () => {
  const both = paper(), coreOnly = paper({ rank: { ccf: null, core: { rank: "A" } } });
  for (const [prefer, want] of [[null, "CCF A · CORE A\\*"], ["ccf", "**CCF A**"], ["core", "**CORE A\\***"]]) assert.ok(f.markdown([both], { prefer }).includes(want), String(prefer));
  assert.ok(f.markdown([coreOnly], { prefer: "ccf" }).includes("**CORE A**"), "CORE fills in where CCF has no rank");
  assert.match(f.bibtex([both], { prefer: "ccf" }), /CCF A/);
  assert.doesNotMatch(f.bibtex([both], { prefer: "ccf" }), /CORE/);
  assert.doesNotMatch(f.bibtex([both], { prefer: "core" }), /CCF/);
  assert.match(f.bibtex([both], {}), /CCF A.*CORE A\*/s);
  const tsv = f.papersTsv([both], { labels: { year: "Year", title: "Title", authors: "Authors", role: "Role", venue: "Venue", ccf: "CCF", core: "CORE", awards: "Awards", citations: "Citations", roles: {}, hidden: "?" }, ccfOn: true, coreOn: true, prefer: "ccf" });
  assert.ok(tsv.includes("A\tA*"), "the table has a column for each list: both ranks stay");
  // a list that is not drawn is not given, whatever is preferred
  assert.ok(!f.markdown([both], { ccfOn: false, prefer: "ccf" }).includes("CCF"));
});

test("the copied table says what it did not count by role, as the summary does: the lists Scholar cut and the papers without the name", () => {
  const summary = metrics.summarize([row("first", "A"), row("last", "B"), { status: "hidden", role: null, venue: {}, citations: 1 }, { status: "hidden", role: null, venue: {}, citations: 1 }, { status: "absent", role: null, venue: {}, citations: 1 }], "ccf");
  assert.equal(summary.hidden, 2);
  assert.equal(summary.absent, 1);
  const lines = f.summaryTsv(summary, { label: { first: "First", second: "Second", last: "Last", middle: "Other" } }).split("\n");
  assert.ok(lines.includes("Role not visible (Scholar cut the author list): 2"), lines.join(" | "));
  assert.ok(lines.includes("Name not found in author list: 1"), lines.join(" | "));
  const html = f.summaryHtml(summary, { label: { first: "First", second: "Second", last: "Last", middle: "Other" } });
  assert.match(html, /<p>Role not visible \(Scholar cut the author list\): 2<\/p>/);
  assert.match(html, /<p>Name not found in author list: 1<\/p>/);
  // … and a profile with nothing unseen adds nothing
  const whole = metrics.summarize([row("first", "A")], "ccf");
  assert.ok(!/not visible|not found/.test(f.summaryTsv(whole, {})));
});

test("BibTeX citation keys are ASCII, as the README says: the first word of three letters or more of the title, accents taken off, digits not counted", () => {
  const key = (title, authors = "J Smith") => /^@\w+\{([^,]+),/.exec(f.bibtex([paper({ title, authors, year: 2020 })]))[1];
  assert.equal(key("\u00d6konomische Theorie der Firma"), "smith2020okonomische");
  assert.equal(key("\u00dcber die Welt"), "smith2020uber");
  assert.equal(key("2016 Survey of Things"), "smith2020survey");
  assert.equal(key("The \u0141ukasz Method"), "smith2020lukasz");
  assert.equal(key("Deep Learning", "\u0141 Kaiser"), "kaiser2020deep");
  assert.equal(key("COVID-19 and Models"), "smith2020covid");
  assert.equal(key("\u6df1\u5ea6\u5b66\u4e60"), "smith2020paper", "no letters of ASCII: a word that says so");
});


test("the venue line splits into name, volume, issue, pages and year only in the shapes Scholar prints", () => {
  const vp = f.venueParts;
  assert.deepEqual(vp("IEEE Transactions on Pattern Analysis and Machine Intelligence 44 (8), 4012-4025, 2022"), { name: "IEEE Transactions on Pattern Analysis and Machine Intelligence", volume: "44", issue: "8", pages: "4012-4025", year: "2022" });
  assert.deepEqual(vp("Proceedings of the IEEE conference on computer vision and pattern recognition, 770-778, 2016"), { name: "Proceedings of the IEEE conference on computer vision and pattern recognition", volume: "", issue: "", pages: "770-778", year: "2016" });
  assert.deepEqual(vp("Advances in Neural Information Processing Systems 36, 314-330, 2023"), { name: "Advances in Neural Information Processing Systems", volume: "36", issue: "", pages: "314-330", year: "2023" });
  assert.deepEqual(vp("AI Communications 21 (2-3), 195-202, 2008"), { name: "AI Communications", volume: "21", issue: "2-3", pages: "195-202", year: "2008" });
  assert.equal(vp("Bioinformatics 19, i225-i231, 2003").pages, "i225-i231");
  assert.equal(vp("2020 IEEE international conference on robotics and automation (ICRA), 9164-9170, 2020").name, "2020 IEEE international conference on robotics and automation (ICRA)");
  // what stays in the name: the edition's year, a preprint's number, a day after a month, a cut line's end; a page "0" is no page
  assert.equal(vp("AMIA Annual Symposium Proceedings 2006, 11, 2006").name, "AMIA Annual Symposium Proceedings 2006");
  assert.deepEqual(vp("arXiv preprint arXiv:2411.10109 52, 2024"), { name: "arXiv preprint arXiv:2411.10109", volume: "", issue: "", pages: "", year: "2024" });
  assert.equal(vp("Cediti, September 5, 2003").volume, "");
  assert.deepEqual(vp("Proceedings of the 2022 ACM SIGSAC Conference on Computer and …, 2022"), { name: "Proceedings of the 2022 ACM SIGSAC Conference on Computer and …", volume: "", issue: "", pages: "", year: "2022" });
  assert.equal(vp("Advances in neural information processing systems, 0").pages, "");
});

test("over the 22,744 real venue lines, the parts keep every word of the line and add none", () => {
  const lines = Object.keys(require("./fixtures/venues.expected.json"));
  const squash = (s) => s.replace(/[–—]/g, "-").replace(/[\s,()]+/g, "");          // (an en dash between numbers is read as a hyphen)
  for (const line of lines) {
    const r = f.venueParts(line);
    for (const f of ["volume", "issue", "pages", "year"]) assert.ok(!r[f] || line.replace(/\s+/g, "").includes(r[f].split("-")[0].replace(/\s+/g, "")), `${line}: ${f} ${r[f]} is not in the line`);
    assert.ok(r.name || !line.trim() || /^[\d,\s-]+$/.test(line) || /^#\s*PLACEHOLDER_/.test(line), `${line}: no name left`);
    if (r.name) assert.ok(squash(line).startsWith(squash(r.name).replace(/…$/, "")), `${line}: the name ${r.name} is not where the line begins`);
    // a split never leaves a label or half a number behind it ("Article No.", "Vol.", "10,007" of a patent's "10,007,785")
    if (r.volume || r.pages) assert.doesNotMatch(r.name, /(?:\b(?:no|vol|article)\.?:?|\bart\.|,\s*paper|\d,\d{1,3}|\d+:\s?\d*\s*-\s*\d*:?)$/i, `${line}: the name ${r.name} ends in a label or half a number`);
  }
});

test("APA and BibTeX use the parts: italics for a journal's volume, (pp. …) for proceedings, and volume, number and pages fields", () => {
  const paper = (venue, type) => ({ title: "A Title", authors: "A Author, B Writer", venue, year: 2022, type, url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("IEEE Transactions on Computers 66 (3), 515-530, 2022", "journal")]), /\*IEEE Transactions on Computers\*, \*66\*\(3\), 515–530\.$/);
  assert.match(f.apa([paper("Conference on Robot Learning, 734-743, 2022", "conference")]), /In \*Conference on Robot Learning\* \(pp\. 734–743\)\.$/);
  assert.match(f.apa([paper("Automation in Construction 141, 104387, 2022", "journal")]), /\*Automation in Construction\*, \*141\*, Article 104387\.$/);
  const bib = f.bibtex([paper("IEEE Transactions on Computers 66 (3), 515-530, 2022", "journal")]);
  assert.match(bib, /journal = \{IEEE Transactions on Computers\},\n  volume = \{66\},\n  number = \{3\},\n  pages = \{515--530\}/);
  // "Proceedings of the IEEE" is a journal also when Scholar adds its volume and pages
  assert.match(f.bibtex([paper("Proceedings of the IEEE 105 (3), 1-10, 2017", null)]), /^@article\{/);
});

test("IEEE: numbered references, initials first, \"in\" for proceedings, vol./no./pp. for a journal, et al. above six authors or for a cut list", () => {
  const paper = (over) => ({ title: "A Title", authors: "MF Kaashoek, L van der Maaten, B Writer", venue: "", year: 2016, type: null, url: "", rank: {}, marks: [], ...over });
  const out = f.ieee([
    paper({ venue: "Proceedings of the IEEE conference on computer vision and pattern recognition, 770-778, 2016", type: "conference" }),
    paper({ authors: "A Author, B Writer", venue: "IEEE Transactions on Computers 66 (3), 515-530, 2017", year: 2017, type: "journal" }),
    paper({ authors: "A A, B B, C C, D D, E E, F F, G G", venue: "Automation in Construction 141, 104387, 2022", year: 2022, type: "journal" }),
    paper({ authors: "A Author, B Writer, …", venue: "", year: null })
  ]).split("\n\n");
  assert.equal(out[0], '[1] M. F. Kaashoek, L. van der Maaten, and B. Writer, "A Title," in *Proceedings of the IEEE conference on computer vision and pattern recognition*, 2016, pp. 770–778.');
  assert.equal(out[1], '[2] A. Author and B. Writer, "A Title," *IEEE Transactions on Computers*, vol. 66, no. 3, pp. 515–530, 2017.');
  assert.equal(out[2], '[3] A. A et al., "A Title," *Automation in Construction*, vol. 141, Art. no. 104387, 2022.');
  assert.equal(out[3], '[4] A. Author et al., "A Title," n.d.');
  // the same for a word processor: real italics, every text escaped
  const html = f.ieeeHtml([paper({ title: "<b>x</b>", venue: "IEEE Transactions on Computers 66 (3), 515-530, 2017", type: "journal" })]);
  assert.match(html, /^<p style="[^"]*text-indent:-2\.2em">\[1\] .*&quot;&lt;b&gt;x&lt;\/b&gt;,&quot; <i>IEEE Transactions on Computers<\/i>, vol\. 66/);
});

test("GB/T 7714-2015: capitals and bare initials, [C]// for proceedings, [J] with year, volume(issue): pages, et al. after three authors or for a cut list", () => {
  const paper = (over) => ({ title: "A Title", authors: "MF Kaashoek, L van der Maaten", venue: "", year: 2016, type: null, ...over });
  const out = f.gbt([
    paper({ authors: "K He, X Zhang, S Ren, J Sun", venue: "Proceedings of the IEEE conference on computer vision and pattern recognition, 770-778, 2016", type: "conference" }),
    paper({ venue: "IEEE Transactions on Computers 66 (3), 515-530, 2017", year: 2017, type: "journal" }),
    paper({ authors: "张伟, 李娜", venue: "Automation in Construction 141, 104387, 2022", year: 2022, type: "journal" }),
    paper({ authors: "A Author, …", venue: "", year: null })
  ]).split("\n");
  assert.equal(out[0], "[1] HE K, ZHANG X, REN S, et al. A Title[C]//Proceedings of the IEEE conference on computer vision and pattern recognition. 2016: 770-778.");
  assert.equal(out[1], "[2] KAASHOEK M F, VAN DER MAATEN L. A Title[J]. IEEE Transactions on Computers, 2017, 66(3): 515-530.");
  assert.equal(out[2], "[3] 张伟, 李娜. A Title[J]. Automation in Construction, 2022, 141: 104387.");
  assert.equal(out[3], "[4] AUTHOR A, et al. A Title[Z].");
});

test("the venue line, from an independent review: what is not a part stays in the line, and each style says what it is", () => {
  const vp = f.venueParts;
  assert.equal(vp("US Patent 10,007,785, 2018").name, "US Patent 10,007,785");
  assert.equal(vp("Geophysical Research Letters 44 (23), 11,985-11,993, 2017").pages, "");
  assert.deepEqual(vp("ACM Transactions on Computer Systems 44 (1), Article No. 1, 2026"), { name: "ACM Transactions on Computer Systems", volume: "44", issue: "1", pages: "1", year: "2026" }, "the article number is read as such, and the volume and issue before it");
  assert.deepEqual(vp("ACM Transactions on Graphics (ToG) 39 (4), 62: 1-62: 14, 2020"), { name: "ACM Transactions on Graphics (ToG)", volume: "39", issue: "4", pages: "62:1-62:14", year: "2020" });
  assert.deepEqual(vp("STOC 18, 2018"), { name: "STOC 18", volume: "", issue: "", pages: "", year: "2018" });
  assert.equal(vp("Applied Cryptography and Network Security, 117, 0").volume, "");
  const paper = (venue, type, over) => ({ title: "A Title", authors: "K He, X Zhang", venue, year: 2018, type, url: "", rank: {}, marks: [], ...over });
  // a patent or a thesis is given as Scholar printed it; GB/T 7714 gives it its own type code
  assert.match(f.apa([paper("US Patent 10,007,785, 2018", null)]), /A Title\. US Patent 10,007,785\.$/);
  assert.match(f.ieee([paper("US Patent 10,007,785, 2018", null)]), /"A Title," US Patent 10,007,785, 2018\.$/);
  assert.match(f.gbt([paper("US Patent 10,007,785, 2018", null)]), /A Title\[P\]\. US Patent 10,007,785, 2018\.$/);
  assert.match(f.gbt([paper("PhD thesis, Massachusetts Institute of Technology, 2018", null)]), /\[D\]\. PhD thesis/);
  // proceedings: APA "In … (Vol., pp.)", IEEE "vol." and "Art. no."
  assert.match(f.apa([paper("ICPR'06 1, 139-142, 2018", "conference")]), /In \*ICPR'06\* \(Vol\. 1, pp\. 139–142\)\.$/);
  assert.match(f.ieee([paper("CHI Conference on Human Factors in Computing Systems, 42, 2018", "conference")]), /Systems\*, 2018\.$/, "a lone number after a proceedings' name is not printed");
  // IEEE: a title's own question mark takes no comma; GB/T: "等" after Chinese names
  assert.match(f.ieee([paper("", null, { title: "Why does it work?" })]), /"Why does it work\?" /);
  assert.match(f.gbt([paper("", null, { authors: "何恺明, 张祥雨, 任少卿, 孙剑" })]), /任少卿, 等\. A Title/);
  // a conference name with a volume and an issue is still a conference
  assert.match(f.bibtex([paper("Proceedings of IASEAI Conference 2 (1), 2025", null)]), /^@inproceedings\{/);
});

test("the venue line, second review: a long name's number is a volume, the bare words art and paper are names, the fields of a line not a document stay structured", () => {
  const vp = f.venueParts;
  assert.equal(vp("Results in Engineering 24, 103212, 2024").volume, "24");
  assert.equal(vp("IEEE INFOCOM 2004 4, 2004").volume, "4");
  assert.equal(vp("STOC 18, 2018").volume, "");
  assert.equal(vp("Data visualization: The state of the art, 201-212, 2003").pages, "201-212");
  assert.equal(vp("Pulp & Paper 34 (2), 10-12, 2010").volume, "34");
  assert.equal(vp("Proceedings of the workshop, January 5–7, 1983, 12–14, 1983").name, "Proceedings of the workshop, January 5–7, 1983");
  const paper = (venue, type) => ({ title: "T", authors: "A Author", venue, year: 2015, type, url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("ISMIR, 260-265, 2015", null)]), /\*ISMIR\* \(pp\. 260–265\)\.$/);
  assert.match(f.ieee([paper("USENIX security symposium 49, 50, 2015", "conference")]), /in \*USENIX security symposium 49\*, 2015\.$/, "a number without a page range stays as printed, unlabelled; the lone 50 is not printed");
});

test("the venue line, third review: a meeting's two-digit edition year, a periodical's volume on an unclassified line, GB/T keeps every field", () => {
  for (const v of ["Proc. IEEE Globecom 98, 1-5, 1998", "FSE 99, 1999", "ISCA 12, 2012"]) assert.equal(f.venueParts(v).volume, "", v);
  assert.equal(f.venueParts("IEEE INFOCOM 2004 4, 2004").volume, "4");
  const paper = (venue) => ({ title: "T", authors: "A Author", venue, year: 2018, type: null, url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("Scientific Reports 6, 29545, 2018")]), /\*Scientific Reports\*, \*6\*, Article 29545\.$/);
  assert.match(f.ieee([paper("IEEE Access 6, 52754-52765, 2018")]), /\*IEEE Access\*, vol\. 6, pp\. 52754–52765, 2018\.$/);
  assert.match(f.gbt([paper("IEEE Access 6, 52754-52765, 2018")]), /T\[J\]\. IEEE Access, 2018, 6: 52754-52765\.$/);
  assert.match(f.gbt([paper("ISMIR, 260-265, 2018")]), /T\[Z\]\. ISMIR, 260-265, 2018\.$/);
});

test("a publisher's name is a book's, given as printed (GB/T [M]); a line of dashes is no venue", () => {
  const paper = (venue) => ({ title: "T", authors: "A Author", venue, year: 2018, type: null, url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("MIT Press, 2018")]), /T\. MIT Press\.$/);
  assert.match(f.gbt([paper("O'Reilly Media, Inc., 2018")]), /T\[M\]\. O'Reilly Media, Inc\., 2018\.$/);
  assert.match(f.apa([paper("-, 2018")]), /\(2018\)\. T\.$/);
  assert.match(f.gbt([paper("-, 2018")]), /T\[Z\]\. 2018\.$/);
  assert.match(f.apa([paper("Journal of Pressure Vessel Technology 12 (3), 1-10, 2018")]), /\*Journal of Pressure Vessel Technology\*, \*12\*\(3\), 1–10\.$/, "a journal whose name holds \"Press\" is no publisher");
});

test("fourth review: a publisher before Scholar's numbers is a book's, a meeting's or a book's volume is no periodical's, Scholar's \", 0\" is no field", () => {
  const paper = (venue) => ({ title: "T", authors: "A Author", venue, year: 2019, type: null, url: "", rank: {}, marks: [] });
  assert.match(f.gbt([paper("Morgan & Claypool Publishers 13, 1-187, 2019")]), /T\[M\]\./);
  for (const v of ["BMVC 1, 2, 2019", "Robotics: Science and Systems VIII 8, 2012", "Introduction to information retrieval, chapter 13, 234-265, 2008"]) assert.match(f.gbt([paper(v)]), /T\[Z\]\./, v);
  assert.match(f.gbt([paper("2021 Fall Central Sectional Meeting, 0")]), /T\[C\]\/\/2021 Fall Central Sectional Meeting\. 2019\.$/, "Scholar's \", 0\" is no field; a name that opens with its year is a meeting's");
  assert.match(f.gbt([paper("time publisher/subscriber inter-process communication model, 2019")]), /T\[Z\]\./);
  assert.match(f.gbt([paper("Scientific Reports 6, 29545, 2016")]), /T\[J\]\. Scientific Reports, 2019, 6: 29545\.$/);
});

test("a journal titled with a publishing word is no publisher", () => {
  assert.doesNotMatch(f.gbt([{ title: "T", authors: "A Author", venue: "Learned Publishing 31, 1-9, 2018", year: 2018, type: null }]), /\[M\]/);
});

test("fifth review: \"Nature 428\" is a journal, \"…SIGCHI Chapter, 66-73\" keeps its pages, publishers with a slash are publishers", () => {
  const paper = (venue) => ({ title: "T", authors: "A Author", venue, year: 2004, type: null, url: "", rank: {}, marks: [] });
  assert.match(f.gbt([paper("Nature 428, 493-521, 2004")]), /T\[J\]\. Nature, 2004, 428: 493-521\.$/);
  assert.match(f.gbt([paper("eLife 9, e52345, 2020")]), /T\[J\]\./);
  assert.equal(f.venueParts("Proceedings of the 11th Biannual Conference of the Italian SIGCHI Chapter, 66-73, 2015").pages, "66-73");
  for (const v of ["AK Peters/CRC Press, 2010", "Pearson/Prentice Hall, 2009", "McGraw-Hill, Inc., 2006"]) assert.match(f.gbt([paper(v)]), /T\[M\]\./, v);
  assert.match(f.gbt([paper("Lab on a Chip 20, 1-10, 2020")]), /T\[J\]\./);
});

test("the venue line, from an audit of the reference-style snapshot: journals titled Proceedings, other page and issue shapes, cut issues", () => {
  const vp = f.venueParts;
  const paper = (venue, type) => ({ title: "T", authors: "K He", venue, year: 2020, type, url: "", rank: {}, marks: [] });
  assert.equal(f.gbt([paper("Proceedings of the VLDB Endowment 14 (7), 1241-1253, 2021", "conference")]), "[1] HE K. T[J]. Proceedings of the VLDB Endowment, 2020, 14(7): 1241-1253.");
  assert.match(f.gbt([paper("Proceedings of the National Academy of Sciences 120 (8), e2218605120, 2023")]), /T\[J\]\. Proceedings of the National Academy of Sciences, 2020, 120\(8\): e2218605120\.$/);
  assert.deepEqual(vp("Nucleic acids research 44 (D1), D231-D238, 2016"), { name: "Nucleic acids research", volume: "44", issue: "D1", pages: "D231-D238", year: "2016" });
  assert.deepEqual(vp("Proceedings of the ACM on Management of Data 4 (1 (SIGMOD), 1-29, 2026"), { name: "Proceedings of the ACM on Management of Data", volume: "4", issue: "1", pages: "1-29", year: "2026" });
  assert.deepEqual(vp("ACM Transactions on Design Automation of Electronic Systems (TODAES) 11 (1 …, 2006"), { name: "ACM Transactions on Design Automation of Electronic Systems (TODAES)", volume: "11", issue: "", pages: "", year: "2006" });
  assert.equal(vp("ASP-DAC 2004: Asia and South Pacific Design Automation Conference 2004 (IEEE …, 2004").volume, "", "a cut word is no issue, and an edition year no volume");
  assert.equal(vp("Empirical Software Engineering 23 (5), 2948--2979, 2018").pages, "2948-2979");
  assert.match(f.gbt([paper("Findings of the Association for Computational Linguistics: EMNLP 2020, 708-718, 2020")]), /T\[C\]\/\/Findings of the Association for Computational Linguistics: EMNLP 2020\. 2020: 708-718\.$/);
  assert.match(f.gbt([paper("CHI'05 Extended Abstracts on Human Factors in Computing Systems, 2134-2135, 2005")]), /T\[C\]\/\//);
  assert.match(f.gbt([paper("Proceedings of the USENIX Security Symposium, 2013., 2013", "conference")]), /Symposium, 2013\. 2020\.$/, "no second full stop");
  assert.match(f.gbt([paper("2006 IEEE International Symposium on Circuits and Systems (ISCAS), 4 pp., 2006", "conference")]), /\(ISCAS\)\. 2020\.$/);
  assert.match(f.gbt([paper("International Conference on Learning Representations, arXiv:1412.6980, 2015", "conference")]), /T\[C\]\/\//, "a conference with an arXiv number stays a conference");
});

test("the venue line: a name that opens with its year is a meeting's, a web address is no periodical, section-numbered pages", () => {
  const paper = (venue, type) => ({ title: "T", authors: "K He", venue, year: 2018, type, url: "", rank: {}, marks: [] });
  assert.equal(f.gbt([paper("2015 IEEE Trustcom/BigDataSE/ISPA 1, 238-245, 2015")]), "[1] HE K. T[C]//2015 IEEE Trustcom/BigDataSE/ISPA 1. 2018: 238-245.", "a proceedings' number stays after its name, as printed");
  assert.match(f.gbt([paper("IJCAI 16, 740-747, 1999", "conference")]), /T\[C\]\/\/IJCAI 16\. 2018: 740-747\.$/, "an edition or a volume: the line does not say which, so it is not labelled");
  assert.match(f.gbt([paper("Proceedings of the AAAI Conference on Artificial Intelligence 36 (3), 2964-2972, 2022", "conference")]), /T\[C\]\/\/Proceedings of the AAAI Conference on Artificial Intelligence 36 \(3\)\. 2018: 2964-2972\.$/);
  assert.match(f.gbt([paper("2010 Internet of Things (IOT), 1-8, 2010")]), /T\[C\]\/\/2010 Internet of Things \(IOT\)\. 2018: 1-8\.$/);
  assert.match(f.gbt([paper("2019 IEEE Transactions on Mobile Computing 18 (3), 1-10, 2019")]), /T\[J\]\./, "a year-led name that says it is a journal is one");
  assert.match(f.gbt([paper("URL https://code. google. com/p/word2vec 22, 795, 2013")]), /T\[Z\]\. URL https:\/\/code\. google\. com\/p\/word2vec 22, 795, 2018\.$/);
  assert.match(f.gbt([paper("URL https://llava-vl. github. io/blog/2024-01-30-llava-next 1 (8), 2024")]), /T\[Z\]\./);
  assert.equal(f.venueParts("2018 IEEE International Electron Devices Meeting (IEDM), 15.6. 1-15.6. 4, 2018").pages, "15.6.1-15.6.4");
  assert.deepEqual(f.venueParts("Current protocols in bioinformatics 55 (1), 12.14. 1-12.14. 18, 2016"), { name: "Current protocols in bioinformatics", volume: "55", issue: "1", pages: "12.14.1-12.14.18", year: "2016" });
});

test("the venue line, from an independent review of the snapshot fixes: issues in capitals, half-read lines, short Proc. forms, junk, bare no.", () => {
  const vp = f.venueParts;
  const paper = (venue, type) => ({ title: "T", authors: "K He", venue, year: 2018, type, url: "", rank: {}, marks: [] });
  assert.deepEqual(vp("Proceedings of the ACM on Programming Languages 1 (OOPSLA), 1-22, 2017"), { name: "Proceedings of the ACM on Programming Languages", volume: "1", issue: "OOPSLA", pages: "1-22", year: "2017" });
  assert.equal(vp("Proceedings of the ACM on Human-Computer Interaction 8 (CHI PLAY), 1-30, 2024").issue, "CHI PLAY");
  assert.equal(vp("IEEE transactions on software engineering 18 (March), 190-205, 1992").issue, "", "a month in brackets is no issue");
  assert.deepEqual(vp("Information Retrieval Journal 21 (2--3), 111--182, 2018"), { name: "Information Retrieval Journal", volume: "21", issue: "2-3", pages: "111-182", year: "2018" });
  for (const v of ["IBM Journal of Research and Development 55 (1.2), 6: 1-6: 14, 2011", "ACM Transactions on Graphics 38 (4 : SIGGRAPH 2019), Article 28, 2019"])
    assert.equal(vp(v).pages, "", `${v}: the pages are not read where the "V (…)" before them is not: the line as printed, not half of it`);
  assert.equal(vp("Proceedings of the Web Conference 2021 (WWW 2021), 1516-1527, 2021").pages, "1516-1527", "a year's brackets are the name's");
  assert.equal(vp("Annals of internal medicine 172 (11_Supplement), S137-S144, 2020").issue, "11_Supplement");
  assert.equal(vp("Journal of political economy 82 (2, Part 1), 225-249, 1974").issue, "2, Part 1");
  assert.equal(vp("Proceedings of the IEEE 100 (Special Centennial Issue), 1309-1312, 2012").issue, "Special Centennial Issue");
  assert.match(f.gbt([paper("Proc. VLDB Endow. 15 (10), 2019-2031, 2022", "conference")]), /T\[J\]\. Proc\. VLDB Endow\., 2018, 15\(10\): 2019-2031\.$/);
  assert.match(f.gbt([paper("Proc. ACM Program. Lang. 6 (POPL), 1-29, 2022", "conference")]), /T\[J\]\. Proc\. ACM Program\. Lang\., 2018, 6\(POPL\): 1-29\.$/);
  // Scholar's placeholder is no venue, and its numbers are none either
  for (const style of ["gbt", "apa", "ieee", "bibtex"]) assert.doesNotMatch(f[style]([paper("# PLACEHOLDER_PARENT_METADATA_VALUE# 271, 8: 1-8: 13, 2023")]), /PLACEHOLDER|271/, style);
  // a bare "no." after a volume is its issue: given as printed
  assert.deepEqual(vp("Neural Computation 12, no. 3, 2000"), { name: "Neural Computation 12, no. 3", volume: "", issue: "", pages: "", year: "2000" });
  assert.equal(vp("ACM Transactions on Computer Systems 44 (1), Article No. 1, 2026").pages, "1");
  // a preprint cut inside its issue has no volume; a year-led thesis, report or journal with an issue keeps its own type
  assert.equal(vp("arXiv preprint arXiv:2108.00154 1 (2 …, 2021").volume, "");
  assert.match(f.gbt([paper("2018 PhD Thesis, University of Oxford, 2018")]), /T\[D\]\./);
  assert.match(f.gbt([paper("2014 IEEE Network 28 (4), 1-8, 2014")]), /T\[J\]\. 2014 IEEE Network, 2018, 28\(4\): 1-8\.$/);
});

test("BibTeX types an unclassified line with a volume as the other styles do", () => {
  const p = { title: "T", authors: "K He", venue: "Scientific Reports 6, 29545, 2016", year: 2016, type: null, url: "", rank: {}, marks: [] };
  assert.match(f.gbt([p]), /T\[J\]\. Scientific Reports, 2016, 6: 29545\.$/);
  assert.match(f.bibtex([p]), /^@article\{he2016t,[\s\S]*journal = \{Scientific Reports\},\n  volume = \{6\},\n  pages = \{29545\}/);
  assert.match(f.bibtex([{ ...p, venue: "BMVC 1, 2, 2016" }]), /^@misc\{/, "a meeting's acronym with a number is no periodical, in BibTeX too");
});

test("the venue line, second review of the fixes: meetings, drafts and series are no periodicals; Proc. ACM journals by their abbreviations", () => {
  const vp = f.venueParts;
  const paper = (venue, type) => ({ title: "T", authors: "K He", venue, year: 2018, type, url: "", rank: {}, marks: [] });
  for (const v of ["Audio Engineering Society Convention 110, 2001", "SAT Competition 67, 2023", "ECML PKDD Discovery Challenge 9, 275-284, 2009", "Abstracts of the ICA 6, 1, 2023", "Unpublished manuscript 45, 105, 1988", "Online dataset 90, 2004", "Software Foundations series 1, 2018", "NIST PQC Round 3, 2019", "Draft 0.5 14, 2655, 2020", "Addison-Wesley 520, 131-141, 2010"])
    for (const style of ["gbt", "bibtex"]) assert.doesNotMatch(f[style]([paper(v)]), /\[J\]|@article/, `${v} (${style})`);
  for (const v of ["Electronic Notes in Theoretical Computer Science 62, 24-37, 2002", "Scientific Reports 6, 29545, 2016", "The Round Table 104, 1-10, 2015"])
    assert.match(f.bibtex([paper(v)]), /^@article/, v);
  for (const v of ["Proc. ACM SIGMOD Int. Conf. on Management of Data, 1-12, 2020", "Proc ACM Symposium on Theory of Computing, 1-10, 2020"]) assert.match(f.bibtex([paper(v)]), /^@inproceedings/, v);
  for (const v of ["Proc. ACM Hum.-Comput. Interact. 5 (CSCW1), 1-20, 2021", "Proc. ACM Netw. 1 (2), 1-20, 2023"]) assert.match(f.bibtex([paper(v, "conference")]), /^@article/, v);
  assert.deepEqual(vp("Frontiers in Neuroscience 12 (Article 1047), 1-19, 2019"), { name: "Frontiers in Neuroscience", volume: "12", issue: "", pages: "1047", year: "2019" });
  assert.equal(vp("Lecture Notes Vol. 5 (LNCS), 1-10, 2020").volume, "", "no label before a volume");
  assert.equal(vp("Journal of Things 5 (IN PRESS), 1-10, 2020").issue, "", "a status is no issue");
});

test("a proceedings named by its acronym alone keeps its number as printed: an edition, a year or another series' volume", () => {
  const paper = (venue) => ({ title: "T", authors: "K He", venue, year: 1999, type: "conference", url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("IJCAI 16, 740-747, 1999")]), /In \*IJCAI 16\* \(pp\. 740–747\)\.$/);
  assert.match(f.ieee([paper("OOPSLA 47 (10), 163-178, 2012")]), /in \*OOPSLA 47 \(10\)\*, 1999, pp\. 163–178\.$/);
  assert.match(f.bibtex([paper("IJCAI 16, 740-747, 1999")]), /booktitle = \{IJCAI 16\},\n  pages = \{740--747\}/);
  assert.doesNotMatch(f.bibtex([paper("IJCAI 16, 740-747, 1999")]), /volume/);
  // a long name's number is its proceedings' volume
  assert.match(f.apa([paper("Advances in Neural Information Processing Systems 34, 26804-26817, 2021")]), /\(Vol\. 34, pp\. 26804–26817\)\.$/);
  // LIPIcs and ACM page labels with a double hyphen
  assert.equal(f.venueParts("20th International Workshop on Worst-Case Execution Time Analysis, 2: 1--2: 17, 2022").pages, "2:1-2:17");
  assert.deepEqual(f.venueParts("ACM Transactions on Graphics (TOG) 36 (2), 19:1--19:19, 2017"), { name: "ACM Transactions on Graphics (TOG)", volume: "36", issue: "2", pages: "19:1-19:19", year: "2017" });
});

test("a report's number or series makes a report, in every style; a version is no periodical's volume", () => {
  const paper = (venue) => ({ title: "T", authors: "K He", venue, year: 2004, type: null, url: "", rank: {}, marks: [] });
  for (const v of ["Intel Research, IRB-TR-04 12, 2-15, 2004", "Technical Reoprt CMU/SEI-96-TR 25, 1997", "Reports of SFB/TR 14, 2006", "Nist special publication sp 251, 586-590, 2003", "UM Computer Science Department; CS-TR-2657, 1998"]) {
    assert.match(f.gbt([paper(v)]), /T\[R\]\./, v);
    assert.match(f.bibtex([paper(v)]), /^@misc/, v);
  }
  assert.match(f.gbt([paper("Volume I: User-Level ISA’, version 2, 1-79, 2014")]), /T\[Z\]\. Volume I: User-Level ISA’, version 2, 1-79, 2004\.$/);
  assert.match(f.gbt([paper("Scientific Reports 6, 29545, 2016")]), /T\[J\]\./, "a journal named Reports is no report");
});

test("APA and IEEE keep a proceedings' number without pages after the name, as printed, as GB/T does", () => {
  const paper = (venue) => ({ title: "T", authors: "K He", venue, year: 1999, type: "conference", url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("Advances in Neural Information Processing Systems 12, 1999")]), /In \*Advances in Neural Information Processing Systems 12\*\.$/);
  assert.match(f.ieee([paper("Advances in Neural Information Processing Systems 12, 1999")]), /in \*Advances in Neural Information Processing Systems 12\*, 1999\.$/);
  assert.match(f.gbt([paper("Advances in Neural Information Processing Systems 12, 1999")]), /T\[C\]\/\/Advances in Neural Information Processing Systems 12\. 1999\.$/);
  assert.match(f.apa([paper("Advances in Neural Information Processing Systems 34, 26804-26817, 2021")]), /\(Vol\. 34, pp\. 26804–26817\)\.$/, "beside a page range it is the volume");
});

test("from whole real profiles: a year said twice is said once; a publishing House is a publisher", () => {
  const paper = (venue, type) => ({ title: "T", authors: "K He", venue, year: 2016, type, url: "", rank: {}, marks: [] });
  assert.equal(f.venueParts("Computer Vision and Pattern Recognition (CVPR), 2016, 2016").name, "Computer Vision and Pattern Recognition (CVPR)");
  assert.match(f.gbt([paper("Computer Vision and Pattern Recognition (CVPR), 2016, 2016", "conference")]), /T\[C\]\/\/Computer Vision and Pattern Recognition \(CVPR\)\. 2016\.$/);
  assert.equal(f.venueParts("Conference on Things, 2015, 2016").name, "Conference on Things, 2015", "a different year is the name's own");
  for (const v of ["Random House, 2017", "Artech House, 2005"]) assert.match(f.gbt([paper(v)]), /T\[M\]\./, v);
});

test("APA and IEEE: an unclassified line keeps its number after the name; a line with a web address is given as printed, plain", () => {
  const paper = (venue) => ({ title: "T", authors: "K He", venue, year: 2009, type: null, url: "", rank: {}, marks: [] });
  assert.match(f.apa([paper("Handbook of satisfiability 185, 457-481, 2009")]), /\*Handbook of satisfiability 185\* \(pp\. 457–481\)\.$/);
  assert.match(f.ieee([paper("Audio Engineering Society Convention 110, 2001")]), /\*Audio Engineering Society Convention 110\*, 2009\.$/);
  assert.match(f.apa([paper("See https://vicuna. lmsys. org (accessed 14 April 2023) 2 (3), 6, 2023")]), /T\. See https:\/\/vicuna\. lmsys\. org \(accessed 14 April 2023\) 2 \(3\), 6\.$/);
  assert.doesNotMatch(f.apa([paper("See https://vicuna. lmsys. org (accessed 14 April 2023) 2 (3), 6, 2023")]), /\*/, "no italics for a line no rule reads");
});

test("from a QA pass: author marks are no part of a name in a reference; Scholar's word order for Findings and demos; the summary in the page's words", () => {
  const p = (venue, authors = "Y Gu*, K Zhang*, B Gou†, A Author") => ({ title: "T", authors, venue, year: 2025, type: null, url: "", rank: {}, marks: [] });
  assert.match(f.apa([p("ICLR 2025, 2025")]), /^Gu, Y\., Zhang, K\., Gou, B\., & Author, A\./);
  assert.match(f.gbt([p("ICLR 2025, 2025")]), /GU Y, ZHANG K, GOU B, et al\./);
  assert.match(f.bibtex([p("ICLR 2025, 2025")]), /author = \{Y Gu and K Zhang and B Gou and A Author\}/);
  for (const v of ["ACL 2025 Findings, 2025", "EMNLP (Findings), 16395-16409, 2025", "EMNLP 2024 System Demonstrations, 2024", "Findings of EMNLP, 2021"]) assert.match(f.gbt([p(v)]), /T\[C\]\/\//, v);
  assert.match(f.gbt([p("Lawrence Erlbaum Associates, 1981")]), /T\[M\]\./);
  const s = metrics.summarize([{ status: "hidden", role: null, venue: {}, venueText: "X", citations: 0, year: 2020 }], "ccf");
  const text = f.summaryText(s, { owner: "A", words: { title: (src, n) => `Tabelle (${src}): ${n}`, unseen: { hidden: (n) => `versteckt: ${n}`, absent: (n) => `fehlt: ${n}` } } });
  assert.match(text, /^A — Tabelle \(CCF\): 1\nversteckt: 1/);
});

test("the paper page's page range settles a lone number after the issue: a first page, not an article number", () => {
  const p = { title: "T", authors: "G Hinton", venue: "Psychological review 98 (1), 74, 1991", year: 1991, type: "journal", url: "", rank: {}, marks: [] };
  assert.match(f.apa([p]), /\*98\*\(1\), Article 74\.$/);
  assert.match(f.apa([{ ...p, pages: "74-93" }]), /\*98\*\(1\), 74–93\.$/);
  assert.match(f.ieee([{ ...p, pages: "74-93" }]), /pp\. 74–93, 1991\.$/);
  assert.match(f.gbt([{ ...p, pages: "74-93" }]), /98\(1\): 74-93\.$/);
  assert.match(f.gbt([{ ...p, venue: "Psychological review 98 (1), 101-120, 1991", pages: "74-93" }]), /98\(1\): 101-120\.$/, "a range the line has stands");
  assert.match(f.gbt([{ ...p, pages: "e1-e9 x" }]), /98\(1\): 74\.$/, "a field that is no plain range is not used");
});


test("a review of the QA fixes: 'Findings' is proceedings only beside an ACL-family acronym; every co-first mark names.js reads is stripped", () => {
  const p = (venue, authors = "K He") => ({ title: "T", authors, venue, year: 2019, type: null, url: "", rank: {}, marks: [] });
  for (const v of ["Research Findings, 2010", "Clinical Findings, 2018", "Findings, 2015", "Findings in ACL reconstruction, 2019", "MRI findings of ACL tears, 2015"]) assert.doesNotMatch(f.gbt([p(v)]), /\[C\]/, v);
  for (const v of ["ACL 2025 Findings, 2025", "EMNLP (Findings), 1-10, 2025", "Findings of EMNLP, 2021", "Findings of the Association for Computational Linguistics: EMNLP 2020, 1-9, 2020"]) assert.match(f.gbt([p(v)]), /\[C\]/, v);
  for (const v of ["EMNLP Findings 2023, 2023", "ACL Findings 2024, 1-10, 2024", "EMNLP'23 Findings, 2023", "ACL-IJCNLP 2021 Findings, 2021", "Findings (EMNLP), 2022", "EMNLP (findings), 2024"]) assert.match(f.gbt([p(v)]), /\[C\]/, v);
  assert.match(f.gbt([p("ICLR 2019, 2019", "A Smith∗, B Jones#, C Lee⁎")]), /SMITH A, JONES B, LEE C\./);
});

test("the references' HTML flavours put the owner's name in bold when asked; the plain text never carries a mark", () => {
  const p = { title: "T", authors: "Y Gu*, K Zhang*, B Gou, A Author", me: "B Gou", venue: "ICLR 2025, 2025", year: 2025, type: "conference", url: "", rank: {}, marks: [] };
  assert.match(f.apaHtml([p], { markMe: true }), /Zhang, K\., <b>Gou, B\.<\/b>, &amp; Author/);
  assert.match(f.ieeeHtml([p], { markMe: true }), /K\. Zhang, <b>B\. Gou<\/b>, and A\. Author/);
  assert.match(f.gbtHtml([p], { markMe: true }), /ZHANG K, <b>GOU B<\/b>, et al\./);
  assert.doesNotMatch(f.gbtHtml([p]), /<b>/, "off: no bold");
  assert.match(f.apaHtml([{ ...p, me: "K Zhang*" }], { markMe: true }), /<b>Zhang, K\.<\/b>/, "the owner's printed name with its mark");
  for (const s of [f.apa([p]), f.ieee([p]), f.gbt([p])]) assert.doesNotMatch(s, /[\u0002\u0003]|<b>/);
  assert.match(f.gbtHtml([{ ...p, title: "<script>" }], { markMe: true }), /&lt;script&gt;/, "escaped");
});

test("the references' HTML reads, word for word, as their plain text, wherever the owner stands in the author list", () => {
  // (the owner last used to give APA "<b>Hinton, G. E.</b>." — "G. E.." on the page)
  const text = (html) => html.split("\n").map((l) => l.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")).join("\n");
  const lists = ["A Krizhevsky, I Sutskever, GE Hinton", "GE Hinton", "GE Hinton, A Krizhevsky", "A Krizhevsky, GE Hinton, I Sutskever", "A Krizhevsky, I Sutskever, GE Hinton, B C, D E, F G, H I, J K", "A Krizhevsky, GE Hinton, ..."];
  for (const authors of lists) for (const venue of ["Advances in neural information processing systems 25, 2012", "Nature 521 (7553), 436-444, 2015"]) {
    const p = { title: "Imagenet classification", authors, me: "GE Hinton", venue, year: 2012, type: null, url: "", rank: {}, marks: [] };
    for (const [plain, html] of [[f.apa, f.apaHtml], [f.ieee, f.ieeeHtml], [f.gbt, f.gbtHtml]]) {
      const marked = html([p], { markMe: true });
      if (plain === f.apa) assert.match(marked, /<b>/, authors);          // (APA names up to twenty; IEEE and GB/T may give only the first under "et al.")
      assert.equal(text(marked).replace(/\s+/g, " ").trim(), plain([p]).replace(/\*/g, "").replace(/\s+/g, " ").trim(), `${plain.name}: ${authors} · ${venue}`);          // (the text marks italics with *…*)
      assert.doesNotMatch(text(marked), /\.\./, `${plain.name}: no doubled full stop (${authors})`);
    }
  }
});

