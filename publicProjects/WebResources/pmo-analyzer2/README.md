# Azure DevOps PMO Analyzer

Dashboard PMO estático (HTML + CSS + JS) para analizar exportaciones CSV de Azure DevOps Boards / Work Items. Todo el procesamiento ocurre **en el navegador**: no hay backend, no hay base de datos, no hay persistencia y no se envía información a ningún servidor. Al recargar la página, los datos se pierden (por diseño).

## Cómo usarlo

1. Descomprime la carpeta completa (debe conservar la estructura `index.html`, `css/`, `js/`, `lib/`).
2. Abre `index.html` con doble clic (funciona directamente con `file://`, no necesitas un servidor).
3. Arrastra tu export CSV de Azure DevOps o selecciónalo con el botón.
4. Incluí `sample_data.csv` para que puedas probar el dashboard de inmediato (fechas relativas a "hoy" para ejercitar vencidos/por vencer).

Las librerías (`PapaParse` y `Chart.js`) están **vendorizadas en `/lib`**: no se cargan desde ningún CDN, así que la app funciona incluso sin conexión a internet.

## Estructura del proyecto

```
index.html            Estructura de la SPA (pantalla de carga + dashboard)
css/styles.css         Estilos
js/utils.js            Helpers compartidos (escape de HTML, debounce)
js/config.js           TODAS las "reglas de negocio" configurables (ver abajo)
js/dateUtils.js        Parseo tolerante de fechas (ISO, M/D/YYYY, etc.)
js/parser.js           Lee el CSV, mapea columnas tolerantes, normaliza responsables y arma el título
js/timeMetrics.js      Duración por equipo y series de burndown/burnup
js/kpi.js              Cálculo de KPIs, agregaciones y semáforo PMO
js/riskAnalysis.js     Los 5 análisis de riesgo automáticos (cuello de botella, concentración, vencimiento, crecimiento de backlog, calidad)
js/aiSummary.js        Motor de reglas + plantillas para el resumen ejecutivo ("IA local")
js/filters.js          Filtros combinados dinámicos + 2 filtros libres columna-valor
js/charts.js           Gráficos (Chart.js): distribuciones, burndown, burnup, paleta diferenciada por estado
js/table.js            Tabla de detalle: ordenamiento, columnas configurables, hipervínculo a Azure DevOps
js/app.js              Orquestador: conecta carga de archivo, filtros y renders
lib/                   PapaParse y Chart.js vendorizados (sin CDN)
sample_data.csv        Archivo de ejemplo con Title 1..5, fechas, Proceso y responsables con "<email>"
```

## Cómo funciona el análisis (puntos clave)

- **Columnas tolerantes**: `js/config.js → CONFIG.columns` define alias aceptados por columna. Si Azure DevOps exporta con otro nombre, solo agrega el alias ahí.
- **Todo dinámico**: tipos, estados, sprints, células, equipos, responsables y **Proceso** se detectan a partir del CSV real. No hay catálogos fijos: si aparece un valor nuevo, se refleja automáticamente en filtros, gráficos y tabla.
- **Normalización de responsables**: cualquier contenido entre `<` y `>` se elimina de `Assigned To` (p. ej. `Edgar Delgado Reyes <edelgado@upexternos.com.mx>` → `Edgar Delgado Reyes`). Aplica de forma centralizada en el parser, por lo que se refleja en la gráfica de Responsable, la tabla y cualquier KPI/filtro basado en ese campo.
- **Título compuesto**: se arma tomando el primer valor no vacío entre las columnas `Title 1`, `Title 2`, `Title 3`, `Title 4`, `Title 5` (también acepta un export con una sola columna `Title`/`Titulo`). Orden configurable en `CONFIG.titleSourceColumns`.
- **Sprint y Célula desde Tags**: expresiones regulares configurables en `CONFIG.sprintPattern` / `CONFIG.celulaPattern`.
- **Hipervínculo del Work Item**: la columna ID de la tabla enlaza a `https://dev.azure.com/UP-SiVale/SI%20VALE%20Agile/_workitems/edit/{ID}`, se abre en pestaña nueva. Base configurable en `CONFIG.azureDevOpsBaseUrl`.
- **Clasificación de estados**: cada estado se agrupa dinámicamente en `closed / active / new / other` según palabras clave en `CONFIG.stateClassification`. Un estado desconocido cae en "other": se sigue mostrando en filtros/gráficos, pero no participa en los KPIs de cerrado/activo/nuevo hasta que le agregues una palabra clave.
- **Semáforo PMO**: reglas editables en `CONFIG.semaforoRules`.
- **Resumen ejecutivo ("IA local")**: `js/aiSummary.js` es un motor de reglas y plantillas — **no usa ningún modelo de IA real ni llamada externa**. Se regenera con cada cambio de filtro (incluyendo los filtros libres) e incorpora automáticamente los riesgos detectados.

## Filtros

- **Combinados**: Tipo, Estado, Sprint, Célula, **Proceso**, Responsable y Equipo Principal. Selección múltiple dentro de cada filtro (OR) y combinación entre filtros distintos (AND).
- **Filtros libres (columna + valor)**: 2 filtros adicionales donde eliges cualquier columna reconocida (incluidas las que agregues a futuro en `CONFIG.fields`) y escribes un valor a buscar (coincidencia parcial, sin distinguir mayúsculas/minúsculas). Se combinan en AND con el resto de los filtros.
- Todo el dashboard (KPIs, semáforo, gráficos, diagnósticos/riesgos, tabla, análisis temporal y resumen ejecutivo) se recalcula en vivo.

## Tabla de detalle

- Columnas: ID (con hipervínculo), Tipo, Título, Estado, Responsable, Equipo, Sprint, Célula, Proceso, Story Points, Prioridad, Start/Finish/Target Date visibles por defecto; Tags, Iteration Path, Area Path, Effort, Parent, Created/Changed Date y Severity disponibles pero ocultas por defecto.
- **Ordenamiento**: clic en cualquier encabezado ordena asc/desc (numérico para ID/SP/Priority/Effort, cronológico para fechas, alfabético para el resto).
- **Columnas visibles**: botón "Columnas" junto al título de la tabla para mostrar/ocultar cualquier columna.
- Limita el render a 500 filas por rendimiento (los KPIs, gráficos y diagnósticos sí consideran el 100% de los registros filtrados).

## Análisis temporal (nuevo)

- **Burndown** (trabajo pendiente) y **Burnup** (avance acumulado vs. alcance conocido), construidos a partir de Start Date / Finish Date / Target Date / State.
  > ⚠️ Un CSV es una "foto" del estado actual, no una serie histórica día a día. Estas gráficas son una aproximación razonable basada en las fechas disponibles del snapshot, útiles para ver tendencia — no un tracking histórico exacto como el de Azure Boards.
- **Duración por Equipo Principal**: tabla con promedio, mediana, mínima y máxima de `Finish Date − Start Date` por equipo, más el promedio general del proyecto.

## Diagnósticos y riesgos automáticos

Además de los diagnósticos operativos (bugs abiertos, items sin sprint/célula/responsable, concentración por sprint), la "IA local" evalúa 5 riesgos PMO, también incorporados al resumen ejecutivo:

1. **Cuello de botella**: equipos cuyo tiempo promedio de ejecución supera el promedio general (umbral en `CONFIG.risk.bottleneckFactor`).
2. **Concentración**: cuando una sola célula o proceso concentra ≥50% del backlog visible (`CONFIG.risk.concentrationThreshold`).
3. **Vencimiento**: Target Date vencido o por vencer en los próximos N días (`CONFIG.risk.dueSoonDays`) en items no cerrados.
4. **Crecimiento de backlog**: cuando los items nuevos superan significativamente a los cerrados (`CONFIG.risk.backlogGrowthRatio`).
5. **Calidad**: volumen elevado de bugs abiertos (mismos umbrales que el semáforo).

## Personalización rápida

Casi todo lo "de negocio" vive en `js/config.js`:
- Agregar alias de columnas nuevas (incluye `CONFIG.fields` para que aparezcan también en la tabla y en los filtros libres).
- Cambiar el patrón de detección de Sprint/Célula, o el orden de columnas para el Título.
- Añadir palabras clave para clasificar un estado nuevo.
- Ajustar los umbrales del semáforo y de los 5 riesgos automáticos.
- Cambiar la URL base del hipervínculo a Azure DevOps.
- Cambiar la paleta de colores de los gráficos.

## Evolutivos sugeridos (no incluidos en esta versión)

- Velocity real por sprint (requiere historial, no solo snapshot).
- Detección de dependencias vía Parent/Child.
- Exportar el dashboard filtrado a PDF/imagen.
- Comparativo entre sprints (tendencia histórica multi-export).

## Límites conocidos

- La tabla de detalle renderiza hasta 500 filas por rendimiento.
- Burndown/Burnup son aproximados: dependen de que Start/Finish/Target Date estén poblados en el CSV; si faltan, el panel muestra un aviso en vez de datos inventados.
- La detección de Sprint/Célula depende de que Azure DevOps siga guardando esa información en `Tags` con un patrón reconocible.
