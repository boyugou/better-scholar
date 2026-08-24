// Scholar Lens — content script
//
// Runs on every Google Scholar domain (scholar.google.com and each country
// mirror — scholar.google.com.sg, scholar.google.co.uk, …; see the enumerated
// match patterns in manifest.json). Parses publication entries (profile rows and
// search results), matches each paper's author list against the user's tracked
// authors, applies role-based highlighting (first / last / co-first / etc.), and
// requests venue quality badges from the background worker. A MutationObserver
// keeps newly loaded entries (Scholar "Show more", pagination) processed.

(() => {
  "use strict";

  const COFIRST_SYMBOLS = ["†", "‡", "§", "*", "#", "✉", "⁎", "∗"];

  const PALETTE = {
    blue: "#1A73E8",
    green: "#34C759",
    red: "#FF3B30",
    orange: "#FF9500",
    purple: "#AF52DE",
    teal: "#5AC8FA",
    pink: "#FF2D55",
    indigo: "#5856D6"
  };

  const DEFAULT_SETTINGS = {
    authors: [],
    badges: { conference: true, journal: true, ccf: false },
    roles: { first: true, cofirst: true, second: true, last: true }
  };

  let settings = DEFAULT_SETTINGS;
  let stats = { authorsFound: 0, papersHighlighted: 0 };
  const venueCache = new Map(); // raw venue -> Promise<rating>

  // Persist the live settings the injected panel mutates (roles + badges), the
  // single source of truth shared with chrome.storage.sync.
  function saveSettings() {
    try { chrome.storage.sync.set({ settings }); } catch (e) { /* no-op */ }
  }

  // Transient view state backing the panel's filter controls. Unlike roles and
  // badges (persisted in `settings`), these reset each page load: they shape the
  // current view only — show only highlighted rows, decorate matched names, and
  // the year range. `yearStart`/`yearEnd` back the two dropdowns.
  const panelState = {
    showOnlyHighlighted: false,
    nameHighlight: false,
    yearStart: null,
    yearEnd: null
  };
  // Per-paper analysis captured during the last processAll, keyed by the row's
  // <tr> element: { highlighted, citations, year }. Drives metrics + filters.
  let rowData = [];

  // The MutationObserver that re-processes rows Scholar appends ("Show more").
  // Hoisted so our own decoration writes can pause it: decorating author names
  // mutates the rows, which would otherwise retrigger the observer and fight a
  // toggle-off (the "can't uncheck Highlight author name" bug). `pauseObserver`
  // disconnects around our writes — disconnect() also drops queued records, so
  // no self-triggered reprocessing survives.
  let observer = null;
  const observerTargets = []; // [{ node, opts }]
  function connectObserver() {
    if (!observer) return;
    for (const t of observerTargets) observer.observe(t.node, t.opts);
  }
  function pauseObserver(fn) {
    if (observer) observer.disconnect();
    try { return fn(); } finally { connectObserver(); }
  }

  // ---- name normalization & matching -------------------------------------

  // Normalize a person name for comparison: lowercase, accents folded,
  // punctuation collapsed to single spaces. "J.-P. O'Brien" -> "j p o brien".
  function normName(s) {
    return (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[.\-']/g, " ")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Split into { initials: [first letters of given tokens], last: lastToken }.
  function nameParts(s) {
    const toks = normName(s).split(" ").filter(Boolean);
    if (!toks.length) return { initials: [], last: "" };
    const last = toks[toks.length - 1];
    const givens = toks.slice(0, -1);
    return { givens, last };
  }

  // True when a given-name token is a run of concatenated initials that lines
  // up with `cluster.length` consecutive tokens on the other side, letter by
  // letter — e.g. "AK" against ["amin", "karimi"], or "WLH" against ["wei",
  // "lun", "harry"]. Scholar collapses every given name of an author with a
  // middle name into one token like this when it abbreviates ("AK Monsefi"),
  // so a single token on one side can stand for several given-name tokens on
  // the other.
  function matchesInitialsRun(cluster, tokens, start) {
    if (start + cluster.length > tokens.length) return false;
    for (let k = 0; k < cluster.length; k++) {
      if (cluster[k] !== tokens[start + k][0]) return false;
    }
    return true;
  }

  // True when two given-name token sequences could name the same person.
  // Walks both lists with two pointers, consuming one token from each side
  // per step — unless a multi-letter token on one side doesn't equal its
  // counterpart outright, in which case it may be a concatenated-initials
  // cluster (see matchesInitialsRun) that consumes several tokens from the
  // other side at once. Whichever list runs out first leaves the remainder
  // unchecked: a shorter variant (e.g. "John Smith" given just "John") is
  // accepted, not rejected.
  function givensCompatible(ga, gb) {
    let i = 0, j = 0;
    while (i < ga.length && j < gb.length) {
      const ta = ga[i];
      const tb = gb[j];
      if (ta[0] !== tb[0]) return false;
      if (ta.length === 1 || tb.length === 1 || ta === tb) { i++; j++; continue; }
      // Both sides are multi-letter words that differ outright — the only
      // way they still describe the same person is if one is an initials
      // cluster covering several of the other's tokens.
      if (matchesInitialsRun(ta, gb, j)) { i++; j += ta.length; continue; }
      if (matchesInitialsRun(tb, ga, i)) { j++; i += tb.length; continue; }
      return false;
    }
    return true;
  }

  // True when displayed author text matches a tracked author. Strategy:
  //   1. exact normalized equality with any configured variant;
  //   2. same last name AND given-name tokens are compatible (see
  //      givensCompatible) — same leading letter, and full words at the same
  //      position must be identical, not just share an initial. This accepts
  //      "John Smith" == "J Smith" == "J. Smith" while rejecting "Jane Smith"
  //      != "John Smith" (both full, J-a-n vs J-o-h).
  function matchesAuthor(authorText, author) {
    const variants = [author.name, ...(author.alternates || [])].filter(Boolean);
    const a = nameParts(authorText);
    if (!a.last) return false;

    for (const v of variants) {
      if (normName(authorText) === normName(v)) return true;
      const b = nameParts(v);
      if (a.last !== b.last) continue;
      if (!a.givens.length || !b.givens.length) continue;
      if (givensCompatible(a.givens, b.givens)) return true;
    }
    return false;
  }

  // Strip trailing co-first markers from a raw author token, reporting whether
  // any were present. "Jane Doe†" -> { name: "Jane Doe", cofirst: true }.
  function splitCofirst(token) {
    let name = token.trim();
    let cofirst = false;
    let changed = true;
    while (changed) {
      changed = false;
      for (const sym of COFIRST_SYMBOLS) {
        if (name.endsWith(sym)) {
          name = name.slice(0, -sym.length).trim();
          cofirst = true;
          changed = true;
        }
      }
    }
    return { name, cofirst };
  }

  // ---- author list parsing -----------------------------------------------

  // Parse "A Smith, B Jones, C Lee" into ordered tokens with co-first flags.
  // Scholar truncates long lists with "…"; the ellipsis token is dropped but we
  // remember that the list was truncated so "last author" is not over-claimed.
  function parseAuthors(text) {
    const truncated = /…|\.\.\./.test(text);
    const raw = text
      .replace(/…|\.\.\./g, ",")
      .split(/,|;|·/)
      .map((t) => t.trim())
      .filter(Boolean);
    const tokens = raw.map(splitCofirst).filter((t) => t.name.length > 1);
    return { tokens, truncated };
  }

  // Determine the role of a tracked author within a parsed author list.
  // Returns one of: 'first', 'cofirst', 'second', 'last', 'middle', or null.
  function roleFor(idx, tokens, truncated) {
    const t = tokens[idx];
    if (t.cofirst) return "cofirst";
    if (idx === 0) return "first";
    if (idx === tokens.length - 1 && !truncated) return "last";
    if (idx === 1) return "second";
    return "middle";
  }

  // ---- highlighting -------------------------------------------------------

  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Wrap matched author names inside the authors element with an inline pill.
  function decorateAuthorNames(authorsEl, tokens, matches) {
    if (!authorsEl || authorsEl.dataset.slPills) return;
    // Build a regex of matched display names to wrap, longest first to avoid
    // partial overlaps.
    const wanted = matches
      .map((m) => ({ name: tokens[m.idx].name, color: m.color }))
      .sort((x, y) => y.name.length - x.name.length);
    if (!wanted.length) return;

    let html = authorsEl.innerHTML;
    for (const w of wanted) {
      const esc = w.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(" + esc + ")", "g");
      const style =
        `background:${hexToRgba(w.color, 0.12)};color:${w.color};`;
      html = html.replace(
        re,
        `<span class="scholar-lens-author" style="${style}">$1</span>`
      );
    }
    authorsEl.innerHTML = html;
    authorsEl.dataset.slPills = "1";
  }

  function badgeClassFor(tier) {
    switch (tier) {
      case "A*": return "badge-a-star";
      case "A": return "badge-a";
      case "B": return "badge-b";
      case "C": return "badge-c";
      case "Q1": return "badge-q1";
      case "Q2": return "badge-q2";
      case "Q3": return "badge-q3";
      case "Q4": return "badge-q4";
      default: return "badge-c";
    }
  }

  function makeBadge(label, tier, title) {
    const span = document.createElement("span");
    span.className = "scholar-lens-badge " + badgeClassFor(tier);
    span.textContent = label;
    span.title = title;
    return span;
  }

  // Append venue badges to the venue element based on resolved rating + the
  // user's badge toggles.
  function applyVenueBadges(venueEl, rating) {
    if (!venueEl || venueEl.dataset.slBadged) return;
    venueEl.dataset.slBadged = "1";
    const container = document.createElement("span");
    container.className = "scholar-lens-badges";

    if (settings.badges.conference && rating.core) {
      container.appendChild(
        makeBadge("CORE " + rating.core, rating.core, "CORE conference rank: " + rating.core)
      );
    }
    if (settings.badges.journal && rating.sjr) {
      container.appendChild(
        makeBadge(rating.sjr, rating.sjr, "SJR journal quartile: " + rating.sjr)
      );
    }
    if (settings.badges.ccf && rating.ccf) {
      container.appendChild(
        makeBadge("CCF " + rating.ccf, rating.ccf, "CCF rank: " + rating.ccf)
      );
    }
    if (container.children.length) venueEl.appendChild(container);
  }

  function lookupVenue(raw) {
    if (venueCache.has(raw)) return venueCache.get(raw);
    const p = new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "LOOKUP_VENUE", venue: raw }, (resp) => {
          if (chrome.runtime.lastError || !resp) {
            resolve({ core: null, ccf: null, sjr: null });
          } else {
            resolve(resp);
          }
        });
      } catch (e) {
        resolve({ core: null, ccf: null, sjr: null });
      }
    });
    venueCache.set(raw, p);
    return p;
  }

  // Apply the role highlight class for each matched author, gated solely by
  // `settings.roles` (the injected panel's checkboxes, persisted). Each role
  // maps to a fixed accent color + soft tint in CSS, so highlighting reads
  // consistently regardless of which author matched. Middle authors (3rd+
  // position) are deliberately never highlighted to keep the page calm — only
  // first, co-first, second, and last positions stand out.
  function applyRoleBorders(cardEl, matches) {
    let highlighted = false;
    for (const m of matches) {
      if (m.role === "first" && settings.roles.first) {
        cardEl.classList.add("scholar-lens-first-author");
        highlighted = true;
      } else if (m.role === "cofirst" && settings.roles.cofirst) {
        cardEl.classList.add("scholar-lens-cofirst-author");
        highlighted = true;
      } else if (m.role === "last" && settings.roles.last) {
        cardEl.classList.add("scholar-lens-last-author");
        highlighted = true;
      } else if (m.role === "second" && settings.roles.second) {
        cardEl.classList.add("scholar-lens-second-author");
        highlighted = true;
      }
    }
    return highlighted;
  }

  // ---- auto-detect page author -------------------------------------------

  // On a Scholar profile page (/citations?user=...), extract the author's name
  // from the page header so we can highlight their papers without requiring the
  // user to manually add themselves.
  function detectPageAuthor() {
    const nameEl = document.querySelector("#gsc_prf_in");
    if (!nameEl) return null;
    const name = nameEl.textContent.trim();
    if (!name) return null;
    return { id: "__page__", label: name, name, alternates: [], color: "blue" };
  }

  // Return the effective author list: tracked authors from settings, or the
  // auto-detected page author if no tracked authors are configured.
  function getActiveAuthors() {
    if (settings.authors && settings.authors.length) return settings.authors;
    const page = detectPageAuthor();
    return page ? [page] : [];
  }

  // ---- entry processing ---------------------------------------------------

  // A "paper entry" view abstracts the two Scholar layouts: it exposes the
  // card element to border, the authors element, and the venue text + element.
  function profileEntries() {
    return Array.from(document.querySelectorAll("tr.gsc_a_tr")).map((tr) => {
      const grays = tr.querySelectorAll("td.gsc_a_t .gs_gray");
      const citeText = (tr.querySelector("td.gsc_a_c") || {}).textContent || "";
      const citations = parseInt(citeText.replace(/[^0-9]/g, ""), 10) || 0;
      const yearText = (tr.querySelector("td.gsc_a_y") || {}).textContent || "";
      const yearNum = parseInt(yearText.replace(/[^0-9]/g, ""), 10);
      return {
        // Highlight the whole row so the tint spans title, cited-by and year
        // columns; the left accent bar lands on the first cell via CSS.
        card: tr,
        authorsEl: grays[0] || null,
        venueEl: grays[1] || null,
        rowEl: tr,
        citations,
        year: Number.isFinite(yearNum) ? yearNum : null
      };
    });
  }

  function searchEntries() {
    return Array.from(document.querySelectorAll(".gs_r .gs_ri, .gs_ri")).map((ri) => {
      const a = ri.querySelector(".gs_a");
      return { card: ri, authorsEl: a, venueEl: a, isSearch: true };
    });
  }

  // For search results the .gs_a element holds "Authors - Venue - Year".
  // Return { authorsText, venueText } by splitting on the dash separators.
  function splitSearchMeta(text) {
    const parts = text.split(/\s[–—-]\s/);
    return {
      authorsText: parts[0] || "",
      venueText: parts.length > 1 ? parts[1] : ""
    };
  }

  function processEntry(entry) {
    if (!entry.card || entry.card.dataset.slDone) return;
    if (!entry.authorsEl) return;
    entry.card.dataset.slDone = "1";

    let authorsText, venueText;
    if (entry.isSearch) {
      const meta = splitSearchMeta(entry.authorsEl.textContent || "");
      authorsText = meta.authorsText;
      venueText = meta.venueText;
    } else {
      authorsText = entry.authorsEl.textContent || "";
      venueText = entry.venueEl ? entry.venueEl.textContent || "" : "";
    }

    const { tokens, truncated } = parseAuthors(authorsText);

    // Match each active author against the list; record best (earliest) role.
    const matches = [];
    getActiveAuthors().forEach((author) => {
      const color = PALETTE[author.color] || PALETTE.blue;
      for (let i = 0; i < tokens.length; i++) {
        if (matchesAuthor(tokens[i].name, author)) {
          matches.push({ idx: i, color, role: roleFor(i, tokens, truncated), author });
          break; // one position per tracked author per paper
        }
      }
    });

    let highlighted = false;
    if (matches.length) {
      stats.authorsFound += matches.length;
      highlighted = applyRoleBorders(entry.card, matches);
      if (highlighted && panelState.nameHighlight) {
        decorateAuthorNames(entry.authorsEl, tokens, matches);
      }
      if (highlighted) stats.papersHighlighted += 1;
    }

    // Record per-row analysis for the in-page panel (profile rows only).
    if (entry.rowEl) {
      rowData.push({
        rowEl: entry.rowEl,
        highlighted,
        citations: entry.citations || 0,
        year: entry.year || null
      });
    }

    // Venue badges (independent of author matches).
    if (venueText && (settings.badges.conference || settings.badges.journal || settings.badges.ccf)) {
      lookupVenue(venueText).then((rating) => {
        if (rating && (rating.core || rating.sjr || rating.ccf)) {
          applyVenueBadges(entry.venueEl || entry.authorsEl, rating);
        }
      });
    }
  }

  // Strip every highlight decoration applied by a previous run so a re-run
  // (settings change, panel toggle) starts from a clean slate.
  function clearDecorations() {
    const hlClasses = [
      "scholar-lens-first-author", "scholar-lens-cofirst-author",
      "scholar-lens-last-author", "scholar-lens-second-author"
    ];
    document.querySelectorAll(
      "." + hlClasses.join(",.")
    ).forEach((el) => {
      hlClasses.forEach((c) => el.classList.remove(c));
      el.style.removeProperty("--sl-left-color");
      el.style.removeProperty("--sl-right-color");
      el.style.removeProperty("--sl-cofirst-color");
      el.style.removeProperty("--sl-tint");
      el.style.removeProperty("--sl-tint-strong");
    });
    document.querySelectorAll(".scholar-lens-author").forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
      }
    });
    document.querySelectorAll("[data-sl-pills]").forEach((el) => {
      delete el.dataset.slPills;
    });
    // Remove venue badges too so toggling a badge off clears existing ones.
    document.querySelectorAll(".scholar-lens-badges").forEach((el) => el.remove());
    document.querySelectorAll("[data-sl-badged]").forEach((el) => {
      delete el.dataset.slBadged;
    });
  }

  function processAll() {
    stats = { authorsFound: 0, papersHighlighted: 0 };
    rowData = [];
    pauseObserver(() => {
      clearDecorations();
      // Reset dedup markers so re-runs (settings change) re-evaluate.
      document.querySelectorAll("[data-sl-done]").forEach((el) => {
        delete el.dataset.slDone;
      });
      const entries = [...profileEntries(), ...searchEntries()];
      entries.forEach(processEntry);
    });
    publishStats();
    syncPanel();
    applyFilters();
  }

  function processNew() {
    pauseObserver(() => {
      const entries = [...profileEntries(), ...searchEntries()];
      entries.forEach(processEntry);
    });
    publishStats();
    syncPanel();
    applyFilters();
  }

  function publishStats() {
    try {
      chrome.runtime.sendMessage({
        type: "PAGE_STATS",
        stats: {
          authorsFound: stats.authorsFound,
          papersHighlighted: stats.papersHighlighted
        }
      });
    } catch (e) { /* popup may be closed */ }
  }

  // The popup may request the latest stats directly.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "GET_PAGE_STATS") {
      sendResponse({
        authorsFound: stats.authorsFound,
        papersHighlighted: stats.papersHighlighted
      });
    }
    if (msg && msg.type === "SETTINGS_UPDATED") {
      loadAndRun();
    }
  });

  // ---- styles -------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById("scholar-lens-style")) return;
    const css = `
      .scholar-lens-author {
        display: inline-flex; align-items: center;
        padding: 1px 5px; border-radius: 4px;
        font-weight: 600; font-size: 0.92em; line-height: 1.4;
      }
      .scholar-lens-badges { display: inline-flex; gap: 4px; margin-left: 6px; vertical-align: middle; }
      .scholar-lens-badge {
        display: inline-flex; align-items: center;
        padding: 1px 6px; border-radius: 5px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.02em;
        line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      }
      .badge-a-star, .badge-q1 { background: #1A73E8; color: #fff; }
      .badge-a, .badge-q2 { background: #34C759; color: #fff; }
      .badge-b, .badge-q3 { background: #FF9500; color: #fff; }
      .badge-c, .badge-q4 { background: transparent; border: 1px solid #8E8E93; color: #8E8E93; }

      /* Highlighted paper rows: a soft solid background fill spanning the whole
         row (title, cited-by and year columns) plus a single thin accent bar on
         the left edge. No dotted borders — they read as page chrome.
         The class sits on the <tr> (profile) or .gs_ri (search). For the table
         layout the fill must land on the <td> cells (a <tr> background doesn't
         paint over cells), and the bar on the first cell only. */
      /* Four distinct hues so roles are told apart at a glance — first (blue),
         co-first (purple), second (amber), last (green). The legend dots in the
         panel mirror these exactly. */
      tr.scholar-lens-first-author > td   { background: rgba(26,115,232,0.13) !important; }
      tr.scholar-lens-cofirst-author > td { background: rgba(161,66,244,0.13) !important; }
      tr.scholar-lens-second-author > td  { background: rgba(249,171,0,0.13) !important; }
      tr.scholar-lens-last-author > td    { background: rgba(30,142,62,0.13) !important; }

      .gs_ri.scholar-lens-first-author    { background: rgba(26,115,232,0.13) !important; }
      .gs_ri.scholar-lens-cofirst-author  { background: rgba(161,66,244,0.13) !important; }
      .gs_ri.scholar-lens-second-author   { background: rgba(249,171,0,0.13) !important; }
      .gs_ri.scholar-lens-last-author     { background: rgba(30,142,62,0.13) !important; }

      /* Left accent bar (4px) — first cell for the table, the block for search */
      tr.scholar-lens-first-author > td:first-child,
      .gs_ri.scholar-lens-first-author    { box-shadow: inset 4px 0 0 #1A73E8 !important; }
      tr.scholar-lens-cofirst-author > td:first-child,
      .gs_ri.scholar-lens-cofirst-author  { box-shadow: inset 4px 0 0 #A142F4 !important; }
      tr.scholar-lens-second-author > td:first-child,
      .gs_ri.scholar-lens-second-author   { box-shadow: inset 4px 0 0 #F9AB00 !important; }
      tr.scholar-lens-last-author > td:first-child,
      .gs_ri.scholar-lens-last-author     { box-shadow: inset 4px 0 0 #1E8E3E !important; }

      /* ---- Injected control panel — matches Scholar's native sidebar card ----
         All declarations are scoped under #scholar-lens-panel and most reset
         Scholar's inherited input/button/label styles, which otherwise bleed in
         (giant gray buttons, oversized checkboxes). */
      #scholar-lens-panel {
        --sl-bg: #fff;
        --sl-text: #202124;
        --sl-muted: #5f6368;
        --sl-faint: #80868b;
        --sl-divider: #ebebeb;
        --sl-blue: #1a0dab;
        background: var(--sl-bg);
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        margin-bottom: 16px;
        font-family: Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: var(--sl-text);
        -webkit-font-smoothing: antialiased;
        overflow: hidden;
      }
      #scholar-lens-panel * {
        box-sizing: border-box;
        font-family: Arial, sans-serif;
      }
      /* No dark-mode variant: Google Scholar renders light regardless of the
         OS appearance, so the panel stays light to match the page. */
      /* Header */
      #scholar-lens-panel .sl-title {
        display: flex; align-items: center; gap: 6px;
        padding: 11px 16px;
        border-bottom: 1px solid var(--sl-divider);
      }
      #scholar-lens-panel .sl-title-label {
        font-size: 14px; font-weight: 700; color: var(--sl-blue);
        flex: 1; line-height: 1.2; letter-spacing: 0.01em;
      }
      #scholar-lens-panel .sl-icon-btn {
        background: none; border: none; cursor: pointer;
        width: 22px; height: 22px; padding: 0; margin: 0;
        color: var(--sl-faint);
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: 5px; transition: color .12s, background .12s;
      }
      #scholar-lens-panel .sl-icon-btn:hover { color: var(--sl-text); background: rgba(0,0,0,0.06); }
      #scholar-lens-panel .sl-collapse-txt {
        font-size: 17px; line-height: 1; font-weight: 600;
      }
      /* Collapsed */
      #scholar-lens-panel.sl-collapsed .sl-section { display: none; }
      /* Sections — generous left/right padding so content clears the border */
      #scholar-lens-panel .sl-section {
        padding: 11px 16px;
        border-bottom: 1px solid var(--sl-divider);
      }
      #scholar-lens-panel .sl-section:last-child { border-bottom: none; }
      /* Role checkboxes — "Highlight:" label then flowing checks with color dots */
      #scholar-lens-panel .sl-roles {
        display: flex; flex-wrap: wrap; align-items: center; gap: 7px 13px;
      }
      #scholar-lens-panel .sl-roles-label {
        font-weight: 700; color: var(--sl-text); margin-right: 1px;
      }
      #scholar-lens-panel .sl-check {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 13px; color: var(--sl-text); cursor: pointer;
        white-space: nowrap; margin: 0; font-weight: 400;
      }
      #scholar-lens-panel .sl-dot {
        width: 9px; height: 9px; border-radius: 2.5px; flex-shrink: 0;
        margin-left: -1px;
      }
      #scholar-lens-panel input[type="checkbox"] {
        -webkit-appearance: checkbox; appearance: auto;
        width: 14px; height: 14px; margin: 0; padding: 0;
        accent-color: #1a73e8; cursor: pointer; flex-shrink: 0;
        vertical-align: middle; position: static; opacity: 1;
      }
      /* Option rows: label left, checkbox right */
      #scholar-lens-panel .sl-opt-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 4px 0;
      }
      #scholar-lens-panel .sl-opt-row > span { font-weight: 700; color: var(--sl-text); }
      /* Year filter */
      #scholar-lens-panel .sl-year {
        display: flex; align-items: center; gap: 7px;
        margin-top: 8px;
      }
      #scholar-lens-panel .sl-year > span:first-child { font-weight: 700; color: var(--sl-text); }
      #scholar-lens-panel select {
        font-family: Arial, sans-serif; font-size: 12px;
        border: 1px solid #d0d0d0; border-radius: 5px;
        padding: 3px 20px 3px 8px; margin: 0; height: auto;
        background: var(--sl-bg); color: var(--sl-text);
        cursor: pointer; -webkit-appearance: none; appearance: none;
        transition: border-color .12s;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%239aa0a6' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 6px center;
      }
      #scholar-lens-panel select:hover { border-color: #9aa0a6; }
      /* Metrics */
      #scholar-lens-panel .sl-metrics-title {
        font-size: 14px; font-weight: 700; color: var(--sl-blue);
        margin-bottom: 8px; letter-spacing: 0.01em;
      }
      #scholar-lens-panel .sl-metric-row {
        display: flex; justify-content: space-between; align-items: baseline;
        padding: 3px 0;
      }
      #scholar-lens-panel .sl-metric-row > span:first-child {
        font-weight: 700; color: var(--sl-text);
      }
      #scholar-lens-panel .sl-metric-val {
        font-variant-numeric: tabular-nums;
      }
      #scholar-lens-panel .sl-val-hi { font-weight: 700; color: var(--sl-text); font-size: 14px; }
      #scholar-lens-panel .sl-val-sep,
      #scholar-lens-panel .sl-val-total { color: var(--sl-faint); }
      #scholar-lens-panel .sl-val-sep { margin: 0 3px; }
    `;
    const style = document.createElement("style");
    style.id = "scholar-lens-style";
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  // ---- in-page control panel ---------------------------------------------

  // Compute the h-index for a list of citation counts: the largest h such that
  // at least h papers have >= h citations.
  function hIndex(citationsList) {
    const sorted = [...citationsList].sort((a, b) => b - a);
    let h = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] >= i + 1) h = i + 1;
      else break;
    }
    return h;
  }

  // Compute Papers / Citations / h-index / i10-index over the highlighted subset
  // and the full set of profile rows.
  function computeMetrics() {
    const all = rowData;
    const hi = all.filter((r) => r.highlighted);
    const sum = (rows) => rows.reduce((acc, r) => acc + r.citations, 0);
    const i10 = (rows) => rows.filter((r) => r.citations >= 10).length;
    return {
      papers: { hi: hi.length, total: all.length },
      citations: { hi: sum(hi), total: sum(all) },
      h: { hi: hIndex(hi.map((r) => r.citations)), total: hIndex(all.map((r) => r.citations)) },
      i10: { hi: i10(hi), total: i10(all) }
    };
  }

  // Hide profile rows that are filtered out: when "show only highlighted" is on,
  // non-highlighted rows; and any row whose year falls outside [yearStart, yearEnd].
  function applyFilters() {
    rowData.forEach((r) => {
      let hide = false;
      if (panelState.showOnlyHighlighted && !r.highlighted) hide = true;
      if (r.year != null) {
        if (panelState.yearStart != null && r.year < panelState.yearStart) hide = true;
        if (panelState.yearEnd != null && r.year > panelState.yearEnd) hide = true;
      }
      r.rowEl.style.display = hide ? "none" : "";
    });
  }

  // Build (once) the panel DOM and insert it at the top of the right sidebar.
  // Returns the panel element, or null when there is no sidebar (search pages).
  function ensurePanel() {
    let panel = document.getElementById("scholar-lens-panel");
    if (panel) return panel;
    const sidebar = document.querySelector(".gsc_rsb");
    if (!sidebar) return null;

    panel = document.createElement("div");
    panel.id = "scholar-lens-panel";
    const metricRow = (label, valCls, totCls) =>
      `<div class="sl-metric-row"><span>${label}</span>` +
      `<span class="sl-metric-val">` +
      `<span class="sl-val-hi ${valCls}">0</span>` +
      `<span class="sl-val-sep">of</span>` +
      `<span class="sl-val-total ${totCls}">0</span>` +
      `</span></div>`;
    // Each role's legend dot mirrors the row-highlight color so the checkbox
    // doubles as a color key.
    const roleCheck = (role, label, dot) =>
      `<label class="sl-check">` +
      `<input type="checkbox" data-role="${role}"${settings.roles[role] ? " checked" : ""}>` +
      `<span class="sl-dot" style="background:${dot}"></span>` +
      `${label}</label>`;
    const badgeCheck = (key, label) =>
      `<label class="sl-check">` +
      `<input type="checkbox" data-badge="${key}"${settings.badges[key] ? " checked" : ""}>` +
      `${label}</label>`;
    panel.innerHTML = `
      <div class="sl-title">
        <span class="sl-title-label">Author Highlighter</span>
        <button type="button" class="sl-icon-btn sl-collapse" title="Collapse"><span class="sl-collapse-txt">−</span></button>
      </div>
      <div class="sl-section">
        <div class="sl-roles">
          <span class="sl-roles-label">Highlight:</span>
          ${roleCheck("first", "First", "#1A73E8")}
          ${roleCheck("cofirst", "Co-First", "#A142F4")}
          ${roleCheck("second", "Second", "#F9AB00")}
          ${roleCheck("last", "Last", "#1E8E3E")}
        </div>
      </div>
      <div class="sl-section">
        <div class="sl-roles">
          <span class="sl-roles-label">Venue:</span>
          ${badgeCheck("conference", "Conference")}
          ${badgeCheck("journal", "Journal")}
          ${badgeCheck("ccf", "CCF")}
        </div>
      </div>
      <div class="sl-section">
        <div class="sl-opt-row">
          <span>Show only highlighted:</span>
          <input type="checkbox" class="sl-only">
        </div>
        <div class="sl-opt-row">
          <span>Highlight author name:</span>
          <input type="checkbox" class="sl-name">
        </div>
        <div class="sl-year">
          <span>Year:</span>
          <select class="sl-year-start"></select>
          <span>–</span>
          <select class="sl-year-end"></select>
        </div>
      </div>
      <div class="sl-section">
        <div class="sl-metrics-title">Highlighted Papers Metrics</div>
        ${metricRow("Papers:", "sl-m-papers", "sl-t-papers")}
        ${metricRow("Citations:", "sl-m-cites", "sl-t-cites")}
        ${metricRow("h-index:", "sl-m-h", "sl-t-h")}
        ${metricRow("i10-index:", "sl-m-i10", "sl-t-i10")}
      </div>
    `;
    sidebar.insertBefore(panel, sidebar.firstChild);
    wirePanel(panel);
    return panel;
  }

  function wirePanel(panel) {
    panel.querySelectorAll("input[data-role]").forEach((cb) => {
      cb.addEventListener("change", () => {
        settings.roles[cb.dataset.role] = cb.checked;
        saveSettings();
        processAll();
      });
    });
    panel.querySelectorAll("input[data-badge]").forEach((cb) => {
      cb.addEventListener("change", () => {
        settings.badges[cb.dataset.badge] = cb.checked;
        saveSettings();
        processAll();
      });
    });
    panel.querySelector(".sl-only").addEventListener("change", (e) => {
      panelState.showOnlyHighlighted = e.target.checked;
      applyFilters();
      syncPanel();
    });
    panel.querySelector(".sl-name").addEventListener("change", (e) => {
      panelState.nameHighlight = e.target.checked;
      processAll();
    });
    panel.querySelector(".sl-year-start").addEventListener("change", (e) => {
      const v = parseInt(e.target.value, 10);
      panelState.yearStart = Number.isFinite(v) ? v : null;
      applyFilters();
    });
    panel.querySelector(".sl-year-end").addEventListener("change", (e) => {
      const v = parseInt(e.target.value, 10);
      panelState.yearEnd = Number.isFinite(v) ? v : null;
      applyFilters();
    });
    const collapseBtn = panel.querySelector(".sl-collapse");
    if (collapseBtn) {
      const glyph = collapseBtn.querySelector(".sl-collapse-txt");
      // Restore collapsed state from localStorage
      if (localStorage.getItem("scholar-lens-collapsed") === "1") {
        panel.classList.add("sl-collapsed");
        if (glyph) glyph.textContent = "+";
      }
      collapseBtn.addEventListener("click", () => {
        const collapsed = panel.classList.toggle("sl-collapsed");
        if (glyph) glyph.textContent = collapsed ? "+" : "−";
        localStorage.setItem("scholar-lens-collapsed", collapsed ? "1" : "0");
      });
    }
  }

  // Populate the year dropdowns from the years present in rowData, preserving
  // any current selection.
  function populateYears(panel) {
    const years = Array.from(
      new Set(rowData.map((r) => r.year).filter((y) => y != null))
    ).sort((a, b) => b - a);
    const startSel = panel.querySelector(".sl-year-start");
    const endSel = panel.querySelector(".sl-year-end");
    const opts = (placeholder) =>
      `<option value="">${placeholder}</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");
    startSel.innerHTML = opts("Start");
    endSel.innerHTML = opts("End");
    startSel.value = panelState.yearStart != null ? String(panelState.yearStart) : "";
    endSel.value = panelState.yearEnd != null ? String(panelState.yearEnd) : "";
  }

  // Refresh panel controls + metrics to reflect current state.
  function syncPanel() {
    const panel = ensurePanel();
    if (!panel) return;
    panel.querySelectorAll("input[data-role]").forEach((cb) => {
      cb.checked = !!settings.roles[cb.dataset.role];
    });
    panel.querySelectorAll("input[data-badge]").forEach((cb) => {
      cb.checked = !!settings.badges[cb.dataset.badge];
    });
    panel.querySelector(".sl-only").checked = panelState.showOnlyHighlighted;
    panel.querySelector(".sl-name").checked = panelState.nameHighlight;
    populateYears(panel);

    const fmt = (n) => n.toLocaleString("en-US");
    const m = computeMetrics();
    const set = (sel, v) => { const el = panel.querySelector(sel); if (el) el.textContent = fmt(v); };
    set(".sl-m-papers", m.papers.hi); set(".sl-t-papers", m.papers.total);
    set(".sl-m-cites", m.citations.hi); set(".sl-t-cites", m.citations.total);
    set(".sl-m-h", m.h.hi); set(".sl-t-h", m.h.total);
    set(".sl-m-i10", m.i10.hi); set(".sl-t-i10", m.i10.total);
  }

  // ---- bootstrap ----------------------------------------------------------

  function loadAndRun() {
    chrome.storage.sync.get("settings", (data) => {
      settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
      settings.badges = Object.assign({}, DEFAULT_SETTINGS.badges, (data.settings || {}).badges);
      settings.roles = Object.assign({}, DEFAULT_SETTINGS.roles, (data.settings || {}).roles);
      settings.authors = (data.settings && data.settings.authors) || [];
      processAll();
    });
  }

  function start() {
    injectStyles();
    loadAndRun();

    // Scholar's "Show more" button appends new <tr> rows directly into
    // .gsc_a_tbody. Observe that table body (childList) so those rows are
    // processed; fall back to broader roots on search pages.
    observer = new MutationObserver((mutations) => {
      let added = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) { added = true; break; }
      }
      if (added) processNew();
    });
    const tbody = document.querySelector(".gsc_a_tbody");
    if (tbody) observerTargets.push({ node: tbody, opts: { childList: true } });
    const fallback =
      document.querySelector("#gsc_a_b") ||
      document.querySelector("#gs_res_ccl") ||
      document.body;
    if (fallback && fallback !== tbody) {
      observerTargets.push({ node: fallback, opts: { childList: true, subtree: true } });
    }
    connectObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
