window.createImpactMeters = function createImpactMeters(containerEl) {
  const wrap = document.createElement("div");
  wrap.className = "impact-meters-wrap";

  // Cost grows as context fills (starts empty, fills up — you're spending
  // more). Speed and Quality start full and drain as context fills up, but
  // never bottom out completely — the system still works, just worse.
  const FLOOR = 12;
  const meters = [
    { key: "cost", label: "Cost", color: "var(--accent-2)", curve: (p) => p },
    { key: "speed", label: "Speed", color: "var(--accent-3)", curve: (p) => Math.max(FLOOR, 100 - p) },
    {
      key: "quality",
      label: "Quality",
      color: "#f56565",
      // Stays near-full until the bar is about half full, then drains fast —
      // illustrates signal getting buried under accumulated context.
      curve: (p) => Math.max(FLOOR, 100 - (p <= 50 ? p * 0.2 : Math.min(100, 10 + (p - 50) * 1.8)))
    }
  ];

  const fillEls = {};

  const bar = document.createElement("div");
  bar.className = "terminal-bar";
  bar.innerHTML = "<span></span><span></span><span></span><em>Impact</em>";
  wrap.appendChild(bar);

  const body = document.createElement("div");
  body.className = "impact-meters-body";
  wrap.appendChild(body);

  meters.forEach((m) => {
    const row = document.createElement("div");
    row.className = "impact-meter";

    const labelEl = document.createElement("div");
    labelEl.className = "impact-meter-label";
    labelEl.textContent = m.label;
    row.appendChild(labelEl);

    const track = document.createElement("div");
    track.className = "impact-meter-track";
    const fill = document.createElement("div");
    fill.className = "impact-meter-fill";
    fill.style.background = m.color;
    track.appendChild(fill);
    row.appendChild(track);

    body.appendChild(row);
    fillEls[m.key] = fill;
  });

  containerEl.appendChild(wrap);

  function update(totalPct) {
    meters.forEach((m) => {
      const value = Math.max(0, Math.round(m.curve(totalPct)));
      fillEls[m.key].style.width = value + "%";
    });
  }

  update(0);

  return { update };
};
