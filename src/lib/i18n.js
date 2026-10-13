// The languages the extension speaks, and the names Scholar's own `hl=` parameter uses for them.
// Pure (no DOM, no chrome.*), shared by the settings page and the tests.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).i18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // [folder in src/_locales, the language's own name, Scholar's hl value]
  const LANGUAGES = [
    ["en", "English", "en"],
    ["zh_CN", "简体中文", "zh-CN"],
    ["zh_TW", "繁體中文", "zh-TW"],
    ["ja", "日本語", "ja"],
    ["ko", "한국어", "ko"],
    ["es", "Español", "es"],
    ["fr", "Français", "fr"],
    ["de", "Deutsch", "de"],
    ["it", "Italiano", "it"],
    ["pt_BR", "Português (Brasil)", "pt-BR"],
    ["pt_PT", "Português (Portugal)", "pt-PT"],
    ["ru", "Русский", "ru"],
    ["uk", "Українська", "uk"],
    ["pl", "Polski", "pl"],
    ["cs", "Čeština", "cs"],
    ["nl", "Nederlands", "nl"],
    ["sv", "Svenska", "sv"],
    ["da", "Dansk", "da"],
    ["fi", "Suomi", "fi"],
    ["no", "Norsk", "no"],
    ["tr", "Türkçe", "tr"],
    ["ar", "العربية", "ar"],
    ["he", "עברית", "iw"],
    ["hi", "हिन्दी", "hi"],
    ["id", "Bahasa Indonesia", "id"],
    ["vi", "Tiếng Việt", "vi"],
    ["th", "ไทย", "th"],
    ["el", "Ελληνικά", "el"],
    ["hu", "Magyar", "hu"],
    ["ro", "Română", "ro"]
  ];

  const RTL = new Set(["ar", "he"]);
  const codes = LANGUAGES.map((l) => l[0]);

  // a stored setting: "auto" (follow the browser) or one of the folders above; anything else is "auto"
  const normalizeLanguage = (v) => (codes.includes(v) ? v : "auto");
  // the same for the language Scholar's own pages are opened in: "keep" (do not touch the address) or one of the folders
  const normalizeScholarLanguage = (v) => (codes.includes(v) ? v : "keep");
  const scholarHl = (code) => { const l = LANGUAGES.find((x) => x[0] === code); return l ? l[2] : ""; };
  const isRtl = (code) => RTL.has(String(code || "").split(/[-_]/)[0]);

  // Chrome's message format: "$name$" is a placeholder whose content may be "$1".."$9" (an argument), "$1" in the text is an
  // argument too, "$$" is a dollar sign.
  function format(entry, subs) {
    if (!entry || typeof entry.message !== "string") return "";
    const args = Array.isArray(subs) ? subs : subs == null ? [] : [subs];
    const ph = {};
    for (const [k, v] of Object.entries(entry.placeholders || {})) ph[k.toLowerCase()] = v && v.content;
    const arg = (s) => String(s).replace(/\$(\d)/g, (_, d) => (args[d - 1] == null ? "" : String(args[d - 1])));
    return entry.message.replace(/\$\$|\$(\d)|\$([A-Za-z0-9_@]+)\$/g, (m, d, name) => {
      if (m === "$$") return "$";
      if (d) return args[d - 1] == null ? "" : String(args[d - 1]);
      const c = ph[name.toLowerCase()];
      return c == null ? m : arg(c);
    });
  }

  // Chrome picks a _locales folder by the browser's own language and does not know that Norwegian Bokmål and Nynorsk (nb, nn) are our "no":
  // for those the folder is asked for explicitly. "" means the browser's own choice is right.
  const fromBrowser = (ui) => { const base = String(ui || "").split(/[-_]/)[0].toLowerCase(); return base === "nb" || base === "nn" ? "no" : ""; };

  return { fromBrowser, LANGUAGES, codes, normalizeLanguage, normalizeScholarLanguage, scholarHl, isRtl, format };
});
