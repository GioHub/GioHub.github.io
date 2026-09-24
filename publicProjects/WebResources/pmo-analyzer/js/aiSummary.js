/* ============================================================
   AI SUMMARY — "IA local": no hay modelo ni llamada externa.
   Es un motor de reglas + plantillas de texto que compone un
   resumen ejecutivo a partir de los KPIs ya calculados.
   Se re-evalúa cada vez que cambian los filtros.
   ============================================================ */

const AISummary = (() => {

  function describeScope(activeFilters) {
    const parts = [];
    for (const [label, values] of Object.entries(activeFilters)) {
      if (values && values.length) parts.push(`${label}: ${values.join(', ')}`);
    }
    return parts.length ? `Análisis filtrado por ${parts.join(' · ')}.` : 'Análisis sobre el total del proyecto (sin filtros aplicados).';
  }

  function topLabel(pairs, noneLabel) {
    const real = pairs.filter(([k]) => k !== noneLabel);
    return real.length ? real[0] : null;
  }

  function generate(records, metrics, aggregates, activeFilters) {
    if (metrics.total === 0) {
      return 'No hay work items que coincidan con los filtros seleccionados. Ajusta los filtros para generar el resumen ejecutivo.';
    }

    const sentences = [];

    sentences.push(
      `Del total analizado (${metrics.total} work items), el ${metrics.pctCerrado}% se encuentra cerrado o resuelto, ` +
      `${metrics.pctActivo}% está activo y ${metrics.pctNuevo}% permanece como nuevo.`
    );

    const topSprint = topLabel(aggregates.bySprint, CONFIG.noSprintLabel);
    if (topSprint) {
      const p = KPI.pct(topSprint[1], metrics.total);
      sentences.push(`La principal carga operativa se concentra en ${topSprint[0]} (${p}% del trabajo visible).`);
    }

    const topCelula = topLabel(aggregates.byCelula, CONFIG.noCelulaLabel);
    if (topCelula) {
      const p = KPI.pct(topCelula[1], metrics.total);
      sentences.push(`${topCelula[0]} representa la mayor capacidad asignada, con ${p}% de los items.`);
    }

    if (metrics.bugsTotal > 0) {
      sentences.push(
        metrics.bugsAbiertos > 0
          ? `Existen ${metrics.bugsAbiertos} defecto(s) abierto(s) de ${metrics.bugsTotal} reportado(s).`
          : `No hay defectos abiertos actualmente (${metrics.bugsTotal} reportados en total).`
      );
    }

    if (metrics.sinSprint > 0 || metrics.sinCelula > 0) {
      const notas = [];
      if (metrics.sinSprint > 0) notas.push(`${metrics.sinSprint} sin sprint`);
      if (metrics.sinCelula > 0) notas.push(`${metrics.sinCelula} sin célula`);
      sentences.push(`Hay ${notas.join(' y ')} identificable(s) en Tags, lo que puede afectar la trazabilidad de la planeación.`);
    }

    const sem = KPI.semaforo(metrics);
    sentences.push(`Con base en los indicadores PMO, el proyecto presenta estatus ${sem.color}.`);

    return `${describeScope(activeFilters)} ${sentences.join(' ')}`;
  }

  return { generate };
})();
