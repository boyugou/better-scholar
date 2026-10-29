// The summary panel injected into the Scholar profile page. Pure view: it renders a model handed to
// update() and reports user intent through callbacks — it owns no application state beyond which
// disclosure widgets are open. What it shows at all, and in what order, is decided on the settings page
// (model.prefs); the panel only keeps the quick, per-visit controls: the ranking tab, the filters, the clickable counts.
// Everything the settings can switch carries data-rr-part="<the setting's path>", so that the settings page can point at it (a thing that several switches draw, such as
// a count row of merged talks, carries all their paths, separated by spaces).
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const { h, t, tn, issueUrl } = B.dom;
  const P = (path) => ({ "data-rr-part": path });
  // what the settings page's preview needs to edit the panel in place: the message key of a text a person can name (data-rr-label), and where a list can be put in another order
  // (data-rr-order on its container, data-rr-item on each item: the setting's path, and the item's id)
  const L = (key) => ({ "data-rr-label": key });

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
      label.textContent = cur ? cur.label : value || placeholder;                  // (a value the list does not have, set by a page call, is shown as it is)
      // (the name of the choice is the label of its empty option — "From", "To": once a year is chosen the button reads "From: 2025", not "2025")
      const base = (options.find((o) => o.value === "") || {}).label || placeholder || "";
      el.setAttribute("aria-label", cur && cur.value !== "" && base ? `${base}: ${cur.label}` : base || label.textContent);
      if (base) list.setAttribute("aria-label", base);
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
      else if (k === "Tab") close(true);          // (the focus goes back to the button first: the Tab then moves on from it — "To" after "From" — not from the list, which stands elsewhere)
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
    // (the words are set by relabel(), which update() runs first: a name the person typed in the settings is then used at once)
    const title = h("span", { class: "rr-title", ...P("panel.header.name"), ...L("extShortName") });
    const settingsBtn = h("button", { class: "rr-icon rr-ico-settings", "data-act": "settings", type: "button", ...P("panel.header.settings"), onClick: () => cb.onSettings() });
    const collapseBtn = h("button", { class: "rr-icon rr-ico-caret", "data-act": "collapse", type: "button", ...P("panel.header.fold"), onClick: () => cb.onCollapse() });
    const head = h("header", { class: "rr-head" }, title, settingsBtn, collapseBtn);

    // the table: a title line (the title and the tabs), the matrix, and the note on where the ranks come from
    const summaryHead = h("div", { class: "rr-sec-head" });
    const matrixBox = h("div", { "data-rr": "matrix" });
    const noteBox = h("div", { class: "rr-faint rr-note-src", "data-rr": "note", ...P("panel.table.note") });
    const summarySec = h("div", { class: "rr-sec rr-summary", ...P("panel.table.show") }, summaryHead, matrixBox, noteBox);
    // the copy row: one button for each format that is switched on (the settings' panel.copy.*), whether or not the table is shown
    const actions = h("div", { class: "rr-actions rr-copybar", "data-rr-order": "panel.copy.order", "data-rr-axis": "x" });
    const flashSr = h("span", { class: "rr-sr", role: "status", "aria-live": "polite" });       // what a copy button says, for a screen reader (apart from the status lines)
    const copySec = h("div", { class: "rr-sec rr-copy", "data-rr": "export-row", ...P("panel.copy.show") }, actions, flashSr);

    // Awards & talks: one row per group that occurs; the section is absent when nothing qualifies
    const marksTitle = h("span", { class: "rr-sec-title", ...P("panel.marks.title"), ...L("marksTitle") });
    const marksHead = h("div", { class: "rr-sec-head" }, marksTitle);
    const marksRows = h("div", { class: "rr-markrows" });
    const marksSec = h("div", { class: "rr-sec rr-marks", "data-rr": "marks", hidden: true, ...P("panel.marks.show") }, marksHead, marksRows);

    // the status lines are drawn again with every update; the list of unrecognised venues keeps its own slot and is only rebuilt when its content changes
    // (so that a person reading it, or focused in it, is not interrupted by papers arriving)
    const coverTop = h("div", { class: "rr-cover-top" });
    const coverList = h("div", { class: "rr-cover-list" });
    const coverSec = h("div", { class: "rr-sec rr-cover", "data-rr": "coverage", ...P("panel.status.show") }, coverTop, coverList);

    // filters (built once, synced on update)
    const queryInput = h("input", { type: "search", class: "rr-search-input", "data-act": "filter-query", maxlength: "500", spellcheck: "false", autocomplete: "off", autocapitalize: "off", autocorrect: "off", dir: "auto",          // (operators are code, not words: no red squiggles; its direction follows what is typed)
      role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "rr-suggest", "aria-describedby": "rr-search-keys" });
    const searchCount = h("span", { class: "rr-search-count", "data-rr": "search-count", hidden: true, "aria-live": "polite" });
    // (the keys of the box, for a screen reader: the box's description, with what it could not read when there is something)
    const searchKeys = h("span", { id: "rr-search-keys", hidden: true });
    const kbdHint = h("kbd", { class: "rr-search-kbd", "aria-hidden": "true", ...P("panel.filters.key"), onClick: () => {
      queryInput.focus();
      openPopularSuggestions();
    } }, "/");

    // Autocomplete / suggestion popover for search operators
    const suggestList = h("ul", { class: "rr-search-suggest", id: "rr-suggest", role: "listbox", hidden: true });

    // the operators of lib/query.js, in the panel's own words (the group's name is the column it filters: Year, CCF, Role …)
    const OP_GROUP = { cites: "cite", year: "year", age: "year", ccf: "tier", core: "tier", type: "tier", role: "author", has: "mark" };
    const OP_TAG = { cites: "tsvCitations", year: "tsvYear", age: "tsvYear", ccf: "srcCcf", core: "srcCore", type: "tsvVenue", role: "tsvRole", has: "tsvAwards" };
    const OP_DESC = { "role:first": "roleFirst", "role:cofirst": "roleCofirst", "role:second": "roleSecond", "role:last": "roleLast", "has:award": "markAward", "has:talk": "markTalks" };
    const operatorItems = () => B.query.OPERATORS.flatMap((o) => o.suggest.map((op) => ({ op, name: o.name, group: OP_GROUP[o.name], tag: t(OP_TAG[o.name]), desc: OP_DESC[op] ? t(OP_DESC[op]) : "" })));

    // a word that names an operator but has no colon yet is completed, not kept
    const OPERATOR_NAME = /^(?:role|ccf|core|cites|year|age|type|has)$/i;
    let activeSuggestIdx = -1;
    let currentSuggestions = [];

    // (the list scrolls itself, with the arrow keys: that is not a reason to close it)
    const onSuggestScroll = (e) => { if (!suggestList.contains(e.target)) closeSuggest(); };
    function closeSuggest() {
      suggestList.hidden = true;
      activeSuggestIdx = -1;
      currentSuggestions = [];
      suggestList.replaceChildren();
      queryInput.setAttribute("aria-expanded", "false");
      queryInput.removeAttribute("aria-activedescendant");
      window.removeEventListener("resize", closeSuggest);
      window.removeEventListener("scroll", onSuggestScroll, true);
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

    // The word the caret is in: from its start to the caret (`word`, what was typed of it) and to its end (`end`; the caret may be in the middle of it)
    function getCurrentWordInfo() {
      const val = queryInput.value;
      const caret = queryInput.selectionEnd != null ? queryInput.selectionEnd : val.length;
      let start = caret, end = caret;
      while (start > 0 && !/\s/.test(val[start - 1])) start--;                 // (a scan back from the caret: a pattern anchored at the end is slow on a long line)
      while (end < val.length && !/\s/.test(val[end])) end++;
      return { word: val.slice(start, caret), start, caret, end };
    }

    function applySuggestion(item) {
      if (!item) return;
      const val = queryInput.value;
      const { word, start, end } = getCurrentWordInfo();
      let next, caretAt;
      if (item.replace) {                                                       // (one value of an operator's list is put in place of the one under the caret: "role:first,la|,second" → "role:first,last|,second")
        const r = item.replace, tail = val.slice(r.to);
        next = val.slice(0, r.from) + r.text + (r.space && !/^\s/.test(tail) ? " " : "") + tail;
        caretAt = (val.slice(0, r.from) + r.text + (r.space ? " " : "")).replace(/\s+/g, " ").length;
      } else if (word && (word.includes(":") || OPERATOR_NAME.test(word))) {
        next = val.slice(0, start) + item.op + " " + val.slice(end);
        caretAt = (val.slice(0, start) + item.op + " ").replace(/\s+/g, " ").length;
      } else {
        next = (val.trim() ? val.trim() + " " : "") + item.op + " ";
        caretAt = next.replace(/\s+/g, " ").length;
      }
      queryInput.value = next.replace(/\s+/g, " ");
      queryInput.setSelectionRange(caretAt, caretAt);
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
        const opCode = h("code", { class: "rr-suggest-op", dir: "ltr" }, item.op);
        const descText = h("span", { class: "rr-suggest-desc" }, item.desc);
        return h("li", {
          class: "rr-suggest-item",
          id: "rr-suggest-" + n,
          role: "option",
          "aria-selected": "false",
          "data-op": item.op,
          onPointerdown: (e) => e.preventDefault(),          // (the focus stays in the box; the suggestion is taken on the click, so that a press can be given up by moving off it)
          onClick: () => applySuggestion(item)
        }, catBadge, opCode, descText);
      }));
    }

    // The word at the caret begins an operator (it has its colon): offer that operator's values. An ordinary word offers nothing (ArrowDown, or the "/" hint, opens the common ones).
    function updateSuggestions() {
      const { word, start, caret, end } = getCurrentWordInfo();
      const w = word.toLowerCase(), at = w.indexOf(":");
      const name = at > 0 ? w.slice(0, at) : "";
      if (name && B.query.LISTED.has(name)) {
        // an operator whose values can be listed: the value under the caret, of the word's list, completes with the operator's values that the list does not have yet
        const val = queryInput.value, valueStart = start + at + 1;                   // (positions are those of the text as typed; only what is compared is lower-cased)
        const before = val.lastIndexOf(",", caret - 1), segStart = before >= valueStart ? before + 1 : valueStart;
        let segEnd = val.indexOf(",", caret); if (segEnd < 0 || segEnd > end) segEnd = end;
        const typed = val.slice(segStart, caret).toLowerCase(), here = val.slice(valueStart, segStart).split(",").length - 1;
        const others = val.slice(valueStart, end).toLowerCase().split(",").filter((_, i) => i !== here);
        currentSuggestions = caret < valueStart ? [] : operatorItems().filter((item) => item.name === name && item.op.slice(at + 1).startsWith(typed) && !others.includes(item.op.slice(at + 1)))
          .map((item) => ({ ...item, replace: { from: segStart, to: segEnd, text: item.op.slice(at + 1), space: segEnd === end } }));
      } else currentSuggestions = at < 1 ? [] : operatorItems().filter((item) => item.name === name && item.op.startsWith(w));
      if (currentSuggestions.length) renderSuggestions(); else closeSuggest();
    }

    function openPopularSuggestions() {
      const items = operatorItems();
      currentSuggestions = B.query.POPULAR.map((op) => items.find((item) => item.op === op)).filter(Boolean);
      renderSuggestions();
    }

    // The list is placed with fixed coordinates, as the year lists are: the panel's own overflow cannot clip it
    function placeSuggest() {
      const r = queryInput.getBoundingClientRect();
      suggestList.style.left = r.left + "px";
      suggestList.style.minWidth = r.width + "px";
      const below = window.innerHeight - r.bottom - 12, up = below < 150 && r.top > below;
      suggestList.style.maxHeight = Math.max(120, Math.min(260, up ? r.top - 12 : below)) + "px";
      if (up) { suggestList.style.top = ""; suggestList.style.bottom = (window.innerHeight - r.top + 4) + "px"; }
      else { suggestList.style.bottom = ""; suggestList.style.top = r.bottom + 4 + "px"; }
      window.addEventListener("resize", closeSuggest);
      window.addEventListener("scroll", onSuggestScroll, true);
    }

    document.addEventListener("pointerdown", (e) => {
      if (!searchRow.contains(e.target)) closeSuggest();
    }, true);

    const clearSearchBtn = h("button", { class: "rr-search-clear", type: "button", "data-act": "clear-query", hidden: true, onClick: () => {
      closeSuggest();
      queryInput.value = "";
      syncSearchUI();
      cb.onQuery("");
      queryInput.focus();
    } }, "×");

    // The quick filters: one button for each of the settings' panel.filters.pills.* (built once, put in the panel's order, and only the ones that can find something)
    const PILL_NAME = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast", award: "markAward", talk: "markTalks", search1: "pillSearch1", search2: "pillSearch2", search3: "pillSearch3" };
    // (your own quick filters: their words come with the settings; the button shows your name for it, or else the words)
    const ownPill = (id) => B.prefs.SEARCHES.includes(id);
    const pillWords = (id) => (ownPill(id) ? (lastModel && B.prefs.pillWords(lastModel.prefs, id)) || "" : B.prefs.PILL_OPERATORS[id]);
    const pillOn = (id) => (ownPill(id) ? B.query.hasAll(queryInput.value, pillWords(id)) : B.query.hasValue(queryInput.value, B.prefs.PILL_OPERATORS[id]));
    const pillLabel = (id) => (ownPill(id) ? B.dom.ownName(PILL_NAME[id]) || pillWords(id)
      : { ccfA: t("srcCcf") + " A", coreA: t("srcCore") + " A*", cites100: ">100", recent: t("optPillRecent"), award: t("markAward"), talk: t("markTalks") }[id] || t(ROLE_KEY[id]));
    const pillEls = new Map(B.prefs.PILLS.map((id) => {
      const btn = h("button", {
        type: "button",
        class: "rr-spill" + (ownPill(id) ? " rr-spill-own" : ""),
        "data-op": B.prefs.PILL_OPERATORS[id] || "",
        "data-pill": id,
        "aria-pressed": "false",
        ...(id === "cites100" ? { dir: "ltr" } : ownPill(id) ? { dir: "auto" } : {}),          // (">100" is a comparison: in a right-to-left panel its sign would be mirrored to "<100"; your own words go their own way)
        ...P("panel.filters.pills." + id), "data-rr-item": id, ...(PILL_NAME[id] ? L(PILL_NAME[id]) : {}),
        onClick: (e) => {
          closeSuggest();
          queryInput.value = ownPill(id) ? B.query.toggleAll(queryInput.value, pillWords(id)) : B.query.toggleValue(queryInput.value, B.prefs.PILL_OPERATORS[id]);
          syncSearchUI();
          cb.onQuery(queryInput.value);
          if (e.detail > 0) queryInput.focus();          // (a click goes on in the search box; a key press stays on the pill, so that the next one is a Tab away)
        }
      });
      return [id, btn];
    }));
    const searchPills = h("div", { class: "rr-search-pills", role: "group", "data-rr-order": "panel.filters.pills.order", "data-rr-axis": "x" });

    let slashOn = true;                    // (the "/" key and its hint: a setting)
    function syncSearchUI(m) {
      if (m && m.prefs) slashOn = m.prefs.panel.filters.key !== false;
      const hasText = !!queryInput.value;
      clearSearchBtn.hidden = !hasText;
      kbdHint.hidden = hasText || !slashOn;
      for (const [id, btn] of pillEls) {
        const active = pillOn(id);
        btn.classList.toggle("rr-spill-active", active);
        btn.setAttribute("aria-pressed", String(active));
      }
      // (a query that says nothing — spaces — has no count; an operator the panel could not read says so on the box)
      const sm = m && m.searchMatch;
      if (m) {
        const wrong = !!(sm && sm.errors.length);
        queryInput.setAttribute("aria-invalid", wrong ? "true" : "false");
        queryInput.title = wrong ? sm.errors.join("\n") : "";
        searchError.textContent = wrong ? sm.errors.join(" · ") : "";
        searchError.hidden = !wrong;
        queryInput.setAttribute("aria-describedby", wrong ? "rr-search-error rr-search-keys" : "rr-search-keys");
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
    const searchRow = h("div", { class: "rr-search", ...P("panel.filters.search") }, queryInput, searchCount, kbdHint, clearSearchBtn, suggestList, searchKeys);
    const searchError = h("div", { class: "rr-search-error", id: "rr-search-error", hidden: true });          // (what could not be read of the query, in words: the box says it is invalid, and by this)

    const onlyCb = h("input", { type: "checkbox", role: "switch", "data-act": "only", onChange: (e) => cb.onOnly(e.target.checked) });
    const onlyLabel = h("label", { class: "rr-check", ...L("onlyHighlighted") }, onlyCb);
    const onlyText = document.createTextNode("");
    onlyLabel.append(onlyText);
    const yearStart = dropdown("year-start", "", () => cb.onYear(yearStart.value, yearEnd.value));
    const yearEnd = dropdown("year-end", "", () => cb.onYear(yearStart.value, yearEnd.value));
    const onlyRow = h("div", { class: "rr-row", ...P("panel.filters.only") }, onlyLabel);
    const yearLabel = h("span", { class: "rr-label", ...L("yearLabel") });
    yearStart.el.setAttribute("data-rr-label", "yearStart"); yearEnd.el.setAttribute("data-rr-label", "yearEnd");
    const yearRow = h("div", { class: "rr-year", ...P("panel.filters.years") }, yearLabel, yearStart.el, h("span", { class: "rr-dash" }, "–"), yearEnd.el, yearStart.list, yearEnd.list);
    const filtersSec = h("div", { class: "rr-sec rr-filters", "data-rr": "filters", ...P("panel.filters.show") }, searchRow, searchError, searchPills, onlyRow, yearRow);

    const metricsSec = h("div", { class: "rr-sec rr-metrics", "data-rr": "metrics", ...P("panel.metrics.show") });
    const yearsSec = h("div", { class: "rr-sec rr-years", "data-rr": "years", ...P("panel.years.show") });
    const venuesSec = h("div", { class: "rr-sec rr-venues", "data-rr": "venues", ...P("panel.venues.show") });

    // name help: the spellings found in the papers (drawn again with every update), and the box where one is added (input kept stable across updates)
    const suggestBox = h("div", { class: "rr-suggest-box" });
    const variantList = h("div", { class: "rr-variants" });
    const variantInput = h("input", { type: "text", maxlength: "80", "data-act": "variant-input" });
    const addVariant = () => { const v = variantInput.value.trim(); if (v) { cb.onAddVariant(v); variantInput.value = ""; } };
    variantInput.addEventListener("keydown", (e) => { if (e.isTrusted && e.key === "Enter") addVariant(); });
    const variantSummary = h("summary", { ...L("variantsTitle") });
    const variantAddBtn = h("button", { class: "rr-btn", type: "button", onClick: addVariant });
    const variantBox = h("details", { "data-rr": "variants", ...P("panel.names.add") }, variantSummary, variantList, h("div", { class: "rr-add" }, variantInput, variantAddBtn));
    const namesSec = h("div", { class: "rr-sec rr-names", ...P("panel.names.show") }, suggestBox, variantBox);

    // the parts, by the ids of the settings' panel.order
    const sections = { table: summarySec, copy: copySec, marks: marksSec, filters: filtersSec, metrics: metricsSec, years: yearsSec, venues: venuesSec, status: coverSec, names: namesSec };
    for (const [id, sec] of Object.entries(sections)) sec.setAttribute("data-section", id);
    const body = h("div", { class: "rr-body", "data-rr-order": "panel.order" });
    // a bar that says the list is filtered, by how much, and clears every filter
    const fbCount = document.createTextNode(""), fbWhat = h("span", { class: "rr-fb-what" });
    const fbText = h("span", { class: "rr-fb-text", role: "status" }, fbCount, fbWhat);          // (a status: what the filters leave is said when it changes)
    const fbClear = h("button", { class: "rr-link", type: "button", "data-act": "clear-filters", onClick: (e) => { cb.onClearFilters(); if (e.detail === 0) queryInput.focus({ preventScroll: true }); } });          // (the bar goes with the filters: a key press goes on in the search box, not to the page)
    let fbSig = "";
    const filterBar = h("div", { class: "rr-filterbar", "data-rr": "filterbar", hidden: true, ...P("panel.filters.bar") }, fbText, fbClear);
    // Scholar's page changed under us: the warning is the first thing in the panel
    const warnBar = h("div", { class: "rr-warn", "data-rr": "layout-warning", hidden: true });
    // What a screen reader is told when the panel's status changes (loading stopped, reading the full lists finished): a live region that stays in the page
    const announce = h("div", { class: "rr-sr", role: "status", "aria-live": "polite", "data-rr": "announce" });
    const el = h("section", { id: "rr-panel", "data-rr": "panel", role: "region", dir: B.dom.dir(), lang: B.dom.langTag() }, head, warnBar, filterBar, body, announce);

    // The words that are set once and drawn again whenever they may have changed (the language is fixed for the life of the page, but a name typed in the
    // settings is not)
    function relabel() {
      el.setAttribute("aria-label", t("extName"));
      title.textContent = t("extShortName");
      settingsBtn.title = settingsBtn.ariaLabel = t("settingsOpen");
      queryInput.placeholder = t("filterPlaceholder");
      queryInput.setAttribute("aria-label", t("filterPlaceholder"));
      suggestList.setAttribute("aria-label", t("filterPlaceholder"));
      kbdHint.title = t("searchShortcut") + "\n" + t("searchKeys") + "\n" + B.query.OPERATORS.map((o) => o.example).join(" · ");          // (the keys of the box on a line of their own)
      searchKeys.textContent = t("searchKeys");
      clearSearchBtn.title = t("filterClear"); clearSearchBtn.setAttribute("aria-label", t("filterClear"));
      searchPills.setAttribute("aria-label", t("optPanelFilters"));
      for (const [id, btn] of pillEls) {
        btn.textContent = pillLabel(id);
        // (your own: its words on hover; renaming it in the settings' preview shows them in grey)
        if (ownPill(id)) { const w = pillWords(id); btn.setAttribute("data-op", w); btn.dataset.rrDefault = w; btn.title = w; }          // (its words whole: a long one is cut on the button)
      }
      onlyText.nodeValue = t("onlyHighlighted");
      yearLabel.textContent = t("yearLabel");
      marksTitle.textContent = t("marksTitle"); marksTitle.title = t("marksHint");
      variantSummary.textContent = t("variantsTitle");
      variantInput.placeholder = t("variantsPlaceholder");
      variantAddBtn.textContent = t("variantAdd");
    }

    // The active filters in the words the panel already uses (the cell, the awards row, the venue, the years, and "Only highlighted" when asked for);
    // used by the filter bar, by the line that says what the numbers under the filters count, and (in the standard words: `tr`) by the copied summary
    function filterParts(m, withOnly, tr = t) {
      const parts = [];
      if (m.selection) {
        const srcName = m.source === "core" ? tr("srcCore") : tr("srcCcf");
        parts.push([m.selection.role ? tr(m.selection.role === "hidden" ? "roleHidden" : m.selection.role === "absent" ? "filterAbsent" : ROLE_KEY[m.selection.role]) : "", m.selection.tier ? (m.selection.tier === "none" ? tr("tipUnranked") : `${srcName} ${m.selection.tier}`) : ""].filter(Boolean).join(tr === t ? B.dom.comma() : ", "));
      }
      if (m.markGroup) parts.push(tr(MARK_KEY[m.markGroup]));
      if (m.venueKey) parts.push(m.venueKey);
      if (withOnly && m.filters.onlyHighlighted) parts.push(tr("onlyHighlighted"));
      if (m.filters.yearStart != null || m.filters.yearEnd != null) {
        if (m.filters.yearStart === m.filters.yearEnd && m.filters.yearStart != null) parts.push(String(m.filters.yearStart));
        else parts.push((m.filters.yearStart != null ? m.filters.yearStart : "…") + "–" + (m.filters.yearEnd != null ? m.filters.yearEnd : "…"));
      }
      if (m.filters.query) parts.push(tr === t ? B.dom.quote(m.filters.query) : `"${m.filters.query}"`);
      if (m.filters.minCitations != null) parts.push(tr("filterMinCites", [String(m.filters.minCitations)]));
      // (the impact filter is chosen against the numbers, which it does not narrow: it is named in the filter bar only)
      if (withOnly && m.filterBar && m.filterBar.impact) parts.push(tr(m.filterBar.impact.kind === "h" ? "mH" : "mI10"), tr("filterMinCites", [String(m.filterBar.impact.min)]));
      return parts;
    }

    // ---- renderers -------------------------------------------------------
    const tierText = (c) => (c === "none" ? "–" : c);

    // The title line of the table: its title, and the ranking tab (a switch between the lists that are on, a plain label when only one is, nothing when none is).
    function renderSummaryHead(m) {
      const tp = m.prefs.panel.table;
      const name = (src) => t(src === "ccf" ? "srcCcf" : "srcCore");
      const control = m.noRanks ? null : m.sources.length > 1
        ? h("span", { class: "rr-seg", role: "group" },
          ...m.sources.map((src) => h("button", { type: "button", "data-src": src, "aria-pressed": String(m.source === src), ...P("panel.table." + src), onClick: () => cb.onSource(src) }, name(src))))
        : m.sources.length === 1 ? h("span", { class: "rr-src", ...P("panel.table." + m.sources[0]) }, name(m.sources[0])) : null;
      const titleKey = m.noRanks || !m.sources.length ? "summaryTitleRoles" : "summaryTitle";
      const heading = tp.title ? h("span", { class: "rr-sec-title", ...P("panel.table.title"), ...L(titleKey) }, t(titleKey)) : null;
      summaryHead.replaceChildren(...[heading, control].filter(Boolean));        // (replaceChildren(null) would print "null")
      summaryHead.hidden = !heading && !control;
    }

    // What the "not ranked" column holds, kind by kind (on hover): "Preprints 9 · Secondary tracks 4 · Other venues 8"
    const unrankedWords = (s) => (s.unranked ? [["unrankedPreprints", s.unranked.preprint], ["unrankedSecondary", s.unranked.secondary], ["unrankedOther", s.unranked.other]].filter(([, n]) => n).map(([k, n]) => `${t(k)} ${n}`).join(" · ") : "");

    function renderMatrix(m) {
      const tp = m.prefs.panel.table;
      const s = m.summary, sel = m.selection;
      const pressed = (x) => String(sameSel(sel, x));
      const cols = s.columns.filter((c) => c !== "none" || tp.unranked);                    // (the tiers belong to the list's tab; the "not ranked" column has its own switch)
      const srcName = m.source ? t(m.source === "ccf" ? "srcCcf" : "srcCore") : "";
      const showTotal = tp.total || !cols.length;                                           // (a table with no tier column has no number but the total: it is drawn whatever its switch says)
      const tierPart = (c) => (c === "none" ? P("panel.table.unranked") : m.source ? P("panel.table." + m.source) : {});
      const totalHead = showTotal ? h("th", { class: "rr-col-total", ...P("panel.table.total"), ...L("colTotal") }, t("colTotal")) : null;
      const headRow = h("tr", {}, h("th", {}, h("span", { class: "rr-sr" }, t("colRole"))),
        ...cols.map((c) => h("th", { ...tierPart(c) },
          h("button", { class: "rr-rolebtn", type: "button", style: "padding:1px 5px", "data-tier": c, "aria-pressed": pressed({ role: undefined, tier: c }),
            "aria-label": c === "none" ? t("tipUnranked") : [srcName, tierText(c)].filter(Boolean).join(" "),          // (the list and the tier, in words; "–" is the column of what is not ranked)
            title: c === "none" ? [t("tipUnranked"), unrankedWords(s)].filter(Boolean).join("\n") : "", onClick: () => cb.onSelect({ role: undefined, tier: c }) }, tierText(c)))),
        totalHead);
      const rows = s.rows.filter((r) => r.role !== "middle" || tp.other);
      const bodyRows = rows.map((r) => h("tr", { "data-role": r.role, ...(r.role === "middle" ? P("panel.table.other") : {}) },
        h("th", {}, h("button", { class: "rr-rolebtn", type: "button", "data-role": r.role, "aria-pressed": pressed({ role: r.role, tier: undefined }), ...L(ROLE_KEY[r.role]),
          onClick: () => cb.onSelect({ role: r.role, tier: undefined }) }, dot(r.role), t(ROLE_KEY[r.role]))),
        ...cols.map((c) => h("td", { ...tierPart(c) },
          h("button", { class: "rr-cell" + (r[c] ? "" : " rr-zero"), type: "button", tabindex: r[c] ? null : "-1", "data-role": r.role, "data-tier": c,
            "aria-pressed": pressed({ role: r.role, tier: c }), "aria-label": `${t(ROLE_KEY[r.role])}, ${c === "none" ? t("tipUnranked") : [srcName, tierText(c)].filter(Boolean).join(" ")}: ${r[c]}`,
            onClick: () => cb.onSelect({ role: r.role, tier: c }) }, r[c] ? String(r[c]) : "·"))),
        showTotal ? h("td", { class: "rr-total", ...P("panel.table.total") }, String(r.total)) : null));
      let hiddenRow = null;
      if ((s.hidden || m.hasHidden) && tp.hidden) {                                          // (a count of fewer papers keeps the row: the table does not change its shape under a filter)
        hiddenRow = (h("tr", { "data-role": "hidden", class: "rr-hiddenrow", title: t("tipHidden"), ...P("panel.table.hidden") },
          h("th", {}, h("button", { class: "rr-rolebtn", type: "button", "data-role": "hidden", "aria-pressed": pressed({ role: "hidden", tier: undefined }), ...L("roleHidden"),
            onClick: () => cb.onSelect({ role: "hidden", tier: undefined }) }, dot("hidden"), t("roleHidden"))),
          // (the count is the row's only number: with no total column it takes the room of the columns)
          showTotal ? [cols.length ? h("td", { colspan: String(cols.length), class: "rr-faint" }, "") : null, h("td", { class: "rr-total" }, String(s.hidden))]
            : h("td", { colspan: String(Math.max(1, cols.length)), class: "rr-total" }, String(s.hidden))));
      }
      const foot = showTotal ? h("tr", { ...P("panel.table.total") }, h("th", { ...L("colTotal") }, t("colTotal")), ...cols.map((c) => h("td", {}, String(s.totals[c]))), h("td", {}, String(s.totals.total))) : null;
      // (the papers whose position is not known are not in the total: their row comes after it)
      const tableName = (summaryHead.querySelector(".rr-sec-title") || {}).textContent || t(m.noRanks || !m.sources.length ? "summaryTitleRoles" : "summaryTitle");
      matrixBox.replaceChildren(h("table", { class: "rr-matrix" + (showTotal ? "" : " rr-no-total"), "aria-label": tableName }, h("thead", {}, headRow), h("tbody", {}, ...bodyRows), h("tfoot", {}, foot, hiddenRow)));
    }

    function renderActions(m) {
      const on = B.prefs.copyButtons(m.prefs);
      copySec.hidden = !m.prefs.panel.copy.show || !on.length;
      const focused = focusKeyOf(document.activeElement);                 // (the buttons are drawn again: the keyboard stays on the one that had the focus)
      actions.replaceChildren(...on.map((kind) => {
        const flashed = ui.flash && ui.flash.kind === kind;
        const cls = "rr-btn" + (flashed && !ui.flash.mode ? " rr-btn-flashed" : "");          // (only a copy that happened is green: not "Nothing to copy", not "Not copied")
        // (a flashed button keeps the width of its own label, so that the shorter word does not let the buttons after it move up: the next click would land on another one)
        return h("button", { class: cls, type: "button", "data-act": "copy-" + kind, style: flashed && ui.flash.width ? "min-width:" + ui.flash.width + "px" : null, ...P("panel.copy." + kind), "data-rr-item": kind, ...L(B.dom.COPY_LABEL[kind]), onClick: () => cb.onCopy(kind) },
          flashed ? flashText() : t(B.dom.COPY_LABEL[kind]));
      }));
      restoreFocus(focused);
    }
    // what a copy button says for a moment after it was pressed: done, or why nothing was copied
    const flashText = () => (ui.flash.mode === "empty" ? t("copyEmpty") : ui.flash.mode === "failed" ? t("copyFailed") : ui.flash.kind === "csv" ? t("exported") : t("copied"));

    // A row for each award / talk group that occurs on the loaded papers; click one to list just those.
    function renderMarks(m) {
      const mp = m.prefs.panel.marks, counts = m.marks || {};
      const whole = m.marksWhole || {};
      const groups = B.marks.rows(mp.grouping).filter((g) => counts[g] || whole[g] || m.markGroup === g);          // (a row stays while the filters leave none of its papers, like the table's columns: the section — and the search box under it — does not move)          // (a pressed row stays, so that it can be released, whatever the filters made of its count)
      marksSec.hidden = !groups.length || !mp.show;
      marksHead.hidden = !mp.title;
      // the award count's parts, on hover: best papers and test-of-time awards apart from the honorable mentions
      const kinds = m.markKinds || {};
      const parts = B.marks.KINDS.filter((k) => kinds[k]).map((k) => `${B.chips.kindName(k)} ${kinds[k]}`).join(" · ");
      marksRows.replaceChildren(...groups.map((g) => h("button", { class: "rr-markrow" + (counts[g] || m.markGroup === g ? "" : " rr-markrow-zero"), type: "button", disabled: counts[g] || m.markGroup === g ? null : true, "data-mark-group": g, title: g === "award" && parts ? parts : null,
        "aria-pressed": String(m.markGroup === g), ...P(B.marks.members(g).map((k) => "panel.marks." + k).join(" ")), onClick: () => cb.onMarkGroup(g) },
        h("span", { class: "rr-mi rr-mi-" + (g === "award" ? "award" : "talk") }), h("span", { class: "rr-lab", ...L(MARK_KEY[g]) }, t(MARK_KEY[g])), h("b", {}, String(counts[g] || 0)))));          // (a pressed row with nothing left to count says 0)
    }

    // (a list the person opened stays open when the panel is drawn again, e.g. while more papers arrive)
    let unmatchedOpen = false, unmatchedSig = "";
    function renderCoverage(m) {
      const c = m.coverage, sp = m.prefs.panel.status;
      const lines = [];
      const loadedLine = h("div", { class: "rr-cover-line", ...P("panel.status.loaded") },
        h("span", { class: "rr-note" }, c.loadingAll ? t("loadingAll", [String(c.loaded)]) : tn("coverLoaded", c.loaded, [String(c.loaded)])),
        c.loadingAll ? h("button", { class: "rr-link", type: "button", "data-focus": "load", onClick: () => cb.onCancelLoad() }, t("cancel"))
          : c.canLoadMore ? h("button", { class: "rr-link", type: "button", "data-focus": "load", "data-act": "load-all", ...L("loadAll"), onClick: () => cb.onLoadAll() }, t("loadAll")) : null);
      const status = [];
      if (sp.loaded) {
        status.push(loadedLine);
        if (c.loadMessage) status.push(h("div", { class: "rr-faint", "data-rr": "load-msg", ...P("panel.status.loaded") }, c.loadMessage));
      }
      if (sp.cutoff) {
        if (c.hidden > 0 || c.resolving) {
          status.push(h("div", { class: "rr-cover-line", ...P("panel.status.cutoff") },
            h("span", { class: "rr-note" }, c.resolving ? t("resolving", [String(c.resolving.done), String(c.resolving.total)]) : tn("coverHidden", c.hidden, [String(c.hidden)])),
            c.resolving ? h("button", { class: "rr-link", type: "button", "data-focus": "resolve", onClick: () => cb.onCancelResolve() }, t("cancel"))
              : h("button", { class: "rr-link", type: "button", "data-focus": "resolve", "data-act": "resolve", ...L("resolveBtn"), onClick: () => cb.onResolve() }, t("resolveBtn"))));
          if (!c.resolving) status.push(h("div", { class: "rr-faint", "data-rr": "resolve-hint", ...P("panel.status.cutoff") }, t(m.prefs.semanticScholar ? "resolveHintSemantic" : "resolveHint")));        // (what it does and who it asks, titles included: before it is pressed, not in a tooltip)
        }
        if (c.resolveMessage) status.push(h("div", { class: "rr-faint", "data-rr": "resolve-msg", ...P("panel.status.cutoff") }, c.resolveMessage));
      }
      // the same paper listed twice: say so, and where the setting is (the panel itself does not write settings)
      if (sp.repeats && c.repeats > 0) status.push(h("div", { class: "rr-cover-line", "data-rr": "repeats", ...P("panel.status.repeats") }, h("span", { class: "rr-note" }, t("coverRepeats", [String(c.repeats)])),
        h("button", { class: "rr-link", type: "button", "data-act": "repeats-settings", onClick: () => cb.onSettings() }, t("coverRepeatsAction"))));
      // ranks from the person's own venue mappings: counted, and said to be (with the unranked line's switch: they are the lines the lists do not rank)
      if (sp.unranked && c.mapped > 0) status.push(h("div", { class: "rr-cover-line", "data-rr": "mapped", ...P("panel.status.unranked") }, h("span", { class: "rr-note" }, tn("coverMapped", c.mapped, [String(c.mapped)])), " ",
        h("button", { class: "rr-link", type: "button", "data-act": "mapped-settings", onClick: () => cb.onCheckVenue("") }, t("coverMappedAction"))));          // (the settings page, at its venue card)
      if (sp.absent && c.absent > 0 && !c.layoutBroken) status.push(h("div", { class: "rr-note", "data-rr": "absent", ...P("panel.status.absent") },
        h("button", { class: "rr-link", type: "button", "data-focus": "absent", "aria-pressed": String(sameSel(m.selection, { role: "absent", tier: undefined })), onClick: () => cb.onSelect({ role: "absent", tier: undefined }) }, tn("coverAbsent", c.absent, [String(c.absent)]))));          // (a click lists them)        // (when the layout is broken every paper is "absent": that is the warning's news)
      // (the count of the papers is in the totals above: a lone line that only says it again, in a section of its own, is noise; it stays while papers are still coming and whenever the totals are not shown)
      const mp = m.prefs.panel.metrics;
      const countShown = mp.show && mp.papers && !c.layoutBroken && B.prefs.ROLES.some((r) => m.prefs.roles[r]);
      const lone = status.length === 1 && status[0] === loadedLine && !c.loadingAll && c.complete && countShown;
      if (!lone) lines.push(...status);
      let unmatchedEl = null;
      if (sp.unranked && c.unmatched.length) {
        const total = c.unmatched.reduce((a, b) => a + b.count, 0);
        const sig = JSON.stringify([total, c.unmatched.slice(0, 20)]);
        if (sig !== unmatchedSig) {
          unmatchedSig = sig;
          const report = "Venue strings from a Google Scholar profile that have no CCF / CORE rank here:\n\n" +
            c.unmatched.slice(0, 6).map((u) => "- " + u.venue).join("\n") + "\n\nThe rank they should have (and the venue's full name): ";
          const copyBtn = h("button", { class: "rr-btn", type: "button", "data-act": "copy-unmatched", onClick: async () => {
            if (await cb.onCopyUnmatched()) { copyBtn.textContent = t("copied"); setTimeout(() => { copyBtn.textContent = t("copyUnmatched"); }, 1400); }
          } }, t("copyUnmatched"));
          unmatchedEl = h("details", { "data-rr": "unmatched", open: unmatchedOpen, ...P("panel.status.unranked"), onToggle: (e) => { unmatchedOpen = e.target.open; } },
            h("summary", {}, tn("coverUnmatched", total, [String(total)])),
            h("ul", { class: "rr-list", tabindex: "0", "aria-label": tn("coverUnmatched", total, [String(total)]) }, ...c.unmatched.slice(0, 20).map((u) => h("li", {}, u.count > 1 ? h("b", {}, u.count + "× ") : null, u.venue,
              " ", h("button", { class: "rr-link rr-vcheck", type: "button", "data-act": "check-venue", title: t("optVenueTitle"), "aria-label": `${t("optVenueTitle")}: ${u.venue}`, onClick: () => cb.onCheckVenue(u.venue) }, t("venueCheckLink"))))),
            h("div", { class: "rr-actions" }, copyBtn,
              h("a", { class: "rr-link", href: issueUrl("Venue not recognised", report), target: "_blank", rel: "noopener noreferrer", "data-act": "report-unmatched" }, t("reportLink"))));
          coverList.replaceChildren(unmatchedEl);
        }
      } else if (unmatchedSig) { unmatchedSig = ""; coverList.replaceChildren(); }
      // Scholar changes its markup now and then: say so, at the top, instead of silently showing nothing
      warnBar.hidden = !c.layoutBroken;
      if (c.layoutBroken) {
        warnBar.replaceChildren(t("layoutWarning") + " ",
          h("a", { class: "rr-link", href: issueUrl("Scholar page layout changed", location.pathname + location.search.replace(/([?&])user=[^&#]*/g, "$1user=…")), target: "_blank", rel: "noopener noreferrer" }, t("reportLink")));
      }
      coverTop.replaceChildren(...lines);
    }

    // the name help: the spellings of the owner's name found in those very papers (one click adds one), and the box that adds one by hand
    function renderNames(m) {
      const c = m.coverage, np = m.prefs.panel.names;
      const found = np.hints && c.absent > 0 && m.nameHints.suggestions.length;
      suggestBox.replaceChildren(...(found ? [h("div", { class: "rr-cover-line", "data-rr": "suggest", ...P("panel.names.hints") }, h("span", { class: "rr-note" }, t("variantSuggest")),
        ...m.nameHints.suggestions.map((sg) => h("button", { class: "rr-link rr-pill", type: "button", "data-act": "suggest-variant", title: t("variantSuggestTip", [String(sg.rows)]),
          onClick: () => cb.onAddVariant(sg.name) }, `${sg.name} (${sg.rows})`)))] : []));
      variantBox.hidden = !np.add;
      namesSec.hidden = !np.show || (!found && !np.add);
      variantList.replaceChildren(
        ...m.nameHints.auto.map((v) => h("span", { class: "rr-variant rr-variant-auto", title: t("variantAutoTip", [String(v.rows)]) }, v.name)),
        ...m.variants.map((v) => h("span", { class: "rr-variant" }, v,
          h("button", { type: "button", "aria-label": t("variantRemove"), onClick: () => cb.onRemoveVariant(v) }, "×"))));
    }

    function syncFilters(m) {
      const fp = m.prefs.panel.filters;
      if (queryInput.value.trim() !== (m.filters.query || "")) { closeSuggest(); queryInput.value = m.filters.query || ""; }          // (the list's positions are those of the text it was made for)
      syncSearchUI(m);
      onlyCb.checked = !!m.filters.onlyHighlighted;
      // (the range cannot be put upside down: "From" offers no year after the "To" that is set, and "To" none before the "From")
      const ys = m.filters.yearStart, ye = m.filters.yearEnd;
      const opts = (label, keep) => [{ value: "", label }, ...m.years.filter(keep).map((y) => ({ value: String(y), label: String(y) }))];
      yearStart.setOptions(opts(t("yearStart"), (y) => ye == null || y <= ye), ys != null ? String(ys) : "");
      yearEnd.setOptions(opts(t("yearEnd"), (y) => ys == null || y >= ys), ye != null ? String(ye) : "");
      // (the quick filters, in the panel's order: those that find something on this profile — a pressed one stays, so that it can be released)
      const ids = B.prefs.pills(m.prefs).filter((id) => !m.pillFinds || m.pillFinds[id] !== false || pillOn(id));
      searchPills.replaceChildren(...ids.map((id) => pillEls.get(id)));
      searchPills.hidden = !ids.length;
      searchRow.hidden = !fp.search;
      onlyRow.hidden = !fp.only || !Object.values(m.prefs.roles).some(Boolean);          // with no role highlighted there is nothing to filter to
      yearRow.hidden = !fp.years;
      filtersSec.hidden = !fp.show || (searchRow.hidden && searchPills.hidden && onlyRow.hidden && yearRow.hidden);
    }

    function renderMetrics(m) {
      const mp = m.prefs.panel.metrics;
      const hi = m.metrics.highlighted, all = m.metrics.all;
      const fmt = (n) => { try { return n.toLocaleString(B.dom.langTag() + "-u-nu-latn"); } catch (e) { return n.toLocaleString("en-US"); } };
      // "11 of 12" in the language's own order (Hindi puts the total first): the message carries both numbers, which are put in as styled nodes
      const ofNodes = (a, b) => (!mp.of ? [h("b", {}, fmt(a))] : t("metricsOfN", ["", ""]).split(/(|)/).filter(Boolean)
        .map((part) => (part === "" ? h("b", {}, fmt(a)) : part === "" ? h("span", { class: "rr-faint", ...P("panel.metrics.of") }, fmt(b)) : h("i", {}, part))));
      const row = (key, a, b, withPct, path) => {
        const pct = withPct && b > 0 ? Math.round((a / b) * 100) : null;
        return h("div", { class: "rr-m", "data-metric": key, title: pct !== null ? `${pct}%` : null, ...P(path) },
          h("span", { ...L(key) }, t(key)), h("span", {}, ...ofNodes(a, b)));                  // (the name is the label's: a double-click on the number is not a rename)
      };
      const btnRow = (key, a, b, impact, threshold, path) => {
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
          ...P(path),
          onClick: () => cb.onImpact(impact)
        }, h("span", { ...L(key) }, t(key)), h("span", {}, ...ofNodes(a, b)));
      };
      const heading = mp.title ? h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title", ...P("panel.metrics.title"), ...L("metricsTitle") }, t("metricsTitle"))) : null;
      // which papers "highlighted" means: the roles that are switched on ("First, Second and Last")
      const roleNames = B.prefs.ROLES.filter((r) => m.prefs.roles[r]).map((r) => t(ROLE_KEY[r]));
      let scope = roleNames.join(", ");
      try { scope = new Intl.ListFormat(B.dom.langTag(), { style: "long", type: "conjunction" }).format(roleNames); } catch (e) { /* the plain list */ }
      if (scope) for (const p of filterParts(m, false)) scope += " · " + p;                  // (the numbers count what the filters let through: say which)
      if (!roleNames.length) {                                              // nothing is highlighted: say why, instead of four zeros
        metricsSec.replaceChildren(...[heading,
          h("div", { class: "rr-faint", "data-rr": "no-roles" }, t("noRolesHint") + " ", h("button", { class: "rr-link", type: "button", onClick: () => cb.onSettings() }, t("settingsOpen")))].filter(Boolean));
        return;
      }
      metricsSec.replaceChildren(...[                                       // (replaceChildren(null) would print "null")
        heading,
        scope && mp.scope ? h("div", { class: "rr-faint rr-scope", ...P("panel.metrics.scope") }, scope) : null,
        mp.papers ? row("mPapers", hi.papers, all.papers, true, "panel.metrics.papers") : null,
        mp.citations ? row("mCitations", hi.citations, all.citations, true, "panel.metrics.citations") : null,
        mp.h ? btnRow("mH", hi.h, all.h, "h", hi.h, "panel.metrics.h") : null,
        mp.i10 ? btnRow("mI10", hi.i10, all.i10, "i10", 10, "panel.metrics.i10") : null].filter(Boolean));
    }

    // Highlighted papers per year: one bar a year, stacked by role in the role colours (hover for the numbers; click to filter)
    function renderYears(m) {
      const yp = m.prefs.panel.years, data = m.byYear || [];
      yearsSec.hidden = !yp.show || data.length < 2;
      if (yearsSec.hidden) return;
      const top = Math.max(...data.map((d) => d.total));
      const older = m.byYearOlder || 0, olderNote = older ? tn("yearsOlder", older, [String(older)]) : "";        // (papers before the last fifty years are not drawn: said on hover and to screen readers)
      const names = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast" };
      // One stop for the keyboard, not one for every year: the bar that has it (the bars are drawn again with every change, so it is remembered), else the picked year, else the latest
      // year that has a paper; the arrow keys, Home and End move among the others.
      const focusedYear = yearsSec.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.year || null : null;
      const selectedYear = m.filters.yearStart != null && m.filters.yearStart === m.filters.yearEnd ? String(m.filters.yearStart) : null;
      const pressable = data.filter((d) => d.total || String(d.year) === selectedYear);
      const stop = [focusedYear, selectedYear].find((y) => y && pressable.some((d) => String(d.year) === y)) || (pressable.length ? String(pressable[pressable.length - 1].year) : null);
      const onBarKey = (e) => {
        const bars = [...e.currentTarget.querySelectorAll("button.rr-bar:not([disabled])")], at = bars.indexOf(document.activeElement);
        if (at < 0) return;
        const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
        const to = e.key === "Home" ? 0 : e.key === "End" ? bars.length - 1 : e.key === "ArrowRight" ? at + (rtl ? -1 : 1) : e.key === "ArrowLeft" ? at + (rtl ? 1 : -1) : -1;
        if (to < 0 || to >= bars.length) return;
        e.preventDefault();
        bars[at].tabIndex = -1; bars[to].tabIndex = 0; bars[to].focus();
      };
      yearsSec.replaceChildren(...[
        yp.title ? h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title", ...P("panel.years.title"), ...L("yearsTitle") }, t("yearsTitle"))) : null,
      h("div", { class: "rr-yearsbox", style: "width:min(100%," + data.length * 28 + "px)" },
        h("div", { class: "rr-bars", style: data.length > 24 ? "gap:1px" : null, role: "group", onKeydown: onBarKey, "aria-label": t("yearsTitle") + ": " + data.map((d) => d.year + " " + d.total).join(", ") + (older ? ". " + olderNote : "") },
          ...data.map((d) => {
            const isSelected = m.filters.yearStart === d.year && m.filters.yearEnd === d.year;
            const disabled = !d.total && !isSelected;                          // (a pressed bar can always be released)
            return h("button", {
              class: "rr-bar", type: "button", "data-year": String(d.year), "aria-pressed": String(isSelected),
              disabled: disabled ? true : null, tabindex: !disabled && String(d.year) === stop ? "0" : "-1",
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
        yp.axis ? h("div", { class: "rr-bars-axis", ...P("panel.years.axis") }, h("span", { title: older ? olderNote : null }, String(data[0].year)), h("span", {}, String(data[data.length - 1].year))) : null)].filter(Boolean));
      if (focusedYear) { const again = yearsSec.querySelector('button.rr-bar[data-year="' + focusedYear + '"]:not([disabled])'); if (again) again.focus({ preventScroll: true }); }
    }

    // The venues the highlighted papers appear in, most frequent first; click one to list its papers
    function renderVenues(m) {
      const vp = m.prefs.panel.venues, list = m.topVenues || [];
      venuesSec.hidden = !vp.show || !list.length;
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
        vp.title ? h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title", ...P("panel.venues.title"), ...L("venuesTitle") }, t("venuesTitle"))) : null,
        h("div", { class: "rr-markrows" }, ...rows),
        moreRow
      ].filter(Boolean));
    }

    let lastModel = null, lastOrder = "";
    function update(m) {
      lastModel = m;
      relabel();
      const focused = focusKeyOf(document.activeElement);
      const hp = m.prefs.panel.header;
      el.classList.toggle("rr-collapsed", !!m.ui.collapsed && hp.fold);                // (with no fold button a folded panel could not be opened again)
      collapseBtn.title = t(m.ui.collapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-expanded", String(!m.ui.collapsed));
      settingsBtn.hidden = !hp.settings; collapseBtn.hidden = !hp.fold;
      head.hidden = !(hp.name || hp.settings || hp.fold);
      head.classList.toggle("rr-head-notitle", !hp.name);
      const barOn = !!m.filterBar && m.prefs.panel.filters.bar;
      filterBar.hidden = !barOn;
      // The bar says "Showing 25 of 100 papers" in the title bar, in place of the title while a filter is on: the panel is as tall as it was, so that nothing under the pointer or the caret
      // moves when a filter is switched on (a bar of its own pushed the table, the search box and everything else down). With no title bar it stands in front of the parts.
      const barInHead = barOn && !head.hidden;
      if (!head.hidden ? filterBar.parentNode !== head : filterBar.parentNode !== el) { if (!head.hidden) head.insertBefore(filterBar, settingsBtn); else el.insertBefore(filterBar, body); }
      head.classList.toggle("rr-head-filtered", barInHead);
      head.classList.toggle("rr-head-empty", barInHead && m.filterBar.shown === 0);
      title.hidden = !hp.name || barInHead;
      filterBar.classList.toggle("rr-fb-empty", !!(m.filterBar && m.filterBar.shown === 0));
      fbClear.textContent = t("filterClear");          // (named even while the bar is not drawn: no control without a name in the page)
      searchCount.setAttribute("aria-live", barOn ? "off" : "polite");          // (the bar says it in a sentence; the bare number is only read where there is no bar)
      if (barOn) {
        const parts = filterParts(m, true);
        const count = t("filterShowing", [String(m.filterBar.shown), String(m.filterBar.total)]);
        const sig = count + "\u0001" + parts.join("\u0001");
        if (sig !== fbSig) {
          fbSig = sig;
          fbCount.nodeValue = count;
          fbWhat.replaceChildren(...parts.flatMap((part) => [" · ", h("bdi", {}, part)]));          // (each part isolated: a query in quotes does not reorder the words around it in a right-to-left line)
          fbText.title = count + (parts.length ? " · " + parts.join(" · ") : "");          // (the bar is one line: all of it on hover)
        }
      }
      summarySec.hidden = !m.prefs.panel.table.show;
      renderSummaryHead(m); renderMatrix(m); renderActions(m); renderMarks(m); renderCoverage(m); renderYears(m); renderVenues(m); syncFilters(m); renderMetrics(m); renderNames(m);
      const mt = m.prefs.panel.metrics;
      metricsSec.hidden = !mt.show || !(mt.papers || mt.citations || mt.h || mt.i10);                               // (a title and a scope line with no number under them are no part)
      coverSec.hidden = !m.prefs.panel.status.show || !(coverTop.childNodes.length || coverList.childNodes.length);
      const say = [m.coverage.loadMessage, m.coverage.resolveMessage].filter(Boolean).join(" ");
      if (announce.textContent !== say) announce.textContent = say;
      // Scholar's page changed under us: the table, the counts and the filters would all be zeros, which is worse than nothing, so only the warning and the loading status stay
      if (m.coverage.layoutBroken) {
        for (const id of Object.keys(sections)) if (id !== "status") sections[id].hidden = true;
      }
      // the parts, in the order the settings give
      const order = m.prefs.panel.order;
      const sig = order.join(",");
      if (sig !== lastOrder) { lastOrder = sig; body.replaceChildren(...order.map((id) => sections[id])); }
      // in the wide layout (above the list) the parts flow into two columns; with only one part showing there is one
      el.classList.toggle("rr-onecol", Object.values(sections).filter((s) => !s.hidden).length < 2);
      body.hidden = Object.values(sections).every((s) => s.hidden);
      el.classList.toggle("rr-bare", body.hidden);
      el.hidden = head.hidden && body.hidden && filterBar.hidden && warnBar.hidden;                                                      // (nothing of it is drawn: no empty frame on the page)
      // (the lists' names without their edition note, unbreakable, and isolated so that right-to-left text cannot reorder them: "CCF 2026 · ICORE 2026")
      const listName = (label) => "⁨" + String(label).replace(/\s*\(.*?\)\s*$/, "").replace(/ /g, " ") + "⁩";
      const lists = (m.sources.length ? m.sources : ["ccf", "core"]).map((s) => listName(m.edition[s])).join(" · ");
      noteBox.textContent = m.noRanks ? t("noRanksNote", [lists]) : m.sources.length ? t("dataNote", [lists]) : "";        // (no lists on: nothing to say about where ranks come from)
      noteBox.hidden = !m.prefs.panel.table.note || !noteBox.textContent;
      // the titles of the parts are headings (a screen reader lists them and jumps between them); the panel's own name is the title bar's
      for (const n of el.querySelectorAll(".rr-sec-title")) if (!n.hasAttribute("role")) { n.setAttribute("role", "heading"); n.setAttribute("aria-level", "3"); }
      restoreFocus(focused);
    }

    // A control the panel draws again keeps the keyboard where it was: when the focus fell to the page with the old control, it is put on the one with the same name
    const FOCUS_ATTRS = ["data-year", "data-metric", "data-venue", "data-mark-group", "data-role", "data-tier", "data-act", "data-src", "data-pill", "data-focus"];          // (data-focus: a place that holds one button at a time — "Load all", then "Cancel")
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
      // the width the button's own label asks for (the button itself may have grown to fill its row)
      const own = actions.querySelector('[data-act="copy-' + kind + '"]');
      let width = 0;
      if (own && !(ui.flash && ui.flash.kind === kind)) { const was = own.style.cssText; own.style.cssText = "flex:none;min-width:0;width:max-content"; width = Math.ceil(own.getBoundingClientRect().width); own.style.cssText = was; }
      else if (ui.flash && ui.flash.kind === kind) width = ui.flash.width || 0;
      ui.flash = { kind, mode, width };
      if (lastModel) renderActions(lastModel);
      flashSr.textContent = flashText();
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { ui.flash = null; if (lastModel) renderActions(lastModel); flashSr.textContent = ""; }, 1400);
    }

    function focusSearch() {
      queryInput.focus();
      queryInput.select();
    }

    return { el, update, flash, focusSearch, filterParts };
  }

  B.panel = { create };
})();
