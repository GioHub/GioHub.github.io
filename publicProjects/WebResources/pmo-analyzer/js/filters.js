/* ============================================================
   FILTERS — construye dinámicamente los controles de filtro a
   partir de los catálogos detectados en el CSV, y aplica el
   filtrado combinado (AND entre categorías, OR dentro de cada
   categoría) sobre el set completo de registros.
   ============================================================ */

const Filters = (() => {

  // field interno -> { label, catalogKey }
  const FIELD_DEFS = [
    { field: 'type',       label: 'Tipo',              catalogKey: 'types' },
    { field: 'state',      label: 'Estado',            catalogKey: 'states' },
    { field: 'sprint',     label: 'Sprint',            catalogKey: 'sprints' },
    { field: 'celula',     label: 'Célula',            catalogKey: 'celulas' },
    { field: 'assignedTo', label: 'Responsable',       catalogKey: 'assignees' },
    { field: 'team',       label: 'Equipo Principal',  catalogKey: 'teams' }
  ];

  let state = {}; // { field: Set(valores seleccionados) }
  let onChangeCb = () => {};

  function init(catalogs, onChange) {
    onChangeCb = onChange;
    state = {};
    FIELD_DEFS.forEach(def => state[def.field] = new Set());
    render(catalogs);
  }

  function render(catalogs) {
    const container = document.getElementById('filtersContainer');
    container.innerHTML = '';

    FIELD_DEFS.forEach(def => {
      const options = catalogs[def.catalogKey] || [];
      const field = document.createElement('div');
      field.className = 'filter-field';

      const label = document.createElement('label');
      label.textContent = def.label;
      field.appendChild(label);

      field.appendChild(buildMultiselect(def, options));
      container.appendChild(field);
    });
  }

  function buildMultiselect(def, options) {
    const wrap = document.createElement('div');
    wrap.className = 'multiselect';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'multiselect-trigger';
    trigger.innerHTML = `<span class="ms-label">Todos</span><span class="chev">▾</span>`;

    const panel = document.createElement('div');
    panel.className = 'multiselect-panel';

    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'multiselect-empty';
      empty.textContent = 'Sin datos en el CSV';
      panel.appendChild(empty);
      trigger.disabled = true;
    }

    options.forEach(opt => {
      const row = document.createElement('label');
      row.className = 'multiselect-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = opt;
      cb.addEventListener('change', () => {
        if (cb.checked) state[def.field].add(opt);
        else state[def.field].delete(opt);
        updateTriggerLabel(trigger, def, state[def.field].size);
        onChangeCb(getActiveFilters());
      });
      const span = document.createElement('span');
      span.textContent = opt;
      row.appendChild(cb);
      row.appendChild(span);
      panel.appendChild(row);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.multiselect-panel.open').forEach(p => {
        if (p !== panel) p.classList.remove('open');
      });
      panel.classList.toggle('open');
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    wrap._checkboxes = panel.querySelectorAll('input[type=checkbox]');
    wrap._trigger = trigger;
    wrap._def = def;
    return wrap;
  }

  function updateTriggerLabel(trigger, def, count) {
    const span = trigger.querySelector('.ms-label');
    span.textContent = count === 0 ? 'Todos' : `${count} seleccionado(s)`;
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.multiselect-panel.open').forEach(p => p.classList.remove('open'));
  });

  function getActiveFilters() {
    const out = {};
    FIELD_DEFS.forEach(def => {
      if (state[def.field].size) out[def.field] = { label: def.label, values: [...state[def.field]] };
    });
    return out;
  }

  // Para el resumen IA: { "Tipo": ["Bug"], ... }
  function getActiveFiltersForSummary() {
    const out = {};
    Object.values(getActiveFilters()).forEach(f => out[f.label] = f.values);
    return out;
  }

  function apply(records) {
    const active = getActiveFilters();
    const fields = Object.keys(active);
    if (!fields.length) return records;
    return records.filter(r => fields.every(field => active[field].values.includes(r[field])));
  }

  function clear() {
    FIELD_DEFS.forEach(def => state[def.field].clear());
    document.querySelectorAll('.multiselect-panel input[type=checkbox]').forEach(cb => cb.checked = false);
    document.querySelectorAll('.multiselect-trigger').forEach(t => {
      const span = t.querySelector('.ms-label');
      if (span) span.textContent = 'Todos';
    });
    onChangeCb(getActiveFilters());
  }

  return { init, apply, clear, getActiveFilters, getActiveFiltersForSummary };
})();
