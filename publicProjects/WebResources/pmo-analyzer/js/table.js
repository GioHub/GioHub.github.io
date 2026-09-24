/* ============================================================
   TABLE — tabla de detalle de work items ya filtrados.
   Limita el render a un máximo de filas para mantener el
   dashboard fluido con CSVs grandes.
   ============================================================ */

const Table = (() => {

  const MAX_ROWS = 500;

  const COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'type', label: 'Tipo' },
    { key: 'title', label: 'Título' },
    { key: 'state', label: 'Estado' },
    { key: 'assignedTo', label: 'Responsable' },
    { key: 'team', label: 'Equipo' },
    { key: 'sprint', label: 'Sprint' },
    { key: 'celula', label: 'Célula' },
    { key: 'storyPoints', label: 'SP' },
    { key: 'priority', label: 'Prioridad' }
  ];

  function badgeFor(record) {
    const cls = { closed: 'badge-closed', active: 'badge-active', new: 'badge-new', other: 'badge-other' }[record.stateBucket];
    return `<span class="badge ${cls}">${escapeHtml(record.state)}</span>`;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function render(records) {
    const thead = document.querySelector('#detailTable thead');
    const tbody = document.querySelector('#detailTable tbody');
    const countEl = document.getElementById('tableCount');

    thead.innerHTML = `<tr>${COLUMNS.map(c => `<th>${c.label}</th>`).join('')}</tr>`;

    const rows = records.slice(0, MAX_ROWS);
    tbody.innerHTML = rows.map(r => `<tr>${COLUMNS.map(c => {
      if (c.key === 'state') return `<td>${badgeFor(r)}</td>`;
      const val = r[c.key];
      return `<td title="${escapeHtml(val)}">${escapeHtml(val === null || val === undefined || val === '' ? '—' : val)}</td>`;
    }).join('')}</tr>`).join('');

    countEl.textContent = records.length > MAX_ROWS
      ? `(mostrando ${MAX_ROWS} de ${records.length})`
      : `(${records.length})`;
  }

  return { render };
})();
