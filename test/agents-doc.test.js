"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { render } = require("../scripts/agents-doc.js");

test("AGENTS.md is the generated reference: npm run agents:doc after a change to the settings, the calls or the search syntax", () => {
  assert.equal(fs.readFileSync(path.join(__dirname, "..", "AGENTS.md"), "utf8"), render());
});
