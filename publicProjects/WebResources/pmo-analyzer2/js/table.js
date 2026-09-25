/* ============================================================
   TABLE — tabla de detalle de work items ya filtrados.
   Soporta: ordenamiento por click en cualquier columna,
   configuración de columnas visibles, e hipervínculo directo
   al Work Item en Azure DevOps (columna ID).
   Limita el render a un máximo de filas para mantener el
   dashboard fluido con CSVs grandes.
   ============================================================ */

const Table = (() => {

  const MAX_ROWS = 500;

  let lastRecords = [];
  let sortState = { key: 'id', dir: 'asc' };
  let visible = new Set(CONFIG.fields.filter(f => f.defaultVisible).map(f => f.key));

  function compareValues(a, b, type) {
    if (type === 'number') {
      const na = parseFloat(a), nb = parseFloat(b);
      const va = isNaN(na) ? -Infinity : na;
      const vb = isNaN(nb) ? -Infinity : nb;
      return va - vb;
    }
    if (type === 'date') {
      const da = DateUtils.parseDate(a);
      const db = DateUtils.parseDate(b);
      const va = da ? da.getTime() : -Infinity;
      const vb = db ? db.getTime() : -Infinity;
      return va - vb;
    }
    return String(a ?? '').localeCompare(String(b ?? ''), 'es');
  }

  function sortedRecords(records) {
    const field = CONFIG.fields.find(f => f.key === sortState.key);
    if (!field) return records;
    const dir = sortState.dir === 'asc' ? 1 : -1;
    return [...records].sort((r1, r2) => dir * compareValues(r1[field.key], r2[field.key], field.type));
  }

  function cellContent(record, field) {
    const val = record[field.key];

    if (field.key === 'id') {
      const href = `${CONFIG.azureDevOpsBaseUrl}${encodeURIComponent(val)}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${Utils.escapeHtml(val)}</a>`;
    }
    if (field.key === 'state') {
      const cls = { closed: 'badge-closed', active: 'badge-active', new: 'badge-new', other: 'badge-other' }[record.stateBucket];
      return `<span class="badge ${cls}">${Utils.escapeHtml(val)}</span>`;
    }
    if (field.type === 'date' && val) {
      const d = DateUtils.parseDate(val);
      return Utils.escapeHtml(d ? DateUtils.formatISO(d) : val);
    }
    return Utils.escapeHtml(val === null || val === undefined || val === '' ? '—' : val);
  }

  function headerCell(field) {
    const active = sortState.key === field.key;
    const arrow = active ? (sortState.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th data-key="${field.key}" class="sortable${active ? ' sorted' : ''}">${field.label}${arrow}</th>`;
  }

  function render(records) {
    lastRecords = records;
    repaint();
  }

  function repaint() {
    const thead = document.querySelector('#detailTable thead');
    const tbody = document.querySelector('#detailTable tbody');
    const countEl = document.getElementById('tableCount');

    const cols = CONFIG.fields.filter(f => visible.has(f.key));
    thead.innerHTML = `<tr>${cols.map(headerCell).join('')}</tr>`;

    const sorted = sortedRecords(lastRecords);
    const rows = sorted.slice(0, MAX_ROWS);

    tbody.innerHTML = rows.length
      ? rows.map(r => `<tr>${cols.map(c => `<td>${cellContent(r, c)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="empty-note">Sin registros para los filtros actuales.</td></tr>`;

    countEl.textContent = sorted.length > MAX_ROWS
      ? `(mostrando ${MAX_ROWS} de ${sorted.length})`
      : `(${sorted.length})`;

    thead.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else sortState = { key, dir: 'asc' };
        repaint();
      });
    });
  }

  // Panel de columnas visibles (checkbox por cada campo configurado).
  function initColumnToggle() {
    const btn = document.getElementById('btnColumns');
    const panel = document.getElementById('columnsPanel');
    if (!btn || !panel) return;

    panel.innerHTML = CONFIG.fields.map(f => `
      <label class="multiselect-option">
        <input type="checkbox" value="${f.key}" ${visible.has(f.key) ? 'checked' : ''}>
        <span>${f.label}</span>
      </label>
    `).join('');

    panel.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) visible.add(cb.value);
        else visible.delete(cb.value);
        repaint();
      });
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.multiselect-panel.open').forEach(p => {
        if (p !== panel) p.classList.remove('open');
      });
      panel.classList.toggle('open');
    });
  }

  return { render, initColumnToggle };
})();
