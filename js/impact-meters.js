window.createImpactMeters = function createImpactMeters(containerEl) {
  const wrap = document.createElement("div");
  wrap.className = "impact-meters-wrap";

  const meters = [
    { key: "cost", label: "Cost", color: "var(--accent-2)", curve: (p) => p },
    { key: "latency", label: "Latency", color: "var(--accent-3)", curve: (p) => p },
    {
      key: "quality",
      label: "Quality Loss",
      color: "#f56565",
      // Stays low until the bar is about half full, then accelerates —
      // illustrates signal getting buried under accumulated context.
      curve: (p) => (p <= 50 ? p * 0.2 : Math.min(100, 10 + (p - 50) * 1.8))
    }
  ];

  const fillEls = {};
  const valueEls = {};

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

    const valueEl = document.createElement("div");
    valueEl.className = "impact-meter-value";
    valueEl.textContent = "0%";
    row.appendChild(valueEl);

    wrap.appendChild(row);
    fillEls[m.key] = fill;
    valueEls[m.key] = valueEl;
  });

  containerEl.appendChild(wrap);

  function update(totalPct) {
    meters.forEach((m) => {
      const value = Math.round(m.curve(totalPct));
      fillEls[m.key].style.width = value + "%";
      valueEls[m.key].textContent = value + "%";
    });
  }

  update(0);

  return { update };
};
