# Roadmap

This document outlines the architectural pillars, current state, and strategic development lanes for **Better Scholar**.

---

## 1. Architectural Pillars

- **Pure Functional Core**: All algorithms for venue resolution (`src/lib/venues.js`), author role extraction (`src/lib/names.js`), citation analytics (`src/lib/metrics.js`), and honors parsing (`src/lib/marks.js`) remain zero-dependency, side-effect-free, and execute directly under Node.js (`node --test`).
- **Zero Build / Unpacked Native Loading**: The extension source code in `src/` loads directly into Chromium browsers as an unpacked extension with zero bundling or transpile steps.
- **Offline & Local-First**: No remote servers, user tracking, or telemetry. All parsing and caching remain exclusively within the local browser environment.
- **Agent Interoperability**: First-class programmatic integration via DOM `CustomEvent` bus and Chrome runtime messaging, enabling seamless consumption by autonomous AI agents, scrapers, and developer tools.
- **Universal Accessibility (WCAG 2.1 AA)**: Strictly maintained contrast ratios ($\ge 4.5:1$ for text), keyboard operability, screen reader semantics (`aria-live`, semantic tables), and reduced-motion compliance across 30 supported languages.

---

## 2. Recent Milestones (v2.38.0)

- [x] **Search Operator Autocomplete & Suggestion Popover**: Real-time accessible popover for query prefixes (`role:`, `ccf:`, `core:`, `>`, `has:`) with arrow navigation, cursor insertion, and category badges.
- [x] **Action Bar Micro Vector SVG Icons**: Replaced plain text buttons with vector icons and emerald flash transition feedback.
- [x] **Toolbar Popup Feature Parity**: Added RFC-4180 CSV export alongside BibTeX, APA 7th, Markdown, JSON, and TSV in the browser popup.
- [x] **Academic Theme Studio**: Live palette editor with instant WCAG 2.1 AA contrast validation and customizable role highlight styles.
- [x] **Profile Cache Inspector**: Direct inspection and management of cached paper details in the settings interface.
- [x] **Multi-language Expansion**: Complete UI and documentation parity across 30 languages.

---

## 3. Upcoming Lanes & Future Work

### Lane A: Algorithmic Resolution & Data Freshness
- [ ] **Automated CCF & CORE Dataset Syncing**: Continuous CI probe to verify and sync with upstream official conference and journal ranking updates.
- [ ] **Advanced Name Disambiguation Heuristics**: Expanded handling of composite, hyphenated, and multilingual author name conventions (e.g., Iberian, Nordic, East Asian Latinizations).
- [ ] **Extended Citation Formats**: Add support for IEEE citation format and ACM reference format alongside existing APA 7th and BibTeX exporters.

### Lane B: UI/UX & Interaction Polish
- [ ] **Interactive Keyboard Shortcuts Overlay**: In-panel modal displaying all shortcut keys (`/`, `Esc`, `Tab`, `Enter`, `↑`/`↓`) with visual keycaps.
- [ ] **Custom Ranking Weighting / Metric Presets**: User-configurable formulas for customized departmental evaluation criteria.
- [ ] **Quick Compare Mode**: Side-by-side author role comparison across multiple co-authors.

### Lane C: Agent Bridge & Developer Tooling
- [ ] **MCP (Model Context Protocol) Server Integration**: Native MCP server wrapper allowing LLMs (Claude, Gemini, ChatGPT) to interact with Better Scholar sessions.
- [ ] **Playwright Test Matrix Expansion**: Automated visual regression testing across different operating system display scalings and browser engines.
