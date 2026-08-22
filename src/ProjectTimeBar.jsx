import React, { useMemo } from 'react';
import { getProjectTimeProgress } from './projectTime';
import { formatThaiDate } from './formatThaiDate';
import { partyTheme } from './contractParty';

const DAY = 86400000;

function toDay(iso) {
  if (!iso) return null;
  const t = new Date(iso).setHours(0, 0, 0, 0);
  return Number.isNaN(t) ? null : t;
}

function SingleTimeBar({ label, startDate, endDate, theme, compact }) {
  const t = getProjectTimeProgress(startDate, endDate);
  if (!t.ready) return null;

  const barColor =
    t.status === 'ended'
      ? theme.barEnded
      : t.status === 'not_started'
        ? theme.barIdle
        : theme.barFill;

  const statusLabel =
    t.status === 'ended'
      ? `ครบกำหนด${t.overDays ? ` (เลย ${t.overDays} วัน)` : ''}`
      : t.status === 'not_started'
        ? 'ยังไม่เริ่ม'
        : `กำลังดำเนินการ · เหลือ ${t.remainingDays} วัน`;

  return (
    <div className={`rounded-2xl border ${theme.border} bg-white/70 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex flex-wrap justify-between items-end gap-2 mb-1.5">
        <span className={`font-extrabold ${theme.text} ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {label}
        </span>
        <span className={`font-black tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'} ${
          t.status === 'ended' ? 'text-rose-600' : theme.text
        }`}>
          {t.elapsedPct}%
        </span>
      </div>
      <div className={`relative w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 ${compact ? 'h-2' : 'h-2.5'}`}>
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(t.elapsedPct, t.status === 'not_started' ? 0 : 2)}%` }}
        />
      </div>
      <div className={`flex flex-wrap justify-between gap-x-2 gap-y-0.5 mt-1 font-bold text-slate-500 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <span>{formatThaiDate(startDate)} → {formatThaiDate(endDate)}</span>
        <span>{statusLabel}</span>
      </div>
      {!compact && (
        <p className="text-[9px] text-slate-400 font-medium mt-0.5">
          รวม {t.totalDays} วัน · ผ่านมา {t.elapsedDays} วัน
        </p>
      )}
    </div>
  );
}

/**
 * Dual (or triple) contract timeline — customer vs contractor vs project admin window.
 */
export default function ProjectTimeBar({
  startDate,
  endDate,
  customerStartDate,
  customerEndDate,
  contractorStartDate,
  contractorEndDate,
  compact = false,
}) {
  const lanes = useMemo(() => {
    const list = [];
    if (customerStartDate && customerEndDate) {
      list.push({
        key: 'customer',
        label: partyTheme('customer').label,
        start: customerStartDate,
        end: customerEndDate,
        theme: partyTheme('customer'),
      });
    }
    if (contractorStartDate && contractorEndDate) {
      list.push({
        key: 'contractor',
        label: partyTheme('contractor').label,
        start: contractorStartDate,
        end: contractorEndDate,
        theme: partyTheme('contractor'),
      });
    }
    const hasDual = list.length > 0;
    const projectStart = startDate;
    const projectEnd = endDate;
    const showProject =
      projectStart &&
      projectEnd &&
      (!hasDual ||
        toDay(projectStart) !== toDay(customerStartDate) ||
        toDay(projectEnd) !== toDay(customerEndDate) ||
        toDay(projectStart) !== toDay(contractorStartDate) ||
        toDay(projectEnd) !== toDay(contractorEndDate));

    if (showProject) {
      list.push({
        key: 'project',
        label: partyTheme('project').label,
        start: projectStart,
        end: projectEnd,
        theme: partyTheme('project'),
      });
    }
    if (!list.length && projectStart && projectEnd) {
      list.push({
        key: 'project',
        label: partyTheme('project').label,
        start: projectStart,
        end: projectEnd,
        theme: partyTheme('project'),
      });
    }
    return list;
  }, [
    startDate, endDate,
    customerStartDate, customerEndDate,
    contractorStartDate, contractorEndDate,
  ]);

  const scale = useMemo(() => {
    let min = null;
    let max = null;
    lanes.forEach((lane) => {
      const s = toDay(lane.start);
      const e = toDay(lane.end);
      if (s != null) min = min == null ? s : Math.min(min, s);
      if (e != null) max = max == null ? e : Math.max(max, e);
    });
    if (min == null || max == null) return null;
    const spanDays = Math.max(1, Math.round((max - min) / DAY) + 1);
    return { min, max, spanDays };
  }, [lanes]);

  if (!lanes.length) {
    return (
      <div className={compact ? 'mt-2' : 'mt-3'}>
        <p className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          ยังไม่ได้ตั้งช่วงสัญญา / วันเริ่ม–สิ้นสุดโครงการ
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? 'mt-2 space-y-2' : 'mt-3 space-y-2.5'} onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-extrabold text-slate-700 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          แถบเวลาโครงการ (แยกตามสัญญา)
        </span>
        {scale && !compact && (
          <span className="text-[10px] font-bold text-slate-400">
            กรอบรวม {scale.spanDays} วัน
          </span>
        )}
      </div>

      {lanes.length >= 2 && scale && (
        <div className={`relative rounded-xl bg-slate-50 border border-slate-200 overflow-hidden ${compact ? 'h-3' : 'h-4'}`}>
          {lanes.map((lane) => {
            const s = toDay(lane.start);
            const e = toDay(lane.end);
            if (s == null || e == null) return null;
            const left = ((s - scale.min) / (scale.max - scale.min)) * 100;
            const width = Math.max(2, ((e - s) / (scale.max - scale.min)) * 100);
            return (
              <div
                key={`overview-${lane.key}`}
                className={`absolute top-0.5 bottom-0.5 rounded-sm opacity-90 ${lane.theme.barFill}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${lane.label}: ${formatThaiDate(lane.start)} → ${formatThaiDate(lane.end)}`}
              />
            );
          })}
        </div>
      )}

      {lanes.map((lane) => (
        <SingleTimeBar
          key={lane.key}
          label={lane.label}
          startDate={lane.start}
          endDate={lane.end}
          theme={lane.theme}
          compact={compact}
        />
      ))}

      {lanes.length >= 2 && !compact && (
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
          สีม่วง = สัญญาลูกค้า · สีส้ม = สัญญาผู้รับเหมา · สีฟ้าเขียว = ช่วงบริหารโครงการ
        </p>
      )}
    </div>
  );
}
