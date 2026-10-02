window.createContextBar = function createContextBar(containerEl, config) {
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
    wrap.appendChild(transcriptEl);
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
  }

  function addClick(seg) {
    const s = state[seg.key];
    const maxClicks = seg.maxClicks || 1;
    if (s.clicks >= maxClicks) return;
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

  config.segments.forEach((seg) => {
    const btn = document.createElement("button");
    btn.textContent = seg.label;
    btn.addEventListener("click", () => addClick(seg));
    controls.appendChild(btn);
  });

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.addEventListener("click", reset);
  controls.appendChild(resetBtn);

  function reset() {
    config.segments.forEach((seg) => {
      state[seg.key] = { pct: 0, clicks: 0 };
    });
    if (transcriptEl) transcriptEl.innerHTML = "";
    render();
  }

  containerEl.appendChild(wrap);
  render();

  return { reset };
};
