#!/usr/bin/env node
// Build data/ccf-2026.json (the CCF recommended-venue catalogue, 7th edition, 2026)
// from the glyph dump produced by scripts/ccf/extract-pdf.swift.
//
//   node scripts/ccf/build-ccf.mjs <chars.json> [--overrides <file>] [--out <file>] [--trace <file>]
//
//   <chars.json>   output of `swift scripts/ccf/extract-pdf.swift <ccf.pdf> <chars.json>`
//   --overrides    default data/ccf-2026.overrides.json (only fixes parsing cannot get right)
//   --out          default data/ccf-2026.json
//   --trace        optional: write the raw per-row cell lines (debugging / auditing)
//
// Deterministic: no timestamps, no randomness, fixed ordering. Node built-ins only.
//
// How rows are rebuilt (the PDF's own text order is useless: PDFKit emits table cells
// in a different order on every page, so everything is done from glyph geometry):
//   1. Each page is split into a heading zone (title / area / tier / column-header row)
//      and a body. Continuation pages have no heading and inherit the previous table.
//   2. Table columns are found as horizontal gutters in the body glyphs and mapped
//      one-to-one onto the header cells (序号 | 简称 | 全称 | 出版社 | 网址). Column positions
//      drift between pages of one table, so every page is clustered on its own.
//   3. Inside each column, glyphs are grouped into text lines. (Lines are formed per
//      column on purpose: single-line cells are vertically centred and would otherwise
//      bridge the lines of a wrapped neighbour cell.)
//   4. Rows are anchored on the serial-number (序号) cells. Every other line goes to the
//      row whose serial is vertically nearest (cells are vertically centred in a row).
//   5. Cell text is joined (line-wrap hyphens / slashes repaired, URLs de-spaced),
//      "（原 …）" (formerly …) notes are split off, and structural invariants are asserted.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

const META = {
  title: '中国计算机学会推荐国际学术会议和期刊目录（2026年）',
  edition: '2026 (7th edition, 第七版)',
  indexPage: 'https://www.ccf.org.cn/Academic_Evaluation/By_category/',
  pdfUrl:
    'https://www.ccf.org.cn/ccf/contentcore/resource/download?ID=112CF3BF7E1140ACEB271ADAED12A67ADFABB8FF099E40C2759502A85C8A281F',
  extractedWith: 'Swift PDFKit char bounds + build-ccf.mjs',
};

// Tunables (PDF points).
const GUTTER_MIN = 7; // horizontal gap that separates two table columns
const LINE_GAP = 5; // glyph-centre gap that starts a new text line within a column
const MAX_BAND = 12.5; // max ink height of one text line; more means two lines were merged
const SPACE_GAP = 1.0; // gap between advance boxes read as a word space
const CELL_CENTRE_TOL = 4; // cells are vertically centred: |cell centre - serial centre| limit
const EXPECTED_TABLES = 60; // 10 areas x {journal, conference} x {A, B, C}

const KIND_BY_TITLE = [
  ['推荐国际学术期刊', 'J'],
  ['推荐国际学术会议', 'C'],
];
const KIND_BY_HEADER = { 期刊简称: 'J', 会议简称: 'C' };
const TIER_NUMERAL = { 一: 'A', 二: 'B', 三: 'C' };
const COLS = ['serial', 'abbr', 'name', 'publisher', 'url'];

// Geometry margins actually observed (printed in the summary so the assertion limits can be judged).
const stats = { maxBand: 0, maxCentreDev: 0, lines: 0 };

// ---------------------------------------------------------------------------------

function fail(message) {
  throw new Error(message);
}
function assert(cond, message) {
  if (!cond) fail(message);
}

const isWs = (c) => /^[\s 　]$/.test(c);
const isCJK = (c) => !!c && /[⺀-鿿　-〿＀-￯]/.test(c);

function parseArgs(argv) {
  const opts = {
    input: null,
    overrides: path.join(REPO, 'data', 'ccf-2026.overrides.json'),
    out: path.join(REPO, 'data', 'ccf-2026.json'),
    trace: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--overrides') opts.overrides = path.resolve(argv[++i]);
    else if (a === '--out') opts.out = path.resolve(argv[++i]);
    else if (a === '--trace') opts.trace = path.resolve(argv[++i]);
    else if (a.startsWith('--')) fail(`unknown option ${a}`);
    else if (!opts.input) opts.input = path.resolve(a);
    else fail(`unexpected argument ${a}`);
  }
  if (!opts.input) {
    fail('usage: node build-ccf.mjs <chars.json> [--overrides <file>] [--out <file>] [--trace <file>]');
  }
  return opts;
}

// ---------------------------------------------------------------------------------
// Geometry helpers

/** Non-whitespace glyphs of a page with their advance-box x range and ink y range. */
function pageGlyphs(pg, warnings) {
  const glyphs = [];
  pg.chars.forEach((ch, idx) => {
    if (ch.n || isWs(ch.c)) return;
    if (!(ch.w > 0)) {
      warnings.push(`page ${pg.page}: zero-width glyph ${JSON.stringify(ch.c)} ignored`);
      return;
    }
    glyphs.push({
      c: ch.c,
      x0: ch.x,
      x1: ch.x + ch.w,
      yb: ch.y,
      yt: ch.y + ch.h,
      yc: ch.y + ch.h / 2,
      idx,
    });
  });
  return glyphs;
}

/** Group items into runs whose consecutive sort keys differ by <= gap (descending order). */
function clusterDesc(items, key, gap) {
  const sorted = items.slice().sort((a, b) => key(b) - key(a) || a.x0 - b.x0);
  const clusters = [];
  for (const it of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && key(last[last.length - 1]) - key(it) <= gap) last.push(it);
    else clusters.push([it]);
  }
  return clusters;
}

/**
 * Text of a set of glyphs that lie on one visual line, left to right. A space is
 * inserted where the advance boxes leave a gap. The text layer's own whitespace is
 * used as a cross-check and any disagreement is reported.
 */
function lineText(pg, glyphs, warnings) {
  const gs = glyphs.slice().sort((a, b) => a.x0 - b.x0);
  let out = '';
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i];
    if (i > 0) {
      const a = gs[i - 1];
      const gapSpace = g.x0 - a.x1 > SPACE_GAP;
      let textSpace = null;
      if (g.idx === a.idx + 1) textSpace = false;
      else if (g.idx === a.idx + 2 && !pg.chars[a.idx + 1].n && isWs(pg.chars[a.idx + 1].c)) textSpace = true;
      if (textSpace !== null && textSpace !== gapSpace) {
        warnings.push(
          `page ${pg.page}: space disagreement near ${JSON.stringify(out.slice(-12) + '|' + g.c)} (geometry ${gapSpace}, text ${textSpace})`,
        );
      }
      if (gapSpace) out += ' ';
    }
    out += g.c;
  }
  return out;
}

function makeLine(pg, glyphs, warnings) {
  const yBot = Math.min(...glyphs.map((g) => g.yb));
  const yTop = Math.max(...glyphs.map((g) => g.yt));
  const band = yTop - yBot;
  stats.maxBand = Math.max(stats.maxBand, band);
  stats.lines++;
  assert(
    band <= MAX_BAND,
    `page ${pg.page}: text line ink band ${band.toFixed(1)}pt > ${MAX_BAND} (merged lines?) near ${JSON.stringify(lineText(pg, glyphs, []).slice(0, 40))}`,
  );
  return {
    yc: (yBot + yTop) / 2,
    x0: Math.min(...glyphs.map((g) => g.x0)),
    x1: Math.max(...glyphs.map((g) => g.x1)),
    text: lineText(pg, glyphs, warnings).replace(/\s+/g, ' ').trim(),
    glyphs,
  };
}

// ---------------------------------------------------------------------------------
// Page structure

/** Locate the column-header row (序号 …) and split the page into heading zone and body. */
function splitPage(pg, glyphs, warnings) {
  const hdrIdx = [];
  for (let k = 0; k + 1 < glyphs.length; k++) {
    if (glyphs[k].c === '序' && glyphs[k + 1].c === '号' && glyphs[k + 1].idx === glyphs[k].idx + 1) hdrIdx.push(k);
  }
  assert(hdrIdx.length <= 1, `page ${pg.page}: more than one table header row`);
  if (hdrIdx.length === 0) return { header: null, headingBands: [], body: glyphs };

  const headerYc = glyphs[hdrIdx[0]].yc;
  const headerGlyphs = glyphs.filter((g) => Math.abs(g.yc - headerYc) <= 6);
  const above = glyphs.filter((g) => g.yc > headerYc + 6);
  const body = glyphs.filter((g) => g.yc < headerYc - 6);

  // header cells: groups of glyphs separated by wide horizontal gaps
  const sorted = headerGlyphs.slice().sort((a, b) => a.x0 - b.x0);
  const cells = [];
  for (const g of sorted) {
    const last = cells[cells.length - 1];
    if (last && g.x0 - last.x1 < 8) {
      last.glyphs.push(g);
      last.x1 = Math.max(last.x1, g.x1);
    } else cells.push({ glyphs: [g], x0: g.x0, x1: g.x1 });
  }
  const header = cells.map((c) => ({
    text: c.glyphs.map((g) => g.c).join(''),
    cx: (c.x0 + c.x1) / 2,
  }));

  const headingBands = clusterDesc(above, (g) => g.yc, LINE_GAP).map((gs) => {
    const bandGlyphs = gs.slice().sort((a, b) => a.x0 - b.x0);
    return {
      glyphs: bandGlyphs,
      text: lineText(pg, bandGlyphs, warnings).replace(/\s+/g, ''),
      yc: bandGlyphs.reduce((s, g) => s + g.yc, 0) / bandGlyphs.length,
    };
  });
  return { header, headingBands, body };
}

function parseHeading(pg, bands, warnings) {
  const info = { kind: null, area: null, tier: null };
  for (const b of bands) {
    let m;
    const kindHit = KIND_BY_TITLE.find(([needle]) => b.text.includes(needle));
    if (kindHit) {
      assert(info.kind === null, `page ${pg.page}: two title bands`);
      info.kind = kindHit[1];
    } else if ((m = /^[（(](.+)[）)]$/.exec(b.text))) {
      assert(info.area === null, `page ${pg.page}: two area bands`);
      info.area = m[1];
    } else if ((m = /^([一二三])、([ABC])类$/.exec(b.text))) {
      assert(info.tier === null, `page ${pg.page}: two tier bands`);
      assert(TIER_NUMERAL[m[1]] === m[2], `page ${pg.page}: inconsistent tier heading ${b.text}`);
      info.tier = m[2];
    } else {
      warnings.push(
        `page ${pg.page}: unrecognised heading-zone text ${JSON.stringify(b.text.slice(0, 60))} (y=${b.yc.toFixed(0)}, ${b.glyphs.length} glyphs) ignored`,
      );
    }
  }
  return info;
}

/** Horizontal gutters in the body -> column clusters. */
function columnClusters(body) {
  const iv = body.map((g) => [g.x0, g.x1]).sort((a, b) => a[0] - b[0]);
  const clusters = [];
  for (const [a, b] of iv) {
    const last = clusters[clusters.length - 1];
    if (last && a - last.x1 < GUTTER_MIN) last.x1 = Math.max(last.x1, b);
    else clusters.push({ x0: a, x1: b });
  }
  return clusters;
}

/**
 * Map the body's x clusters onto the five table columns. Every page of this PDF yields exactly
 * five gutter-separated clusters (smallest gutter ~11pt vs ~3pt word spaces), so they map in order.
 * First pages of a table additionally prove it: each header cell (序号 | 简称 | 全称 | 出版社 | 网址)
 * must sit over its cluster. Continuation pages have no header, so their cell contents are checked
 * instead (digits-only serial column; URL column; see validate()).
 */
function mapColumns(pg, clusters, header) {
  const describe = clusters.map((c) => `${c.x0.toFixed(0)}-${c.x1.toFixed(0)}`).join(' | ');
  assert(clusters.length === 5, `page ${pg.page}: expected 5 table columns, found ${clusters.length}: ${describe}`);
  if (header) {
    assert(header.length === 5, `page ${pg.page}: expected 5 header cells, found ${header.length}`);
    header.forEach((h, i) => {
      assert(
        h.cx >= clusters[i].x0 - 1 && h.cx <= clusters[i].x1 + 1,
        `page ${pg.page}: header cell ${JSON.stringify(h.text)} (x=${h.cx.toFixed(0)}) is not over column ${i} (${clusters[i].x0.toFixed(0)}-${clusters[i].x1.toFixed(0)})`,
      );
    });
  }
  return clusters.map((_, i) => i);
}

function clusterIndex(pg, g, clusters) {
  const cx = (g.x0 + g.x1) / 2;
  const i = clusters.findIndex((c) => cx >= c.x0 && cx <= c.x1);
  assert(i >= 0, `page ${pg.page}: glyph ${JSON.stringify(g.c)} is outside every column cluster`);
  return i;
}

/**
 * Assign the text lines of one column to the table rows.
 *
 * Cells are vertically centred in their row, so a cell's lines are centred on the row's
 * serial number. Nearest-serial assignment is NOT enough: the outer lines of a tall cell
 * (4 lines = +-19pt) can be nearer to the neighbouring row's serial than to their own.
 * Instead the column's lines (top to bottom) are partitioned into consecutive groups, one
 * per row, minimising the squared distance between each group's centroid and its row's
 * serial centre (dynamic programming; an empty cell has a small fixed cost).
 *
 * @param lines   lines of one column, sorted top to bottom (descending yc)
 * @param centres serial-number centres, sorted top to bottom
 * @returns array (one entry per row) of arrays of lines, and the squared-deviation cost
 */
function assignLines(lines, centres, label) {
  const m = lines.length;
  const n = centres.length;
  const EMPTY_COST = 9; // an empty cell costs as much as a 3pt centroid deviation
  const MAX_CELL_LINES = 6;
  const pre = [0];
  for (const l of lines) pre.push(pre[pre.length - 1] + l.yc);
  const f = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const from = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(-1));
  f[0][0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = 0; i <= m; i++) {
      for (let k = Math.max(0, i - MAX_CELL_LINES); k <= i; k++) {
        if (f[j - 1][k] === Infinity) continue;
        const cost = k === i ? EMPTY_COST : ((pre[i] - pre[k]) / (i - k) - centres[j - 1]) ** 2;
        const v = f[j - 1][k] + cost;
        if (v < f[j][i]) {
          f[j][i] = v;
          from[j][i] = k;
        }
      }
    }
  }
  assert(f[n][m] < Infinity, `${label}: cannot assign ${m} lines to ${n} rows`);
  const groups = new Array(n);
  let i = m;
  for (let j = n; j >= 1; j--) {
    const k = from[j][i];
    groups[j - 1] = lines.slice(k, i);
    i = k;
  }
  return groups;
}

// ---------------------------------------------------------------------------------
// Cell text assembly

/** Join the wrapped lines of one cell. */
function joinLines(parts, col) {
  let out = parts[0] ?? '';
  for (let i = 1; i < parts.length; i++) {
    const next = parts[i];
    if (col === 'url') {
      out += next; // URLs never contain spaces; wrapped lines are simply concatenated
      continue;
    }
    // the line broke after a hyphen / slash / plus, or just before a slash ("IEEE/ACM" + "/IFIP")
    const breakInsideToken = /[-/+]$/.test(out) || next.startsWith('/');
    const cjkBoth = isCJK(out.slice(-1)) && isCJK(next[0]); // CJK text wraps without a space
    out += breakInsideToken || cjkBoth ? next : ' ' + next;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Split "primary（原 former）" into its two parts (the note is "formerly …"). */
function splitNote(text) {
  const m = /[（(]\s*原/.exec(text);
  if (!m) return { primary: text, former: null };
  const primary = text.slice(0, m.index).trim();
  let depth = 0;
  let end = -1;
  for (let i = m.index; i < text.length; i++) {
    if (text[i] === '（' || text[i] === '(') depth++;
    else if (text[i] === '）' || text[i] === ')') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert(end >= 0, `unterminated note in ${JSON.stringify(text)}`);
  const trailing = text.slice(end + 1).trim();
  assert(trailing === '', `text after note in ${JSON.stringify(text)}`);
  const former = text
    .slice(m.index, end + 1)
    .replace(/^[（(]\s*原\s*/, '')
    .replace(/\s*[）)]$/, '')
    .trim();
  return { primary, former };
}

function splitUrls(joined) {
  const squeezed = joined.replace(/\s+/g, '');
  if (!squeezed) return [];
  return squeezed.split(/(?=https?:\/\/)/).filter(Boolean);
}

/**
 * Independent check against PDFKit's own text layer for the page (its order is scrambled
 * across columns, but the cells of one column keep their row order and each cell's text is
 * contiguous). Names and URLs of the page's rows must be found, in row order, in the page
 * text; abbreviations must sit next to their serial or name (or form one block); publishers
 * must occur.
 * (Whitespace is ignored everywhere because spacing is exactly what the geometry decides.)
 */
function crossCheckTextLayer(pg, pageRows, warnings) {
  const text = pg.chars.filter((c) => !c.n && !isWs(c.c)).map((c) => c.c).join('');
  const strip = (t) => t.replace(/\s+/g, '');
  const sequential = (cells, label) => {
    let pos = 0;
    for (const { serial, cell } of cells) {
      const needle = strip(cell);
      if (!needle) continue;
      const at = text.indexOf(needle, pos);
      assert(at >= 0, `page ${pg.page} serial ${serial}: ${label} cell ${JSON.stringify(cell)} is not found (in row order) in the page's text layer`);
      pos = at + needle.length;
    }
  };
  sequential(pageRows.map((r) => ({ serial: r.serial, cell: r.nameCell })), 'name');
  sequential(pageRows.map((r) => ({ serial: r.serial, cell: r.urlCell })), 'URL');
  // Abbreviations: PDFKit lays a page out in one of three ways: "serial abbr", "abbr name", or one
  // block of all abbreviations. A row passes if its abbreviation is adjacent to its serial or to
  // its name; if the page uses the block layout all abbreviations must form one block in row order.
  const block = strip(pageRows.map((r) => r.abbrCell).join(''));
  const blockLayout = block !== '' && text.includes(block);
  for (const r of pageRows) {
    const abbr = strip(r.abbrCell);
    if (!abbr || blockLayout) continue;
    const afterSerial = text.includes(String(r.serial) + abbr);
    const beforeName = text.includes(abbr + strip(r.nameCell).slice(0, 12));
    if (!afterSerial && !beforeName) {
      warnings.push(`page ${pg.page} serial ${r.serial}: abbreviation ${JSON.stringify(r.abbrCell)} is neither next to its serial nor to its name in the text layer`);
    }
  }
  for (const r of pageRows) {
    const pub = strip(r.publisherCell);
    if (pub) assert(text.includes(pub), `page ${pg.page} serial ${r.serial}: publisher ${JSON.stringify(r.publisherCell)} is not in the page's text layer`);
  }
}

// ---------------------------------------------------------------------------------
// Document walk

function parseDocument(dump, warnings, trace) {
  const rows = [];
  const tableKeys = new Set();
  const areaOrder = [];
  let state = null; // { kind, area, tier, last (last serial seen) }

  for (const pg of dump.pages) {
    assert(pg.rotation === 0, `page ${pg.page}: rotated page`);
    assert(pg.alignMismatches === 0, `page ${pg.page}: ${pg.alignMismatches} glyph box alignment mismatches in the dump`);
    const glyphs = pageGlyphs(pg, warnings);

    if (pg.page === 1) {
      const text = glyphs.map((g) => g.c).join('');
      assert(text.startsWith(META.title) || text.replace(/\s/g, '').includes(META.title.replace(/\s/g, '')), `cover page text ${JSON.stringify(text.slice(0, 60))} does not match the expected title`);
      continue;
    }

    const { header, headingBands, body } = splitPage(pg, glyphs, warnings);
    const clusters = columnClusters(body);
    let colMap;

    if (header) {
      const info = parseHeading(pg, headingBands, warnings);
      assert(info.tier, `page ${pg.page}: table header without a tier heading`);
      const headerKind = KIND_BY_HEADER[header[1]?.text];
      assert(headerKind, `page ${pg.page}: unrecognised header cell ${JSON.stringify(header[1]?.text)}`);
      if (info.kind) assert(info.kind === headerKind, `page ${pg.page}: title says ${info.kind} but header says ${headerKind}`);
      const kind = info.kind ?? state?.kind;
      const area = info.area ?? state?.area;
      assert(kind && area, `page ${pg.page}: cannot determine kind/area`);
      assert(kind === headerKind, `page ${pg.page}: inherited kind ${kind} contradicts header ${headerKind}`);
      if (!areaOrder.includes(area)) areaOrder.push(area);
      const key = `${kind}|${info.tier}|${area}`;
      assert(!tableKeys.has(key), `page ${pg.page}: table ${key} appears twice`);
      tableKeys.add(key);
      colMap = mapColumns(pg, clusters, header);
      state = { kind, area, tier: info.tier, last: 0 };
    } else {
      assert(state, `page ${pg.page}: continuation page before any table`);
      assert(headingBands.length === 0, `page ${pg.page}: heading text without a header row`);
      colMap = mapColumns(pg, clusters, null);
    }

    // ---- columns -> lines
    const colGlyphs = COLS.map(() => []);
    for (const g of body) colGlyphs[colMap[clusterIndex(pg, g, clusters)]].push(g);
    const colLines = colGlyphs.map((gs) =>
      clusterDesc(gs, (g) => g.yc, LINE_GAP).map((lineGlyphs) => makeLine(pg, lineGlyphs, warnings)),
    );

    // ---- rows anchored on the serial cells
    const serials = colLines[0].map((l) => {
      assert(/^\d{1,3}$/.test(l.text), `page ${pg.page}: serial column holds ${JSON.stringify(l.text)}`);
      return { serial: Number(l.text), yc: l.yc, cells: COLS.map(() => []) };
    });
    assert(serials.length > 0, `page ${pg.page}: no serial numbers`);
    serials.forEach((r, i) => {
      const expected = state.last + i + 1;
      assert(r.serial === expected, `page ${pg.page}: serial ${r.serial} where ${expected} was expected (${state.kind}|${state.tier}|${state.area})`);
    });
    state.last += serials.length;

    const centres = serials.map((r) => r.yc);
    for (let c = 1; c < COLS.length; c++) {
      const groups = assignLines(colLines[c], centres, `page ${pg.page} ${COLS[c]} column`);
      groups.forEach((g, i) => (serials[i].cells[c] = g));
    }

    // ---- cell text
    const pageRows = [];
    for (const r of serials) {
      for (let c = 1; c < COLS.length; c++) {
        const lines = r.cells[c].sort((a, b) => b.yc - a.yc);
        if (lines.length) {
          const centre = lines.reduce((s, l) => s + l.yc, 0) / lines.length;
          stats.maxCentreDev = Math.max(stats.maxCentreDev, Math.abs(centre - r.yc));
          if (Math.abs(centre - r.yc) > 2.5) {
            warnings.push(`page ${pg.page} serial ${r.serial}: ${COLS[c]} cell centre is ${(centre - r.yc).toFixed(1)}pt from the serial`);
          }
          assert(
            Math.abs(centre - r.yc) <= CELL_CENTRE_TOL,
            `page ${pg.page} serial ${r.serial}: ${COLS[c]} cell centre is ${(centre - r.yc).toFixed(1)}pt from the serial (mis-assigned lines? ${JSON.stringify(lines.map((l) => l.text))})`,
          );
        }
      }
      const raw = {};
      for (let c = 1; c < COLS.length; c++) raw[COLS[c]] = r.cells[c].map((l) => l.text);

      const abbr = splitNote(joinLines(raw.abbr, 'abbr'));
      const name = splitNote(joinLines(raw.name, 'name'));
      const publisher = splitNote(joinLines(raw.publisher, 'publisher'));
      const urls = splitUrls(joinLines(raw.url, 'url'));

      const row = {
        kind: state.kind,
        tier: state.tier,
        area: state.area,
        serial: r.serial,
        abbr: abbr.primary,
        name: name.primary,
        publisher: publisher.primary,
        dblp: urls[0] ?? '',
      };
      if (urls.length > 1) row.dblpExtra = urls.slice(1);
      const former = {};
      if (abbr.former !== null) former.abbr = abbr.former;
      if (name.former !== null) former.name = name.former;
      if (publisher.former !== null) former.publisher = publisher.former;
      if (Object.keys(former).length) row.former = former;
      row.page = pg.page;
      rows.push(row);

      if (trace) trace.push({ page: pg.page, kind: row.kind, tier: row.tier, area: row.area, serial: r.serial, raw });
      pageRows.push({ serial: r.serial, abbrCell: joinLines(raw.abbr, 'abbr'), nameCell: joinLines(raw.name, 'name'), publisherCell: joinLines(raw.publisher, 'publisher'), urlCell: joinLines(raw.url, 'url') });
    }
    crossCheckTextLayer(pg, pageRows, warnings);
  }

  assert(tableKeys.size === EXPECTED_TABLES, `found ${tableKeys.size} tables, expected ${EXPECTED_TABLES}`);
  return { rows, areaOrder, tableKeys };
}

// ---------------------------------------------------------------------------------
// Overrides, validation, output

function applyOverrides(rows, overridesFile, dumpSha) {
  const applied = [];
  if (!fs.existsSync(overridesFile)) return applied;
  const spec = JSON.parse(fs.readFileSync(overridesFile, 'utf8'));
  if (spec.pdfSha256) assert(spec.pdfSha256 === dumpSha, `overrides were written for PDF ${spec.pdfSha256}, dump is ${dumpSha}`);
  for (const [i, ov] of (spec.overrides ?? []).entries()) {
    const where = `override #${i + 1}`;
    assert(ov.reason && String(ov.reason).trim().length > 10, `${where}: a reason is required`);
    assert(ov.match && ov.set && ov.expect, `${where}: match, expect and set are required`);
    const hits = rows.filter((r) => Object.entries(ov.match).every(([k, v]) => r[k] === v));
    assert(hits.length === 1, `${where}: match ${JSON.stringify(ov.match)} hit ${hits.length} rows, expected exactly 1`);
    const row = hits[0];
    for (const [field, value] of Object.entries(ov.expect)) {
      assert(row[field] === value, `${where}: parsed ${field} is ${JSON.stringify(row[field])}, override expects ${JSON.stringify(value)}`);
    }
    for (const field of Object.keys(ov.set)) assert(field in ov.expect, `${where}: set.${field} has no expect.${field}`);
    Object.assign(row, ov.set);
    applied.push({ match: ov.match, set: ov.set, reason: ov.reason });
  }
  return applied;
}

function validate(rows, warnings) {
  for (const r of rows) {
    const where = `${r.kind}|${r.tier}|${r.area}|#${r.serial}`;
    assert(r.name, `${where}: empty name`);
    assert(r.publisher, `${where}: empty publisher`);
    assert(!/https?:|www\./i.test(r.abbr + r.name + r.publisher), `${where}: URL text in a non-URL cell (column mix-up?)`);
    for (const u of [r.dblp, ...(r.dblpExtra ?? [])]) {
      if (u) assert(/^https?:\/\/[^\s]+$/.test(u), `${where}: malformed URL ${JSON.stringify(u)}`);
    }
    if (!r.dblp) warnings.push(`${where} (${r.abbr || r.name}): no URL in the PDF`);
  }
}

function serialise(out) {
  const lines = ['{', '  "meta": ' + JSON.stringify(out.meta, null, 2).replace(/\n/g, '\n  ') + ',', '  "venues": ['];
  out.venues.forEach((v, i) => lines.push('    ' + JSON.stringify(v) + (i < out.venues.length - 1 ? ',' : '')));
  lines.push('  ]', '}');
  return lines.join('\n') + '\n';
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dump = JSON.parse(fs.readFileSync(opts.input, 'utf8'));
  assert(Array.isArray(dump.pages) && dump.sha256, 'input is not a glyph dump produced by extract-pdf.swift');

  const warnings = [];
  const trace = opts.trace ? [] : null;
  const { rows, areaOrder } = parseDocument(dump, warnings, trace);
  const overrides = applyOverrides(rows, opts.overrides, dump.sha256);
  validate(rows, warnings);

  const kindOrder = { C: 0, J: 1 };
  const areaIndex = new Map(areaOrder.map((a, i) => [a, i]));
  rows.sort(
    (a, b) =>
      kindOrder[a.kind] - kindOrder[b.kind] ||
      a.tier.localeCompare(b.tier) ||
      areaIndex.get(a.area) - areaIndex.get(b.area) ||
      a.serial - b.serial,
  );

  const counts = { conference: { A: 0, B: 0, C: 0, total: 0 }, journal: { A: 0, B: 0, C: 0, total: 0 }, total: 0 };
  for (const r of rows) {
    const k = r.kind === 'C' ? counts.conference : counts.journal;
    k[r.tier]++;
    k.total++;
    counts.total++;
  }

  const venues = rows.map((r) => {
    const v = { kind: r.kind, tier: r.tier, area: r.area, serial: r.serial, abbr: r.abbr, name: r.name, publisher: r.publisher, dblp: r.dblp };
    if (r.dblpExtra) v.dblpExtra = r.dblpExtra;
    if (r.former) v.former = r.former;
    v.page = r.page;
    return v;
  });

  const out = {
    meta: { ...META, pdfSha256: dump.sha256, counts },
    venues,
  };
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, serialise(out));
  if (opts.trace) fs.writeFileSync(opts.trace, JSON.stringify(trace, null, 1) + '\n');

  for (const w of warnings) console.error('warning: ' + w);
  console.log(
    `${venues.length} venues (${counts.conference.total} conferences, ${counts.journal.total} journals; ` +
      `A=${counts.conference.A + counts.journal.A} B=${counts.conference.B + counts.journal.B} C=${counts.conference.C + counts.journal.C}), ` +
      `${areaOrder.length} areas, ${overrides.length} override(s), ${warnings.length} warning(s) -> ${path.relative(process.cwd(), opts.out)}`,
  );
  console.log(
    `geometry: ${stats.lines} text lines, max ink band ${stats.maxBand.toFixed(1)}pt (limit ${MAX_BAND}), max cell-centre deviation ${stats.maxCentreDev.toFixed(1)}pt (limit ${CELL_CENTRE_TOL})`,
  );
}

try {
  main();
} catch (err) {
  console.error('error: ' + err.message);
  process.exit(1);
}
