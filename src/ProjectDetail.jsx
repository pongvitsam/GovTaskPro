import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Plus, Trash2,
  Settings2, LineChart, ListChecks, KanbanSquare, Loader2, Save
} from 'lucide-react';
import { buildSCurve, buildSCurveSheet, toTimelinePolyline, toTimelinePoints, timeToRatio } from './sCurve';
import { formatThaiDate } from './formatThaiDate';
import ProjectTimeBar from './ProjectTimeBar';

const TABS = [
  { id: 'plan', label: 'แผนงาน / ขั้นตอน', icon: ListChecks },
  { id: 'scurve', label: 'S-Curve', icon: LineChart },
  { id: 'settings', label: 'ตั้งค่าโปรเจกต์', icon: Settings2 },
];

function toInputDate(v) {
  if (!v) return '';
  return String(v).slice(0, 10);
}

const ROW_H = 44;
const HEADER_H = 42;
const CURVE_PAD_Y = 10;
const WEEK_COL_W = 56;

function MilestoneEditor({ m, idx, busy, onUpdate, onDelete }) {
  const [draft, setDraft] = useState({
    title: m.title || '',
    description: m.description || '',
    plannedStart: toInputDate(m.plannedStart),
    plannedEnd: toInputDate(m.plannedEnd),
    weight: m.weight ?? 1,
    completed: !!m.completed,
    completedAt: toInputDate(m.completedAt),
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft({
      title: m.title || '',
      description: m.description || '',
      plannedStart: toInputDate(m.plannedStart),
      plannedEnd: toInputDate(m.plannedEnd),
      weight: m.weight ?? 1,
      completed: !!m.completed,
      completedAt: toInputDate(m.completedAt),
    });
    setDirty(false);
  }, [m.id, m.title, m.description, m.plannedStart, m.plannedEnd, m.weight, m.completed, m.completedAt]);

  const setField = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'completed' && value && !prev.completedAt) {
        next.completedAt = new Date().toISOString().slice(0, 10);
      }
      if (key === 'completed' && !value) {
        next.completedAt = '';
      }
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) return;
    await onUpdate({
      id: m.id,
      title: draft.title.trim(),
      description: draft.description,
      plannedStart: draft.plannedStart || null,
      plannedEnd: draft.plannedEnd || null,
      weight: Number(draft.weight) || 1,
      completed: !!draft.completed,
      completedAt: draft.completed ? (draft.completedAt || new Date().toISOString()) : null,
    });
    setDirty(false);
  };

  return (
    <div className={`px-4 py-4 space-y-3 ${draft.completed ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-xs font-black text-slate-400 w-6 pt-3">{idx + 1}.</span>
        <label className="flex items-center gap-2 pt-2.5 shrink-0">
          <input
            type="checkbox"
            checked={draft.completed}
            disabled={busy}
            onChange={(e) => setField('completed', e.target.checked)}
            className="w-5 h-5 accent-emerald-600"
          />
          <span className="text-[11px] font-bold text-slate-500">เสร็จ</span>
        </label>
        <input
          value={draft.title}
          disabled={busy}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="ชื่องาน/ขั้นตอน"
          className="flex-1 min-w-[180px] border border-slate-100 rounded-2xl px-3 py-2 text-sm font-bold outline-none focus:border-teal-400 disabled:bg-slate-50"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(m.id)}
          className="text-rose-500 hover:bg-rose-50 p-2 rounded-2xl disabled:opacity-50"
          title="ลบ"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <textarea
        rows={2}
        value={draft.description}
        disabled={busy}
        onChange={(e) => setField('description', e.target.value)}
        placeholder="รายละเอียด"
        className="w-full border border-slate-100 rounded-2xl px-3 py-2 text-sm font-medium outline-none focus:border-teal-400 disabled:bg-slate-50"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block">วันเริ่ม (แผน)</label>
          <input
            type="date"
            value={draft.plannedStart}
            disabled={busy}
            onChange={(e) => setField('plannedStart', e.target.value)}
            className="w-full border border-slate-100 rounded-2xl px-2 py-2 text-xs font-bold outline-none focus:border-teal-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block">วันสิ้นสุด (แผน)</label>
          <input
            type="date"
            value={draft.plannedEnd}
            disabled={busy}
            onChange={(e) => setField('plannedEnd', e.target.value)}
            className="w-full border border-slate-100 rounded-2xl px-2 py-2 text-xs font-bold outline-none focus:border-teal-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block">น้ำหนัก S-Curve</label>
          <input
            type="number"
            min="1"
            max="100"
            value={draft.weight}
            disabled={busy}
            onChange={(e) => setField('weight', e.target.value)}
            className="w-full border border-slate-100 rounded-2xl px-2 py-2 text-xs font-bold outline-none focus:border-teal-400"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block">วันเสร็จจริง</label>
          <input
            type="date"
            value={draft.completedAt}
            disabled={busy || !draft.completed}
            onChange={(e) => setField('completedAt', e.target.value)}
            className="w-full border border-slate-100 rounded-2xl px-2 py-2 text-xs font-bold outline-none focus:border-teal-400 disabled:bg-slate-50"
          />
        </div>
      </div>
      {dirty && (
        <button
          type="button"
          disabled={busy || !draft.title.trim()}
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          บันทึกขั้นตอนนี้
        </button>
      )}
    </div>
  );
}

export default function ProjectDetail({
  project,
  milestones,
  tasks,
  currentUser,
  busy,
  onBack,
  onOpenBoard,
  onSaveProject,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  showToast,
}) {
  const [tab, setTab] = useState('plan');
  const [settings, setSettings] = useState({
    name: project?.name || '',
    description: project?.description || '',
    startDate: toInputDate(project?.startDate),
    endDate: toInputDate(project?.endDate),
  });

  useEffect(() => {
    setSettings({
      name: project?.name || '',
      description: project?.description || '',
      startDate: toInputDate(project?.startDate),
      endDate: toInputDate(project?.endDate),
    });
  }, [project?.id, project?.name, project?.description, project?.startDate, project?.endDate]);

  const [newMs, setNewMs] = useState({
    title: '',
    description: '',
    plannedStart: toInputDate(project?.startDate),
    plannedEnd: toInputDate(project?.endDate),
    weight: 10,
  });

  const projectMilestones = useMemo(
    () => (milestones || [])
      .filter((m) => m.projectId === project.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [milestones, project.id]
  );

  const progress = useMemo(() => {
    const c = buildSCurve(project, projectMilestones, { maxPoints: 2 });
    return { actualPct: c.actualPct, plannedPct: c.plannedPct };
  }, [project, projectMilestones]);

  const sheet = useMemo(
    () => (tab === 'scurve' ? buildSCurveSheet(project, projectMilestones) : null),
    [tab, project, projectMilestones]
  );

  const weekTicks = sheet?.weeks || sheet?.months || [];
  const timelineW = Math.max(720, weekTicks.length * WEEK_COL_W);
  const timelineH = sheet ? Math.max(HEADER_H + sheet.rows.length * ROW_H, HEADER_H + 120) : HEADER_H + 120;
  const curveH = timelineH - HEADER_H;

  const plannedLine = sheet
    ? toTimelinePolyline(sheet.densePeriods, 'planned', timelineW, curveH, sheet.start, sheet.end, CURVE_PAD_Y)
    : '';
  const actualLine = sheet
    ? toTimelinePolyline(sheet.densePeriods, 'actual', timelineW, curveH, sheet.start, sheet.end, CURVE_PAD_Y)
    : '';
  const actualPts = sheet
    ? toTimelinePoints(sheet.densePeriods, 'actual', timelineW, curveH, sheet.start, sheet.end, CURVE_PAD_Y)
      .filter((p, i, arr) => i === 0 || i === arr.length - 1 || p.value !== arr[i - 1].value)
    : [];
  const todayX = sheet ? timeToRatio(sheet.today, sheet.start, sheet.end) * timelineW : 0;

  const canEdit = !!currentUser;
  const doneCount = projectMilestones.filter((m) => m.completed).length;

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('กรุณาเข้าสู่ระบบก่อนแก้ไข');
      return;
    }
    await onSaveProject({
      id: project.id,
      name: settings.name,
      description: settings.description,
      startDate: settings.startDate || null,
      endDate: settings.endDate || null,
    });
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('กรุณาเข้าสู่ระบบก่อนเพิ่มขั้นตอน');
      return;
    }
    if (!newMs.title.trim()) return;
    await onCreateMilestone({
      projectId: project.id,
      title: newMs.title.trim(),
      description: newMs.description,
      plannedStart: newMs.plannedStart || null,
      plannedEnd: newMs.plannedEnd || null,
      weight: Number(newMs.weight) || 1,
      sortOrder: projectMilestones.length + 1,
    });
    setNewMs({
      title: '',
      description: '',
      plannedStart: settings.startDate || toInputDate(project.startDate),
      plannedEnd: settings.endDate || toInputDate(project.endDate),
      weight: 10,
    });
  };

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={onBack} className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับรายการโปรเจกต์
          </button>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{project.name}</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-3xl">{project.description || 'ยังไม่มีรายละเอียด'}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center">
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {formatThaiDate(project.startDate)} → {formatThaiDate(project.endDate)}
            </span>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ขั้นตอนเสร็จ {doneCount}/{projectMilestones.length}
            </span>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              จริง {progress.actualPct}% · แผน {progress.plannedPct}%
            </span>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              งานในบอร์ด {tasks.filter((t) => t.projectId === project.id).length}
            </span>
          </div>
          <div className="mt-4 max-w-xl">
            <ProjectTimeBar startDate={project.startDate} endDate={project.endDate} />
          </div>
        </div>
        <button
          onClick={onOpenBoard}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center shadow-md shrink-0"
        >
          <KanbanSquare className="w-4 h-4 mr-2" /> เปิดกระดานงาน
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar bg-slate-100 p-1.5 rounded-2xl w-fit max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center px-4 py-2.5 rounded-2xl text-sm font-extrabold whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon className="w-4 h-4 mr-2" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm max-w-3xl space-y-5">
          <h3 className="font-extrabold text-slate-800 text-lg">ตั้งค่ารายละเอียดโปรเจกต์</h3>
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">ชื่อโปรเจกต์</label>
            <input
              required
              disabled={!canEdit || busy}
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full border border-slate-100 rounded-2xl p-3.5 font-medium outline-none focus:border-teal-400 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">รายละเอียด</label>
            <textarea
              disabled={!canEdit || busy}
              rows={3}
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="w-full border border-slate-100 rounded-2xl p-3.5 font-medium outline-none focus:border-teal-400 disabled:bg-slate-50"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">วันเริ่มบริหารโครงการ</label>
              <input
                type="date"
                disabled={!canEdit || busy}
                value={settings.startDate}
                onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                className="w-full border border-slate-100 rounded-2xl p-3.5 font-bold outline-none focus:border-teal-400 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">วันสิ้นสุดโครงการ</label>
              <input
                type="date"
                disabled={!canEdit || busy}
                value={settings.endDate}
                onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                className="w-full border border-slate-100 rounded-2xl p-3.5 font-bold outline-none focus:border-teal-400 disabled:bg-slate-50"
              />
            </div>
          </div>
          <button type="submit" disabled={busy || !canEdit} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-extrabold flex items-center disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            บันทึกการตั้งค่า
          </button>
        </form>
      )}

      {tab === 'plan' && (
        <div className="space-y-6">
          <form onSubmit={handleAddMilestone} className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800">เพิ่มขั้นตอน / งานในแผน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                placeholder="ชื่องาน/ขั้นตอน *"
                value={newMs.title}
                onChange={(e) => setNewMs({ ...newMs, title: e.target.value })}
                className="border border-slate-100 rounded-2xl p-3 font-medium outline-none focus:border-teal-400 md:col-span-2"
              />
              <input
                placeholder="รายละเอียด"
                value={newMs.description}
                onChange={(e) => setNewMs({ ...newMs, description: e.target.value })}
                className="border border-slate-100 rounded-2xl p-3 font-medium outline-none focus:border-teal-400 md:col-span-2"
              />
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">วันเริ่ม (แผน)</label>
                <input type="date" value={newMs.plannedStart} onChange={(e) => setNewMs({ ...newMs, plannedStart: e.target.value })} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">วันสิ้นสุด (แผน)</label>
                <input type="date" value={newMs.plannedEnd} onChange={(e) => setNewMs({ ...newMs, plannedEnd: e.target.value })} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">น้ำหนัก (%) สำหรับ S-Curve</label>
                <input type="number" min="1" max="100" value={newMs.weight} onChange={(e) => setNewMs({ ...newMs, weight: e.target.value })} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" />
              </div>
            </div>
            <button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center disabled:opacity-60">
              <Plus className="w-4 h-4 mr-1.5" /> เพิ่มขั้นตอน
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-sm">รายการขั้นตอน — แก้ไขได้ทั้งหมด</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">แก้ชื่อ รายละเอียด วันที่ น้ำหนัก และวันเสร็จจริง แล้วกดบันทึก</p>
            </div>
            <div className="divide-y divide-slate-100">
              {projectMilestones.map((m, idx) => (
                <MilestoneEditor
                  key={m.id}
                  m={m}
                  idx={idx}
                  busy={busy}
                  onUpdate={onUpdateMilestone}
                  onDelete={onDeleteMilestone}
                />
              ))}
              {projectMilestones.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-slate-500">ยังไม่มีขั้นตอนในแผน</p>
                  <p className="text-xs mt-1">เพิ่มงานย่อยในช่วงเวลาโครงการ เพื่อสร้าง S-Curve</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'scurve' && sheet && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'ความคืบหน้าจริง', val: `${sheet.actualPct}%`, c: 'text-rose-600' },
              { label: 'ตามแผน (ถึงวันนี้)', val: `${sheet.plannedPct}%`, c: 'text-blue-600' },
              { label: 'ส่วนต่าง', val: `${Math.round((sheet.actualPct - sheet.plannedPct) * 10) / 10}%`, c: sheet.actualPct >= sheet.plannedPct ? 'text-emerald-600' : 'text-rose-600' },
              { label: 'จำนวนสัปดาห์', val: String(weekTicks.length), c: 'text-slate-800' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-black ${s.c}`}>{s.val}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">แผนงาน · Gantt · S-Curve (รายสัปดาห์)</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">คอลัมน์แกนเวลา = สัปดาห์ (W1, W2, …) · แท่งแผน + เส้นสะสม</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] font-bold">
                <span className="flex items-center text-blue-700"><span className="w-5 h-2.5 rounded-sm bg-blue-500 mr-1.5" />ระยะแผน</span>
                <span className="flex items-center text-rose-600"><span className="w-5 h-0.5 bg-rose-500 mr-1.5" />สะสมจริง</span>
                <span className="flex items-center text-slate-500"><span className="w-5 border-t border-dashed border-teal-400 mr-1.5" />สะสมแผน</span>
              </div>
            </div>

            {sheet.rows.length === 0 ? (
              <p className="text-center text-slate-400 py-16 font-bold">เพิ่มขั้นตอนในแท็บแผนงานก่อน เพื่อแสดง S-Curve</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex min-w-[960px]">
                  <div className="shrink-0 w-[420px] border-r border-slate-200 bg-white">
                    <div
                      className="grid grid-cols-[36px_1fr_52px_72px_72px_48px] gap-0 text-[10px] font-extrabold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200"
                      style={{ height: HEADER_H }}
                    >
                      <div className="flex items-center justify-center px-1">#</div>
                      <div className="flex items-center px-2">รายการ / ขั้นตอน</div>
                      <div className="flex items-center justify-end px-1">น้ำหนัก</div>
                      <div className="flex items-center px-1">เริ่ม</div>
                      <div className="flex items-center px-1">สิ้นสุด</div>
                      <div className="flex items-center justify-end px-2">%</div>
                    </div>
                    {sheet.rows.map((row) => (
                      <div
                        key={row.id}
                        className={`grid grid-cols-[36px_1fr_52px_72px_72px_48px] border-b border-slate-100 text-[11px] ${
                          row.completed ? 'bg-emerald-50/50' : 'bg-white'
                        }`}
                        style={{ height: ROW_H }}
                      >
                        <div className="flex items-center justify-center font-bold text-slate-500">{row.no}</div>
                        <div className="flex flex-col justify-center px-2 min-w-0">
                          <p className={`font-bold truncate ${row.completed ? 'text-emerald-800' : 'text-slate-800'}`}>{row.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            แผน: {row.planStatus} · จริง: {row.actualStatus}
                          </p>
                        </div>
                        <div className="flex items-center justify-end px-1 font-extrabold text-teal-700">{row.weightPct}%</div>
                        <div className="flex items-center px-1 font-bold text-slate-600 leading-tight">
                          {formatThaiDate(row.plannedStart, { localeOptions: { day: 'numeric', month: 'short', year: '2-digit' } })}
                        </div>
                        <div className="flex items-center px-1 font-bold text-slate-600 leading-tight">
                          {formatThaiDate(row.plannedEnd, { localeOptions: { day: 'numeric', month: 'short', year: '2-digit' } })}
                        </div>
                        <div className={`flex items-center justify-end px-2 font-black ${row.progress === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {row.progress}
                        </div>
                      </div>
                    ))}
                    <div
                      className="grid grid-cols-[36px_1fr_52px_72px_72px_48px] bg-slate-100 border-t border-slate-200 text-[11px] font-extrabold"
                      style={{ height: ROW_H }}
                    >
                      <div />
                      <div className="flex items-center px-2 text-slate-700">รวม / สะสมจริง</div>
                      <div className="flex items-center justify-end px-1 text-teal-700">100%</div>
                      <div />
                      <div />
                      <div className="flex items-center justify-end px-2 text-rose-600">{sheet.actualPct}</div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[480px] relative bg-slate-50/40">
                    <svg
                      viewBox={`0 0 ${timelineW} ${timelineH}`}
                      className="w-full h-auto block"
                      style={{ minHeight: timelineH, minWidth: timelineW }}
                    >
                      <rect x="0" y="0" width={timelineW} height={HEADER_H} fill="#f8fafc" />
                      {weekTicks.map((w, wi) => {
                        const x = timeToRatio(w.t, sheet.start, sheet.end) * timelineW;
                        const nextT = weekTicks[wi + 1]?.t ?? sheet.end;
                        const x2 = timeToRatio(nextT, sheet.start, sheet.end) * timelineW;
                        const colW = Math.max(0, x2 - x);
                        return (
                          <g key={`w-${w.t}-${w.weekNo}`}>
                            {wi % 2 === 1 && (
                              <rect x={x} y={0} width={colW || WEEK_COL_W} height={timelineH} fill="#f1f5f9" opacity="0.45" />
                            )}
                            <line x1={x} y1={0} x2={x} y2={timelineH} stroke="#cbd5e1" strokeWidth="1" />
                            <text x={x + 4} y={16} fontSize="10" fill="#334155" fontWeight="800">{w.label}</text>
                            <text x={x + 4} y={30} fontSize="8" fill="#94a3b8" fontWeight="600">{w.sublabel}</text>
                          </g>
                        );
                      })}
                      <line x1="0" y1={HEADER_H} x2={timelineW} y2={HEADER_H} stroke="#e2e8f0" strokeWidth="1" />

                      {sheet.rows.map((row, i) => {
                        const y = HEADER_H + i * ROW_H;
                        const barX = row.barStart * timelineW;
                        const barW = Math.max(6, (row.barEnd - row.barStart) * timelineW);
                        return (
                          <g key={row.id}>
                            <rect
                              x="0"
                              y={y}
                              width={timelineW}
                              height={ROW_H}
                              fill={i % 2 === 0 ? '#ffffff' : '#f8fafc'}
                              opacity="0.55"
                            />
                            <line x1="0" y1={y + ROW_H} x2={timelineW} y2={y + ROW_H} stroke="#f1f5f9" strokeWidth="1" />
                            <rect
                              x={barX}
                              y={y + 14}
                              width={barW}
                              height={16}
                              rx="4"
                              fill={row.completed ? '#34d399' : '#3b82f6'}
                              opacity="0.85"
                            />
                          </g>
                        );
                      })}

                      {sheet.today >= sheet.start && sheet.today <= sheet.end && (
                        <g>
                          <line x1={todayX} y1={HEADER_H} x2={todayX} y2={timelineH} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                          <text x={todayX + 3} y={HEADER_H + 12} fontSize="9" fill="#d97706" fontWeight="800">วันนี้</text>
                        </g>
                      )}

                      <g transform={`translate(0, ${HEADER_H})`}>
                        {[0, 25, 50, 75, 100].map((pct) => {
                          const y = CURVE_PAD_Y + (curveH - CURVE_PAD_Y * 2) * (1 - pct / 100);
                          return (
                            <g key={pct}>
                              <line x1="0" y1={y} x2={timelineW} y2={y} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6" />
                              <text x="4" y={y - 2} fontSize="9" fill="#94a3b8" fontWeight="700">{pct}%</text>
                            </g>
                          );
                        })}
                        {plannedLine && (
                          <polyline
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={plannedLine}
                            opacity="0.85"
                          />
                        )}
                        {actualLine && (
                          <polyline
                            fill="none"
                            stroke="#e11d48"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={actualLine}
                          />
                        )}
                        {actualPts.map((p) => (
                          <g key={`n-${p.t}-${p.value}`}>
                            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#e11d48" strokeWidth="2" />
                            <text x={p.x + 6} y={p.y - 6} fontSize="9" fill="#be123c" fontWeight="800">{p.value}%</text>
                          </g>
                        ))}
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
