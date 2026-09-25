/* ============================================================
   CHARTS — construye/actualiza los canvas con Chart.js a partir
   de agregaciones dinámicas (no hay catálogos fijos de tipos,
   estados, sprints, células ni equipos).
   ============================================================ */

const Charts = (() => {

  const instances = {};

  function colorFor(index) {
    return CONFIG.colors.palette[index % CONFIG.colors.palette.length];
  }

  // Asigna un color distinguible por CADA estado real (no solo por
  // macro-categoría), variando matiz/saturación/luminosidad dentro de
  // la familia de color de su bucket (closed/active/new/other), para
  // que "Closed" y "Resolved" (ambos "closed") no se vean idénticos.
  function buildStatePalette(states) {
    const bucketHues = CONFIG.colors.stateBucketHue;
    const counters = {};
    const map = {};
    states.forEach(state => {
      const bucket = Parser.classifyState(state);
      const baseHue = bucketHues[bucket] ?? 0;
      const i = counters[bucket] || 0;
      counters[bucket] = i + 1;
      const hue = (baseHue + ((i * 27) % 50) - 20 + 360) % 360;
      const saturation = 55 + ((i * 13) % 25);
      const lightness = 40 + ((i * 11) % 28);
      map[state] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    });
    return map;
  }

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function barChart(canvasId, pairs, colorFn) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: pairs.map(p => p[0]),
        datasets: [{
          data: pairs.map(p => p[1]),
          backgroundColor: pairs.map((p, i) => colorFn ? colorFn(p, i) : colorFor(i)),
          borderRadius: 4,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: false, maxRotation: 40, minRotation: 0, font: { size: 10.5 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  function doughnutChart(canvasId, pairs, colorFn) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: pairs.map(p => p[0]),
        datasets: [{
          data: pairs.map(p => p[1]),
          backgroundColor: pairs.map((p, i) => colorFn ? colorFn(p, i) : colorFor(i)),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 11, font: { size: 10.5 } } }
        }
      }
    });
  }

  function lineChart(canvasId, labels, datasets) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId).getContext('2d');
    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10.5 } } } },
        scales: {
          x: { ticks: { maxRotation: 40, font: { size: 9.5 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  function renderAll(records) {
    const byState = KPI.groupBy(records, 'state');
    const byType = KPI.groupBy(records, 'type');
    const bySprint = KPI.groupBy(records, 'sprint');
    const byCelula = KPI.groupBy(records, 'celula');
    const byTeam = KPI.groupBy(records, 'team');
    const byAssignee = KPI.topN(KPI.groupBy(records, 'assignedTo'), 10);

    const statePalette = buildStatePalette(byState.map(p => p[0]));
    doughnutChart('chartEstado', byState, (pair) => statePalette[pair[0]]);
    barChart('chartTipo', byType);
    barChart('chartSprint', bySprint);
    barChart('chartCelula', byCelula);
    doughnutChart('chartEquipo', byTeam);
    barChart('chartResponsable', byAssignee);

    return { byState, byType, bySprint, byCelula, byTeam, byAssignee };
  }

  function renderTimeCharts(records) {
    const tm = TimeMetrics.burndownAndBurnup(records);
    if (!tm.labels.length) {
      destroy('chartBurndown');
      destroy('chartBurnup');
      return { empty: true };
    }

    lineChart('chartBurndown', tm.labels, [
      { label: 'Pendiente', data: tm.remaining, borderColor: '#D14343', backgroundColor: 'rgba(209,67,67,.12)', tension: .25, fill: true }
    ]);

    lineChart('chartBurnup', tm.labels, [
      { label: 'Completado acumulado', data: tm.completedCum, borderColor: '#1E9E6B', backgroundColor: 'rgba(30,158,107,.12)', tension: .25, fill: true },
      { label: 'Alcance conocido', data: tm.scopeCum, borderColor: '#2F5DD4', backgroundColor: 'rgba(47,93,212,.06)', tension: .25, fill: true, borderDash: [6, 4] }
    ]);

    return { empty: false, total: tm.total };
  }

  return { renderAll, renderTimeCharts, buildStatePalette };
})();
