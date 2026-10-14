# AGENTS.md — AI & Automation Agent Integration Guide

Welcome to **Better Scholar**. This guide documents the architecture, programming interfaces, and execution guidelines for automated agents (LLM assistants, autonomous browser agents, web crawlers, Playwright scripts, and DevTools integrations).

---

## 1. System Architecture & Core Constraints

Better Scholar is an open-source, local-first Chrome Extension (Manifest V3) that enhances Google Scholar profiles with author role recognition, CCF/CORE rankings, honors/awards indexing, citation analytics, and structured exports.

### Engineering Invariants
- **Zero Runtime Dependencies**: The extension has no npm runtime or build dependencies. The `src/` directory directly loads in Chromium browsers (`chrome://extensions` → *Load unpacked*).
- **Pure Core Library**: All algorithmic parsing, metrics computation, and string matching reside in `src/lib/` (`names.js`, `venues.js`, `metrics.js`, `marks.js`, `awards.js`, `duplicates.js`, `prefs.js`, `i18n.js`). They are pure CommonJS/UMD modules with **zero DOM or `chrome.*` dependencies**, making them directly testable in Node.js via `node --test`.
- **Privacy & Offline First**: All processing runs client-side. No telemetry, analytics, or background beacons are transmitted.
- **Strict Brand Hygiene**: Under no circumstances should any competitor or reference application names be cited, referenced, or included anywhere in this codebase, tests, commits, pull requests, or documentation.

---

## 2. In-Page DOM CustomEvent Bridge

For browser agents, automation scripts, and Playwright instances operating directly within the page context (without Chrome extension messaging permissions), Better Scholar exposes a bidirectional event bus on `document`.

### Readiness Marker
When Better Scholar finishes mounting on a Google Scholar profile, it tags the root document element:
```javascript
document.documentElement.dataset.betterScholar === "ready";
```

### Event Specifications

#### A. Ping / Health Check
Verify extension presence and get active version:
```javascript
document.dispatchEvent(new CustomEvent("better-scholar:ping", {
  detail: { nonce: "req-1" }
}));

// Better Scholar responds with:
document.addEventListener("better-scholar:pong", (e) => {
  console.log(e.detail); // { ok: true, version: "2.38.0", ready: true, nonce: "req-1" }
});
```

#### B. Request Structured Publications
Retrieve array of all ingested publications with parsed author roles, tiers, and citation metrics:
```javascript
document.dispatchEvent(new CustomEvent("better-scholar:request-papers", {
  detail: { nonce: "req-2" }
}));

document.addEventListener("better-scholar:papers", (e) => {
  console.log(e.detail.papers);
  // [{ id, title, authors, venue, year, citations, role, ccf, core, marks, highlighted }]
});
```

#### C. Request Summary Matrix
Retrieve matrix breakdown by role and rank tier (CCF & CORE):
```javascript
document.dispatchEvent(new CustomEvent("better-scholar:request-summary", {
  detail: { nonce: "req-3" }
}));

document.addEventListener("better-scholar:summary", (e) => {
  console.log(e.detail.summary); // { ccf, core, marks, owner }
});
```

#### D. Request Formatted Citation Exports
Generate on-the-fly formatted exports:
```javascript
document.dispatchEvent(new CustomEvent("better-scholar:request-export", {
  detail: {
    format: "bibtex", // "bibtex" | "apa" | "markdown" | "json" | "csv" | "tsv"
    nonce: "req-4"
  }
}));

document.addEventListener("better-scholar:export", (e) => {
  console.log(e.detail.text); // Formatted string
});
```

#### E. Execute In-Page Filter Query
Programmatically apply multi-facet query expressions:
```javascript
document.dispatchEvent(new CustomEvent("better-scholar:query", {
  detail: { query: "role:first ccf:a >100" }
}));
```

#### F. Clear All Filters
Reset active filters back to default profile view:
```javascript
document.dispatchEvent(new CustomEvent("better-scholar:clear-filters"));
```

---

## 3. Chrome Extension Runtime Messaging API

For extension contexts, background scripts, or DevTools extensions interacting via `chrome.tabs.sendMessage`:

```javascript
// Get profile summary
const summary = await chrome.tabs.sendMessage(tabId, { type: "rr:summary" });

// Get paper array
const papers = await chrome.tabs.sendMessage(tabId, { type: "rr:papers" });

// Export formatted citations
const exportData = await chrome.tabs.sendMessage(tabId, {
  type: "rr:export",
  format: "bibtex" // "bibtex" | "apa" | "markdown" | "csv" | "json" | "tsv"
});

// Set filter parameters
const filterRes = await chrome.tabs.sendMessage(tabId, {
  type: "rr:filter",
  query: "ccf:a",
  minCitations: 50,
  yearStart: 2020,
  yearEnd: 2026,
  onlyHighlighted: true
});
```

---

## 4. Search Operator Syntax

Better Scholar supports boolean tokenized search filters in the interactive panel input:
- `role:first` / `role:cofirst` / `role:second` / `role:last`: Filter by author position.
- `ccf:a` / `ccf:b` / `ccf:c`: Filter by CCF ranking tier.
- `core:a*` / `core:a` / `core:b` / `core:c`: Filter by CORE ranking tier.
- `>500` / `>=100` / `<50`: Citation count thresholds.
- `2020..2024` / `2023`: Publication year or range.
- `has:award` / `has:oral` / `has:talk`: Filter by academic distinction or presentation honors.

---

## 5. Automated Verification Standards

Before proposing or finalizing any code modifications:
1. **Unit Tests**:
   ```bash
   npm test
   ```
   All 416+ core tests in `test/*.test.js` must pass with zero failures.
2. **E2E Playwright Suite**:
   ```bash
   npm run test:e2e
   ```
   All 76 browser end-to-end integration scenarios must pass.
3. **Packaging Check**:
   ```bash
   bash scripts/package-chrome.sh
   ```
   Validates data consistency and packages `dist/better-scholar-chrome-<version>.zip`.
4. **Git Identity**:
   All commits must be made under:
   ```
   Boyu Gou <geminigby@gmail.com>
   ```
