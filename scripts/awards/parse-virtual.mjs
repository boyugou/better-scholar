// Parser for the awards page of a conference's "virtual" site (…/virtual/<year>/awards_detail): ICLR (iclr.cc),
// NeurIPS (neurips.cc) and ICML (icml.cc) print one table row per award-winning paper:
//   <td><div>LABEL</div></td>  <td> … <a …>TITLE</a> … <div>A · B · C</div> … </td>
// Two markups occur: the classic one (class "small-title", class "author-str") and the inline-styled one of
// NeurIPS 2025 (the title links to /virtual/<year>/poster/<id>, authors are separated by "⋅"). Pure string work:
// no DOM, no network. Used by scripts/awards/virtual-site.mjs and tested in test/awards-sources.test.js.

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", hellip: "…", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”"
};
const AUTHOR_SEP = /[·⋅•]/;
const PAPER_LINK = /href="[^"]*\/virtual\/\d{4}\/(?:poster|oral|spotlight|talk|papers?)\//;

// Visible text of an HTML fragment: tags become spaces, entities decoded, whitespace collapsed.
export function decode(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

// The award label → the kind used by src/lib/awards.js. null = not a paper award for this extension
// (demos, posters, workshops, reviewer and area-chair awards, volunteers …).
export function kindOf(label) {
  const l = String(label).toLowerCase().replace(/\s+/g, " ").trim();
  if (/demo|demonstration|poster|workshop|reviewer|area chair|volunteer|diversity|competition|challenge|tutorial/.test(l)) return null;
  // an honorable mention is a runner-up whatever it is for ("Test of Time Honorable Mention" included)
  if (/honou?rable mention|runner[- ]?up/.test(l)) return "runner-up";
  if (/test of time/.test(l)) return "tot";
  if (/student/.test(l) && /paper|award/.test(l)) return "student";
  if (/^best\b/.test(l)) return "best";
  if (/^outstanding (?:main track )?paper(?: awards?)?$/.test(l)) return "outstanding";
  if (/distinguished/.test(l)) return "distinguished";
  // named categories that are paper awards in their own right: "Outstanding New Directions Paper",
  // "Datasets and Benchmarks Award" …
  if (/outstanding|new directions|datasets and benchmarks/.test(l)) return "category";
  return null;
}

// → { entries, skipped }. An entry carries the page it came from (`source`) and a quoted line that contains the
// title and the printed award label (`evidence`), the two things scripts/awards/merge-raw.mjs requires.
export function parseAwardsPage(html, { venue, year, host }) {
  const entries = [];
  const skipped = [];
  const source = `https://${host}/virtual/${year}/awards_detail`;
  for (const row of String(html ?? "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const body = row[1];
    const labelHtml = /<td\b[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/.exec(body);
    const label = labelHtml ? decode(labelHtml[1]) : "";
    if (!label) continue;                                                 // header and decorative rows

    // the paper's title: a "small-title" link, or the link to the paper's own virtual page
    let title = "";
    for (const a of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      if (!/class="[^"]*\bsmall-title\b/.test(a[1]) && !PAPER_LINK.test(a[1])) continue;
      const text = decode(a[2]);
      // a test-of-time row links to its award page, whose text is the award name rather than a paper title
      if (!text || text.toLowerCase() === label.toLowerCase() || /^test of time award$/i.test(text)) continue;
      title = text;
      break;
    }
    // the test-of-time talk is titled "Test of Time Award Talk: <paper title>" or "Test of Time: <paper title>"
    title = title.replace(/^test of time(?: award)?(?: talk)?\s*:\s*/i, "").trim();

    // the author line: the first block that names several people with a separator (or the author-str class)
    let authorsText = "";
    for (const d of body.matchAll(/<div\b([^>]*)>([\s\S]*?)<\/div>/g)) {
      const text = decode(d[2]);
      if (!text || text.length > 600) continue;
      if (/\bauthor-str\b/.test(d[1]) || AUTHOR_SEP.test(text)) { authorsText = text; break; }
    }
    const authors = authorsText.split(AUTHOR_SEP).map((s) => s.trim()).filter(Boolean);
    if (!title) {
      // a test-of-time row without the paper's title: its own page may carry the title (see parseTestOfTimeDetail)
      const href = (/href="([^"]*\/virtual\/\d{4}\/test-of-time\/[^"]*)"/.exec(body) || [])[1];
      skipped.push(href && /test of time/i.test(label)
        ? { label, title: "", why: "no paper title on the row", href, authors }
        : { label, title: "", why: "no paper title on the row" });
      continue;
    }

    const kind = kindOf(label);
    if (!kind) { skipped.push({ label, title, why: "not a paper award" }); continue; }
    if (!authors.length) { skipped.push({ label, title, why: "no author line" }); continue; }
    entries.push({
      venue, year, award: kind, awardLabel: label, title, authors,
      track: /dataset|benchmark|db track/i.test(label) ? "datasets" : "main",
      source, evidence: `${title} — ${label}`, verified: "official (conference awards page)"
    });
  }
  return { entries, skipped };
}

// The conference's own "Awards" page in prose (ICML 2023 lists its Outstanding Paper recipients this way): under a
// heading, each recipient is a title line, an author line (affiliations in brackets) and an OpenReview link.
// Only the sections whose heading names a paper award are read; the test-of-time section is not.
const HEADING = /^(?:outstanding|best|distinguished)\b[\w\s,-]*\bawards?$/i;
// One visible line of text per line of the page, entities decoded.
function toLines(html) {
  const text = String(html ?? "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(?:br|p|div|li|h[1-6]|tr|td|th|section|article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return text.split("\n").map((l) => decode(l)).filter(Boolean);
}

export function parseRecipientsPage(html, { venue, year, source }) {
  const lines = toLines(html);
  const entries = [];
  let label = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (HEADING.test(l)) { label = l; continue; }
    if (/^test of time\b/i.test(l)) { label = null; continue; }
    if (!label || !/^https:\/\/openreview\.net\/forum/i.test(l) || i < 2) continue;
    const title = lines[i - 2].replace(/[.\s]+$/, "").trim();
    const authors = lines[i - 1].replace(/\([^)]*\)/g, " ").split(/,|\band\b|&/).map((s) => s.trim()).filter(Boolean);
    const kind = kindOf(label);
    if (!kind || title.length < 8 || !authors.length) continue;
    entries.push({
      venue, year, award: kind, awardLabel: label, title, authors, track: "main",
      source, evidence: `${title} — ${label}`, verified: "official (conference awards page)"
    });
  }
  return { entries };
}

// The "best papers" listings that CVPR and ECCV print on their own pages, in two layouts: a heading per award
// followed by the title and the author list (ECCV: "Best Paper", "Best Paper Honorable Mention"), or
// "Best Paper:" / "Paper Name: …" / "Authors: …" with wrapped author lines (CVPR). A heading is accepted only when
// a title and an author list follow it, so navigation text that happens to match is ignored.
const AWARD_HEADING = /^(Best (?:Student )?Paper(?: Honorable Mention| Runner-?up)?|Outstanding Paper(?: Honorable Mention)?)\s*:?\s*(?:ID:\s*\d+)?\s*:?\s*$/i;
export function parsePaperAwardPage(html, { venue, year, source }) {
  const lines = toLines(html);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const h = AWARD_HEADING.exec(lines[i]);
    if (!h) continue;
    const label = h[1].replace(/\s+/g, " ");
    const kind = kindOf(label);
    if (!kind) continue;
    const j = i + 1;
    const title = (lines[j] || "").replace(/^paper name:\s*/i, "").replace(/[.\s]+$/, "").trim();
    if (!title || title.length < 8 || AWARD_HEADING.test(lines[j]) || /^authors?:/i.test(lines[j])) continue;
    let authorsText = lines[j + 1] || "";
    if (/^authors?:/i.test(authorsText)) authorsText = authorsText.replace(/^authors?:\s*/i, "");
    else if (!/[,⋅·]/.test(authorsText)) continue;                           // no author list follows
    let k = j + 2;
    while (k < lines.length && /,/.test(lines[k]) && !/:/.test(lines[k]) && !AWARD_HEADING.test(lines[k]) && lines[k].length < 400) {
      authorsText += " " + lines[k];                                         // a wrapped author line
      k++;
    }
    const authors = authorsText.split(/,|⋅|·|\band\b/).map((a) => a.trim()).filter(Boolean);
    if (!authors.length) continue;
    entries.push({
      venue, year, award: kind, awardLabel: label, title, authors, track: "main",
      source, evidence: `${title} — ${label}`, verified: "official (conference awards page)"
    });
    i = k - 1;
  }
  return { entries };
}

// A test-of-time award page (…/virtual/<year>/test-of-time/<id>) carries the paper in its abstract block:
//   <p><a href="https://papers.…">PAPER TITLE (Test of Time Award)</a> <em>Author, Author</em></p>
// → { title, authorsText } or null when that block is not there.
export function parseTestOfTimeDetail(html) {
  const block = /class="[^"]*\babstract-text\b[^"]*"[\s\S]*/.exec(String(html ?? ""));
  const m = /<a\b[^>]*href="https?:\/\/[^"]*"[^>]*>([\s\S]*?)<\/a>\s*<em>([\s\S]*?)<\/em>/.exec(block ? block[0] : "");
  if (!m) return null;
  const title = decode(m[1]).replace(/\(\s*test of time award\s*\)\s*$/i, "").trim();
  const authorsText = decode(m[2]);
  return title && authorsText ? { title, authorsText } : null;
}
