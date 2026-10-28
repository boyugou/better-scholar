// The role × rank table as a picture, for a slide, a CV or a form that takes images ("Copy as image"). Drawn on a canvas from the same numbers the
// panel's table shows, at twice the size for sharp text; the page's role colours; mirrored for a right-to-left language. No network, nothing stored.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  // (Japanese first for a Japanese page: where system-ui has no Japanese face, a Chinese one would give Japanese text Chinese glyph shapes)
  const fontFor = (lang) => "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', " + (/^ja/i.test(lang || "") ? "'Hiragino Sans', 'Noto Sans JP', 'Noto Sans CJK JP', " : "") + "'Noto Sans CJK SC', 'PingFang SC', sans-serif";
  const INK = "#202124", MUTED = "#5f6368", LINE = "#dadce0";

  // model: { title, owner, lang, columns: [label], totalHead, rows: [{ label, color, cells: [n], total }], totals: { label, cells: [n], total }, notes: [line], dir }
  async function tablePng(model, scale = 2) {
    const probe = new OffscreenCanvas(1, 1).getContext("2d");
    const FONT = fontFor(model.lang), font = (w, px) => `${w} ${px}px ${FONT}`;
    const width = (text, f) => { probe.font = f; return probe.measureText(String(text)).width; };
    const PAD = 20, ROW = 24, NUM = 46, DOT = 10;
    const fTitle = font(600, 15), fOwner = font(400, 12), fHead = font(700, 11), fCell = font(400, 13), fBold = font(700, 13), fNote = font(400, 11);
    const labelW = Math.max(...[...model.rows, model.totals].map((r) => width(r.label, fBold) + DOT + 8), 90);
    const TOT = Math.max(NUM, width(model.totalHead || "", fHead) + 10);          // (the total column as wide as its own name: a custom name is up to 30 characters)
    const tableW = labelW + 12 + NUM * model.columns.length + TOT;
    // (as wide as the table, the title, the owner line and the longest word of a note — a web address cannot be wrapped)
    const noteWord = Math.max(0, ...(model.notes || []).filter(Boolean).flatMap((n) => String(n).split(/\s+/)).map((w) => width(w, fNote)));
    const W = Math.ceil(Math.max(tableW, width(model.title, fTitle), width(model.owner || "", fOwner), noteWord, 280) + PAD * 2);
    // the notes wrap at the picture's width
    const wrap = (text) => {
      const words = String(text).split(/(\s+)/), lines = [];
      let line = "";
      for (const w of words) { if (line && width(line + w, fNote) > W - PAD * 2) { lines.push(line.trim()); line = w.trimStart(); } else line += w; }
      if (line.trim()) lines.push(line.trim());
      return lines;
    };
    const notes = (model.notes || []).filter(Boolean).flatMap(wrap);
    const H = PAD + 20 + (model.owner ? 18 : 0) + 10 + ROW * (model.rows.length + 2) + 8 + notes.length * 15 + PAD;
    const canvas = new OffscreenCanvas(Math.ceil(W * scale), Math.ceil(H * scale)), ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const rtl = model.dir === "rtl", X = (x) => (rtl ? W - x : x);
    ctx.direction = rtl ? "rtl" : "ltr";
    const text = (s, x, y, f, color, align = "start") => {
      ctx.font = f; ctx.fillStyle = color; ctx.textBaseline = "middle";
      ctx.textAlign = align === "start" ? (rtl ? "right" : "left") : align === "end" ? (rtl ? "left" : "right") : "center";
      ctx.fillText(String(s), X(x), y);
    };
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    let y = PAD + 8;
    text(model.title, PAD, y, fTitle, INK); y += 20;
    if (model.owner) { text(model.owner, PAD, y, fOwner, MUTED); y += 18; }
    y += 10;
    // the header: the tiers, then the total
    const colX = (i) => (i < model.columns.length ? PAD + labelW + 12 + NUM * i + NUM / 2 : PAD + labelW + 12 + NUM * model.columns.length + TOT / 2);
    model.columns.forEach((c, i) => text(c, colX(i), y, fHead, MUTED, "center"));
    text(model.totalHead || "", colX(model.columns.length), y, fHead, MUTED, "center");
    y += ROW;
    const row = (r, bold) => {
      if (r.color) { ctx.fillStyle = r.color; const dx = rtl ? W - PAD - DOT : PAD; ctx.beginPath(); ctx.roundRect(dx, y - DOT / 2, DOT, DOT, 2.5); ctx.fill(); }
      text(r.label, PAD + (r.color ? DOT + 8 : 0), y, bold ? fBold : fCell, INK);
      r.cells.forEach((n, i) => text(n ? n : "·", colX(i), y, bold ? fBold : fCell, n ? INK : LINE, "center"));
      text(r.total, colX(model.columns.length), y, fBold, INK, "center");
      y += ROW;
    };
    model.rows.forEach((r) => row(r, false));
    ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, y - ROW / 2 - 0.5); ctx.lineTo(W - PAD, y - ROW / 2 - 0.5); ctx.stroke();
    row(model.totals, true);
    y += 4;
    for (const line of notes) { text(line, PAD, y, fNote, MUTED); y += 15; }
    return canvas.convertToBlob({ type: "image/png" });
  }

  // a PNG blob as a data: address (for the toolbar popup and the page calls, which pass text)
  const dataUrl = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); });

  B.image = { tablePng, dataUrl };
})();
