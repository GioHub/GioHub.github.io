/* ============================================================
   CONFIG — Toda la "inteligencia de negocio" configurable vive
   aquí. Si Azure DevOps cambia nombres de estados, tags nuevos,
   agrega columnas, o quieres afinar el semáforo/riesgos, este
   es el único archivo a tocar.
   ============================================================ */

const CONFIG = {

  // Columnas que la app intenta reconocer en el CSV.
  // "keys" son variantes de nombre de columna aceptadas (case-insensitive,
  // sin acentos) para tolerar exports distintos de Azure DevOps.
  // NOTA: "Título" NO se define aquí porque se arma a partir de varias
  // columnas (Title 1..Title 5) — ver Parser.buildTitleColumns().
  columns: {
    id:            { keys: ['id', 'workitemid', 'work item id'] },
    type:          { keys: ['work item type', 'workitemtype', 'tipo'] },
    state:         { keys: ['state', 'estado'] },
    assignedTo:    { keys: ['assigned to', 'assignedto', 'responsable'] },
    tags:          { keys: ['tags', 'etiquetas'] },
    iterationPath: { keys: ['iteration path', 'iterationpath', 'sprint'] },
    areaPath:      { keys: ['area path', 'areapath'] },
    team:          { keys: ['equipo principal', 'team', 'equipo'] },
    storyPoints:   { keys: ['story points', 'storypoints'] },
    effort:        { keys: ['effort', 'esfuerzo'] },
    parent:        { keys: ['parent', 'padre'] },
    createdDate:   { keys: ['created date', 'createddate', 'fecha de creacion'] },
    changedDate:   { keys: ['changed date', 'changeddate', 'fecha de cambio'] },
    priority:      { keys: ['priority', 'prioridad'] },
    severity:      { keys: ['severity', 'severidad'] },
    proceso:       { keys: ['proceso', 'process'] },
    startDate:     { keys: ['start date', 'startdate', 'fecha de inicio'] },
    finishDate:    { keys: ['finish date', 'finishdate', 'fecha de fin', 'fecha fin'] },
    targetDate:    { keys: ['target date', 'targetdate', 'fecha objetivo', 'fecha compromiso'] }
  },

  // Orden de búsqueda para construir el Título: se toma el primer campo
  // no vacío recorriendo estas columnas en este orden. Se aceptan también
  // exports que ya traigan una sola columna "Title"/"Titulo".
  titleSourceColumns: ['title 1', 'title 2', 'title 3', 'title 4', 'title 5', 'title', 'titulo'],

  // Clasificación dinámica de estados en 4 macro-categorías.
  // Cualquier estado nuevo que no matchee ninguna palabra clave
  // cae en "other" y se sigue mostrando en gráficos/filtros,
  // solo que no participa en los KPIs de cerrado/activo/nuevo.
  stateClassification: {
    closed:  ['closed', 'resolved', 'done', 'cerrado', 'resuelto', 'removed', 'removido', 'cancelado', 'cancelled', 'certified'],
    active:  ['active', 'activo', 'doing', 'in progress', 'design', 'diseno', 'reopened', 'reabierto'],
    new:     ['new', 'nuevo', 'to do', 'todo', 'backlog', 'ready', 'listo']
    // todo lo que no matchee => "other"
  },

  // Extracción de Sprint desde el campo Tags.
  sprintPattern: /\b(?:sp|sprint)\s*-?\s*(\d+)\b/i,
  sprintLabel: (n) => `Sprint ${n}`,
  noSprintLabel: 'Sin sprint asignado',

  // Extracción de Célula desde el campo Tags.
  celulaPattern: /\bc[eé]lula\s*-?\s*(\w+)\b/i,
  celulaLabel: (n) => `Célula ${n}`,
  noCelulaLabel: 'Sin célula asignada',

  noTeamLabel: 'Sin equipo asignado',
  noAssigneeLabel: 'Sin asignar',
  noProcesoLabel: 'Sin proceso asignado',

  // Base para el hipervínculo de cada Work Item. Se concatena el ID al final.
  azureDevOpsBaseUrl: 'https://dev.azure.com/UP-SiVale/SI%20VALE%20Agile/_workitems/edit/',

  // Umbrales del semáforo PMO (sobre datos ya filtrados).
  semaforoRules: {
    rojo: (m) => m.bugsAbiertos >= 10 || m.pctCerrado < 30,
    amarillo: (m) => m.pctCerrado < 65 || m.bugsAbiertos >= 5,
    // si no matchea rojo ni amarillo => verde
  },

  // Umbrales de los análisis de riesgo automáticos (motor de reglas / "IA local").
  risk: {
    concentrationThreshold: 0.5,   // 50%+ del backlog en una sola célula/proceso
    dueSoonDays: 7,                // días de anticipación para "por vencer"
    backlogGrowthRatio: 1.5,       // nuevos >= cerrados * ratio => riesgo de crecimiento
    bottleneckFactor: 1.25         // equipo con promedio > overallAvg * factor => cuello de botella
  },

  // Tipos de work item considerados "trabajo cerrable" para % avance.
  bugTypeKeywords: ['bug', 'defecto'],

  // Definición única de "campos" de negocio: se usa para la tabla de detalle
  // (columnas visibles/ordenables), los filtros libres columna-valor y las
  // etiquetas mostradas en toda la UI. type se usa para ordenar/formatear.
  fields: [
    { key: 'id',            label: 'ID',                 type: 'number', defaultVisible: true },
    { key: 'type',          label: 'Tipo',                type: 'text',   defaultVisible: true },
    { key: 'title',         label: 'Título',              type: 'text',   defaultVisible: true },
    { key: 'state',         label: 'Estado',              type: 'text',   defaultVisible: true },
    { key: 'assignedTo',    label: 'Responsable',         type: 'text',   defaultVisible: true },
    { key: 'team',          label: 'Equipo Principal',    type: 'text',   defaultVisible: true },
    { key: 'sprint',        label: 'Sprint',              type: 'text',   defaultVisible: true },
    { key: 'celula',        label: 'Célula',              type: 'text',   defaultVisible: true },
    { key: 'proceso',       label: 'Proceso',             type: 'text',   defaultVisible: true },
    { key: 'storyPoints',   label: 'Story Points',        type: 'number', defaultVisible: true },
    { key: 'priority',      label: 'Prioridad',           type: 'number', defaultVisible: true },
    { key: 'startDate',     label: 'Start Date',          type: 'date',   defaultVisible: true },
    { key: 'finishDate',    label: 'Finish Date',         type: 'date',   defaultVisible: true },
    { key: 'targetDate',    label: 'Target Date',         type: 'date',   defaultVisible: true },
    { key: 'tags',          label: 'Tags',                type: 'text',   defaultVisible: false },
    { key: 'iterationPath', label: 'Iteration Path',      type: 'text',   defaultVisible: false },
    { key: 'areaPath',      label: 'Area Path',           type: 'text',   defaultVisible: false },
    { key: 'effort',        label: 'Effort',              type: 'number', defaultVisible: false },
    { key: 'parent',        label: 'Parent',              type: 'text',   defaultVisible: false },
    { key: 'createdDate',   label: 'Created Date',        type: 'date',   defaultVisible: false },
    { key: 'changedDate',   label: 'Changed Date',        type: 'date',   defaultVisible: false },
    { key: 'severity',      label: 'Severity',            type: 'text',   defaultVisible: false }
  ],

  colors: {
    palette: ['#2F5DD4', '#1E9E6B', '#D69A1F', '#D14343', '#7C5CD1', '#1FA6B0',
              '#C2588B', '#5B7F3B', '#B0752C', '#4C6EF5', '#8B94A3', '#2E7D6B'],
    closed: '#1E9E6B',
    active: '#2F5DD4',
    new: '#D69A1F',
    other: '#8B94A3',
    // Tonos base por macro-categoría de estado; charts.js deriva variaciones
    // de matiz/luminosidad por cada estado real para que sean distinguibles
    // incluso dentro de la misma categoría (p. ej. Closed vs Resolved).
    stateBucketHue: { closed: 152, active: 218, new: 40, other: 280 }
  }
};
