window.createContextBar = function createContextBar(containerEl, config) {
  const stepDelayMs = config.stepDelayMs || 1200;
  const state = {};
  config.segments.forEach((seg) => {
    state[seg.key] = { pct: 0, clicks: 0 };
  });

  const wrap = document.createElement("div");
  wrap.className = "context-bar-wrap";

  const label = document.createElement("div");
  label.className = "context-bar-readout";
  label.textContent = config.capacityLabel + " — 0% full";
  wrap.appendChild(label);

  const track = document.createElement("div");
  track.className = "context-bar-track";
  wrap.appendChild(track);

  const segmentEls = {};
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
  });

  const controls = document.createElement("div");
  controls.className = "context-bar-controls";
  wrap.appendChild(controls);

  let transcriptEl = null; // outer terminal window, placed by the caller
  let transcriptBody = null; // where lines are appended
  const hasTranscriptSegment = config.segments.some((s) => s.transcriptTurns);
  if (hasTranscriptSegment) {
    transcriptEl = document.createElement("div");
    transcriptEl.className = "terminal context-bar-transcript";
    transcriptEl.innerHTML =
      '<div class="terminal-bar"><span></span><span></span><span></span><em>copilot</em></div>';
    transcriptBody = document.createElement("div");
    transcriptBody.className = "terminal-body";
    transcriptEl.appendChild(transcriptBody);
  }

  function totalPct() {
    return Object.values(state).reduce((sum, s) => sum + s.pct, 0);
  }

  function render() {
    const total = Math.min(100, totalPct());
    label.textContent = config.capacityLabel + " — " + Math.round(total) + "% full";
    config.segments.forEach((seg) => {
      segmentEls[seg.key].style.width = state[seg.key].pct + "%";
    });
    const warnThreshold = config.warnThresholdPct || 90;
    config.segments.forEach((seg) => {
      segmentEls[seg.key].classList.toggle("warn", total >= warnThreshold);
    });
    if (typeof config.onUpdate === "function") {
      config.onUpdate(total);
    }
  }

  function applyStep(seg) {
    const s = state[seg.key];
    const maxSteps = seg.maxClicks || 1;
    if (s.clicks >= maxSteps) return;
    s.clicks += 1;
    s.pct = Math.min(100, s.pct + seg.incrementPct);
    if (seg.transcriptTurns && transcriptBody) {
      const idx = Math.min(s.clicks - 1, seg.transcriptTurns.length - 1);
      const turn = seg.transcriptTurns[idx];
      turn.forEach((line) => {
        const row = document.createElement("div");
        if (line.startsWith("User: ")) {
          row.innerHTML = '<span class="prompt">&gt;</span> ';
          row.appendChild(document.createTextNode(line.slice(6)));
        } else {
          row.className = "terminal-reply";
          row.textContent = line.replace(/^Assistant: /, "");
        }
        transcriptBody.appendChild(row);
      });
      transcriptBody.scrollTop = transcriptBody.scrollHeight;
    }
    render();
  }

  // Flatten segments into an ordered step queue (a segment with maxClicks > 1
  // — e.g. conversation turns — contributes one step per click/turn).
  const steps = [];
  config.segments.forEach((seg) => {
    const n = seg.maxClicks || 1;
    for (let i = 0; i < n; i++) steps.push(seg);
  });

  let playIndex = 0;
  let playing = false;
  let playTimer = null;

  const startBtn = document.createElement("button");
  startBtn.textContent = config.startLabel || "New Conversation";
  controls.appendChild(startBtn);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "/clear";
  resetBtn.className = "context-bar-slash-btn";
  controls.appendChild(resetBtn);

  const compactBtn = document.createElement("button");
  compactBtn.textContent = "/compact";
  compactBtn.className = "context-bar-slash-btn";
  controls.appendChild(compactBtn);

  function playNext() {
    if (playIndex >= steps.length) {
      playing = false;
      startBtn.textContent = config.startLabel || "New Conversation";
      return;
    }
    applyStep(steps[playIndex]);
    playIndex++;
    playTimer = setTimeout(playNext, stepDelayMs);
  }

  // One button: start / pause / resume (restarts cleanly after a finished run).
  startBtn.addEventListener("click", () => {
    if (playing) {
      clearTimeout(playTimer);
      playing = false;
      startBtn.textContent = "Resume";
      return;
    }
    if (playIndex >= steps.length) reset();
    playing = true;
    startBtn.textContent = "Pause";
    playNext();
  });

  function reset() {
    if (playTimer) clearTimeout(playTimer);
    playing = false;
    playIndex = 0;
    startBtn.disabled = false;
    startBtn.textContent = config.startLabel || "New Conversation";
    config.segments.forEach((seg) => {
      // Segments marked persistOnClear (e.g. the harness, AGENTS.md) stay
      // loaded — a new conversation still starts with that baseline context
      // already in place, it isn't re-earned from zero.
      if (!seg.persistOnClear) {
        state[seg.key] = { pct: 0, clicks: 0 };
      }
    });
    if (transcriptBody) transcriptBody.innerHTML = "";
    render();
  }

  resetBtn.addEventListener("click", reset);

  // Compaction summarizes accumulated conversation turns down to a small
  // residual footprint — it helps, but doesn't erase the cost entirely
  // (summarizing still takes some context, and nothing is ever perfectly free).
  function compact() {
    if (playing) return;
    let changed = false;
    config.segments.forEach((seg) => {
      if (seg.transcriptTurns) {
        const floor = seg.compactToPct != null ? seg.compactToPct : seg.incrementPct;
        if (state[seg.key].pct > floor) {
          state[seg.key].pct = floor;
          changed = true;
        }
      }
    });
    if (changed && transcriptBody) {
      transcriptBody.innerHTML = "";
      const row = document.createElement("div");
      row.className = "terminal-reply";
      row.style.fontStyle = "italic";
      row.textContent = "— context compacted: earlier turns summarized —";
      transcriptBody.appendChild(row);
    }
    if (changed) render();
  }

  compactBtn.addEventListener("click", compact);

  containerEl.appendChild(wrap);
  render();

  return { reset, transcriptEl };
};
