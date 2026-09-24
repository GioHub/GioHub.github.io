/* ============================================================
   CONFIG — Toda la "inteligencia de negocio" configurable vive
   aquí. Si Azure DevOps cambia nombres de estados, tags nuevos,
   o quieres afinar el semáforo, este es el único archivo a tocar.
   ============================================================ */

const CONFIG = {

  // Columnas que la app intenta reconocer en el CSV.
  // "keys" son variantes de nombre de columna aceptadas (case-insensitive,
  // sin acentos) para tolerar exports distintos de Azure DevOps.
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
    title:         { keys: ['title', 'titulo'] }
  },

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
  // Patrón por defecto: "SP" + número (SP1, SP 2, Sprint3, Sprint 4...)
  sprintPattern: /\b(?:sp|sprint)\s*-?\s*(\d+)\b/i,
  sprintLabel: (n) => `Sprint ${n}`,
  noSprintLabel: 'Sin sprint asignado',

  // Extracción de Célula desde el campo Tags.
  // Patrón por defecto: "Célula" / "Celula" + número o nombre corto
  celulaPattern: /\bc[eé]lula\s*-?\s*(\w+)\b/i,
  celulaLabel: (n) => `Célula ${n}`,
  noCelulaLabel: 'Sin célula asignada',

  noTeamLabel: 'Sin equipo asignado',
  noAssigneeLabel: 'Sin asignar',

  // Umbrales del semáforo PMO (sobre datos ya filtrados).
  // Se evalúa en orden; el primero que aplique gana.
  semaforoRules: {
    rojo: (m) => m.bugsAbiertos >= 10 || m.pctCerrado < 30,
    amarillo: (m) => m.pctCerrado < 65 || m.bugsAbiertos >= 5,
    // si no matchea rojo ni amarillo => verde
  },

  // Tipos de work item considerados "trabajo cerrable" para % avance.
  // (todos los tipos se muestran igual en gráficos; esto solo afecta
  // qué se resalta en diagnósticos de bugs).
  bugTypeKeywords: ['bug', 'defecto'],

  colors: {
    palette: ['#2F5DD4', '#1E9E6B', '#D69A1F', '#D14343', '#7C5CD1', '#1FA6B0',
              '#C2588B', '#5B7F3B', '#B0752C', '#4C6EF5', '#8B94A3', '#2E7D6B'],
    closed: '#1E9E6B',
    active: '#2F5DD4',
    new: '#D69A1F',
    other: '#8B94A3'
  }
};
