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
  const ccf = palette.vars("ccf", "#0D9488");
  assert.equal(Object.keys(ccf).length, 16, "four tiers, four properties each");
  assert.equal(ccf["--rr-ccf-1-ink"], "#0d9488", "the strongest tier is the colour itself");
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
  assert.match(css, /--rr-core-1-ink, #3345a8/);
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
