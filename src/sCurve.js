/** Build planned vs actual S-curve series for a project + milestones */

function toTime(d) {
  if (!d) return null;
  const t = new Date(d).setHours(0, 0, 0, 0);
  return Number.isNaN(t) ? null : t;
}

function formatLabel(ms) {
  return new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * @returns {{ periods: Array, plannedPct: number, actualPct: number, totalWeight: number, start: number, end: number, today: number }}
 */
export function buildSCurve(project, milestones, options = {}) {
  const list = (milestones || []).filter((m) => m.projectId === project?.id);
  const totalWeight = list.reduce((s, m) => s + (Number(m.weight) || 1), 0) || 1;

  let start = toTime(project?.startDate);
  let end = toTime(project?.endDate);

  list.forEach((m) => {
    const ps = toTime(m.plannedStart);
    const pe = toTime(m.plannedEnd);
    const ca = toTime(m.completedAt);
    if (ps != null) start = start == null ? ps : Math.min(start, ps);
    if (pe != null) end = end == null ? pe : Math.max(end, pe);
    if (ca != null) end = end == null ? ca : Math.max(end, ca);
    if (m.completed && ca == null) {
      const today = new Date().setHours(0, 0, 0, 0);
      end = end == null ? today : Math.max(end, today);
    }
  });

  const today = new Date().setHours(0, 0, 0, 0);
  if (start == null) start = today;
  if (end == null || end <= start) end = start + 7 * 86400000;

  const spanDays = Math.round((end - start) / 86400000) + 1;
  const maxPoints = options.maxPoints || 12;
  const stepDays = options.stepDays
    ? Math.max(1, options.stepDays)
    : Math.max(1, Math.ceil(spanDays / maxPoints));

  const periods = [];
  for (let t = start; t <= end; t += stepDays * 86400000) {
    periods.push(buildPeriod(t, list, totalWeight));
  }
  const lastT = periods[periods.length - 1]?.t;
  if (lastT !== end) periods.push(buildPeriod(end, list, totalWeight));

  const plannedPct = Math.round(
    (list.filter((m) => toTime(m.plannedEnd) != null && toTime(m.plannedEnd) <= today)
      .reduce((s, m) => s + (Number(m.weight) || 1), 0) / totalWeight) * 1000
  ) / 10;

  const actualPct = Math.round(
    (list.filter((m) => m.completed).reduce((s, m) => s + (Number(m.weight) || 1), 0) / totalWeight) * 1000
  ) / 10;

  return { periods, plannedPct, actualPct, totalWeight, start, end, today };
}

function buildPeriod(t, list, totalWeight) {
  let plannedW = 0;
  let actualW = 0;
  list.forEach((m) => {
    const w = Number(m.weight) || 1;
    const pe = toTime(m.plannedEnd);
    if (pe != null && pe <= t) plannedW += w;
    if (m.completed) {
      const ca = toTime(m.completedAt) ?? toTime(m.plannedEnd) ?? t;
      if (ca <= t) actualW += w;
    }
  });
  return {
    t,
    label: formatLabel(t),
    planned: Math.round((plannedW / totalWeight) * 1000) / 10,
    actual: Math.round((actualW / totalWeight) * 1000) / 10,
  };
}

/** SVG polyline points for chart box */
export function toPolyline(periods, key, width, height, pad = 32) {
  if (!periods.length) return '';
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return periods
    .map((p, i) => {
      const x = pad + (periods.length === 1 ? innerW / 2 : (i / (periods.length - 1)) * innerW);
      const y = pad + innerH - (Math.min(100, Math.max(0, p[key])) / 100) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
}

/** Map a timestamp to 0–1 across [start, end] */
export function timeToRatio(t, start, end) {
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}

/** Week tick marks across project span (for Gantt / S-Curve header) */
export function buildWeekAxis(start, end) {
  if (start == null || end == null) return [];
  const ticks = [];
  let weekNo = 1;
  for (let t = start; t <= end; t += 7 * 86400000) {
    const d = new Date(t);
    ticks.push({
      t,
      weekNo,
      label: `W${weekNo}`,
      sublabel: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      isStart: weekNo === 1,
    });
    weekNo += 1;
  }
  // Ensure last week column covers project end if remainder days exist
  const last = ticks[ticks.length - 1];
  if (last && end - last.t > 3 * 86400000 && last.t + 7 * 86400000 <= end + 86400000) {
    // already stepped; if end is past last tick start, fine
  }
  return ticks;
}

/** @deprecated use buildWeekAxis — kept for compatibility */
export function buildMonthAxis(start, end) {
  return buildWeekAxis(start, end);
}

/**
 * Rows for spreadsheet-style S-Curve + Gantt:
 * item #, weight %, plan/actual dates, progress, bar positions, running cum %.
 * Timeline columns are weekly.
 */
export function buildSCurveSheet(project, milestones) {
  const curve = buildSCurve(project, milestones, { stepDays: 7 });
  const list = (milestones || [])
    .filter((m) => m.projectId === project?.id)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const totalWeight = curve.totalWeight;
  let cumPlan = 0;
  let cumActual = 0;

  const rows = list.map((m, idx) => {
    const w = Number(m.weight) || 1;
    const weightPct = Math.round((w / totalWeight) * 1000) / 10;
    const ps = toTime(m.plannedStart) ?? curve.start;
    const pe = toTime(m.plannedEnd) ?? curve.end;
    const progress = m.completed ? 100 : 0;
    cumPlan += weightPct;
    if (m.completed) cumActual += weightPct;

    const planStatus = toTime(m.plannedEnd) != null && toTime(m.plannedEnd) <= curve.today
      ? 'ครบตามแผน'
      : 'ตามแผน';
    const actualStatus = m.completed ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ';

    return {
      id: m.id,
      no: idx + 1,
      title: m.title,
      description: m.description || '',
      weight: w,
      weightPct,
      plannedStart: m.plannedStart || null,
      plannedEnd: m.plannedEnd || null,
      completedAt: m.completedAt || null,
      completed: !!m.completed,
      planStatus,
      actualStatus,
      progress,
      cumPlan: Math.round(cumPlan * 10) / 10,
      cumActual: Math.round(cumActual * 10) / 10,
      barStart: timeToRatio(ps, curve.start, curve.end),
      barEnd: timeToRatio(Math.max(ps, pe), curve.start, curve.end),
      nodeX: timeToRatio(
        m.completed
          ? (toTime(m.completedAt) ?? pe)
          : pe,
        curve.start,
        curve.end
      ),
    };
  });

  const weeks = buildWeekAxis(curve.start, curve.end);

  return {
    ...curve,
    rows,
    weeks,
    months: weeks, // alias — UI may still read months
    densePeriods: curve.periods,
  };
}

/** Polyline over a timeline width using absolute time (not equal period spacing) */
export function toTimelinePolyline(periods, key, width, height, start, end, padY = 8) {
  if (!periods.length || end <= start) return '';
  const innerH = height - padY * 2;
  return periods
    .map((p) => {
      const x = timeToRatio(p.t, start, end) * width;
      const y = padY + innerH - (Math.min(100, Math.max(0, p[key])) / 100) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
}

export function toTimelinePoints(periods, key, width, height, start, end, padY = 8) {
  if (!periods.length || end <= start) return [];
  const innerH = height - padY * 2;
  return periods.map((p) => ({
    x: timeToRatio(p.t, start, end) * width,
    y: padY + innerH - (Math.min(100, Math.max(0, p[key])) / 100) * innerH,
    value: p[key],
    t: p.t,
    label: p.label,
  }));
}
