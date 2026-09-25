/* ============================================================
   FILTERS — construye dinámicamente los controles de filtro a
   partir de los catálogos detectados en el CSV, aplica el
   filtrado combinado (AND entre categorías, OR dentro de cada
   categoría) y soporta 2 filtros libres columna-valor para
   cualquier campo, incluyendo columnas futuras.
   ============================================================ */

const Filters = (() => {

  // field interno -> { label, catalogKey }
  const FIELD_DEFS = [
    { field: 'type',       label: 'Tipo',              catalogKey: 'types' },
    { field: 'state',      label: 'Estado',            catalogKey: 'states' },
    { field: 'sprint',     label: 'Sprint',            catalogKey: 'sprints' },
    { field: 'celula',     label: 'Célula',            catalogKey: 'celulas' },
    { field: 'proceso',    label: 'Proceso',           catalogKey: 'procesos' },
    { field: 'assignedTo', label: 'Responsable',       catalogKey: 'assignees' },
    { field: 'team',       label: 'Equipo Principal',  catalogKey: 'teams' }
  ];

  const FREE_FILTER_COUNT = 2;

  let state = {}; // { field: Set(valores seleccionados) }
  let freeFilterState = [];
  let onChangeCb = () => {};

  function init(catalogs, onChange) {
    onChangeCb = onChange;
    state = {};
    FIELD_DEFS.forEach(def => state[def.field] = new Set());
    render(catalogs);
    initFreeFilters();
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
        updateTriggerLabel(trigger, state[def.field].size);
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
    return wrap;
  }

  function updateTriggerLabel(trigger, count) {
    const span = trigger.querySelector('.ms-label');
    span.textContent = count === 0 ? 'Todos' : `${count} seleccionado(s)`;
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.multiselect-panel.open').forEach(p => p.classList.remove('open'));
  });

  // ---------- Filtros libres columna-valor ----------
  function initFreeFilters() {
    freeFilterState = Array.from({ length: FREE_FILTER_COUNT }, () => ({ field: '', value: '' }));
    const container = document.getElementById('freeFiltersContainer');
    if (!container) return;
    container.innerHTML = '';

    freeFilterState.forEach((_, idx) => {
      const row = document.createElement('div');
      row.className = 'free-filter-row';

      const select = document.createElement('select');
      select.className = 'free-filter-select';
      select.innerHTML = `<option value="">Selecciona columna…</option>` +
        CONFIG.fields.map(f => `<option value="${f.key}">${f.label}</option>`).join('');
      select.addEventListener('change', () => {
        freeFilterState[idx].field = select.value;
        onChangeCb(getActiveFilters());
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Valor a buscar…';
      input.className = 'free-filter-input';
      input.addEventListener('input', Utils.debounce(() => {
        freeFilterState[idx].value = input.value;
        onChangeCb(getActiveFilters());
      }, 200));

      row.appendChild(select);
      row.appendChild(input);
      container.appendChild(row);
    });
  }

  function getActiveFilters() {
    const out = {};
    FIELD_DEFS.forEach(def => {
      if (state[def.field].size) out[def.field] = { label: def.label, values: [...state[def.field]] };
    });
    return out;
  }

  // Para el resumen IA: { "Tipo": ["Bug"], "Responsable": ["contiene \"ana\""] , ... }
  function getActiveFiltersForSummary() {
    const out = {};
    Object.values(getActiveFilters()).forEach(f => out[f.label] = f.values);
    freeFilterState.forEach(f => {
      if (f.field && f.value.trim()) {
        const label = (CONFIG.fields.find(cf => cf.key === f.field) || {}).label || f.field;
        out[label] = [`contiene "${f.value.trim()}"`];
      }
    });
    return out;
  }

  function apply(records) {
    const active = getActiveFilters();
    const fields = Object.keys(active);
    let result = records;

    if (fields.length) {
      result = result.filter(r => fields.every(field => active[field].values.includes(r[field])));
    }

    const freeActive = freeFilterState.filter(f => f.field && f.value.trim() !== '');
    if (freeActive.length) {
      result = result.filter(r => freeActive.every(f =>
        String(r[f.field] ?? '').toLowerCase().includes(f.value.trim().toLowerCase())
      ));
    }

    return result;
  }

  function clear() {
    FIELD_DEFS.forEach(def => state[def.field].clear());
    document.querySelectorAll('#filtersContainer .multiselect-panel input[type=checkbox]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#filtersContainer .multiselect-trigger .ms-label').forEach(span => span.textContent = 'Todos');

    freeFilterState.forEach(f => { f.field = ''; f.value = ''; });
    document.querySelectorAll('.free-filter-select').forEach(s => s.value = '');
    document.querySelectorAll('.free-filter-input').forEach(i => i.value = '');

    onChangeCb(getActiveFilters());
  }

  return { init, apply, clear, getActiveFilters, getActiveFiltersForSummary };
})();
