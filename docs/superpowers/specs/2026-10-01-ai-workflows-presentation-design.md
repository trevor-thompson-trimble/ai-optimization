# AI Workflows Presentation — Design Spec

## Purpose

An internal presentation for software engineer coworkers introducing AI-assisted
workflows (context windows, CLI agents, AGENTS.md/SKILL.md, MCP servers). The
presenter has deep subject knowledge and will narrate live; slides exist to
anchor attention and demonstrate concepts visually, not to carry the
explanation in text. Hosted as a static site on GitHub Pages so it's linkable
and viewable without local setup.

## Audience & delivery context

- Audience: software engineers at the company, phasing in AI workflows.
- Delivered live, presenter-driven (not self-paced reading).
- Minimal on-slide text; visuals and interactivity do the explaining while the
  presenter talks.
- Topic list may grow (examples of AGENTS.md/SKILL.md file layout, example
  written skills, etc.) — slide count is not fixed.

## Tech stack & hosting

- **reveal.js** (vendored via CDN or npm build) as the deck framework — classic
  slide-deck navigation (arrow keys / click / on-screen controls), speaker
  notes support, widely recognized "conference talk" look.
- Custom reveal.js theme: dark slate background, single accent color, a
  monospace font for code/file-name snippets, since the audience is engineers.
- Interactive widgets (e.g. the context-window bar) are plain HTML/CSS/JS
  embedded directly inside their `<section>` — no extra charting/animation
  library, so they're easy to tweak before the talk.
- Hosting: GitHub Pages built from this repo. Static output only — no backend,
  no build step that can't run in CI (or no build step at all if we use the
  reveal.js CDN build).

## Repository layout

```
/ (repo root)
  index.html              # reveal.js deck shell, slide <section>s
  /css
    theme.css              # custom reveal.js theme overrides
    widgets.css            # styles for interactive widgets (context bar, etc.)
  /js
    context-bar.js          # context-window widget logic
    (future widget scripts as needed)
  /assets                  # any images/diagrams
  docs/superpowers/specs/  # design specs (this file)
```

GitHub Pages will be configured to serve from the repo root (or `/docs` if
preferred at setup time — root is simpler since `index.html` is the deck
itself and `docs/` is reserved for specs).

## Slide plan (v1 scope — more slides may be appended later)

1. **Title / agenda**
2. **Context window intro** — interactive stacked bar: buttons for Harness,
   Repo Context, Conversation (see widget spec below)
3. **Context window vs. token limit** — contrasts the filled bar (working
   slice) against a separate, larger "token limit" bar (total budget)
4. **Why the CLI** — closer file access, lighter harness, skills/agent files
   not abstracted away
5. **Installing the CLI** — presenter walks through install steps live/on
   screen
6. **AGENTS.md & SKILL.md** — what they are, example file content/layout
7. **Creating your own skills** — example skill walkthrough
8. **Finding/using skills online** — pointers to existing skill repositories
9. **Useful MCP servers**

Additional topics (prompting best practices, context engineering, guardrails,
cost/token economics, multi-agent delegation, security, team workflow
integration) are **deferred** — the presenter will discuss with the assistant
separately before deciding which to fold in. This spec covers only the
confirmed topics above; adding topics later is an incremental slide addition,
not a redesign.

## Context-window widget — detailed behavior

A single horizontal bar represents total context-window capacity (labeled
with a placeholder figure, e.g. "128K tokens" — illustrative, not required to
be accurate).

- **Segments** (stack left→right, each starts at 0 width, animates via CSS
  transition when triggered):
  1. **Harness** (slate blue) — triggered by "Load Harness" button; shows a
     tooltip/label like "system prompt, tool defs, instructions".
  2. **Repo Context** (teal) — triggered by "Add Repo Context" button.
  3. **Conversation** (amber) — triggered by "Simulate Conversation" button;
     this button is clickable multiple times, each click adds a small
     increment to the segment's width **and** appends a fake chat line to a
     small transcript box beneath the bar, so the presenter can click a few
     times while narrating a fake back-and-forth.
- **Near-full warning**: once total fill reaches ~90%, the bar (or the
  newest-filled segment) flashes briefly to visually flag "context getting
  full," setting up a verbal explanation of compaction/truncation. No further
  mechanics required (no actual compaction simulation in v1).
- **Live readout**: a small percentage/label (e.g. "62% full") updates as
  segments grow.
- **Reset button**: restores all segments to 0 and clears the fake transcript,
  so the presenter can re-run the demo.
- **Token-limit contrast slide**: reuses the same bar component in a
  small/full visual state, placed beside a second, much longer/empty bar
  labeled "Token Limit (total conversation budget)" to visually convey that
  the context window is the active working slice while the token limit is the
  overall session ceiling.

Implementation notes:
- Widths driven by simple JS state (percentages per segment) + CSS
  `transition: width`.
- No external animation/chart library — flexbox + transitions are sufficient
  and keep the file easy to edit.
- Component should be reusable enough to drop into both the intro slide and
  the token-limit contrast slide without duplicating logic (one JS module,
  instantiated per slide with different config/labels).

## Visual style

- Dark, professional theme (dark slate background, single accent color,
  monospace accents) — reveal.js default "black" theme as a starting point,
  overridden via `theme.css`.
- Minimal text on slides; code/file-name snippets in monospace; diagrams/bars
  are the primary visual content.
- Exact colors/spacing are expected to be refined after v1 is working — "get
  something that works" is the v1 bar, polish comes later.

## Out of scope for v1

- Exact token-count accuracy in the widget (illustrative only).
- Backend/server-side functionality of any kind.
- Additional topics not yet confirmed by the presenter (see deferred list
  above).
- Automated tests (this is a static visual presentation; manual
  click-through verification in a browser is the validation method).

## Validation approach

- Open `index.html` locally (or via a simple static server) and click through
  all slides and widget buttons to confirm: segments animate, transcript
  lines append, warning flash triggers near 90%, reset restores initial
  state, token-limit contrast slide renders both bars correctly.
- Confirm the deck is deployable as-is to GitHub Pages (no build step
  required, or a documented build step if one is introduced later).
