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
    if (tag === "svg" && !el.hasAttribute("aria-hidden")) el.setAttribute("aria-hidden", "true");          // (every icon of this page sits beside the words that name its control: a picture to a screen reader is noise)
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
    search: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("circle", { cx: "11", cy: "11", r: "7" }),
      s("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })),
    sparkles: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" })),
    noneDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", "stroke-dasharray": "3 3" })),
    barDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
      s("line", { x1: "7", y1: "4", x2: "7", y2: "20", "stroke-width": "3" })),
    fullDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", fill: "currentColor", "fill-opacity": "0.15" }),
      s("line", { x1: "7", y1: "4", x2: "7", y2: "20", "stroke-width": "3" })),
    tintDiagram: () => s("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", fill: "currentColor", "fill-opacity": "0.2" }))
  };

  // the badge of each card (the ids are lib/prefs.js CARDS')
  const CARD_ICONS = {
    language: { icon: "globe", color: "#4f46e5", bg: "rgba(79, 70, 229, 0.12)" },
    highlight: { icon: "users", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
    colors: { icon: "palette", color: "#9333ea", bg: "rgba(147, 51, 234, 0.12)" },
    chips: { icon: "star", color: "#ca8a04", bg: "rgba(202, 138, 4, 0.12)" },
    panel: { icon: "chart", color: "#0891b2", bg: "rgba(8, 145, 178, 0.12)" },
    table: { icon: "columns", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
    copy: { icon: "duplicate", color: "#0f766e", bg: "rgba(15, 118, 110, 0.12)" },
    marks: { icon: "star", color: "#ca8a04", bg: "rgba(202, 138, 4, 0.12)" },
    filters: { icon: "sliders", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
    metrics: { icon: "chart", color: "#0891b2", bg: "rgba(8, 145, 178, 0.12)" },
    years: { icon: "chart", color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
    venues: { icon: "columns", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
    status: { icon: "database", color: "#475569", bg: "rgba(71, 85, 105, 0.12)" },
    names: { icon: "users", color: "#0d9488", bg: "rgba(13, 148, 136, 0.12)" },
    hide: { icon: "eye", color: "#475569", bg: "rgba(71, 85, 105, 0.12)" },
    merge: { icon: "merge", color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
    load: { icon: "download", color: "#0d9488", bg: "rgba(13, 148, 136, 0.12)" },
    semantic: { icon: "brain", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
    venue: { icon: "search", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
    agent: { icon: "terminal", color: "#4338ca", bg: "rgba(67, 56, 202, 0.12)" },
    config: { icon: "sliders", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" },
    data: { icon: "database", color: "#e11d48", bg: "rgba(225, 29, 72, 0.12)" }
  };

  function makeIconBadge({ icon, color, bg }) {
    const badge = h("span", { class: "card-icon", style: `background: ${bg}; color: ${color};` });
    if (ICONS[icon]) badge.append(ICONS[icon]());
    return badge;
  }

  const ROLE_COLOR = { first: "var(--rr-c-first, #1a73e8)", cofirst: "var(--rr-c-cofirst, #a142f4)", second: "var(--rr-c-second, #f9ab00)", last: "var(--rr-c-last, #1e8e3e)" };
  const ROLE_DEFAULT = { first: "#1a73e8", cofirst: "#a142f4", second: "#f9ab00", last: "#1e8e3e" };
  const ROLE_NAME = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };

  await B.dom.useLanguage();
  document.documentElement.lang = B.dom.langTag();
  document.documentElement.dir = B.dom.dir();
  document.title = t("extName") + " — " + t("optHeading");
  $("title").textContent = t("extName");
  $("sub").textContent = t("optHeading");
  $("pv-title").replaceChildren(makeIconBadge({ icon: "sparkles", color: "#1a73e8", bg: "rgba(26, 115, 232, 0.12)" }), h("span", { class: "card-title-text" }, t("optPreviewTitle")));
  $("pv-note").textContent = t("optPreviewNote");
  $("pv-hint").textContent = t("optPreviewEdit");
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
  B.dom.setLabels(prefs.labels);
  const shownLanguage = prefs.language;                 // (the page is drawn in this one: a change of the interface language reloads it)
  const syncers = [];

  // chrome.storage.sync takes 120 writes a minute and says nothing when it refuses one. A change is shown at once and written at once, unless a write was made a moment
  // ago: then the latest state is written when that moment is over, so a run of changes (a bulk switch, a drag, typing a name) costs a few writes, not one for each.
  // The echo of a write comes back from storage as a change: it is not taken for somebody else's (the state of this page is newer), and a change made elsewhere while this
  // page has one of its own to write loses to it. An echo is told from another page's change by being one of the writes this page has made and has not seen back yet, in the
  // order they were made (a change that looks like an older write of this page, from another page, is that page's).
  const WRITE_GAP = 600;                                                        // (100 writes a minute at the fastest)
  const RETRY_AFTER = 10000;                                                    // (a refused write is made again after this long: the minute's allowance is back)
  let savedTimer = 0, lastWrite = 0, writeTimer = 0, dirty = false, inFlight = false, waiters = [];
  const awaiting = [];                                                          // (the writes whose echoes have not come: { json, at }, oldest first)
  function isEcho(next) {
    const json = JSON.stringify(next), now = Date.now();
    while (awaiting.length && now - awaiting[0].at > 10000) awaiting.shift();   // (a write that changed nothing has no echo)
    const i = awaiting.findIndex((w) => w.json === json);
    if (i >= 0) { awaiting.splice(0, i + 1); return true; }
    return dirty || inFlight;
  }
  function status(text, bad) {
    $("saved").textContent = text;
    $("saved").classList.toggle("bad", !!bad);
    $("saved").classList.add("on");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => $("saved").classList.remove("on"), bad ? 6000 : 1400);
  }
  async function flush() {
    writeTimer = 0;
    if (!dirty) return;
    // (more than Chrome keeps for one item, counted as Chrome counts: not written, not tried again, and said so: it would be refused every time)
    if (B.prefs.sizeOf(B.prefs.normalize(prefs)) > B.prefs.SYNC_LIMIT) {
      dirty = false;
      document.body.removeAttribute("data-rr-pending");
      const done = waiters; waiters = [];
      done.forEach((resolve) => resolve(false));
      status(t("optSaveTooBig"), true);
      return;
    }
    dirty = false; inFlight = true; lastWrite = Date.now();
    awaiting.push({ json: JSON.stringify(B.prefs.normalize(prefs)), at: lastWrite });
    const ok = await B.store.savePrefs(prefs);
    inFlight = false;
    if (!ok) { awaiting.pop(); dirty = true; if (!writeTimer) writeTimer = setTimeout(flush, RETRY_AFTER); }      // (the change is still to be written: again later, and when the page is left)
    if (!dirty) document.body.removeAttribute("data-rr-pending");
    const done = waiters; waiters = [];
    done.forEach((resolve) => resolve(ok));
    if (ok && prefs.language !== shownLanguage && !dirty) { location.reload(); return; }
    status(ok ? t("optSaved") : t("optSaveFailed"), !ok);
  }
  // (the page's own state is changed and drawn first; the returned promise settles when the write has been made)
  function save() {
    B.dom.setLabels(prefs.labels);
    B.dom.applyColors(prefs.colors);
    B.dom.applyRowStyle(prefs.rows.style);
    B.dom.applyChips(prefs.chips, prefs.colors);
    renderPreview();
    syncers.forEach((fn) => fn());
    dirty = true;
    document.body.setAttribute("data-rr-pending", "");
    clearTimeout(writeTimer);                                                    // (also a retry that was waiting: the new change is written when the gap is over)
    writeTimer = setTimeout(flush, Math.max(0, lastWrite + WRITE_GAP - Date.now()));
    return new Promise((resolve) => waiters.push(resolve));
  }
  window.addEventListener("pagehide", () => { if (dirty) flush(); });

  // A setting is its path in the record (lib/prefs.js SETTINGS); every control below is found by it: `data-pref="<path>"` (the settings reference for agents says so).
  const at = (path) => path.split(".").reduce((o, k) => o[k], prefs);
  const put = (path, value) => { const keys = path.split("."); keys.slice(0, -1).reduce((o, k) => o[k], prefs)[keys[keys.length - 1]] = value; };
  let uid = 0;
  // the name of a control is its label; its hint is what a screen reader reads after it
  const described = (label, hint) => { const id = "opt-" + ++uid; const words = document.createTextNode(label); return { id, words, name: h("span", { class: "name", id: id + "-n" }, words), hint: hint ? h("span", { class: "hint", id: id + "-h" }, hint) : null, ids: { "aria-labelledby": id + "-n", "aria-describedby": hint ? id + "-h" : null } }; };

  // A name: the text of a title or a name on the screen, in the person's own words, in every language. Empty is the built-in text, shown in grey: what the field would say.
  // (It is shown in the preview and saved as it is typed (the writes are spaced, see save()), trimmed when the field is left or Enter is pressed; Escape gives the old name back.)
  function nameEdit(row, off) {
    const path = row.path, key = row.label;
    let before = "";
    const input = h("input", { type: "text", class: "name-input", "data-pref": path, maxlength: String(row.max), spellcheck: "false", autocomplete: "off",
      placeholder: B.dom.tDefault(key), title: t("optNameTip"), "aria-label": B.dom.tDefault(key) + " — " + t("optNameOf"),
      onFocus: () => { before = at(path); },
      onInput: () => { put(path, input.value); save(); },                         // (saved as it is typed, a few writes at most: a name typed and the page closed is kept)
      onChange: () => { put(path, B.prefs.cleanName(input.value)); save(); },
      onKeydown: (e) => {
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        else if (e.key === "Escape" && at(path) !== before) { e.preventDefault(); input.value = before; put(path, before); save(); }
      } });
    const reset = h("button", { type: "button", class: "name-reset", "data-act": "name-reset", "aria-label": B.dom.tDefault(key) + " — " + t("optNameReset"), title: t("optNameReset"),
      onClick: (e) => { e.preventDefault(); e.stopPropagation(); put(path, ""); save(); } }, "↺");
    const sync = () => { input.value = at(path); reset.hidden = !at(path); input.disabled = off ? off() : false; };
    syncers.push(sync);
    sync();
    return h("span", { class: "name-edit" }, input, reset);
  }

  // One switch
  function option({ path, label, hint, swatch, sub, off, name, key }) {
    const d = described(label, hint);
    if (key) syncers.push(() => { d.words.nodeValue = t(key); });                    // (a switch is named by what it shows: when that is renamed, so is it)
    const input = h("input", { type: "checkbox", role: "switch", class: "sw", id: d.id + "-sw", "data-pref": path, ...d.ids, onChange: () => { put(path, input.checked); save(); } });
    if (swatch) d.name.prepend(h("span", { class: "swatch", style: "background:" + swatch }));
    const row = h("label", { class: "opt" + (sub ? " sub" : "") + (name ? " opt-named" : ""), for: input.id }, h("span", { class: "txt" }, d.name, d.hint), name ? nameEdit(name, off) : null, input);
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
  function segmented({ path, label, hint, choices, icons = {}, off }) {
    const d = described(label, hint);
    const radios = choices.map(([value, text]) => {
      const input = h("input", { type: "radio", class: "seg-radio", name: "seg-" + path, value, "data-pref": path, onChange: () => { if (input.checked) { put(path, value); save(); } } });
      return { value, input, label: h("label", { class: "seg-btn", "data-val": value }, input, icons[value] ? icons[value]() : null, h("span", { class: "seg-text" }, text)) };
    });
    const row = h("div", { class: "opt opt-segmented" }, h("span", { class: "txt" }, d.name, d.hint),
      h("div", { class: "seg-control", role: "radiogroup", ...d.ids }, ...radios.map((r) => r.label)));
    const sync = () => {
      const dead = off ? off() : false;                                    // (greyed with the switch it hangs on, as a switch is)
      row.classList.toggle("disabled", dead);
      radios.forEach(({ value, input, label: lab }) => { const on = at(path) === value; input.checked = on; input.disabled = dead; lab.classList.toggle("active", on); });
    };
    syncers.push(sync);
    sync();
    return row;
  }

  // An order: the parts (or buttons) of a list, top to bottom, each with the buttons that move it. The ids a switch hides are dimmed, not removed: they keep their place.
  function orderList({ path, label, hint, nameOf, offOf, off }) {
    const d = described(label, hint);
    const list = h("ol", { class: "order-list", "data-pref": path, ...d.ids });
    let focus = null;                                                      // (the button that was pressed: the list is drawn again, and the keyboard must stay on it)
    const move = (id, by) => {
      const order = at(path).slice(), i = order.indexOf(id), j = i + by;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      focus = { id, act: by < 0 ? "move-up" : "move-down" };
      put(path, order);
      save();
    };
    const wrap = h("div", { class: "opt opt-order" }, h("span", { class: "txt" }, d.name, d.hint), list);
    const sync = () => {
      const order = at(path), dead = off ? off() : false;                  // (greyed with the switch it hangs on, as a switch is)
      wrap.classList.toggle("disabled", dead);
      list.replaceChildren(...order.map((id, i) => h("li", { class: "order-item" + (offOf(id) ? " off" : ""), "data-id": id },
        h("span", { class: "order-name" }, nameOf(id)),
        h("button", { type: "button", class: "order-btn", "data-act": "move-up", "aria-label": `${nameOf(id)}: ${t("optMoveUp")}`, title: t("optMoveUp"), disabled: dead || i === 0, onClick: () => move(id, -1) }, "▲"),
        h("button", { type: "button", class: "order-btn", "data-act": "move-down", "aria-label": `${nameOf(id)}: ${t("optMoveDown")}`, title: t("optMoveDown"), disabled: dead || i === order.length - 1, onClick: () => move(id, 1) }, "▼"))));
      if (focus) { const b = list.querySelector(`[data-id="${focus.id}"] [data-act="${focus.act}"]`) || list.querySelector(`[data-id="${focus.id}"] .order-btn:not([disabled])`); if (b) b.focus(); focus = null; }
    };
    syncers.push(sync);
    sync();
    return wrap;
  }

  // A language: the plain list of the languages (each in its own name) with the setting's own "none" first. The interface language reloads the page once chosen.
  function languageSelect({ path, label, hint, none, reload }) {
    const d = described(label, hint);
    const sel = h("select", { class: "sel", "data-pref": path, ...d.ids, onChange: () => { put(path, sel.value); save(); } },
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
  // One Tab stop for a row of buttons or links: the arrows (mirrored in a right-to-left page), Home and End move among them; the stop is the one that is on, else the first.
  // Returns the function that puts the stop where it belongs (call it after the row changes).
  function rove(group, items, isOn) {
    const stopAt = (el) => items().forEach((b) => { b.tabIndex = b === el ? 0 : -1; });
    group.addEventListener("keydown", (e) => {
      const list = items(), at = list.indexOf(document.activeElement);
      if (at < 0) return;
      const rtl = getComputedStyle(group).direction === "rtl";
      const to = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : e.key === "ArrowRight" ? at + (rtl ? -1 : 1) : e.key === "ArrowLeft" ? at + (rtl ? 1 : -1) : e.key === "ArrowDown" ? at + 1 : e.key === "ArrowUp" ? at - 1 : -1;
      if (to < 0 || to >= list.length) return;
      e.preventDefault(); stopAt(list[to]); list[to].focus();
    });
    group.addEventListener("focusin", (e) => { if (items().includes(e.target)) stopAt(e.target); });
    return () => { const list = items(); stopAt(list.find(isOn) || list[0]); };
  }

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
        el.setAttribute("aria-pressed", String(matches));          // (the selected look is said, not only drawn)
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
    const hexLabel = h("span", { class: "color-hex", dir: "ltr" }, defaultColor.toUpperCase());          // (a code: in a right-to-left page its "#" would end up after the digits)
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
      placeStop();
      const isCustom = current !== defaultColor.toLowerCase();
      resetBtn.style.display = isCustom ? "inline-flex" : "none";
      const { pass, label } = barContrast(current);
      contrastPill.className = "contrast-badge " + (pass || !isCustom ? "pass" : "warn");          // (the built-in colour does not warn about itself: the warning is for a colour that was picked)
      contrastPill.textContent = label;
    }

    const paletteRow = h("div", { class: "curated-palette-row", role: "group", "aria-label": roleLabel }, ...dotButtons.map((d) => d.el));
    const placeStop = rove(paletteRow, () => dotButtons.map((d) => d.el), (b) => b.classList.contains("active"));
    const row = h("div", { class: "role-studio-card" },
      h("div", { class: "role-info-wrap" },
        previewChip,
        h("span", { class: "name" }, roleLabel)),
      h("div", { class: "role-studio-controls" },
        paletteRow,
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
        status(t("optSaved"));
      }
    });
    B.store.loadS2Key().then((k) => { input.value = k; });
    return h("label", { class: "opt" },
      h("span", { class: "txt" },
        h("span", { class: "name" }, t("optSemanticKey")),
        h("span", { class: "hint" }, t("optSemanticKeyHint"))),
      input);
  }

  const card = (id, title, desc, ...rows) => {
    const iconObj = CARD_ICONS[id] || { icon: "sliders", color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" };
    const h2 = h("h2", {}, makeIconBadge(iconObj), h("span", { class: "card-title-text" }, title));
    return h("section", { class: "card", id: "card-" + id }, h2, desc ? h("p", { class: "desc" }, desc) : null, ...rows);
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
      if (await B.dom.copyText(text)) done(diagBtn, t("optCopyDiagnostics"));
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
        if (await B.dom.copyText(JSON.stringify(resolved, null, 2))) done(copyJsonBtn, t("optCacheCopy"));
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
    const yes = h("button", { class: "btn danger", type: "button", "data-act": "reset-confirm", "aria-label": t("optReset"), onClick: () => { prefs = B.prefs.defaults(); save(); resetBox.replaceChildren(resetBtn); resetBtn.focus(); } }, t("optReset"));
    const no = h("button", { class: "btn", type: "button", "data-act": "reset-cancel", "aria-label": t("cancel"), onClick: () => { resetBox.replaceChildren(resetBtn); resetBtn.focus(); } }, t("cancel"));
    resetBox.replaceChildren(h("span", { class: "ask", role: "alert" }, t("optResetConfirm")), yes, no);
    no.focus();
  }
  resetBox.addEventListener("keydown", (e) => { if (e.key === "Escape" && resetBox.querySelector('[data-act="reset-cancel"]')) { e.preventDefault(); resetBox.replaceChildren(resetBtn); resetBtn.focus(); } });
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
  // (a button that changes its words is not read out — and the one with an aria-label never changes its name: the status says "Copied")
  const done = (button, label) => {
    button.textContent = t("copied");
    const live = document.getElementById("live");
    if (live) { live.textContent = t("copied"); setTimeout(() => { live.textContent = ""; }, 1500); }
    setTimeout(() => { button.textContent = label; }, 1400);
  };
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

  const configText = h("textarea", { class: "config-text", "data-act": "config-input", "aria-label": t("optConfigEditor"), rows: "6", spellcheck: "false", placeholder: '{\n  "panel": { "years": { "show": false } },\n  "rows": { "style": "bar" }\n}' });
  const configApplyBtn = h("button", { class: "btn primary", type: "button", "data-act": "config-apply", onClick: () => applyConfig(configText.value) }, t("optConfigApply"));
  const configDetails = h("details", { class: "config-editor" },
    h("summary", { class: "btn sub" }, t("optConfigEditor")),
    h("div", { class: "config-editor-body" }, configText, h("div", { class: "row" }, configApplyBtn)));

  // what an AI assistant needs to set the extension up: every setting, its values, this user's current ones and how to hand the answer back (lib/agent.js)
  const agentBtn = h("button", { class: "btn primary", type: "button", "data-act": "agent-guide-copy", onClick: async () => {
    if (await B.dom.copyText(B.agent.guide({ current: prefs, version: chrome.runtime.getManifest().version }))) done(agentBtn, t("optAgentCopy"));
  } }, t("optAgentCopy"));

  // ---- Assemble Cards: one for each card of lib/prefs.js CARDS, in that order — the order of the preview, top to bottom ----
  const SETTING = new Map(B.prefs.SETTINGS.map((x) => [x.path, x]));
  // a setting has no effect while a switch it hangs on says so (its own, and that one's own, and so on)
  const inert = (row) => {
    for (let child = row; child.parent; child = SETTING.get(child.parent)) { const on = !!at(child.parent); if (child.invert ? on : !on) return true; }
    return false;
  };
  const CHOICES = {
    "rows.style": { labels: { full: "optRowStyleFull", bar: "optRowStyleBar", tint: "optRowStyleTint", none: "optRowStyleNone" },
      icons: { full: ICONS.fullDiagram, bar: ICONS.barDiagram, tint: ICONS.tintDiagram, none: ICONS.noneDiagram } },
    "panel.marks.grouping": { labels: { separate: "optTalkSeparate", pair: "optTalkPair", talks: "optTalkAll" }, icons: {} },
    "rows.prefer": { labels: { ccf: "optPreferCcf", core: "optPreferCore", both: "optPreferBoth" }, icons: {} },
    // (a mini chip in each button shows the look it makes)
    "chips.style": { labels: { outline: "optChipOutline", soft: "optChipSoft", solid: "optChipSolid", text: "optChipText" },
      icons: Object.fromEntries(["outline", "soft", "solid", "text"].map((k) => [k, () => chipSample(`rr-chips-${k} rr-chips-pill rr-chips-full`, { tier: "A", ccf: true })])) },
    "chips.shape": { labels: { pill: "optChipPill", square: "optChipSquare" }, icons: { pill: () => chipSample("rr-chips-outline rr-chips-pill rr-chips-full", { tier: "A", ccf: true }), square: () => chipSample("rr-chips-outline rr-chips-square rr-chips-full", { tier: "A", ccf: true }) } },
    "chips.label": { labels: { full: "optChipLabelFull", tier: "optChipLabelTier" }, icons: {} }
  };

  // A few chips drawn in a look of their own: the wrapper carries the look's classes and colours, which the chips' styles read (the settings page shows the looks on buttons)
  // `colors`: the picked colours of the look ({ ccf, core, award, talk }), none for the built-in ones
  function chipSample(classes, { tier = "A", ccf = false, colors = {}, more = false } = {}) {
    const bare = (el) => { el.removeAttribute("title"); return el; };
    const chips = [bare(B.chips.tierChip("ccf", { tier, name: "", abbr: "", rule: "name" }, ""))];
    if (!ccf) chips.push(bare(B.chips.tierChip("core", { rank: "A*", name: "", abbr: "", rule: "name" }, "")));
    if (more) chips.push(bare(B.chips.markChip({ kind: "best", group: "award", source: "author", text: "" })), bare(B.chips.markChip({ kind: "oral", group: "oral", source: "author", text: "" })));
    const el = h("span", { class: "chip-sample " + classes }, h("span", { class: "rr-chips" }, chips.flatMap((c, i) => (i ? [" ", c] : [c]))));
    // (a family with no colour of its own has the built-in one, whatever the page's chips are coloured: `initial` makes the stylesheet's fallback count)
    for (const family of B.palette.FAMILIES) {
      const own = colors[family] ? B.palette.vars(family, colors[family]) : {};
      for (const name of B.palette.BY_FAMILY[family]) el.style.setProperty(name, own[name] || "initial");
    }
    return el;
  }

  // The ready-made looks of the chips (lib/prefs.js CHIP_THEMES): a button for each, drawn in its own look
  function chipThemesBar() {
    const buttons = B.prefs.CHIP_THEMES.map((theme) => {
      const look = theme.patch.chips;
      const classes = `rr-chips-${look.style} rr-chips-${look.shape} rr-chips-${look.label}`;
      const btn = h("button", { type: "button", class: "chip-theme", "data-chip-theme": theme.id, "aria-label": `${t("optChipThemes")}: ${t(theme.name)}`, onClick: () => applyPatch(theme.patch) },
        chipSample(classes, { more: true, colors: theme.patch.colors }), h("span", { class: "chip-theme-name" }, t(theme.name)));
      return { theme, btn };
    });
    const sync = () => buttons.forEach(({ theme, btn }) => { const on = (({ applied, ignored }) => !applied.length && !ignored.length)(B.prefs.apply(prefs, theme.patch)); btn.classList.toggle("active", on); btn.setAttribute("aria-pressed", String(on)); });
    syncers.push(sync);
    sync();
    return h("div", { class: "chip-themes", role: "group", "aria-label": t("optChipThemes") }, ...buttons.map((b) => b.btn));
  }

  // The colour of a family of chips: a picker and a button that puts the built-in colour back (the built-in is what the picker shows until a colour is picked)
  function chipColor(row) {
    const family = row.path.split(".")[1], def = B.palette.DEFAULTS[family];
    const d = described(t(row.label), "");
    const input = h("input", { type: "color", class: "clr chip-clr", "data-pref": row.path, "aria-label": `${t(row.label)}: ${t("optChipColors")}`,
      onInput: () => { put(row.path, input.value); B.dom.applyChips(prefs.chips, prefs.colors); renderPreview(); },
      onChange: () => { put(row.path, input.value); save(); } });
    const reset = h("button", { type: "button", class: "name-reset", "data-act": "chip-color-reset", title: t("optColorsReset"), "aria-label": `${t(row.label)}: ${t("optColorsReset")}`,
      onClick: () => { put(row.path, ""); save(); } }, "↺");
    const sync = () => {
      input.value = at(row.path) || def; reset.hidden = !at(row.path);
      d.words.textContent = t(row.label);                                              // (the word may be one the person renamed: "Spotlight" is in the talks' colour row)
      input.setAttribute("aria-label", `${t(row.label)}: ${t("optChipColors")}`); reset.setAttribute("aria-label", `${t(row.label)}: ${t("optColorsReset")}`);
    };
    syncers.push(sync);
    sync();
    return h("div", { class: "opt opt-color" }, h("span", { class: "txt" }, d.name), h("span", { class: "name-edit" }, input, reset));
  }
  const NONE_WORD = { language: "optLanguageAuto", scholarLanguage: "optLanguageKeep" };
  const cardOf = (id) => B.prefs.CARDS.find((c) => c.id === id);
  // the name of an item of an order list: a part is named by its card, a button by its own switch; it is dimmed while its switch is off
  const itemName = (path, id) => t(path === "panel.order" ? cardOf(id).title : SETTING.get(path.replace(/\.order$/, "." + id)).label);
  const itemOff = (path, id) => !at(path === "panel.order" ? `panel.${id}.show` : path.replace(/\.order$/, "." + id));

  // the control of one row, by what the row is
  function control(row, rows, name) {
    const label = t(row.label), hint = row.hint ? t(row.hint) : "";
    switch (row.kind) {
      case "bool": return option({ path: row.path, label, hint, swatch: row.swatch ? ROLE_COLOR[row.swatch] : null, sub: !!row.parent && rows.some((r) => r.path === row.parent), off: () => inert(row), name, key: row.label });
      case "text": return row.inline ? null : h("div", { class: "opt opt-name" + (row.parent && rows.some((r) => r.path === row.parent) ? " sub" : "") }, h("span", { class: "txt" }, h("span", { class: "name" }, label)), nameEdit(row, () => inert(row)));
      case "choice": { const c = CHOICES[row.path]; return segmented({ path: row.path, label, hint, choices: row.values.map((v) => [v, t(c.labels[v])]), icons: c.icons, off: () => inert(row) }); }
      case "order": return orderList({ path: row.path, label, hint, nameOf: (id) => itemName(row.path, id), offOf: (id) => itemOff(row.path, id), off: () => inert(row) });
      case "language": return languageSelect({ path: row.path, label, hint, none: [row.none, t(NONE_WORD[row.path])], reload: row.path === "language" });
      case "color": return B.prefs.ROLES.includes(row.path.split(".")[1]) ? null : chipColor(row);        // (the role colours have their own studio)
      default: return null;
    }
  }

  // "Enable all" / "Disable all" for the switches of a card; turning them on also turns on what they hang on outside the card (the panel itself, for its parts)
  function bulkOf(c, ...extra) {
    // (the panel's own card switches its title bar and its parts; the panel itself is what they hang on, and is turned on with them but never off by them)
    const bools = c.id === "panel" ? [...c.rows.filter((r) => r.kind === "bool" && r.path.startsWith("panel.header.")), ...B.prefs.SECTIONS.map((id) => SETTING.get(`panel.${id}.show`))]
      : c.rows.filter((r) => r.kind === "bool");
    if (bools.length < 2) return extra.length ? h("div", { class: "row bulk" }, ...extra) : null;
    const outside = new Set();
    for (const r of bools) for (let p = r.parent; p && !bools.some((x) => x.path === p); p = SETTING.get(p).parent) outside.add(p);
    return bulk(c.id, bools.map((r) => r.path), t(c.title), { enables: [...outside] }, ...extra);
  }

  const colorsResetBtn = h("button", { class: "btn", type: "button", "data-act": "colors-reset", onClick: () => { for (const r of B.prefs.ROLES) prefs.colors[r] = ""; save(); } }, t("optColorsReset"));
  const compactBtn = h("button", { class: "btn", type: "button", "data-act": "panel-compact", onClick: () => applyPatch({ panel: B.prefs.PRESETS.minimal.panel }) }, t("optPanelCompact"));
  const cardsOfPrefs = B.prefs.CARDS.map((c) => {
    const kids = c.id === "colors" ? [themePresetsBar(), ...B.prefs.ROLES.map(roleStudioCard)] : [];
    let group = null;
    c.rows.forEach((row, i) => {
      if (row.group !== group) { group = row.group; if (group === "optChipLook") kids.push(chipThemesBar()); if (group) kids.push(h("h3", { class: "opt-group" }, t(group))); }
      const next = c.rows[i + 1];
      const el = control(row, c.rows, next && next.kind === "text" && next.inline ? next : null);       // (a name beside its switch is drawn on the switch's row)
      if (el) kids.push(el);
    });
    if (c.id === "colors") kids.push(h("div", { class: "row" }, colorsResetBtn));
    if (c.id === "semantic") kids.push(keyRow());
    const end = bulkOf(c, ...(c.id === "panel" ? [compactBtn] : []));
    if (end) kids.push(end);
    return card(c.id, t(c.title), c.hint ? t(c.hint) : null, ...kids);
  });
  // Check a venue: what the rank lists make of a text, and by which rule (the page's own resolver: a row of a profile gets exactly this)
  // The CCF list names the research area of each venue in Chinese (its own words); other interface languages get the English name of the area
  const AREA_EN = {
    "计算机体系结构/并行与分布计算/存储系统": "Computer architecture, parallel and distributed computing, storage systems", "计算机网络": "Computer networks", "网络与信息安全": "Network and information security",
    "软件工程/系统软件/程序设计语言": "Software engineering, system software, programming languages", "数据库/数据挖掘/内容检索": "Databases, data mining, information retrieval",
    "计算机科学理论": "Theory of computer science", "计算机图形学与多媒体": "Computer graphics and multimedia", "人工智能": "Artificial intelligence",
    "人机交互与普适计算": "Human-computer interaction and ubiquitous computing", "交叉/综合/新兴": "Interdisciplinary, comprehensive, emerging"
  };
  const areaName = (a) => (/^zh/i.test(B.dom.langTag()) ? a : AREA_EN[a] || a);
  let resolver = null;
  const venueOut = h("div", { class: "venue-out", "aria-live": "polite" });
  const venueInput = h("input", { type: "text", class: "venue-input", "data-act": "venue-check", placeholder: t("optVenuePlaceholder"), "aria-label": t("optVenueTitle"), spellcheck: "false", autocomplete: "off", maxlength: "300", onInput: () => checkVenue() });
  function checkVenue() {
    const text = venueInput.value.replace(/\s+/g, " ").trim();
    venueOut.replaceChildren();
    if (!text) return;
    resolver = resolver || B.venues.createResolver({ ccf: B.data.ccf.venues, core: B.data.core.venues, aliases: B.aliases });
    const res = resolver.resolve(text), found = [["ccf", res.ccf], ["core", res.core]].filter(([, info]) => info);
    for (const [kind, info] of found) {
      // (the CCF entry also says its area and where the venue is on DBLP: a link, opened only when it is clicked)
      const dblp = info.dblp && /^https?:\/\/dblp\.(?:uni-trier\.de|org)\/db\/[\w\/-]+\/?$/.test(info.dblp) ? info.dblp.replace(/^http:\/\/dblp\.uni-trier\.de/, "https://dblp.org").replace(/^http:\/\/dblp\.org/, "https://dblp.org") : "";
      const meta = [info.area ? areaName(info.area) : "", dblp ? h("a", { href: dblp, target: "_blank", rel: "noopener noreferrer", "aria-label": "DBLP: " + info.name }, "DBLP ↗") : ""].filter(Boolean);
      venueOut.append(h("div", { class: "venue-line", "data-kind": kind }, h("span", { class: "venue-swatch" }, B.chips.tierChip(kind, info, B.data[kind].meta.label)),
        h("span", { class: "venue-what" }, h("b", {}, info.name + (info.abbr ? " (" + info.abbr + ")" : "")), h("span", { class: "faint" }, " · " + B.chips.ruleText(info)),
          meta.length ? h("span", { class: "venue-meta" }, ...meta.flatMap((m, i) => (i ? [" · ", m] : [m]))) : null)));
    }
    if (!found.length) venueOut.append(h("p", { class: "venue-none" }, res.secondary ? t("optVenueSecondary", [res.secondary]) : t("optVenueNone")));
  }

  // a venue the panel asked about (the unranked list's "Check"): its text goes into the box, and the card is shown
  function showVenue(text) {
    venueInput.value = text;
    checkVenue();
    if (searchInput.value) { searchInput.value = ""; filterSettings(""); }
    const row = venueInput.closest(".venue-row") || venueInput;
    $("card-venue").scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    row.classList.remove("opt-flash"); void row.offsetWidth; row.classList.add("opt-flash");
    setTimeout(() => row.classList.remove("opt-flash"), 1800);
    venueInput.focus({ preventScroll: true });
  }
  async function takeAskedVenue() {
    const text = await B.store.takeVenue();
    if (text) showVenue(text);
  }

  $("controls").append(
    ...cardsOfPrefs,
    card("venue", t("optVenueTitle"), t("optVenueHint"), h("div", { class: "row venue-row" }, venueInput), venueOut),
    card("agent", t("optAgentTitle"), t("optAgentHint"),
      h("div", { class: "row" }, agentBtn)),
    card("config", t("optConfigTitle"), t("optConfigHint"),
      presetRow,
      h("div", { class: "row" }, copyConfigBtn, exportConfigBtn, importFileBtn, fileInput),
      configDetails,
      configStatus),
    card("data", t("optDataTitle"), null, h("div", { class: "row" }, viewBtn, clearBtn, resetBox, diagBtn, cacheNote)));
  showCacheCount();

  // Sticky TOC Navigation
  const cards = [...$("controls").querySelectorAll(":scope > section.card")];
  const toc = h("nav", { class: "toc", "aria-label": t("optHeading") },
    ...cards.map((c) => {
      const titleSpan = c.querySelector(".card-title-text");
      const titleText = titleSpan ? titleSpan.textContent : c.querySelector("h2").textContent;
      return h("a", {
        href: "#" + c.id,
        "data-card": c.id,
        "aria-label": titleText,
        onClick: (e) => {
          e.preventDefault();
          const pvBox = document.querySelector(".preview"), covered = getComputedStyle(toc).position === "sticky" ? toc.offsetHeight : (pvBox && getComputedStyle(pvBox).position === "sticky" ? pvBox.offsetHeight : 0);          // (what stays at the top of the window: the links, or in one column the preview)
          window.scrollTo({
            top: Math.max(0, c.getBoundingClientRect().top + scrollY - covered - 14),
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
          });
          if (e.detail === 0) { c.setAttribute("tabindex", "-1"); c.focus({ preventScroll: true }); }          // (a key press goes with the page: the next Tab is the first control of the section, not of the page)
        }
      }, titleText);
    }));

  const searchInput = h("input", { type: "search", class: "opt-search", "data-act": "filter-settings", placeholder: t("optSearchPlaceholder"), "aria-label": t("optSearchPlaceholder") });
  const searchIcon = h("span", { class: "opt-search-icon", "aria-hidden": "true" });
  const searchClear = h("button", { class: "opt-search-clear", type: "button", "aria-label": t("optSearchClear"), title: t("optSearchClear"), onClick: () => { searchInput.value = ""; filterSettings(""); searchInput.focus(); } });
  searchClear.hidden = true;
  const searchKbd = h("kbd", { class: "opt-search-kbd", "aria-hidden": "true" }, "/");
  const searchBox = h("div", { class: "opt-search-box" }, searchIcon, searchInput, searchClear, searchKbd);
  syncers.push(() => { searchKbd.hidden = !!searchInput.value.trim() || !prefs.panel.filters.key; });          // (the "/" hint follows its switch)
  searchKbd.hidden = !prefs.panel.filters.key;
  // what the person is told when no setting matches (a status, so that a screen reader says it too)
  const searchNone = h("p", { class: "opt-search-none", role: "status", hidden: true });

  function filterSettings(query) {
    const q = (query || "").trim().toLowerCase();
    searchClear.hidden = !q;
    searchKbd.hidden = !!q || !prefs.panel.filters.key;
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
    placeTocStop();          // (a hidden link cannot be the stop)
    const none = !!q && cards.every((card) => card.hidden);
    searchNone.hidden = !none;
    searchNone.textContent = none ? t("optSearchNone") : "";
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
    if (e.key === "/" && prefs.panel.filters.key && document.activeElement !== searchInput && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  $("controls").prepend(toc, searchBox, searchNone);
  // the section links are one stop for the Tab key (22 of them stood in front of the first setting): the arrows move among them, the section in view is the stop
  const placeTocStop = rove(toc, () => [...toc.querySelectorAll("a:not([hidden])")], (a) => a.hasAttribute("aria-current"));
  placeTocStop();
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
      if (!toc.contains(document.activeElement)) placeTocStop();
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
  const coreOnly = (abbr, name) => ({ ccf: null, core: { rank: "A", name, abbr, rule: "acronym" } });
  const SAMPLES = [
    // (in the order of the settings: the four positions, and each paper carries the next of the chips the settings name)
    { role: "first", authors: ["A Author", "B Writer", "C Writer", "D Writer"], me: 0, venue: "ICLR 2025",
      ...top("ICLR", "International Conference on Learning Representations"),
      marks: [{ kind: "best", group: "award", source: "list", awardLabel: "Best Paper Award", venue: "ICLR", year: 2025 }] },
    // (WACV is ranked by CORE only: where the settings prefer CCF, its chip is the one that fills in)
    { role: "cofirst", authors: ["A Author*", "B Writer*", "C Writer"], me: 0, venue: "WACV 2025 (Oral)",
      ...coreOnly("WACV", "IEEE/CVF Winter Conference on Applications of Computer Vision"), marks: [{ kind: "oral", group: "oral", source: "author", text: "Oral" }] },
    { role: "second", authors: ["B Writer", "A Author", "C Writer"], me: 1, venue: "NeurIPS 2024 (Spotlight)",
      ...top("NeurIPS", "Conference on Neural Information Processing Systems"), marks: [{ kind: "spotlight", group: "spotlight", source: "author", text: "Spotlight" }] },
    { role: "last", authors: ["B Writer", "C Writer", "D Writer", "A Author"], me: 3, venue: "ACL 2023 (Highlight)",
      ...top("ACL", "Annual Meeting of the Association for Computational Linguistics"), marks: [{ kind: "highlight", group: "highlight", source: "author", text: "Highlight" }] }
  ];
  const EDITION = { ccf: "CCF 2026 (7th edition)", core: "ICORE 2026" };

  // (what a setting draws carries its path, so that the page can point from the setting to it)
  const marked = (el, path) => { el.setAttribute("data-rr-part", path); return el; };
  function sampleRow(s, i) {
    const lit = prefs.roles[s.role];
    const authors = h("div", { class: "g" });
    s.authors.forEach((name, k) => {
      if (k) authors.append(", ");
      authors.append(k === s.me && lit && prefs.rows.name ? h("span", { class: "rr-name rr-name-" + s.role, "data-rr-part": "rows.name" }, name) : name);
    });
    const chips = [], { shown, hidden } = B.prefs.chipLists(prefs, s);
    for (const k of shown) chips.push(marked(B.chips.tierChip(k, s[k], EDITION[k], hidden.length ? { kind: hidden[0], info: s[hidden[0]] } : null), "rows." + k));
    for (const m of B.prefs.chipMarks(prefs, s.marks)) chips.push(marked(B.chips.markChip(m), "rows." + (m.group === "finalist" ? "award" : m.group)));
    return h("tr", { class: lit ? "rr-r-" + s.role : "", ...(lit ? { "data-rr-part": "roles." + s.role } : {}) },
      h("td", {}, h("a", {}, `${t("optSample")} ${i + 1}`), authors, h("div", { class: "g" }, s.venue, chips.length ? [" ", h("span", { class: "rr-chips" }, chips.flatMap((c, i) => (i ? [" ", c] : [c])))] : null)));
  }

  const P = (role, ccf, core, citations, year, abbr, ...markKinds) => ({
    status: "found", role, venue: { ccf: ccf ? { tier: ccf, abbr } : null, core: core ? { rank: core, abbr } : null }, citations, year, highlighted: true,
    marks: markKinds.map((k) => ({ kind: k, group: B.marks.groupOf(k) }))
  });
  // a paper whose author list is cut off (its position is not known), and one whose list does not have the owner at all
  const Q = (status) => ({ status, role: null, venue: { ccf: null, core: null }, citations: 3, year: 2022, highlighted: false, marks: [] });
  const PAPERS = [
    P("first", "A", "A*", 310, 2025, "ICLR", "best"), P("first", "A", "A", 120, 2024, "NeurIPS", "oral"), P("first", "B", "B", 64, 2023, "WSDM"), P("first", null, null, 8, 2022, ""),
    P("cofirst", "A", "A*", 190, 2024, "CVPR", "spotlight"), P("second", "B", "B", 71, 2023, "WSDM"), P("second", "A", "A", 55, 2022, "ICML"),
    P("last", "A", "A*", 240, 2025, "ACL", "tot"), P("last", "C", "C", 12, 2021, "ICANN"), P("middle", "A", "A*", 402, 2024, "ICLR", "highlight"), P("middle", "B", "A", 87, 2023, "NeurIPS"), P("middle", null, null, 5, 2020, ""),
    Q("hidden"), Q("absent")
  ];
  const panelCb = Object.fromEntries(["onSettings", "onCollapse", "onSource", "onSelect", "onOnly", "onYear", "onQuery", "onSearchNext", "onImpact", "onMarkGroup", "onVenue", "onToggleVenues", "onClearFilters", "onCopy", "onAddVariant", "onRemoveVariant", "onLoadAll", "onCancelLoad", "onResolve", "onCancelResolve"].map((k) => [k, () => {}]));
  panelCb.onCopyUnmatched = async () => false;
  panelCb.onCheckVenue = (text) => showVenue(String(text).replace(/\s+/g, " ").trim().slice(0, 300));               // (on this page itself: the box is filled in and shown, nothing is stored)
  panelCb.onSettings = () => { const c = document.getElementById("card-highlight"); if (c) window.scrollTo({ top: c.getBoundingClientRect().top + scrollY - 70, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  let panelUi = { collapsed: false, source: null };                                        // (no tab picked yet: the preview opens on the list the settings prefer)
  panelCb.onCollapse = () => { panelUi.collapsed = !panelUi.collapsed; renderPreview(); };
  panelCb.onSource = (src) => { panelUi.source = src; renderPreview(); };
  const panel = B.panel.create(panelCb);

  function panelModel() {
    const source = B.prefs.source(prefs, panelUi);
    const visible = (p) => ({ marks: B.prefs.panelMarks(prefs, p.marks) });
    const counts = B.marks.summarize(PAPERS.map(visible), prefs.panel.marks.grouping);
    return {
      ownerName: "A Author", edition: EDITION, prefs, ui: panelUi, sources: B.prefs.sources(prefs), source, summary: B.metrics.summarize(PAPERS, source),
      selection: null, filters: { onlyHighlighted: false, yearStart: null, yearEnd: null },
      marks: counts, markKinds: prefs.panel.marks.award ? B.marks.summarizeKinds(PAPERS.map(visible)) : {}, markGroup: null,
      years: [2025, 2024, 2023, 2022, 2021, 2020], metrics: B.metrics.citationMetrics(PAPERS), byYear: B.metrics.byYear(PAPERS), topVenues: B.metrics.topVenues(PAPERS, 6, B.prefs.lists(prefs), B.prefs.winner(prefs)), venueKey: null,
      venuesHasMore: false, venuesExpanded: false,
      // (every part is drawn in the preview, whatever the data — it is what a part is pointed at by: with Merge duplicates on the real panel has no "repeats" line)
      coverage: { loaded: PAPERS.length, canLoadMore: true, complete: false, loadingAll: false, loadMessage: "", repeats: 1, hidden: 1, absent: 1, resolving: null, resolveMessage: "", layoutBroken: false,
        unmatched: [{ venue: "Example Workshop on Things", count: 2 }] },
      variants: [], nameHints: { auto: [], suggestions: [{ name: "Author A", rows: 2 }] }
    };
  }

  let editor = null;
  // The preview is a picture of the panel and of the rows: it is not read out and not in the tab order (what it shows is set by the controls on the left, which are the
  // page for the keyboard and a screen reader; the tray above the preview is the one part of it that is for use). The mouse still works on it, and edits it.
  function quiet(el) {
    el.setAttribute("aria-hidden", "true");
    for (const f of el.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')) f.tabIndex = -1;
  }
  function renderPreview() {
    $("pv-panel").hidden = !prefs.panel.show;
    if (prefs.panel.show) { if (!$("pv-panel").contains(panel.el)) $("pv-panel").append(panel.el); panel.update(panelModel()); }
    $("preview").replaceChildren(...SAMPLES.map(sampleRow));
    quiet($("pv-panel")); quiet(document.querySelector("table.pv"));
    if (editor) editor.refresh();
  }
  renderPreview();

  // The preview is edited from itself as well as from the controls (editor.js): the words it needs from this page
  const partName = (path) => {
    const row = SETTING.get(path);
    if (!row) return path;
    if (path === "panel.show") return t("optPanelTitle");
    if (path.endsWith(".show")) return t(cardOf(row.card).title);                                // (a part of the panel: its card's title)
    if (row.card === "panel") return t(row.label);                                              // (the title bar's parts, the filter bar)
    return `${t(cardOf(row.card).title)} · ${t(row.label)}`;
  };
  // the switches that draw something on the preview and are off: each can be turned on again from the tray (what hangs on a part that is off waits until the part is on)
  const PART_OF = /^panel\.(table|copy|marks|filters|metrics|years|venues|status|names)\./;
  const hiddenParts = () => B.prefs.SETTINGS.filter((s) => {
    if (s.kind !== "bool" || !/^(panel|rows|roles)\./.test(s.path) || at(s.path)) return false;
    if (s.path === "panel.show") return true;
    if (!s.path.startsWith("panel.")) return true;
    if (!at("panel.show")) return false;                                                         // (the panel itself is off: it is what waits)
    const part = PART_OF.exec(s.path);
    return !part || s.path.endsWith(".show") || at(`panel.${part[1]}.show`);
  }).map((s) => ({ path: s.path, name: partName(s.path) }));
  // from the preview to the controls: the setting of a part (its ⚙, or a double-click on it) is brought into view, flashes, and has the keyboard
  let flashTimer = 0;
  function jump(path) {
    if (searchInput.value) { searchInput.value = ""; filterSettings(""); }                                   // (a search of the settings that has hidden the row)
    const control = $("controls").querySelector(`[data-pref="${path}"]`);
    const card = B.prefs.CARDS.find((c) => c.rows.some((r) => r.path === path));
    const row = (control && control.closest(".opt, .role-studio-card")) || control || (card && $("card-" + card.id));
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    for (const el of document.querySelectorAll(".opt-flash")) el.classList.remove("opt-flash");
    void row.offsetWidth;                                                                                    // (the animation starts again when the same row is asked for twice)
    row.classList.add("opt-flash");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => row.classList.remove("opt-flash"), 1800);
    if (control && control.focus && !control.disabled) control.focus({ preventScroll: true });
  }
  editor = B.editor.attach({ aside: document.querySelector(".preview"), host: document.querySelector(".preview > .card"), tray: $("pv-tray"), at, put, save, partName, hiddenParts, jump });
  // from the controls to the preview: the part a setting draws is outlined while the pointer or the keyboard is on the setting
  const settingOf = (target) => { const row = target.closest && target.closest(".opt, .role-studio-card"); const el = row && row.querySelector("[data-pref]"); return el ? el.dataset.pref : null; };
  const point = (path) => (path && path.startsWith("labels.") ? editor.highlight(null, path.slice(7)) : editor.highlight(path || null));
  $("controls").addEventListener("pointerover", (e) => point(settingOf(e.target)));
  $("controls").addEventListener("focusin", (e) => point(settingOf(e.target)));
  for (const type of ["pointerleave", "focusout"]) $("controls").addEventListener(type, () => editor.highlight(null));

  // (the preview is Scholar's own page, which is always light: it does not follow the system theme, and there is nothing to switch)
  const pvAside = document.querySelector(".preview");

  const hint = () => pvAside.classList.toggle("more", pvAside.scrollHeight - pvAside.scrollTop - pvAside.clientHeight > 2);
  pvAside.addEventListener("scroll", hint, { passive: true });
  window.addEventListener("resize", hint);
  new ResizeObserver(hint).observe(pvAside.firstElementChild || pvAside);
  hint();

  B.store.onPrefsChanged((next) => {
    if (isEcho(next)) return;
    prefs = next;
    B.dom.setLabels(prefs.labels);
    B.dom.applyColors(prefs.colors);
    B.dom.applyRowStyle(prefs.rows.style);
    B.dom.applyChips(prefs.chips, prefs.colors);
    renderPreview();
    syncers.forEach((fn) => fn());
  });

  takeAskedVenue();                                      // (this page was opened by a "Check" of the panel's unranked list, or is open and was brought to the front for it)
  B.store.onVenueAsked(() => takeAskedVenue());
})();
