/* ============================================================
   RISK ANALYSIS — 5 análisis de riesgo automáticos que
   alimentan tanto el panel de Diagnósticos como el resumen
   ejecutivo ("IA local"). Reglas configurables en CONFIG.risk.
   ============================================================ */

const RiskAnalysis = (() => {

  function bottleneck(teamStats) {
    const { stats, overallAvg } = teamStats;
    if (!stats.length || !overallAvg) return [];
    const threshold = overallAvg * CONFIG.risk.bottleneckFactor;
    const flagged = stats.filter(s => s.avg > threshold && s.count >= 2);
    if (!flagged.length) return [];
    const detail = flagged.map(f => `${f.team} (${f.avg.toFixed(1)} días prom.)`).join(', ');
    return [{
      level: 'risk',
      type: 'bottleneck',
      text: `Riesgo de cuello de botella: ${detail} muestran tiempos de ejecución muy por encima del promedio general (${overallAvg.toFixed(1)} días).`
    }];
  }

  function concentration(records, total, field, labelPrefix, noneLabel) {
    if (!total) return [];
    const groups = KPI.groupBy(records, field).filter(([k]) => k !== noneLabel);
    if (!groups.length) return [];
    const [topKey, topCount] = groups[0];
    const ratio = topCount / total;
    if (ratio < CONFIG.risk.concentrationThreshold) return [];
    return [{
      level: 'warn',
      type: 'concentration',
      text: `Riesgo de concentración: ${Math.round(ratio * 100)}% del backlog visible está concentrado en ${labelPrefix} "${topKey}".`
    }];
  }

  function dueDateRisk(records) {
    const enriched = TimeMetrics.withDates(records);
    const today = DateUtils.today();
    const soonLimit = new Date(today.getTime() + CONFIG.risk.dueSoonDays * 86400000);

    const overdue = enriched.filter(r => r.stateBucket !== 'closed' && r._target && r._target.getTime() < today.getTime());
    const dueSoon = enriched.filter(r => r.stateBucket !== 'closed' && r._target &&
      r._target.getTime() >= today.getTime() && r._target.getTime() <= soonLimit.getTime());

    const out = [];
    if (overdue.length) {
      out.push({
        level: 'risk', type: 'due',
        text: `Riesgo de vencimiento: ${overdue.length} work item(s) tienen Target Date vencido y no están cerrados.`
      });
    }
    if (dueSoon.length) {
      out.push({
        level: 'warn', type: 'due',
        text: `${dueSoon.length} work item(s) vencen en los próximos ${CONFIG.risk.dueSoonDays} días y aún no están cerrados.`
      });
    }
    return out;
  }

  function backlogGrowth(metrics) {
    if (metrics.total === 0) return [];
    if (metrics.closed === 0 && metrics.nuevo >= 3) {
      return [{
        level: 'risk', type: 'growth',
        text: `Riesgo de crecimiento de backlog: hay ${metrics.nuevo} item(s) nuevos y ninguno cerrado en el alcance filtrado.`
      }];
    }
    if (metrics.closed > 0 && metrics.nuevo >= metrics.closed * CONFIG.risk.backlogGrowthRatio && metrics.nuevo >= 3) {
      return [{
        level: 'warn', type: 'growth',
        text: `Riesgo de crecimiento de backlog: los items nuevos (${metrics.nuevo}) superan en más de ${CONFIG.risk.backlogGrowthRatio}x a los cerrados (${metrics.closed}).`
      }];
    }
    return [];
  }

  function quality(metrics) {
    if (metrics.bugsAbiertos >= 10) {
      return [{ level: 'risk', type: 'quality', text: `Riesgo de calidad: ${metrics.bugsAbiertos} bugs abiertos en el alcance filtrado.` }];
    }
    if (metrics.bugsAbiertos >= 5) {
      return [{ level: 'warn', type: 'quality', text: `Riesgo de calidad moderado: ${metrics.bugsAbiertos} bugs abiertos.` }];
    }
    return [];
  }

  function evaluateAll(records, metrics) {
    const teamStats = TimeMetrics.teamDurationStats(records);
    return [
      ...bottleneck(teamStats),
      ...concentration(records, metrics.total, 'celula', 'la célula', CONFIG.noCelulaLabel),
      ...concentration(records, metrics.total, 'proceso', 'el proceso', CONFIG.noProcesoLabel),
      ...dueDateRisk(records),
      ...backlogGrowth(metrics),
      ...quality(metrics)
    ];
  }

  return { evaluateAll, bottleneck, concentration, dueDateRisk, backlogGrowth, quality };
})();
