"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const palette = require("../src/lib/palette.js");
const prefs = require("../src/lib/prefs.js");

const css = fs.readFileSync(path.join(__dirname, "../src/content/styles.css"), "utf8");
const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/_locales/en/messages.json"), "utf8"));

test("the text on a fill is the one with the higher contrast: white on dark, near black on light", () => {
  assert.equal(palette.on("#3345a8"), "#ffffff");
  assert.equal(palette.on("#d29a00"), "#101216");
  assert.equal(palette.on("#ffffff"), "#101216");
  assert.equal(palette.on("#000000"), "#ffffff");
  for (const fill of ["#123456", "#abcdef", "#808080", "#ff0000", "#00ff00", "#0d9488", "#7c3aed", "#d97706"]) assert.ok(palette.contrast(palette.on(fill), fill) >= 4.5, fill);
});

test("mix: a share of one colour, the rest another", () => {
  assert.equal(palette.mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(palette.mix("#ff0000", "#0000ff", 1), "#ff0000");
  assert.equal(palette.mix("#ff0000", "#0000ff", 0), "#0000ff");
});

test("vars: the custom properties of a family from one colour; nothing for a colour that is not one", () => {
  const ccf = palette.vars("ccf", "#3345A8");
  assert.equal(Object.keys(ccf).length, 16, "four tiers, four properties each");
  assert.equal(ccf["--rr-ccf-1-ink"], "#3345a8", "the strongest tier is the colour itself (when it reads)");
  assert.ok(palette.luminance(ccf["--rr-ccf-4-fill"]) > palette.luminance(ccf["--rr-ccf-1-fill"]), "the weakest tier is fainter");
  for (let i = 1; i <= 4; i++) assert.ok(palette.contrast(ccf[`--rr-ccf-${i}-on`], ccf[`--rr-ccf-${i}-fill`]) >= 4.5, "the text on tier " + i + "'s fill is readable");
  assert.equal(Object.keys(palette.vars("award", "#ff8800")).length, 8);
  assert.equal(Object.keys(palette.vars("talk", "#7c3aed")).length, 5);
  assert.deepEqual(palette.vars("award", "red"), {});
  assert.deepEqual(palette.vars("award", ""), {});
  assert.deepEqual(palette.vars("nope", "#112233"), {});
  assert.equal(new Set(palette.NAMES).size, palette.NAMES.length);
});

test("every property the palette sets is read by the stylesheet, and the built-in colours there are the palette's defaults", () => {
  assert.deepEqual(palette.NAMES.filter((n) => !css.includes(n)), []);
  assert.match(css, /--rr-ccf-1-ink, #3345a8/);
  assert.match(css, /--rr-core-1-ink, color-mix\(in srgb, #176b73 var\(--look-core, 0%\), #3345a8\)/, "CORE's own colour is the indigo unless the look leaves the list's name out");
  assert.match(css, /--rr-award-fill, #d29a00/);
  assert.match(css, /--rr-talk-ink, #3a4a5f/);
  assert.deepEqual(palette.DEFAULTS, { ccf: "#3345a8", core: "#3345a8", award: "#d29a00", talk: "#3a4a5f" });
});

test("the chips' looks: each is a patch the table accepts that names every chip setting, and has a name", () => {
  const ids = prefs.CHIP_THEMES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  const chipPaths = prefs.SETTINGS.filter((s) => /^(chips\.|colors\.(ccf|core|award|talk)$)/.test(s.path)).map((s) => s.path).sort();
  assert.equal(chipPaths.length, 7);
  for (const theme of prefs.CHIP_THEMES) {
    assert.ok(en[theme.name], theme.id + ": its name is a message");
    const r = prefs.apply(prefs.defaults(), theme.patch);
    assert.deepEqual(r.ignored, [], theme.id);
    const named = [...Object.keys(theme.patch.chips).map((k) => "chips." + k), ...Object.keys(theme.patch.colors).map((k) => "colors." + k)].sort();
    assert.deepEqual(named, chipPaths, theme.id + " names every chip setting, so that it replaces the look that was there");
  }
  // applied over another look, a look leaves nothing of it behind
  const messy = prefs.apply(prefs.defaults(), { chips: { style: "solid", shape: "square", label: "tier" }, colors: { ccf: "#ff0000", talk: "#00ff00" } }).prefs;
  const back = prefs.apply(messy, prefs.CHIP_THEMES[0].patch).prefs;
  assert.deepEqual([back.chips, back.colors.ccf, back.colors.talk], [prefs.defaults().chips, "", ""]);
});

// the soft look lays a tenth of the fill over white: the text has to read there and on white itself
test("text on a chip reads (4.5:1) whatever colour is picked: every tier's text on its look's background, the text on a solid fill, awards, finalists and talks", () => {
  const picks = ["#ffcc00", "#ffffff", "#000000", "#797979", "#0d9488", "#3345a8", "#7cc4ff", "#ff8800", "#d29a00", "#fde047", "#a3e635", "#22d3ee"];
  for (let h = 0; h < 360; h += 15) { const c = (n) => Math.round(255 * (0.55 + 0.45 * Math.cos(((h + n) * Math.PI) / 180))).toString(16).padStart(2, "0"); picks.push("#" + c(0) + c(120) + c(240)); }
  const white = "#ffffff", tint = (f) => palette.mix(f, white, 0.1);
  for (const x of picks) {
    for (const family of ["ccf", "core"]) {
      const v = palette.vars(family, x);
      for (let i = 1; i <= 4; i++) {
        const fill = v[`--rr-${family}-${i}-fill`];
        assert.ok(palette.contrast(v[`--rr-${family}-${i}-ink`], tint(fill)) >= palette.AA, `${family} ${i} text on ${x}`);
        assert.ok(palette.contrast(v[`--rr-${family}-${i}-ink`], white) >= palette.AA, `${family} ${i} text on white for ${x}`);
        assert.ok(palette.contrast(v[`--rr-${family}-${i}-on`], fill) >= palette.AA, `${family} ${i} text on its solid fill for ${x}`);
      }
    }
    const a = palette.vars("award", x), t = palette.vars("talk", x);
    assert.ok(palette.contrast(a["--rr-award-ink"], a["--rr-award-bg"]) >= palette.AA, "award " + x);
    assert.ok(palette.contrast(a["--rr-finalist-ink"], white) >= palette.AA, "finalist " + x);
    assert.ok(palette.contrast(a["--rr-award-on"], a["--rr-award-fill"]) >= palette.AA, "award solid " + x);
    assert.ok(palette.contrast(t["--rr-talk-ink"], t["--rr-talk-bg"]) >= palette.AA, "talk " + x);
    assert.ok(palette.contrast(t["--rr-talk-on"], t["--rr-talk-fill"]) >= palette.AA, "talk solid " + x);
  }
  // the ready-made looks are among the colours a person gets without picking
  for (const theme of prefs.CHIP_THEMES) for (const family of palette.FAMILIES) {
    const x = theme.patch.colors[family];
    if (!x) continue;
    for (const [name, value] of Object.entries(palette.vars(family, x))) if (/-(ink)$/.test(name)) assert.ok(palette.contrast(value, white) >= palette.AA, `${theme.id} ${name}`);
  }
});

test("the built-in colours in the stylesheet read too (4.5:1 on white, on the soft look's tint and on every row tint), the CORE colours of 'tier alone' included, and CORE is teal only while the list's name is left out", () => {
  const W = "#ffffff";
  const rowTints = [palette.mix("#1a73e8", W, 0.12), palette.mix("#a142f4", W, 0.12), palette.mix("#f9ab00", W, 0.14), palette.mix("#1e8e3e", W, 0.12)];     // (the role colours at the alphas of the rows' tints)
  const hexes = (expr) => (expr.match(/#[0-9a-f]{3,6}\b/gi) || []).map((h) => (h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h.toLowerCase()));
  // the fallback of `name: var(--x, FALLBACK)`, found by balancing the parentheses (a fallback may hold a colour-mix and a var of its own)
  const decl = (rule, name) => {
    const at = rule.indexOf(name + ": var(");
    assert.ok(at >= 0, name + " in " + rule);
    let depth = 0, i = rule.indexOf("(", at);
    const start = i;
    for (; i < rule.length; i++) { if (rule[i] === "(") depth++; else if (rule[i] === ")" && --depth === 0) break; }
    const inner = rule.slice(start + 1, i);
    return inner.slice(inner.indexOf(",") + 1);
  };
  let rules = 0;
  for (const m of css.matchAll(/^\.rr-chip-t(\d)\[data-kind="(ccf|core)"\]\s+\{[^\n]*\}$/gm)) {
    rules++;
    const inks = hexes(decl(m[0], "--ink")), fills = hexes(decl(m[0], "--fill")), on = hexes(decl(m[0], "--on"))[0];
    assert.equal(inks.length, fills.length, m[0]);
    inks.forEach((ink, i) => {
      for (const bg of [W, palette.mix(fills[i], W, 0.1), ...rowTints]) assert.ok(palette.contrast(ink, bg) >= palette.AA, `${m[2]} tier ${m[1]}: ${ink} on ${bg} is ${palette.contrast(ink, bg).toFixed(2)}`);
      assert.ok(palette.contrast(on, fills[i]) >= palette.AA, `${m[2]} tier ${m[1]}: ${on} on its solid fill ${fills[i]}`);
    });
    if (m[2] === "core") assert.equal(inks.length, 2, "CORE has a teal and an indigo colour (the look's flag decides)");
  }
  assert.equal(rules, 8, "four tiers of each list");
  for (const key of ["award-ink", "finalist-ink", "talk-ink"]) assert.ok(palette.contrast(hexes(css.match(new RegExp("--rr-" + key + ", (#[0-9a-f]{3,6})"))[0])[0], W) >= palette.AA, key);
  // the colour of CORE follows the nearest look (an inherited property), not an ancestor's class
  assert.match(css, /\.rr-chips-tier\s*\{[^}]*--look-core: 100%/);
  assert.match(css, /\.rr-chips-full\s*\{[^}]*--look-core: 0%/);
  assert.doesNotMatch(css, /\.rr-chips-tier \.rr-chip/, "no rule that reads an ancestor's class: a sample on a button with its own look would leak");
});
