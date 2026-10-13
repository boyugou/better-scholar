// Read a paper's own page on Scholar to recover what the list view hides: the full
// author list (the list truncates long ones with "…", hiding a senior author) and a
// clean venue field. User-triggered and throttled; stops at the first sign of a CAPTCHA.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const { sleep } = B.dom;
  // About one request a second against Scholar; instant against a local test server.
  const PACE = () => (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? 30 : 1000 + Math.random() * 600);

  class ResolveError extends Error {
    constructor(code, message) { super(message || code); this.code = code; }
  }

  // Pull { authors, venue } out of a detail page's field table.
  function parseDetail(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("#captcha-form, #gs_captcha_ccl, form[action*='sorry'], #recaptcha") ||
        /unusual traffic|not a robot/i.test((doc.body && doc.body.textContent || "").slice(0, 1500))) {
      throw new ResolveError("captcha");
    }
    const fields = {};
    let firstValue = "";
    doc.querySelectorAll("#gsc_oci_table .gs_scl").forEach((row) => {
      const k = (row.querySelector(".gsc_oci_field") || {}).textContent;
      const v = (row.querySelector(".gsc_oci_value") || {}).textContent;
      if (k && v) { fields[k.trim()] = v.trim(); if (!firstValue) firstValue = v.trim(); }
    });
    const venueKey = ["Journal", "Conference", "Book", "Source", "Publisher"].find((k) => fields[k]);
    // The page is requested with hl=en, so the label is "Authors"; if Scholar ever ignores that,
    // the author list is still the first field of the table.
    return { authors: fields.Authors || firstValue, venue: venueKey ? fields[venueKey] : "", fields };
  }

  async function fetchDetail(href, signal) {
    // Field labels follow the interface language ("Authors" / "作者" / …): ask for English.
    const url = new URL(href, location.href);
    url.searchParams.set("hl", "en");
    if (url.origin !== location.origin) throw new ResolveError("http", "not a Scholar page");      // (cookies go only to the page's own origin)
    const res = await fetch(url.href, { credentials: "include", signal });
    if (res.status === 429 || res.status === 503 || /\/sorry\//.test(res.url)) throw new ResolveError("captcha");
    if (!res.ok) throw new ResolveError("http", "HTTP " + res.status);
    return parseDetail(await res.text());
  }

  // items: [{ id, href }]. cache: { [id]: { authors, venue, ts } } is updated in place.
  // Calls onProgress(done, total) and onResult(id, entry); returns { done, stopped }.
  async function resolveAll(items, cache, { onProgress, onResult, signal, semantic = false } = {}) {
    let done = 0, askSemantic = true;
    for (const item of items) {
      if (signal && signal.aborted) return { done, stopped: "cancelled" };
      // Semantic Scholar first when the settings allow it (items carry the title); a miss or a slow-down sends the paper to Scholar's own page
      if (!cache[item.id] && askSemantic && item.title && (typeof semantic === "function" ? semantic() : semantic)) {
        try {
          const d = await B.semantic.lookup(item.title, signal, { authorsText: item.authorsText, year: item.year });
          if (d) cache[item.id] = { authors: d.authors, venue: d.venue, ts: Date.now(), via: "semantic" };
        } catch (e) {
          if (e.name === "AbortError") return { done, stopped: "cancelled" };
          if (e.limited) askSemantic = false;
        }
        await sleep(B.semantic.PACE());
      }
      if (!cache[item.id]) {
        try {
          const d = await fetchDetail(item.href, signal);
          if (d.authors) cache[item.id] = { authors: d.authors, venue: d.venue, ts: Date.now() };
        } catch (e) {
          if (e.name === "AbortError") return { done, stopped: "cancelled" };
          if (e instanceof ResolveError && e.code === "captcha") return { done, stopped: "captcha" };
          // a single failed page is skipped; keep going
        }
        await sleep(PACE());
      }
      done++;
      if (cache[item.id] && onResult) onResult(item.id, cache[item.id]);
      if (onProgress) onProgress(done, items.length);
    }
    return { done, stopped: null };
  }

  B.detail = { parseDetail, fetchDetail, resolveAll, ResolveError };
})();
