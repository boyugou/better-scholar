// Content-script entry: wires the Scholar page, the analysis libraries and the panel.
// Runs on Google Scholar profile pages only (the manifest matches /citations*, and
// isProfile() double-checks — author-search and citation pages are left alone).
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  if (!B || !B.scholar || !B.data || !B.data.ccf || !B.data.core || !B.scholar.isProfile()) return;

  const { venues, analysis, metrics, marks } = B;
  const { h, t, copyText, frame } = B.dom;

  const profileId = B.scholar.profileId();
  const headerName = B.scholar.ownerName();
  const settings = await B.store.loadSettings();
  let variants = await B.store.loadVariants(profileId);
  const resolvedCache = await B.store.loadResolved();

  const resolver = venues.createResolver({ ccf: B.data.ccf.venues, core: B.data.core.venues, aliases: B.aliases });
  // venue names/acronyms the dataset knows, so "(Interspeech 2022 Oral)" in a title reads as a marker
  const venueWords = new Set([...B.data.ccf.venues.map((v) => v.abbr), ...B.data.core.venues.map((v) => v.acronym)].filter(Boolean).map((w) => w.toLowerCase()));
  const venueWord = (w) => venueWords.has(w);
  // award-winning papers (bundled list); optional — without it only the authors' own words count
  const awards = B.awards && B.data.awards ? B.awards.createIndex(B.data.awards.items) : null;
  const edition = { ccf: B.data.ccf.meta.label, core: B.data.core.meta.label };

  const state = {
    rows: [],                                   // { raw, a: analysis, highlighted }
    selection: null,                            // matrix cell / row / column filter
    markGroup: null,                            // 'award' | 'oral' | 'spotlight' | 'highlight' filter
    filters: { onlyHighlighted: false, markName: false, yearStart: null, yearEnd: null },
    loadingAll: false,
    resolving: null,                            // { done, total }
    resolveMessage: ""
  };
  let loadAbort = null, resolveAbort = null;

  const owner = () => ({ name: headerName, alternates: variants });
  const analyzeRaw = (raw) => analysis.analyzeRow(raw, { owner: owner(), resolver, resolved: resolvedCache[raw.id], venueWord, awards });

  // ---- rows ---------------------------------------------------------------

  function ingest() {
    const known = new Set(state.rows.map((r) => r.raw.tr));
    let added = false;
    for (const tr of B.scholar.rowElements()) {
      if (known.has(tr)) continue;
      const raw = B.scholar.readRow(tr);
      state.rows.push({ raw, a: analyzeRaw(raw), highlighted: false });
      added = true;
    }
    state.rows = state.rows.filter((r) => r.raw.tr.isConnected);
    return added;
  }

  const reanalyze = () => state.rows.forEach((r) => { r.a = analyzeRaw(r.raw); });

  // ---- decoration ---------------------------------------------------------

  const ROLE_CHIP = { first: "chipFirst", cofirst: "chipCofirst", second: "chipSecond", last: "chipLast" };
  const ROLE_NAME = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast" };
  // grey ramp: dark = top tier. CCF and CORE share shades so "A" looks the same in both.
  const SHADE = { ccf: { A: 1, B: 3, C: 4 }, core: { "A*": 1, A: 2, B: 3, C: 4 } };
  const RULE_TEXT = { name: "ruleName", acronym: "ruleAcronym", prefix: "rulePrefix" };

  function tierChip(kind, info) {
    const tier = kind === "ccf" ? info.tier : info.rank;
    const label = (kind === "ccf" ? t("srcCcf") : t("srcCore")) + " " + tier;
    const lines = [
      `${label} · ${info.name}${info.abbr ? " (" + info.abbr + ")" : ""}`,
      t(RULE_TEXT[info.rule] || "ruleName"),
      edition[kind] + " — " + t("tipToday")
    ];
    return h("span", { class: "rr-chip rr-chip-t" + (SHADE[kind][tier] || 4), title: lines.join("\n"), "data-kind": kind, "data-tier": tier }, label);
  }

  // A paper's standing: an award from the bundled list, or what the author wrote ("Oral", "Best Paper Award"…).
  function markChip(mark) {
    const star = mark.group === "award" ? "★ " : "";
    const lines = [mark.label];
    if (mark.source === "list") {
      lines.push(t("tipMarkList", [mark.awardLabel || mark.label, mark.venue + " " + mark.year]));
      if (mark.declared) lines.push(t("tipMarkAuthor", [mark.declared]));
    } else lines.push(t("tipMarkAuthor", [mark.text]));
    return h("span", { class: "rr-chip rr-chip-mark rr-chip-mark-" + mark.group, "data-mark": mark.kind, "data-group": mark.group, "data-source": mark.source,
      title: lines.join("\n") }, star + mark.label);
  }

  function roleChip(a) {
    const pos = a.index + 1;
    const total = a.authorCount + (a.truncated ? "+" : "");
    return h("span", { class: "rr-chip rr-chip-role rr-chip-role-" + a.role, "data-role": a.role,
      title: `${t(ROLE_NAME[a.role])} · ${t("tipPosition", [String(pos), String(total)])}${a.fromDetail ? " · " + t("tipFromPage") : ""}` }, t(ROLE_CHIP[a.role]));
  }

  // Wrap the owner's name in the authors line (Range-free: rebuild the text node).
  function markName(row) {
    const el = row.raw.authorsEl;
    if (!el) return;
    if (el.dataset.rrOrig !== undefined) { el.textContent = el.dataset.rrOrig; delete el.dataset.rrOrig; }
    if (!state.filters.markName || !row.highlighted || row.a.fromDetail) return;
    const text = el.textContent;
    let cursor = 0, pos = -1;
    row.a.tokens.forEach((tok, i) => {
      const at = text.indexOf(tok.name, cursor);
      if (at >= 0) { if (i === row.a.index) pos = at; cursor = at + tok.name.length; }
    });
    if (pos < 0) return;
    const nameLen = row.a.tokens[row.a.index].name.length;
    el.dataset.rrOrig = text;
    el.replaceChildren(text.slice(0, pos), h("span", { class: "rr-name rr-name-" + row.a.role }, text.slice(pos, pos + nameLen)), text.slice(pos + nameLen));
  }

  function decorate(row) {
    const { tr, venueEl } = row.raw;
    const a = row.a;
    row.highlighted = analysis.isHighlighted(a, settings.roles);
    for (const r of analysis.ROLE_KEYS) tr.classList.toggle("rr-r-" + r, row.highlighted && a.role === r);
    if (venueEl) {
      venueEl.querySelectorAll(":scope > .rr-chips").forEach((n) => n.remove());
      const chips = [];
      if (settings.badges.ccf && a.venue.ccf) chips.push(tierChip("ccf", a.venue.ccf));
      if (settings.badges.core && a.venue.core) chips.push(tierChip("core", a.venue.core));
      if (settings.badges.marks) for (const m of a.marks) chips.push(markChip(m));
      if (row.highlighted) chips.push(roleChip(a));
      if (chips.length) venueEl.append(h("span", { class: "rr-chips" }, chips));
    }
    markName(row);
  }

  function applyFilters() {
    const f = state.filters;
    for (const row of state.rows) {
      const a = row.a;
      let hide = f.onlyHighlighted && !row.highlighted;
      if (a.year != null) {
        if (f.yearStart != null && a.year < f.yearStart) hide = true;
        if (f.yearEnd != null && a.year > f.yearEnd) hide = true;
      }
      if (state.markGroup && !marks.inGroup(a, state.markGroup)) hide = true;
      if (state.selection && !metrics.inSelection({ status: a.status, role: a.role, venue: a.venue }, state.selection, settings.matrixSource)) hide = true;
      row.raw.tr.classList.toggle("rr-hide", hide);
    }
  }

  // ---- panel model --------------------------------------------------------

  function papers() {
    return state.rows.map((r) => ({
      status: r.a.status, role: r.a.role, venue: r.a.venue, venueText: r.a.venueText,
      citations: r.a.citations, year: r.a.year, highlighted: r.highlighted
    }));
  }

  // Papers per award / talk group among the papers that are the profile owner's (a paper the owner is not
  // on, per its full author list, is not counted).
  const markCounts = () => marks.summarize(state.rows.filter((r) => r.a.status !== "absent").map((r) => ({ marks: r.a.marks })));

  function model() {
    const list = papers();
    const summary = metrics.summarize(list, settings.matrixSource);
    return {
      ownerName: headerName, edition, settings, summary,
      selection: state.selection, filters: state.filters,
      marks: settings.badges.marks ? markCounts() : {}, markGroup: state.markGroup,
      years: Array.from(new Set(list.map((p) => p.year).filter((y) => y != null))).sort((a, b) => b - a),
      metrics: metrics.citationMetrics(list),
      coverage: {
        loaded: list.length, canLoadMore: B.scholar.canLoadMore(), loadingAll: state.loadingAll,
        hidden: summary.hidden, absent: summary.absent, resolving: state.resolving, resolveMessage: state.resolveMessage,
        unmatched: metrics.unmatchedVenues(list)
      },
      variants
    };
  }

  // ---- panel + callbacks ---------------------------------------------------

  const copyLabels = () => ({
    first: t("copyFirst"), cofirst: t("copyCofirst"), second: t("copySecond"), last: t("copyLast"), middle: t("copyMiddle")
  });

  const MARK_KEY = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight" };
  const marksLine = (counts) => {
    const parts = marks.GROUPS.filter((g) => counts[g]).map((g) => t(MARK_KEY[g]) + " " + counts[g]);
    return parts.length ? t("marksTitle") + ": " + parts.join(", ") + " (" + t("marksAsWritten") + ")" : "";
  };

  function summaryText() {
    const m = model();
    return metrics.toText(m.summary, {
      owner: headerName, label: copyLabels(), notRanked: t("tipUnranked").toLowerCase(),
      extra: [marksLine(m.marks)].filter(Boolean),
      edition: `${edition[settings.matrixSource]} — ${t("tipToday")}`
    });
  }

  const persist = () => B.store.saveSettings(settings);

  const panel = B.panel.create({
    onCollapse() { settings.collapsed = !settings.collapsed; persist(); refresh(); },
    onSource(src) { settings.matrixSource = src; state.selection = null; persist(); refresh(); },
    onSelect(sel) {
      const same = state.selection && state.selection.role === sel.role && state.selection.tier === sel.tier;
      state.selection = same || (sel.role === undefined && sel.tier === undefined) ? null : sel;
      refresh();
    },
    onRole(role, on) { settings.roles[role] = on; persist(); refresh(); },
    onBadge(key, on) { settings.badges[key] = on; if (key === "marks" && !on) state.markGroup = null; persist(); refresh(); },
    onMarkGroup(g) { state.markGroup = state.markGroup === g ? null : g; refresh(); },
    onOnly(on) { state.filters.onlyHighlighted = on; refresh(); },
    onMarkName(on) { state.filters.markName = on; refresh(); },
    onYear(start, end) {
      state.filters.yearStart = start === "" ? null : parseInt(start, 10);
      state.filters.yearEnd = end === "" ? null : parseInt(end, 10);
      refresh();
    },
    async onCopy(kind) {
      const m = model();
      const text = kind === "tsv"
        ? metrics.toTsv(m.summary, { label: copyLabels(), header: t("tsvRole"), total: t("tsvTotal"), notRanked: t("tipUnranked") })
        : summaryText();
      if (await copyText(text)) panel.flash(kind);
    },
    async onLoadAll() {
      if (state.loadingAll) return;
      state.loadingAll = true;
      loadAbort = new AbortController();
      refresh();
      try {
        await B.scholar.loadAll({ signal: loadAbort.signal, onProgress: () => { ingest(); refresh(); } });
      } finally {
        state.loadingAll = false;
        loadAbort = null;
        ingest();
        refresh();
      }
    },
    onCancelLoad() { if (loadAbort) loadAbort.abort(); },
    async onResolve() {
      if (state.resolving) return;
      const items = state.rows
        .filter((r) => analysis.needsDetail(r.a) && r.raw.id && r.raw.href)
        .sort((x, y) => y.a.citations - x.a.citations)
        .map((r) => ({ id: r.raw.id, href: r.raw.href }));
      if (!items.length) return;
      resolveAbort = new AbortController();
      state.resolving = { done: 0, total: items.length };
      state.resolveMessage = "";
      refresh();
      const res = await B.detail.resolveAll(items, resolvedCache, {
        signal: resolveAbort.signal,
        onProgress: (done, total) => { state.resolving = { done, total }; },
        onResult: (id) => {
          const row = state.rows.find((r) => r.raw.id === id);
          if (row) row.a = analyzeRaw(row.raw);
          scheduleRefresh();
        }
      });
      B.store.saveResolved(resolvedCache);
      state.resolving = null;
      resolveAbort = null;
      state.resolveMessage = res.stopped === "captcha" ? t("resolveCaptcha") : res.stopped === "cancelled" ? "" : t("resolveDone");
      reanalyze();
      refresh();
    },
    onCancelResolve() { if (resolveAbort) resolveAbort.abort(); },
    onAddVariant(v) {
      if (variants.includes(v)) return;
      variants = [...variants, v].slice(0, 8);
      B.store.saveVariants(profileId, variants);
      reanalyze();
      refresh();
    },
    onRemoveVariant(v) {
      variants = variants.filter((x) => x !== v);
      B.store.saveVariants(profileId, variants);
      reanalyze();
      refresh();
    }
  });

  function refresh() {
    for (const row of state.rows) decorate(row);
    applyFilters();
    panel.update(model());
  }
  const scheduleRefresh = frame(refresh);

  // ---- boot ---------------------------------------------------------------

  ingest();
  B.scholar.place(panel.el);
  refresh();

  const tbody = B.scholar.tbody();
  if (tbody) new MutationObserver(() => { if (ingest()) scheduleRefresh(); }).observe(tbody, { childList: true });
  window.addEventListener("resize", frame(() => B.scholar.place(panel.el)));

  // The toolbar popup asks for the current summary.
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, send) => {
      if (msg && msg.type === "rr:summary") {
        const list = papers();
        send({
          ok: true, owner: headerName, loaded: list.length, edition,
          summaries: { ccf: metrics.summarize(list, "ccf"), core: metrics.summarize(list, "core") },
          marks: settings.badges.marks ? markCounts() : {},
          source: settings.matrixSource
        });
      }
      return false;
    });
  } catch (e) { /* extension context gone */ }

})();
