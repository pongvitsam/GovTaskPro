/** Display dates as Thai Buddhist Era, e.g. 25 ก.ค. 2569. Keep ISO for <input type="date">. */

export function formatThaiDate(iso, options = {}) {
  const empty = options.emptyLabel ?? 'ไม่ระบุ';
  if (!iso) return empty;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(options.localeOptions || {}),
  });
}

/** Month + Buddhist year only, e.g. ก.ค. 2569 */
export function formatThaiMonthYear(isoOrDate) {
  if (!isoOrDate) return 'ไม่ระบุ';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return 'ไม่ระบุ';
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}
