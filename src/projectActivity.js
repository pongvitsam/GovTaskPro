import { formatThaiDateLong } from './formatThaiDate';

export const ACTIVITY_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'task', label: 'งานในบอร์ด' },
  { id: 'plan', label: 'แผน/ขั้นตอน' },
  { id: 'contract', label: 'สัญญา' },
];

const LOG_TITLE = {
  Created: 'สร้างงาน',
  'Status Changed': 'อัปเดตงาน',
  Forwarded: 'โอนงาน',
  Takeover: 'ดึงงาน',
};

export function buildProjectActivityEvents({
  project,
  projectTasks,
  taskLogs,
  milestones,
  contractExtensions,
}) {
  const events = [];
  const taskById = {};
  (projectTasks || []).forEach((t) => {
    taskById[String(t.id)] = t;
  });

  if (project?.createdAt) {
    events.push({
      id: `proj-created-${project.id}`,
      category: 'project',
      timestamp: project.createdAt,
      actorId: project.createdBy || '',
      title: 'สร้างโปรเจกต์',
      detail: project.name || '',
    });
  }

  (taskLogs || []).forEach((log) => {
    const task = taskById[String(log.taskId)];
    if (!task) return;
    const prefix = LOG_TITLE[log.actionType] || 'งาน';
    events.push({
      id: `log-${log.id}`,
      category: 'task',
      timestamp: log.timestamp,
      actorId: log.actionBy || '',
      title: `${prefix}: “${task.title}”`,
      detail: log.detail || '',
      taskId: task.id,
      actionType: log.actionType,
    });
  });

  (milestones || [])
    .filter((m) => m.completed && m.completedAt)
    .forEach((m) => {
      events.push({
        id: `ms-done-${m.id}`,
        category: 'plan',
        timestamp: m.completedAt,
        actorId: '',
        title: `ขั้นตอนเสร็จ: “${m.title}”`,
        detail: m.description || '',
        milestoneId: m.id,
      });
    });

  (contractExtensions || []).forEach((ext) => {
    const ts = ext.approvedAt || ext.createdAt;
    if (!ts) return;
    const ms = (milestones || []).find((m) => String(m.id) === String(ext.startMilestoneId));
    const range = `${formatThaiDateLong(ext.fromDate, { emptyLabel: '—' })} → ${formatThaiDateLong(ext.toDate, { emptyLabel: '—' })}`;
    const parts = [range];
    if (ms) parts.push(`ตั้งแต่ขั้นตอน “${ms.title}”`);
    if (ext.approvalRef) parts.push(ext.approvalRef);
    if (ext.reason) parts.push(ext.reason);
    events.push({
      id: `ext-${ext.id}`,
      category: 'contract',
      timestamp: ts,
      actorId: ext.createdBy || '',
      title: `ขยายสัญญาครั้งที่ ${ext.extensionNo || '?'}`,
      detail: parts.join(' · '),
      extensionId: ext.id,
    });
  });

  const taskIdsWithCompleteLog = new Set(
    events.filter((e) => e.category === 'task' && isTaskCompletedLog(e)).map((e) => String(e.taskId)),
  );
  (projectTasks || []).forEach((task) => {
    if (task.status !== 'Completed' || !task.completedAt) return;
    if (taskIdsWithCompleteLog.has(String(task.id))) return;
    events.push({
      id: `task-done-${task.id}`,
      category: 'task',
      timestamp: task.completedAt,
      actorId: task.assignedTo || task.createdBy || '',
      title: `งานเสร็จ: “${task.title}”`,
      detail: `ปิดงานในบอร์ด · วันเสร็จ ${formatThaiDateLong(task.completedAt, { emptyLabel: '—' })}`,
      taskId: task.id,
      actionType: 'Status Changed',
    });
  });

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events;
}

export function filterActivityEvents(events, filterId) {
  if (!filterId || filterId === 'all') return events;
  if (filterId === 'plan') {
    return events.filter((e) => e.category === 'plan' || e.category === 'project');
  }
  return events.filter((e) => e.category === filterId);
}

function dayKey(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function dayLabel(key, now = new Date()) {
  if (!key) return 'ไม่ระบุวัน';
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86400000).toISOString());
  if (key === today) return 'วันนี้';
  if (key === yesterday) return 'เมื่อวาน';
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function groupActivityByDay(events, now = new Date()) {
  const groups = [];
  let currentKey = null;
  events.forEach((ev) => {
    const key = dayKey(ev.timestamp);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ dayKey: key, label: dayLabel(key, now), events: [] });
    }
    groups[groups.length - 1].events.push(ev);
  });
  return groups;
}

export function isTaskCompletedLog(event) {
  if (event.category !== 'task') return false;
  const d = String(event.detail || '');
  const title = String(event.title || '');
  return d.includes('เสร็จสิ้น') || d.includes('Completed') || d.includes('ปิดงาน') || title.includes('งานเสร็จ');
}

/** Short summary for project header (last N days). */
export function summarizeRecentActivity(events, days = 7, now = new Date()) {
  const cutoff = now.getTime() - days * 86400000;
  const recent = events.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  let tasksCompleted = 0;
  let planCompleted = 0;
  let extensions = 0;
  let taskMoves = 0;

  recent.forEach((e) => {
    if (e.category === 'task') {
      if (isTaskCompletedLog(e)) tasksCompleted += 1;
      else taskMoves += 1;
    } else if (e.category === 'plan') {
      planCompleted += 1;
    } else if (e.category === 'contract') {
      extensions += 1;
    }
  });

  const parts = [];
  if (tasksCompleted) parts.push(`งานเสร็จ ${tasksCompleted}`);
  if (planCompleted) parts.push(`ขั้นตอนเสร็จ ${planCompleted}`);
  if (extensions) parts.push(`ขยายสัญญา ${extensions}`);
  if (taskMoves && !tasksCompleted) parts.push(`อัปเดตงาน ${taskMoves}`);
  if (!parts.length) parts.push('ยังไม่มีความเคลื่อนไหว');

  return { days, parts, label: parts.join(' · '), recentCount: recent.length };
}

/** Build timeline for one project (no API required if bootstrap has tasks/logs/milestones/extensions). */
export function buildProjectActivityForProject(projectId, {
  projects,
  tasks,
  taskLogs,
  milestones,
  contractExtensions,
}) {
  const project = (projects || []).find((p) => String(p.id) === String(projectId));
  if (!project) return [];
  const projectTasks = (tasks || []).filter((t) => String(t.projectId) === String(projectId));
  const projectMilestones = (milestones || []).filter((m) => String(m.projectId) === String(projectId));
  const projectExtensions = (contractExtensions || []).filter((x) => String(x.projectId) === String(projectId));
  const taskIds = new Set(projectTasks.map((t) => String(t.id)));
  const logs = (taskLogs || []).filter((l) => taskIds.has(String(l.taskId)));
  return buildProjectActivityEvents({
    project,
    projectTasks,
    taskLogs: logs,
    milestones: projectMilestones,
    contractExtensions: projectExtensions,
  });
}

export const CATEGORY_STYLE = {
  task: { dot: 'bg-blue-500 ring-blue-200', card: 'bg-blue-50/80 border-blue-100 text-blue-900' },
  plan: { dot: 'bg-teal-500 ring-teal-200', card: 'bg-teal-50/80 border-teal-100 text-teal-900' },
  contract: { dot: 'bg-amber-500 ring-amber-200', card: 'bg-amber-50/80 border-amber-100 text-amber-900' },
  project: { dot: 'bg-slate-500 ring-slate-200', card: 'bg-slate-50 border-slate-200 text-slate-700' },
};
