import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Plus, Trash2,
  Settings2, LineChart, ListChecks, KanbanSquare, Loader2, Save, Download, ImageDown,
  FileClock, CalendarRange, Milestone, FileText, FileCode2, History, GripVertical,
} from 'lucide-react';
import {
  buildSCurve, buildSCurveSheet, toTimelinePolyline, toTimelinePoints, timeToRatio,
  downloadSCurveExcel, downloadSCurvePng, downloadSCurveSvg,
} from './sCurve';
import { formatThaiDate, formatThaiDateLong } from './formatThaiDate';
import ProjectTimeBar from './ProjectTimeBar';
import ThaiDateField from './ThaiDateField';
import ProjectActivityPanel from './ProjectActivityPanel';
import { api } from './api';
import {
  buildProjectActivityEvents,
  summarizeRecentActivity,
} from './projectActivity';

const TABS = [
  { id: 'activity', label: 'ความเคลื่อนไหว', icon: History },
  { id: 'plan', label: 'แผนงาน / ขั้นตอน', icon: ListChecks },
  { id: 'contract', label: 'ขยายสัญญา', icon: FileClock },
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

function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(`${String(fromDate).slice(0, 10)}T12:00:00`);
  const to = new Date(`${String(toDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.max(0, Math.round((to - from) / 86400000));
}

function reorderMilestones(list, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return list;
  const fromIdx = list.findIndex((m) => String(m.id) === String(fromId));
  const toIdx = list.findIndex((m) => String(m.id) === String(toId));
  if (fromIdx < 0 || toIdx < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

function MilestoneEditor({
  m, idx, busy, onUpdate, onDelete,
  isDragging, isDropTarget, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(m.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(m.id);
      }}
      className={`px-4 py-4 space-y-3 transition-colors ${
        draft.completed ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
      } ${isDragging ? 'opacity-45' : ''} ${
        isDropTarget ? 'bg-teal-50/80 ring-2 ring-inset ring-teal-400' : ''
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <button
          type="button"
          draggable={!busy}
          disabled={busy}
          title="ลากเพื่อสลับลำดับ"
          aria-label="ลากเพื่อสลับลำดับ"
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(m.id));
            onDragStart?.(m.id);
          }}
          onDragEnd={() => onDragEnd?.()}
          className="mt-2 p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 cursor-grab active:cursor-grabbing disabled:opacity-40 disabled:cursor-not-allowed shrink-0 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
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
          <ThaiDateField
            size="sm"
            clearable
            disabled={busy}
            placeholder="วันเริ่ม พ.ศ."
            value={draft.plannedStart}
            onChange={(v) => setField('plannedStart', v)}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block">วันสิ้นสุด (แผน)</label>
          <ThaiDateField
            size="sm"
            clearable
            disabled={busy}
            placeholder="วันสิ้นสุด พ.ศ."
            value={draft.plannedEnd}
            onChange={(v) => setField('plannedEnd', v)}
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
          <ThaiDateField
            size="sm"
            clearable
            disabled={busy || !draft.completed}
            placeholder="วันเสร็จ พ.ศ."
            value={draft.completedAt}
            onChange={(v) => setField('completedAt', v)}
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
  contractExtensions,
  tasks,
  users,
  cachedTaskLogs,
  currentUser,
  busy,
  onBack,
  onOpenBoard,
  onOpenTask,
  onSaveProject,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onReorderMilestones,
  onCreateContractExtension,
  onUpdateContractExtension,
  onDeleteContractExtension,
  showToast,
}) {
  const [tab, setTab] = useState('activity');
  const [exportBusy, setExportBusy] = useState(false);
  const [dragMilestoneId, setDragMilestoneId] = useState(null);
  const [dropMilestoneId, setDropMilestoneId] = useState(null);
  const [projectTaskLogs, setProjectTaskLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoadError, setActivityLoadError] = useState(null);
  const scurveSvgRef = useRef(null);
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

  const projectTasks = useMemo(
    () => (tasks || []).filter((t) => String(t.projectId) === String(project.id)),
    [tasks, project.id],
  );

  useEffect(() => {
    if (!project?.id || tab !== 'activity') return undefined;
    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      setActivityLoadError(null);
      try {
        const data = await api('getProjectActivity', { projectId: project.id });
        if (!cancelled) setProjectTaskLogs(data?.taskLogs || []);
      } catch (err) {
        if (!cancelled) {
          setActivityLoadError(err?.message || String(err));
        }
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [project?.id, tab]);

  const mergedProjectTaskLogs = useMemo(() => {
    const byId = new Map();
    (cachedTaskLogs || []).forEach((l) => {
      const tid = String(l.taskId);
      if (!projectTasks.some((t) => String(t.id) === tid)) return;
      byId.set(String(l.id), l);
    });
    projectTaskLogs.forEach((l) => byId.set(String(l.id), l));
    return [...byId.values()];
  }, [cachedTaskLogs, projectTaskLogs, projectTasks]);

  const [newMs, setNewMs] = useState({
    title: '',
    description: '',
    plannedStart: toInputDate(project?.startDate),
    plannedEnd: toInputDate(project?.endDate),
    weight: 10,
  });

  const projectMilestones = useMemo(
    () => (milestones || [])
      .filter((m) => String(m.projectId) === String(project.id))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [milestones, project.id]
  );

  const projectExtensions = useMemo(
    () => (contractExtensions || [])
      .filter((x) => String(x.projectId) === String(project.id))
      .sort((a, b) => (Number(a.extensionNo) || 0) - (Number(b.extensionNo) || 0)),
    [contractExtensions, project.id]
  );

  const activitySummary = useMemo(() => {
    const events = buildProjectActivityEvents({
      project,
      projectTasks,
      taskLogs: mergedProjectTaskLogs,
      milestones: projectMilestones,
      contractExtensions: projectExtensions,
    });
    return summarizeRecentActivity(events, 7);
  }, [project, projectTasks, mergedProjectTaskLogs, projectMilestones, projectExtensions]);

  const originalContractEnd = projectExtensions[0]?.fromDate || project.endDate;
  const effectiveContractEnd = projectExtensions.reduce((latest, x) => {
    if (!x.toDate) return latest;
    if (!latest || new Date(x.toDate).getTime() > new Date(latest).getTime()) return x.toDate;
    return latest;
  }, project.endDate || null);
  const totalExtensionDays = projectExtensions.reduce(
    (sum, x) => sum + daysBetween(x.fromDate, x.toDate),
    0
  );

  const defaultExtensionMilestone = projectMilestones.find((m) => !m.completed)?.id
    || projectMilestones[projectMilestones.length - 1]?.id
    || '';
  const [newExtension, setNewExtension] = useState({
    fromDate: '',
    toDate: '',
    startMilestoneId: '',
    reason: '',
    approvalRef: '',
    approvedAt: '',
  });

  useEffect(() => {
    setNewExtension({
      fromDate: toInputDate(effectiveContractEnd),
      toDate: '',
      startMilestoneId: defaultExtensionMilestone,
      reason: '',
      approvalRef: '',
      approvedAt: '',
    });
  }, [project.id, effectiveContractEnd, defaultExtensionMilestone, projectExtensions.length]);

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

  const handleExportExcel = () => {
    if (!sheet || exportBusy) return;
    try {
      const name = downloadSCurveExcel(project, sheet);
      showToast(`📥 ส่งออก ${name} แล้ว`);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    }
  };

  const handleExportPng = async () => {
    if (!sheet || exportBusy) return;
    setExportBusy(true);
    try {
      const name = await downloadSCurvePng(scurveSvgRef.current, project, sheet);
      showToast(`📥 ส่งออกแผนงานเต็ม ${name} แล้ว`);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportSvg = async () => {
    if (!sheet || exportBusy) return;
    setExportBusy(true);
    try {
      const name = await downloadSCurveSvg(scurveSvgRef.current, project);
      showToast(`📥 ส่งออก SVG (แก้ไขได้) ${name} แล้ว`);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setExportBusy(false);
    }
  };

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

  const handleMilestoneDrop = async (targetId) => {
    if (!dragMilestoneId || !targetId || dragMilestoneId === targetId || busy || !onReorderMilestones) {
      setDragMilestoneId(null);
      setDropMilestoneId(null);
      return;
    }
    const reordered = reorderMilestones(projectMilestones, dragMilestoneId, targetId);
    const updates = reordered.map((m, i) => ({ id: m.id, sortOrder: i + 1 }));
    setDragMilestoneId(null);
    setDropMilestoneId(null);
    await onReorderMilestones(updates);
  };

  const handleAddContractExtension = async (e) => {
    e.preventDefault();
    if (!canEdit || busy) return;
    if (!newExtension.fromDate || !newExtension.toDate || !newExtension.startMilestoneId || !newExtension.reason.trim()) {
      showToast('กรุณากรอกช่วงวันที่ ขั้นตอน และเหตุผลให้ครบ');
      return;
    }
    const row = await onCreateContractExtension({
      projectId: project.id,
      fromDate: newExtension.fromDate,
      toDate: newExtension.toDate,
      startMilestoneId: newExtension.startMilestoneId,
      reason: newExtension.reason.trim(),
      approvalRef: newExtension.approvalRef.trim(),
      approvedAt: newExtension.approvedAt || null,
      createdBy: currentUser.id,
    });
    if (row) {
      setNewExtension({
        fromDate: row.toDate || newExtension.toDate,
        toDate: '',
        startMilestoneId: row.startMilestoneId || defaultExtensionMilestone,
        reason: '',
        approvalRef: '',
        approvedAt: '',
      });
    }
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
              งานในบอร์ด {projectTasks.length}
            </span>
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
              projectExtensions.length
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              ขยายสัญญา {projectExtensions.length} ครั้ง
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTab('activity')}
            className="mt-3 w-full max-w-xl text-left text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 transition-colors"
          >
            <span className="text-slate-500">7 วันล่าสุด:</span>{' '}
            <span className="text-slate-800">{activitySummary.label}</span>
          </button>
          <div className="mt-4 max-w-xl">
            <ProjectTimeBar startDate={project.startDate} endDate={effectiveContractEnd} />
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

      {tab === 'activity' && (
        <ProjectActivityPanel
          project={project}
          projectTasks={projectTasks}
          projectMilestones={projectMilestones}
          projectExtensions={projectExtensions}
          users={users}
          taskLogs={mergedProjectTaskLogs}
          loading={activityLoading}
          loadError={activityLoadError}
          onOpenTask={onOpenTask}
          onGoContractTab={() => setTab('contract')}
          onGoPlanTab={() => setTab('plan')}
        />
      )}

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
              <ThaiDateField
                clearable
                disabled={!canEdit || busy}
                placeholder="วันเริ่ม พ.ศ."
                value={settings.startDate}
                onChange={(v) => setSettings({ ...settings, startDate: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">วันสิ้นสุดโครงการ</label>
              <ThaiDateField
                clearable
                disabled={!canEdit || busy}
                placeholder="วันสิ้นสุด พ.ศ."
                value={settings.endDate}
                onChange={(v) => setSettings({ ...settings, endDate: v })}
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
                <ThaiDateField
                  clearable
                  placeholder="วันเริ่ม พ.ศ."
                  value={newMs.plannedStart}
                  onChange={(v) => setNewMs({ ...newMs, plannedStart: v })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">วันสิ้นสุด (แผน)</label>
                <ThaiDateField
                  clearable
                  placeholder="วันสิ้นสุด พ.ศ."
                  value={newMs.plannedEnd}
                  onChange={(v) => setNewMs({ ...newMs, plannedEnd: v })}
                />
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
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                ลากไอคอน ⋮⋮ เพื่อสลับลำดับ · แก้ชื่อ วันที่ น้ำหนัก แล้วกดบันทึก
              </p>
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
                  isDragging={dragMilestoneId === m.id}
                  isDropTarget={dropMilestoneId === m.id && dragMilestoneId !== m.id}
                  onDragStart={setDragMilestoneId}
                  onDragOver={setDropMilestoneId}
                  onDrop={handleMilestoneDrop}
                  onDragEnd={() => {
                    setDragMilestoneId(null);
                    setDropMilestoneId(null);
                  }}
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

      {tab === 'contract' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'ขยายแล้ว', value: `${projectExtensions.length} ครั้ง`, tone: 'text-amber-700', bg: 'from-amber-50' },
              { label: 'วันสิ้นสุดเดิม', value: formatThaiDateLong(originalContractEnd, { emptyLabel: 'ไม่ระบุ' }), tone: 'text-slate-700', bg: 'from-slate-50' },
              { label: 'วันสิ้นสุดปัจจุบัน', value: formatThaiDateLong(effectiveContractEnd, { emptyLabel: 'ไม่ระบุ' }), tone: 'text-blue-700', bg: 'from-blue-50' },
              { label: 'ระยะเวลาที่ขยายรวม', value: `${totalExtensionDays} วัน`, tone: 'text-emerald-700', bg: 'from-emerald-50' },
            ].map((stat) => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} to-white border border-slate-200 rounded-2xl p-4 shadow-sm`}>
                <p className="text-[11px] font-bold text-slate-500 mb-1">{stat.label}</p>
                <p className={`text-lg font-black leading-tight ${stat.tone}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddContractExtension} className="bg-white border border-amber-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                <CalendarRange className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-800">บันทึกการขยายสัญญาครั้งใหม่</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  ระบบจะนับเป็นครั้งที่ {projectExtensions.length + 1} และปรับวันสิ้นสุดโปรเจกต์ให้อัตโนมัติ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">ขยายจากวันที่ *</label>
                <ThaiDateField
                  required
                  value={newExtension.fromDate}
                  placeholder="วันที่สิ้นสุดเดิม พ.ศ."
                  onChange={(v) => setNewExtension((prev) => ({ ...prev, fromDate: v }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">ขยายถึงวันที่ *</label>
                <ThaiDateField
                  required
                  value={newExtension.toDate}
                  placeholder="วันที่สิ้นสุดใหม่ พ.ศ."
                  onChange={(v) => setNewExtension((prev) => ({ ...prev, toDate: v }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">เริ่มขยายตั้งแต่ขั้นตอน *</label>
                <select
                  required
                  value={newExtension.startMilestoneId}
                  onChange={(e) => setNewExtension((prev) => ({ ...prev, startMilestoneId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl p-3.5 text-sm font-bold text-slate-700 bg-white outline-none focus:border-amber-400"
                >
                  <option value="">— เลือกขั้นตอน —</option>
                  {projectMilestones.map((m, idx) => (
                    <option key={m.id} value={m.id}>{idx + 1}. {m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">วันที่อนุมัติ</label>
                <ThaiDateField
                  clearable
                  value={newExtension.approvedAt}
                  placeholder="วันที่อนุมัติ พ.ศ."
                  onChange={(v) => setNewExtension((prev) => ({ ...prev, approvedAt: v }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">เหตุผลการขยายสัญญา *</label>
                <textarea
                  required
                  rows={3}
                  value={newExtension.reason}
                  onChange={(e) => setNewExtension((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="เช่น รอผล UAT, รอส่งมอบอุปกรณ์, มีงานเพิ่มเติม..."
                  className="w-full border border-slate-200 rounded-2xl p-3.5 text-sm font-medium outline-none focus:border-amber-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">เลขที่หนังสือ / เอกสารอนุมัติ</label>
                <input
                  value={newExtension.approvalRef}
                  onChange={(e) => setNewExtension((prev) => ({ ...prev, approvalRef: e.target.value }))}
                  placeholder="เช่น บันทึกอนุมัติ IT-EXT-003/2569"
                  className="w-full border border-slate-200 rounded-2xl p-3.5 text-sm font-medium outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !canEdit || projectMilestones.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl text-sm font-extrabold flex items-center disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              บันทึกขยายสัญญาครั้งที่ {projectExtensions.length + 1}
            </button>
            {projectMilestones.length === 0 && (
              <p className="text-xs font-bold text-rose-500">ต้องเพิ่มขั้นตอนในแผนงานก่อน จึงจะระบุจุดเริ่มขยายสัญญาได้</p>
            )}
          </form>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800">ประวัติการขยายสัญญา</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                แสดงลำดับ ช่วงวันที่ เหตุผล และขั้นตอนที่ได้รับผลกระทบ
              </p>
            </div>
            <div className="p-5 space-y-4">
              {projectExtensions.map((ext, idx) => {
                const milestone = projectMilestones.find((m) => String(m.id) === String(ext.startMilestoneId));
                const extensionDays = daysBetween(ext.fromDate, ext.toDate);
                return (
                  <article key={ext.id} className="relative border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white rounded-2xl p-5 pl-16">
                    <div className="absolute left-4 top-5 w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-black shadow-md">
                      {ext.extensionNo || idx + 1}
                    </div>
                    {idx < projectExtensions.length - 1 && (
                      <div className="absolute left-[2rem] top-14 bottom-[-1.1rem] w-0.5 bg-amber-200" />
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-black text-slate-800">ขยายสัญญาครั้งที่ {ext.extensionNo || idx + 1}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                            <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
                            {formatThaiDateLong(ext.fromDate)} → {formatThaiDateLong(ext.toDate)}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                            +{extensionDays} วัน
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDeleteContractExtension(ext.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl disabled:opacity-50"
                        title="ลบประวัติรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-white/80 border border-slate-100">
                        <Milestone className="w-4 h-4 mt-0.5 text-violet-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">เริ่มขยายตั้งแต่ขั้นตอน</p>
                          <p className="font-bold text-slate-700 mt-0.5">{milestone?.title || 'ไม่พบขั้นตอน'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-white/80 border border-slate-100">
                        <FileText className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">เอกสารอนุมัติ</p>
                          <p className="font-bold text-slate-700 mt-0.5">{ext.approvalRef || 'ไม่ระบุ'}</p>
                          {ext.approvedAt && <p className="text-[11px] text-slate-500 mt-0.5">อนุมัติ {formatThaiDateLong(ext.approvedAt)}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 rounded-xl bg-white/80 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">เหตุผลการขยายสัญญา</p>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{ext.reason}</p>
                    </div>
                  </article>
                );
              })}
              {projectExtensions.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <FileClock className="w-11 h-11 mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-slate-600">ยังไม่เคยขยายสัญญา</p>
                  <p className="text-xs mt-1">เมื่อบันทึกแล้ว ประวัติทั้งหมดจะแสดงเรียงตามครั้งที่ขยาย</p>
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-3 text-[11px] font-bold mr-1">
                  <span className="flex items-center text-blue-700"><span className="w-5 h-2.5 rounded-sm bg-blue-500 mr-1.5" />ระยะแผน</span>
                  <span className="flex items-center text-rose-600"><span className="w-5 h-0.5 bg-rose-500 mr-1.5" />สะสมจริง</span>
                  <span className="flex items-center text-slate-500"><span className="w-5 border-t border-dashed border-teal-400 mr-1.5" />สะสมแผน</span>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!sheet?.rows?.length || exportBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  disabled={!sheet?.rows?.length || exportBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="ส่งออกแผนงานทั้งหมด + กราฟ เป็นภาพ PNG"
                >
                  {exportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                  ภาพแผนงาน PNG
                </button>
                <button
                  type="button"
                  onClick={handleExportSvg}
                  disabled={!sheet?.rows?.length || exportBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="ไฟล์ SVG เปิดแก้ใน Illustrator / Inkscape / Figma ได้"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  SVG แก้ไขได้
                </button>
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
                        <div className="flex items-center px-1 font-bold text-slate-600 leading-tight text-[10px]">
                          {formatThaiDateLong(row.plannedStart, { emptyLabel: '—' })}
                        </div>
                        <div className="flex items-center px-1 font-bold text-slate-600 leading-tight text-[10px]">
                          {formatThaiDateLong(row.plannedEnd, { emptyLabel: '—' })}
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
                      ref={scurveSvgRef}
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
