"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const analysis = require("../src/lib/analysis.js");

const samplePaper = {
  raw: {
    title: "Deep Residual Learning for Image Recognition",
    authorsText: "K He, X Zhang, S Ren, J Sun",
    venueText: "Proceedings of the IEEE conference on computer vision and pattern recognition, 2016",
    citations: 180000,
    year: 2016,
    href: "/citations?view_op=view_citation&citation_for_view=123"
  },
  a: {
    status: "found",
    role: "first",
    year: 2016,
    citations: 180000,
    venue: {
      ccf: { tier: "A", abbr: "CVPR", name: "IEEE Conference on Computer Vision and Pattern Recognition" },
      core: { rank: "A*", abbr: "CVPR", name: "IEEE Conference on Computer Vision and Pattern Recognition" }
    },
    marks: [
      { kind: "best", group: "award", label: "Best Paper Award", text: "CVPR 2016 Best Paper Award" }
    ]
  },
  shown: 180000
};

test("matchesQuery: empty or blank queries match all rows", () => {
  assert.equal(analysis.matchesQuery(samplePaper, ""), true);
  assert.equal(analysis.matchesQuery(samplePaper, "   "), true);
  assert.equal(analysis.matchesQuery(samplePaper, null), true);
  assert.equal(analysis.matchesQuery(samplePaper, undefined), true);
});

test("matchesQuery: plain substring matching across fields", () => {
  assert.equal(analysis.matchesQuery(samplePaper, "residual"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "Kaiming"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "He"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "CVPR"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "Computer Vision"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "2016"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "first"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "best paper"), true);
});

test("matchesQuery: multi-token conjunctive (AND) queries", () => {
  assert.equal(analysis.matchesQuery(samplePaper, "He CVPR 2016"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "He NeurIPS"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "residual CVPR Best"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "residual 2024"), false);
});

test("matchesQuery: numeric citation comparisons", () => {
  assert.equal(analysis.matchesQuery(samplePaper, ">1000"), true);
  assert.equal(analysis.matchesQuery(samplePaper, ">=180000"), true);
  assert.equal(analysis.matchesQuery(samplePaper, ">180000"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "<200000"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "<100"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "cites:>50000"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "c:>200000"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "cites:<=180000"), true);
});

test("matchesQuery: year comparisons", () => {
  assert.equal(analysis.matchesQuery(samplePaper, ">2010"), true);
  assert.equal(analysis.matchesQuery(samplePaper, ">=2016"), true);
  assert.equal(analysis.matchesQuery(samplePaper, ">2016"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "<2020"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "<2015"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "year:>2015"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "y:<=2016"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "year:>2020"), false);
});

test("matchesQuery: ranking tier and rank filters", () => {
  assert.equal(analysis.matchesQuery(samplePaper, "ccf:a"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "ccf:b"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "core:a*"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "core:a"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "tier:a"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "rank:a*"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "tier:c"), false);
});

test("matchesQuery: role filters", () => {
  assert.equal(analysis.matchesQuery(samplePaper, "role:first"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "r:first"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "role:last"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "role:second"), false);
});

test("matchesQuery: award and talk filters", () => {
  assert.equal(analysis.matchesQuery(samplePaper, "has:award"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "is:award"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "has:talk"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "is:talk"), false);
});

test("matchesQuery: compound queries combining operators", () => {
  assert.equal(analysis.matchesQuery(samplePaper, "ccf:a role:first >1000 >2015 has:award CVPR"), true);
  assert.equal(analysis.matchesQuery(samplePaper, "ccf:a role:first >200000"), false);
  assert.equal(analysis.matchesQuery(samplePaper, "ccf:a role:last >1000"), false);
});
