import React from 'react';
import { getProjectTimeProgress } from './projectTime';

/**
 * Time “energy” bar: how far along the calendar window start→end.
 */
export default function ProjectTimeBar({ startDate, endDate, compact = false }) {
  const t = getProjectTimeProgress(startDate, endDate);

  if (!t.ready) {
    return (
      <div className={compact ? 'mt-2' : 'mt-3'}>
        <p className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          ยังไม่ได้ตั้งวันเริ่ม–สิ้นสุดโครงการ
        </p>
      </div>
    );
  }

  const barColor =
    t.status === 'ended'
      ? 'bg-rose-500'
      : t.status === 'not_started'
        ? 'bg-slate-300'
        : t.elapsedPct >= 85
          ? 'bg-amber-500'
          : 'bg-gradient-to-r from-sky-500 to-blue-600';

  const statusLabel =
    t.status === 'ended'
      ? `ครบกำหนดแล้ว${t.overDays ? ` (เลยมา ${t.overDays} วัน)` : ''}`
      : t.status === 'not_started'
        ? 'ยังไม่ถึงวันเริ่ม'
        : 'กำลังดำเนินตามปฏิทิน';

  return (
    <div className={compact ? 'mt-2' : 'mt-3'} onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-end gap-2 mb-1.5">
        <span className={`font-extrabold text-slate-700 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          แถบเวลาโครงการ
        </span>
        <span className={`font-black tabular-nums ${compact ? 'text-[11px]' : 'text-xs'} ${
          t.status === 'ended' ? 'text-rose-600' : 'text-blue-700'
        }`}>
          ผ่านไป {t.elapsedPct}%
        </span>
      </div>
      <div className={`relative w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 ${compact ? 'h-2.5' : 'h-3.5'}`}>
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(t.elapsedPct, t.status === 'not_started' ? 0 : 2)}%` }}
        />
      </div>
      <div className={`flex flex-wrap justify-between gap-x-3 gap-y-1 mt-1.5 font-bold text-slate-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        <span>{statusLabel}</span>
        <span className="text-slate-700">
          เหลือ <span className="text-emerald-700">{t.remainingDays}</span> วัน
          {' · '}
          <span className="text-emerald-700">{t.remainingPct}%</span>
        </span>
      </div>
      {!compact && (
        <p className="text-[10px] text-slate-400 font-medium mt-1">
          รวม {t.totalDays} วัน · ผ่านมาแล้ว {t.elapsedDays} วัน
        </p>
      )}
    </div>
  );
}
