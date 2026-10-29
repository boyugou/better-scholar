// Tiny DOM helpers shared by the panel and the popup. No framework, no innerHTML.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});

  // The events of a person: a click, a key, a press. One that a script made (el.click(), dispatchEvent) does not press the extension's buttons — they write settings, ask
  // Scholar for pages and open the settings page, and a script on the page can use the page events (lib/agent.js) for what it may do.
  const PERSON = new Set(["click", "keydown", "pointerdown"]);

  // h("div", { class: "x", onClick: fn, dataset: { a: 1 } }, "text", childNode, [more])
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.length > 2 && k.startsWith("on") && typeof v === "function") { const type = k.slice(2).toLowerCase(); el.addEventListener(type, PERSON.has(type) ? (e) => { if (e.isTrusted) v(e); } : v); }
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // The interface language. Followed from the browser (chrome.i18n) unless the settings name another one: then the strings of that
  // language, asked of the background page, are used (`custom`, in Chrome's messages.json shape).
  let custom = null, language = "";
  // the same strings, kept for when Chrome's own lookup fails: an extension updated (or switched off) under an open page cuts its script off, and chrome.i18n
  // answers nothing there — every word of a redrawn panel would be its key ("summaryTitle")
  let spare = null;
  // The names the person gave things in the settings (lib/prefs.js NAMES; the settings' `labels`, normalized): a name replaces the translation, in every language
  let labels = {};
  const setLabels = (map) => { labels = map && typeof map === "object" ? map : {}; };
  // the name the person gave a thing, or "" (a thing whose built-in text is not a fixed one: your own quick filter shows its words)
  const ownName = (key) => labels[key] || "";
  function lookup(key, subs) {
    if (labels[key]) return labels[key];
    if (custom && custom[key]) return B.i18n.format(custom[key], subs);
    let said = "";
    try { said = chrome.i18n.getMessage(key, subs); } catch (e) { /* extension context gone */ }
    return said || (spare && spare[key] ? B.i18n.format(spare[key], subs) : "");
  }
  // Reads the language setting and loads its strings. Call once, before anything is drawn.
  async function useLanguage() {
    let code = "auto";
    try { const r = await chrome.storage.sync.get("prefs"); code = (r.prefs && r.prefs.language) || "auto"; applyColors(r.prefs && r.prefs.colors); applyRowStyle(r.prefs && r.prefs.rows && r.prefs.rows.style); applyChips(r.prefs && r.prefs.chips, r.prefs && r.prefs.colors); } catch (e) { /* no storage: the browser's language */ }
    custom = null;
    if (code === "auto") code = B.i18n.fromBrowser(chrome.i18n.getUILanguage()) || "auto";       // (Norwegian Bokmål / Nynorsk browsers get "no", which Chrome would not pick)
    language = code === "auto" ? B.i18n.resolve(chrome.i18n.getUILanguage()) : code;                    // (a browser language we have no folder for is served in English, and its page is marked so)
    if (code !== "auto") {
      try { const r = await chrome.runtime.sendMessage({ type: "rr:messages", lang: code }); if (r && r.ok) custom = r.messages; else language = B.i18n.resolve(chrome.i18n.getUILanguage()); } catch (e) { language = B.i18n.resolve(chrome.i18n.getUILanguage()); }
    }
    if (!custom) { try { chrome.runtime.sendMessage({ type: "rr:messages", lang: language }).then((r) => { if (r && r.ok) spare = r.messages; }, () => {}); } catch (e) { /* gone already */ } }          // (not waited for: nothing is drawn later for it)
    return language;
  }
  // The role colours the settings chose, as custom properties on the page root (a role without one keeps the stylesheet's own colour)
  function applyColors(colors) {
    for (const role of ["first", "cofirst", "second", "last"]) {
      const c = colors && colors[role];
      if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) document.documentElement.style.setProperty("--rr-c-" + role, c); else document.documentElement.style.removeProperty("--rr-c-" + role);          // (a colour is "#rrggbb" and nothing else, whoever wrote the record)
    }
  }
  // How the chips look: classes on <html> for the style, the shape and the words (styles.css turns them into a few custom properties), and the colours the
  // person picked as custom properties (lib/palette.js makes them; a family with no pick keeps the stylesheet's own)
  function applyChips(chips, colors) {
    const root = document.documentElement, c = chips || {};
    for (const [group, values] of [["style", ["outline", "soft", "solid", "text"]], ["shape", ["pill", "square"]], ["label", ["full", "tier"]]]) for (const v of values) root.classList.toggle("rr-chips-" + v, c[group] === v);
    if (!B.palette) return;
    for (const name of B.palette.NAMES) root.style.removeProperty(name);
    for (const family of B.palette.FAMILIES) if (colors && colors[family]) for (const [name, value] of Object.entries(B.palette.vars(family, colors[family]))) root.style.setProperty(name, value);
  }
  // How highlighted rows look: a class on <html> (styled in styles.css); "full" is the plain default
  function applyRowStyle(style) {
    for (const k of ["bar", "tint", "none"]) document.documentElement.classList.toggle("rr-rows-" + k, style === k);
  }
  const dir = () => (B.i18n.isRtl(language) ? "rtl" : "ltr");
  const langTag = () => String(language).replace("_", "-");
  // the comma between two words of one phrase, and the quotes round a typed query, as the language writes them (the standard English words of the copied summary keep ", " and "…")
  const comma = () => { const l = String(language).slice(0, 2).toLowerCase(); return l === "zh" ? "，" : l === "ja" ? "、" : l === "ar" ? "، " : ", "; };
  const QUOTES = { zh: ["“", "”"], ko: ["“", "”"], ja: ["「", "」"], de: ["„", "“"], cs: ["„", "“"], pl: ["„", "”"], ru: ["«", "»"], uk: ["«", "»"], fr: ["«\u00a0", "\u00a0»"] };
  const quote = (text) => { const q = QUOTES[String(language).slice(0, 2).toLowerCase()] || ['"', '"']; return q[0] + text + q[1]; };
  // the colon after a label: full-width in Chinese and Japanese, with a no-break space before it in French
  // What the search could not read, in the interface's language ("ccf:d — ccf takes one of: a, b, c"): the operator's words as they are typed, each in a left-to-right
  // isolate (a ">" in an Arabic or Hebrew line would otherwise be drawn as "<")
  const searchProblem = ({ word, name }) => {
    const op = B.query.OPERATORS.find((o) => o.name === name), code = (s) => "\u2066" + s + "\u2069";
    return op.values ? t("searchBadList", [code(word), code(name), op.values.map(code).join(comma())]) : t("searchBadNumber", [code(word), code(name), code(op.example)]);
  };
  const colon = () => { const l = String(language).slice(0, 2).toLowerCase(); return l === "zh" || l === "ja" ? "：" : l === "fr" ? "\u00a0: " : ": "; };

  // chrome.i18n lookup; falls back to the key so a missing string is visible, not blank.
  function t(key, subs) {
    return lookup(key, subs) || key;
  }

  // The words as the language has them, whatever the person called the thing: for what a machine reads (the exports) and for the settings page's own placeholders
  function tDefault(key, subs) {
    const named = labels;
    labels = {};
    try { return t(key, subs); } finally { labels = named; }
  }

  // Like t() but prefers "<key>One" when n === 1 (English singular); other locales simply omit it.
  function tn(key, n, subs) {
    if (n === 1) {
      const m = lookup(key + "One", subs);
      if (m) return m;
    }
    return t(key, subs);
  }

  // A picture on the clipboard, with its text beside it (a text field takes the text); false when the browser refuses it
  async function copyImage(blob, text) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob, "text/plain": new Blob([text || ""], { type: "text/plain" }) })]);
      return true;
    } catch (e) { return false; }
  }

  // The text goes to the clipboard. With `html` the clipboard holds both: a word processor takes the HTML (a real table, real italics) where a text box or a spreadsheet takes the text.
  async function copyText(text, html) {
    if (html && typeof ClipboardItem === "function") {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
        return true;
      } catch (e) { /* the text alone, below */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = h("textarea", { style: "position:fixed;left:-9999px;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function frame(fn) {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(); });
    };
  }

  function downloadFile(filename, text, mimeType = "text/csv;charset=utf-8;") {
    if (typeof text === "string" && (text === "application/json" || text.startsWith("text/")) && typeof mimeType === "string" && !mimeType.startsWith("text/") && !mimeType.startsWith("application/")) {
      const tmp = text; text = mimeType; mimeType = tmp;
    }
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: filename, style: "display:none" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // The only places this extension points a user at: its own issue tracker, as plain links they may click.
  // Nothing is sent anywhere by the extension itself.
  const REPO = "https://github.com/boyugou/better-scholar";
  function issueUrl(title, body) {
    return REPO + "/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(String(body || "").slice(0, 1200));
  }

  // the words on the copy buttons (panel, toolbar popup, settings page): one per format of lib/prefs.js COPY_BUTTONS
  const COPY_LABEL = { summary: "copySummary", table: "copyTable", image: "copyImage", papers: "copyPapers", apa: "copyApa", ieee: "copyIeee", acm: "copyAcm", gbt: "copyGbt", bibtex: "copyBibtex", markdown: "copyMarkdown", json: "copyJson", csv: "exportCsv" };

  B.dom = { h, t, tn, tDefault, ownName, setLabels, searchProblem, COPY_LABEL, applyColors, applyRowStyle, applyChips, useLanguage, dir, langTag, colon, comma, quote, copyText, copyImage, downloadFile, sleep, frame, issueUrl, REPO };
})();
