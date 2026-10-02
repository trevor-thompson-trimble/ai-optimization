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

  let transcriptEl = null;
  const hasTranscriptSegment = config.segments.some((s) => s.transcriptTurns);
  if (hasTranscriptSegment) {
    transcriptEl = document.createElement("div");
    transcriptEl.className = "context-bar-transcript";
    // Not appended here — the caller places it (e.g. below other widgets)
    // via the returned `transcriptEl` reference.
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
    if (seg.transcriptTurns && transcriptEl) {
      const idx = Math.min(s.clicks - 1, seg.transcriptTurns.length - 1);
      const turn = seg.transcriptTurns[idx];
      turn.forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        transcriptEl.appendChild(p);
      });
      transcriptEl.scrollTop = transcriptEl.scrollHeight;
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
  startBtn.textContent = config.startLabel || "Start Conversation";
  controls.appendChild(startBtn);

  const sep = document.createElement("span");
  sep.className = "context-bar-sep";
  sep.textContent = "//";
  controls.appendChild(sep);

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Clear";
  controls.appendChild(resetBtn);

  const compactBtn = document.createElement("button");
  compactBtn.textContent = config.compactLabel || "Compact Context";
  controls.appendChild(compactBtn);

  function playNext() {
    if (playIndex >= steps.length) {
      playing = false;
      startBtn.disabled = false;
      startBtn.textContent = config.startLabel || "Start Conversation";
      return;
    }
    applyStep(steps[playIndex]);
    playIndex++;
    playTimer = setTimeout(playNext, stepDelayMs);
  }

  startBtn.addEventListener("click", () => {
    if (playing) return;
    playing = true;
    startBtn.disabled = true;
    startBtn.textContent = "Playing…";
    playNext();
  });

  function reset() {
    if (playTimer) clearTimeout(playTimer);
    playing = false;
    playIndex = 0;
    startBtn.disabled = false;
    startBtn.textContent = config.startLabel || "Start Conversation";
    config.segments.forEach((seg) => {
      state[seg.key] = { pct: 0, clicks: 0 };
    });
    if (transcriptEl) transcriptEl.innerHTML = "";
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
    if (changed && transcriptEl) {
      transcriptEl.innerHTML = "";
      const p = document.createElement("p");
      p.style.fontStyle = "italic";
      p.textContent = "— context compacted: earlier turns summarized —";
      transcriptEl.appendChild(p);
    }
    if (changed) render();
  }

  compactBtn.addEventListener("click", compact);

  containerEl.appendChild(wrap);
  render();

  return { reset, transcriptEl };
};
