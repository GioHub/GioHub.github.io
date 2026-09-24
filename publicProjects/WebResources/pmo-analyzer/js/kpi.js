/* ============================================================
   KPI — cálculo de métricas ejecutivas, agregaciones para
   gráficos y evaluación del semáforo PMO sobre un set de
   registros ya filtrado.
   ============================================================ */

const KPI = (() => {

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10; // 1 decimal
  }

  function compute(records) {
    const total = records.length;
    const closed = records.filter(r => r.stateBucket === 'closed').length;
    const active = records.filter(r => r.stateBucket === 'active').length;
    const nuevo = records.filter(r => r.stateBucket === 'new').length;
    const other = total - closed - active - nuevo;

    const bugs = records.filter(r => r.isBug);
    const bugsAbiertos = bugs.filter(r => r.stateBucket !== 'closed').length;

    const pctCerrado = pct(closed, total);
    const pctActivo = pct(active, total);
    const pctNuevo = pct(nuevo, total);
    const pctPendiente = pct(total - closed, total);

    const storyPointsTotal = records.reduce((s, r) => s + (r.storyPoints || 0), 0);
    const storyPointsCerrados = records.filter(r => r.stateBucket === 'closed').reduce((s, r) => s + (r.storyPoints || 0), 0);
    const effortTotal = records.reduce((s, r) => s + (r.effort || 0), 0);

    const sinSprint = records.filter(r => r.sprint === CONFIG.noSprintLabel).length;
    const sinCelula = records.filter(r => r.celula === CONFIG.noCelulaLabel).length;
    const sinAsignar = records.filter(r => r.assignedTo === CONFIG.noAssigneeLabel).length;

    return {
      total, closed, active, nuevo, other,
      bugsTotal: bugs.length, bugsAbiertos,
      pctCerrado, pctActivo, pctNuevo, pctPendiente,
      storyPointsTotal, storyPointsCerrados, effortTotal,
      sinSprint, sinCelula, sinAsignar
    };
  }

  function groupBy(records, field) {
    const map = new Map();
    for (const r of records) {
      const key = r[field] || '—';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }

  function topN(pairs, n) {
    return pairs.slice(0, n);
  }

  function semaforo(metrics) {
    if (metrics.total === 0) return { color: 'gris', texto: 'Sin datos para evaluar' };
    if (CONFIG.semaforoRules.rojo(metrics)) return { color: 'rojo', texto: 'Estatus rojo — atención inmediata' };
    if (CONFIG.semaforoRules.amarillo(metrics)) return { color: 'amarillo', texto: 'Estatus amarillo — en observación' };
    return { color: 'verde', texto: 'Estatus verde — dentro de lo esperado' };
  }

  // Diagnósticos automáticos: reglas simples que generan alertas/observaciones.
  function diagnostics(records, metrics) {
    const out = [];

    if (metrics.total === 0) {
      out.push({ level: 'warn', text: 'No hay registros que coincidan con los filtros actuales.' });
      return out;
    }

    if (metrics.bugsAbiertos >= 10) {
      out.push({ level: 'risk', text: `Hay ${metrics.bugsAbiertos} bugs abiertos. Volumen alto de defectos sin resolver.` });
    } else if (metrics.bugsAbiertos >= 5) {
      out.push({ level: 'warn', text: `Hay ${metrics.bugsAbiertos} bugs abiertos. Conviene priorizar su cierre.` });
    } else if (metrics.bugsTotal > 0) {
      out.push({ level: 'ok', text: `Solo ${metrics.bugsAbiertos} bug(s) abierto(s) de ${metrics.bugsTotal} reportado(s).` });
    }

    if (metrics.sinSprint > 0) {
      const p = pct(metrics.sinSprint, metrics.total);
      const level = p >= 30 ? 'warn' : 'ok';
      out.push({ level, text: `${metrics.sinSprint} work item(s) (${p}%) no tienen sprint identificado en Tags.` });
    }

    if (metrics.sinCelula > 0) {
      const p = pct(metrics.sinCelula, metrics.total);
      const level = p >= 30 ? 'warn' : 'ok';
      out.push({ level, text: `${metrics.sinCelula} work item(s) (${p}%) no tienen célula asignada.` });
    }

    if (metrics.sinAsignar > 0) {
      out.push({ level: metrics.sinAsignar > metrics.total * 0.2 ? 'warn' : 'ok', text: `${metrics.sinAsignar} work item(s) sin responsable asignado.` });
    }

    const bySprint = groupBy(records, 'sprint').filter(([k]) => k !== CONFIG.noSprintLabel);
    if (bySprint.length > 1) {
      const [topSprint, topCount] = bySprint[0];
      const p = pct(topCount, metrics.total);
      if (p >= 40) {
        out.push({ level: 'warn', text: `${topSprint} concentra el ${p}% del trabajo visible. Posible cuello de botella de planeación.` });
      }
    }

    if (metrics.pctCerrado >= 80) {
      out.push({ level: 'ok', text: `Avance saludable: ${metrics.pctCerrado}% del alcance filtrado está cerrado o resuelto.` });
    }

    return out;
  }

  return { compute, groupBy, topN, semaforo, diagnostics, pct };
})();
