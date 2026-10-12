// Google Scholar profile page adapter: everything that knows Scholar's DOM lives here.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const $ = (s, r = document) => r.querySelector(s);
  const { sleep } = B.dom;

  const isProfile = () => !!$("#gsc_prf_in") && !!$("#gsc_a_b");

  function profileId() {
    const m = /[?&]user=([^&#]+)/.exec(location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }
  const ownerName = () => (($("#gsc_prf_in") || {}).textContent || "").trim();
  const tbody = () => $("#gsc_a_b");
  const rowElements = () => Array.from(document.querySelectorAll("#gsc_a_b tr.gsc_a_tr"));
  const showMoreButton = () => $("#gsc_bpf_more");

  // Text of an element without anything this extension appended to it. Scholar's DOM puts a no-break space
  // before the "…" that truncates a venue; it is read as the plain space it stands for.
  function cleanText(el) {
    if (!el) return "";
    let text;
    if (!el.querySelector(".rr-chips, .rr-name")) text = el.textContent || "";
    else {
      const c = el.cloneNode(true);
      c.querySelectorAll(".rr-chips").forEach((n) => n.remove());
      text = c.textContent || "";
    }
    return text.replace(/\u00a0/g, " ");
  }

  function readRow(tr) {
    const grays = tr.querySelectorAll("td.gsc_a_t .gs_gray");
    const link = tr.querySelector("a.gsc_a_at");
    const num = (el) => {
      const n = parseInt(((el && el.textContent) || "").replace(/[^0-9]/g, ""), 10);
      return Number.isFinite(n) ? n : 0;
    };
    const y = parseInt((((tr.querySelector("td.gsc_a_y") || {}).textContent) || "").trim(), 10);
    const href = link ? link.getAttribute("href") || "" : "";
    const m = /citation_for_view=([^&]+)/.exec(href);
    return {
      tr,
      id: m ? decodeURIComponent(m[1]) : "",
      title: link ? link.textContent.trim() : "",
      href,
      authorsEl: grays[0] || null,
      venueEl: grays[1] || null,
      authorsText: cleanText(grays[0]),
      venueText: cleanText(grays[1]),
      citations: num(tr.querySelector("td.gsc_a_c")),
      year: Number.isFinite(y) ? y : null
    };
  }

  // Sidebar below the list (narrow window) or beside it (wide window)?
  function layout() {
    const side = $(".gsc_rsb");
    const table = $("#gsc_a_tw") || $("#gsc_a_t");
    if (side && table && side.getBoundingClientRect().top <= table.getBoundingClientRect().top + 10) return "side";
    return table ? "above" : "float";
  }

  // Put `panel` where it will be seen: top of the right sidebar on wide layouts,
  // above the paper list on narrow ones, floating as a last resort.
  function place(panel) {
    const mode = layout();
    const side = $(".gsc_rsb");
    const table = $("#gsc_a_tw") || $("#gsc_a_t");
    panel.classList.toggle("rr-wide", mode === "above");
    panel.classList.toggle("rr-float", mode === "float");
    if (mode === "side") {
      if (panel.parentNode !== side || side.firstChild !== panel) side.insertBefore(panel, side.firstChild);
    } else if (mode === "above") {
      if (panel.nextSibling !== table) table.parentNode.insertBefore(panel, table);
    } else if (panel.parentNode !== document.body) document.body.append(panel);
    return mode;
  }

  // Click "Show more" until Scholar has nothing left (or the user cancels).
  async function loadAll({ onProgress, signal } = {}) {
    let stalls = 0;
    for (let i = 0; i < 400; i++) {
      const btn = showMoreButton();
      if (!btn || btn.disabled || (signal && signal.aborted)) break;
      const before = rowElements().length;
      btn.click();
      const t0 = Date.now();
      while (rowElements().length === before && Date.now() - t0 < 9000 && !(signal && signal.aborted)) await sleep(150);
      if (rowElements().length === before) { if (++stalls >= 2) break; } else stalls = 0;
      if (onProgress) onProgress(rowElements().length);
      await sleep(600 + Math.random() * 400);
    }
    return rowElements().length;
  }

  const canLoadMore = () => { const b = showMoreButton(); return !!b && !b.disabled; };

  B.scholar = { isProfile, profileId, ownerName, tbody, rowElements, readRow, cleanText, layout, place, loadAll, canLoadMore };
})();
