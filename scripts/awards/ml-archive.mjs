#!/usr/bin/env node
// The awards pages of NeurIPS (then NIPS) 2014–2018 and ICML 2017–2018 — years before the conferences' virtual sites list awards
// (scripts/awards/virtual-site.mjs starts at 2019) — read into raw award entries for scripts/awards/merge-raw.mjs:
//
//   https://nips.cc/Conferences/<year>/Awards   (2014–2018)      https://icml.cc/Conferences/<year>/Awards   (2017, 2018)
//
//   node scripts/awards/ml-archive.mjs <neurips|icml> <year> [saved-page.html] > raw.json      (fetches the page when no file is given)
//   node scripts/awards/merge-raw.mjs raw.json [--write]
//
// Each page has its own small markup (they were typed by hand): NIPS 2014 a link per paper with its authors in indented blocks,
// 2015 a heading link and an <em> author line, 2016 "Best paper award: Authors: Title" paragraphs, 2017 lists with
// "Authors. Title.", 2018 <em>Title</em><br>By: Authors; ICML 2017–2018 <strong>Title</strong><br><em>Authors</em> under
// headings. Demonstration, reviewer and workshop awards are not read.
import { readFileSync } from "node:fs";
import { text } from "./html.mjs";

// names in "A · B, C and D (Aff)" — affiliations in parentheses dropped
function names(s) {
  let r = s.replace(/^\s*By:\s*/i, ""), prev;
  do { prev = r; r = r.replace(/\([^()]*\)/g, " "); } while (r !== prev);
  return r.split(/\s*[;,·]\s*(?:and\s+)?|\s+and\s+/).map((n) => n.replace(/\s+/g, " ").replace(/^[\s,.]+|[\s,.]+$/g, "")).filter((n) => /\p{L}{2}/u.test(n));
}

// the page's content block (between the site's navigation and footer)
const content = (html) => { const at = html.indexOf("<!--JUst above the HTML in document-snippet.html-->"); const end = html.indexOf("<!--END BLOCK CONTENT-->"); return html.slice(at < 0 ? 0 : at, end < 0 ? html.length : end); };

const mk = (venue, year, award, label, title, authors, source, evidence, paperYear) =>
  ({ venue, year, award, awardLabel: label, title: title.replace(/\s+/g, " ").replace(/[.\s»]+$/, "").trim(), authors, track: "main", source, evidence, ...(paperYear ? { paperYear } : {}) });

// ---- NIPS 2014: <h3>Outstanding Paper Award</h3> then  <a class="btn …">Title »</a><br><div class="relIndent">Author (Aff)<br> Author (Aff)</div> …
function nips2014(html, source) {
  const out = [];
  const body = content(html);
  const start = body.search(/<h3>\s*Outstanding Paper Award/i);
  const stop = body.search(/<h3>\s*Outstanding Reviewer/i);
  const sec = body.slice(start < 0 ? 0 : start, stop < 0 ? body.length : stop);
  const parts = sec.split(/(<a\b[^>]*class="btn[^"]*"[^>]*>[\s\S]*?<\/a>)/i);
  for (let i = 1; i < parts.length; i += 2) {
    const title = text(parts[i]);
    const authorText = text((parts[i + 1] || "").replace(/<\/div>|<br\s*\/?>/gi, ", "));
    const authors = names(authorText);
    if (authors.length) out.push(mk("NeurIPS", 2014, "outstanding", "Outstanding Paper Award", title, authors, source, `Outstanding Paper Award: ${title} — ${authorText}`));
  }
  return out;
}

// ---- NIPS 2015: <h3>Best papers</h3> <h4><a>Title »</a></h4><em>A · B</em> …
function nips2015(html, source) {
  const out = [];
  const body = content(html);
  const start = body.search(/<h3>\s*Best papers/i);
  const stop = body.search(/<h3>\s*Best reviewers/i);
  const sec = body.slice(start < 0 ? 0 : start, stop < 0 ? body.length : stop);
  for (const [, h4, em] of sec.matchAll(/<h4>([\s\S]*?)<\/h4>\s*<em>([\s\S]*?)<\/em>/gi)) {
    const title = text(h4), authors = names(text(em));
    if (authors.length) out.push(mk("NeurIPS", 2015, "best", "Best Paper", title, authors, source, `Best papers: ${title} — ${text(em)}`));
  }
  return out;
}

// ---- NIPS 2016: <p><strong>Best paper award:</strong> A, B, C: <a><em><strong>Title</strong></em></a><br> … <strong>Best student paper award:</strong> … </p>
function nips2016(html, source) {
  const out = [];
  // a label is a <strong>; its paper runs to the next <br> or label (the title is itself a link in <strong>, so only a label ending in a colon counts)
  for (const m of content(html).matchAll(/<strong>\s*(Best (?:student )?paper award):?\s*<\/strong>([\s\S]*?)(?=<br|<\/p>|<strong>\s*Best\b)/gi)) {
    const student = /student/i.test(m[1]);
    const line = text(m[2]);
    const cut = line.indexOf(": ");
    if (cut < 0) continue;
    const authors = names(line.slice(0, cut)), title = line.slice(cut + 2);
    if (authors.length && title.length > 8) out.push(mk("NeurIPS", 2016, student ? "student" : "best", student ? "Best Student Paper" : "Best Paper", title, authors, source, `${m[1]}: ${line}`));
  }
  return out;
}

// ---- NIPS 2017: <h4>Best paper awards:</h4><ul><li>A, B. <a><em>Title</em></a>.</li> … <h4>Test of time award:</h4><ul><li>A, B. Title. NIPS 2007.</li>
function nips2017(html, source) {
  const out = [];
  const body = content(html);
  for (const [, head, list] of body.matchAll(/<h4>([\s\S]*?)<\/h4>\s*<ul>([\s\S]*?)<\/ul>/gi)) {
    const h = text(head);
    const kind = /best paper/i.test(h) ? { award: "best", label: "Best Paper" } : /test of time/i.test(h) ? { award: "tot", label: "Test of Time Award" } : null;
    if (!kind) continue;
    for (const [, li] of list.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
      const line = text(li);
      const m = /^(.+?)\.\s+(.+?)\.?(?:\s+NIPS\s+((?:19|20)\d{2})\.?)?$/.exec(line);
      if (!m) continue;
      const authors = names(m[1]);
      if (authors.length) out.push(mk("NeurIPS", 2017, kind.award, kind.label, m[2], authors, source, `${h}: ${line}`, m[3] ? parseInt(m[3], 10) : null));
    }
  }
  return out;
}

// ---- NIPS 2018: <h3>Best Papers</h3><p><em>Title</em><br>By: A · B · C<br><br><em>Title</em><br>By: … </p>
function nips2018(html, source) {
  const out = [];
  const body = content(html);
  const start = body.search(/<h3[^>]*>\s*Best Papers/i);
  const after = body.slice(start < 0 ? 0 : start + 10);
  const stop = after.search(/<h3[^>]*>/i);                      // the next heading (Best Demonstration)
  const sec = after.slice(0, stop < 0 ? after.length : stop);
  for (const [, title, by] of sec.matchAll(/<em>([\s\S]*?)<\/em>\s*<br\s*\/?>\s*By:\s*([\s\S]*?)(?=<br|<\/p>)/gi)) {
    const authors = names(text(by));
    if (authors.length) out.push(mk("NeurIPS", 2018, "best", "Best Paper", text(title), authors, source, `Best Papers: ${text(title)} — By: ${text(by)}`));
  }
  return out;
}

// ---- ICML 2017–2018: <h4>Best Paper Award</h4><p><strong>Title</strong><br><em>Authors</em></p> …; "Honorable Mentions" belong to the section before it
function icml(year) {
  return (html, source) => {
    const out = [];
    let prev = null, kind = null;
    for (const [, tag, inner] of content(html).matchAll(/<(h4|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      if (tag.toLowerCase() === "h4") {
        const h = text(inner);
        if (/test of time/i.test(h)) kind = prev = { award: "tot", label: "Test of Time Award" };
        else if (/runner[- ]?up/i.test(h)) kind = prev = { award: "runner-up", label: "Best Paper Runner-up" };
        else if (/honou?rable/i.test(h)) kind = prev && prev.award === "tot" ? { award: "runner-up", label: "Test of Time Honorable Mention" } : { award: "runner-up", label: "Best Paper Honorable Mention" };
        else if (/best paper/i.test(h)) kind = prev = { award: "best", label: "Best Paper" };
        else kind = null;
        continue;
      }
      if (!kind) continue;
      const strong = /<strong>([\s\S]*?)<\/strong>/i.exec(inner), em = /<em>([\s\S]*?)<\/em>/i.exec(inner);
      if (!strong || !em) continue;
      const title = text(strong[1]), authors = names(text(em[1]));
      const from = /\(from ICML\s+((?:19|20)\d{2})\)/i.exec(text(inner));
      if (authors.length && title.length > 8) out.push(mk("ICML", year, kind.award, kind.label, title, authors, source, `${kind.label}: ${title} — ${text(em[1])}`, from ? parseInt(from[1], 10) : null));
    }
    return out;
  };
}

const PARSERS = { neurips: { 2014: nips2014, 2015: nips2015, 2016: nips2016, 2017: nips2017, 2018: nips2018 }, icml: { 2017: icml(2017), 2018: icml(2018) } };
export const parsers = PARSERS;
export const urlOf = (conf, year) => `https://${conf === "neurips" ? "nips" : "icml"}.cc/Conferences/${year}/Awards`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [conf, yearText, file] = process.argv.slice(2);
  const year = parseInt(yearText, 10);
  const parse = PARSERS[conf] && PARSERS[conf][year];
  if (!parse) { console.error("usage: ml-archive.mjs neurips <2014–2018> | icml <2017|2018> [saved-page.html]"); process.exit(2); }
  const url = urlOf(conf, year);
  const html = file ? readFileSync(file, "utf8") : await (await fetch(url, { headers: { "user-agent": "scholar-author-roles-and-venue-ranks award reader (reads one public page)" } })).text();
  const entries = parse(html, url);
  const by = {};
  for (const e of entries) by[e.awardLabel] = (by[e.awardLabel] || 0) + 1;
  console.error(`${conf} ${year}: ${entries.length} entries`, JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
