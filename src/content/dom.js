// Tiny DOM helpers shared by the panel and the popup. No framework, no innerHTML.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});

  // h("div", { class: "x", onClick: fn, dataset: { a: 1 } }, "text", childNode, [more])
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.length > 2 && k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
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
  function lookup(key, subs) {
    if (custom && custom[key]) return B.i18n.format(custom[key], subs);
    try { return chrome.i18n.getMessage(key, subs); } catch (e) { return ""; /* extension context gone */ }
  }
  // Reads the language setting and loads its strings. Call once, before anything is drawn.
  async function useLanguage() {
    let code = "auto";
    try { const r = await chrome.storage.sync.get("prefs"); code = (r.prefs && r.prefs.language) || "auto"; applyColors(r.prefs && r.prefs.colors); applyRowStyle(r.prefs && r.prefs.rowStyle); } catch (e) { /* no storage: the browser's language */ }
    custom = null;
    if (code === "auto") code = B.i18n.fromBrowser(chrome.i18n.getUILanguage()) || "auto";       // (Norwegian Bokmål / Nynorsk browsers get "no", which Chrome would not pick)
    language = code === "auto" ? B.i18n.resolve(chrome.i18n.getUILanguage()) : code;                    // (a browser language we have no folder for is served in English, and its page is marked so)
    if (code !== "auto") {
      try { const r = await chrome.runtime.sendMessage({ type: "rr:messages", lang: code }); if (r && r.ok) custom = r.messages; else language = chrome.i18n.getUILanguage(); } catch (e) { language = chrome.i18n.getUILanguage(); }
    }
    return language;
  }
  // The role colours the settings chose, as custom properties on the page root (a role without one keeps the stylesheet's own colour)
  function applyColors(colors) {
    for (const role of ["first", "cofirst", "second", "last"]) {
      const c = colors && colors[role];
      if (c) document.documentElement.style.setProperty("--rr-c-" + role, c); else document.documentElement.style.removeProperty("--rr-c-" + role);
    }
  }
  // How highlighted rows look: a class on <html> (styled in styles.css); "full" is the plain default
  function applyRowStyle(style) {
    for (const k of ["bar", "tint"]) document.documentElement.classList.toggle("rr-rows-" + k, style === k);
  }
  const dir = () => (B.i18n.isRtl(language) ? "rtl" : "ltr");
  const langTag = () => String(language).replace("_", "-");

  // chrome.i18n lookup; falls back to the key so a missing string is visible, not blank.
  function t(key, subs) {
    return lookup(key, subs) || key;
  }

  // Like t() but prefers "<key>One" when n === 1 (English singular); other locales simply omit it.
  function tn(key, n, subs) {
    if (n === 1) {
      const m = lookup(key + "One", subs);
      if (m) return m;
    }
    return t(key, subs);
  }

  async function copyText(text) {
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

  // The only places this extension points a user at: its own issue tracker, as plain links they may click.
  // Nothing is sent anywhere by the extension itself.
  const REPO = "https://github.com/boyugou/scholar-roles-and-ranks";
  function issueUrl(title, body) {
    return REPO + "/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(String(body || "").slice(0, 1200));
  }

  B.dom = { h, t, tn, applyColors, applyRowStyle, useLanguage, dir, langTag, copyText, sleep, frame, issueUrl };
})();
