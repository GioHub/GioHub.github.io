/* ============================================================
   DATE UTILS — parseo tolerante de fechas de exports de Azure
   DevOps (ISO, "M/D/YYYY", "M/D/YYYY H:mm:ss", etc.) y helpers
   de diferencia de días. Devuelve siempre Date o null; nunca
   lanza excepción ante un valor inválido o vacío.
   ============================================================ */

const DateUtils = (() => {

  function parseDate(value) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    if (!s) return null;

    // Intento directo: cubre ISO (YYYY-MM-DD[THH:mm:ss]) y muchos formatos
    // que el motor de fechas del navegador ya sabe interpretar.
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // Fallback: formatos tipo "M/D/YYYY" o "D-M-YYYY" (típicos de exports
    // regionales de Azure DevOps), asumiendo M/D/YYYY (formato US por defecto
    // de Azure DevOps Server/Services).
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      let [, month, day, year] = m;
      if (year.length === 2) year = `20${year}`;
      d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  function daysBetween(dateA, dateB) {
    if (!dateA || !dateB) return null;
    return (dateB.getTime() - dateA.getTime()) / 86400000;
  }

  function today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatISO(d) {
    if (!d) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  return { parseDate, daysBetween, today, formatISO };
})();
