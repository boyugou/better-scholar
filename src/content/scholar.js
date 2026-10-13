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
      c.querySelectorAll(".rr-chips").forEach((n) => {
        const before = n.previousSibling;
        if (before && before.nodeType === 3 && before.textContent === " ") before.remove();      // (the space put before the chips)
        n.remove();
      });
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

  // Wait (at most `ms`, and until `signal` aborts) for `test()` to hold; says whether it does.
  async function waitUntil(test, ms, signal) {
    const t0 = Date.now();
    while (!test() && Date.now() - t0 < ms && !(signal && signal.aborted)) await sleep(100);
    return test();
  }

  // Milliseconds: between presses (plus up to `jitter`), how long a press may take to bring rows, how long to wait for the button to
  // come back after a batch. Overridable (`timing`) so that the loader can be tested without waiting nine seconds.
  // One automatic run at a time per browser: tabs of the same Scholar origin share localStorage, so a run takes a short-lived lock before each press
  // (several visible windows would otherwise press in parallel). A lock nobody renews for a few seconds is stale.
  const LOCK = "rr-load-lock", me = Math.random().toString(36).slice(2);
  const lockFree = () => { try { const l = JSON.parse(localStorage.getItem(LOCK) || "null"); return !l || l.id === me || Date.now() - l.t > 5000; } catch (e) { return true; } };
  const takeLock = () => { try { localStorage.setItem(LOCK, JSON.stringify({ id: me, t: Date.now() })); } catch (e) { /* no storage: no lock */ } };
  const dropLock = () => { try { const l = JSON.parse(localStorage.getItem(LOCK) || "null"); if (l && l.id === me) localStorage.removeItem(LOCK); } catch (e) { /* gone */ } };

  const TIMING = { pause: 600, jitter: 400, rowTimeout: 9000, regrace: 1500 };

  // Press "Show more" until Scholar has nothing left: the same request a click of yours makes, one at a time and about a second
  // apart. Says why it stopped — "done" (the button is gone, or stays disabled), "cancelled", or "stalled" (a press brought no rows
  // within nine seconds, `maxStalls` times in a row: Scholar is slow, limiting requests or asking for a CAPTCHA, and is not pressed again).
  // `startDelay` waits before the first press (Scholar's own script has to be ready for it). `foregroundOnly` presses only while the tab
  // is the one being looked at, so profiles opened in many tabs at once do not all press together.
  async function loadAll({ onProgress, signal, maxStalls = 2, startDelay = 0, foregroundOnly = false, timing } = {}) {
    const T = Object.assign({}, TIMING, timing);
    // (an orphaned content script — the extension was updated, disabled or removed — stops pressing)
    const orphaned = () => { try { return !(chrome.runtime && chrome.runtime.id); } catch (e) { return true; } };
    const aborted = () => !!(signal && signal.aborted) || (typeof chrome !== "undefined" && orphaned());
    const foreground = () => !foregroundOnly || !document.hidden;
    if (startDelay) await waitUntil(() => false, startDelay, signal);
    let stalls = 0;
    for (let i = 0; i < 400 && !aborted(); i++) {
      if (!foreground()) { await waitUntil(foreground, Infinity, signal); if (aborted()) break; }
      if (foregroundOnly) { await waitUntil(lockFree, Infinity, signal); if (aborted()) break; takeLock(); }
      let btn = showMoreButton();
      // just after a batch Scholar may still be re-enabling the button: give it a moment before calling the list complete
      // (a press still in flight — slow, or made by the user — is not the end either)
      if (btn && btn.disabled) { await waitUntil(() => { const b = showMoreButton(); return !b || !b.disabled; }, T.regrace, signal); btn = showMoreButton(); }
      if (!btn || btn.disabled) { if (stalls > 0) { if (foregroundOnly) dropLock(); return "stalled"; } break; }
      const before = rowElements().length;
      btn.click();
      await waitUntil(() => rowElements().length > before, T.rowTimeout, signal);
      if (aborted()) break;
      if (rowElements().length <= before) { if (++stalls >= maxStalls) { if (foregroundOnly) dropLock(); return "stalled"; } }
      else { stalls = 0; if (onProgress) onProgress(rowElements().length); }
      await sleep(T.pause + Math.random() * T.jitter);
    }
    if (foregroundOnly) dropLock();
    return aborted() ? "cancelled" : "done";
  }

  const canLoadMore = () => { const b = showMoreButton(); return !!b && !b.disabled; };

  B.scholar = { isProfile, profileId, ownerName, tbody, rowElements, readRow, cleanText, layout, place, loadAll, canLoadMore };
})();
