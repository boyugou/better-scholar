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
    duplicate: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }),
      s("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })),
    terminal: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("polyline", { points: "4 17 10 11 4 5" }),
      s("line", { x1: "12", y1: "19", x2: "20", y2: "19" })),
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
    5: { icon: "duplicate", color: "#0f766e", bg: "rgba(15, 118, 110, 0.12)" },
    6: { icon: "merge", color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
    7: { icon: "eye", color: "#475569", bg: "rgba(71, 85, 105, 0.12)" },
    8: { icon: "chart", color: "#0891b2", bg: "rgba(8, 145, 178, 0.12)" },
    9: { icon: "brain", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
    10: { icon: "download", color: "#0d9488", bg: "rgba(13, 148, 136, 0.12)" },
    11: { icon: "terminal", color: "#4338ca", bg: "rgba(67, 56, 202, 0.12)" },
    12: { icon: "sliders", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" },
    13: { icon: "database", color: "#e11d48", bg: "rgba(225, 29, 72, 0.12)" }
  };

  function makeIconBadge({ icon, color, bg }) {
    const badge = h("span", { class: "card-icon", style: `background: ${bg}; color: ${color};` });
    if (ICONS[icon]) badge.append(ICONS[icon]());
    return badge;
  }

  const ROLE_COLOR = { first: "var(--rr-c-first, #1a73e8)", cofirst: "var(--rr-c-cofirst, #a142f4)", second: "var(--rr-c-second, #f9ab00)", last: "var(--rr-c-last, #1e8e3e)" };
  const ROLE_DEFAULT = { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" };
  const ROLE_NAME = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };
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

  // A setting is its path in the record (lib/prefs.js SETTINGS); every control below is found by it: `data-pref="<path>"` (the settings reference for agents says so).
  const at = (path) => path.split(".").reduce((o, k) => o[k], prefs);
  const put = (path, value) => { const keys = path.split("."); keys.slice(0, -1).reduce((o, k) => o[k], prefs)[keys[keys.length - 1]] = value; };
  let uid = 0;
  // the name of a control is its label; its hint is what a screen reader reads after it
  const described = (label, hint) => { const id = "opt-" + ++uid; return { name: h("span", { class: "name", id: id + "-n" }, label), hint: hint ? h("span", { class: "hint", id: id + "-h" }, hint) : null, ids: { "aria-labelledby": id + "-n", "aria-describedby": hint ? id + "-h" : null } }; };

  // One switch
  function option({ path, label, hint, swatch, sub, off }) {
    const d = described(label, hint);
    const input = h("input", { type: "checkbox", role: "switch", class: "sw", "data-pref": path, ...d.ids, onChange: () => { put(path, input.checked); save(); } });
    if (swatch) d.name.prepend(h("span", { class: "swatch", style: "background:" + swatch }));
    const row = h("label", { class: "opt" + (sub ? " sub" : "") }, h("span", { class: "txt" }, d.name, d.hint), input);
    const sync = () => {
      input.checked = !!at(path);
      const disabled = off ? off() : false;
      input.disabled = disabled;
      row.classList.toggle("disabled", disabled);
    };
    syncers.push(sync);
    sync();
    return row;
  }

  // "Enable all" / "Disable all" under a group of switches: every one of `paths` is set, and saved as one change
  // (`enables`: switches that Enable all also turns on, such as the panel itself for its parts)
  function bulk(group, paths, title, { enables = [] } = {}, ...extra) {
    const all = (v) => { for (const path of paths) put(path, v); if (v) for (const path of enables) put(path, true); save(); };
    return h("div", { class: "row bulk", role: "group", "aria-label": title },
      h("button", { class: "btn", type: "button", "data-act": "all-on", "data-group": group, "aria-label": `${t("optAllOn")}: ${title}`, onClick: () => all(true) }, t("optAllOn")),
      h("button", { class: "btn", type: "button", "data-act": "all-off", "data-group": group, "aria-label": `${t("optAllOff")}: ${title}`, onClick: () => all(false) }, t("optAllOff")),
      ...extra);
  }

  // A choice among a few values, as radio buttons drawn as one segmented control (the arrow keys move between them, as in any radio group)
  function segmented({ path, label, hint, choices, icons = {} }) {
    const d = described(label, hint);
    const radios = choices.map(([value, text]) => {
      const input = h("input", { type: "radio", class: "seg-radio", name: "seg-" + path, value, "data-pref": path, onChange: () => { if (input.checked) { put(path, value); save(); } } });
      return { value, input, label: h("label", { class: "seg-btn", "data-val": value }, input, icons[value] ? icons[value]() : null, h("span", { class: "seg-text" }, text)) };
    });
    const row = h("div", { class: "opt opt-segmented" }, h("span", { class: "txt" }, d.name, d.hint),
      h("div", { class: "seg-control", role: "radiogroup", ...d.ids }, ...radios.map((r) => r.label)));
    const sync = () => radios.forEach(({ value, input, label: lab }) => { const on = at(path) === value; input.checked = on; lab.classList.toggle("active", on); });
    syncers.push(sync);
    sync();
    return row;
  }

  // A language: the plain list of the languages (each in its own name) with the setting's own "none" first. The interface language reloads the page once chosen.
  function languageSelect({ path, label, hint, none, reload }) {
    const d = described(label, hint);
    const sel = h("select", { class: "sel", "data-pref": path, ...d.ids, onChange: () => { put(path, sel.value); save().then(() => { if (reload) location.reload(); }); } },
      h("option", { value: none[0] }, none[1]), ...B.i18n.LANGUAGES.map(([code, name]) => h("option", { value: code, lang: code.replace("_", "-") }, name)));
    const row = h("div", { class: "opt" }, h("span", { class: "txt" }, d.name, d.hint), sel);
    const sync = () => { sel.value = at(path); };
    syncers.push(sync);
    sync();
    return row;
  }

  // Academic Color Theme Presets
  const THEME_PRESETS = [
    { id: "scholar", name: "optThemeDefault", colors: { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" } },
    { id: "ocean", name: "optThemeCool", colors: { first: "#0284c7", cofirst: "#6366f1", second: "#0d9488", last: "#059669" } },
    { id: "sunset", name: "optThemeWarm", colors: { first: "#db2777", cofirst: "#9333ea", second: "#ea580c", last: "#16a34a" } },
    { id: "contrast", name: "optThemeStrong", colors: { first: "#0047ba", cofirst: "#6a1b9a", second: "#c2410c", last: "#0b6623" } },
    { id: "nordic", name: "optThemeSoft", colors: { first: "#3b82f6", cofirst: "#8b5cf6", second: "#f59e0b", last: "#10b981" } }
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

  // The row's bar is drawn in the role's colour on Scholar's white page: 3:1 (the WCAG rule for graphics) keeps it visible. (The marked name in the author line is the
  // colour mixed with black, read on its own tint, and is always legible; the colour is what has to stand out.)
  function barContrast(hex) {
    const ratio = 1.05 / (calculateLuminance(hex) + 0.05);
    return { pass: ratio >= 3, label: ratio.toFixed(1) + ":1" };
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
        "aria-label": `${t("optThemes")}: ${t(p.name)}`,
        onClick: (e) => {
          e.preventDefault();
          for (const [r, c] of Object.entries(p.colors)) prefs.colors[r] = c;
          B.dom.applyColors(prefs.colors);
          save();
        }
      }, h("span", { class: "theme-swatch-strip" }, ...dots), t(p.name));
      return { preset: p, el: btn };
    });

    const bar = h("div", { class: "theme-presets-bar", role: "group", "aria-label": t("optThemes") },
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
    const contrastPill = h("span", { class: "contrast-badge pass", title: t("optContrastTip") });

    const pill = h("label", { class: "hex-input-pill", "aria-label": roleLabel },
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
      const { pass, label } = barContrast(current);
      contrastPill.className = "contrast-badge " + (pass ? "pass" : "warn");
      contrastPill.textContent = label;
    }

    const row = h("div", { class: "role-studio-card" },
      h("div", { class: "role-info-wrap" },
        previewChip,
        h("span", { class: "name" }, roleLabel)),
      h("div", { class: "role-studio-controls" },
        h("div", { class: "curated-palette-row", role: "group", "aria-label": roleLabel },
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
      const filtered = entries.filter(([, d]) => !q || (d.authors || "").toLowerCase().includes(q) || (d.venue || "").toLowerCase().includes(q));
      countSpan.textContent = t("optCacheShown", [String(filtered.length), String(entries.length)]);
      if (!filtered.length) {
        tbody.replaceChildren(h("tr", {}, h("td", { colspan: "3", class: "faint", style: "text-align: center; padding: 24px;" }, t("optCacheEmpty"))));
        return;
      }
      tbody.replaceChildren(...filtered.map(([, d]) => {
        const dateStr = d.ts ? new Date(d.ts).toLocaleDateString(B.dom.langTag()) : "";
        const viaStr = d.via === "semantic" ? "Semantic Scholar" : "Google Scholar";
        return h("tr", {},
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

    const closeBtn = h("button", { class: "btn", type: "button", "data-act": "close-cache", onClick: () => cacheDialog.close() }, t("optCacheClose"));

    cacheDialog = h("dialog", { class: "cache-modal", "aria-labelledby": "cache-title" },
      h("div", { class: "cache-modal-head" },
        h("h2", { id: "cache-title" }, t("optCacheTitle")),
        h("button", { class: "cache-close", type: "button", "aria-label": t("optCacheClose"), title: t("optCacheClose"), onClick: () => cacheDialog.close() }, "×")),
      h("div", { class: "row", style: "gap: 8px; margin: 12px 0;" }, search, copyJsonBtn),
      h("div", { style: "margin-bottom: 8px;" }, countSpan),
      h("div", { class: "cache-table-wrap" },
        h("table", { class: "cache-table" },
          h("thead", {}, h("tr", {}, h("th", {}, t("tsvAuthors")), h("th", {}, t("tsvVenue")), h("th", {}, t("optCacheSource")))),
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

  // ---- Configuration: the record as JSON, in and out. Whatever comes in is a patch that lib/prefs.js apply() lays over the settings and reports ----
  const configStatus = h("div", { class: "config-status", role: "status", "aria-live": "polite", "data-rr": "config-status" });
  const say = (lines, bad) => { configStatus.replaceChildren(...lines.map((line) => h("p", {}, line))); configStatus.classList.toggle("bad", bad); };
  async function applyPatch(patch) {
    const r = B.prefs.apply(prefs, patch);
    prefs = r.prefs;
    if (r.applied.length) await save();
    const lines = [];
    if (r.applied.length) lines.push(t("optConfigApplied", [String(r.applied.length)]));
    else if (!r.ignored.length) lines.push(t("optConfigNothing"));
    if (r.ignored.length) lines.push(t("optConfigIgnored") + " " + r.ignored.map((x) => (x.path || "·") + ": " + x.reason).join("; "));
    say(lines, r.ignored.length > 0);
  }
  async function applyConfig(text) {
    let patch;
    try { patch = JSON.parse(text); } catch (e) { say([t("optConfigError", [String(e.message).slice(0, 120)])], true); return; }
    await applyPatch(patch);
  }
  const done = (button, label) => { button.textContent = t("copied"); setTimeout(() => { button.textContent = label; }, 1400); };
  const recordJson = () => JSON.stringify(prefs, null, 2);

  const copyConfigBtn = h("button", { class: "btn", type: "button", "data-act": "config-copy", onClick: async () => { if (await B.dom.copyText(recordJson())) done(copyConfigBtn, t("optConfigCopy")); } }, t("optConfigCopy"));
  const exportConfigBtn = h("button", { class: "btn", type: "button", "data-act": "config-export", onClick: () => B.dom.downloadFile("better-scholar-config.json", recordJson(), "application/json") }, t("optConfigExport"));
  const fileInput = h("input", { type: "file", accept: ".json,application/json", style: "display:none", "aria-label": t("optConfigImportFile"), onChange: (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyConfig(String(reader.result));
    reader.readAsText(file);
    fileInput.value = "";
  } });
  const importFileBtn = h("button", { class: "btn", type: "button", "data-act": "config-import-file", onClick: () => fileInput.click() }, t("optConfigImportFile"));

  // the ready-made patches (lib/prefs.js PRESETS)
  const presetBtn = (id, label) => h("button", { class: "btn preset-chip", type: "button", "data-preset": id, onClick: () => applyPatch(B.prefs.PRESETS[id]) }, label);
  const presetRow = h("div", { class: "row presets", role: "group", "aria-label": t("optConfigPreset") },
    h("span", { class: "presets-title faint" }, t("optConfigPreset") + ":"),
    presetBtn("all", t("optPresetFull")), presetBtn("last", t("optPresetLast")), presetBtn("first", t("optPresetFirst")), presetBtn("minimal", t("optPresetMinimal")));

  const configText = h("textarea", { class: "config-text", "data-act": "config-input", "aria-label": t("optConfigEditor"), rows: "6", spellcheck: "false", placeholder: '{\n  "panel": { "years": false },\n  "rowStyle": "bar"\n}' });
  const configApplyBtn = h("button", { class: "btn primary", type: "button", "data-act": "config-apply", onClick: () => applyConfig(configText.value) }, t("optConfigApply"));
  const configDetails = h("details", { class: "config-editor" },
    h("summary", { class: "btn sub" }, t("optConfigEditor")),
    h("div", { class: "config-editor-body" }, configText, h("div", { class: "row" }, configApplyBtn)));

  // what an AI assistant needs to set the extension up: every setting, its values, this user's current ones and how to hand the answer back (lib/agent.js)
  const agentBtn = h("button", { class: "btn primary", type: "button", "data-act": "agent-guide-copy", onClick: async () => {
    if (await B.dom.copyText(B.agent.guide({ current: prefs, version: chrome.runtime.getManifest().version }))) done(agentBtn, t("optAgentCopy"));
  } }, t("optAgentCopy"));

  // ---- Assemble Cards ----
  const paths = (group, keys) => keys.map((k) => group + "." + k);
  $("controls").append(
    card(0, t("optLanguageTitle"), t("optLanguageHint"),
      languageSelect({ path: "language", label: t("optLanguageUi"), none: ["auto", t("optLanguageAuto")], reload: true }),
      languageSelect({ path: "scholarLanguage", label: t("optLanguageScholar"), hint: t("optLanguageScholarHint"), none: ["keep", t("optLanguageKeep")] })),
    card(1, t("optRolesTitle"), t("optRolesHint"),
      ...B.prefs.ROLES.map((role) => option({ path: "roles." + role, label: t(ROLE_NAME[role]), swatch: ROLE_COLOR[role] })),
      option({ path: "markName", label: t("optMarkName"), hint: t("optMarkNameHint") }),
      bulk("roles", [...paths("roles", B.prefs.ROLES), "markName"], t("optRolesTitle"))),
    card(2, t("optColorsTitle"), t("optColorsHint"),
      themePresetsBar(),
      ...B.prefs.ROLES.map(roleStudioCard),
      segmented({ path: "rowStyle", label: t("optRowStyle"), choices: [["full", t("optRowStyleFull")], ["bar", t("optRowStyleBar")], ["tint", t("optRowStyleTint")]],
        icons: { full: ICONS.fullDiagram, bar: ICONS.barDiagram, tint: ICONS.tintDiagram } }),
      h("div", { class: "row" },
        h("button", { class: "btn", type: "button", "data-act": "colors-reset", onClick: () => { for (const r of B.prefs.ROLES) prefs.colors[r] = ""; save(); } }, t("optColorsReset")))),
    card(3, t("optRanksTitle"), null,
      option({ path: "ranks.ccf", label: t("optCcf"), hint: t("optCcfHint") }),
      option({ path: "ranks.core", label: t("optCore"), hint: t("optCoreHint") }),
      bulk("ranks", paths("ranks", B.prefs.RANKS), t("optRanksTitle"))),
    card(4, t("optMarksTitle"), t("marksHint"),
      ...B.prefs.MARK_GROUPS.map((g) => option({ path: "marks." + g, label: t(MARK_NAME[g]), hint: g === "award" ? t("optMarkAwardHint") : "" })),
      bulk("marks", paths("marks", B.prefs.MARK_GROUPS), t("optMarksTitle")),
      segmented({ path: "talkRows", label: t("optTalkRows"), hint: t("optTalkRowsHint"), choices: [["separate", t("optTalkSeparate")], ["pair", t("optTalkPair")], ["talks", t("optTalkAll")]] })),
    card(5, t("optCopyTitle"), t("optCopyHint"),
      ...B.prefs.COPY_BUTTONS.map((k) => option({ path: "copy." + k, label: t(B.dom.COPY_LABEL[k]) })),
      bulk("copy", paths("copy", B.prefs.COPY_BUTTONS), t("optCopyTitle"))),
    card(6, t("optMergeTitle"), t("optMergeHint"),
      option({ path: "mergeDuplicates", label: t("optMergeLabel"), hint: t("optMergeLabelHint") })),
    card(7, t("optHideTitle"), t("optHideHint"),
      option({ path: "hide.cited", label: t("optHideCited"), hint: t("optHideCitedHint") }),
      option({ path: "hide.citedTable", sub: true, label: t("optHideCitedTable"), hint: t("optHideCitedTableHint"), off: () => prefs.hide.cited }),
      option({ path: "hide.citedChart", sub: true, label: t("optHideCitedChart"), hint: t("optHideCitedChartHint"), off: () => prefs.hide.cited }),
      option({ path: "hide.coauthors", label: t("optHideCo"), hint: t("optHideCoHint") }),
      option({ path: "hide.access", label: t("optHideAccess"), hint: t("optHideAccessHint") })),
    card(8, t("optPanelTitle"), null,
      option({ path: "panel.show", label: t("optPanelShow"), hint: t("optPanelShowHint") }),
      ...[["summary", t("optPanelSummary"), t("optPanelSummaryHint")], ["marks", t("optPanelMarks"), t("optPanelMarksHint")], ["filters", t("optPanelFilters"), t("optPanelFiltersHint")],
        ["metrics", t("optPanelMetrics"), t("optPanelMetricsHint")], ["years", t("optPanelYears"), t("optPanelYearsHint")], ["venues", t("optPanelVenues"), t("optPanelVenuesHint")],
        ["status", t("optPanelStatus"), t("optPanelStatusHint")], ["names", t("optPanelNames"), t("optPanelNamesHint")]]
        .map(([part, label, hint]) => option({ path: "panel." + part, sub: true, label, hint, off: () => !prefs.panel.show })),
      bulk("panel", paths("panel", B.prefs.PANEL_PARTS.filter((k) => k !== "show")), t("optPanelTitle"), { enables: ["panel.show"] },
        h("button", { class: "btn", type: "button", "data-act": "panel-compact", onClick: () => applyPatch({ panel: { show: true, summary: false, marks: false, filters: true, metrics: true, years: false, venues: false, status: false, names: false } }) }, t("optPanelCompact")))),
    card(9, t("optSemanticTitle"), t("optSemanticHint"),
      option({ path: "semanticScholar", label: t("optSemanticLabel"), hint: t("optSemanticLabelHint") }),
      keyRow()),
    card(10, t("optLoadTitle"), null,
      option({ path: "autoLoad", label: t("optAutoLoad"), hint: t("optAutoLoadHint") })),
    card(11, t("optAgentTitle"), t("optAgentHint"),
      h("div", { class: "row" }, agentBtn)),
    card(12, t("optConfigTitle"), t("optConfigHint"),
      presetRow,
      h("div", { class: "row" }, copyConfigBtn, exportConfigBtn, importFileBtn, fileInput),
      configDetails,
      configStatus),
    card(13, t("optDataTitle"), null, h("div", { class: "row" }, viewBtn, clearBtn, resetBox, diagBtn, cacheNote)));
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

  const searchInput = h("input", { type: "search", class: "opt-search", "data-act": "filter-settings", placeholder: t("optSearchPlaceholder"), "aria-label": t("optSearchPlaceholder") });
  const searchIcon = h("span", { class: "opt-search-icon", "aria-hidden": "true" });
  const searchClear = h("button", { class: "opt-search-clear", type: "button", "aria-label": t("optSearchClear"), title: t("optSearchClear"), onClick: () => { searchInput.value = ""; filterSettings(""); searchInput.focus(); } });
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
  const panelCb = Object.fromEntries(["onSettings", "onCollapse", "onSource", "onSelect", "onOnly", "onYear", "onQuery", "onSearchNext", "onImpact", "onMarkGroup", "onVenue", "onToggleVenues", "onClearFilters", "onCopy", "onAddVariant", "onRemoveVariant", "onLoadAll", "onCancelLoad", "onResolve", "onCancelResolve"].map((k) => [k, () => {}]));
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

  // (the preview is Scholar's own page, which is always light: it does not follow the system theme, and there is nothing to switch)
  const pvAside = document.querySelector(".preview");

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
