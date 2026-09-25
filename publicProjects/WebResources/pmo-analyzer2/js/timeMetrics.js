/* ============================================================
   TIME METRICS — cálculos basados en Start/Finish/Target Date:
   duración promedio/mediana/min/max por equipo, y series de
   burndown/burnup aproximadas a partir del snapshot del CSV.

   IMPORTANTE: un export CSV es una "foto" del estado actual, no
   una serie histórica día a día. El burndown/burnup que se
   construye aquí es una aproximación razonable basada en las
   fechas disponibles (Start/Finish/Target/Changed), útil para
   ver tendencia, no un tracking histórico exacto.
   ============================================================ */

const TimeMetrics = (() => {

  function withDates(records) {
    return records.map(r => ({
      ...r,
      _start: DateUtils.parseDate(r.startDate) || DateUtils.parseDate(r.createdDate),
      _finish: DateUtils.parseDate(r.finishDate),
      _target: DateUtils.parseDate(r.targetDate),
      _changed: DateUtils.parseDate(r.changedDate)
    }));
  }

  function completionDateOf(enrichedRecord) {
    if (enrichedRecord.stateBucket !== 'closed') return null;
    return enrichedRecord._finish || enrichedRecord._changed || null;
  }

  function teamDurationStats(records) {
    const enriched = withDates(records);
    const byTeam = new Map();

    enriched.forEach(r => {
      if (r._start && r._finish && r._finish.getTime() >= r._start.getTime()) {
        const dur = DateUtils.daysBetween(r._start, r._finish);
        if (!byTeam.has(r.team)) byTeam.set(r.team, []);
        byTeam.get(r.team).push(dur);
      }
    });

    const stats = [];
    for (const [team, durations] of byTeam.entries()) {
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = sorted.reduce((s, v) => s + v, 0);
      const avg = sum / sorted.length;
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      stats.push({ team, count: sorted.length, avg, median, min: sorted[0], max: sorted[sorted.length - 1] });
    }
    stats.sort((a, b) => b.avg - a.avg);

    const totalItems = stats.reduce((s, t) => s + t.count, 0);
    const overallAvg = totalItems ? stats.reduce((s, t) => s + t.avg * t.count, 0) / totalItems : 0;

    return { stats, overallAvg, totalItems };
  }

  // Serie aproximada de burndown (pendiente) y burnup (completado acumulado
  // vs. alcance conocido), agrupada en buckets de `bucketDays` días.
  function burndownAndBurnup(records, bucketDays = 7) {
    const enriched = withDates(records).filter(r => r._start || r._target || r._finish);
    const empty = { labels: [], remaining: [], completedCum: [], scopeCum: [], total: 0 };
    if (!enriched.length) return empty;

    const starts = enriched.map(r => r._start).filter(Boolean);
    const targets = enriched.map(r => r._target).filter(Boolean);
    const completions = enriched.map(completionDateOf).filter(Boolean);
    const allDates = [...starts, ...targets, ...completions];
    if (!allDates.length) return empty;

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime()), DateUtils.today().getTime()));

    const points = [];
    let cursor = new Date(minDate);
    while (cursor.getTime() <= maxDate.getTime()) {
      points.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + bucketDays * 86400000);
    }
    if (!points.length || points[points.length - 1].getTime() !== maxDate.getTime()) points.push(maxDate);

    const total = enriched.length;
    const labels = [];
    const remaining = [];
    const completedCum = [];
    const scopeCum = [];

    points.forEach(p => {
      const completedByP = enriched.filter(r => { const c = completionDateOf(r); return c && c.getTime() <= p.getTime(); }).length;
      const scopeByP = enriched.filter(r => r._start && r._start.getTime() <= p.getTime()).length;
      completedCum.push(completedByP);
      remaining.push(total - completedByP);
      scopeCum.push(Math.max(scopeByP, completedByP));
      labels.push(DateUtils.formatISO(p));
    });

    return { labels, remaining, completedCum, scopeCum, total };
  }

  return { withDates, completionDateOf, teamDurationStats, burndownAndBurnup };
})();
