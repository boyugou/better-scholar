// Settings page: what the extension draws, saved the moment a switch moves. The Scholar pages listen for the
// change and redraw at once, so there is no "apply" step. The preview on the right is built with the same
// chip code the Scholar page uses.
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  const { h, t, tn } = B.dom;
  const $ = (id) => document.getElementById(id);

  const ROLE_COLOR = { first: "var(--rr-c-first, #1a73e8)", cofirst: "var(--rr-c-cofirst, #a142f4)", second: "var(--rr-c-second, #f9ab00)", last: "var(--rr-c-last, #1e8e3e)" };
  const ROLE_DEFAULT = { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" };
  const ROLE_NAME = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };   // "First author", …
  const MARK_NAME = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight" };

  await B.dom.useLanguage();
  document.documentElement.lang = B.dom.langTag();
  document.documentElement.dir = B.dom.dir();
  document.title = t("extName") + " — " + t("optHeading");
  $("title").textContent = t("extName");
  $("sub").textContent = t("optHeading");
  $("pv-title").textContent = t("optPreviewTitle");
  $("pv-note").textContent = t("optPreviewNote");
  $("storage").textContent = t("optStorage");
  $("ver").textContent = "v" + chrome.runtime.getManifest().version;
  $("lnk-privacy").parentNode.setAttribute("aria-label", t("extName"));
  // plain links to this project's own pages, opened only when clicked (the settings page itself sends nothing)
  for (const [id, href, text] of [["lnk-privacy", "https://boyugou.github.io/better-scholar/privacy/", t("optLinkPrivacy")], ["lnk-issues", B.dom.REPO + "/issues/new/choose", t("optLinkIssues")], ["lnk-source", B.dom.REPO, "GitHub"]]) {
    $(id).href = href; $(id).textContent = text;
  }

  await B.store.migrate();
  let prefs = await B.store.loadPrefs();
  const syncers = [];

  let savedTimer = 0;
  async function save() {
    await B.store.savePrefs(prefs);
    B.dom.applyColors(prefs.colors); B.dom.applyRowStyle(prefs.rowStyle);
    renderPreview();
    syncers.forEach((fn) => fn());
    $("saved").textContent = t("optSaved");
    $("saved").classList.add("on");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => $("saved").classList.remove("on"), 1400);
  }

  // One switch: a label, an optional hint and colour swatch, a getter and a setter on the prefs
  // (`key` is the pref's path, e.g. "ranks.ccf", kept on the input as data-pref).
  function option({ key, label, hint, swatch, get, set, off, sub }) {
    const input = h("input", { type: "checkbox", role: "switch", class: "sw", "data-pref": key, onChange: () => { set(input.checked); save(); } });
    const row = h("label", { class: "opt" + (sub ? " sub" : "") },
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
  // "Enable all" / "Disable all" under a group of switches: every switch of the group is set and saved as one change (the switches re-sync from the prefs)
  function bulk(group, sets, title, ...extra) {
    const all = (v) => { for (const set of sets) set(v); save(); };
    return h("div", { class: "row bulk", role: "group", "aria-label": title },
      h("button", { class: "btn", type: "button", "data-act": "all-on", "data-group": group, onClick: () => all(true) }, t("optAllOn")),
      h("button", { class: "btn", type: "button", "data-act": "all-off", "data-group": group, onClick: () => all(false) }, t("optAllOff")),
      ...extra);
  }

  // A choice among several values: a label, an optional hint and a drop-down (`choices`: [[value, label], …])
  function choice({ key, label, hint, choices, get, set, after }) {
    const sel = h("select", { class: "sel", "data-pref": key, onChange: () => { const was = get(); set(sel.value); save().then(() => { if (after && was !== get()) after(); }); } },
      choices.map(([v, l]) => h("option", { value: v }, l)));
    const row = h("label", { class: "opt" }, h("span", { class: "txt" }, h("span", { class: "name" }, label), hint ? h("span", { class: "hint" }, hint) : null), sel);
    const sync = () => { sel.value = get(); };
    syncers.push(sync);
    sync();
    return row;
  }
  // A role's colour: a picker; while it moves the page is recoloured without saving, and when it is let go the choice is saved
  function colorRow(role) {
    const input = h("input", { type: "color", class: "clr", "data-pref": "colors." + role, "aria-label": t(ROLE_NAME[role]),
      onInput: () => { prefs.colors[role] = input.value; B.dom.applyColors(prefs.colors); renderPreview(); },
      onChange: () => { prefs.colors[role] = input.value; save(); } });
    const row = h("label", { class: "opt" }, h("span", { class: "txt" }, h("span", { class: "name" }, h("span", { class: "swatch", style: "background:" + ROLE_COLOR[role] }), t(ROLE_NAME[role]))), input);
    const sync = () => { input.value = prefs.colors[role] || ROLE_DEFAULT[role]; };
    syncers.push(sync);
    sync();
    return row;
  }
  // The optional Semantic Scholar API key: a password field, saved when it is left, kept on this device (not in the synced settings)
  function keyRow() {
    // (a text field drawn as dots: a real password field would make Chrome offer to save it as a password)
    const input = h("input", { type: "text", class: "key", "data-pref": "s2key", autocomplete: "off", spellcheck: "false", placeholder: "••••••••", "aria-label": t("optSemanticKey"),
      onChange: async () => { input.value = input.value.replace(/[^\x21-\x7e]/g, ""); await B.store.saveS2Key(input.value); $("saved").textContent = t("optSaved"); $("saved").classList.add("on"); setTimeout(() => $("saved").classList.remove("on"), 1400); } });
    B.store.loadS2Key().then((k) => { input.value = k; });
    return h("label", { class: "opt" }, h("span", { class: "txt" }, h("span", { class: "name" }, t("optSemanticKey")), h("span", { class: "hint" }, t("optSemanticKeyHint"))), input);
  }
  const LANGS = B.i18n.LANGUAGES.map(([code, name]) => [code, name]);
  const card = (title, desc, ...rows) => h("section", { class: "card" }, h("h2", {}, title), desc ? h("p", { class: "desc" }, desc) : null, ...rows);

  // ---- the cards --------------------------------------------------------
  // What a bug report needs and nothing that identifies you: versions, language, the settings, the browser
  const diagBtn = h("button", { class: "btn", type: "button", "data-act": "copy-diagnostics", onClick: async () => {
    const m = chrome.runtime.getManifest();
    const text = ["Better Scholar " + m.version, navigator.userAgent, "interface language: " + B.dom.langTag(), "settings: " + JSON.stringify(prefs)].join("\n");
    if (await B.dom.copyText(text)) { diagBtn.textContent = t("copied"); setTimeout(() => { diagBtn.textContent = t("optCopyDiagnostics"); }, 1400); }
  } }, t("optCopyDiagnostics"));
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

  // Cache viewer modal
  let cacheDialog = null;
  async function showCacheViewer() {
    if (cacheDialog) { cacheDialog.remove(); cacheDialog = null; }
    const resolved = await B.store.loadResolved();
    const entries = Object.entries(resolved).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));

    const search = h("input", { type: "search", class: "opt-search", placeholder: t("optCacheSearch"), "aria-label": t("optCacheSearch") });
    const countSpan = h("span", { class: "faint" });
    const tbody = h("tbody", {});

    const renderList = (filterText) => {
      const q = (filterText || "").trim().toLowerCase();
      const filtered = entries.filter(([id, d]) => {
        if (!q) return true;
        return id.toLowerCase().includes(q) || (d.authors || "").toLowerCase().includes(q) || (d.venue || "").toLowerCase().includes(q);
      });
      countSpan.textContent = tn("optCacheCount", filtered.length, [String(filtered.length)]);
      if (!filtered.length) {
        tbody.replaceChildren(h("tr", {}, h("td", { colspan: "4", class: "faint", style: "text-align: center; padding: 24px;" }, t("optCacheEmpty"))));
        return;
      }
      tbody.replaceChildren(...filtered.map(([id, d]) => {
        const dateStr = d.ts ? new Date(d.ts).toLocaleDateString() : "";
        const viaStr = d.via === "semantic" ? "Semantic Scholar" : "Google Scholar";
        return h("tr", {},
          h("td", { class: "cache-id", title: id }, id.length > 32 ? id.slice(0, 30) + "…" : id),
          h("td", {}, d.authors || "—"),
          h("td", {}, d.venue || "—"),
          h("td", { class: "faint" }, `${viaStr} (${dateStr})`));
      }));
    };

    search.addEventListener("input", () => renderList(search.value));
    renderList("");

    const copyJsonBtn = h("button", { class: "btn", type: "button", "data-act": "copy-cache-json", onClick: async () => {
      if (await B.dom.copyText(JSON.stringify(resolved, null, 2))) {
        copyJsonBtn.textContent = t("copied");
        setTimeout(() => { copyJsonBtn.textContent = t("optCacheCopy"); }, 1400);
      }
    } }, t("optCacheCopy"));

    const closeBtn = h("button", { class: "btn", type: "button", "data-act": "close-cache", onClick: () => cacheDialog.close() }, t("cancel"));

    cacheDialog = h("dialog", { class: "cache-modal" },
      h("div", { class: "cache-modal-head" },
        h("h2", {}, t("optCacheTitle")),
        h("button", { class: "cache-close", type: "button", onClick: () => cacheDialog.close() }, "×")),
      h("div", { class: "row", style: "gap: 8px; margin: 12px 0;" }, search, copyJsonBtn),
      h("div", { style: "margin-bottom: 8px;" }, countSpan),
      h("div", { class: "cache-table-wrap" },
        h("table", { class: "cache-table" },
          h("thead", {}, h("tr", {}, h("th", {}, "ID"), h("th", {}, "Authors"), h("th", {}, "Venue"), h("th", {}, "Source"))),
          tbody)),
      h("div", { class: "row", style: "justify-content: flex-end; margin-top: 16px;" }, closeBtn));

    document.body.append(cacheDialog);
    cacheDialog.showModal();
    cacheDialog.addEventListener("close", () => { cacheDialog.remove(); cacheDialog = null; });
  }
  const viewBtn = h("button", { class: "btn", type: "button", "data-act": "view-cache", onClick: () => showCacheViewer() }, t("optViewCache"));

  // "Reset" asks in the page, not in the browser's dialog: the button gives way to the question and a yes / no pair
  const resetBox = h("span", { class: "reset-box" });
  const resetBtn = h("button", { class: "btn", type: "button", "data-act": "reset", onClick: () => askReset() }, t("optReset"));
  function askReset() {
    const yes = h("button", { class: "btn danger", type: "button", "data-act": "reset-confirm", onClick: () => { prefs = B.prefs.defaults(); save(); resetBox.replaceChildren(resetBtn); } }, t("optReset"));
    const no = h("button", { class: "btn", type: "button", "data-act": "reset-cancel", onClick: () => resetBox.replaceChildren(resetBtn) }, t("cancel"));
    resetBox.replaceChildren(h("span", { class: "ask" }, t("optResetConfirm")), yes, no);
    no.focus();
  }
  resetBox.append(resetBtn);

  // ---- configuration & presets (Agent & Human friendly) ----
  function parseConfig(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) throw new Error("Empty configuration");
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
    const res = {};
    let cur = res;
    for (let line of trimmed.split(/\r?\n/)) {
      line = line.replace(/#.*$/, "").trim();
      if (!line) continue;
      const sec = line.match(/^\[([a-zA-Z0-9_.-]+)\]$/);
      if (sec) {
        const parts = sec[1].split(".");
        let target = res;
        for (const p of parts) { target[p] = target[p] || {}; target = target[p]; }
        cur = target;
        continue;
      }
      const kv = line.match(/^([a-zA-Z0-9_.-]+)\s*=\s*(.*)$/);
      if (kv) {
        const k = kv[1].trim();
        let raw = kv[2].trim();
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
        let val = raw;
        if (raw === "true") val = true;
        else if (raw === "false") val = false;
        else if (!isNaN(Number(raw)) && raw !== "") val = Number(raw);
        if (k.includes(".")) {
          const parts = k.split(".");
          let target = res;
          for (let i = 0; i < parts.length - 1; i++) { target[parts[i]] = target[parts[i]] || {}; target = target[parts[i]]; }
          target[parts[parts.length - 1]] = val;
        } else {
          cur[k] = val;
        }
      }
    }
    return res;
  }

  async function applyImportedConfig(data) {
    const merged = { ...prefs, ...data };
    for (const group of ["colors", "roles", "ranks", "marks", "panel", "hide"]) {
      if (data[group] && typeof data[group] === "object") merged[group] = { ...prefs[group], ...data[group] };
    }
    prefs = B.prefs.normalize(merged);
    await save();
  }

  const configStatus = h("span", { class: "config-status", role: "status" });
  function flashConfigStatus(msg) {
    configStatus.textContent = msg;
    configStatus.classList.add("on");
    setTimeout(() => { configStatus.classList.remove("on"); configStatus.textContent = ""; }, 2200);
  }

  const copyConfigBtn = h("button", { class: "btn", type: "button", "data-act": "config-copy", onClick: async () => {
    const text = JSON.stringify(prefs, null, 2);
    if (await B.dom.copyText(text)) {
      copyConfigBtn.textContent = t("copied");
      setTimeout(() => { copyConfigBtn.textContent = t("optConfigCopy"); }, 1400);
    }
  } }, t("optConfigCopy"));

  const exportConfigBtn = h("button", { class: "btn", type: "button", "data-act": "config-export", onClick: () => {
    B.dom.downloadFile("better-scholar-config.json", "application/json", JSON.stringify(prefs, null, 2));
  } }, t("optConfigExport"));

  const pasteConfigBtn = h("button", { class: "btn", type: "button", "data-act": "config-import", onClick: async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseConfig(text);
      await applyImportedConfig(parsed);
      flashConfigStatus(t("optSaved"));
    } catch (e) {
      flashConfigStatus("Invalid format");
    }
  } }, t("optConfigImport"));

  const fileInput = h("input", { type: "file", accept: ".json,.toml,.txt", "aria-label": t("optConfigImportFile"), style: "display:none", onChange: (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = parseConfig(reader.result);
        await applyImportedConfig(parsed);
        flashConfigStatus(t("optSaved"));
      } catch (err) {
        flashConfigStatus("Invalid file");
      }
    };
    reader.readAsText(file);
    fileInput.value = "";
  } });

  const importFileBtn = h("button", { class: "btn", type: "button", "data-act": "config-import-file", onClick: () => fileInput.click() }, t("optConfigImportFile"));

  // Presets
  const applyPreset = async (type) => {
    if (type === "senior") {
      prefs.roles = { first: false, cofirst: false, second: false, last: true };
      prefs.ranks = { ccf: true, core: true };
      prefs.rowStyle = "full";
    } else if (type === "first") {
      prefs.roles = { first: true, cofirst: true, second: false, last: false };
      prefs.ranks = { ccf: true, core: true };
      prefs.rowStyle = "full";
    } else if (type === "minimal") {
      prefs.rowStyle = "tint";
      prefs.hide.citedTable = true;
      prefs.hide.access = true;
      for (const k of ["summary", "copy", "marks", "years", "venues", "status", "names"]) prefs.panel[k] = false;
      prefs.panel.filters = true;
      prefs.panel.metrics = true;
      prefs.panel.show = true;
    }
    await save();
    flashConfigStatus(t("optSaved"));
  };

  const presetRow = h("div", { class: "row presets", role: "group", "aria-label": t("optConfigPreset") },
    h("span", { class: "faint" }, t("optConfigPreset") + ":"),
    h("button", { class: "btn sub", type: "button", "data-preset": "senior", onClick: () => applyPreset("senior") }, t("optPresetSenior")),
    h("button", { class: "btn sub", type: "button", "data-preset": "first", onClick: () => applyPreset("first") }, t("optPresetFirst")),
    h("button", { class: "btn sub", type: "button", "data-preset": "minimal", onClick: () => applyPreset("minimal") }, t("optPresetMinimal")));

  const configText = h("textarea", { class: "config-text", "data-act": "config-input", "aria-label": t("optConfigEditor"), rows: "6", spellcheck: "false", placeholder: '{\n  "colors": {\n    "first": "#1a73e8",\n    "last": "#1e8e3e"\n  }\n}' });
  const configApplyBtn = h("button", { class: "btn primary", type: "button", "data-act": "config-apply", onClick: async () => {
    try {
      const parsed = parseConfig(configText.value);
      await applyImportedConfig(parsed);
      flashConfigStatus(t("optSaved"));
    } catch (e) {
      flashConfigStatus("Invalid: " + (e.message || e));
    }
  } }, t("optConfigApply"));

  const configDetails = h("details", { class: "config-editor" },
    h("summary", { class: "btn sub" }, t("optConfigEditor")),
    h("div", { class: "config-editor-body" }, configText, h("div", { class: "row" }, configApplyBtn, configStatus)));

  $("controls").append(
    card(t("optLanguageTitle"), t("optLanguageHint"),
      choice({ key: "language", label: t("optLanguageUi"), choices: [["auto", t("optLanguageAuto")], ...LANGS], get: () => prefs.language, set: (v) => { prefs.language = v; }, after: () => location.reload() }),
      choice({ key: "scholarLanguage", label: t("optLanguageScholar"), hint: t("optLanguageScholarHint"), choices: [["keep", t("optLanguageKeep")], ...LANGS], get: () => prefs.scholarLanguage, set: (v) => { prefs.scholarLanguage = v; } })),
    card(t("optRolesTitle"), t("optRolesHint"),
      ...B.prefs.ROLES.map((role) => option({ key: "roles." + role, label: t(ROLE_NAME[role]), swatch: ROLE_COLOR[role], get: () => prefs.roles[role], set: (v) => { prefs.roles[role] = v; } })),
      option({ key: "markName", label: t("optMarkName"), hint: t("optMarkNameHint"), get: () => prefs.markName, set: (v) => { prefs.markName = v; } }),
      bulk("roles", [...B.prefs.ROLES.map((role) => (v) => { prefs.roles[role] = v; }), (v) => { prefs.markName = v; }], t("optRolesTitle"))),
    card(t("optColorsTitle"), t("optColorsHint"),
      ...B.prefs.ROLES.map(colorRow),
      choice({ key: "rowStyle", label: t("optRowStyle"), choices: [["full", t("optRowStyleFull")], ["bar", t("optRowStyleBar")], ["tint", t("optRowStyleTint")]], get: () => prefs.rowStyle, set: (v) => { prefs.rowStyle = v; } }),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", "data-act": "colors-reset", onClick: () => { for (const r of B.prefs.ROLES) prefs.colors[r] = ""; B.dom.applyColors(prefs.colors); save(); } }, t("optColorsReset")))),
    card(t("optRanksTitle"), null,
      option({ key: "ranks.ccf", label: t("optCcf"), hint: t("optCcfHint"), get: () => prefs.ranks.ccf, set: (v) => { prefs.ranks.ccf = v; } }),
      option({ key: "ranks.core", label: t("optCore"), hint: t("optCoreHint"), get: () => prefs.ranks.core, set: (v) => { prefs.ranks.core = v; } }),
      bulk("ranks", ["ccf", "core"].map((k) => (v) => { prefs.ranks[k] = v; }), t("optRanksTitle"))),
    card(t("optMarksTitle"), t("marksHint"),
      ...B.prefs.MARK_GROUPS.map((g) => option({ key: "marks." + g, label: t(MARK_NAME[g]), hint: g === "award" ? t("optMarkAwardHint") : "", get: () => prefs.marks[g], set: (v) => { prefs.marks[g] = v; } })),
      bulk("marks", B.prefs.MARK_GROUPS.map((g) => (v) => { prefs.marks[g] = v; }), t("optMarksTitle")),
      choice({ key: "talkRows", label: t("optTalkRows"), hint: t("optTalkRowsHint"), choices: [["separate", t("optTalkSeparate")], ["pair", t("optTalkPair")], ["talks", t("optTalkAll")]], get: () => prefs.talkRows, set: (v) => { prefs.talkRows = v; } })),
    card(t("optMergeTitle"), t("optMergeHint"),
      option({ key: "mergeDuplicates", label: t("optMergeLabel"), hint: t("optMergeLabelHint"), get: () => prefs.mergeDuplicates, set: (v) => { prefs.mergeDuplicates = v; } })),
    card(t("optHideTitle"), t("optHideHint"),
      option({ key: "hide.cited", label: t("optHideCited"), hint: t("optHideCitedHint"), get: () => prefs.hide.citedTable && prefs.hide.citedChart, set: (v) => { prefs.hide.cited = v; prefs.hide.citedTable = v; prefs.hide.citedChart = v; } }),
      option({ key: "hide.citedTable", sub: true, label: t("optHideCitedTable"), hint: t("optHideCitedTableHint"), get: () => prefs.hide.citedTable, set: (v) => { prefs.hide.citedTable = v; prefs.hide.cited = prefs.hide.citedTable && prefs.hide.citedChart; } }),
      option({ key: "hide.citedChart", sub: true, label: t("optHideCitedChart"), hint: t("optHideCitedChartHint"), get: () => prefs.hide.citedChart, set: (v) => { prefs.hide.citedChart = v; prefs.hide.cited = prefs.hide.citedTable && prefs.hide.citedChart; } }),
      option({ key: "hide.coauthors", label: t("optHideCo"), hint: t("optHideCoHint"), get: () => prefs.hide.coauthors, set: (v) => { prefs.hide.coauthors = v; } }),
      option({ key: "hide.access", label: t("optHideAccess"), hint: t("optHideAccessHint"), get: () => prefs.hide.access, set: (v) => { prefs.hide.access = v; } }),
      bulk("hide", [
        (v) => { prefs.hide.cited = v; prefs.hide.citedTable = v; prefs.hide.citedChart = v; },
        (v) => { prefs.hide.coauthors = v; },
        (v) => { prefs.hide.access = v; }
      ], t("optHideTitle"))),
    card(t("optPanelTitle"), null,
      option({ key: "panel.show", label: t("optPanelShow"), hint: t("optPanelShowHint"), get: () => prefs.panel.show, set: (v) => { prefs.panel.show = v; } }),
      ...[["summary", t("optPanelSummary"), t("optPanelSummaryHint")], ["copy", t("optPanelCopy"), t("optPanelCopyHint")], ["marks", t("optPanelMarks"), t("optPanelMarksHint")], ["filters", t("optPanelFilters"), t("optPanelFiltersHint")],
        ["metrics", t("optPanelMetrics"), t("optPanelMetricsHint")], ["years", t("optPanelYears"), t("optPanelYearsHint")], ["venues", t("optPanelVenues"), t("optPanelVenuesHint")], ["status", t("optPanelStatus"), t("optPanelStatusHint")], ["names", t("optPanelNames"), t("optPanelNamesHint")]]
        .map(([part, label, hint]) => option({ key: "panel." + part, sub: true, label, hint, get: () => prefs.panel[part], set: (v) => { prefs.panel[part] = v; }, off: () => !prefs.panel.show || (part === "copy" && !prefs.panel.summary) })),
      // "Compact" is a preset; "Enable all" / "Disable all" set every part of the panel but the panel itself (its own switch above)
      bulk("panel", [...B.prefs.PANEL_PARTS.filter((k) => k !== "show").map((k) => (v) => { prefs.panel[k] = v; }), (v) => { if (v) prefs.panel.show = true; }], t("optPanelTitle"),
        h("button", { class: "btn", type: "button", "data-act": "panel-compact", onClick: () => { for (const k of ["summary", "copy", "marks", "years", "venues", "status", "names"]) prefs.panel[k] = false; for (const k of ["filters", "metrics"]) prefs.panel[k] = true; prefs.panel.show = true; save(); } }, t("optPanelCompact")))),
    card(t("optSemanticTitle"), t("optSemanticHint"),
      option({ key: "semanticScholar", label: t("optSemanticLabel"), hint: t("optSemanticLabelHint"), get: () => prefs.semanticScholar, set: (v) => { prefs.semanticScholar = v; } }),
      keyRow()),
    card(t("optLoadTitle"), null,
      option({ key: "autoLoad", label: t("optAutoLoad"), hint: t("optAutoLoadHint"), get: () => prefs.autoLoad, set: (v) => { prefs.autoLoad = v; } })),
    card(t("optConfigTitle"), t("optConfigHint"),
      presetRow,
      h("div", { class: "row" }, copyConfigBtn, exportConfigBtn, pasteConfigBtn, importFileBtn, fileInput),
      configDetails),
    card(t("optDataTitle"), null, h("div", { class: "row" }, viewBtn, clearBtn, resetBox, diagBtn, cacheNote)));
  showCacheCount();

  // A row of links to the cards, pinned under the header: the page is long. The card in view is marked.
  const cards = [...$("controls").querySelectorAll(":scope > section.card")];
  const toc = h("nav", { class: "toc", "aria-label": t("optHeading") },
    ...cards.map((c, i) => { c.id = "card-" + i; return h("a", { href: "#card-" + i, "data-card": c.id, onClick: (e) => { e.preventDefault(); window.scrollTo({ top: Math.max(0, c.getBoundingClientRect().top + scrollY - toc.offsetHeight - 12), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } }, c.querySelector("h2").textContent); }));
  const searchInput = h("input", { type: "search", class: "opt-search", "data-act": "filter-settings", placeholder: t("filterPlaceholder"), "aria-label": t("filterPlaceholder") });
  const searchBox = h("div", { class: "opt-search-box" }, searchInput);
  function filterSettings(query) {
    const q = (query || "").trim().toLowerCase();
    cards.forEach((card, idx) => {
      const h2 = (card.querySelector("h2")?.textContent || "").toLowerCase();
      const desc = (card.querySelector(".desc")?.textContent || "").toLowerCase();
      const opts = [...card.querySelectorAll(".opt")];
      if (!q) {
        card.hidden = false;
        opts.forEach((o) => { o.hidden = false; });
        if (toc.children[idx]) toc.children[idx].hidden = false;
        return;
      }
      const cardMatch = h2.includes(q) || desc.includes(q);
      let optMatch = false;
      opts.forEach((opt) => {
        const matches = cardMatch || (opt.textContent || "").toLowerCase().includes(q);
        opt.hidden = !matches;
        if (matches) optMatch = true;
      });
      const show = cardMatch || optMatch;
      card.hidden = !show;
      if (toc.children[idx]) toc.children[idx].hidden = !show;
    });
  }
  searchInput.addEventListener("input", () => filterSettings(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      filterSettings("");
      searchInput.blur();
    }
  });
  $("controls").prepend(toc, searchBox);
  try {
    const seen = new Set();
    const mark = () => { const first = cards.find((c) => seen.has(c.id)); toc.querySelectorAll("a").forEach((a) => { if (first && a.dataset.card === first.id) { if (!a.hasAttribute("aria-current")) { a.setAttribute("aria-current", "true"); const box = toc.getBoundingClientRect(), r = a.getBoundingClientRect(); if (r.left < box.left + 8 || r.right > box.right - 8) toc.scrollTo({ left: toc.scrollLeft + (r.left - box.left) - 24, behavior: "auto" }); } } else a.removeAttribute("aria-current"); }); };
    const io = new IntersectionObserver((entries) => { for (const e of entries) { if (e.isIntersecting) seen.add(e.target.id); else seen.delete(e.target.id); } mark(); }, { rootMargin: "-70px 0px -55% 0px" });
    cards.forEach((c) => io.observe(c));
  } catch (e) { /* no observer: no marker */ }

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
      h("td", {}, h("a", {}, `${t("optSample")} ${i + 1}`), authors, h("div", { class: "g" }, s.venue, chips.length ? [" ", h("span", { class: "rr-chips" }, chips.flatMap((c, i) => (i ? [" ", c] : [c])))] : null)));
  }
  // The summary panel is the one the Scholar page draws (content/panel.js), handed a model built from invented papers
  // with the same rules as content/main.js — so every switch above changes it exactly as it changes a real profile.
  const P = (role, ccf, core, citations, year, abbr, ...markKinds) => ({
    status: "found", role, venue: { ccf: ccf ? { tier: ccf, abbr } : null, core: core ? { rank: core, abbr } : null }, citations, year, highlighted: true,
    marks: markKinds.map((k) => ({ kind: k, group: B.marks.groupOf(k) }))
  });
  const PAPERS = [
    P("first", "A", "A*", 310, 2025, "ICLR", "best"), P("first", "A", "A", 120, 2024, "NeurIPS", "oral"), P("first", "B", "B", 64, 2023, "WSDM"), P("first", null, null, 8, 2022, ""),
    P("cofirst", "A", "A*", 190, 2024, "CVPR", "spotlight"), P("second", "B", "B", 71, 2023, "WSDM"), P("second", "A", "A", 55, 2022, "ICML"),
    P("last", "A", "A*", 240, 2025, "ACL", "tot"), P("last", "C", "C", 12, 2021, "ICANN"), P("middle", "A", "A*", 402, 2024, "ICLR", "highlight"), P("middle", "B", "A", 87, 2023, "NeurIPS"), P("middle", null, null, 5, 2020, "")
  ];
  const panelCb = Object.fromEntries(["onSettings", "onCollapse", "onSource", "onSelect", "onOnly", "onYear", "onQuery", "onMarkGroup", "onVenue", "onToggleVenues", "onClearFilters", "onCopy", "onAddVariant", "onRemoveVariant", "onLoadAll", "onCancelLoad", "onResolve", "onCancelResolve"].map((k) => [k, () => {}]));
  panelCb.onCopyUnmatched = async () => false;
  // (in the preview, the panel's link to the settings takes you to the card with the position switches)
  panelCb.onSettings = () => { const c = document.getElementById("card-1"); if (c) window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - 70, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  let panelUi = { collapsed: false, source: "ccf" };
  panelCb.onCollapse = () => { panelUi.collapsed = !panelUi.collapsed; renderPreview(); };
  panelCb.onSource = (src) => { panelUi.source = src; renderPreview(); };
  const panel = B.panel.create(panelCb);
  function panelModel() {
    const source = B.prefs.source(prefs, panelUi);
    const visible = (p) => ({ marks: B.prefs.visibleMarks(prefs, p.marks) });
    const counts = B.marks.summarize(PAPERS.map(visible), prefs.talkRows);
    return {
      ownerName: "A Author", edition: EDITION, prefs, ui: panelUi, sources: B.prefs.sources(prefs), source, summary: B.metrics.summarize(PAPERS, source),
      selection: null, filters: { onlyHighlighted: false, yearStart: null, yearEnd: null },
      marks: counts, markKinds: prefs.marks.award ? B.marks.summarizeKinds(PAPERS.map(visible)) : {}, markGroup: null,
      years: [2025, 2024, 2023, 2022, 2021, 2020], metrics: B.metrics.citationMetrics(PAPERS), byYear: B.metrics.byYear(PAPERS), topVenues: B.metrics.topVenues(PAPERS, 6, prefs.ranks), venueKey: null,
      venuesHasMore: false, venuesExpanded: false,
      coverage: { loaded: PAPERS.length, canLoadMore: true, loadingAll: false, loadMessage: "", hidden: 0, absent: 0, resolving: null, resolveMessage: "", layoutBroken: false,
        unmatched: [{ venue: "Example Workshop on Things", count: 2 }] },
      variants: [], nameHints: { auto: [], suggestions: [] }
    };
  }
  function renderPreview() {
    $("pv-panel").hidden = !prefs.panel.show;
    if (prefs.panel.show) { if (!$("pv-panel").contains(panel.el)) $("pv-panel").append(panel.el); panel.update(panelModel()); }
    $("preview").replaceChildren(...SAMPLES.map(sampleRow));
  }
  renderPreview();

  // the preview scrolls inside itself in a short window: a soft fade at its foot says there is more below
  const pv = document.querySelector(".preview");
  const hint = () => pv.classList.toggle("more", pv.scrollHeight - pv.scrollTop - pv.clientHeight > 2);
  pv.addEventListener("scroll", hint, { passive: true });
  window.addEventListener("resize", hint);
  new ResizeObserver(hint).observe(pv.firstElementChild || pv);
  hint();

  // another settings tab (or Reset) changed something
  B.store.onPrefsChanged((next) => { prefs = next; B.dom.applyColors(prefs.colors); B.dom.applyRowStyle(prefs.rowStyle); renderPreview(); syncers.forEach((fn) => fn()); });
})();
