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
    const title = h("span", { class: "rr-title" }, t("panelTitle"));
    const settingsBtn = h("button", { class: "rr-icon rr-ico-settings", "data-act": "settings", type: "button", title: t("settingsOpen"), "aria-label": t("settingsOpen"), onClick: () => cb.onSettings() });
    const collapseBtn = h("button", { class: "rr-icon rr-ico-caret", "data-act": "collapse", type: "button", onClick: () => cb.onCollapse() });
    const head = h("header", { class: "rr-head" }, title, settingsBtn, collapseBtn);

    const summaryHead = h("div", { class: "rr-sec-head" });
    const matrixBox = h("div", { "data-rr": "matrix" });
    const actions = h("div", { class: "rr-actions rr-copybar" });
    const summarySec = h("div", { class: "rr-sec rr-summary" }, summaryHead, matrixBox, actions);

    // Awards & talks: one row per group that occurs; the section is absent when nothing qualifies
    const marksRows = h("div", { class: "rr-markrows" });
    const marksSec = h("div", { class: "rr-sec rr-marks", "data-rr": "marks", hidden: true },
      h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title", title: t("marksHint") }, t("marksTitle"))), marksRows);

    const coverSec = h("div", { class: "rr-sec rr-cover", "data-rr": "coverage" });

    // filters (built once, synced on update)
    const onlyCb = h("input", { type: "checkbox", role: "switch", "data-act": "only", onChange: (e) => cb.onOnly(e.target.checked) });
    const yearStart = dropdown("year-start", t("yearStart"), () => cb.onYear(yearStart.value, yearEnd.value));
    const yearEnd = dropdown("year-end", t("yearEnd"), () => cb.onYear(yearStart.value, yearEnd.value));
    const onlyRow = h("div", { class: "rr-row" }, h("label", { class: "rr-check" }, onlyCb, t("onlyHighlighted")));
    const filtersSec = h("div", { class: "rr-sec rr-filters", "data-rr": "filters" },
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
    const noteBox = h("div", { class: "rr-faint", "data-rr": "note" });
    const footSec = h("div", { class: "rr-sec" }, variantBox, noteBox);

    const colAEl = h("div", { class: "rr-col rr-col-a" }, summarySec, marksSec);
    const colBEl = h("div", { class: "rr-col rr-col-b" }, filtersSec, metricsSec, yearsSec, venuesSec, coverSec, footSec);
    const body = h("div", { class: "rr-body" }, colAEl, colBEl);
    // What a screen reader is told when the panel's status changes (loading stopped, Complete finished): a live region that stays in the page
    // a bar that says the list is filtered, by how much, and clears every filter
    const filterBar = h("div", { class: "rr-filterbar", "data-rr": "filterbar", hidden: true });
    const announce = h("div", { class: "rr-sr", role: "status", "aria-live": "polite", "data-rr": "announce" });
    const el = h("section", { id: "rr-panel", "data-rr": "panel", role: "region", "aria-label": t("panelTitle"), dir: B.dom.dir() }, head, filterBar, body, announce);

    // ---- renderers -------------------------------------------------------
    const tierText = (c) => (c === "none" ? "–" : c);

    // The ranking tab: a switch between the lists that are on, a plain label when only one is, nothing when none is.
    function renderSummaryHead(m) {
      const name = (src) => t(src === "ccf" ? "srcCcf" : "srcCore");
      const control = m.sources.length > 1
        ? h("span", { class: "rr-seg", role: "group" },
          ...m.sources.map((src) => h("button", { type: "button", "data-src": src, "aria-pressed": String(m.source === src), onClick: () => cb.onSource(src) }, name(src))))
        : m.sources.length === 1 ? h("span", { class: "rr-src" }, name(m.sources[0])) : null;
      summaryHead.replaceChildren(...[h("span", { class: "rr-sec-title" }, t("summaryTitle")), control].filter(Boolean));   // (replaceChildren(null) would print "null")
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
      if (s.hidden) {
        bodyRows.push(h("tr", { "data-role": "hidden", title: t("tipHidden") },
          h("th", {}, h("button", { class: "rr-rolebtn", type: "button", "data-role": "hidden", "aria-pressed": pressed({ role: "hidden", tier: undefined }),
            onClick: () => cb.onSelect({ role: "hidden", tier: undefined }) }, dot("hidden"), t("roleHidden"))),
          s.columns.length ? h("td", { colspan: String(s.columns.length), class: "rr-faint" }, "") : null,
          h("td", { class: "rr-total" }, String(s.hidden))));
      }
      const foot = h("tr", {}, h("th", {}, t("colTotal")), ...s.columns.map((c) => h("td", {}, String(s.totals[c]))), h("td", {}, String(s.totals.total)));
      matrixBox.replaceChildren(h("table", { class: "rr-matrix" }, h("thead", {}, headRow), h("tbody", {}, ...bodyRows), h("tfoot", {}, foot)));
    }

    function renderActions() {
      const btn = (kind, key) =>
        h("button", { class: "rr-btn", type: "button", "data-act": "copy-" + kind, onClick: () => cb.onCopy(kind) },
          ui.flash === kind ? t("copied") : t(key));
      actions.replaceChildren(btn("text", "copySummary"), btn("tsv", "copyTable"), btn("papers", "copyPapers"));
    }

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
        status.push(h("div", { class: "rr-cover-line", title: t("resolveHint") },
          h("span", { class: "rr-note" }, c.resolving ? t("resolving", [String(c.resolving.done), String(c.resolving.total)]) : tn("coverHidden", c.hidden, [String(c.hidden)])),
          c.resolving ? h("button", { class: "rr-link", type: "button", onClick: () => cb.onCancelResolve() }, t("cancel"))
            : h("button", { class: "rr-link", type: "button", "data-act": "resolve", onClick: () => cb.onResolve() }, t("resolveBtn"))));
      }
      if (c.resolveMessage) status.push(h("div", { class: "rr-faint", "data-rr": "resolve-msg" }, c.resolveMessage));
      // the same paper listed twice: say so, and where the setting is (the panel itself does not write settings)
      if (c.repeats > 0) status.push(h("div", { class: "rr-cover-line", "data-rr": "repeats" }, h("span", { class: "rr-note" }, t("coverRepeats", [String(c.repeats)])),
        h("button", { class: "rr-link", type: "button", "data-act": "repeats-settings", onClick: () => cb.onSettings() }, t("coverRepeatsAction"))));
      if (c.absent > 0) status.push(h("div", { class: "rr-note", "data-rr": "absent" }, tn("coverAbsent", c.absent, [String(c.absent)])));
      // spellings of the owner's name found in those very papers: one click adds one
      if (parts.status) lines.push(...status);
      if (parts.names && c.absent > 0 && m.nameHints.suggestions.length) {
        lines.push(h("div", { class: "rr-cover-line", "data-rr": "suggest" }, h("span", { class: "rr-note" }, t("variantSuggest")),
          ...m.nameHints.suggestions.map((sg) => h("button", { class: "rr-link", type: "button", "data-act": "suggest-variant", title: t("variantSuggestTip", [String(sg.rows)]),
            onClick: () => cb.onAddVariant(sg.name) }, `${sg.name} (${sg.rows})`))));
      }
      if (parts.status && c.unmatched.length) {
        const total = c.unmatched.reduce((a, b) => a + b.count, 0);
        const report = "Venue strings from a Google Scholar profile that have no CCF / CORE rank here:\n\n" +
          c.unmatched.slice(0, 6).map((u) => "- " + u.venue).join("\n") + "\n\nThe rank they should have (and the venue's full name): ";
        const copyBtn = h("button", { class: "rr-btn", type: "button", "data-act": "copy-unmatched", onClick: async () => {
          if (await cb.onCopyUnmatched()) { copyBtn.textContent = t("copied"); setTimeout(() => { copyBtn.textContent = t("copyUnmatched"); }, 1400); }
        } }, t("copyUnmatched"));
        lines.push(h("details", { "data-rr": "unmatched" },
          h("summary", {}, tn("coverUnmatched", total, [String(total)])),
          h("ul", { class: "rr-list" }, ...c.unmatched.slice(0, 20).map((u) => h("li", {}, h("b", {}, u.count + "× "), u.venue))),
          h("div", { class: "rr-actions" }, copyBtn,
            h("a", { class: "rr-link", href: issueUrl("Venue not recognised", report), target: "_blank", rel: "noopener", "data-act": "report-unmatched" }, t("reportLink")))));
      }
      // Scholar changes its markup now and then: say so instead of silently showing nothing
      if (c.layoutBroken) {
        lines.unshift(h("div", { class: "rr-warn", "data-rr": "layout-warning" }, t("layoutWarning") + " ",
          h("a", { class: "rr-link", href: issueUrl("Scholar page layout changed", location.pathname + location.search.replace(/user=[^&]+/, "user=…")), target: "_blank", rel: "noopener" }, t("reportLink"))));
      }
      coverSec.replaceChildren(...lines);
    }

    function syncFilters(m) {
      onlyCb.checked = !!m.filters.onlyHighlighted;
      const opts = (label) => [{ value: "", label }, ...m.years.map((y) => ({ value: String(y), label: String(y) }))];
      yearStart.setOptions(opts(t("yearStart")), m.filters.yearStart != null ? String(m.filters.yearStart) : "");
      yearEnd.setOptions(opts(t("yearEnd")), m.filters.yearEnd != null ? String(m.filters.yearEnd) : "");
    }

    function renderMetrics(m) {
      const hi = m.metrics.highlighted, all = m.metrics.all;
      const fmt = (n) => n.toLocaleString("en-US");
      const row = (key, a, b) => h("div", { class: "rr-m", "data-metric": key },
        h("span", {}, t(key)), h("span", {}, h("b", {}, fmt(a)), h("i", {}, t("metricsOf")), h("span", { class: "rr-faint" }, fmt(b))));
      // which papers "highlighted" means: the roles that are switched on ("First, Second and Last")
      const roleNames = B.prefs.ROLES.filter((r) => m.prefs.roles[r]).map((r) => t(ROLE_KEY[r]));
      let scope = roleNames.join(", ");
      try { scope = new Intl.ListFormat(B.dom.langTag(), { style: "long", type: "conjunction" }).format(roleNames); } catch (e) { /* the plain list */ }
      metricsSec.replaceChildren(...[                                       // (replaceChildren(null) would print "null")
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("metricsTitle"))),
        scope ? h("div", { class: "rr-faint rr-scope" }, scope) : null,
        row("mPapers", hi.papers, all.papers), row("mCitations", hi.citations, all.citations),
        row("mH", hi.h, all.h), row("mI10", hi.i10, all.i10)].filter(Boolean));
    }

    // Highlighted papers per year: one bar a year, stacked by role in the role colours (hover for the numbers)
    function renderYears(m) {
      const data = m.byYear || [];
      yearsSec.hidden = !m.prefs.panel.years || data.length < 2;
      if (yearsSec.hidden) return;
      const top = Math.max(...data.map((d) => d.total));
      const names = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast" };
      yearsSec.replaceChildren(
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("yearsTitle"))),
      h("div", { class: "rr-yearsbox", style: "width:min(100%," + data.length * 28 + "px)" },
        h("div", { class: "rr-bars", role: "img", "aria-label": t("yearsTitle") + ": " + data.map((d) => d.year + " " + d.total).join(", ") },
          ...data.map((d) => h("div", { class: "rr-bar", title: [String(d.year), ...B.prefs.ROLES.filter((r) => d[r]).map((r) => t(names[r]) + ": " + d[r])].join("\n") },
            h("div", { class: "rr-stack", style: "height:" + Math.max(d.total ? 6 : 0, Math.round(d.total / top * 100)) + "%" },
              ...B.prefs.ROLES.filter((r) => d[r]).map((r) => h("i", { style: "flex:" + d[r] + ";background:" + ROLE_COLOR[r] }))))),
        ),
        h("div", { class: "rr-bars-axis" }, h("span", {}, String(data[0].year)), h("span", {}, String(data[data.length - 1].year)))));
    }

    // The venues the highlighted papers appear in, most frequent first; click one to list its papers
    function renderVenues(m) {
      const list = m.topVenues || [];
      venuesSec.hidden = !m.prefs.panel.venues || !list.length;
      if (venuesSec.hidden) return;
      venuesSec.replaceChildren(
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("venuesTitle"))),
        h("div", { class: "rr-markrows" }, ...list.map((v) => h("button", { class: "rr-markrow", type: "button", "data-venue": v.key, "aria-pressed": String(m.venueKey === v.key), onClick: () => cb.onVenue(v.key) },
          h("span", { class: "rr-lab" }, v.key), h("b", {}, String(v.count))))));
    }

    function renderVariants(m) {
      variantList.replaceChildren(
        ...m.nameHints.auto.map((v) => h("span", { class: "rr-variant rr-variant-auto", title: t("variantAutoTip", [String(v.rows)]) }, v.name)),
        ...m.variants.map((v) => h("span", { class: "rr-variant" }, v,
          h("button", { type: "button", "aria-label": t("variantRemove"), onClick: () => cb.onRemoveVariant(v) }, "×"))));
    }

    function update(m) {
      el.classList.toggle("rr-collapsed", !!m.ui.collapsed);
      collapseBtn.title = t(m.ui.collapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-expanded", String(!m.ui.collapsed));
      filtersSec.hidden = !m.prefs.panel.filters;
      onlyRow.hidden = !Object.values(m.prefs.roles).some(Boolean);          // with no role highlighted there is nothing to filter to
      metricsSec.hidden = !m.prefs.panel.metrics;
      summarySec.hidden = !m.prefs.panel.summary;
      variantBox.hidden = !m.prefs.panel.names;
      noteBox.hidden = !m.prefs.panel.summary;                              // the note says where the ranks in the table come from
      footSec.hidden = variantBox.hidden && noteBox.hidden;
      filterBar.hidden = !m.filterBar;
      if (m.filterBar) filterBar.replaceChildren(h("span", {}, t("filterShowing", [String(m.filterBar.shown), String(m.filterBar.total)])),
        h("button", { class: "rr-link", type: "button", "data-act": "clear-filters", onClick: () => cb.onClearFilters() }, t("filterClear")));
      renderSummaryHead(m); renderMatrix(m); renderActions(); renderMarks(m); renderCoverage(m); renderYears(m); renderVenues(m);
      coverSec.hidden = !coverSec.childNodes.length;
      const say = [m.coverage.loadMessage, m.coverage.resolveMessage].filter(Boolean).join(" ");
      if (announce.textContent !== say) announce.textContent = say;
      // a column with nothing in it gives its width to the other
      // in the wide layout the year bars and the venue list join the first column (the shorter one): they are looked at like the table and the awards
      const wide = el.classList.contains("rr-wide");
      for (const sec of [yearsSec, venuesSec]) {
        if (wide && sec.parentNode !== colAEl) colAEl.append(sec);
        else if (!wide && sec.parentNode !== colBEl) colBEl.insertBefore(sec, coverSec);
      }
      const extra = !yearsSec.hidden || !venuesSec.hidden;
      const colA = !summarySec.hidden || !marksSec.hidden || (wide && extra), colB = !filtersSec.hidden || !metricsSec.hidden || (!wide && extra) || !coverSec.hidden || !footSec.hidden;
      colAEl.hidden = !colA; colBEl.hidden = !colB;
      el.classList.toggle("rr-onecol", !(colA && colB));
      syncFilters(m); renderMetrics(m); renderVariants(m);
      noteBox.textContent = t("dataNote", [(m.sources.length ? m.sources : ["ccf", "core"]).map((s) => m.edition[s]).join(" · ")]);
    }

    function flash(kind) {
      ui.flash = kind;
      renderActions();
      setTimeout(() => { ui.flash = null; renderActions(); }, 1400);
    }

    return { el, update, flash };
  }

  B.panel = { create };
})();
