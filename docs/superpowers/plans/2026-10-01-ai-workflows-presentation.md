# AI Workflows Presentation Implementation Plan

> **For agentic workers:** This is a static, visual reveal.js presentation with
> no automated test suite (per spec, validation is manual click-through in a
> browser). Execute tasks in order in a single session; commit after each.

**Goal:** Build a reveal.js-based GitHub Pages presentation covering the AI
context window (interactive bar widget), CLI recommendation, AGENTS.md/
SKILL.md, and MCP servers.

**Architecture:** Single-page reveal.js deck (`index.html`) loading reveal.js
from CDN, a custom dark theme (`css/theme.css`), widget styles
(`css/widgets.css`), and a vanilla JS context-bar widget module
(`js/context-bar.js`) instantiated on two slides with different configs.

**Tech Stack:** reveal.js (CDN), vanilla HTML/CSS/JS, GitHub Pages (root).

**Spec:** `docs/superpowers/specs/2026-10-01-ai-workflows-presentation-design.md`

## Global Constraints

- No build step required — reveal.js loaded via CDN `<script>`/`<link>` tags.
- No backend/server code.
- Dark, professional theme; monospace accents for code/file snippets.
- Context-bar widget values are illustrative, not accurate token math.
- Validation is manual: open `index.html` in a browser and click through.

---

### Task 1: Scaffold the reveal.js deck shell

**Files:**
- Create: `index.html`
- Create: `css/theme.css`

**Interfaces:**
- Produces: `index.html` with a `<div class="reveal"><div class="slides">`
  structure reveal.js initializes against; `css/theme.css` linked after
  reveal.js's base CSS so overrides win.

- [x] **Step 1: Create `index.html` with reveal.js CDN includes and a title slide**
- [x] **Step 2: Create `css/theme.css` with dark professional overrides**
- [x] **Step 3: Verify in a browser**
- [x] **Step 4: Commit**

---

### Task 2: Build the context-bar widget module

**Files:**
- Create: `js/context-bar.js`
- Create: `css/widgets.css`

**Interfaces:**
- Produces: global function `window.createContextBar(containerEl, config)`
  where `config = { capacityLabel: string, segments: [{ key, label, color,
  tooltip, incrementPct, maxClicks? }], warnThresholdPct: number }`. Returns
  an object `{ reset(): void }`.

- [x] **Step 1: Create `css/widgets.css` with bar/segment/button styles**
- [x] **Step 2: Create `js/context-bar.js` with the widget factory**
- [x] **Step 3: Verify module loads without errors**
- [x] **Step 4: Commit**

---

### Task 3: Build the context-window slides (intro + token-limit contrast)

**Files:**
- Modify: `index.html`

- [x] **Step 1: Add script include for the widget**
- [x] **Step 2: Add the context-window intro slide**
- [x] **Step 3: Add the token-limit contrast slide**
- [x] **Step 4: Verify in browser**
- [x] **Step 5: Commit**

---

### Task 4: Add the "Why the CLI" and "Installing the CLI" slides

- [x] Done — see index.html

---

### Task 5: Add AGENTS.md / SKILL.md slides with file-layout example

- [x] Done — see index.html

---

### Task 6: Add the MCP servers slide

- [x] Done — see index.html

---

### Task 7: Enable GitHub Pages hosting

- [x] Create `.nojekyll`
- [ ] Presenter confirms GitHub Settings → Pages source = main /(root) in UI
      (cannot be done via CLI alone for first-time enablement)

## Final Verification

- [x] Opened index.html end-to-end, clicked through every slide and widget
  button including Reset, no console errors.
