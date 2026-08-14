export const BOARD_STATUSES = ['Pending', 'In Progress', 'Review', 'Completed'];

export const COMPLETED_PREVIEW = 8;
export const ACTIVE_COLUMN_PREVIEW = 15;

export const boardColumnTheme = {
  Pending: {
    border: 'border-amber-300',
    bg: 'bg-gradient-to-b from-amber-100/90 via-amber-50/70 to-white',
    header: 'bg-amber-500 text-white',
    badge: 'bg-white/95 text-amber-800',
    cardBorder: 'border-amber-200',
    accent: 'bg-amber-500',
  },
  'In Progress': {
    border: 'border-sky-300',
    bg: 'bg-gradient-to-b from-sky-100/90 via-sky-50/70 to-white',
    header: 'bg-sky-500 text-white',
    badge: 'bg-white/95 text-sky-800',
    cardBorder: 'border-sky-200',
    accent: 'bg-sky-500',
  },
  Review: {
    border: 'border-violet-300',
    bg: 'bg-gradient-to-b from-violet-100/90 via-violet-50/70 to-white',
    header: 'bg-violet-500 text-white',
    badge: 'bg-white/95 text-violet-800',
    cardBorder: 'border-violet-200',
    accent: 'bg-violet-500',
  },
  Completed: {
    border: 'border-emerald-300',
    bg: 'bg-gradient-to-b from-emerald-100/90 via-emerald-50/70 to-white',
    header: 'bg-emerald-600 text-white',
    badge: 'bg-white/95 text-emerald-800',
    cardBorder: 'border-emerald-200',
    accent: 'bg-emerald-600',
  },
};

export function getStatusText(status) {
  return ({
    Pending: 'รอรับงาน',
    'In Progress': 'กำลังทำ',
    Review: 'รอตรวจ',
    Completed: 'เสร็จสิ้น',
  }[status] || status);
}

export function getStatusColor(status) {
  return ({
    Pending: 'bg-amber-100 text-amber-900 border-amber-300',
    'In Progress': 'bg-sky-100 text-sky-900 border-sky-300',
    Review: 'bg-violet-100 text-violet-900 border-violet-300',
    Completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  }[status] || 'bg-slate-50 text-slate-700 border-slate-100');
}

export function isOverdue(dueDate, status) {
  return dueDate
    && status !== 'Completed'
    && new Date(dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
}

export function sortCompletedTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const ta = new Date(a.completedAt || a.dueDate || a.createdAt || 0).getTime();
    const tb = new Date(b.completedAt || b.dueDate || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

export function sortActiveColumnTasks(tasks, currentUserId) {
  return [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a.dueDate, a.status);
    const bOverdue = isOverdue(b.dueDate, b.status);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const aMinePending = a.status === 'Pending' && String(a.assignedTo) === String(currentUserId);
    const bMinePending = b.status === 'Pending' && String(b.assignedTo) === String(currentUserId);
    if (aMinePending !== bMinePending) return aMinePending ? -1 : 1;

    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;

    return String(a.title || '').localeCompare(String(b.title || ''), 'th');
  });
}

export function groupTasksByStatus(tasks, currentUserId) {
  const groups = {
    Pending: [],
    'In Progress': [],
    Review: [],
    Completed: [],
  };
  tasks.forEach((task) => {
    if (groups[task.status]) groups[task.status].push(task);
  });
  groups.Completed = sortCompletedTasks(groups.Completed);
  groups.Pending = sortActiveColumnTasks(groups.Pending, currentUserId);
  groups['In Progress'] = sortActiveColumnTasks(groups['In Progress'], currentUserId);
  groups.Review = sortActiveColumnTasks(groups.Review, currentUserId);
  return groups;
}

export function applyBoardFilters(tasks, filters, lookups = {}) {
  const {
    search = '',
    personFilter = 'all',
    statusFilter = 'all',
    overdueOnly = false,
    myTasksOnly = false,
    currentUserId,
  } = filters;
  const { projectsById } = lookups;

  let result = tasks;

  if (personFilter !== 'all') {
    result = result.filter((t) => String(t.assignedTo) === String(personFilter));
  }
  if (myTasksOnly && currentUserId) {
    result = result.filter((t) => String(t.assignedTo) === String(currentUserId));
  }
  if (statusFilter !== 'all') {
    result = result.filter((t) => t.status === statusFilter);
  }
  if (overdueOnly) {
    result = result.filter((t) => isOverdue(t.dueDate, t.status));
  }

  const query = search.trim().toLowerCase();
  if (query) {
    result = result.filter((task) => {
      const title = (task.title || '').toLowerCase();
      const projectName = (projectsById?.get(task.projectId)?.name || '').toLowerCase();
      return title.includes(query) || projectName.includes(query);
    });
  }

  return result;
}

export function getColumnPreviewLimit(status) {
  return status === 'Completed' ? COMPLETED_PREVIEW : ACTIVE_COLUMN_PREVIEW;
}

export function sliceColumnTasks(tasks, status, expanded) {
  const limit = getColumnPreviewLimit(status);
  if (expanded || tasks.length <= limit) return { shown: tasks, hidden: 0 };
  return { shown: tasks.slice(0, limit), hidden: tasks.length - limit };
}
