#!/usr/bin/env node
// Verification report for data/ccf-2026.json.
//
//   node scripts/ccf/verify-ccf.mjs [--data data/ccf-2026.json] [--source src/background.js] [--out report.md]
//
// Prints a Markdown report (and writes it to --out when given):
//   (a) counts by kind x tier x area against the third-party extraction totals
//   (b) rows with an empty abbreviation
//   (c) rows whose abbreviation / name / URL look suspicious
//   (d) duplicates
//   (e) diff against the hand-transcribed CCF_RAW table in src/background.js
//       (parsed out of the source text; that file is never executed)
//
// Deterministic: no timestamps. Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

// Totals from an independent (third-party) extraction of the same PDF, as given in the task brief.
const TARGET = { conference: 386, journal: 295, total: 681, tiers: { A: 95, B: 245, C: 341 } };

function parseArgs(argv) {
  const o = { data: path.join(REPO, 'data', 'ccf-2026.json'), source: path.join(REPO, 'src', 'background.js'), out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--data') o.data = path.resolve(argv[++i]);
    else if (argv[i] === '--source') o.source = path.resolve(argv[++i]);
    else if (argv[i] === '--out') o.out = path.resolve(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return o;
}

const esc = (s) => String(s).replace(/\|/g, '\\|');
const code = (s) => '`' + String(s).replace(/`/g, "'") + '`';
const kindName = (k) => (k === 'C' ? 'conference' : 'journal');
const ref = (v, areas) => `${v.kind}-${v.tier} ${areas.indexOf(v.area) + 1}.${v.serial} (p${v.page})`;
const label = (v) => (v.abbr ? `${v.abbr} - ${v.name}` : v.name);

/** Lowercase alphanumeric tokens joined by single spaces; '&' reads as 'and'. */
function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------------------

function sectionCounts(venues, areas, meta) {
  const out = ['## (a) Counts by kind x tier x area', ''];
  const cell = (k, t, a) => venues.filter((v) => v.kind === k && v.tier === t && (a === null || v.area === a)).length;
  out.push('| # | Area | C-A | C-B | C-C | Conf | J-A | J-B | J-C | Journ | Total |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [i, a] of [...areas.map((x, i) => [i, x]), [-1, null]]) {
    const row = [];
    let ct = 0;
    let jt = 0;
    for (const t of 'ABC') {
      const n = cell('C', t, a);
      ct += n;
      row.push(n);
    }
    row.push(ct);
    for (const t of 'ABC') {
      const n = cell('J', t, a);
      jt += n;
      row.push(n);
    }
    row.push(jt, ct + jt);
    out.push(`| ${i >= 0 ? i + 1 : ''} | ${a ?? '**Total**'} | ${row.map((n) => (a === null ? `**${n}**` : n)).join(' | ')} |`);
  }
  const tierTotal = (t) => venues.filter((v) => v.tier === t).length;
  const conf = venues.filter((v) => v.kind === 'C').length;
  const jour = venues.filter((v) => v.kind === 'J').length;
  const checks = [
    ['conferences', conf, TARGET.conference],
    ['journals', jour, TARGET.journal],
    ['total', venues.length, TARGET.total],
    ['tier A', tierTotal('A'), TARGET.tiers.A],
    ['tier B', tierTotal('B'), TARGET.tiers.B],
    ['tier C', tierTotal('C'), TARGET.tiers.C],
  ];
  out.push('', 'Against the third-party extraction totals:', '');
  out.push('| | dataset | target | |', '|---|---|---|---|');
  for (const [n, got, want] of checks) out.push(`| ${n} | ${got} | ${want} | ${got === want ? 'match' : '**MISMATCH**'} |`);
  const m = meta.counts;
  const metaOk = m.total === venues.length && m.conference.total === conf && m.journal.total === jour;
  out.push('', `meta.counts agrees with the venue list: ${metaOk ? 'yes' : '**NO**'}.`, '');
  return { text: out.join('\n'), ok: checks.every(([, g, w]) => g === w) && metaOk };
}

function sectionEmptyAbbr(venues, areas) {
  const rows = venues.filter((v) => !v.abbr);
  const out = [`## (b) Rows with an empty abbreviation (${rows.length})`, ''];
  out.push('The abbreviation cell is blank in the PDF table for these rows (the name sits in the full-name column; see build-ccf.mjs for how columns are identified).', '');
  const withFormer = rows.filter((v) => v.former?.abbr);
  for (const k of ['C', 'J']) {
    for (const t of 'ABC') {
      const group = rows.filter((v) => v.kind === k && v.tier === t);
      if (!group.length) continue;
      out.push(`**${kindName(k)} ${t} (${group.length})**`, '');
      for (const v of group) out.push(`- ${ref(v, areas)}: ${v.name}${v.former?.abbr ? ` (former abbr: ${v.former.abbr})` : ''}`);
      out.push('');
    }
  }
  if (withFormer.length) out.push(`Note: ${withFormer.length} of these carries only a "formerly" abbreviation in the PDF (stored in \`former.abbr\`).`, '');
  return out.join('\n');
}

function sectionSuspicious(venues, areas) {
  const out = ['## (c) Suspicious rows', ''];
  const list = (title, items, note) => {
    out.push(`### ${title} (${items.length})`, '');
    if (note) out.push(note, '');
    for (const s of items) out.push(`- ${s}`);
    if (items.length) out.push('');
    else out.push('none', '');
  };

  // non-ASCII
  const nonAscii = venues
    .filter((v) => /[^\x20-\x7e]/.test(v.abbr + v.name))
    .map((v) => `${ref(v, areas)} ${code(label(v))}`);
  list('Non-ASCII characters in abbreviation or name', nonAscii, 'The text layer contains no ligatures, curly quotes or other junk: every non-ASCII character in the whole PDF is CJK / full-width.');
  const cjkPublisher = venues.filter((v) => /[^\x20-\x7e]/.test(v.publisher)).map((v) => `${ref(v, areas)} ${code(v.abbr || v.name)} publisher ${code(v.publisher)}`);
  list('Non-ASCII (Chinese) publishers', cjkPublisher);

  // all-caps lead word
  const ACRONYM_LEADS = new Set(['ACM', 'IEEE', 'IFIP', 'USENIX', 'SIAM', 'AAAI', 'SIGMOD', 'SIGKDD', 'SIGIR', 'ACL', 'CCF', 'IET', 'ISCA', 'SIGOPS', 'SIGPLAN', 'INFORMS', 'EURASIP']);
  const caps = venues
    .filter((v) => {
      const w = v.name.split(/[\s/]+/)[0];
      return /^[A-Z]{6,}$/.test(w) && !ACRONYM_LEADS.has(w);
    })
    .map((v) => `${ref(v, areas)} ${code(v.name)}`);
  list('All-caps lead word in the name (6+ letters, excluding ACM/IEEE/USENIX/INFORMS/EURASIP-style acronyms)', caps, 'This is exactly what the PDF prints for the journal renamed in this edition (EITEE; its former name FITEE / Frontiers of Information Technology & Electronic Engineering, and former publisher Springer, are in `former`). It is not an extraction error.');

  // length outliers
  const lens = venues.map((v) => v.name.length).sort((a, b) => a - b);
  const q = (p) => lens[Math.floor((lens.length - 1) * p)];
  const longNames = venues.filter((v) => v.name.length >= 100).map((v) => `${ref(v, areas)} (${v.name.length} chars) ${code(v.name)}`);
  const shortNames = venues.filter((v) => v.name.length <= 8).map((v) => `${ref(v, areas)} ${code(v.name)}`);
  const longAbbr = venues.filter((v) => v.abbr.length >= 13).map((v) => `${ref(v, areas)} ${code(v.abbr)}`);
  out.push(`### Length outliers`, '', `Name length: min ${lens[0]}, median ${q(0.5)}, p95 ${q(0.95)}, max ${lens[lens.length - 1]}.`, '');
  list('Names of 100+ characters', longNames);
  list('Names of 8 or fewer characters', shortNames);
  list('Abbreviations of 13+ characters', longAbbr);
  const spacedAbbr = venues.filter((v) => /\s/.test(v.abbr)).map((v) => `${ref(v, areas)} ${code(v.abbr)}`);
  list('Abbreviations containing a space', spacedAbbr, 'Genuine multi-word abbreviations in the PDF (e.g. "HOT CHIPS", "IEEE BigData"); a space produced by a mid-word wrap is repaired in the overrides file (JCOMPLEXITY).');
  const hyphenAbbr = venues.filter((v) => /-/.test(v.abbr)).map((v) => `${ref(v, areas)} ${code(v.abbr)}`);
  list('Abbreviations containing a hyphen', hyphenAbbr, 'Check each against the "wrap hyphen" question: CCF-THPC keeps its hyphen; SIGMETRICS and INTERSPEECH were printed with a wrap hyphen and are corrected by overrides.');

  // URLs
  const noUrl = venues.filter((v) => !v.dblp).map((v) => `${ref(v, areas)} ${code(label(v))}`);
  list('Missing URL', noUrl, 'The URL cell is empty in the PDF.');
  const hostOf = (u) => new URL(u).host;
  const nonDblp = venues.filter((v) => v.dblp && !/^dblp(\d)?\.(org|uni-trier\.de)$/.test(hostOf(v.dblp))).map((v) => `${ref(v, areas)} ${code(v.abbr || v.name)} ${v.dblp}`);
  list('URL host is not dblp', nonDblp, 'Printed that way in the PDF.');
  const oddDblp = venues
    .filter((v) => v.dblp && /^dblp(\d)?\.(org|uni-trier\.de)$/.test(hostOf(v.dblp)) && !/^\/db\/(conf|journals)\//.test(new URL(v.dblp).pathname))
    .map((v) => `${ref(v, areas)} ${code(v.abbr || v.name)} ${v.dblp}`);
  list('dblp URL that is not a /db/conf|journals/ page', oddDblp);
  const wrongHost = venues.filter((v) => v.dblp && /dblp2\./.test(hostOf(v.dblp))).map((v) => `${ref(v, areas)} ${code(v.abbr || v.name)} ${v.dblp}`);
  list('dblp2 host (looks like a typo for dblp)', wrongHost);
  const confJournalMismatch = venues
    .filter((v) => v.dblp && /dblp/.test(hostOf(v.dblp)) && ((v.kind === 'C' && /\/db\/journals\//.test(v.dblp)) || (v.kind === 'J' && /\/db\/conf\//.test(v.dblp))))
    .map((v) => `${ref(v, areas)} ${code(v.abbr || v.name)} ${v.dblp}`);
  list('Conference with a /journals/ URL or journal with a /conf/ URL', confJournalMismatch, 'As printed in the PDF.');

  // text anomalies in the name (kept exactly as printed)
  const camel = venues
    .filter((v) => /\b[A-Za-z]*[a-z][A-Z][a-z]+/.test(v.name.replace(/\b(?:GeoInformatica|InterScience|JointCloud|HotStorage|PeerJ|LIPIcs)\b/g, '')))
    .map((v) => `${ref(v, areas)} ${code(v.name)}`);
  list('Lower-to-upper case jump inside a word of the name (possible missing space)', camel, 'Review list. Confirmed source typos (visible in the rendered PDF): MoDELS "EngineeringLanguages", PG "onComputer", PASTE "ACMSIGPLAN-SIGSOFT". Others in this list are legitimate camel-case names.');
  const oddPunct = venues
    .filter((v) => /[\\]|-\s|\s-\s|\s\/|\/\s|,[^\s]/.test(v.name + ' ' + v.publisher))
    .map((v) => `${ref(v, areas)} ${code(v.name)} / publisher ${code(v.publisher)}`);
  list('Odd punctuation or spacing (backslash, hyphen+space, space around a slash, comma without space)', oddPunct, 'Printed that way in the PDF; not repaired.');
  const pubInName = venues
    .filter((v) => {
      if (!v.publisher || !v.name.endsWith(' ' + v.publisher)) return false;
      const before = v.name.slice(0, v.name.length - v.publisher.length - 1).split(' ').pop().toLowerCase();
      return !['the', 'of', 'for', 'and', 'on', 'in'].includes(before); // "Journal of the ACM" is a real name
    })
    .map((v) => `${ref(v, areas)} ${code(v.name)} (publisher ${code(v.publisher)})`);
  list('Name ends with the publisher text', pubInName, 'The PDF prints a stray "Springer" as a second line of the Euro-Par name cell; kept as printed.');
  const glued = venues.filter((v) => /\b(ACM|IEEE|IFIP|USENIX|SIAM)[A-Z]{3,}/.test(v.name)).map((v) => `${ref(v, areas)} ${code(v.name)}`);
  list('Acronym glued to the next word (ACMSIGPLAN-style, possible missing space)', glued, 'Source typo in the PDF (confirmed in the render): PASTE.');
  const lower = venues.filter((v) => /^[a-z]/.test(v.name)).map((v) => `${ref(v, areas)} ${code(v.name)}`);
  list('Name starting with a lower-case letter', lower);

  // extensions
  const former = venues.filter((v) => v.former).map((v) => `${ref(v, areas)} ${code(v.abbr || v.name)} former: ${code(JSON.stringify(v.former))}`);
  list('Rows with a "（原 …）" (formerly …) note, stored in `former` (schema extension)', former);
  const extra = venues.filter((v) => v.dblpExtra).map((v) => `${ref(v, areas)} ${code(v.abbr)}: ${v.dblp} + ${v.dblpExtra.join(' + ')}`);
  list('Rows with more than one URL, extra ones in `dblpExtra` (schema extension)', extra);
  return out.join('\n');
}

function sectionDuplicates(venues, areas) {
  const out = ['## (d) Duplicates', ''];
  const group = (keyFn) => {
    const m = new Map();
    for (const v of venues) {
      const k = keyFn(v);
      if (k === null) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(v);
    }
    return [...m.entries()].filter(([, g]) => g.length > 1);
  };
  const render = (title, groups, note) => {
    out.push(`### ${title} (${groups.length})`, '');
    if (note) out.push(note, '');
    for (const [k, g] of groups) out.push(`- ${code(k)}: ` + g.map((v) => `${ref(v, areas)} ${code(v.name)}`).join(' ; '));
    if (!groups.length) out.push('none');
    out.push('');
  };
  render('Same abbreviation and kind', group((v) => (v.abbr ? `${v.kind}|${v.abbr}` : null)), 'These are distinct entries in the PDF (different names and/or areas), not extraction duplicates; abbreviations are not unique in the catalogue.');
  render('Same abbreviation, different kind', group((v) => (v.abbr ? v.abbr : null)).filter(([, g]) => new Set(g.map((v) => v.kind)).size > 1), 'A conference and a journal share the acronym.');
  const sameName = group((v) => norm(v.name));
  render('Same normalised name (any kind)', sameName, 'Normalisation: lower case, punctuation removed, & = and.');
  const identical = group((v) => `${v.kind}|${v.abbr}|${norm(v.name)}|${v.publisher}|${v.dblp}`);
  render('Fully identical rows (kind, abbr, name, publisher, URL)', identical);
  const sameUrl = group((v) => (v.dblp ? v.dblp.replace(/^https?:\/\/(dblp\.org|dblp2?\.uni-trier\.de)/, 'dblp').replace(/\/index\.html$/, '/').replace(/\/$/, '') : null));
  render('Same dblp URL (after normalising host / index.html / trailing slash)', sameUrl, 'Venues that share a dblp page (e.g. AsiaCCS and CCS both point at conf/ccs/).');
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------
// (e) CCF_RAW diff

/** Extract the [abbr, full, tier, kind] tuples of `const CCF_RAW = [ ... ];` without executing the file. */
function parseCcfRaw(sourceText) {
  const start = sourceText.indexOf('const CCF_RAW = [');
  if (start < 0) throw new Error('const CCF_RAW = [ not found');
  const bodyStart = sourceText.indexOf('[', start);
  const endMatch = /\n\];/.exec(sourceText.slice(bodyStart));
  if (!endMatch) throw new Error('end of CCF_RAW not found');
  const body = sourceText.slice(bodyStart, bodyStart + endMatch.index + 2);
  const str = '"(?:[^"\\\\\\n]|\\\\.)*"';
  const tuple = new RegExp(`\\[\\s*(${str})\\s*,\\s*(${str})\\s*,\\s*(${str})\\s*,\\s*(${str})\\s*\\]`, 'g');
  const rows = [];
  for (const m of body.matchAll(tuple)) rows.push(m.slice(1, 5).map((lit) => JSON.parse(lit)));
  // every row opener "[" followed by a string literal on a line of its own must have parsed
  const openers = body.split('\n').filter((l) => /^\s*\["/.test(l)).length;
  if (openers !== rows.length) throw new Error(`CCF_RAW: ${openers} row openers but ${rows.length} parsed tuples`);
  return rows.map(([abbr, name, tier, kind]) => ({ abbr, name, tier, kind }));
}

function tokens(s) {
  return new Set(norm(s).split(' ').filter(Boolean));
}
function jaccard(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

function diffAgainstRaw(venues, raw) {
  const P = venues.map((v, i) => ({ ...v, i, used: false }));
  const R = raw.map((r, i) => ({ ...r, i, used: false }));
  const pairs = [];
  const pair = (p, r, how) => {
    p.used = true;
    r.used = true;
    pairs.push({ p, r, how });
  };
  const pass = (how, keyP, keyR, accept = () => true) => {
    const byKey = new Map();
    for (const r of R) {
      if (r.used) continue;
      const k = keyR(r);
      if (k === null) continue;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }
    for (const p of P) {
      if (p.used) continue;
      const k = keyP(p);
      if (k === null) continue;
      const cands = (byKey.get(k) ?? []).filter((r) => !r.used && accept(p, r));
      if (!cands.length) continue;
      // several candidates: prefer the same tier, then the first in source order
      const best = cands.find((r) => r.tier === p.tier) ?? cands[0];
      pair(p, best, how);
    }
  };
  pass('same kind, tier and name', (p) => `${p.kind}|${p.tier}|${norm(p.name)}`, (r) => `${r.kind}|${r.tier}|${norm(r.name)}`);
  pass('same kind and name', (p) => `${p.kind}|${norm(p.name)}`, (r) => `${r.kind}|${norm(r.name)}`);
  pass('same name, other kind', (p) => norm(p.name), (r) => norm(r.name));
  // abbreviation passes: only when the abbreviation is unique among the still-unmatched rows of both sides
  const uniqueAbbr = (side, v) => side.filter((x) => !x.used && x.kind === v.kind && x.abbr && norm(x.abbr) === norm(v.abbr)).length === 1;
  pass('same kind and abbreviation', (p) => (p.abbr && uniqueAbbr(P, p) ? `${p.kind}|${norm(p.abbr)}` : null), (r) => (r.abbr && uniqueAbbr(R, r) ? `${r.kind}|${norm(r.abbr)}` : null));
  pass('same abbreviation, other kind', (p) => (p.abbr ? norm(p.abbr) : null), (r) => (r.abbr ? norm(r.abbr) : null), (p, r) => jaccard(p.name, r.name) >= 0.5);
  // fuzzy names within a kind
  for (const p of P) {
    if (p.used) continue;
    let best = null;
    let bestScore = 0;
    for (const r of R) {
      if (r.used || r.kind !== p.kind) continue;
      const s = jaccard(p.name, r.name);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }
    if (best && bestScore >= 0.6) pair(p, best, `similar name (${bestScore.toFixed(2)})`);
  }
  return { pairs, onlyPdf: P.filter((p) => !p.used), onlyRaw: R.filter((r) => !r.used) };
}

function sectionDiff(venues, areas, raw, sourcePath) {
  const out = ['## (e) Diff against the hand transcription (`CCF_RAW` in src/background.js)', ''];
  const { pairs, onlyPdf, onlyRaw } = diffAgainstRaw(venues, raw);
  const rawDup = new Map();
  for (const r of raw) {
    const k = `${r.kind}|${norm(r.abbr)}|${norm(r.name)}`;
    rawDup.set(k, (rawDup.get(k) ?? 0) + 1);
  }
  const dupRaw = [...rawDup.entries()].filter(([, n]) => n > 1);

  const same = pairs.filter(({ p, r }) => p.kind === r.kind && p.tier === r.tier && norm(p.name) === norm(r.name) && norm(p.abbr) === norm(r.abbr));
  const cosmetic = same.filter(({ p, r }) => p.name !== r.name || p.abbr !== r.abbr);
  const rest = pairs.filter((x) => !same.includes(x));
  const kindDiff = rest.filter(({ p, r }) => p.kind !== r.kind);
  const tierDiff = rest.filter(({ p, r }) => p.kind === r.kind && p.tier !== r.tier);
  const nameDiff = rest.filter(({ p, r }) => p.kind === r.kind && norm(p.name) !== norm(r.name));
  const abbrOnly = rest.filter(({ p, r }) => p.kind === r.kind && p.tier === r.tier && norm(p.name) === norm(r.name) && norm(p.abbr) !== norm(r.abbr));

  out.push(`Source: ${code(path.relative(REPO, sourcePath) || sourcePath)}, parsed as text (${raw.length} tuples; row-opener count verified). Dataset: ${venues.length} rows.`, '');
  out.push('| | rows |', '|---|---|');
  out.push(`| CCF_RAW rows | ${raw.length} |`, `| dataset rows | ${venues.length} |`);
  out.push(`| paired and identical (kind, tier, abbr, name; case / punctuation ignored) | ${same.length} |`);
  out.push(`| ... of which byte-for-byte identical | ${same.length - cosmetic.length} |`);
  out.push(`| ... of which differ only in case / punctuation / spacing | ${cosmetic.length} |`);
  out.push(`| paired, kind differs | ${kindDiff.length} |`);
  out.push(`| paired, tier differs | ${tierDiff.length} |`);
  out.push(`| paired, name differs | ${nameDiff.length} |`);
  out.push(`| paired, only abbreviation differs | ${abbrOnly.length} |`);
  out.push(`| only in the dataset (PDF) | ${onlyPdf.length} |`);
  out.push(`| only in CCF_RAW | ${onlyRaw.length} |`);
  out.push(`| duplicate rows inside CCF_RAW (same kind, abbr, name) | ${dupRaw.length} |`, '');
  out.push('Pairing is layered: same kind+tier+name, then kind+name, then name in any kind, then unique abbreviation, then similar name (Jaccard >= 0.6). The pairing step is shown in brackets for non-trivial pairs.', '');

  const fmtRaw = (r) => `${code(`[${JSON.stringify(r.abbr)}, ${JSON.stringify(r.name)}, ${r.tier}, ${r.kind}]`)}`;
  const fmtPdf = (p) => `${code(`${p.abbr || '(no abbr)'} | ${p.name} | ${p.tier} | ${p.kind}`)} ${ref(p, areas)}`;

  out.push(`### Kind differs (${kindDiff.length})`, '');
  for (const { p, r, how } of kindDiff) out.push(`- CCF_RAW ${fmtRaw(r)} vs PDF ${fmtPdf(p)} [${how}]`);
  if (!kindDiff.length) out.push('none');
  out.push('', `### Tier differs (${tierDiff.length})`, '');
  const order = { A: 0, B: 1, C: 2 };
  const direction = (x) => (order[x.p.tier] < order[x.r.tier] ? 'promoted in PDF' : 'demoted in PDF');
  for (const x of tierDiff) out.push(`- ${x.r.abbr || x.r.name} (${x.p.kind}): CCF_RAW ${x.r.tier} -> PDF ${x.p.tier} (${direction(x)}) ${ref(x.p, areas)}`);
  if (!tierDiff.length) out.push('none');
  out.push('', `### Name differs (${nameDiff.length})`, '');
  for (const { p, r, how } of nameDiff) {
    out.push(`- ${p.abbr || '(no abbr)'} ${ref(p, areas)} [${how}]`, `  - CCF_RAW: ${code(r.name)}${r.tier !== p.tier ? ` (tier ${r.tier}, PDF ${p.tier})` : ''}`, `  - PDF: ${code(p.name)}${p.former?.name ? ` (formerly ${code(p.former.name)})` : ''}`);
  }
  if (!nameDiff.length) out.push('none');
  out.push('', `### Differ only in case / punctuation / spacing (${cosmetic.length})`, '');
  for (const { p, r } of cosmetic) {
    if (p.name !== r.name) out.push(`- ${p.abbr || '(no abbr)'} ${ref(p, areas)}: CCF_RAW ${code(r.name)} vs PDF ${code(p.name)}`);
    if (p.abbr !== r.abbr) out.push(`- ${ref(p, areas)}: abbreviation CCF_RAW ${code(r.abbr)} vs PDF ${code(p.abbr)}`);
  }
  if (!cosmetic.length) out.push('none');
  out.push('', `### Only the abbreviation differs (${abbrOnly.length})`, '');
  for (const { p, r } of abbrOnly) out.push(`- ${code(p.name)}: CCF_RAW ${code(r.abbr || '(none)')} vs PDF ${code(p.abbr || '(none)')} ${ref(p, areas)}${p.former?.abbr ? ` (formerly ${p.former.abbr})` : ''}`);
  if (!abbrOnly.length) out.push('none');
  out.push('', `### Only in the PDF dataset (${onlyPdf.length})`, '');
  for (const p of onlyPdf) out.push(`- ${fmtPdf(p)}`);
  if (!onlyPdf.length) out.push('none');
  out.push('', `### Only in CCF_RAW (${onlyRaw.length})`, '');
  for (const r of onlyRaw) out.push(`- ${fmtRaw(r)}`);
  if (!onlyRaw.length) out.push('none');
  out.push('', `### Duplicate rows inside CCF_RAW (${dupRaw.length})`, '');
  for (const [k, n] of dupRaw) out.push(`- ${code(k)} x${n}`);
  if (!dupRaw.length) out.push('none');
  out.push('');
  return { text: out.join('\n'), summary: { same: same.length, kindDiff: kindDiff.length, tierDiff: tierDiff.length, nameDiff: nameDiff.length, abbrOnly: abbrOnly.length, onlyPdf: onlyPdf.length, onlyRaw: onlyRaw.length, dupRaw: dupRaw.length, rawRows: raw.length } };
}

// ---------------------------------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const data = JSON.parse(fs.readFileSync(opts.data, 'utf8'));
  const venues = data.venues;
  const areas = [...new Set(venues.slice().sort((a, b) => a.page - b.page).map((v) => v.area))];

  const parts = [`# CCF 2026 dataset verification`, ''];
  parts.push(`Dataset: ${code(path.relative(REPO, opts.data) || opts.data)} (${venues.length} venues, PDF sha256 ${code(data.meta.pdfSha256)}).`, '');
  const a = sectionCounts(venues, areas, data.meta);
  parts.push(a.text);
  parts.push(sectionEmptyAbbr(venues, areas));
  parts.push(sectionSuspicious(venues, areas));
  parts.push(sectionDuplicates(venues, areas));
  let e = null;
  if (fs.existsSync(opts.source)) {
    e = sectionDiff(venues, areas, parseCcfRaw(fs.readFileSync(opts.source, 'utf8')), opts.source);
    parts.push(e.text);
  } else {
    parts.push('## (e) Diff against CCF_RAW', '', `${opts.source} not found; skipped.`, '');
  }
  const text = parts.join('\n') + '\n';
  if (opts.out) fs.writeFileSync(opts.out, text);
  process.stdout.write(text);
  if (!a.ok) process.exitCode = 2;
}

main();
