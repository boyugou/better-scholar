// The colours of the chips, from one colour a person picks for a family of them. Pure, no DOM: the settings page and the Scholar page set what vars() gives as custom
// properties on <html>, and styles.css reads them with the built-in colours as the fallback of each (so a family without a pick keeps exactly the colours it always had).
//
// Families: "ccf" and "core" (rank chips, four tiers from the strongest: A, A or A*, B, C), "award" (best paper and the like) and "talk" (Oral, Spotlight, Highlight).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).palette = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FAMILIES = ["ccf", "core", "award", "talk"];
  // the stylesheet's own colour of each family (what a family has until a colour is picked)
  const DEFAULTS = { ccf: "#3345a8", core: "#3345a8", award: "#d29a00", talk: "#3a4a5f" };

  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  // `p` of a, the rest of b
  const mix = (a, b, p) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v * p + y[i] * (1 - p))); };
  const luminance = (hex) => {
    const [r, g, b] = rgb(hex).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const x = luminance(a) + 0.05, y = luminance(b) + 0.05; return Math.max(x, y) / Math.min(x, y); };
  const WHITE = "#ffffff", DARK = "#101216";
  // the text that reads best on a fill: white or near black, whichever has the higher contrast
  const on = (fill) => (contrast(WHITE, fill) >= contrast(DARK, fill) ? WHITE : DARK);

  // Text on a chip is small (10.5px): it has to read at the contrast WCAG asks of small text, whatever colour a person picks. A text colour is darkened, step by step,
  // until it does on the chip's background; a fill that neither white nor near-black text can be read on (a mid grey) is darkened until white text can.
  const AA = 4.5;
  const darker = (hex) => mix(hex, "#000000", 0.94);
  function legible(ink, bg) { let c = ink; for (let i = 0; i < 60 && contrast(c, bg) < AA; i++) c = darker(c); return c; }
  function solid(fill) { let c = fill; for (let i = 0; i < 60 && contrast(on(c), c) < AA; i++) c = darker(c); return c; }
  // (the soft look lays a tenth of the fill on white; the outline and text looks are on white itself: the tint is the harder of the two)
  const tint = (fill) => mix(fill, WHITE, 0.1);

  // The custom properties of one family for the colour `hex` ("#rrggbb"): { "--rr-ccf-1-ink": …, … }
  function vars(family, hex) {
    if (!FAMILIES.includes(family) || !/^#[0-9a-fA-F]{6}$/.test(hex)) return {};
    const x = hex.toLowerCase(), out = {};
    if (family === "ccf" || family === "core") {
      // the tiers fade: the strongest is the colour itself, the weakest is mostly grey (ink: the text, edge: the outline, fill: the solid style's background)
      const tiers = [
        { ink: x, edge: mix(x, WHITE, 0.5), fill: x },
        { ink: mix(x, WHITE, 0.78), edge: mix(x, WHITE, 0.28), fill: mix(x, WHITE, 0.82) },
        { ink: mix(x, "#69708a", 0.16), edge: mix(x, "#d3d7e3", 0.09), fill: mix(x, WHITE, 0.62) },
        { ink: mix(x, "#727a8f", 0.1), edge: mix(x, "#e2e5ec", 0.06), fill: mix(x, WHITE, 0.5) }
      ];
      tiers.forEach((t, i) => {
        const fill = solid(t.fill);
        for (const [k, v] of Object.entries({ ink: legible(t.ink, tint(fill)), edge: t.edge, fill, on: on(fill) })) out[`--rr-${family}-${i + 1}-${k}`] = v;
      });
    } else if (family === "award") {
      const bg = mix(x, WHITE, 0.14), fill = solid(x);
      Object.assign(out, { "--rr-award-bg": bg, "--rr-award-ink": legible(mix(x, "#000000", 0.5), bg), "--rr-award-edge": mix(x, WHITE, 0.5), "--rr-award-icon": x,
        "--rr-award-fill": fill, "--rr-award-on": on(fill), "--rr-finalist-ink": legible(mix(x, "#000000", 0.55), WHITE), "--rr-finalist-edge": mix(x, WHITE, 0.6) });
    } else {
      const bg = mix(x, WHITE, 0.1), fill = solid(x);
      Object.assign(out, { "--rr-talk-bg": bg, "--rr-talk-ink": legible(mix(x, "#000000", 0.85), bg), "--rr-talk-edge": mix(x, WHITE, 0.25), "--rr-talk-fill": fill, "--rr-talk-on": on(fill) });
    }
    return out;
  }
  // every property name vars() can set (what has to be cleared when a colour is put back), and by family
  const BY_FAMILY = Object.fromEntries(FAMILIES.map((f) => [f, Object.keys(vars(f, DEFAULTS[f]))]));
  const NAMES = FAMILIES.flatMap((f) => BY_FAMILY[f]);

  return { FAMILIES, DEFAULTS, NAMES, BY_FAMILY, AA, vars, mix, on, contrast, luminance, legible, solid };
});
