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

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeFilePart(name) {
  return String(name || 'project')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'project';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function isoDate(msOrIso) {
  if (msOrIso == null || msOrIso === '') return '';
  const d = typeof msOrIso === 'number' ? new Date(msOrIso) : new Date(msOrIso);
  if (Number.isNaN(d.getTime())) return String(msOrIso).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build Excel-friendly CSV (UTF-8 BOM) from S-Curve sheet */
export function buildSCurveCsv(project, sheet) {
  if (!sheet) return '';
  const lines = [];
  const push = (cols) => lines.push(cols.map(csvEscape).join(','));

  push(['GovTaskPro S-Curve']);
  push(['โปรเจกต์', project?.name || '']);
  push(['ช่วงเวลา', isoDate(sheet.start), isoDate(sheet.end)]);
  push(['วันที่ส่งออก', isoDate(Date.now())]);
  push(['ความคืบหน้าจริง %', sheet.actualPct]);
  push(['ตามแผน (ถึงวันนี้) %', sheet.plannedPct]);
  push(['ส่วนต่าง %', Math.round((sheet.actualPct - sheet.plannedPct) * 10) / 10]);
  push(['จำนวนสัปดาห์', (sheet.weeks || []).length]);
  lines.push('');

  push(['ขั้นตอน']);
  push([
    '#', 'รายการ', 'รายละเอียด', 'น้ำหนัก', 'น้ำหนัก %',
    'เริ่มแผน', 'สิ้นสุดแผน', 'วันที่เสร็จจริง', 'ความคืบหน้า %',
    'สถานะแผน', 'สถานะจริง', 'สะสมแผน %', 'สะสมจริง %',
  ]);
  (sheet.rows || []).forEach((row) => {
    push([
      row.no,
      row.title,
      row.description || '',
      row.weight,
      row.weightPct,
      isoDate(row.plannedStart),
      isoDate(row.plannedEnd),
      isoDate(row.completedAt),
      row.progress,
      row.planStatus,
      row.actualStatus,
      row.cumPlan,
      row.cumActual,
    ]);
  });
  push([
    '', 'รวม', '', '', 100,
    '', '', '', sheet.actualPct,
    '', '', sheet.plannedPct, sheet.actualPct,
  ]);
  lines.push('');

  push(['สะสมรายสัปดาห์ (S-Curve)']);
  push(['สัปดาห์', 'วันที่', 'สะสมแผน %', 'สะสมจริง %']);
  const weeks = sheet.weeks || [];
  const periods = sheet.densePeriods || [];
  weeks.forEach((w, i) => {
    let period = periods.find((p) => p.t === w.t);
    if (!period) {
      period = [...periods].reverse().find((p) => p.t <= w.t) || periods[0];
    }
    push([
      w.label || `W${w.weekNo || i + 1}`,
      isoDate(w.t),
      period?.planned ?? '',
      period?.actual ?? '',
    ]);
  });
  // Ensure final end point is included if different from last week tick
  const lastWeek = weeks[weeks.length - 1];
  const endPeriod = periods[periods.length - 1];
  if (endPeriod && lastWeek && endPeriod.t !== lastWeek.t) {
    push(['สิ้นสุดโครงการ', isoDate(endPeriod.t), endPeriod.planned, endPeriod.actual]);
  }

  return lines.join('\r\n');
}

/** Download S-Curve as .csv (opens in Excel) */
export function downloadSCurveExcel(project, sheet) {
  const csv = buildSCurveCsv(project, sheet);
  if (!csv) throw new Error('ไม่มีข้อมูล S-Curve ให้ส่งออก');
  const stamp = isoDate(Date.now()).replace(/-/g, '');
  const filename = `SCurve_${safeFilePart(project?.name)}_${stamp}.csv`;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
  return filename;
}

function thaiShort(msOrIso) {
  if (!msOrIso) return '—';
  const d = typeof msOrIso === 'number' ? new Date(msOrIso) : new Date(msOrIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function svgToImage(svgEl, width, height) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('สร้างภาพกราฟไม่สำเร็จ'));
      img.src = svgUrl;
    });
    return img;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Download editable SVG of the chart */
export async function downloadSCurveSvg(svgEl, project) {
  if (!svgEl) throw new Error('ไม่พบกราฟ S-Curve');
  const vb = svgEl.viewBox?.baseVal;
  const width = Math.max(1, Math.round(vb?.width || svgEl.clientWidth || 960));
  const height = Math.max(1, Math.round(vb?.height || svgEl.clientHeight || 400));
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const stamp = isoDate(Date.now()).replace(/-/g, '');
  const filename = `SCurve_${safeFilePart(project?.name)}_${stamp}.svg`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  triggerDownload(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), filename);
  return filename;
}

/**
 * Export full plan sheet (title + summary + milestone table + chart) as a beautiful PNG.
 * PNG is not editable; use SVG/Excel for editing.
 */
export async function downloadSCurvePng(svgEl, project, sheet) {
  if (!svgEl) throw new Error('ไม่พบกราฟ S-Curve');
  if (!sheet?.rows?.length) throw new Error('ไม่มีแผนงานให้ส่งออก');

  const vb = svgEl.viewBox?.baseVal;
  const chartW = Math.max(1, Math.round(vb?.width || svgEl.clientWidth || 960));
  const chartH = Math.max(1, Math.round(vb?.height || svgEl.clientHeight || 400));
  const chartImg = await svgToImage(svgEl, chartW, chartH);

  const pad = 36;
  const tableRowH = 34;
  const headerH = 132;
  const summaryH = 78;
  const tableHeaderH = 38;
  const tableH = tableHeaderH + sheet.rows.length * tableRowH + 12;
  const chartPadTop = 28;
  const width = Math.max(1180, chartW + pad * 2);
  const height = pad + headerH + summaryH + tableH + chartPadTop + chartH + pad + 24;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(1, '#ffffff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Header band
  const head = ctx.createLinearGradient(0, 0, width, 0);
  head.addColorStop(0, '#0f766e');
  head.addColorStop(1, '#0369a1');
  ctx.fillStyle = head;
  roundRect(ctx, pad / 2, pad / 2, width - pad, headerH - 12, 18);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px Manrope, Sarabun, sans-serif';
  ctx.fillText('แผนงาน · Gantt · S-Curve', pad + 18, pad / 2 + 42);
  ctx.font = '700 18px Sarabun, sans-serif';
  ctx.fillText(String(project?.name || 'โปรเจกต์'), pad + 18, pad / 2 + 74);
  ctx.font = '600 13px Sarabun, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(
    `ช่วง ${thaiShort(sheet.start)} → ${thaiShort(sheet.end)}  ·  ส่งออก ${thaiShort(Date.now())}`,
    pad + 18,
    pad / 2 + 100
  );

  // Summary cards
  const ySum = pad / 2 + headerH;
  const cards = [
    { label: 'ความคืบหน้าจริง', val: `${sheet.actualPct}%`, color: '#e11d48' },
    { label: 'ตามแผน (ถึงวันนี้)', val: `${sheet.plannedPct}%`, color: '#2563eb' },
    { label: 'ส่วนต่าง', val: `${Math.round((sheet.actualPct - sheet.plannedPct) * 10) / 10}%`, color: sheet.actualPct >= sheet.plannedPct ? '#059669' : '#e11d48' },
    { label: 'ขั้นตอน', val: String(sheet.rows.length), color: '#0f766e' },
  ];
  const cardW = (width - pad * 2 - 24) / 4;
  cards.forEach((c, i) => {
    const x = pad + i * (cardW + 8);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, ySum, cardW, 62, 14);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    roundRect(ctx, x, ySum, cardW, 62, 14);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '700 11px Sarabun, sans-serif';
    ctx.fillText(c.label, x + 14, ySum + 22);
    ctx.fillStyle = c.color;
    ctx.font = '800 24px Manrope, Sarabun, sans-serif';
    ctx.fillText(c.val, x + 14, ySum + 48);
  });

  // Milestone table
  const yTable = ySum + summaryH;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, pad, yTable, width - pad * 2, tableH, 16);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  roundRect(ctx, pad, yTable, width - pad * 2, tableH, 16);
  ctx.stroke();

  const cols = [
    { key: 'no', label: '#', w: 40 },
    { key: 'title', label: 'ขั้นตอน', w: 320 },
    { key: 'weight', label: 'น้ำหนัก', w: 70 },
    { key: 'start', label: 'เริ่มแผน', w: 120 },
    { key: 'end', label: 'สิ้นสุดแผน', w: 120 },
    { key: 'done', label: 'เสร็จจริง', w: 120 },
    { key: 'progress', label: '%', w: 56 },
    { key: 'status', label: 'สถานะ', w: 140 },
  ];
  let xCol = pad + 16;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(pad + 1, yTable + 1, width - pad * 2 - 2, tableHeaderH);
  ctx.fillStyle = '#475569';
  ctx.font = '800 11px Sarabun, sans-serif';
  cols.forEach((col) => {
    ctx.fillText(col.label, xCol, yTable + 24);
    xCol += col.w;
  });

  sheet.rows.forEach((row, i) => {
    const y = yTable + tableHeaderH + i * tableRowH;
    if (i % 2 === 0) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(pad + 1, y, width - pad * 2 - 2, tableRowH);
    }
    const values = [
      String(row.no),
      String(row.title || ''),
      `${row.weightPct}%`,
      thaiShort(row.plannedStart),
      thaiShort(row.plannedEnd),
      thaiShort(row.completedAt),
      `${row.progress}`,
      row.completed ? 'เสร็จแล้ว' : String(row.actualStatus || row.planStatus || '—'),
    ];
    let x = pad + 16;
    values.forEach((val, ci) => {
      ctx.fillStyle = row.completed ? '#047857' : '#1e293b';
      ctx.font = ci === 1 ? '700 12px Sarabun, sans-serif' : '600 12px Sarabun, sans-serif';
      const text = String(val);
      const maxW = cols[ci].w - 8;
      let draw = text;
      while (ctx.measureText(draw).width > maxW && draw.length > 1) {
        draw = `${draw.slice(0, -2)}…`;
      }
      ctx.fillText(draw, x, y + 22);
      x += cols[ci].w;
    });
  });

  // Chart
  const yChart = yTable + tableH + chartPadTop;
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 14px Sarabun, sans-serif';
  ctx.fillText('แผนภาพ Gantt / S-Curve', pad, yChart - 10);
  const chartX = pad;
  ctx.drawImage(chartImg, chartX, yChart, chartW, chartH);

  const stamp = isoDate(Date.now()).replace(/-/g, '');
  const filename = `Plan_SCurve_${safeFilePart(project?.name)}_${stamp}.png`;
  await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('สร้างไฟล์ภาพไม่สำเร็จ'));
        return;
      }
      triggerDownload(blob, filename);
      resolve(filename);
    }, 'image/png');
  });
  return filename;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
