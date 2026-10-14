// Settings page: what the extension draws, saved the moment a switch moves. The Scholar pages listen for the
// change and redraw at once, so there is no "apply" step. The preview on the right is built with the same
// chip code the Scholar page uses.
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  const { h, t, tn } = B.dom;
  const $ = (id) => document.getElementById(id);

  // SVG helper function
  function s(tag, attrs, ...children) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.setAttribute("class", v);
      else el.setAttribute(k, String(v));
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // Precision Vector Icons for Card Badges & Controls
  const ICONS = {
    globe: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("circle", { cx: "12", cy: "12", r: "10" }),
      s("line", { x1: "2", y1: "12", x2: "22", y2: "12" }),
      s("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })),
    users: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
      s("circle", { cx: "9", cy: "7", r: "4" }),
      s("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
      s("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })),
    palette: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor" }),
      s("circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor" }),
      s("circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor" }),
      s("circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor" }),
      s("path", { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" })),
    columns: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "M3 21h18M4 18h16M6 18V9M10 18V9M14 18V9M18 18V9M12 3l9 4H3l9-4z" })),
    star: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" })),
    merge: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("circle", { cx: "18", cy: "18", r: "3" }),
      s("circle", { cx: "6", cy: "6", r: "3" }),
      s("path", { d: "M6 9v12" }),
      s("path", { d: "M18 15V9a6 6 0 0 0-6-6H9" })),
    eye: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }),
      s("line", { x1: "1", y1: "1", x2: "23", y2: "23" })),
    chart: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }),
      s("path", { d: "M8 17V12" }),
      s("path", { d: "M12 17V8" }),
      s("path", { d: "M16 17V14" })),
    brain: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04zm5 0a2.5 2.5 0 0 1 4.44 2.04 2.5 2.5 0 0 1 1.32 4.24 3 3 0 0 1-.34 5.58 2.5 2.5 0 0 1-2.96 3.08A2.5 2.5 0 0 1 12 19.5v-15A2.5 2.5 0 0 1 14.5 2z" })),
    download: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      s("polyline", { points: "7 10 12 15 17 10" }),
      s("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
    sliders: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("line", { x1: "4", y1: "21", x2: "4", y2: "14" }),
      s("line", { x1: "4", y1: "10", x2: "4", y2: "3" }),
      s("line", { x1: "12", y1: "21", x2: "12", y2: "12" }),
      s("line", { x1: "12", y1: "8", x2: "12", y2: "3" }),
      s("line", { x1: "20", y1: "21", x2: "20", y2: "16" }),
      s("line", { x1: "20", y1: "12", x2: "20", y2: "3" }),
      s("line", { x1: "1", y1: "14", x2: "7", y2: "14" }),
      s("line", { x1: "9", y1: "8", x2: "15", y2: "8" }),
      s("line", { x1: "17", y1: "16", x2: "23", y2: "16" })),
    database: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }),
      s("path", { d: "M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" }),
      s("path", { d: "M3 12c0 1.66 4 3 9 3s9-1.34 9-3" })),
    sparkles: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" })),
    barDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
      s("line", { x1: "7", y1: "4", x2: "7", y2: "20", "stroke-width": "3" })),
    fullDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", fill: "currentColor", "fill-opacity": "0.15" }),
      s("line", { x1: "7", y1: "4", x2: "7", y2: "20", "stroke-width": "3" })),
    tintDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", fill: "currentColor", "fill-opacity": "0.2" }))
  };

  const CARD_ICONS = {
    0: { icon: "globe", color: "#4f46e5", bg: "rgba(79, 70, 229, 0.12)" },
    1: { icon: "users", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
    2: { icon: "palette", color: "#9333ea", bg: "rgba(147, 51, 234, 0.12)" },
    3: { icon: "columns", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
    4: { icon: "star", color: "#ca8a04", bg: "rgba(202, 138, 4, 0.12)" },
    5: { icon: "merge", color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
    6: { icon: "eye", color: "#475569", bg: "rgba(71, 85, 105, 0.12)" },
    7: { icon: "chart", color: "#0891b2", bg: "rgba(8, 145, 178, 0.12)" },
    8: { icon: "brain", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
    9: { icon: "download", color: "#0d9488", bg: "rgba(13, 148, 136, 0.12)" },
    10: { icon: "sliders", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" },
    11: { icon: "database", color: "#e11d48", bg: "rgba(225, 29, 72, 0.12)" }
  };

  function makeIconBadge({ icon, color, bg }) {
    const badge = h("span", { class: "card-icon", style: `background: ${bg}; color: ${color};` });
    if (ICONS[icon]) badge.append(ICONS[icon]());
    return badge;
  }

  const ROLE_COLOR = { first: "var(--rr-c-first, #1a73e8)", cofirst: "var(--rr-c-cofirst, #a142f4)", second: "var(--rr-c-second, #f9ab00)", last: "var(--rr-c-last, #1e8e3e)" };
  const ROLE_DEFAULT = { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" };
  const ROLE_NAME = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };
  const ROLE_SHORT = { first: "1st", cofirst: "Co-1st", second: "2nd", last: "Senior" };
  const MARK_NAME = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight" };

  await B.dom.useLanguage();
  document.documentElement.lang = B.dom.langTag();
  document.documentElement.dir = B.dom.dir();
  document.title = t("extName") + " — " + t("optHeading");
  $("title").textContent = t("extName");
  $("sub").textContent = t("optHeading");
  $("pv-title").replaceChildren(makeIconBadge({ icon: "sparkles", color: "#1a73e8", bg: "rgba(26, 115, 232, 0.12)" }), h("span", { class: "card-title-text" }, t("optPreviewTitle")));
  $("pv-note").textContent = t("optPreviewNote");
  $("storage").textContent = t("optStorage");
  $("ver").textContent = "v" + chrome.runtime.getManifest().version;
  $("lnk-privacy").parentNode.setAttribute("aria-label", t("extName"));

  for (const [id, href, text] of [
    ["lnk-privacy", "https://boyugou.github.io/better-scholar/privacy/", t("optLinkPrivacy")],
    ["lnk-issues", B.dom.REPO + "/issues/new/choose", t("optLinkIssues")],
    ["lnk-source", B.dom.REPO, "GitHub"]
  ]) {
    $(id).href = href;
    $(id).textContent = text;
  }

  await B.store.migrate();
  let prefs = await B.store.loadPrefs();
  const syncers = [];

  let savedTimer = 0;
  async function save() {
    B.dom.applyColors(prefs.colors);
    B.dom.applyRowStyle(prefs.rowStyle);
    renderPreview();
    syncers.forEach((fn) => fn());
    await B.store.savePrefs(prefs);
    $("saved").textContent = t("optSaved");
    $("saved").classList.add("on");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => $("saved").classList.remove("on"), 1400);
  }

  // One switch: a label, an optional hint and colour swatch, a getter and a setter on the prefs
  function option({ key, label, hint, swatch, get, set, off, sub }) {
    const input = h("input", {
      type: "checkbox",
      role: "switch",
      class: "sw",
      "data-pref": key,
      "aria-label": label,
      onChange: () => { set(input.checked); save(); }
    });
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

  // "Enable all" / "Disable all" under a group of switches
  function bulk(group, sets, title, ...extra) {
    const all = (v) => { for (const set of sets) set(v); save(); };
    return h("div", { class: "row bulk", role: "group", "aria-label": title },
      h("button", { class: "btn", type: "button", "data-act": "all-on", "data-group": group, "aria-label": `${t("optAllOn")}: ${title}`, onClick: () => all(true) }, t("optAllOn")),
      h("button", { class: "btn", type: "button", "data-act": "all-off", "data-group": group, "aria-label": `${t("optAllOff")}: ${title}`, onClick: () => all(false) }, t("optAllOff")),
      ...extra);
  }

  // Segmented Control: replaces crude select for small choices (rowStyle, talkRows)
  function segmented({ key, label, hint, choices, icons = {}, get, set, after }) {
    const sel = h("select", {
      class: "sel sel-hidden-accessible",
      "data-pref": key,
      "aria-label": label,
      onChange: () => {
        const was = get();
        set(sel.value);
        syncSegmented(sel.value);
        save().then(() => { if (after && was !== get()) after(); });
      }
    }, choices.map(([v, l]) => h("option", { value: v }, l)));

    const buttons = choices.map(([val, text]) => {
      const iconSvg = icons[val] ? icons[val]() : null;
      const btn = h("button", {
        type: "button",
        class: "seg-btn",
        "data-val": val,
        "aria-pressed": "false",
        "aria-label": `${label}: ${text}`,
        onClick: (e) => {
          e.preventDefault();
          const was = get();
          if (was === val) return;
          sel.value = val;
          set(val);
          syncSegmented(val);
          save().then(() => { if (after && was !== val) after(); });
        }
      }, iconSvg, h("span", { class: "seg-text" }, text));
      return { val, btn };
    });

    const segGroup = h("div", { class: "seg-control", role: "radiogroup", "aria-label": label },
      ...buttons.map((b) => b.btn));

    function syncSegmented(activeVal) {
      buttons.forEach(({ val, btn }) => {
        const active = val === activeVal;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    const row = h("div", { class: "opt opt-segmented" },
      h("span", { class: "txt" },
        h("span", { class: "name" }, label),
        hint ? h("span", { class: "hint" }, hint) : null),
      segGroup,
      sel);

    const sync = () => {
      const v = get();
      sel.value = v;
      syncSegmented(v);
    };
    syncers.push(sync);
    sync();
    return row;
  }

  // Searchable Custom Language Picker: replaces crude native select
  function customLanguagePicker({ key, label, hint, choices, get, set, after }) {
    const sel = h("select", {
      class: "sel sel-hidden-accessible",
      "data-pref": key,
      "aria-label": label,
      onChange: () => {
        const was = get();
        set(sel.value);
        updateTrigger(sel.value);
        save().then(() => { if (after && was !== get()) after(); });
      }
    }, choices.map(([v, l]) => h("option", { value: v }, l)));

    const triggerBadge = h("span", { class: "custom-select-badge" }, "EN");
    const triggerLabel = h("span", { class: "custom-select-label" }, "English");
    const chevron = s("svg", { class: "custom-select-chevron", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2" },
      s("path", { d: "M6 9l6 6 6-6" }));

    const triggerBtn = h("button", {
      type: "button",
      class: "custom-select-trigger",
      "aria-label": label,
      "aria-haspopup": "listbox",
      onClick: (e) => {
        e.stopPropagation();
        togglePopover();
      }
    }, triggerBadge, triggerLabel, chevron);

    const searchInput = h("input", {
      type: "search",
      class: "custom-select-search",
      placeholder: t("filterPlaceholder"),
      "aria-label": t("filterPlaceholder")
    });

    const listContainer = h("div", { class: "custom-select-list", role: "listbox", "aria-label": label });
    const popover = h("div", { class: "custom-select-popover", style: "display: none;" }, searchInput, listContainer);
    const wrap = h("div", { class: "custom-select-wrap" }, triggerBtn, popover, sel);

    function updateTrigger(val) {
      const match = choices.find(([v]) => v === val);
      const text = match ? match[1] : val;
      const code = val === "auto" ? "AUTO" : val === "keep" ? "KEEP" : val.toUpperCase();
      triggerBadge.textContent = code;
      triggerLabel.textContent = text;
    }

    function renderList(query) {
      const q = (query || "").trim().toLowerCase();
      const filtered = choices.filter(([v, l]) => !q || v.toLowerCase().includes(q) || l.toLowerCase().includes(q));
      listContainer.replaceChildren(...filtered.map(([v, l]) => {
        const active = v === get();
        const item = h("div", {
          class: "custom-select-item" + (active ? " active" : ""),
          role: "option",
          "aria-selected": active ? "true" : "false",
          onClick: () => {
            const was = get();
            sel.value = v;
            set(v);
            updateTrigger(v);
            closePopover();
            save().then(() => { if (after && was !== v) after(); });
          }
        }, h("span", {}, l), h("span", { class: "custom-select-item-sub" }, v));
        return item;
      }));
    }

    function openPopover() {
      popover.style.display = "flex";
      wrap.classList.add("open");
      renderList("");
      searchInput.value = "";
      searchInput.focus();
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onDocKey);
    }

    function closePopover() {
      popover.style.display = "none";
      wrap.classList.remove("open");
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    }

    function togglePopover() {
      if (popover.style.display === "none") openPopover();
      else closePopover();
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) closePopover();
    }

    function onDocKey(e) {
      if (e.key === "Escape") closePopover();
    }

    searchInput.addEventListener("input", () => renderList(searchInput.value));

    const row = h("div", { class: "opt opt-custom-select" },
      h("span", { class: "txt" },
        h("span", { class: "name" }, label),
        hint ? h("span", { class: "hint" }, hint) : null),
      wrap);

    const sync = () => {
      const v = get();
      sel.value = v;
      updateTrigger(v);
    };
    syncers.push(sync);
    sync();
    return row;
  }

  // Academic Color Theme Presets
  const THEME_PRESETS = [
    { id: "scholar", name: "Classic Scholar", colors: { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" } },
    { id: "ocean", name: "Ocean Sapphire", colors: { first: "#0284c7", cofirst: "#6366f1", second: "#0d9488", last: "#059669" } },
    { id: "sunset", name: "Sunset Orchid", colors: { first: "#db2777", cofirst: "#9333ea", second: "#ea580c", last: "#16a34a" } },
    { id: "contrast", name: "High Contrast", colors: { first: "#0047ba", cofirst: "#6a1b9a", second: "#c2410c", last: "#0b6623" } },
    { id: "nordic", name: "Nordic Slate", colors: { first: "#3b82f6", cofirst: "#8b5cf6", second: "#f59e0b", last: "#10b981" } }
  ];

  // Curated Color Palettes per Role
  const ROLE_PALETTES = {
    first:   ["#1a73e8", "#2563eb", "#0284c7", "#4f46e5", "#0d9488", "#dc2626", "#0047ba", "#1e40af"],
    cofirst: ["#a142f4", "#9333ea", "#7c3aed", "#c026d3", "#6366f1", "#db2777", "#6a1b9a", "#86198f"],
    second:  ["#f9ab00", "#d97706", "#ea580c", "#ca8a04", "#eab308", "#f59e0b", "#b25900", "#9a3412"],
    last:    ["#1e8e3e", "#16a34a", "#059669", "#15803d", "#047857", "#10b981", "#0b6623", "#14532d"]
  };

  // WCAG Luminance and Contrast Ratio Calculation
  function calculateLuminance(hex) {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return 0.5;
    const [r, g, b] = [0, 2, 4].map((i) => {
      const v = parseInt(clean.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function getContrastBadge(hex) {
    const l1 = calculateLuminance(hex);
    const rLight = 1.05 / (l1 + 0.05);
    const ratioLight = Math.max(rLight, 1 / rLight);
    const rDark = (l1 + 0.05) / 0.07;
    const ratioDark = Math.max(rDark, 1 / rDark);
    const bestRatio = Math.max(ratioLight, ratioDark);
    const isPass = ratioLight >= 4.5 || ratioDark >= 4.5;
    const isAAA = bestRatio >= 7.0;
    const label = isAAA ? `AAA ${bestRatio.toFixed(1)}:1` : isPass ? `AA ${bestRatio.toFixed(1)}:1` : `${bestRatio.toFixed(1)}:1`;
    return { isPass, label };
  }

  // Theme Studio Bar Component
  function themePresetsBar() {
    const chips = THEME_PRESETS.map((p) => {
      const dots = [p.colors.first, p.colors.cofirst, p.colors.second, p.colors.last].map((c) =>
        h("span", { class: "theme-strip-dot", style: `background: ${c};` }));
      const btn = h("button", {
        type: "button",
        class: "theme-preset-card",
        "data-theme-preset": p.id,
        "aria-label": `${p.name} theme preset`,
        onClick: (e) => {
          e.preventDefault();
          for (const [r, c] of Object.entries(p.colors)) prefs.colors[r] = c;
          B.dom.applyColors(prefs.colors);
          save();
        }
      }, h("span", { class: "theme-swatch-strip" }, ...dots), p.name);
      return { preset: p, el: btn };
    });

    const bar = h("div", { class: "theme-presets-bar", role: "group", "aria-label": "Theme Presets" },
      ...chips.map((c) => c.el));

    const sync = () => {
      chips.forEach(({ preset, el }) => {
        const matches = Object.entries(preset.colors).every(([r, c]) => (prefs.colors[r] || ROLE_DEFAULT[r]).toLowerCase() === c.toLowerCase());
        el.classList.toggle("active", matches);
      });
    };
    syncers.push(sync);
    sync();
    return bar;
  }

  // High-End Role Studio Card (Live preview chip, curated palette, hex input pill, contrast rating)
  function roleStudioCard(role) {
    const defaultColor = ROLE_DEFAULT[role];
    const roleLabel = t(ROLE_NAME[role]);
    const shortBadge = ROLE_SHORT[role] || role;

    const input = h("input", {
      type: "color",
      class: "clr",
      "data-pref": "colors." + role,
      "aria-label": roleLabel,
      onInput: () => {
        const val = input.value;
        prefs.colors[role] = val;
        B.dom.applyColors(prefs.colors);
        renderPreview();
        updateVisuals(val);
      },
      onChange: () => {
        const val = input.value;
        prefs.colors[role] = val;
        save();
        updateVisuals(val);
      }
    });

    const previewChip = h("span", { class: "role-swatch-badge", style: `background: ${defaultColor};`, "aria-hidden": "true" });
    const liveDot = h("span", { class: "color-dot-live", style: `background: ${defaultColor};` });
    const hexLabel = h("span", { class: "color-hex" }, defaultColor.toUpperCase());
    const contrastPill = h("span", { class: "contrast-badge pass" }, "AA 4.8:1");

    const pill = h("label", { class: "hex-input-pill", "aria-label": `${roleLabel} color code` },
      liveDot,
      hexLabel,
      input);

    const palette = ROLE_PALETTES[role] || [];
    const dotButtons = palette.map((color) => {
      const dot = h("button", {
        type: "button",
        class: "curated-dot-btn",
        style: `background: ${color};`,
        "aria-label": `${roleLabel}: ${color}`,
        title: color,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          input.value = color;
          prefs.colors[role] = color;
          B.dom.applyColors(prefs.colors);
          renderPreview();
          save();
          updateVisuals(color);
        }
      });
      return { color, el: dot };
    });

    const resetBtn = h("button", {
      type: "button",
      class: "btn sub color-reset-btn",
      "aria-label": `${t("optColorsReset")}: ${roleLabel}`,
      title: t("optColorsReset"),
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        prefs.colors[role] = "";
        B.dom.applyColors(prefs.colors);
        save();
        updateVisuals(defaultColor);
      }
    }, "↺");

    function updateVisuals(colorVal) {
      const current = (colorVal || defaultColor).toLowerCase();
      previewChip.style.background = current;
      liveDot.style.background = current;
      hexLabel.textContent = current.toUpperCase();
      dotButtons.forEach(({ color, el }) => {
        const match = color.toLowerCase() === current;
        el.classList.toggle("active", match);
        el.setAttribute("aria-pressed", match ? "true" : "false");
      });
      const isCustom = current !== defaultColor.toLowerCase();
      resetBtn.style.display = isCustom ? "inline-flex" : "none";
      const { isPass, label } = getContrastBadge(current);
      contrastPill.className = "contrast-badge " + (isPass ? "pass" : "warn");
      contrastPill.textContent = label;
    }

    const row = h("div", { class: "role-studio-card" },
      h("div", { class: "role-info-wrap" },
        previewChip,
        h("span", { class: "name" }, roleLabel)),
      h("div", { class: "role-studio-controls" },
        h("div", { class: "curated-palette-row", role: "group", "aria-label": `${roleLabel} curated palette` },
          ...dotButtons.map((d) => d.el)),
        pill,
        contrastPill,
        resetBtn));

    const sync = () => {
      const cur = prefs.colors[role] || defaultColor;
      input.value = cur;
      updateVisuals(cur);
    };
    syncers.push(sync);
    sync();
    return row;
  }

  // The optional Semantic Scholar API key
  function keyRow() {
    const input = h("input", {
      type: "text",
      class: "key",
      "data-pref": "s2key",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: "••••••••",
      "aria-label": t("optSemanticKey"),
      onChange: async () => {
        input.value = input.value.replace(/[^\x21-\x7e]/g, "");
        await B.store.saveS2Key(input.value);
        $("saved").textContent = t("optSaved");
        $("saved").classList.add("on");
        setTimeout(() => $("saved").classList.remove("on"), 1400);
      }
    });
    B.store.loadS2Key().then((k) => { input.value = k; });
    return h("label", { class: "opt" },
      h("span", { class: "txt" },
        h("span", { class: "name" }, t("optSemanticKey")),
        h("span", { class: "hint" }, t("optSemanticKeyHint"))),
      input);
  }

  const LANGS = B.i18n.LANGUAGES.map(([code, name]) => [code, name]);
  const card = (idx, title, desc, ...rows) => {
    const iconObj = CARD_ICONS[idx] || { icon: "sliders", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" };
    const h2 = h("h2", {}, makeIconBadge(iconObj), h("span", { class: "card-title-text" }, title));
    return h("section", { class: "card" }, h2, desc ? h("p", { class: "desc" }, desc) : null, ...rows);
  };

  // ---- Diagnostic & Storage Controls ----
  const diagBtn = h("button", {
    class: "btn",
    type: "button",
    "data-act": "copy-diagnostics",
    "aria-label": t("optCopyDiagnostics"),
    onClick: async () => {
      const m = chrome.runtime.getManifest();
      const text = ["Better Scholar " + m.version, navigator.userAgent, "interface language: " + B.dom.langTag(), "settings: " + JSON.stringify(prefs)].join("\n");
      if (await B.dom.copyText(text)) {
        diagBtn.textContent = t("copied");
        setTimeout(() => { diagBtn.textContent = t("optCopyDiagnostics"); }, 1400);
      }
    }
  }, t("optCopyDiagnostics"));

  const cacheNote = h("p", { class: "note" });
  async function showCacheCount() {
    const n = Object.keys(await B.store.loadResolved()).length;
    cacheNote.textContent = n === 0 ? t("optCacheNone") : tn("optCacheCount", n, [String(n)]);
  }

  const clearBtn = h("button", {
    class: "btn",
    type: "button",
    "data-act": "clear-cache",
    "aria-label": t("optClearCache"),
    onClick: async () => {
      await B.store.clearResolved();
      await showCacheCount();
      clearBtn.textContent = t("optCleared");
      setTimeout(() => { clearBtn.textContent = t("optClearCache"); }, 1400);
    }
  }, t("optClearCache"));

  // Cache viewer modal
  let cacheDialog = null;
  async function showCacheViewer() {
    if (cacheDialog) { cacheDialog.remove(); cacheDialog = null; }
    const resolved = await B.store.loadResolved();
    const entries = Object.entries(resolved).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));

    const search = h("input", { type: "search", class: "cache-search-input", placeholder: t("optCacheSearch"), "aria-label": t("optCacheSearch") });
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

    const copyJsonBtn = h("button", {
      class: "btn",
      type: "button",
      "data-act": "copy-cache-json",
      "aria-label": t("optCacheCopy"),
      onClick: async () => {
        if (await B.dom.copyText(JSON.stringify(resolved, null, 2))) {
          copyJsonBtn.textContent = t("copied");
          setTimeout(() => { copyJsonBtn.textContent = t("optCacheCopy"); }, 1400);
        }
      }
    }, t("optCacheCopy"));

    const closeBtn = h("button", { class: "btn", type: "button", "data-act": "close-cache", "aria-label": t("cancel"), onClick: () => cacheDialog.close() }, t("cancel"));

    cacheDialog = h("dialog", { class: "cache-modal" },
      h("div", { class: "cache-modal-head" },
        h("h2", {}, t("optCacheTitle")),
        h("button", { class: "cache-close", type: "button", "aria-label": t("cancel"), title: t("cancel"), onClick: () => cacheDialog.close() }, "×")),
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

  const viewBtn = h("button", { class: "btn", type: "button", "data-act": "view-cache", "aria-label": t("optViewCache"), onClick: () => showCacheViewer() }, t("optViewCache"));

  // Reset confirmation
  const resetBox = h("span", { class: "reset-box" });
  const resetBtn = h("button", { class: "btn", type: "button", "data-act": "reset", "aria-label": t("optReset"), onClick: () => askReset() }, t("optReset"));
  function askReset() {
    const yes = h("button", { class: "btn danger", type: "button", "data-act": "reset-confirm", "aria-label": t("optReset"), onClick: () => { prefs = B.prefs.defaults(); save(); resetBox.replaceChildren(resetBtn); } }, t("optReset"));
    const no = h("button", { class: "btn", type: "button", "data-act": "reset-cancel", "aria-label": t("cancel"), onClick: () => resetBox.replaceChildren(resetBtn) }, t("cancel"));
    resetBox.replaceChildren(h("span", { class: "ask" }, t("optResetConfirm")), yes, no);
    no.focus();
  }
  resetBox.append(resetBtn);

  // Configuration parser & apply
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

  const copyConfigBtn = h("button", {
    class: "btn",
    type: "button",
    "data-act": "config-copy",
    "aria-label": t("optConfigCopy"),
    onClick: async () => {
      const text = JSON.stringify(prefs, null, 2);
      if (await B.dom.copyText(text)) {
        copyConfigBtn.textContent = t("copied");
        setTimeout(() => { copyConfigBtn.textContent = t("optConfigCopy"); }, 1400);
      }
    }
  }, t("optConfigCopy"));

  const exportConfigBtn = h("button", {
    class: "btn",
    type: "button",
    "data-act": "config-export",
    "aria-label": t("optConfigExport"),
    onClick: () => {
      B.dom.downloadFile("better-scholar-config.json", JSON.stringify(prefs, null, 2), "application/json");
    }
  }, t("optConfigExport"));

  const pasteConfigBtn = h("button", {
    class: "btn",
    type: "button",
    "data-act": "config-import",
    "aria-label": t("optConfigImport"),
    onClick: async () => {
      try {
        const text = await navigator.clipboard.readText();
        const parsed = parseConfig(text);
        await applyImportedConfig(parsed);
        flashConfigStatus(t("optSaved"));
      } catch (e) {
        flashConfigStatus("Invalid format");
      }
    }
  }, t("optConfigImport"));

  const fileInput = h("input", {
    type: "file",
    accept: ".json,.toml,.txt",
    "aria-label": t("optConfigImportFile"),
    style: "display:none",
    onChange: (e) => {
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
    }
  });

  const importFileBtn = h("button", { class: "btn", type: "button", "data-act": "config-import-file", "aria-label": t("optConfigImportFile"), onClick: () => fileInput.click() }, t("optConfigImportFile"));

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
    h("span", { class: "presets-title faint" }, t("optConfigPreset") + ":"),
    h("button", { class: "btn preset-chip", type: "button", "data-preset": "senior", "aria-label": t("optPresetSenior"), onClick: () => applyPreset("senior") },
      h("span", { class: "preset-badge", "aria-hidden": "true" }, "🎓"),
      t("optPresetSenior")),
    h("button", { class: "btn preset-chip", type: "button", "data-preset": "first", "aria-label": t("optPresetFirst"), onClick: () => applyPreset("first") },
      h("span", { class: "preset-badge", "aria-hidden": "true" }, "🥇"),
      t("optPresetFirst")),
    h("button", { class: "btn preset-chip", type: "button", "data-preset": "minimal", "aria-label": t("optPresetMinimal"), onClick: () => applyPreset("minimal") },
      h("span", { class: "preset-badge", "aria-hidden": "true" }, "⚡"),
      t("optPresetMinimal")));

  const configText = h("textarea", { class: "config-text", "data-act": "config-input", "aria-label": t("optConfigEditor"), rows: "6", spellcheck: "false", placeholder: '{\n  "colors": {\n    "first": "#1a73e8",\n    "last": "#1e8e3e"\n  }\n}' });
  const configApplyBtn = h("button", {
    class: "btn primary",
    type: "button",
    "data-act": "config-apply",
    "aria-label": t("optConfigApply"),
    onClick: async () => {
      try {
        const parsed = parseConfig(configText.value);
        await applyImportedConfig(parsed);
        flashConfigStatus(t("optSaved"));
      } catch (e) {
        flashConfigStatus("Invalid: " + (e.message || e));
      }
    }
  }, t("optConfigApply"));

  const configDetails = h("details", { class: "config-editor" },
    h("summary", { class: "btn sub", "aria-label": t("optConfigEditor") }, t("optConfigEditor")),
    h("div", { class: "config-editor-body" }, configText, h("div", { class: "row" }, configApplyBtn, configStatus)));

  // ---- Assemble Cards ----
  $("controls").append(
    card(0, t("optLanguageTitle"), t("optLanguageHint"),
      customLanguagePicker({ key: "language", label: t("optLanguageUi"), choices: [["auto", t("optLanguageAuto")], ...LANGS], get: () => prefs.language, set: (v) => { prefs.language = v; }, after: () => location.reload() }),
      customLanguagePicker({ key: "scholarLanguage", label: t("optLanguageScholar"), hint: t("optLanguageScholarHint"), choices: [["keep", t("optLanguageKeep")], ...LANGS], get: () => prefs.scholarLanguage, set: (v) => { prefs.scholarLanguage = v; } })),
    card(1, t("optRolesTitle"), t("optRolesHint"),
      ...B.prefs.ROLES.map((role) => option({ key: "roles." + role, label: t(ROLE_NAME[role]), swatch: ROLE_COLOR[role], get: () => prefs.roles[role], set: (v) => { prefs.roles[role] = v; } })),
      option({ key: "markName", label: t("optMarkName"), hint: t("optMarkNameHint"), get: () => prefs.markName, set: (v) => { prefs.markName = v; } }),
      bulk("roles", [...B.prefs.ROLES.map((role) => (v) => { prefs.roles[role] = v; }), (v) => { prefs.markName = v; }], t("optRolesTitle"))),
    card(2, t("optColorsTitle"), t("optColorsHint"),
      themePresetsBar(),
      ...B.prefs.ROLES.map(roleStudioCard),
      segmented({
        key: "rowStyle",
        label: t("optRowStyle"),
        choices: [["full", t("optRowStyleFull")], ["bar", t("optRowStyleBar")], ["tint", t("optRowStyleTint")]],
        icons: { full: ICONS.fullDiagram, bar: ICONS.barDiagram, tint: ICONS.tintDiagram },
        get: () => prefs.rowStyle,
        set: (v) => { prefs.rowStyle = v; }
      }),
      h("div", { class: "row" },
        h("button", {
          class: "btn",
          type: "button",
          "data-act": "colors-reset",
          "aria-label": t("optColorsReset"),
          onClick: () => {
            for (const r of B.prefs.ROLES) prefs.colors[r] = "";
            B.dom.applyColors(prefs.colors);
            save();
          }
        }, t("optColorsReset")))),
    card(3, t("optRanksTitle"), null,
      option({ key: "ranks.ccf", label: t("optCcf"), hint: t("optCcfHint"), get: () => prefs.ranks.ccf, set: (v) => { prefs.ranks.ccf = v; } }),
      option({ key: "ranks.core", label: t("optCore"), hint: t("optCoreHint"), get: () => prefs.ranks.core, set: (v) => { prefs.ranks.core = v; } }),
      bulk("ranks", ["ccf", "core"].map((k) => (v) => { prefs.ranks[k] = v; }), t("optRanksTitle"))),
    card(4, t("optMarksTitle"), t("marksHint"),
      ...B.prefs.MARK_GROUPS.map((g) => option({ key: "marks." + g, label: t(MARK_NAME[g]), hint: g === "award" ? t("optMarkAwardHint") : "", get: () => prefs.marks[g], set: (v) => { prefs.marks[g] = v; } })),
      bulk("marks", B.prefs.MARK_GROUPS.map((g) => (v) => { prefs.marks[g] = v; }), t("optMarksTitle")),
      segmented({
        key: "talkRows",
        label: t("optTalkRows"),
        hint: t("optTalkRowsHint"),
        choices: [["separate", t("optTalkSeparate")], ["pair", t("optTalkPair")], ["talks", t("optTalkAll")]],
        get: () => prefs.talkRows,
        set: (v) => { prefs.talkRows = v; }
      })),
    card(5, t("optMergeTitle"), t("optMergeHint"),
      option({ key: "mergeDuplicates", label: t("optMergeLabel"), hint: t("optMergeLabelHint"), get: () => prefs.mergeDuplicates, set: (v) => { prefs.mergeDuplicates = v; } })),
    card(6, t("optHideTitle"), t("optHideHint"),
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
    card(7, t("optPanelTitle"), null,
      option({ key: "panel.show", label: t("optPanelShow"), hint: t("optPanelShowHint"), get: () => prefs.panel.show, set: (v) => { prefs.panel.show = v; } }),
      ...[["summary", t("optPanelSummary"), t("optPanelSummaryHint")], ["copy", t("optPanelCopy"), t("optPanelCopyHint")], ["marks", t("optPanelMarks"), t("optPanelMarksHint")], ["filters", t("optPanelFilters"), t("optPanelFiltersHint")],
        ["metrics", t("optPanelMetrics"), t("optPanelMetricsHint")], ["years", t("optPanelYears"), t("optPanelYearsHint")], ["venues", t("optPanelVenues"), t("optPanelVenuesHint")], ["status", t("optPanelStatus"), t("optPanelStatusHint")], ["names", t("optPanelNames"), t("optPanelNamesHint")]]
        .map(([part, label, hint]) => option({ key: "panel." + part, sub: true, label, hint, get: () => prefs.panel[part], set: (v) => { prefs.panel[part] = v; }, off: () => !prefs.panel.show || (part === "copy" && !prefs.panel.summary) })),
      bulk("panel", [...B.prefs.PANEL_PARTS.filter((k) => k !== "show").map((k) => (v) => { prefs.panel[k] = v; }), (v) => { if (v) prefs.panel.show = true; }], t("optPanelTitle"),
        h("button", {
          class: "btn",
          type: "button",
          "data-act": "panel-compact",
          "aria-label": t("optPanelCompact"),
          onClick: () => {
            for (const k of ["summary", "copy", "marks", "years", "venues", "status", "names"]) prefs.panel[k] = false;
            for (const k of ["filters", "metrics"]) prefs.panel[k] = true;
            prefs.panel.show = true;
            save();
          }
        }, t("optPanelCompact")))),
    card(8, t("optSemanticTitle"), t("optSemanticHint"),
      option({ key: "semanticScholar", label: t("optSemanticLabel"), hint: t("optSemanticLabelHint"), get: () => prefs.semanticScholar, set: (v) => { prefs.semanticScholar = v; } }),
      keyRow()),
    card(9, t("optLoadTitle"), null,
      option({ key: "autoLoad", label: t("optAutoLoad"), hint: t("optAutoLoadHint"), get: () => prefs.autoLoad, set: (v) => { prefs.autoLoad = v; } })),
    card(10, t("optConfigTitle"), t("optConfigHint"),
      presetRow,
      h("div", { class: "row" }, copyConfigBtn, exportConfigBtn, pasteConfigBtn, importFileBtn, fileInput),
      configDetails),
    card(11, t("optDataTitle"), null, h("div", { class: "row" }, viewBtn, clearBtn, resetBox, diagBtn, cacheNote)));
  showCacheCount();

  // Sticky TOC Navigation
  const cards = [...$("controls").querySelectorAll(":scope > section.card")];
  const toc = h("nav", { class: "toc", "aria-label": t("optHeading") },
    ...cards.map((c, i) => {
      c.id = "card-" + i;
      const titleSpan = c.querySelector(".card-title-text");
      const titleText = titleSpan ? titleSpan.textContent : c.querySelector("h2").textContent;
      return h("a", {
        href: "#card-" + i,
        "data-card": c.id,
        "aria-label": titleText,
        onClick: (e) => {
          e.preventDefault();
          window.scrollTo({
            top: Math.max(0, c.getBoundingClientRect().top + scrollY - toc.offsetHeight - 14),
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
          });
        }
      }, titleText);
    }));

  const searchInput = h("input", { type: "search", class: "opt-search", "data-act": "filter-settings", placeholder: t("filterPlaceholder"), "aria-label": t("filterPlaceholder") });
  const searchIcon = h("span", { class: "opt-search-icon", "aria-hidden": "true" });
  const searchClear = h("button", { class: "opt-search-clear", type: "button", "aria-label": t("cancel"), title: t("cancel"), onClick: () => { searchInput.value = ""; filterSettings(""); searchInput.focus(); } });
  searchClear.hidden = true;
  const searchKbd = h("kbd", { class: "opt-search-kbd", "aria-hidden": "true" }, "/");
  const searchBox = h("div", { class: "opt-search-box" }, searchIcon, searchInput, searchClear, searchKbd);

  function filterSettings(query) {
    const q = (query || "").trim().toLowerCase();
    searchClear.hidden = !q;
    searchKbd.hidden = !!q;
    cards.forEach((card, idx) => {
      const h2 = (card.querySelector("h2")?.textContent || "").toLowerCase();
      const desc = (card.querySelector(".desc")?.textContent || "").toLowerCase();
      const opts = [...card.querySelectorAll(".opt, .role-studio-card")];
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
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  $("controls").prepend(toc, searchBox);
  try {
    const seen = new Set();
    const mark = () => {
      const first = cards.find((c) => seen.has(c.id));
      toc.querySelectorAll("a").forEach((a) => {
        if (first && a.dataset.card === first.id) {
          if (!a.hasAttribute("aria-current")) {
            a.setAttribute("aria-current", "true");
            const box = toc.getBoundingClientRect(), r = a.getBoundingClientRect();
            if (r.left < box.left + 8 || r.right > box.right - 8) toc.scrollTo({ left: toc.scrollLeft + (r.left - box.left) - 24, behavior: "auto" });
          }
        } else {
          a.removeAttribute("aria-current");
        }
      });
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target.id);
        else seen.delete(e.target.id);
      }
      mark();
    }, { rootMargin: "-70px 0px -55% 0px" });
    cards.forEach((c) => io.observe(c));
  } catch (e) { /* no observer */ }

  // ---- the preview -------------------------------------------------------
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

  // Preview Theme Switcher (Light / Dark Scholar simulation)
  const pvAside = document.querySelector(".preview");
  const pvThemeBar = h("div", { class: "pv-theme-toggle", role: "group", "aria-label": "Preview Theme" });
  const lightPvBtn = h("button", {
    type: "button",
    class: "pv-theme-btn active",
    "aria-pressed": "true",
    "aria-label": "Preview on light Google Scholar",
    onClick: () => {
      pvAside.classList.remove("pv-dark");
      lightPvBtn.classList.add("active");
      lightPvBtn.setAttribute("aria-pressed", "true");
      darkPvBtn.classList.remove("active");
      darkPvBtn.setAttribute("aria-pressed", "false");
    }
  }, "☀️ Light");

  const darkPvBtn = h("button", {
    type: "button",
    class: "pv-theme-btn",
    "aria-pressed": "false",
    "aria-label": "Preview on dark Google Scholar",
    onClick: () => {
      pvAside.classList.add("pv-dark");
      darkPvBtn.classList.add("active");
      darkPvBtn.setAttribute("aria-pressed", "true");
      lightPvBtn.classList.remove("active");
      lightPvBtn.setAttribute("aria-pressed", "false");
    }
  }, "🌙 Dark");

  pvThemeBar.append(lightPvBtn, darkPvBtn);
  $("pv-title").parentNode.append(pvThemeBar);

  const hint = () => pvAside.classList.toggle("more", pvAside.scrollHeight - pvAside.scrollTop - pvAside.clientHeight > 2);
  pvAside.addEventListener("scroll", hint, { passive: true });
  window.addEventListener("resize", hint);
  new ResizeObserver(hint).observe(pvAside.firstElementChild || pvAside);
  hint();

  B.store.onPrefsChanged((next) => {
    prefs = next;
    B.dom.applyColors(prefs.colors);
    B.dom.applyRowStyle(prefs.rowStyle);
    renderPreview();
    syncers.forEach((fn) => fn());
  });
})();
