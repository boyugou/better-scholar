"use strict";
// scripts/check-scholar-markup.js is pasted into the DevTools console on real Scholar pages. It must keep
// listing exactly the Scholar classes and ids the extension reads or hides, or it would report "all there"
// for a page the extension can no longer read. Names are compared whole and with their # or . (`#gsc_a_t` is not `.gsc_a_t`).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROFILE, PAPER } = require("../scripts/check-scholar-markup.js");

const content = path.join(__dirname, "..", "src", "content");
const sources = fs.readdirSync(content).filter((f) => /\.(js|css)$/.test(f)).map((f) => fs.readFileSync(path.join(content, f), "utf8")).join("\n");
const names = (s) => new Set(s.match(/[#.]gsc?_[A-Za-z_]+/g) || []);
const listed = names([...PROFILE, ...PAPER].map(([selector]) => selector).join(" "));
const used = names(sources);

test("every Scholar class or id in the check list is one the extension's code uses", () => {
  assert.ok(listed.size >= 15, "the list names the Scholar classes and ids: " + listed.size);
  for (const n of listed) assert.ok(used.has(n), `${n} is in scripts/check-scholar-markup.js but not used in src/content`);
});

test("every Scholar class or id the extension's code uses is in the check list (the CAPTCHA page's own id cannot be checked on a normal page)", () => {
  assert.ok(used.size >= 15, "the scan finds the Scholar names: " + used.size);
  for (const n of used) if (n !== "#gs_captcha_ccl") assert.ok(listed.has(n), `${n} is used in src/content but is not in scripts/check-scholar-markup.js`);
});

test("the check list names a way to count each kind of expectation", () => {
  for (const [selector, what, expect] of [...PROFILE, ...PAPER]) {
    assert.ok(selector && what, "every entry has a selector and a description");
    assert.ok(["some", "rows", "rows2", "maybe"].includes(expect), `${selector}: unknown expectation ${expect}`);
  }
});
