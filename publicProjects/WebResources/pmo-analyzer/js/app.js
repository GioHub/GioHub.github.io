/* ============================================================
   APP — punto de entrada. Conecta carga de archivo, parser,
   filtros, KPIs, gráficos, tabla y resumen ejecutivo.
   Todo el estado vive en memoria; no hay persistencia.
   ============================================================ */

(() => {
  let ALL_RECORDS = [];
  let CATALOGS = {};

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const btnBrowse = document.getElementById('btnBrowse');
  const btnReset = document.getElementById('btnReset');
  const uploadError = document.getElementById('uploadError');
  const fileStatus = document.getElementById('fileStatus');
  const uploadScreen = document.getElementById('uploadScreen');
  const dashboard = document.getElementById('dashboard');

  // ---------- Carga de archivo ----------
  btnBrowse.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('click', (e) => { if (e.target === btnBrowse) return; fileInput.click(); });

  ['dragenter', 'dragover'].forEach(evt =>
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); })
  );
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  btnReset.addEventListener('click', () => {
    ALL_RECORDS = [];
    CATALOGS = {};
    fileInput.value = '';
    dashboard.hidden = true;
    uploadScreen.hidden = false;
    btnReset.hidden = true;
    fileStatus.textContent = 'Sin archivo cargado';
  });

  function showError(msg) {
    uploadError.textContent = msg;
    uploadError.hidden = false;
  }
  function clearError() {
    uploadError.hidden = true;
    uploadError.textContent = '';
  }

  async function handleFile(file) {
    clearError();
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      showError('El archivo debe tener extensión .csv (export de Azure DevOps).');
      return;
    }
    try {
      const { records, warnings } = await Parser.parseFile(file);
      if (!records.length) {
        showError('El archivo no contiene registros procesables.');
        return;
      }
      ALL_RECORDS = records;
      CATALOGS = Parser.buildCatalogs(records);

      fileStatus.textContent = `${file.name} · ${records.length} registros`;
      uploadScreen.hidden = true;
      dashboard.hidden = false;
      btnReset.hidden = false;

      Filters.init(CATALOGS, onFiltersChanged);
      renderAll();

      if (warnings && warnings.length) {
        console.warn('Advertencias al parsear CSV:', warnings);
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'No fue posible leer el archivo. Verifica que sea un CSV válido.');
    }
  }

  document.getElementById('btnClearFilters').addEventListener('click', () => Filters.clear());

  function onFiltersChanged() {
    renderAll();
  }

  // ---------- Render principal ----------
  function renderAll() {
    const filtered = Filters.apply(ALL_RECORDS);
    const metrics = KPI.compute(filtered);

    renderKPIs(metrics);
    renderSemaforo(metrics);
    const aggregates = Charts.renderAll(filtered);
    Table.render(filtered);

    const summaryAggregates = {
      bySprint: aggregates.bySprint,
      byCelula: aggregates.byCelula
    };
    document.getElementById('aiSummaryText').textContent =
      AISummary.generate(filtered, metrics, summaryAggregates, Filters.getActiveFiltersForSummary());

    renderDiagnostics(filtered, metrics);
  }

  function kpiCard(value, label, sub) {
    return `<div class="kpi-card">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>`;
  }

  function renderKPIs(m) {
    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = [
      kpiCard(m.total, 'Total de registros'),
      kpiCard(m.closed, 'Cerrados / Resueltos', `${m.pctCerrado}%`),
      kpiCard(m.active, 'Activos', `${m.pctActivo}%`),
      kpiCard(m.nuevo, 'Nuevos', `${m.pctNuevo}%`),
      kpiCard(m.bugsAbiertos, 'Bugs abiertos', `de ${m.bugsTotal} reportados`),
      kpiCard(`${m.pctPendiente}%`, 'Pendiente por cerrar'),
      kpiCard(m.storyPointsTotal || '—', 'Story Points totales', m.storyPointsTotal ? `${m.storyPointsCerrados} cerrados` : 'sin datos'),
      kpiCard(m.sinAsignar, 'Sin responsable asignado')
    ].join('');
  }

  function renderSemaforo(m) {
    const sem = KPI.semaforo(m);
    const luz = document.getElementById('semaforoLuz');
    luz.className = `semaforo-luz semaforo-${sem.color}`;
    document.getElementById('semaforoTexto').textContent = sem.texto;
  }

  function renderDiagnostics(records, metrics) {
    const list = document.getElementById('diagnosticsList');
    const diags = KPI.diagnostics(records, metrics);
    const iconFor = { ok: '✓', warn: '!', risk: '✕' };
    const classFor = { ok: 'diag-ok', warn: 'diag-warn', risk: 'diag-risk' };
    list.innerHTML = diags.map(d => `
      <li class="${classFor[d.level]}">
        <span class="diag-icon">${iconFor[d.level]}</span>
        <span>${d.text}</span>
      </li>
    `).join('');
  }
})();
