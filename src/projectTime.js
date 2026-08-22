/** Calendar time progress for a project start→end window */

const DAY = 86400000;

function toDay(isoOrDate) {
  if (!isoOrDate) return null;
  const t = new Date(isoOrDate).setHours(0, 0, 0, 0);
  return Number.isNaN(t) ? null : t;
}

/**
 * @returns {{
 *   ready: boolean,
 *   totalDays: number,
 *   elapsedDays: number,
 *   remainingDays: number,
 *   elapsedPct: number,
 *   remainingPct: number,
 *   status: 'missing'|'not_started'|'active'|'ended'
 * }}
 */
export function getProjectTimeProgress(startDate, endDate, now = new Date()) {
  const start = toDay(startDate);
  const end = toDay(endDate);
  const today = toDay(now);

  if (start == null || end == null || end < start) {
    return {
      ready: false,
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      elapsedPct: 0,
      remainingPct: 0,
      status: 'missing',
    };
  }

  const totalDays = Math.max(1, Math.round((end - start) / DAY) + 1);

  if (today < start) {
    return {
      ready: true,
      totalDays,
      elapsedDays: 0,
      remainingDays: Math.round((end - today) / DAY),
      elapsedPct: 0,
      remainingPct: 100,
      status: 'not_started',
    };
  }

  if (today > end) {
    const overDays = Math.round((today - end) / DAY);
    return {
      ready: true,
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      elapsedPct: 100,
      remainingPct: 0,
      status: 'ended',
      overDays,
    };
  }

  const elapsedDays = Math.round((today - start) / DAY) + 1;
  const remainingDays = Math.round((end - today) / DAY);
  const elapsedPct = Math.round(((today - start) / (end - start)) * 1000) / 10;
  const clamped = Math.max(0, Math.min(100, elapsedPct));

  return {
    ready: true,
    totalDays,
    elapsedDays: Math.min(totalDays, Math.max(0, elapsedDays)),
    remainingDays: Math.max(0, remainingDays),
    elapsedPct: clamped,
    remainingPct: Math.round((100 - clamped) * 10) / 10,
    status: 'active',
  };
}

/** Inclusive calendar-day count between start and end (date-only). */
export function calendarDaysInclusive(startDate, endDate) {
  const start = toDay(startDate);
  const end = toDay(endDate);
  if (start == null || end == null || end < start) return 0;
  return Math.round((end - start) / DAY) + 1;
}

/** End date (YYYY-MM-DD) from start + inclusive day count. */
export function addCalendarDays(startDate, days) {
  const start = toDay(startDate);
  const n = Number(days);
  if (start == null || !Number.isFinite(n) || n < 1) return '';
  return new Date(start + (n - 1) * DAY).toISOString().slice(0, 10);
}

export function parseProjectTeam(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((m) => ({
        name: String(m?.name || '').trim(),
        position: String(m?.position || '').trim(),
      }))
      .filter((m) => m.name);
  }
  try {
    return parseProjectTeam(JSON.parse(String(raw)));
  } catch {
    return [];
  }
}
