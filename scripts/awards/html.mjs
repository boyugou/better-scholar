// Plain-text reading of HTML for the award readers: entities decoded (numeric, the usual named ones and all of Latin-1's
// accented letters), tags dropped, soft hyphens and zero-width characters removed, no-break spaces read as spaces, whitespace collapsed. No DOM, no dependencies.
const LATIN1 = ["Agrave", "Aacute", "Acirc", "Atilde", "Auml", "Aring", "AElig", "Ccedil", "Egrave", "Eacute", "Ecirc", "Euml", "Igrave", "Iacute", "Icirc", "Iuml",
  "ETH", "Ntilde", "Ograve", "Oacute", "Ocirc", "Otilde", "Ouml", "times", "Oslash", "Ugrave", "Uacute", "Ucirc", "Uuml", "Yacute", "THORN", "szlig",
  "agrave", "aacute", "acirc", "atilde", "auml", "aring", "aelig", "ccedil", "egrave", "eacute", "ecirc", "euml", "igrave", "iacute", "icirc", "iuml",
  "eth", "ntilde", "ograve", "oacute", "ocirc", "otilde", "ouml", "divide", "oslash", "ugrave", "uacute", "ucirc", "uuml", "yacute", "thorn", "yuml"];
// (Latin Extended-A: the names of Central European authors)
const EXT = { Ccaron: "Č", ccaron: "č", Cacute: "Ć", cacute: "ć", Scaron: "Š", scaron: "š", Zcaron: "Ž", zcaron: "ž", Ecaron: "Ě", ecaron: "ě", Rcaron: "Ř", rcaron: "ř", Ncaron: "Ň", ncaron: "ň", Dcaron: "Ď", dcaron: "ď", Tcaron: "Ť", tcaron: "ť", Lstrok: "Ł", lstrok: "ł", Scedil: "Ş", scedil: "ş", Gbreve: "Ğ", gbreve: "ğ", Idot: "İ", inodot: "ı", Abreve: "Ă", abreve: "ă", Amacr: "Ā", amacr: "ā", Emacr: "Ē", emacr: "ē", Omacr: "Ō", omacr: "ō", Umacr: "Ū", umacr: "ū", Odblac: "Ő", odblac: "ő", Udblac: "Ű", udblac: "ű" };
const NAMED = { ...EXT, amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", ndash: "–", mdash: "—", hellip: "…", shy: "", copy: "©", reg: "®", trade: "™", bull: "•", deg: "°", thinsp: " ", ensp: " ", emsp: " " };
LATIN1.forEach((name, i) => { NAMED[name] = String.fromCharCode(192 + i); });

// HTML also reads the old Latin-1 entities without their semicolon ("J&oumlrg" is "Jörg"), the longest name first
const LEGACY = new Set([...LATIN1, "amp", "lt", "gt", "quot", "nbsp", "copy", "reg", "shy", "deg"]);
export const decode = (s) => s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (m, hex, dec, name) =>
  hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(parseInt(dec, 10)) : name in NAMED ? NAMED[name] : name.toLowerCase() in NAMED && /^[a-z]+$/.test(name) ? NAMED[name.toLowerCase()] : m)
  .replace(/&([A-Za-z][A-Za-z0-9]{1,7})(?!;)/g, (m, name) => {
    for (let n = name.length; n >= 2; n--) if (LEGACY.has(name.slice(0, n))) return NAMED[name.slice(0, n)] + name.slice(n);
    return m;
  });

// the visible text of an HTML fragment (a <br> is a space)
export const text = (html) => decode(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
  .replace(/[\u00ad\u200b-\u200d\ufeff]/g, "").replace(/[\u00a0\u202f\u2009]/g, " ").replace(/\s+/g, " ").trim();

// the page as lines of plain text: block ends and <br> become line breaks, scripts and styles are dropped
// (comments are not what a reader sees and are dropped; a tag may run over a line break — ``<a href="…\n">`` — so tags go before the text is split)
export const lines = (html) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, "")
  .replace(/<[^>]*>/g, (tag) => (/^<\/(?:p|div|h\d|li|tr|td|dt|dd)\b/i.test(tag) || /^<br\b/i.test(tag) ? "\n" : ""))
  .split("\n").map((l) => text(l)).filter(Boolean);
