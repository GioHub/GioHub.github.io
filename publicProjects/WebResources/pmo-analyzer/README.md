# Azure DevOps PMO Analyzer

Dashboard PMO estático (HTML + CSS + JS) para analizar exportaciones CSV de Azure DevOps Boards / Work Items. Todo el procesamiento ocurre **en el navegador**: no hay backend, no hay base de datos, no hay persistencia y no se envía información a ningún servidor. Al recargar la página, los datos se pierden (por diseño).

## Cómo usarlo

1. Descomprime la carpeta completa (debe conservar la estructura `index.html`, `css/`, `js/`, `lib/`).
2. Abre `index.html` con doble clic (funciona directamente con `file://`, no necesitas un servidor).
3. Arrastra tu export CSV de Azure DevOps o selecciónalo con el botón.
4. Incluí `sample_data.csv` para que puedas probar el dashboard de inmediato.

Las librerías (`PapaParse` y `Chart.js`) están **vendorizadas en `/lib`**: no se cargan desde ningún CDN, así que la app funciona incluso sin conexión a internet.

## Estructura del proyecto

```
index.html          Estructura de la SPA (pantalla de carga + dashboard)
css/styles.css       Estilos
js/config.js         "Reglas de negocio" configurables (ver abajo)
js/parser.js         Lee el CSV, mapea columnas de forma tolerante y normaliza registros
js/kpi.js            Cálculo de KPIs, agregaciones y semáforo PMO
js/aiSummary.js       Motor de reglas + plantillas para el resumen ejecutivo ("IA local")
js/filters.js        Filtros combinados dinámicos (multi-select)
js/charts.js         Gráficos (Chart.js) construidos dinámicamente a partir de los datos
js/table.js          Tabla de detalle
js/app.js            Orquestador: conecta carga de archivo, filtros y renders
lib/                 PapaParse y Chart.js vendorizados (sin CDN)
sample_data.csv      Archivo de ejemplo para probar el dashboard
```

## Cómo funciona el análisis (puntos clave)

- **Columnas tolerantes**: `js/config.js → CONFIG.columns` define alias aceptados por columna (p. ej. `Assigned To` o `Responsable`). Si Azure DevOps exporta con otro nombre, solo agrega el alias ahí.
- **Todo dinámico**: tipos de Work Item, estados, sprints, células, equipos y responsables se detectan a partir del CSV real. No hay catálogos fijos ni hardcodeados: si mañana aparece un tipo o estado nuevo, aparece automáticamente en filtros, gráficos y tabla.
- **Sprint y Célula desde Tags**: se extraen con expresiones regulares configurables en `CONFIG.sprintPattern` y `CONFIG.celulaPattern` (por defecto reconocen `SP2`, `Sprint 2`, `Célula 1`, etc.). Los registros sin match caen en "Sin sprint asignado" / "Sin célula asignada".
- **Clasificación de estados**: cada estado se agrupa dinámicamente en `closed / active / new / other` según palabras clave configurables en `CONFIG.stateClassification`. Esto es lo único que necesitas ajustar si aparece un estado nuevo cuyo comportamiento PMO no es obvio por el nombre (por defecto, cualquier estado desconocido cae en "other" y se sigue mostrando en filtros/gráficos, solo que no participa en los KPIs de cerrado/activo/nuevo).
- **Semáforo PMO**: reglas simples y editables en `CONFIG.semaforoRules` (rojo / amarillo / verde) basadas en % cerrado y bugs abiertos.
- **Resumen ejecutivo ("IA local")**: `js/aiSummary.js` es un motor de reglas y plantillas de texto — **no usa ningún modelo de IA real ni llamada externa**. Compone oraciones a partir de los KPIs ya calculados y se regenera cada vez que cambian los filtros, describiendo también el alcance filtrado.

## Filtros combinados

Tipo, Estado, Sprint, Célula, Responsable y Equipo Principal. Selección múltiple dentro de cada filtro (OR) y combinación entre filtros distintos (AND). Todo el dashboard (KPIs, semáforo, gráficos, diagnósticos, tabla y resumen ejecutivo) se recalcula en vivo.

## Personalización rápida

Casi todo lo "de negocio" vive en `js/config.js`, así que puedes ajustar reglas sin tocar el resto del código:
- Agregar alias de columnas nuevas.
- Cambiar el patrón de detección de Sprint/Célula.
- Añadir palabras clave para clasificar un estado nuevo como cerrado/activo/nuevo.
- Ajustar los umbrales del semáforo.
- Cambiar la paleta de colores de los gráficos.

## Evolutivos sugeridos (no incluidos en esta versión)

- Métricas ágiles: velocity por sprint, burnup/burndown.
- Detección automática de riesgos, dependencias y cuellos de botella entre Parent/Child.
- Exportar el dashboard filtrado a PDF/imagen.
- Comparativo entre sprints (tendencia histórica).

## Límites conocidos

- La tabla de detalle renderiza hasta 500 filas por rendimiento (los KPIs y gráficos sí consideran el 100% de los registros filtrados).
- La detección de Sprint/Célula depende de que Azure DevOps siga guardando esa información en el campo `Tags` con un patrón reconocible; si tu equipo usa otra convención, ajusta las expresiones regulares en `config.js`.
