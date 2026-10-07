// Context-window widget: a fake Copilot CLI terminal (log pane, vertical context
// bar, and an input bar holding the controls) built into containerEl. Returns { reset }.
window.createContextBar = function createContextBar(containerEl, config) {
  const stepDelayMs = config.stepDelayMs || 1400;
  const state = {};
  config.segments.forEach((seg) => {
    state[seg.key] = { pct: 0, clicks: 0 };
  });

  // ---- context bar (vertical, fills from the bottom) ----
  const wrap = document.createElement("div");
  wrap.className = "context-bar-wrap";

  const readout = document.createElement("div");
  readout.className = "context-bar-readout";
  wrap.appendChild(readout);

  const track = document.createElement("div");
  track.className = "context-bar-track";
  wrap.appendChild(track);


  const segmentEls = {};
  const outerLabelEls = {};
  const labelsRow = document.createElement("div");
  labelsRow.className = "context-bar-outer-labels";
  config.segments.forEach((seg) => {
    const el = document.createElement("div");
    el.className = "context-bar-segment";
    el.style.background = seg.color;
    el.title = seg.tooltip || seg.label;

    const labelSpan = document.createElement("span");
    labelSpan.className = "context-bar-seg-label";
    labelSpan.textContent = seg.label;
    el.appendChild(labelSpan);

    track.appendChild(el);
    segmentEls[seg.key] = el;

    // Segments too narrow for their name get the label below the bar instead.
    const outer = document.createElement("span");
    outer.className = "context-bar-outer-label";
    outer.textContent = seg.label;
    outer.style.color = seg.color;
    outer.hidden = true;
    labelsRow.appendChild(outer);
    outerLabelEls[seg.key] = outer;
  });
  wrap.appendChild(labelsRow);

  // ---- fake CLI terminal: log pane + context bar side by side, input bar below ----
  const term = document.createElement("div");
  term.className = "terminal cb-terminal";
  term.innerHTML =
    '<div class="terminal-bar"><span></span><span></span><span></span><em>PowerShell</em></div>';

  const main = document.createElement("div");
  main.className = "terminal-main";
  const body = document.createElement("div");
  body.className = "terminal-body";
  main.appendChild(body);
  term.appendChild(main);
  term.appendChild(wrap);

  // Input bar holding the controls, like the text box in the real CLI.
  const controls = document.createElement("div");
  controls.className = "terminal-input";
  const hint = document.createElement("span");
  hint.className = "terminal-input-hint";
  hint.innerHTML = '<span class="prompt">&gt;</span>Ask Copilot…';
  controls.appendChild(hint);
  term.appendChild(controls);

  const startBtn = document.createElement("button");
  controls.appendChild(startBtn);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "/clear";
  resetBtn.className = "context-bar-slash-btn";
  controls.appendChild(resetBtn);

  const compactBtn = document.createElement("button");
  compactBtn.textContent = "/compact";
  compactBtn.className = "context-bar-slash-btn";
  controls.appendChild(compactBtn);

  function addRow(html, cls) {
    const row = document.createElement("div");
    if (cls) row.className = cls;
    row.innerHTML = html;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const promptRow = (text) =>
    addRow('<span class="prompt">&gt;</span>' + esc(text));

  function showIdle() {
    body.innerHTML = "";
    addRow('<span class="prompt">PS&gt;</span>copilot<span class="cursor"></span>');
  }

  function showBanner() {
    addRow("GitHub Copilot CLI", "terminal-title");
  }

  // ---- state / rendering ----
  function totalPct() {
    return Object.values(state).reduce((sum, s) => sum + s.pct, 0);
  }

  // Uses target widths (pct), not the animating on-screen width.
  function placeLabels() {
    const trackW = track.clientWidth;
    let offsetPct = 0;
    config.segments.forEach((seg) => {
      const pct = state[seg.key].pct;
      const inner = segmentEls[seg.key].firstChild;
      const narrow = pct > 0 && trackW > 0 && (pct / 100) * trackW < inner.offsetWidth + 8;
      inner.style.visibility = narrow ? "hidden" : "";
      const outer = outerLabelEls[seg.key];
      outer.hidden = !narrow;
      outer.style.left = offsetPct + "%";
      offsetPct += pct;
    });
  }

  function render() {
    const total = Math.min(100, totalPct());
    readout.textContent = "Context window — " + Math.round(total) + "% full";
    config.segments.forEach((seg) => {
      segmentEls[seg.key].style.width = state[seg.key].pct + "%";
    });
    placeLabels();
    const warnThreshold = config.warnThresholdPct || 90;
    config.segments.forEach((seg) => {
      segmentEls[seg.key].classList.toggle("warn", total >= warnThreshold);
    });
    if (typeof config.onUpdate === "function") config.onUpdate(total);
  }

  function logLines(seg) {
    (seg.logLines || []).forEach((l) => addRow("● " + esc(l), "terminal-log"));
  }

  // Returns true if the step actually did something (already-loaded
  // segments are skipped so there is no dead pause after /clear).
  function applyStep(seg) {
    const s = state[seg.key];
    if (s.clicks >= (seg.maxClicks || 1)) return false;
    s.clicks += 1;
    s.pct = Math.min(100, s.pct + seg.incrementPct);
    logLines(seg);
    if (seg.transcriptTurns) {
      const turn = seg.transcriptTurns[Math.min(s.clicks - 1, seg.transcriptTurns.length - 1)];
      turn.forEach((line) => {
        if (line.startsWith("User: ")) promptRow(line.slice(6));
        else addRow("● " + esc(line.replace(/^Assistant: /, "")), "terminal-reply");
      });
    }
    render();
    return true;
  }

  // Flatten segments into an ordered step queue (maxClicks > 1 — e.g.
  // conversation turns — contributes one step per click/turn).
  const steps = [];
  config.segments.forEach((seg) => {
    for (let i = 0; i < (seg.maxClicks || 1); i++) steps.push(seg);
  });

  let playIndex = 0;
  let playing = false;
  let started = false; // the CLI has been launched ("Enter" pressed once)
  let playTimer = null;

  function setLabel() {
    startBtn.textContent = playing
      ? "Pause"
      : playIndex > 0 && playIndex < steps.length
        ? "Resume"
        : started
          ? "New Conversation"
          : "⏎ Enter";
  }

  function finish() {
    playing = false;
    setLabel();
  }

  function playNext() {
    let applied = false;
    while (playIndex < steps.length && !applied) {
      applied = applyStep(steps[playIndex]);
      playIndex++;
    }
    if (!applied || playIndex >= steps.length) return finish();
    playTimer = setTimeout(playNext, stepDelayMs);
  }

  // One button: Enter / Pause / Resume / New Conversation.
  startBtn.addEventListener("click", () => {
    if (playing) {
      clearTimeout(playTimer);
      playing = false;
      setLabel();
      return;
    }
    if (playIndex >= steps.length) reset();
    if (!started) {
      started = true;
      body.innerHTML = "";
      addRow('<span class="prompt">PS&gt;</span>copilot');
      showBanner();
    }
    playing = true;
    setLabel();
    playNext();
  });

  // /clear: wipes the conversation, but a fresh session immediately reloads
  // the baseline (harness, AGENTS.md), so those segments stay filled.
  function reset() {
    if (playTimer) clearTimeout(playTimer);
    playing = false;
    playIndex = 0;
    started = true;
    config.segments.forEach((seg) => {
      if (!seg.persistOnClear) state[seg.key] = { pct: 0, clicks: 0 };
    });
    body.innerHTML = "";
    showBanner();
    config.segments.forEach((seg) => {
      if (seg.persistOnClear) logLines(seg);
    });
    setLabel();
    render();
  }

  resetBtn.addEventListener("click", () => {
    if (!started) return;
    reset();
  });

  // /compact: summarizes the conversation down to a small residual — it
  // helps, but the summary itself still costs context.
  function compact() {
    if (playing) return;
    let changed = false;
    config.segments.forEach((seg) => {
      if (!seg.transcriptTurns && !seg.compactable) return;
      const floor = seg.compactToPct != null ? seg.compactToPct : seg.incrementPct;
      if (state[seg.key].pct > floor) {
        state[seg.key].pct = floor;
        changed = true;
      }
    });
    if (!changed) return;
    promptRow("/compact");
    addRow("● Summarizing history (chat + file reads)…", "terminal-log");
    addRow("✓ Conversation compacted", "terminal-reply");
    render();
    term.classList.add("flash");
    setTimeout(() => term.classList.remove("flash"), 700);
  }

  compactBtn.addEventListener("click", compact);

  // Shortcuts (only on this slide): Space = play/pause, C = /compact, R = /clear.
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !term.closest("section.present")) return;
      const k = e.key.toLowerCase();
      const action = { " ": () => startBtn.click(), c: compact, r: () => resetBtn.click() }[k];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    true
  );

  containerEl.appendChild(term);
  showIdle();
  setLabel();
  render();

  return { reset };
};
