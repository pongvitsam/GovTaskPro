/** Display dates as Thai Buddhist Era. Keep ISO / yyyy-mm-dd for storage & native inputs. */

export function formatThaiDate(iso, options = {}) {
  const empty = options.emptyLabel ?? 'ไม่ระบุ';
  if (!iso) return empty;
  const d = parseDate(iso);
  if (!d) return empty;
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(options.localeOptions || {}),
  });
}

/** Full Thai Buddhist date — วัน เดือน ปี พ.ศ. e.g. 26 กรกฎาคม 2569 */
export function formatThaiDateLong(iso, options = {}) {
  const empty = options.emptyLabel ?? 'เลือกวันที่';
  if (!iso) return empty;
  const d = parseDate(iso);
  if (!d) return empty;
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Month + Buddhist year only, e.g. กรกฎาคม 2569 */
export function formatThaiMonthYear(isoOrDate) {
  if (!isoOrDate) return 'ไม่ระบุ';
  const d = isoOrDate instanceof Date ? isoOrDate : parseDate(isoOrDate);
  if (!d) return 'ไม่ระบุ';
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

/** yyyy-mm-dd for <input type="date"> from ISO / Date (local calendar day) */
export function toDateInputValue(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Store selected calendar day as local noon ISO (stable for “due today”) */
export function fromDateInputValue(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  const d = new Date(`${String(yyyyMmDd).slice(0, 10)}T09:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseDate(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : iso;
  const s = String(iso);
  // Date-only → local midnight to avoid UTC shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
