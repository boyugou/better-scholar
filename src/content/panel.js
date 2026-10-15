// The summary panel injected into the Scholar profile page. Pure view: it renders a model handed to
// update() and reports user intent through callbacks — it owns no application state beyond which
// disclosure widgets are open. What it shows at all is decided on the settings page (model.prefs); the
// panel only keeps the quick, per-visit controls: the ranking tab, the filters, the clickable counts.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const { h, t, tn, issueUrl } = B.dom;

  const ROLE_COLOR = { first: "var(--rr-c-first, #1a73e8)", cofirst: "var(--rr-c-cofirst, #a142f4)", second: "var(--rr-c-second, #f9ab00)", last: "var(--rr-c-last, #1e8e3e)", middle: "#9aa0a6", hidden: "#dadce0" };
  const MARK_KEY = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight", "spotlight+highlight": "markSpotlightHighlight", "oral+spotlight+highlight": "markTalks" };
  const ROLE_KEY = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast", middle: "roleMiddle", hidden: "roleHidden" };

  const sameSel = (a, b) => !!a && !!b && a.role === b.role && a.tier === b.tier;
  const dot = (role) => h("span", { class: "rr-dot", style: "background:" + ROLE_COLOR[role] });

  // A drop-down that looks like the rest of the panel instead of the system's menu: a button showing the choice, a list
  // under it (placed with fixed coordinates so the panel's own overflow cannot clip it), arrow keys, Escape and a click outside to close.
  //   dd.setOptions([{ value, label }], value)  ·  dd.value  ·  dd.el (the button)  ·  dd.list (the popup; lives next to the button)
  function dropdown(act, placeholder, onChange) {
    let options = [], value = "", open = false, active = -1, lastSig = "";
    const label = h("span", { class: "rr-dd-label" });
    const el = h("button", { class: "rr-dd", type: "button", "data-act": act, "aria-haspopup": "listbox", "aria-expanded": "false" }, label, h("span", { class: "rr-dd-caret", "aria-hidden": "true" }));
    const list = h("ul", { class: "rr-dd-list", role: "listbox", tabindex: "-1", hidden: true });
    const items = () => [...list.children];
    const draw = () => {
      const cur = options.find((o) => o.value === value);
      label.textContent = cur && cur.value !== "" ? cur.label : placeholder;
      el.classList.toggle("rr-dd-set", !!(cur && cur.value !== ""));
      list.replaceChildren(...options.map((o, i) => h("li", { role: "option", tabindex: "-1", "data-value": o.value, "aria-selected": String(o.value === value),
        onClick: () => choose(i) }, o.label)));
    };
    const focusItem = (i) => { active = Math.max(0, Math.min(options.length - 1, i)); const li = items()[active]; if (li) { li.focus(); li.scrollIntoView({ block: "nearest" }); } };
    const close = (back) => {
      if (!open) return;
      open = false; list.hidden = true; el.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", close); window.removeEventListener("scroll", onScroll, true);
      if (back) el.focus();
    };
    const onScroll = (e) => { if (!list.contains(e.target)) close(false); };          // (scrolling the list itself — arrow keys on a long one — must not close it)
    const outside = (e) => { if (!list.contains(e.target) && !el.contains(e.target)) close(false); };
    const show = () => {
      if (open || !options.length) return;
      open = true; list.hidden = false; el.setAttribute("aria-expanded", "true");
      const r = el.getBoundingClientRect(), room = window.innerHeight - r.bottom - 12, up = room < 150 && r.top > room;
      list.style.minWidth = Math.max(r.width, 84) + "px";
      list.style.left = Math.min(r.left, Math.max(8, window.innerWidth - 120)) + "px";
      list.style.maxHeight = Math.max(120, Math.min(260, up ? r.top - 12 : room)) + "px";
      if (up) { list.style.top = ""; list.style.bottom = (window.innerHeight - r.top + 4) + "px"; } else { list.style.bottom = ""; list.style.top = (r.bottom + 4) + "px"; }
      document.addEventListener("pointerdown", outside, true); window.addEventListener("resize", close); window.addEventListener("scroll", onScroll, true);
      focusItem(Math.max(0, options.findIndex((o) => o.value === value)));
    };
    const choose = (i) => { const o = options[i]; if (!o) return; const changed = o.value !== value; value = o.value; draw(); close(true); if (changed) onChange(value); };
    el.addEventListener("click", () => (open ? close(true) : show()));
    el.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); show(); } });
    list.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "Escape") { e.preventDefault(); close(true); }
      else if (k === "ArrowDown") { e.preventDefault(); focusItem(active + 1); }
      else if (k === "ArrowUp") { e.preventDefault(); focusItem(active - 1); }
      else if (k === "Home") { e.preventDefault(); focusItem(0); }
      else if (k === "End") { e.preventDefault(); focusItem(options.length - 1); }
      else if (k === "Enter" || k === " ") { e.preventDefault(); choose(active); }
      else if (k === "Tab") close(false);
    });
    return {
      el, list,
      get value() { return value; },
      setOptions(opts, v) { const sig = JSON.stringify([opts, v]); if (sig === lastSig) return; lastSig = sig; options = opts; value = v; draw(); }
    };
  }

  function create(cb) {
    const ui = { flash: null };

    // ---- skeleton --------------------------------------------------------
    const title = h("span", { class: "rr-title" }, t("extShortName"));
    const settingsBtn = h("button", { class: "rr-icon rr-ico-settings", "data-act": "settings", type: "button", title: t("settingsOpen"), "aria-label": t("settingsOpen"), onClick: () => cb.onSettings() });
    const collapseBtn = h("button", { class: "rr-icon rr-ico-caret", "data-act": "collapse", type: "button", onClick: () => cb.onCollapse() });
    const head = h("header", { class: "rr-head" }, title, settingsBtn, collapseBtn);

    const summaryHead = h("div", { class: "rr-sec-head" });
    const matrixBox = h("div", { "data-rr": "matrix" });
    // where the ranks in the table come from: under the table, next to what it explains
    const noteBox = h("div", { class: "rr-faint rr-note-src", "data-rr": "note" });
    const summarySec = h("div", { class: "rr-sec rr-summary" }, summaryHead, matrixBox, noteBox);
    // the copy row: one button for each format that is switched on (the settings' copy.*), whether or not the table is shown
    const actions = h("div", { class: "rr-actions rr-copybar" });
    const copySec = h("div", { class: "rr-sec rr-copy", "data-rr": "export-row" }, actions);

    // Awards & talks: one row per group that occurs; the section is absent when nothing qualifies
    const marksRows = h("div", { class: "rr-markrows" });
    const marksSec = h("div", { class: "rr-sec rr-marks", "data-rr": "marks", hidden: true },
      h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title", title: t("marksHint") }, t("marksTitle"))), marksRows);

    // the status lines are drawn again with every update; the list of unrecognised venues keeps its own slot and is only rebuilt when its content changes
    // (so that a person reading it, or focused in it, is not interrupted by papers arriving)
    const coverTop = h("div", { class: "rr-cover-top" });
    const coverList = h("div", { class: "rr-cover-list" });
    const coverSec = h("div", { class: "rr-sec rr-cover", "data-rr": "coverage" }, coverTop, coverList);

    // filters (built once, synced on update)
    const queryInput = h("input", { type: "search", class: "rr-search-input", "data-act": "filter-query", placeholder: t("filterPlaceholder"), "aria-label": t("filterPlaceholder"), maxlength: "500",
      role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "rr-suggest" });
    const searchCount = h("span", { class: "rr-search-count", "data-rr": "search-count", hidden: true, "aria-live": "polite" });
    const kbdHint = h("kbd", { class: "rr-search-kbd", "aria-hidden": "true", title: t("searchShortcut") + " · " + B.query.OPERATORS.map((o) => o.example).join(" · "), onClick: () => {
      queryInput.focus();
      openPopularSuggestions();
    } }, "/");

    // Autocomplete / suggestion popover for search operators
    const suggestList = h("ul", { class: "rr-search-suggest", id: "rr-suggest", role: "listbox", "aria-label": t("filterPlaceholder"), hidden: true });

    // the operators of lib/query.js, in the panel's own words (the group's name is the column it filters: Year, CCF, Role …)
    const OP_GROUP = { cites: "cite", year: "year", ccf: "tier", core: "tier", role: "author", has: "mark" };
    const OP_TAG = { cites: "tsvCitations", year: "tsvYear", ccf: "srcCcf", core: "srcCore", role: "tsvRole", has: "tsvAwards" };
    const OP_DESC = { "role:first": "roleFirst", "role:cofirst": "roleCofirst", "role:second": "roleSecond", "role:last": "roleLast", "has:award": "markAward", "has:talk": "markTalks" };
    const OPERATOR_ITEMS = B.query.OPERATORS.flatMap((o) => o.suggest.map((op) => ({ op, name: o.name, group: OP_GROUP[o.name], tag: t(OP_TAG[o.name]), desc: OP_DESC[op] ? t(OP_DESC[op]) : "" })));

    let activeSuggestIdx = -1;
    let currentSuggestions = [];

    function closeSuggest() {
      suggestList.hidden = true;
      activeSuggestIdx = -1;
      currentSuggestions = [];
      suggestList.replaceChildren();
      queryInput.setAttribute("aria-expanded", "false");
      queryInput.removeAttribute("aria-activedescendant");
      window.removeEventListener("resize", closeSuggest);
      window.removeEventListener("scroll", closeSuggest, true);
    }

    function highlightSuggestItem(idx) {
      const items = [...suggestList.children];
      items.forEach((el, i) => {
        const isSel = i === idx;
        el.classList.toggle("rr-suggest-active", isSel);
        el.setAttribute("aria-selected", String(isSel));
        if (isSel) { el.scrollIntoView({ block: "nearest" }); queryInput.setAttribute("aria-activedescendant", el.id); }
      });
      if (idx < 0) queryInput.removeAttribute("aria-activedescendant");
    }

    function getCurrentWordInfo() {
      const val = queryInput.value;
      const end = queryInput.selectionEnd != null ? queryInput.selectionEnd : val.length;
      let start = end;
      while (start > 0 && !/\s/.test(val[start - 1])) start--;                 // (a scan back from the caret: a pattern anchored at the end is slow on a long line)
      return { word: val.slice(start, end), start, end };
    }

    function applySuggestion(item) {
      if (!item) return;
      const val = queryInput.value;
      const { word, start, end } = getCurrentWordInfo();
      let next;
      if (word) {
        next = val.slice(0, start) + item.op + " " + val.slice(end);
      } else {
        next = (val.trim() ? val.trim() + " " : "") + item.op + " ";
      }
      queryInput.value = next.replace(/\s+/g, " ");
      syncSearchUI();
      cb.onQuery(queryInput.value);
      closeSuggest();
      queryInput.focus();
    }

    function renderSuggestions() {
      activeSuggestIdx = -1;
      suggestList.hidden = false;
      queryInput.setAttribute("aria-expanded", "true");
      placeSuggest();
      suggestList.replaceChildren(...currentSuggestions.map((item, n) => {
        const catBadge = h("span", { class: `rr-suggest-cat rr-scat-${item.group}` }, item.tag);
        const opCode = h("code", { class: "rr-suggest-op" }, item.op);
        const descText = h("span", { class: "rr-suggest-desc" }, item.desc);
        return h("li", {
          class: "rr-suggest-item",
          id: "rr-suggest-" + n,
          role: "option",
          "aria-selected": "false",
          "data-op": item.op,
          onPointerdown: (e) => {
            e.preventDefault();
            applySuggestion(item);
          }
        }, catBadge, opCode, descText);
      }));
    }

    // The word at the caret begins an operator (it has its colon): offer that operator's values. An ordinary word offers nothing (ArrowDown, or the "/" hint, opens the common ones).
    function updateSuggestions() {
      const w = getCurrentWordInfo().word.toLowerCase();
      const at = w.indexOf(":");
      currentSuggestions = at < 1 ? [] : OPERATOR_ITEMS.filter((item) => item.name === w.slice(0, at) && item.op.startsWith(w));
      if (currentSuggestions.length) renderSuggestions(); else closeSuggest();
    }

    function openPopularSuggestions() {
      currentSuggestions = B.query.POPULAR.map((op) => OPERATOR_ITEMS.find((item) => item.op === op)).filter(Boolean);
      renderSuggestions();
    }

    // The list is placed with fixed coordinates, as the year lists are: the panel's own overflow cannot clip it
    function placeSuggest() {
      const r = queryInput.getBoundingClientRect();
      suggestList.style.left = r.left + "px";
      suggestList.style.minWidth = r.width + "px";
      const room = window.innerHeight - r.bottom - 12;
      suggestList.style.maxHeight = Math.max(120, Math.min(260, room)) + "px";
      suggestList.style.top = r.bottom + 4 + "px";
      window.addEventListener("resize", closeSuggest);
      window.addEventListener("scroll", closeSuggest, true);
    }

    document.addEventListener("pointerdown", (e) => {
      if (!searchRow.contains(e.target)) closeSuggest();
    }, true);

    const clearSearchBtn = h("button", { class: "rr-search-clear", type: "button", "data-act": "clear-query", title: t("filterClear"), "aria-label": t("filterClear"), hidden: true, onClick: () => {
      closeSuggest();
      queryInput.value = "";
      syncSearchUI();
      cb.onQuery("");
      queryInput.focus();
    } }, "×");

    function toggleToken(query, token) {
      const parts = (query || "").trim().split(/\s+/).filter(Boolean);
      const idx = parts.indexOf(token);
      if (idx >= 0) parts.splice(idx, 1);
      else parts.push(token);
      return parts.join(" ");
    }
    function hasToken(query, token) {
      return (query || "").trim().split(/\s+/).filter(Boolean).includes(token);
    }

    const pillDefs = [
      { op: "ccf:a", label: "CCF A" },
      { op: "cites:>100", label: ">100" },
      { op: "role:first", label: t("roleFirst") },
      { op: "has:award", label: t("markAward") }
    ];
    const pillEls = pillDefs.map((p) => {
      const btn = h("button", {
        type: "button",
        class: "rr-spill",
        "data-op": p.op,
        "aria-pressed": "false",
        onClick: () => {
          closeSuggest();
          queryInput.value = toggleToken(queryInput.value, btn.getAttribute("data-op"));
          syncSearchUI();
          cb.onQuery(queryInput.value);
          queryInput.focus();
        }
      }, p.label);
      return { ...p, btn };
    });
    const searchPills = h("div", { class: "rr-search-pills", role: "group", "aria-label": t("optPanelFilters") },
      ...pillEls.map((p) => p.btn));

    function syncSearchUI(m) {
      const hasText = !!queryInput.value;
      clearSearchBtn.hidden = !hasText;
      kbdHint.hidden = hasText;
      pillEls.forEach((p) => {
        const op = p.btn.getAttribute("data-op");
        const active = hasToken(queryInput.value, op);
        p.btn.classList.toggle("rr-spill-active", active);
        p.btn.setAttribute("aria-pressed", String(active));
      });
      // (a query that says nothing — spaces — has no count; an operator the panel could not read says so on the box)
      const sm = m && m.searchMatch;
      if (m) {
        queryInput.setAttribute("aria-invalid", sm && sm.errors.length ? "true" : "false");
        queryInput.title = sm && sm.errors.length ? sm.errors.join("\n") : "";
      }
      if (sm) {
        searchCount.hidden = false;
        searchCount.classList.toggle("rr-search-count-empty", sm.count === 0);
        searchCount.textContent = sm.count === 0 ? "0" : (sm.cursor >= 0 ? `${sm.cursor + 1} / ${sm.count}` : String(sm.count));
      } else if (m || !hasText) {
        searchCount.hidden = true;
        searchCount.textContent = "";
      }
    }
    queryInput.addEventListener("input", () => {
      syncSearchUI();
      cb.onQuery(queryInput.value);
      updateSuggestions();
    });
    queryInput.addEventListener("search", () => {
      syncSearchUI();
      cb.onQuery(queryInput.value);
      updateSuggestions();
    });
    queryInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        if (suggestList.hidden) {
          openPopularSuggestions();
          if (currentSuggestions.length) {
            e.preventDefault();
            activeSuggestIdx = 0;
            highlightSuggestItem(0);
          }
        } else if (currentSuggestions.length) {
          e.preventDefault();
          activeSuggestIdx = (activeSuggestIdx + 1) % currentSuggestions.length;
          highlightSuggestItem(activeSuggestIdx);
        }
      } else if (e.key === "ArrowUp") {
        if (!suggestList.hidden && currentSuggestions.length) {
          e.preventDefault();
          if (activeSuggestIdx > 0) {
            activeSuggestIdx--;
            highlightSuggestItem(activeSuggestIdx);
          } else {
            activeSuggestIdx = -1;
            highlightSuggestItem(-1);
          }
        }
      } else if (e.key === "Tab") {
        // Tab takes the suggestion that was chosen with the arrows, and nothing else: it still moves on from the box
        if (!suggestList.hidden && activeSuggestIdx >= 0 && !e.shiftKey) { e.preventDefault(); applySuggestion(currentSuggestions[activeSuggestIdx]); }
        else closeSuggest();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!suggestList.hidden && activeSuggestIdx >= 0 && currentSuggestions[activeSuggestIdx]) {
          applySuggestion(currentSuggestions[activeSuggestIdx]);
        } else {
          closeSuggest();
          if (queryInput.value.trim()) cb.onSearchNext(e.shiftKey ? -1 : 1);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();                                                      // (the key is taken: the page's own Escape, which clears the filters, leaves it alone)
        if (!suggestList.hidden) { closeSuggest(); return; }                       // (first Escape: the list; the next one: the text)
        queryInput.value = "";
        syncSearchUI();
        cb.onQuery("");
        queryInput.blur();
      }
    });
    const searchRow = h("div", { class: "rr-search" }, queryInput, searchCount, kbdHint, clearSearchBtn, suggestList);

    const onlyCb = h("input", { type: "checkbox", role: "switch", "data-act": "only", onChange: (e) => cb.onOnly(e.target.checked) });
    const yearStart = dropdown("year-start", t("yearStart"), () => cb.onYear(yearStart.value, yearEnd.value));
    const yearEnd = dropdown("year-end", t("yearEnd"), () => cb.onYear(yearStart.value, yearEnd.value));
    const onlyRow = h("div", { class: "rr-row" }, h("label", { class: "rr-check" }, onlyCb, t("onlyHighlighted")));
    const filtersSec = h("div", { class: "rr-sec rr-filters", "data-rr": "filters" },
      searchRow,
      searchPills,
      onlyRow,
      h("div", { class: "rr-year" }, h("span", { class: "rr-label" }, t("yearLabel")), yearStart.el, h("span", { class: "rr-dash" }, "–"), yearEnd.el, yearStart.list, yearEnd.list));

    const metricsSec = h("div", { class: "rr-sec rr-metrics", "data-rr": "metrics" });
    const yearsSec = h("div", { class: "rr-sec rr-years", "data-rr": "years" });
    const venuesSec = h("div", { class: "rr-sec rr-venues", "data-rr": "venues" });

    // name variants (input kept stable across updates)
    const variantList = h("div", { class: "rr-variants" });
    const variantInput = h("input", { type: "text", placeholder: t("variantsPlaceholder"), "data-act": "variant-input" });
    const addVariant = () => { const v = variantInput.value.trim(); if (v) { cb.onAddVariant(v); variantInput.value = ""; } };
    variantInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addVariant(); });
    const variantBox = h("details", { "data-rr": "variants" },
      h("summary", {}, t("variantsTitle")),
      variantList,
      h("div", { class: "rr-add" }, variantInput, h("button", { class: "rr-btn", type: "button", onClick: addVariant }, t("variantAdd"))));
    const footSec = h("div", { class: "rr-sec" }, variantBox);

    const colAEl = h("div", { class: "rr-col rr-col-a" }, summarySec, copySec, marksSec);
    const colBEl = h("div", { class: "rr-col rr-col-b" }, filtersSec, metricsSec, yearsSec, venuesSec, coverSec, footSec);
    const body = h("div", { class: "rr-body" }, colAEl, colBEl);
    // a bar that says the list is filtered, by how much, and clears every filter
    const filterBar = h("div", { class: "rr-filterbar", "data-rr": "filterbar", hidden: true });
    // Scholar's page changed under us: the warning is the first thing in the panel
    const warnBar = h("div", { class: "rr-warn", "data-rr": "layout-warning", hidden: true });
    // What a screen reader is told when the panel's status changes (loading stopped, reading the full lists finished): a live region that stays in the page
    const announce = h("div", { class: "rr-sr", role: "status", "aria-live": "polite", "data-rr": "announce" });
    const el = h("section", { id: "rr-panel", "data-rr": "panel", role: "region", "aria-label": t("extName"), dir: B.dom.dir(), lang: B.dom.langTag() }, head, warnBar, filterBar, body, announce);

    // The active filters in the words the panel already uses (the cell, the awards row, the venue, the years, and "Only highlighted" when asked for);
    // used by the filter bar and by the line that says what the numbers under the filters count
    function filterParts(m, withOnly) {
      const parts = [];
      if (m.selection) {
        const srcName = m.source === "core" ? t("srcCore") : t("srcCcf");
        parts.push([m.selection.role ? t(m.selection.role === "hidden" ? "roleHidden" : ROLE_KEY[m.selection.role]) : "", m.selection.tier ? (m.selection.tier === "none" ? t("tipUnranked") : `${srcName} ${m.selection.tier}`) : ""].filter(Boolean).join(", "));
      }
      if (m.markGroup) parts.push(t(MARK_KEY[m.markGroup]));
      if (m.venueKey) parts.push(m.venueKey);
      if (withOnly && m.filters.onlyHighlighted) parts.push(t("onlyHighlighted"));
      if (m.filters.yearStart != null || m.filters.yearEnd != null) {
        if (m.filters.yearStart === m.filters.yearEnd && m.filters.yearStart != null) parts.push(String(m.filters.yearStart));
        else parts.push((m.filters.yearStart != null ? m.filters.yearStart : "…") + "–" + (m.filters.yearEnd != null ? m.filters.yearEnd : "…"));
      }
      if (m.filters.query) parts.push(`"${m.filters.query}"`);
      if (m.filters.minCitations != null) parts.push(t("filterMinCites", [String(m.filters.minCitations)]));
      // (the impact filter is chosen against the numbers, which it does not narrow: it is named in the filter bar only)
      if (withOnly && m.filterBar && m.filterBar.impact) parts.push(t(m.filterBar.impact.kind === "h" ? "mH" : "mI10"), t("filterMinCites", [String(m.filterBar.impact.min)]));
      return parts;
    }

    // ---- renderers -------------------------------------------------------
    const tierText = (c) => (c === "none" ? "–" : c);

    // The ranking tab: a switch between the lists that are on, a plain label when only one is, nothing when none is.
    function renderSummaryHead(m) {
      const name = (src) => t(src === "ccf" ? "srcCcf" : "srcCore");
      const control = m.noRanks ? null : m.sources.length > 1
        ? h("span", { class: "rr-seg", role: "group" },
          ...m.sources.map((src) => h("button", { type: "button", "data-src": src, "aria-pressed": String(m.source === src), onClick: () => cb.onSource(src) }, name(src))))
        : m.sources.length === 1 ? h("span", { class: "rr-src" }, name(m.sources[0])) : null;
      summaryHead.replaceChildren(...[h("span", { class: "rr-sec-title" }, t(m.noRanks || !m.sources.length ? "summaryTitleRoles" : "summaryTitle")), control].filter(Boolean));   // (replaceChildren(null) would print "null")
    }

    function renderMatrix(m) {
      const s = m.summary, sel = m.selection;
      const pressed = (x) => String(sameSel(sel, x));
      const headRow = h("tr", {}, h("th", {}, h("span", { class: "rr-sr" }, t("colRole"))),
        ...s.columns.map((c) => h("th", {},
          h("button", { class: "rr-rolebtn", type: "button", style: "padding:1px 5px", "data-tier": c, "aria-pressed": pressed({ role: undefined, tier: c }),
            title: c === "none" ? t("tipUnranked") : "", onClick: () => cb.onSelect({ role: undefined, tier: c }) }, tierText(c)))),
        h("th", {}, t("colTotal")));
      const bodyRows = s.rows.map((r) => h("tr", { "data-role": r.role },
        h("th", {}, h("button", { class: "rr-rolebtn", type: "button", "data-role": r.role, "aria-pressed": pressed({ role: r.role, tier: undefined }),
          onClick: () => cb.onSelect({ role: r.role, tier: undefined }) }, dot(r.role), t(ROLE_KEY[r.role]))),
        ...s.columns.map((c) => h("td", {},
          h("button", { class: "rr-cell" + (r[c] ? "" : " rr-zero"), type: "button", tabindex: r[c] ? null : "-1", "data-role": r.role, "data-tier": c,
            "aria-pressed": pressed({ role: r.role, tier: c }), "aria-label": `${t(ROLE_KEY[r.role])} ${tierText(c)}: ${r[c]}`,
            onClick: () => cb.onSelect({ role: r.role, tier: c }) }, r[c] ? String(r[c]) : "·"))),
        h("td", { class: "rr-total" }, String(r.total))));
      let hiddenRow = null;
      if (s.hidden) {
        hiddenRow = (h("tr", { "data-role": "hidden", class: "rr-hiddenrow", title: t("tipHidden") },
          h("th", {}, h("button", { class: "rr-rolebtn", type: "button", "data-role": "hidden", "aria-pressed": pressed({ role: "hidden", tier: undefined }),
            onClick: () => cb.onSelect({ role: "hidden", tier: undefined }) }, dot("hidden"), t("roleHidden"))),
          s.columns.length ? h("td", { colspan: String(s.columns.length), class: "rr-faint" }, "") : null,
          h("td", { class: "rr-total" }, String(s.hidden))));
      }
      const foot = h("tr", {}, h("th", {}, t("colTotal")), ...s.columns.map((c) => h("td", {}, String(s.totals[c]))), h("td", {}, String(s.totals.total)));
      // (the papers whose position is not known are not in the total: their row comes after it)
      matrixBox.replaceChildren(h("table", { class: "rr-matrix" }, h("thead", {}, headRow), h("tbody", {}, ...bodyRows), h("tfoot", {}, foot, hiddenRow)));
    }

    function renderActions(m) {
      const on = B.prefs.copyButtons(m.prefs);
      copySec.hidden = !on.length;
      actions.replaceChildren(...on.map((kind) => {
        const flashed = ui.flash && ui.flash.kind === kind;
        return h("button", { class: "rr-btn" + (flashed ? " rr-btn-flashed" : ""), type: "button", "data-act": "copy-" + kind, onClick: () => cb.onCopy(kind) },
          flashed ? flashText() : t(B.dom.COPY_LABEL[kind]));
      }));
    }
    // what a copy button says for a moment after it was pressed: done, or why nothing was copied
    const flashText = () => (ui.flash.mode === "empty" ? t("copyEmpty") : ui.flash.kind === "csv" ? t("exported") : t("copied"));

    // A row for each award / talk group that occurs on the loaded papers; click one to list just those.
    function renderMarks(m) {
      const counts = m.marks || {};
      const groups = B.marks.rows(m.prefs.talkRows).filter((g) => counts[g]);
      marksSec.hidden = !groups.length || !m.prefs.panel.marks;
      // the award count's parts, on hover: best papers and test-of-time awards apart from the honorable mentions
      const kinds = m.markKinds || {};
      const parts = B.marks.KINDS.filter((k) => kinds[k]).map((k) => `${B.chips.kindName(k)} ${kinds[k]}`).join(" · ");
      marksRows.replaceChildren(...groups.map((g) => h("button", { class: "rr-markrow", type: "button", "data-mark-group": g, title: g === "award" && parts ? parts : null,
        "aria-pressed": String(m.markGroup === g), onClick: () => cb.onMarkGroup(g) },
        h("span", { class: "rr-mi rr-mi-" + (g === "award" ? "award" : "talk") }), h("span", { class: "rr-lab" }, t(MARK_KEY[g])), h("b", {}, String(counts[g])))));
    }

    // (a list the person opened stays open when the panel is drawn again, e.g. while more papers arrive)
    let unmatchedOpen = false, unmatchedSig = "";
    function renderCoverage(m) {
      const c = m.coverage, parts = m.prefs.panel;
      const lines = [];
      const loadedLine = h("div", { class: "rr-cover-line" },
        h("span", { class: "rr-note" }, c.loadingAll ? t("loadingAll", [String(c.loaded)]) : tn("coverLoaded", c.loaded, [String(c.loaded)])),
        c.loadingAll ? h("button", { class: "rr-link", type: "button", onClick: () => cb.onCancelLoad() }, t("cancel"))
          : c.canLoadMore ? h("button", { class: "rr-link", type: "button", "data-act": "load-all", onClick: () => cb.onLoadAll() }, t("loadAll")) : null);
      const status = [];
      status.push(loadedLine);
      if (c.loadMessage) status.push(h("div", { class: "rr-faint", "data-rr": "load-msg" }, c.loadMessage));
      if (c.hidden > 0 || c.resolving) {
        status.push(h("div", { class: "rr-cover-line" },
          h("span", { class: "rr-note" }, c.resolving ? t("resolving", [String(c.resolving.done), String(c.resolving.total)]) : tn("coverHidden", c.hidden, [String(c.hidden)])),
          c.resolving ? h("button", { class: "rr-link", type: "button", onClick: () => cb.onCancelResolve() }, t("cancel"))
            : h("button", { class: "rr-link", type: "button", "data-act": "resolve", onClick: () => cb.onResolve() }, t("resolveBtn"))));
        if (!c.resolving) status.push(h("div", { class: "rr-faint", "data-rr": "resolve-hint" }, t(m.prefs.semanticScholar ? "resolveHintSemantic" : "resolveHint")));        // (what it does and who it asks, titles included: before it is pressed, not in a tooltip)
      }
      if (c.resolveMessage) status.push(h("div", { class: "rr-faint", "data-rr": "resolve-msg" }, c.resolveMessage));
      // the same paper listed twice: say so, and where the setting is (the panel itself does not write settings)
      if (c.repeats > 0) status.push(h("div", { class: "rr-cover-line", "data-rr": "repeats" }, h("span", { class: "rr-note" }, t("coverRepeats", [String(c.repeats)])),
        h("button", { class: "rr-link", type: "button", "data-act": "repeats-settings", onClick: () => cb.onSettings() }, t("coverRepeatsAction"))));
      if (c.absent > 0 && !c.layoutBroken) status.push(h("div", { class: "rr-note", "data-rr": "absent" }, tn("coverAbsent", c.absent, [String(c.absent)])));        // (when the layout is broken every paper is "absent": that is the warning's news)
      // spellings of the owner's name found in those very papers: one click adds one
      // (the count of the papers is in the totals above: a lone line that only says it again, in a section of its own, is noise; it stays while papers are still coming and whenever the totals are not shown)
      const countShown = parts.metrics && !c.layoutBroken && B.prefs.ROLES.some((r) => m.prefs.roles[r]);
      const lone = status.length === 1 && !c.loadingAll && c.complete && countShown;
      if (parts.status && !lone) lines.push(...status);
      if (parts.names && c.absent > 0 && m.nameHints.suggestions.length) {
        lines.push(h("div", { class: "rr-cover-line", "data-rr": "suggest" }, h("span", { class: "rr-note" }, t("variantSuggest")),
          ...m.nameHints.suggestions.map((sg) => h("button", { class: "rr-link rr-pill", type: "button", "data-act": "suggest-variant", title: t("variantSuggestTip", [String(sg.rows)]),
            onClick: () => cb.onAddVariant(sg.name) }, `${sg.name} (${sg.rows})`))));
      }
      let unmatchedEl = null;
      if (parts.status && c.unmatched.length) {
        const total = c.unmatched.reduce((a, b) => a + b.count, 0);
        const sig = JSON.stringify([total, c.unmatched.slice(0, 20)]);
        if (sig !== unmatchedSig) {
          unmatchedSig = sig;
          const report = "Venue strings from a Google Scholar profile that have no CCF / CORE rank here:\n\n" +
            c.unmatched.slice(0, 6).map((u) => "- " + u.venue).join("\n") + "\n\nThe rank they should have (and the venue's full name): ";
          const copyBtn = h("button", { class: "rr-btn", type: "button", "data-act": "copy-unmatched", onClick: async () => {
            if (await cb.onCopyUnmatched()) { copyBtn.textContent = t("copied"); setTimeout(() => { copyBtn.textContent = t("copyUnmatched"); }, 1400); }
          } }, t("copyUnmatched"));
          unmatchedEl = h("details", { "data-rr": "unmatched", open: unmatchedOpen, onToggle: (e) => { unmatchedOpen = e.target.open; } },
            h("summary", {}, tn("coverUnmatched", total, [String(total)])),
            h("ul", { class: "rr-list", tabindex: "0", "aria-label": tn("coverUnmatched", total, [String(total)]) }, ...c.unmatched.slice(0, 20).map((u) => h("li", {}, u.count > 1 ? h("b", {}, u.count + "× ") : null, u.venue))),
            h("div", { class: "rr-actions" }, copyBtn,
              h("a", { class: "rr-link", href: issueUrl("Venue not recognised", report), target: "_blank", rel: "noopener", "data-act": "report-unmatched" }, t("reportLink"))));
          coverList.replaceChildren(unmatchedEl);
        }
      } else if (unmatchedSig) { unmatchedSig = ""; coverList.replaceChildren(); }
      // Scholar changes its markup now and then: say so, at the top, instead of silently showing nothing
      warnBar.hidden = !c.layoutBroken;
      if (c.layoutBroken) {
        warnBar.replaceChildren(t("layoutWarning") + " ",
          h("a", { class: "rr-link", href: issueUrl("Scholar page layout changed", location.pathname + location.search.replace(/user=[^&]+/, "user=…")), target: "_blank", rel: "noopener" }, t("reportLink")));
      }
      coverTop.replaceChildren(...lines);
    }

    function syncFilters(m) {
      if (queryInput.value.trim().toLowerCase() !== (m.filters.query || "")) queryInput.value = m.filters.query || "";
      syncSearchUI(m);
      onlyCb.checked = !!m.filters.onlyHighlighted;
      const opts = (label) => [{ value: "", label }, ...m.years.map((y) => ({ value: String(y), label: String(y) }))];
      yearStart.setOptions(opts(t("yearStart")), m.filters.yearStart != null ? String(m.filters.yearStart) : "");
      yearEnd.setOptions(opts(t("yearEnd")), m.filters.yearEnd != null ? String(m.filters.yearEnd) : "");
    }

    function renderMetrics(m) {
      const hi = m.metrics.highlighted, all = m.metrics.all;
      const fmt = (n) => { try { return n.toLocaleString(B.dom.langTag() + "-u-nu-latn"); } catch (e) { return n.toLocaleString("en-US"); } };
      // "11 of 12" in the language's own order (Hindi puts the total first): the message carries both numbers, which are put in as styled nodes
      const ofNodes = (a, b) => t("metricsOfN", ["\uE000", "\uE001"]).split(/(\uE000|\uE001)/).filter(Boolean)
        .map((part) => (part === "\uE000" ? h("b", {}, fmt(a)) : part === "\uE001" ? h("span", { class: "rr-faint" }, fmt(b)) : h("i", {}, part)));
      const row = (key, a, b, withPct) => {
        const pct = withPct && b > 0 ? Math.round((a / b) * 100) : null;
        return h("div", { class: "rr-m", "data-metric": key, title: pct !== null ? `${pct}%` : null },
          h("span", {}, t(key)), h("span", {}, ...ofNodes(a, b)));
      };
      const btnRow = (key, a, b, impact, threshold) => {
        const isPressed = m.filters.impact === impact;
        const title = threshold > 0 ? t(key === "mH" ? "tipFilterH" : "tipFilterI10", [String(threshold)]) : null;
        const idle = a <= 0 && !isPressed;                                   // (nothing behind the number: nothing to show; a pressed button can always be released)
        return h("button", {
          class: "rr-m rr-m-btn" + (isPressed ? " rr-m-active" : ""),
          type: "button",
          "data-metric": key,
          "aria-pressed": String(isPressed),
          disabled: idle ? true : null,
          title,
          onClick: () => cb.onImpact(impact)
        }, h("span", {}, t(key)), h("span", {}, ...ofNodes(a, b)));
      };
      // which papers "highlighted" means: the roles that are switched on ("First, Second and Last")
      const roleNames = B.prefs.ROLES.filter((r) => m.prefs.roles[r]).map((r) => t(ROLE_KEY[r]));
      let scope = roleNames.join(", ");
      try { scope = new Intl.ListFormat(B.dom.langTag(), { style: "long", type: "conjunction" }).format(roleNames); } catch (e) { /* the plain list */ }
      if (scope) for (const p of filterParts(m, false)) scope += " · " + p;                  // (the numbers count what the filters let through: say which)
      if (!roleNames.length) {                                              // nothing is highlighted: say why, instead of four zeros
        metricsSec.replaceChildren(h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("metricsTitle"))),
          h("div", { class: "rr-faint", "data-rr": "no-roles" }, t("noRolesHint") + " ", h("button", { class: "rr-link", type: "button", onClick: () => cb.onSettings() }, t("settingsOpen"))));
        return;
      }
      metricsSec.replaceChildren(...[                                       // (replaceChildren(null) would print "null")
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("metricsTitle"))),
        scope ? h("div", { class: "rr-faint rr-scope" }, scope) : null,
        row("mPapers", hi.papers, all.papers, true), row("mCitations", hi.citations, all.citations, true),
        btnRow("mH", hi.h, all.h, "h", hi.h), btnRow("mI10", hi.i10, all.i10, "i10", 10)].filter(Boolean));
    }

    // Highlighted papers per year: one bar a year, stacked by role in the role colours (hover for the numbers; click to filter)
    function renderYears(m) {
      const data = m.byYear || [];
      yearsSec.hidden = !m.prefs.panel.years || data.length < 2;
      if (yearsSec.hidden) return;
      const top = Math.max(...data.map((d) => d.total));
      const older = m.byYearOlder || 0, olderNote = older ? tn("yearsOlder", older, [String(older)]) : "";        // (papers before the last fifty years are not drawn: said on hover and to screen readers)
      const names = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast" };
      yearsSec.replaceChildren(
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("yearsTitle"))),
      h("div", { class: "rr-yearsbox", style: "width:min(100%," + data.length * 28 + "px)" },
        h("div", { class: "rr-bars", style: data.length > 24 ? "gap:1px" : null, role: "group", "aria-label": t("yearsTitle") + ": " + data.map((d) => d.year + " " + d.total).join(", ") + (older ? ". " + olderNote : "") },
          ...data.map((d) => {
            const isSelected = m.filters.yearStart === d.year && m.filters.yearEnd === d.year;
            const disabled = !d.total;
            return h("button", {
              class: "rr-bar", type: "button", "data-year": String(d.year), "aria-pressed": String(isSelected),
              disabled: disabled ? true : null, tabindex: disabled ? "-1" : null,
              "aria-label": String(d.year) + ": " + (d.total ? String(d.total) : "0"),
              title: [String(d.year), ...B.prefs.ROLES.filter((r) => d[r]).map((r) => t(names[r]) + ": " + d[r])].join("\n"),
              onClick: () => {
                if (disabled) return;
                if (isSelected) cb.onYear("", "");
                else cb.onYear(String(d.year), String(d.year));
              }
            },
            h("div", { class: "rr-stack", style: "height:" + Math.max(d.total ? 6 : 0, Math.round(d.total / top * 100)) + "%" },
              ...B.prefs.ROLES.filter((r) => d[r]).map((r) => h("i", { style: "flex:" + d[r] + ";background:" + ROLE_COLOR[r] }))));
          })),
        h("div", { class: "rr-bars-axis" }, h("span", { title: older ? olderNote : null }, String(data[0].year)), h("span", {}, String(data[data.length - 1].year)))));
    }

    // The venues the highlighted papers appear in, most frequent first; click one to list its papers
    function renderVenues(m) {
      const list = m.topVenues || [];
      venuesSec.hidden = !m.prefs.panel.venues || !list.length;
      if (venuesSec.hidden) return;
      const rows = list.map((v) => {
        const ranks = [v.ccf ? `CCF ${v.ccf}` : "", v.core ? `CORE ${v.core}` : ""].filter(Boolean).join(" · ");
        const title = (v.name && v.name !== v.key ? `${v.name}` : v.key) + (ranks ? ` (${ranks})` : "");
        return h("button", { class: "rr-markrow", type: "button", "data-venue": v.key, title: title || null, "aria-pressed": String(m.venueKey === v.key), onClick: () => cb.onVenue(v.key) },
          h("span", { class: "rr-lab" }, v.key), h("b", {}, String(v.count)));
      });
      const moreRow = m.venuesHasMore
        ? h("div", { class: "rr-venues-more" }, h("button", { class: "rr-link", type: "button", "data-act": "toggle-venues", onClick: () => cb.onToggleVenues() }, t(m.venuesExpanded ? "venuesShowFewer" : "venuesShowMore")))
        : null;
      venuesSec.replaceChildren(...[
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("venuesTitle"))),
        h("div", { class: "rr-markrows" }, ...rows),
        moreRow
      ].filter(Boolean));
    }

    function renderVariants(m) {
      variantList.replaceChildren(
        ...m.nameHints.auto.map((v) => h("span", { class: "rr-variant rr-variant-auto", title: t("variantAutoTip", [String(v.rows)]) }, v.name)),
        ...m.variants.map((v) => h("span", { class: "rr-variant" }, v,
          h("button", { type: "button", "aria-label": t("variantRemove"), onClick: () => cb.onRemoveVariant(v) }, "×"))));
    }

    let lastModel = null;
    function update(m) {
      lastModel = m;
      const focused = focusKeyOf(document.activeElement);
      el.classList.toggle("rr-collapsed", !!m.ui.collapsed);
      collapseBtn.title = t(m.ui.collapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-expanded", String(!m.ui.collapsed));
      filtersSec.hidden = !m.prefs.panel.filters;
      onlyRow.hidden = !Object.values(m.prefs.roles).some(Boolean);          // with no role highlighted there is nothing to filter to
      metricsSec.hidden = !m.prefs.panel.metrics;
      summarySec.hidden = !m.prefs.panel.summary;
      const rankPill = pillEls[0];
      if (m && m.prefs && m.prefs.ranks) {
        if (!m.prefs.ranks.ccf && m.prefs.ranks.core) {
          rankPill.btn.setAttribute("data-op", "core:a*");
          rankPill.btn.textContent = "CORE A*";
          rankPill.btn.hidden = false;
        } else if (!m.prefs.ranks.ccf && !m.prefs.ranks.core) {
          rankPill.btn.hidden = true;
        } else {
          rankPill.btn.setAttribute("data-op", "ccf:a");
          rankPill.btn.textContent = "CCF A";
          rankPill.btn.hidden = false;
        }
      }
      pillEls[3].btn.hidden = !m.prefs.marks.award;                             // (the awards pill: has:award finds what the awards switch hides)
      variantBox.hidden = !m.prefs.panel.names;
      footSec.hidden = variantBox.hidden;
      filterBar.hidden = !m.filterBar;
      filterBar.classList.toggle("rr-fb-empty", !!(m.filterBar && m.filterBar.shown === 0));
      if (m.filterBar) {
        const parts = filterParts(m, true);
        filterBar.replaceChildren(h("span", { class: "rr-fb-text" }, t("filterShowing", [String(m.filterBar.shown), String(m.filterBar.total)]), parts.length ? h("span", { class: "rr-fb-what" }, " · " + parts.join(" · ")) : null),
          h("button", { class: "rr-link", type: "button", "data-act": "clear-filters", onClick: () => cb.onClearFilters() }, t("filterClear")));
      }
      renderSummaryHead(m); renderMatrix(m); renderActions(m); renderMarks(m); renderCoverage(m); renderYears(m); renderVenues(m);
      coverSec.hidden = !(coverTop.childNodes.length || coverList.childNodes.length);
      const say = [m.coverage.loadMessage, m.coverage.resolveMessage].filter(Boolean).join(" ");
      if (announce.textContent !== say) announce.textContent = say;
      // a column with nothing in it gives its width to the other
      // Scholar's page changed under us: the table, the counts and the filters would all be zeros, which is worse than nothing, so only the warning and the loading status stay
      if (m.coverage.layoutBroken) {
        for (const sec of [summarySec, copySec, marksSec, filtersSec, metricsSec, yearsSec, venuesSec, footSec]) sec.hidden = true;
      }
      // in the wide layout the year bars join the first column (the shorter one): they are looked at like the table and the awards
      const wide = el.classList.contains("rr-wide");
      if (wide && yearsSec.parentNode !== colAEl) colAEl.append(yearsSec);
      else if (!wide && yearsSec.parentNode !== colBEl) colBEl.insertBefore(yearsSec, venuesSec);
      const colA = !summarySec.hidden || !copySec.hidden || !marksSec.hidden || (wide && !yearsSec.hidden), colB = !filtersSec.hidden || !metricsSec.hidden || (!wide && !yearsSec.hidden) || !venuesSec.hidden || !coverSec.hidden || !footSec.hidden;
      colAEl.hidden = !colA; colBEl.hidden = !colB;
      el.classList.toggle("rr-onecol", !(colA && colB));
      syncFilters(m); renderMetrics(m); renderVariants(m);
      // (the lists' names without their edition note, unbreakable, and isolated so that right-to-left text cannot reorder them: "CCF 2026 · ICORE 2026")
      const listName = (label) => "\u2068" + String(label).replace(/\s*\(.*?\)\s*$/, "").replace(/ /g, "\u00a0") + "\u2069";
      const lists = (m.sources.length ? m.sources : ["ccf", "core"]).map((s) => listName(m.edition[s])).join(" · ");
      noteBox.textContent = m.noRanks ? t("noRanksNote", [lists]) : m.sources.length ? t("dataNote", [lists]) : "";        // (no lists on: nothing to say about where ranks come from)
      noteBox.hidden = !noteBox.textContent;
      restoreFocus(focused);
    }

    // A control the panel draws again keeps the keyboard where it was: when the focus fell to the page with the old control, it is put on the one with the same name
    const FOCUS_ATTRS = ["data-year", "data-metric", "data-venue", "data-mark-group", "data-role", "data-tier", "data-act", "data-src"];
    const sectionOf = (node) => { const sec = node.closest("[data-rr]"); return sec ? sec.getAttribute("data-rr") : ""; };
    function focusKeyOf(node) {
      if (!node || node === document.body || !el.contains(node)) return null;
      const attrs = FOCUS_ATTRS.map((a) => node.getAttribute(a));
      return attrs.some((v) => v != null) ? { sec: sectionOf(node), tag: node.tagName, attrs } : null;
    }
    function restoreFocus(key) {
      if (!key || (document.activeElement && document.activeElement !== document.body && el.contains(document.activeElement))) return;
      const again = [...el.querySelectorAll(key.tag)].find((n) => sectionOf(n) === key.sec && FOCUS_ATTRS.every((a, i) => n.getAttribute(a) === key.attrs[i]) && !n.hidden && !n.disabled);
      if (again) again.focus({ preventScroll: true });
    }

    // `mode` "empty": nothing was copied, the button says why; said to a screen reader too
    let flashTimer = 0;
    function flash(kind, mode) {
      ui.flash = { kind, mode };
      if (lastModel) renderActions(lastModel);
      announce.textContent = flashText();
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { ui.flash = null; if (lastModel) renderActions(lastModel); announce.textContent = ""; }, 1400);
    }

    function focusSearch() {
      queryInput.focus();
      queryInput.select();
    }

    return { el, update, flash, focusSearch };
  }

  B.panel = { create };
})();
