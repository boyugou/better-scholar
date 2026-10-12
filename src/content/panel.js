// The summary panel injected into the Scholar profile page. Pure view: it renders a model handed to
// update() and reports user intent through callbacks — it owns no application state beyond which
// disclosure widgets are open. What it shows at all is decided on the settings page (model.prefs); the
// panel only keeps the quick, per-visit controls: the ranking tab, the filters, the clickable counts.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const { h, t, tn, issueUrl } = B.dom;

  const ROLE_COLOR = { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e", middle: "#9aa0a6", hidden: "#dadce0" };
  const MARK_KEY = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight" };
  const ROLE_KEY = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast", middle: "roleMiddle", hidden: "roleHidden" };

  const sameSel = (a, b) => !!a && !!b && a.role === b.role && a.tier === b.tier;
  const dot = (role) => h("span", { class: "rr-dot", style: "background:" + ROLE_COLOR[role] });

  function create(cb) {
    const ui = { flash: null };

    // ---- skeleton --------------------------------------------------------
    const title = h("span", { class: "rr-title" }, t("panelTitle"));
    const settingsBtn = h("button", { class: "rr-icon rr-ico-settings", "data-act": "settings", type: "button", title: t("settingsOpen"), "aria-label": t("settingsOpen"), onClick: () => cb.onSettings() });
    const collapseBtn = h("button", { class: "rr-icon", "data-act": "collapse", type: "button", onClick: () => cb.onCollapse() });
    const head = h("header", { class: "rr-head" }, title, settingsBtn, collapseBtn);

    const summaryHead = h("div", { class: "rr-sec-head" });
    const matrixBox = h("div", { "data-rr": "matrix" });
    const actions = h("div", { class: "rr-actions" });
    const summarySec = h("div", { class: "rr-sec rr-summary" }, summaryHead, matrixBox, actions);

    // Awards & talks: one row per group that occurs; the section is absent when nothing qualifies
    const marksRows = h("div", { class: "rr-markrows" });
    const marksSec = h("div", { class: "rr-sec rr-marks", "data-rr": "marks", hidden: true },
      h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title", title: t("marksHint") }, t("marksTitle"))), marksRows);

    const coverSec = h("div", { class: "rr-sec rr-cover", "data-rr": "coverage" });

    // filters (built once, synced on update)
    const onlyCb = h("input", { type: "checkbox", "data-act": "only", onChange: (e) => cb.onOnly(e.target.checked) });
    const yearStart = h("select", { "data-act": "year-start", onChange: () => cb.onYear(yearStart.value, yearEnd.value) });
    const yearEnd = h("select", { "data-act": "year-end", onChange: () => cb.onYear(yearStart.value, yearEnd.value) });
    const filtersSec = h("div", { class: "rr-sec rr-filters", "data-rr": "filters" },
      h("div", { class: "rr-row" }, h("label", { class: "rr-check" }, onlyCb, t("onlyHighlighted"))),
      h("div", { class: "rr-year" }, h("span", { class: "rr-label" }, t("yearLabel")), yearStart, "–", yearEnd));

    const metricsSec = h("div", { class: "rr-sec rr-metrics", "data-rr": "metrics" });

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

    const body = h("div", { class: "rr-body" },
      h("div", { class: "rr-col rr-col-a" }, summarySec, marksSec),
      h("div", { class: "rr-col rr-col-b" }, filtersSec, metricsSec, coverSec, footSec));
    const el = h("section", { id: "rr-panel", "data-rr": "panel", role: "region", "aria-label": t("panelTitle") }, head, body);

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
      const headRow = h("tr", {}, h("th", {}),
        ...s.columns.map((c) => h("th", {},
          h("button", { class: "rr-rolebtn", type: "button", style: "padding:1px 5px", "data-tier": c, "aria-pressed": pressed({ role: undefined, tier: c }),
            title: c === "none" ? t("tipUnranked") : "", onClick: () => cb.onSelect({ role: undefined, tier: c }) }, tierText(c)))),
        h("th", {}, t("colTotal")));
      const bodyRows = s.rows.map((r) => h("tr", { "data-role": r.role },
        h("th", {}, h("button", { class: "rr-rolebtn", type: "button", "data-role": r.role, "aria-pressed": pressed({ role: r.role, tier: undefined }),
          onClick: () => cb.onSelect({ role: r.role, tier: undefined }) }, dot(r.role), t(ROLE_KEY[r.role]))),
        ...s.columns.map((c) => h("td", {},
          h("button", { class: "rr-cell" + (r[c] ? "" : " rr-zero"), type: "button", "data-role": r.role, "data-tier": c,
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
      actions.replaceChildren(btn("text", "copySummary"), btn("tsv", "copyTable"));
    }

    // A row for each award / talk group that occurs on the loaded papers; click one to list just those.
    function renderMarks(m) {
      const counts = m.marks || {};
      const groups = B.marks.GROUPS.filter((g) => counts[g]);
      marksSec.hidden = !groups.length;
      marksRows.replaceChildren(...groups.map((g) => h("button", { class: "rr-markrow", type: "button", "data-mark-group": g,
        "aria-pressed": String(m.markGroup === g), onClick: () => cb.onMarkGroup(g) },
        h("span", { class: "rr-mi rr-mi-" + (g === "award" ? "award" : "talk") }), h("span", { class: "rr-lab" }, t(MARK_KEY[g])), h("b", {}, String(counts[g])))));
    }

    function renderCoverage(m) {
      const c = m.coverage;
      const lines = [];
      const loadedLine = h("div", { class: "rr-cover-line" },
        h("span", { class: "rr-note" }, c.loadingAll ? t("loadingAll", [String(c.loaded)]) : tn("coverLoaded", c.loaded, [String(c.loaded)])),
        c.loadingAll ? h("button", { class: "rr-link", type: "button", onClick: () => cb.onCancelLoad() }, t("cancel"))
          : c.canLoadMore ? h("button", { class: "rr-link", type: "button", "data-act": "load-all", onClick: () => cb.onLoadAll() }, t("loadAll")) : null);
      lines.push(loadedLine);
      if (c.hidden > 0 || c.resolving) {
        lines.push(h("div", { class: "rr-cover-line", title: t("resolveHint") },
          h("span", { class: "rr-note" }, c.resolving ? t("resolving", [String(c.resolving.done), String(c.resolving.total)]) : tn("coverHidden", c.hidden, [String(c.hidden)])),
          c.resolving ? h("button", { class: "rr-link", type: "button", onClick: () => cb.onCancelResolve() }, t("cancel"))
            : h("button", { class: "rr-link", type: "button", "data-act": "resolve", onClick: () => cb.onResolve() }, t("resolveBtn"))));
      }
      if (c.resolveMessage) lines.push(h("div", { class: "rr-faint", "data-rr": "resolve-msg" }, c.resolveMessage));
      if (c.absent > 0) lines.push(h("div", { class: "rr-note", "data-rr": "absent" }, tn("coverAbsent", c.absent, [String(c.absent)])));
      if (c.unmatched.length) {
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
      const sig = m.years.join(",");
      if (yearStart.dataset.sig !== sig) {
        const opts = (label) => [h("option", { value: "" }, label), ...m.years.map((y) => h("option", { value: String(y) }, String(y)))];
        yearStart.replaceChildren(...opts(t("yearStart")));
        yearEnd.replaceChildren(...opts(t("yearEnd")));
        yearStart.dataset.sig = sig;
      }
      yearStart.value = m.filters.yearStart != null ? String(m.filters.yearStart) : "";
      yearEnd.value = m.filters.yearEnd != null ? String(m.filters.yearEnd) : "";
    }

    function renderMetrics(m) {
      const hi = m.metrics.highlighted, all = m.metrics.all;
      const fmt = (n) => n.toLocaleString("en-US");
      const row = (key, a, b) => h("div", { class: "rr-m", "data-metric": key },
        h("span", {}, t(key)), h("span", {}, h("b", {}, fmt(a)), h("i", {}, t("metricsOf")), h("span", { class: "rr-faint" }, fmt(b))));
      metricsSec.replaceChildren(
        h("div", { class: "rr-sec-head" }, h("span", { class: "rr-sec-title" }, t("metricsTitle"))),
        row("mPapers", hi.papers, all.papers), row("mCitations", hi.citations, all.citations),
        row("mH", hi.h, all.h), row("mI10", hi.i10, all.i10));
    }

    function renderVariants(m) {
      variantList.replaceChildren(...m.variants.map((v) => h("span", { class: "rr-variant" }, v,
        h("button", { type: "button", "aria-label": t("variantRemove"), onClick: () => cb.onRemoveVariant(v) }, "×"))));
    }

    function update(m) {
      el.classList.toggle("rr-collapsed", !!m.ui.collapsed);
      collapseBtn.textContent = m.ui.collapsed ? "▸" : "▾";
      collapseBtn.title = t(m.ui.collapsed ? "expand" : "collapse");
      collapseBtn.setAttribute("aria-expanded", String(!m.ui.collapsed));
      filtersSec.hidden = !m.prefs.panel.filters;
      metricsSec.hidden = !m.prefs.panel.metrics;
      renderSummaryHead(m); renderMatrix(m); renderActions(); renderMarks(m); renderCoverage(m);
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
