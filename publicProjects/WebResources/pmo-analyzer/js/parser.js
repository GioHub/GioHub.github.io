/* ============================================================
   PARSER — CSV crudo -> registros normalizados en memoria.
   Nada de esto toca la red: PapaParse lee el File del input
   directamente desde el disco del usuario, en el navegador.
   ============================================================ */

const Parser = (() => {

  function normalizeHeader(h) {
    return String(h || '')
      .trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quita acentos
  }

  // Construye un mapa { campoInterno: nombreColumnaRealEnCSV }
  function buildColumnMap(headers) {
    const normalized = headers.map(h => ({ raw: h, norm: normalizeHeader(h) }));
    const map = {};
    for (const [field, def] of Object.entries(CONFIG.columns)) {
      const found = normalized.find(h => def.keys.includes(h.norm));
      if (found) map[field] = found.raw;
    }
    return map;
  }

  function extractFromTags(tags, pattern, labelFn, noneLabel) {
    if (!tags) return noneLabel;
    const parts = String(tags).split(/[;,]/).map(t => t.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(pattern);
      if (match) return labelFn(match[1]);
    }
    return noneLabel;
  }

  function classifyState(state) {
    const norm = normalizeHeader(state);
    for (const [bucket, keywords] of Object.entries(CONFIG.stateClassification)) {
      if (keywords.some(k => norm.includes(k))) return bucket;
    }
    return 'other';
  }

  function isBugType(type) {
    const norm = normalizeHeader(type);
    return CONFIG.bugTypeKeywords.some(k => norm.includes(k));
  }

  function parseFile(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        encoding: 'UTF-8',
        complete: (results) => {
          try {
            const headers = results.meta.fields || [];
            if (!headers.length) {
              reject(new Error('El archivo no tiene encabezados legibles.'));
              return;
            }
            const colMap = buildColumnMap(headers);

            if (!colMap.id && !colMap.type && !colMap.state) {
              reject(new Error('No se reconocieron columnas clave (ID, Work Item Type, State). Verifica que el CSV provenga de una exportación de Azure DevOps.'));
              return;
            }

            const records = results.data
              .filter(row => Object.values(row).some(v => v !== null && v !== '' && v !== undefined))
              .map((row, idx) => buildRecord(row, colMap, idx));

            resolve({ records, colMap, rawHeaders: headers, warnings: results.errors });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  function get(row, colMap, field, fallback = '') {
    const col = colMap[field];
    if (!col) return fallback;
    const v = row[col];
    return (v === undefined || v === null) ? fallback : String(v).trim();
  }

  function buildRecord(row, colMap, idx) {
    const tags = get(row, colMap, 'tags', '');
    const state = get(row, colMap, 'state', 'Sin estado');
    const type = get(row, colMap, 'type', 'Sin tipo');
    const team = get(row, colMap, 'team', '') || CONFIG.noTeamLabel;
    const assignedTo = get(row, colMap, 'assignedTo', '') || CONFIG.noAssigneeLabel;

    const sprint = extractFromTags(tags, CONFIG.sprintPattern, CONFIG.sprintLabel, CONFIG.noSprintLabel);
    const celula = extractFromTags(tags, CONFIG.celulaPattern, CONFIG.celulaLabel, CONFIG.noCelulaLabel);

    const storyPointsRaw = get(row, colMap, 'storyPoints', '');
    const effortRaw = get(row, colMap, 'effort', '');

    return {
      _rowIndex: idx,
      id: get(row, colMap, 'id', String(idx + 1)),
      type,
      state,
      stateBucket: classifyState(state),
      isBug: isBugType(type),
      assignedTo,
      tags,
      sprint,
      celula,
      areaPath: get(row, colMap, 'areaPath', ''),
      iterationPath: get(row, colMap, 'iterationPath', ''),
      team,
      storyPoints: storyPointsRaw === '' ? null : Number(storyPointsRaw) || 0,
      effort: effortRaw === '' ? null : Number(effortRaw) || 0,
      parent: get(row, colMap, 'parent', ''),
      createdDate: get(row, colMap, 'createdDate', ''),
      changedDate: get(row, colMap, 'changedDate', ''),
      priority: get(row, colMap, 'priority', ''),
      severity: get(row, colMap, 'severity', ''),
      title: get(row, colMap, 'title', '')
    };
  }

  // Catálogos dinámicos a partir de los registros ya parseados.
  function buildCatalogs(records) {
    const uniqueSorted = (arr) => [...new Set(arr.filter(v => v !== undefined && v !== null && v !== ''))].sort((a, b) => String(a).localeCompare(String(b), 'es'));

    return {
      types: uniqueSorted(records.map(r => r.type)),
      states: uniqueSorted(records.map(r => r.state)),
      sprints: uniqueSorted(records.map(r => r.sprint)),
      celulas: uniqueSorted(records.map(r => r.celula)),
      teams: uniqueSorted(records.map(r => r.team)),
      assignees: uniqueSorted(records.map(r => r.assignedTo))
    };
  }

  return { parseFile, buildCatalogs, classifyState, isBugType, normalizeHeader };
})();
