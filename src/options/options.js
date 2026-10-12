// Settings page: what the extension draws, saved the moment a switch moves. The Scholar pages listen for the
// change and redraw at once, so there is no "apply" step. The preview on the right is built with the same
// chip code the Scholar page uses.
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  const { h, t, tn } = B.dom;
  const $ = (id) => document.getElementById(id);

  const ROLE_COLOR = { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" };
  const ROLE_NAME = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };   // "First author", …
  const MARK_NAME = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight" };

  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.title = t("panelTitle") + " — " + t("optHeading");
  $("title").textContent = t("panelTitle");
  $("sub").textContent = t("optHeading");
  $("pv-title").textContent = t("optPreviewTitle");
  $("pv-note").textContent = t("optPreviewNote");
  $("storage").textContent = t("optStorage");
  $("ver").textContent = "v" + chrome.runtime.getManifest().version;

  await B.store.migrate();
  let prefs = await B.store.loadPrefs();
  const syncers = [];

  let savedTimer = 0;
  async function save() {
    await B.store.savePrefs(prefs);
    renderPreview();
    syncers.forEach((fn) => fn());
    $("saved").textContent = t("optSaved");
    $("saved").classList.add("on");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => $("saved").classList.remove("on"), 1400);
  }

  // One switch: a label, an optional hint and colour swatch, a getter and a setter on the prefs
  // (`key` is the pref's path, e.g. "ranks.ccf", kept on the input as data-pref).
  function option({ key, label, hint, swatch, get, set, off }) {
    const input = h("input", { type: "checkbox", class: "sw", "data-pref": key, onChange: () => { set(input.checked); save(); } });
    const row = h("label", { class: "opt" },
      h("span", { class: "txt" },
        h("span", { class: "name" }, swatch ? h("span", { class: "swatch", style: "background:" + swatch }) : null, label),
        hint ? h("span", { class: "hint" }, hint) : null),
      input);
    const sync = () => {
      input.checked = !!get();
      const disabled = off ? off() : false;
      input.disabled = disabled;
      row.classList.toggle("disabled", disabled);
    };
    syncers.push(sync);
    sync();
    return row;
  }
  const card = (title, desc, ...rows) => h("section", { class: "card" }, h("h2", {}, title), desc ? h("p", { class: "desc" }, desc) : null, ...rows);

  // ---- the cards --------------------------------------------------------
  const cacheNote = h("p", { class: "note" });
  async function showCacheCount() {
    const n = Object.keys(await B.store.loadResolved()).length;
    cacheNote.textContent = n === 0 ? t("optCacheNone") : tn("optCacheCount", n, [String(n)]);
  }
  const clearBtn = h("button", { class: "btn", type: "button", "data-act": "clear-cache", onClick: async () => {
    await B.store.clearResolved();
    await showCacheCount();
    clearBtn.textContent = t("optCleared");
    setTimeout(() => { clearBtn.textContent = t("optClearCache"); }, 1400);
  } }, t("optClearCache"));
  const resetBtn = h("button", { class: "btn", type: "button", "data-act": "reset", onClick: () => {
    if (!confirm(t("optResetConfirm"))) return;
    prefs = B.prefs.defaults();
    save();
  } }, t("optReset"));

  $("controls").append(
    card(t("optRolesTitle"), t("optRolesHint"),
      ...B.prefs.ROLES.map((role) => option({ key: "roles." + role, label: t(ROLE_NAME[role]), swatch: ROLE_COLOR[role], get: () => prefs.roles[role], set: (v) => { prefs.roles[role] = v; } })),
      option({ key: "markName", label: t("optMarkName"), hint: t("optMarkNameHint"), get: () => prefs.markName, set: (v) => { prefs.markName = v; } })),
    card(t("optRanksTitle"), null,
      option({ key: "ranks.ccf", label: t("optCcf"), hint: t("optCcfHint"), get: () => prefs.ranks.ccf, set: (v) => { prefs.ranks.ccf = v; } }),
      option({ key: "ranks.core", label: t("optCore"), hint: t("optCoreHint"), get: () => prefs.ranks.core, set: (v) => { prefs.ranks.core = v; } })),
    card(t("optMarksTitle"), t("marksHint"),
      ...B.prefs.MARK_GROUPS.map((g) => option({ key: "marks." + g, label: t(MARK_NAME[g]), hint: g === "award" ? t("optMarkAwardHint") : "", get: () => prefs.marks[g], set: (v) => { prefs.marks[g] = v; } }))),
    card(t("optPanelTitle"), null,
      option({ key: "panel.show", label: t("optPanelShow"), hint: t("optPanelShowHint"), get: () => prefs.panel.show, set: (v) => { prefs.panel.show = v; } }),
      option({ key: "panel.filters", label: t("optPanelFilters"), hint: t("optPanelFiltersHint"), get: () => prefs.panel.filters, set: (v) => { prefs.panel.filters = v; }, off: () => !prefs.panel.show }),
      option({ key: "panel.metrics", label: t("optPanelMetrics"), hint: t("optPanelMetricsHint"), get: () => prefs.panel.metrics, set: (v) => { prefs.panel.metrics = v; }, off: () => !prefs.panel.show })),
    card(t("optLoadTitle"), null,
      option({ key: "autoLoad", label: t("optAutoLoad"), hint: t("optAutoLoadHint"), get: () => prefs.autoLoad, set: (v) => { prefs.autoLoad = v; } })),
    card(t("optDataTitle"), null, h("div", { class: "row" }, clearBtn, resetBtn, cacheNote)));
  showCacheCount();

  // ---- the preview -------------------------------------------------------
  // Four invented papers, one per position, with the chips a real one could carry.
  const top = (abbr, name) => ({ ccf: { tier: "A", name, abbr, rule: "acronym" }, core: { rank: "A*", name, abbr, rule: "acronym" } });
  const SAMPLES = [
    { role: "first", authors: ["A Author", "B Writer", "C Writer", "D Writer"], me: 0, venue: "ICLR 2025 (Oral)",
      ...top("ICLR", "International Conference on Learning Representations"), marks: [{ kind: "oral", group: "oral", source: "author", text: "Oral" }] },
    { role: "second", authors: ["B Writer", "A Author", "C Writer"], me: 1, venue: "NeurIPS 2024",
      ...top("NeurIPS", "Conference on Neural Information Processing Systems"),
      marks: [{ kind: "best", group: "award", source: "list", awardLabel: "Best Paper Award", venue: "NeurIPS", year: 2024 }] },
    { role: "cofirst", authors: ["A Author*", "B Writer*", "C Writer"], me: 0, venue: "CVPR 2024 (Highlight)",
      ...top("CVPR", "IEEE/CVF Conference on Computer Vision and Pattern Recognition"), marks: [{ kind: "highlight", group: "highlight", source: "author", text: "Highlight" }] },
    { role: "last", authors: ["B Writer", "C Writer", "D Writer", "A Author"], me: 3, venue: "ACL 2023 (Spotlight)",
      ...top("ACL", "Annual Meeting of the Association for Computational Linguistics"), marks: [{ kind: "spotlight", group: "spotlight", source: "author", text: "Spotlight" }] }
  ];
  const EDITION = { ccf: "CCF 2026 (7th edition)", core: "ICORE 2026" };

  function sampleRow(s, i) {
    const lit = prefs.roles[s.role];
    const authors = h("div", { class: "g" });
    s.authors.forEach((name, k) => {
      if (k) authors.append(", ");
      authors.append(k === s.me && lit && prefs.markName ? h("span", { class: "rr-name rr-name-" + s.role }, name) : name);
    });
    const chips = [];
    if (prefs.ranks.ccf) chips.push(B.chips.tierChip("ccf", s.ccf, EDITION.ccf));
    if (prefs.ranks.core) chips.push(B.chips.tierChip("core", s.core, EDITION.core));
    for (const m of B.prefs.visibleMarks(prefs, s.marks)) chips.push(B.chips.markChip(m));
    return h("tr", { class: lit ? "rr-r-" + s.role : "" },
      h("td", {}, h("a", {}, `${t("optSample")} ${i + 1}`), authors, h("div", { class: "g" }, s.venue, chips.length ? h("span", { class: "rr-chips" }, chips) : null)));
  }
  function renderPreview() { $("preview").replaceChildren(...SAMPLES.map(sampleRow)); }
  renderPreview();

  // another settings tab (or Reset) changed something
  B.store.onPrefsChanged((next) => { prefs = next; renderPreview(); syncers.forEach((fn) => fn()); });
})();
