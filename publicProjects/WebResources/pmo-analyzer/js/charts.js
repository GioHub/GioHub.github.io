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

  function stateColor(bucket) {
    return CONFIG.colors[bucket] || CONFIG.colors.other;
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

  function renderAll(records) {
    const byState = KPI.groupBy(records, 'state');
    const byType = KPI.groupBy(records, 'type');
    const bySprint = KPI.groupBy(records, 'sprint');
    const byCelula = KPI.groupBy(records, 'celula');
    const byTeam = KPI.groupBy(records, 'team');
    const byAssignee = KPI.topN(KPI.groupBy(records, 'assignedTo'), 10);

    doughnutChart('chartEstado', byState, (pair) => {
      const bucket = records.find(r => r.state === pair[0])?.stateBucket || 'other';
      return stateColor(bucket);
    });
    barChart('chartTipo', byType);
    barChart('chartSprint', bySprint);
    barChart('chartCelula', byCelula);
    doughnutChart('chartEquipo', byTeam);
    barChart('chartResponsable', byAssignee);

    return { byState, byType, bySprint, byCelula, byTeam, byAssignee };
  }

  return { renderAll };
})();
