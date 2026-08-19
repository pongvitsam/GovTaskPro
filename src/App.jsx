import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  User, CheckCircle, Clock, Plus, LayoutDashboard, LogOut, Send,
  ArrowRightLeft, History, FolderKanban, Briefcase, KanbanSquare, Bell, Calendar as CalendarIcon,
  BarChart2, MessageSquare, Paperclip, Repeat, Download, FileText, Smartphone, Search,
  Users, CalendarDays, Grab, ShieldCheck, Loader2, Settings2, StickyNote, KeyRound,
  Menu, X, MoreHorizontal, RefreshCw, Trash2, Save, Pencil, ChevronLeft
} from 'lucide-react';
import { api, isProductionGas, isProductionHost } from './api';
import LoginScreen from './LoginScreen';
import { formatThaiDate, formatThaiDateLong, formatThaiMonthYear, toDateInputValue } from './formatThaiDate';
import ProjectTimeBar from './ProjectTimeBar';
import { readSession, saveSession, clearSession, readBootstrapCache, writeBootstrapCache, bootstrapCacheAgeMs, BOOT_CACHE_MAX_AGE_MS } from './session';
import ThaiDateField from './ThaiDateField';
import { buildProjectActivityForProject, summarizeRecentActivity } from './projectActivity';
import BoardView from './board/BoardView';
import { getStatusColor, getStatusText, isOverdue } from './board/boardUtils';

const ProjectDetail = lazy(() => import('./ProjectDetail'));
const loadStickyNotesModule = () => import('./StickyNotes');
const StickyNotes = lazy(loadStickyNotesModule);
const SettingsPage = lazy(() => import('./Settings'));
const AdminUsers = lazy(() => import('./AdminUsers'));

const DAY = 86400000;
const SYNC_INTERVAL_MS = 300000;
const SYNC_DEBOUNCE_MS = 30000;
const BOOT_SKIP_NETWORK_MS = BOOT_CACHE_MAX_AGE_MS;
const STICKY_STALE_MS = 90000;
const TASK_ACTIVITY_CACHE_MS = 120000;

function ModuleLoading({ label }) {
  return (
    <div className="flex-1 flex items-center justify-center p-10 gtp-fade-in">
      <div className="flex flex-col items-center text-[#5b7a8a]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-3" />
        <p className="text-sm font-semibold">กำลังโหลด{label ? ` ${label}` : ''}...</p>
      </div>
    </div>
  );
}

function upsertById(list, row) {
  if (!row) return list;
  const id = String(row.id);
  const idx = list.findIndex((x) => String(x.id) === id);
  if (idx < 0) return [row, ...list];
  const next = list.slice();
  next[idx] = row;
  return next;
}

function dayKeyLocal(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Sticky reminder badge: show on the calendar day of reminderAt */
export function countStickyRemindersDueToday(notes) {
  const today = dayKeyLocal(Date.now());
  if (!today || !Array.isArray(notes)) return 0;
  return notes.filter((n) => {
    if (!n || n.trashed || n.archived || !n.reminderAt) return false;
    return dayKeyLocal(n.reminderAt) === today;
  }).length;
}

export default function App() {
  const [bootLoading, setBootLoading] = useState(() => !!readSession()?.userId);
  const [bootError, setBootError] = useState(null);
  const [users, setUsers] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [contractExtensions, setContractExtensions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  const [currentModule, setCurrentModule] = useState('dashboard');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [detailProjectId, setDetailProjectId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalTab, setTaskModalTab] = useState('details');
  const [taskEditDraft, setTaskEditDraft] = useState(null);
  const [createType, setCreateType] = useState('task');
  const [createReturnModule, setCreateReturnModule] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reportUser, setReportUser] = useState('all');
  const [reportPeriod, setReportPeriod] = useState('month');
  const [loginError, setLoginError] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stickyRemindersDue, setStickyRemindersDue] = useState(0);
  const [stickyReminderNotes, setStickyReminderNotes] = useState([]);
  const [stickyNotesSnapshot, setStickyNotesSnapshot] = useState(null);
  const [stickyNotesFetchedAt, setStickyNotesFetchedAt] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellAnchor, setBellAnchor] = useState(null);
  const [seenBellKeys, setSeenBellKeys] = useState(() => {
    try {
      const raw = sessionStorage.getItem('gtp_bell_seen');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });
  const softRefreshingRef = useRef(false);
  const lastSyncAtRef = useRef(0);
  const lastStickySyncAtRef = useRef(0);
  const currentModuleRef = useRef(currentModule);
  const bellOpenRef = useRef(bellOpen);
  const taskActivityCacheRef = useRef(new Map());
  const desktopBellRef = useRef(null);
  const mobileBellRef = useRef(null);
  const bellPanelRef = useRef(null);

  const showToast = (msg, duration = 3000) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), duration);
  };

  const createReturnLabels = {
    board: 'กลับกระดานงาน',
    dashboard: 'กลับภาพรวม',
    projects: 'กลับโปรเจกต์',
    calendar: 'กลับปฏิทิน',
    sticky: 'กลับเตือนความจำ',
    reports: 'กลับรายงาน',
    settings: 'กลับตั้งค่า',
    adminUsers: 'กลับสิทธิ์แผนก',
  };

  const openCreateModule = (returnTo) => {
    setCreateReturnModule(returnTo || (currentModule === 'create' ? createReturnModule : currentModule));
    setCreateType('task');
    setCurrentModule('create');
  };

  const leaveCreateModule = () => {
    setCurrentModule(createReturnModule || 'dashboard');
  };

  const formatDate = (iso) => formatThaiDate(iso);

  const applyBootstrap = (data, { restoreSession = true, mergeLazy = false } = {}) => {
    setUsers(data.users || []);
    setOrgUnits(data.orgUnits || []);
    setProjects(data.projects || []);
    setTasks(data.tasks || []);
    if (mergeLazy) {
      setTaskLogs((prev) => {
        const incoming = data.taskLogs || [];
        return incoming.length ? incoming : prev;
      });
      setComments((prev) => {
        const incoming = data.comments || [];
        return incoming.length ? incoming : prev;
      });
      setCommentCounts((prev) => {
        const incoming = data.commentCounts;
        return incoming && Object.keys(incoming).length ? incoming : prev;
      });
    } else {
      setTaskLogs(data.taskLogs || []);
      setComments(data.comments || []);
      setCommentCounts(data.commentCounts || {});
    }
    setMilestones(data.milestones || []);
    setContractExtensions(data.contractExtensions || []);

    if (restoreSession) {
      const session = readSession();
      if (session?.userId) {
        const u = (data.users || []).find((x) => String(x.id) === String(session.userId) && x.active !== false);
        if (u) setCurrentUser(u);
        else clearSession();
      }
    } else {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const u = (data.users || []).find((x) => String(x.id) === String(prev.id) && x.active !== false);
        if (!u) {
          clearSession();
          return null;
        }
        return { ...prev, ...u };
      });
    }
    writeBootstrapCache(data);
  };

  const applyStickySnapshot = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    setStickyNotesSnapshot(list);
    setStickyNotesFetchedAt(Date.now());
    const today = dayKeyLocal(Date.now());
    const due = list.filter((n) => {
      if (!n || n.trashed || n.archived || !n.reminderAt) return false;
      return dayKeyLocal(n.reminderAt) === today;
    });
    setStickyReminderNotes(due);
    setStickyRemindersDue(due.length);
  };

  const runBackgroundSync = async ({ silent = true, force = false } = {}) => {
    if (softRefreshingRef.current || bootLoading || !currentUser) return;
    const now = Date.now();
    if (silent && !force && now - lastSyncAtRef.current < SYNC_DEBOUNCE_MS) return;

    const bootStale = force || now - lastSyncAtRef.current >= BOOT_SKIP_NETWORK_MS;
    const stickyStale = force || now - lastStickySyncAtRef.current >= STICKY_STALE_MS;
    const needSticky = stickyStale && (
      currentModuleRef.current === 'sticky' || bellOpenRef.current
    );
    if (!bootStale && !needSticky) return;

    softRefreshingRef.current = true;
    if (!silent) setSyncing(true);
    try {
      const bootPromise = bootStale
        ? api('getBootstrap', force ? { force: true } : {})
        : Promise.resolve(null);
      const stickyPromise = needSticky
        ? api('listStickyNotes', { userId: currentUser.id })
        : Promise.resolve(null);
      const [data, stickyRows] = await Promise.all([bootPromise, stickyPromise]);

      if (data && Array.isArray(data.users)) {
        applyBootstrap(data, { restoreSession: false, mergeLazy: silent && !force });
        lastSyncAtRef.current = Date.now();
      }
      if (stickyRows) {
        applyStickySnapshot(stickyRows);
        lastStickySyncAtRef.current = Date.now();
      }
      if (!silent) showToast('🔄 ซิงก์ข้อมูลล่าสุดแล้ว');
    } catch (err) {
      if (!silent) showToast('❌ ซิงก์ไม่สำเร็จ: ' + (err?.message || String(err)));
    } finally {
      softRefreshingRef.current = false;
      setSyncing(false);
    }
  };

  const softRefresh = async (opts) => runBackgroundSync(opts);

  const patchTask = (task, log) => {
    if (!task) return;
    setTasks((prev) => upsertById(prev, task));
    if (log) setTaskLogs((prev) => upsertById(prev, log));
    setSelectedTask((prev) => (prev && String(prev.id) === String(task.id) ? task : prev));
  };

  const scheduleTaskNotify = (payload) => {
    api('dispatchTaskNotify', payload).catch(() => {});
  };

  const loadBootstrap = async ({ force = true } = {}) => {
    setBootLoading(true);
    setBootError(null);
    try {
      const data = await api('getBootstrap', force ? { force: true } : {});
      if (!data || !Array.isArray(data.users)) {
        throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }
      applyBootstrap(data, { restoreSession: true });
      lastSyncAtRef.current = Date.now();
    } catch (err) {
      setBootError(err?.message || String(err));
    } finally {
      setBootLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const session = readSession();
    // No session → show login immediately (do not wait for full Sheets dump)
    if (!session?.userId) {
      setBootLoading(false);
      return undefined;
    }

    const cached = readBootstrapCache();
    const cacheAge = bootstrapCacheAgeMs();
    const cacheFresh = cacheAge !== null && cacheAge < BOOT_CACHE_MAX_AGE_MS;
    if (cached?.users) {
      applyBootstrap(cached, { restoreSession: true });
      setBootLoading(false);
      lastSyncAtRef.current = Date.now();
    }

    if (cacheFresh) {
      return undefined;
    }

    (async () => {
      if (!cached?.users) setBootLoading(true);
      setBootError(null);
      try {
        const data = await api('getBootstrap', {});
        if (cancelled) return;
        if (!data || !Array.isArray(data.users)) {
          throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
        }
        applyBootstrap(data, { restoreSession: true });
        lastSyncAtRef.current = Date.now();
      } catch (err) {
        if (!cancelled && !cached?.users) setBootError(err?.message || String(err));
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    currentModuleRef.current = currentModule;
    if (currentModule === 'sticky' && currentUser && !bootLoading) {
      runBackgroundSync({ silent: true });
    }
  }, [currentModule, currentUser?.id, bootLoading]);

  useEffect(() => {
    bellOpenRef.current = bellOpen;
    if (bellOpen && currentUser && !bootLoading) {
      runBackgroundSync({ silent: true });
    }
  }, [bellOpen, currentUser?.id, bootLoading]);

  useEffect(() => {
    if (!currentUser || bootLoading) return undefined;

    const cacheAge = bootstrapCacheAgeMs();
    if (cacheAge === null || cacheAge >= BOOT_CACHE_MAX_AGE_MS) {
      runBackgroundSync({ silent: true });
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') runBackgroundSync({ silent: true });
    };
    const onOnline = () => runBackgroundSync({ silent: false, force: true });

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') runBackgroundSync({ silent: true });
    }, SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      clearInterval(timer);
    };
  }, [currentUser?.id, bootLoading]);

  useEffect(() => {
    if (!selectedTask) return undefined;
    const taskId = selectedTask.id;
    const cacheKey = String(taskId);
    const cached = taskActivityCacheRef.current.get(cacheKey);
    let cancelled = false;

    if (cached && Date.now() - cached.fetchedAt < TASK_ACTIVITY_CACHE_MS) {
      setComments((prev) => {
        const others = prev.filter((c) => String(c.taskId) !== cacheKey);
        return [...others, ...cached.comments];
      });
      setTaskLogs((prev) => {
        const others = prev.filter((l) => String(l.taskId) !== cacheKey);
        return [...others, ...cached.taskLogs];
      });
      setCommentCounts((prev) => ({ ...prev, [cacheKey]: cached.comments.length }));
      setActivityLoading(false);
      return undefined;
    }

    setActivityLoading(true);
    (async () => {
      try {
        const data = await api('getTaskActivity', { taskId });
        if (cancelled) return;
        const nextComments = data.comments || [];
        const nextLogs = data.taskLogs || [];
        taskActivityCacheRef.current.set(cacheKey, {
          comments: nextComments,
          taskLogs: nextLogs,
          fetchedAt: Date.now(),
        });
        setComments((prev) => {
          const others = prev.filter((c) => String(c.taskId) !== cacheKey);
          return [...others, ...nextComments];
        });
        setTaskLogs((prev) => {
          const others = prev.filter((l) => String(l.taskId) !== cacheKey);
          return [...others, ...nextLogs];
        });
        setCommentCounts((prev) => ({ ...prev, [cacheKey]: nextComments.length }));
      } catch (err) {
        if (!cancelled) showToast('❌ โหลดประวัติงานไม่สำเร็จ');
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskEditDraft(null);
      return;
    }
    setTaskEditDraft({
      description: selectedTask.description || '',
      dueDate: toDateInputValue(selectedTask.dueDate),
      isRecurring: !!selectedTask.isRecurring,
    });
  }, [
    selectedTask?.id,
    selectedTask?.description,
    selectedTask?.dueDate,
    selectedTask?.isRecurring,
  ]);

  const usersById = useMemo(() => {
    const m = new Map();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const projectsById = useMemo(() => {
    const m = new Map();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  const tasksByProjectId = useMemo(() => {
    const m = new Map();
    tasks.forEach((t) => {
      const key = String(t.projectId || '');
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    });
    return m;
  }, [tasks]);

  const milestonesByProjectId = useMemo(() => {
    const m = new Map();
    milestones.forEach((ms) => {
      const key = String(ms.projectId || '');
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(ms);
    });
    return m;
  }, [milestones]);

  const activeTaskCountByUserId = useMemo(() => {
    const m = new Map();
    tasks.forEach((t) => {
      if (t.status !== 'In Progress' && t.status !== 'Pending') return;
      const id = String(t.assignedTo || '');
      m.set(id, (m.get(id) || 0) + 1);
    });
    return m;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') {
      return tasks.filter((task) => (activeProjectId ? task.projectId === activeProjectId : true));
    }
    return tasks.filter((task) => {
      const assignee = usersById.get(task.assignedTo);
      const isMyDepartment = assignee?.department === currentUser.department;
      const matchesProject = activeProjectId ? task.projectId === activeProjectId : true;
      return isMyDepartment && matchesProject;
    });
  }, [tasks, usersById, currentUser, activeProjectId]);

  const activeUsers = useMemo(() => users.filter((u) => u.active !== false), [users]);
  const visibleProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return projects;
    return projects.filter((p) => String(p.department || '') === String(currentUser.department || ''));
  }, [projects, currentUser]);

  const projectDeptOptions = useMemo(() => {
    const fromOrg = (orgUnits || [])
      .filter((o) => o.type === 'department' && o.active !== false)
      .map((o) => o.name);
    const fromUsers = activeUsers.map((u) => u.department).filter(Boolean);
    return [...new Set([...fromOrg, ...fromUsers])].sort((a, b) => String(a).localeCompare(String(b), 'th'));
  }, [orgUnits, activeUsers]);

  useEffect(() => {
    if (!detailProjectId) return;
    if (!visibleProjects.some((p) => String(p.id) === String(detailProjectId))) {
      setDetailProjectId(null);
    }
  }, [detailProjectId, visibleProjects]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (!visibleProjects.some((p) => String(p.id) === String(activeProjectId))) {
      setActiveProjectId(null);
    }
  }, [activeProjectId, visibleProjects]);

  const deptUsers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return activeUsers;
    return activeUsers.filter((u) => u.department === currentUser.department);
  }, [activeUsers, currentUser]);
  /** คนที่มอบหมายงานได้ — ทุกคนในแผนก (ไม่รวม Admin ระบบ) */
  const assignableUsers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return activeUsers.filter((u) => u.role !== 'Admin');
    return deptUsers.filter((u) => u.role !== 'Admin');
  }, [deptUsers, activeUsers, currentUser]);

  const isManager = currentUser?.role === 'Head' || currentUser?.role === 'Admin';
  const isStaff = currentUser?.role === 'Staff';
  const selectedAssignee = selectedTask ? usersById.get(selectedTask.assignedTo) : null;
  /** หัวหน้าแผนก/แอดมิน ควบคุมงานลูกน้องได้ตลอด — ดึงงาน · อัปเดตสถานะ · ส่งต่อ */
  const canControlSelectedTask = !!(
    selectedTask && currentUser && (
      currentUser.id === selectedTask.assignedTo
      || currentUser.role === 'Admin'
      || (currentUser.role === 'Head' && selectedAssignee?.department === currentUser.department)
    )
  );
  const canDeleteTask = (task) => {
    if (!task || !currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (String(task.createdBy) === String(currentUser.id)) return true;
    if (currentUser.role === 'Head') {
      const assignee = usersById.get(task.assignedTo);
      return assignee?.department === currentUser.department;
    }
    return false;
  };
  const canEditTask = (task) => {
    if (!task || !currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (String(task.createdBy) === String(currentUser.id)) return true;
    if (String(task.assignedTo) === String(currentUser.id)) return true;
    if (currentUser.role === 'Head') {
      const assignee = usersById.get(task.assignedTo);
      return assignee?.department === currentUser.department;
    }
    return false;
  };
  const canEditTaskProject = !!(
    selectedTask && currentUser && (
      canControlSelectedTask
      || String(selectedTask.createdBy) === String(currentUser.id)
      || String(selectedTask.assignedTo) === String(currentUser.id)
    )
  );

  const finishLogin = async (loginResult) => {
    const user = loginResult?.user ?? loginResult;
    const bundledBootstrap = loginResult?.bootstrap ?? null;
    if (!user?.id) throw new Error('เข้าสู่ระบบไม่สำเร็จ');
    saveSession(user);
    setCreateType('task');
    setCurrentModule('dashboard');
    setLoginError(null);
    setBootError(null);

    if (bundledBootstrap?.users) {
      applyBootstrap(bundledBootstrap, { restoreSession: false });
      const fresh = (bundledBootstrap.users || []).find((x) => String(x.id) === String(user.id) && x.active !== false);
      setCurrentUser(fresh ? { ...user, ...fresh } : user);
      lastSyncAtRef.current = Date.now();
      setBootLoading(false);
      return;
    }

    setBootLoading(true);
    try {
      const data = await api('getBootstrap', {});
      if (!data || !Array.isArray(data.users)) {
        throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }
      applyBootstrap(data, { restoreSession: false });
      const fresh = (data.users || []).find((x) => String(x.id) === String(user.id) && x.active !== false);
      setCurrentUser(fresh ? { ...user, ...fresh } : user);
      lastSyncAtRef.current = Date.now();
    } catch (err) {
      setUsers((prev) => upsertById(prev, user));
      setCurrentUser(user);
      showToast('❌ โหลดข้อมูลไม่ครบ: ' + (err?.message || String(err)));
    } finally {
      setBootLoading(false);
    }
  };

  const handleOpenDepartment = async ({ departmentCode }) => {
    if (loginBusy) return null;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await api('listDeptUsersForLogin', { departmentCode });
      return result;
    } catch (err) {
      setLoginError(err?.message || String(err));
      return null;
    } finally {
      setLoginBusy(false);
    }
  };

  const handlePickUser = async ({ departmentCode, userId }) => {
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await api('loginDeptPick', { departmentCode, userId });
      await finishLogin(result);
    } catch (err) {
      setLoginError(err?.message || String(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLoginAdmin = async ({ username, password }) => {
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const result = await api('loginAdmin', { username, password });
      await finishLogin(result);
    } catch (err) {
      setLoginError(err?.message || String(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setSelectedTask(null);
    setDetailProjectId(null);
    setCurrentModule('dashboard');
  };

  const handleSaveSettings = async (payload) => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('updateUserProfile', payload);
      setUsers((prev) => upsertById(prev, row));
      setCurrentUser(row);
      saveSession(row);
      showToast('✅ บันทึกการตั้งค่าแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async ({ currentPassword, newPassword }) => {
    if (busy || !currentUser) return;
    setBusy(true);
    try {
      await api('changePassword', {
        userId: currentUser.id,
        currentPassword,
        newPassword,
      });
      showToast('✅ เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminCreateUser = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const row = await api('adminCreateUser', payload);
      setUsers((prev) => upsertById(prev, row));
      showToast('✅ สร้างผู้ใช้แล้ว');
      return row;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLoadUsers = async (payload) => api('adminGetUsers', payload);

  const handleAdminUpdateUser = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const row = await api('adminUpdateUser', payload);
      setUsers((prev) => upsertById(prev, row));
      if (String(row.id) === String(currentUser?.id)) {
        setCurrentUser(row);
        saveSession(row);
      }
      showToast('✅ อัปเดตผู้ใช้แล้ว');
      return row;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminResetPassword = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const row = await api('adminResetPassword', payload);
      showToast('✅ รีเซ็ตรหัสผ่านแล้ว');
      return row;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminToggleActive = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const row = await api('adminSetUserActive', payload);
      setUsers((prev) => upsertById(prev, row));
      showToast(row.active ? '✅ เปิดใช้งานบัญชีแล้ว' : 'บัญชีถูกปิดใช้งานแล้ว');
      return row;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminCreateOrg = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const row = await api('adminCreateOrgUnit', payload);
      setOrgUnits((prev) => {
        const without = prev.filter((o) => String(o.id) !== String(row.id));
        return [...without, row].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      });
      showToast(payload.type === 'division' ? '✅ เพิ่มกองแล้ว' : '✅ เพิ่มแผนกแล้ว');
      return row;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminUpdateOrg = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const row = await api('adminUpdateOrgUnit', payload);
      if (row) {
        const { lineChannelToken, lineGroupId, ...publicRow } = row;
        setOrgUnits((prev) => prev.map((o) => (String(o.id) === String(publicRow.id) ? { ...o, ...publicRow } : o)));
      }
      return row;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLoadOrgUnits = async (payload) => api('adminGetOrgUnits', payload);

  const handleAdminOpenDatabase = async () => {
    if (!currentUser?.id) throw new Error('ไม่พบผู้ใช้');
    return api('adminGetDatabaseInfo', { adminId: currentUser.id });
  };

  const handleAdminDeleteOrg = async (payload) => {
    if (busy) return;
    setBusy(true);
    try {
      await api('adminDeleteOrgUnit', payload);
      setOrgUnits((prev) => prev.filter((o) => String(o.id) !== String(payload.id)));
      showToast('ลบรายการแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleAdminSeedDemo = async () => {
    if (busy || !currentUser) return null;
    setBusy(true);
    try {
      const result = await api('adminSeedDemoData', { adminId: currentUser.id });
      const data = result?.bootstrap || await api('getBootstrap', { force: true });
      if (data && Array.isArray(data.users)) {
        applyBootstrap(data, { restoreSession: false });
      }
      showToast('✅ ' + (result?.message || 'โหลดข้อมูลตัวอย่างแล้ว'));
      return result;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const notificationItems = useMemo(() => {
    const items = [];
    visibleTasks.forEach((t) => {
      const isPendingMine = t.assignedTo === currentUser?.id && t.status === 'Pending';
      const isReviewForManager = isManager && t.status === 'Review';
      if (!isPendingMine && !isReviewForManager) return;
      items.push({
        key: `task:${t.id}`,
        kind: 'task',
        taskId: t.id,
        title: t.title,
        message: isPendingMine
          ? `งานใหม่รอรับ · กำหนดส่ง ${formatThaiDate(t.dueDate, { emptyLabel: 'ไม่ระบุ' })}`
          : `รอตรวจจากหัวหน้า · ผู้ทำ ${usersById.get(t.assignedTo)?.name || '—'}`,
        tone: isPendingMine ? 'amber' : 'violet',
      });
    });
    stickyReminderNotes.forEach((n) => {
      items.push({
        key: `sticky:${n.id}:${dayKeyLocal(n.reminderAt)}`,
        kind: 'sticky',
        stickyId: n.id,
        title: n.title || 'เตือนความจำ',
        message: n.body || (Array.isArray(n.items) ? n.items.map((i) => i.text).filter(Boolean).join(' · ') : '') || 'ถึงวันเตือนความจำแล้ว',
        tone: 'rose',
      });
    });
    return items;
  }, [visibleTasks, currentUser?.id, isManager, stickyReminderNotes, usersById]);

  const unreadBellItems = useMemo(
    () => notificationItems.filter((item) => !seenBellKeys.has(item.key)),
    [notificationItems, seenBellKeys]
  );

  const totalBellNotifications = unreadBellItems.length;
  const unreadBellKeysRef = useRef([]);
  unreadBellKeysRef.current = unreadBellItems.map((x) => x.key);

  const markBellSeen = (keys = unreadBellKeysRef.current) => {
    if (!keys.length) return;
    setSeenBellKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      try {
        sessionStorage.setItem('gtp_bell_seen', JSON.stringify([...next].slice(-200)));
      } catch { /* ignore */ }
      return next;
    });
  };

  const toggleBellPanel = (wrapRef) => {
    setBellOpen((wasOpen) => {
      if (wasOpen) return false;
      const btn = wrapRef.current?.querySelector('button');
      if (btn) {
        const r = btn.getBoundingClientRect();
        const panelW = Math.min(320, window.innerWidth - 16);
        let left = r.right - panelW;
        left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
        setBellAnchor({
          top: r.bottom + 8,
          left,
          width: panelW,
        });
      } else {
        setBellAnchor({ top: 56, left: 8, width: Math.min(320, window.innerWidth - 16) });
      }
      return true;
    });
  };

  const closeBellAndMarkSeen = () => {
    markBellSeen();
    setBellOpen(false);
  };

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDoc = (e) => {
      if (desktopBellRef.current?.contains(e.target)) return;
      if (mobileBellRef.current?.contains(e.target)) return;
      if (bellPanelRef.current?.contains(e.target)) return;
      markBellSeen();
      setBellOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [bellOpen]);

  // Warm the largest lazy page after login so opening Reminders feels instant.
  useEffect(() => {
    if (!currentUser?.id || bootLoading) return undefined;
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => loadStickyNotesModule(), { timeout: 1500 });
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(() => loadStickyNotesModule(), 350);
    return () => clearTimeout(timer);
  }, [currentUser?.id, bootLoading]);

  const statusCounts = useMemo(() => {
    const counts = { all: visibleTasks.length, Pending: 0, 'In Progress': 0, Completed: 0 };
    visibleTasks.forEach((t) => {
      if (t.status === 'Pending') counts.Pending += 1;
      else if (t.status === 'In Progress') counts['In Progress'] += 1;
      else if (t.status === 'Completed') counts.Completed += 1;
    });
    return counts;
  }, [visibleTasks]);

  const tasksByDueDay = useMemo(() => {
    const m = new Map();
    visibleTasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = new Date(t.dueDate).setHours(0, 0, 0, 0);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    });
    return m;
  }, [visibleTasks]);

  const selectedComments = useMemo(
    () => comments.filter((c) => selectedTask && String(c.taskId) === String(selectedTask.id)),
    [comments, selectedTask?.id]
  );

  const selectedLogs = useMemo(
    () => taskLogs
      .filter((log) => selectedTask && String(log.taskId) === String(selectedTask.id))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [taskLogs, selectedTask?.id]
  );

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (busy || !currentUser) return;
    const formData = new FormData(e.target);
    setBusy(true);
    let pendingTaskId = null;
    try {
      if (createType === 'project') {
        const row = await api('createProject', {
          name: formData.get('name'),
          description: formData.get('description'),
          createdBy: currentUser.id,
          department: currentUser.role === 'Admin'
            ? String(formData.get('department') || currentUser.department || '').trim()
            : currentUser.department,
          startDate: formData.get('startDate') || null,
          endDate: formData.get('endDate') || null,
        });
        setProjects((prev) => upsertById(prev, row));
        setCurrentModule('projects');
        showToast('✅ สร้างโปรเจกต์สำเร็จ');
      } else {
        const rawAssignee = String(formData.get('assignedTo') || '');
        const selfAssign = !rawAssignee || rawAssignee === currentUser.id;
        const assignedTo = selfAssign ? currentUser.id : rawAssignee;
        const notifyLine = !selfAssign && formData.get('notifyLine') === 'on';
        const title = String(formData.get('title') || '').trim();
        const projectId = formData.get('projectId') || null;
        const description = String(formData.get('description') || '');
        const dueDate = formData.get('dueDate') || null;
        const isRecurring = formData.get('isRecurring') === 'on';
        const status = selfAssign ? 'In Progress' : 'Pending';
        const type = selfAssign ? 'Self' : 'Assigned';
        const logDetail = selfAssign
          ? (isManager ? 'หัวหน้าสร้างงานและรับทำเอง' : 'สร้างงานด้วยตัวเอง')
          : `มอบหมายงานให้ ${usersById.get(assignedTo)?.name}`;
        const pendingId = `pending_${Date.now()}`;
        pendingTaskId = pendingId;
        const optimisticTask = {
          id: pendingId,
          projectId,
          title,
          description,
          createdBy: currentUser.id,
          assignedTo,
          status,
          type,
          dueDate,
          isRecurring,
          createdAt: new Date().toISOString(),
          completedAt: null,
        };
        patchTask(optimisticTask);
        setActiveProjectId(null);
        setCurrentModule('board');
        e.target.reset();

        const result = await api('createTask', {
          projectId,
          title,
          description,
          createdBy: currentUser.id,
          assignedTo,
          status,
          type,
          dueDate,
          isRecurring,
          notifyLine,
          logDetail,
        });
        const savedTask = result?.task || result;
        setTasks((prev) => upsertById(prev.filter((t) => String(t.id) !== pendingId), savedTask));
        if (result?.log) setTaskLogs((prev) => upsertById(prev, result.log));
        scheduleTaskNotify({
          event: 'create',
          taskId: savedTask.id,
          userId: currentUser.id,
          notifyLine,
        });
        if (notifyLine) showToast('🔔 ระบบสร้างงานและส่งแจ้งกลุ่ม LINE แผนกแล้ว');
        else if (!selfAssign) showToast(`✅ มอบหมายงานให้ ${usersById.get(assignedTo)?.name} แล้ว`);
        else if (selfAssign && (orgUnits || []).some((o) => o.type === 'department' && o.name === currentUser.department && o.lineEnabled && o.lineConfigured)) {
          showToast('🔔 สร้างงานและแจ้งกลุ่ม LINE แผนกแล้ว');
        } else showToast('✅ สร้างงานสำเร็จ');
      }
    } catch (err) {
      if (pendingTaskId) {
        setTasks((prev) => prev.filter((t) => String(t.id) !== pendingTaskId));
        setCurrentModule('create');
      }
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus, notifyLine = false) => {
    if (busy || !currentUser) return;
    setBusy(true);
    try {
      const task = tasks.find((t) => String(t.id) === String(taskId));
      const actingAsHead = currentUser.role === 'Head' && task && String(task.assignedTo) !== String(currentUser.id);
      const completedLabel = formatThaiDateLong(new Date());
      let logDetail = actingAsHead
        ? `หัวหน้าอัปเดตสถานะเป็น "${getStatusText(newStatus)}" (แทนผู้รับผิดชอบ)`
        : `เปลี่ยนสถานะเป็น "${getStatusText(newStatus)}"`;
      if (task?.status === 'Completed' && newStatus !== 'Completed') {
        logDetail = actingAsHead
          ? `หัวหน้ายกเลิกปิดงาน · กลับไป "${getStatusText(newStatus)}"`
          : `ยกเลิกปิดงาน · กลับไป "${getStatusText(newStatus)}"`;
      } else if (newStatus === 'Completed') {
        logDetail = actingAsHead
          ? `หัวหน้าปิดงานเป็น "เสร็จสิ้น" · วันเสร็จ ${completedLabel} (แทนผู้รับผิดชอบ)`
          : `เปลี่ยนสถานะเป็น "เสร็จสิ้น" · วันเสร็จ ${completedLabel}`;
      }
      const result = await api('updateTaskStatus', {
        taskId,
        status: newStatus,
        userId: currentUser.id,
        notifyLine,
        logDetail,
      });
      patchTask(result?.task || result, result?.log);
      scheduleTaskNotify({
        event: 'status',
        taskId,
        userId: currentUser.id,
        status: newStatus,
        notifyLine,
      });
      const assigneeDept = usersById.get(task?.assignedTo)?.department;
      const lineDeptOn = (orgUnits || []).some((o) => o.type === 'department' && o.name === assigneeDept && o.lineEnabled && o.lineConfigured);
      if (notifyLine || (lineDeptOn && (newStatus === 'Review' || newStatus === 'Completed'))) {
        showToast(`📱 อัปเดตเป็น ${getStatusText(newStatus)} และแจ้งกลุ่ม LINE แผนกแล้ว`);
      } else if (task?.status === 'Completed' && newStatus !== 'Completed') {
        showToast(`↩️ ยกเลิกปิดงาน · กลับไป${getStatusText(newStatus)}`);
      } else if (newStatus === 'Completed') showToast(`✅ เสร็จสิ้นเมื่อ ${completedLabel}`);
      else showToast(`อัปเดตสถานะเป็น ${getStatusText(newStatus)}`);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleForward = async (taskId, newAssigneeId) => {
    if (busy || !currentUser || !newAssigneeId) return;
    setBusy(true);
    try {
      const name = usersById.get(newAssigneeId)?.name;
      const result = await api('forwardTask', { taskId, newAssigneeId, userId: currentUser.id });
      patchTask(result?.task || result, result?.log);
      scheduleTaskNotify({ event: 'forward', taskId, userId: currentUser.id });
      setSelectedTask(null);
      showToast(`โอนงานให้ ${name} เรียบร้อยแล้ว`);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTaskProject = async (taskId, projectId) => {
    if (busy || !currentUser) return;
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;
    const prevId = task.projectId ? String(task.projectId) : '';
    const nextId = projectId ? String(projectId) : '';
    if (prevId === nextId) return;
    setBusy(true);
    try {
      const projName = nextId
        ? (visibleProjects.find((p) => String(p.id) === nextId)?.name || nextId)
        : 'งานทั่วไป';
      const result = await api('updateTask', {
        taskId,
        userId: currentUser.id,
        projectId: nextId,
        logDetail: `เปลี่ยนโปรเจกต์เป็น "${projName}"`,
      });
      patchTask(result?.task || result, result?.log);
      showToast(`✅ จัดอยู่ในโปรเจกต์: ${projName}`);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTaskDetails = async () => {
    if (!currentUser || !selectedTask || !taskEditDraft || !canEditTaskProject) return;
    const dueDate = taskEditDraft.dueDate || null;
    const unchanged = (taskEditDraft.description || '') === (selectedTask.description || '')
      && (dueDate || null) === (selectedTask.dueDate ? toDateInputValue(selectedTask.dueDate) : null)
      && !!taskEditDraft.isRecurring === !!selectedTask.isRecurring;
    if (unchanged) {
      showToast('ไม่มีการเปลี่ยนแปลง');
      return;
    }
    const prevDraft = {
      description: selectedTask.description || '',
      dueDate: selectedTask.dueDate ? toDateInputValue(selectedTask.dueDate) : null,
      isRecurring: !!selectedTask.isRecurring,
    };
    patchTask({
      ...selectedTask,
      description: taskEditDraft.description || '',
      dueDate: dueDate || null,
      isRecurring: taskEditDraft.isRecurring,
    });
    try {
      const result = await api('updateTask', {
        taskId: selectedTask.id,
        userId: currentUser.id,
        description: taskEditDraft.description || '',
        dueDate,
        isRecurring: taskEditDraft.isRecurring,
        logDetail: 'แก้ไขรายละเอียดงาน',
      });
      patchTask(result?.task || result, result?.log);
      showToast('✅ บันทึกรายละเอียดงานแล้ว');
    } catch (err) {
      patchTask({
        ...selectedTask,
        description: prevDraft.description,
        dueDate: prevDraft.dueDate,
        isRecurring: prevDraft.isRecurring,
      });
      showToast('❌ ' + (err?.message || String(err)));
    }
  };

  const handleSaveBoardTaskTitle = async (taskId, titleInput) => {
    if (!currentUser) return false;
    const title = (titleInput || '').trim();
    if (!title) {
      showToast('❌ กรอกชื่องาน');
      return false;
    }
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task || !canEditTask(task)) return false;
    if (title === (task.title || '')) return true;
    const prevTitle = task.title || '';
    patchTask({ ...task, title });
    try {
      const result = await api('updateTask', {
        taskId,
        userId: currentUser.id,
        title,
        logDetail: 'แก้ไขชื่องาน',
      });
      patchTask(result?.task || result, result?.log);
      showToast('✅ บันทึกชื่องานแล้ว');
      return true;
    } catch (err) {
      patchTask({ ...task, title: prevTitle });
      showToast('❌ ' + (err?.message || String(err)));
      return false;
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (busy || !currentUser) return;
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task || !canDeleteTask(task)) {
      showToast('❌ ไม่มีสิทธิ์ลบงานนี้');
      return;
    }
    if (!window.confirm(`ลบงาน "${task.title}" ถาวร?\n(ลบประวัติและความคิดเห็นด้วย)`)) return;
    setBusy(true);
    try {
      await api('deleteTask', { taskId, userId: currentUser.id });
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
      setTaskLogs((prev) => prev.filter((l) => String(l.taskId) !== String(taskId)));
      setComments((prev) => prev.filter((c) => String(c.taskId) !== String(taskId)));
      setCommentCounts((prev) => {
        const next = { ...prev };
        delete next[String(taskId)];
        return next;
      });
      if (selectedTask && String(selectedTask.id) === String(taskId)) setSelectedTask(null);
      showToast('ลบงานแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleTakeover = async (taskId) => {
    if (busy || !currentUser) return;
    setBusy(true);
    try {
      const result = await api('takeoverTask', { taskId, userId: currentUser.id });
      patchTask(result?.task || result, result?.log);
      showToast('ดึงงานสำเร็จ! คุณเป็นผู้รับผิดชอบงานนี้แล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedTask || !currentUser || busy) return;
    const text = e.target.comment.value;
    if (!text) return;
    setBusy(true);
    try {
      const row = await api('addComment', { taskId: selectedTask.id, authorId: currentUser.id, text });
      const cacheKey = String(selectedTask.id);
      setComments((prev) => [...prev, row]);
      setCommentCounts((prev) => ({ ...prev, [cacheKey]: (prev[cacheKey] || 0) + 1 }));
      const cached = taskActivityCacheRef.current.get(cacheKey);
      if (cached) {
        taskActivityCacheRef.current.set(cacheKey, {
          ...cached,
          comments: [...cached.comments, row],
        });
      }
      e.target.reset();
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProject = async (payload) => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('updateProject', payload);
      setProjects((prev) => upsertById(prev, row));
      showToast('✅ บันทึกโปรเจกต์แล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateMilestone = async (payload) => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('createMilestone', payload);
      setMilestones((prev) => [...prev, row]);
      showToast('✅ เพิ่มขั้นตอนแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateMilestone = async (payload) => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('updateMilestone', payload);
      setMilestones((prev) => upsertById(prev, row));
      if (payload.completed === true) showToast('✅ ติ๊กเสร็จสิ้นขั้นตอนแล้ว');
      else if (payload.completed === false) showToast('ยกเลิกการเสร็จสิ้นแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleReorderMilestones = async (updates) => {
    if (busy || !updates?.length) return;
    setBusy(true);
    const sortMap = new Map(updates.map((u) => [String(u.id), u.sortOrder]));
    setMilestones((prev) => prev.map((m) => {
      const sortOrder = sortMap.get(String(m.id));
      return sortOrder !== undefined ? { ...m, sortOrder } : m;
    }));
    try {
      await Promise.all(
        updates.map(({ id, sortOrder }) => api('updateMilestone', { id, sortOrder })),
      );
      showToast('✅ จัดลำดับขั้นตอนแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      softRefresh({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMilestone = async (id) => {
    if (busy || !window.confirm('ลบขั้นตอนนี้?')) return;
    setBusy(true);
    try {
      await api('deleteMilestone', { id });
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      showToast('ลบขั้นตอนแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateContractExtension = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const result = await api('createContractExtension', payload);
      if (result?.extension) {
        setContractExtensions((prev) => [...prev, result.extension]);
      }
      if (result?.project) {
        setProjects((prev) => upsertById(prev, result.project));
      }
      showToast(`✅ บันทึกขยายสัญญาครั้งที่ ${result?.extension?.extensionNo || ''} แล้ว`);
      return result?.extension || null;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateContractExtension = async (payload) => {
    if (busy) return null;
    setBusy(true);
    try {
      const result = await api('updateContractExtension', payload);
      if (result?.extension) {
        setContractExtensions((prev) => upsertById(prev, result.extension));
      }
      if (result?.project) {
        setProjects((prev) => upsertById(prev, result.project));
      }
      showToast('✅ แก้ไขประวัติขยายสัญญาแล้ว');
      return result?.extension || null;
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteContractExtension = async (id) => {
    if (busy || !window.confirm('ลบประวัติการขยายสัญญารายการนี้?')) return;
    setBusy(true);
    try {
      await api('deleteContractExtension', { id });
      setContractExtensions((prev) => prev.filter((x) => String(x.id) !== String(id)));
      showToast('ลบประวัติการขยายสัญญาแล้ว');
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const detailProject = visibleProjects.find((p) => p.id === detailProjectId);

  const reportData = useMemo(() => {
    let filtered = visibleTasks;
    if (reportUser !== 'all') filtered = filtered.filter((t) => t.assignedTo === reportUser);
    const now = new Date();
    filtered = filtered.filter((t) => {
      const taskDate = new Date(t.createdAt);
      if (reportPeriod === 'today') return taskDate.toDateString() === now.toDateString();
      if (reportPeriod === 'week') return taskDate >= new Date(now.getTime() - 7 * DAY);
      if (reportPeriod === 'month') return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
      return true;
    });
    const grouped = {};
    filtered.forEach((t) => {
      const dateKey = formatDate(t.createdAt);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });
    return grouped;
  }, [visibleTasks, reportUser, reportPeriod]);

  if (bootLoading) {
    return (
      <div className="min-h-screen gtp-login-bg flex items-center justify-center">
        <div className="flex flex-col items-center gtp-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-400/30 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="gtp-display font-extrabold text-lg text-[#1e3a4c]">กำลังโหลด GovTaskPro...</p>
          <p className="text-sm mt-1.5 text-[#5b7a8a] font-medium">{isProductionHost() ? 'เชื่อมต่อ Google Sheets' : 'โหมดพัฒนา (local)'}</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen gtp-login-bg flex items-center justify-center p-4">
        <div className="gtp-login-card p-8 max-w-md w-full text-center gtp-fade-in">
          <p className="gtp-display font-extrabold text-rose-500 mb-2 text-lg">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="text-sm text-[#5b7a8a] mb-6 font-medium leading-relaxed">{bootError}</p>
          <button onClick={loadBootstrap} className="gtp-btn-primary px-6 py-3">ลองใหม่</button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        busy={loginBusy}
        error={loginError}
        onOpenDepartment={handleOpenDepartment}
        onPickUser={handlePickUser}
        onLoginAdmin={handleLoginAdmin}
      />
    );
  }

  return (
    <div className="gtp-app min-h-dvh flex flex-col md:flex-row md:p-3 md:gap-3">
      {toastMsg && (
        <div className="fixed top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] gtp-toast px-6 py-3 flex items-center gtp-fade-in max-w-[92vw]">
          <span className="font-semibold text-sm">{toastMsg}</span>
        </div>
      )}

      {bellOpen && bellAnchor && (
        <div
          ref={bellPanelRef}
          className="fixed z-[100] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden gtp-fade-in"
          style={{ top: bellAnchor.top, left: bellAnchor.left, width: bellAnchor.width }}
        >
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-800">แจ้งเตือน</p>
              <p className="text-[11px] text-slate-500 font-medium truncate">{unreadBellItems.length} รายการที่ยังไม่ได้อ่าน</p>
            </div>
            <button
              type="button"
              className="text-[11px] font-bold text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-lg shrink-0"
              onClick={closeBellAndMarkSeen}
            >
              อ่านแล้ว
            </button>
          </div>
          <div className="max-h-[min(20rem,50vh)] overflow-y-auto divide-y divide-slate-100">
            {unreadBellItems.length === 0 ? (
              <p className="p-6 text-center text-sm font-bold text-slate-400">ไม่มีแจ้งเตือนใหม่</p>
            ) : unreadBellItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => {
                  markBellSeen([item.key]);
                  if (item.kind === 'task') {
                    const task = tasks.find((t) => String(t.id) === String(item.taskId));
                    if (task) {
                      setSelectedTask(task);
                      setTaskModalTab('details');
                      setCurrentModule('board');
                    }
                  } else {
                    setCurrentModule('sticky');
                  }
                  setBellOpen(false);
                }}
              >
                <p className="text-sm font-extrabold text-slate-800 line-clamp-2">{item.title}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2">{item.message}</p>
                <span className={`inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full ${
                  item.tone === 'amber' ? 'bg-amber-100 text-amber-800'
                    : item.tone === 'violet' ? 'bg-violet-100 text-violet-800'
                      : 'bg-rose-100 text-rose-800'
                }`}>
                  {item.kind === 'task' ? 'งาน' : 'เตือนความจำ'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="gtp-nav hidden md:flex w-64 flex-shrink-0 flex-col z-20 rounded-[1.75rem] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-teal-400 to-cyan-600 p-2.5 rounded-2xl shadow-lg shadow-teal-500/25">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="gtp-display font-extrabold text-lg leading-tight text-white">GovTask</h2>
              <p className="text-[10px] text-teal-200/90 font-semibold tracking-wider">{currentUser.division}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" title="ซิงก์ข้อมูล" className="p-2 rounded-xl hover:bg-white/10 transition-colors" onClick={() => softRefresh({ silent: false, force: true })}>
              <RefreshCw className={`w-5 h-5 text-teal-100/80 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative" ref={desktopBellRef}>
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                aria-label="แจ้งเตือน"
                onClick={() => toggleBellPanel(desktopBellRef)}
              >
                <Bell className="w-5 h-5 text-teal-100/80" />
              </button>
              {totalBellNotifications > 0 && <span className="absolute top-1 right-1 bg-rose-400 w-2.5 h-2.5 rounded-full ring-2 ring-[#163542] gtp-soft-pulse" />}
            </div>
          </div>
        </div>

        <div className="p-4 mx-3 mt-3 rounded-2xl bg-white/10 border border-white/10 flex items-center space-x-3">
          <div className={`p-2.5 rounded-2xl ${
            currentUser.role === 'Admin' ? 'bg-amber-400/20 text-amber-200'
              : currentUser.role === 'Head' ? 'bg-sky-400/20 text-sky-200'
                : 'bg-emerald-400/20 text-emerald-200'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">{currentUser.name}</p>
            <p className="text-[11px] text-teal-100/70 truncate">
              {currentUser.role === 'Admin' ? 'แอดมินระบบ' : currentUser.role === 'Head' ? 'หัวหน้าแผนก' : 'พนักงานปฏิบัติการ'}
              {currentUser.username ? ` · @${currentUser.username}` : ''}
              {currentUser.department ? ` · ${currentUser.department}` : ''}
            </p>
          </div>
        </div>

        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม (Dashboard)' },
            { id: 'projects', icon: FolderKanban, label: 'โปรเจกต์ (Projects)' },
            { id: 'board', icon: KanbanSquare, label: 'กระดานงาน (Board)', action: () => setActiveProjectId(null) },
            { id: 'calendar', icon: CalendarDays, label: 'ปฏิทินงาน (Calendar)' },
            { id: 'sticky', icon: StickyNote, label: 'เตือนความจำ (ส่วนตัว)' },
            { id: 'reports', icon: BarChart2, label: 'สถิติ & รายงาน (Reports)' },
            ...(currentUser.role === 'Admin' ? [{ id: 'adminUsers', icon: ShieldCheck, label: 'สิทธิ์ตามแผนก (Admin)' }] : []),
            { id: 'settings', icon: Settings2, label: 'ตั้งค่า (Settings)' },
          ].map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                setCurrentModule(menu.id);
                if (menu.id === 'projects') setDetailProjectId(null);
                if (menu.action) menu.action();
              }}
              className={`gtp-nav-item flex items-center space-x-3 px-4 py-3 rounded-2xl w-full whitespace-nowrap ${
                currentModule === menu.id ? 'gtp-nav-item-active' : 'text-teal-100/70 font-medium'
              }`}
            >
              <span className="relative shrink-0">
                <menu.icon className={`w-5 h-5 ${currentModule === menu.id ? 'opacity-100' : 'opacity-70'}`} />
                {menu.id === 'sticky' && stickyRemindersDue > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-rose-400 text-[9px] font-black text-white flex items-center justify-center ring-2 ring-[#163542] gtp-soft-pulse">
                    {stickyRemindersDue > 9 ? '9+' : stickyRemindersDue}
                  </span>
                )}
              </span>
              <span className="text-sm flex-1 text-left">{menu.label}</span>
              {menu.id === 'sticky' && stickyRemindersDue > 0 && (
                <span className="text-[10px] font-extrabold text-rose-200 bg-rose-500/25 border border-rose-300/20 px-1.5 py-0.5 rounded-full">
                  วันนี้
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="gtp-nav-item flex items-center space-x-3 px-4 py-3 rounded-2xl w-full text-teal-100/60 hover:text-rose-200 hover:bg-rose-500/15 font-medium">
            <LogOut className="w-5 h-5 opacity-70" />
            <span className="text-sm">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      <header className="md:hidden sticky top-0 z-30 gtp-nav gtp-safe-top px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-gradient-to-br from-teal-400 to-cyan-600 p-2 rounded-xl shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="gtp-display font-extrabold text-white text-sm leading-tight truncate">GovTaskPro</p>
            <p className="text-[10px] text-teal-200/80 font-semibold truncate">{currentUser.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" className="p-2.5 rounded-xl hover:bg-white/10" onClick={() => softRefresh({ silent: false, force: true })} aria-label="ซิงก์">
            <RefreshCw className={`w-5 h-5 text-teal-100 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative" ref={mobileBellRef}>
            <button
              type="button"
              className="p-2.5 rounded-xl hover:bg-white/10 relative"
              aria-label="แจ้งเตือน"
              onClick={() => toggleBellPanel(mobileBellRef)}
            >
              <Bell className="w-5 h-5 text-teal-100" />
              {totalBellNotifications > 0 && <span className="absolute top-1.5 right-1.5 bg-rose-400 w-2 h-2 rounded-full" />}
            </button>
          </div>
          <button type="button" className="p-2.5 rounded-xl hover:bg-white/10" onClick={() => setMobileMoreOpen(true)} aria-label="เมนู">
            <Menu className="w-5 h-5 text-teal-100" />
          </button>
        </div>
      </header>

      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-label="ปิดเมนู" onClick={() => setMobileMoreOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[min(20rem,88vw)] gtp-nav shadow-2xl flex flex-col gtp-safe-top gtp-safe-bottom">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <p className="gtp-display font-extrabold text-white">เมนูทั้งหมด</p>
              <button type="button" className="p-2 rounded-xl hover:bg-white/10" onClick={() => setMobileMoreOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-3 space-y-1 flex-1 overflow-y-auto">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
                { id: 'projects', icon: FolderKanban, label: 'โปรเจกต์' },
                { id: 'board', icon: KanbanSquare, label: 'กระดานงาน', action: () => setActiveProjectId(null) },
                { id: 'calendar', icon: CalendarDays, label: 'ปฏิทินงาน' },
                { id: 'sticky', icon: StickyNote, label: 'เตือนความจำ' },
                { id: 'reports', icon: BarChart2, label: 'สถิติ & รายงาน' },
                { id: 'create', icon: Plus, label: 'สร้างงาน' },
                ...(currentUser.role === 'Admin' ? [{ id: 'adminUsers', icon: ShieldCheck, label: 'สิทธิ์แผนก' }] : []),
                { id: 'settings', icon: Settings2, label: 'ตั้งค่า' },
              ].map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => {
                    if (menu.id === 'create') {
                      openCreateModule();
                      setMobileMoreOpen(false);
                      return;
                    }
                    setCurrentModule(menu.id);
                    if (menu.id === 'projects') setDetailProjectId(null);
                    if (menu.action) menu.action();
                    setMobileMoreOpen(false);
                  }}
                  className={`gtp-nav-item flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full ${
                    currentModule === menu.id ? 'gtp-nav-item-active' : 'text-teal-100/80'
                  }`}
                >
                  <span className="relative shrink-0">
                    <menu.icon className="w-5 h-5" />
                    {menu.id === 'sticky' && stickyRemindersDue > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-rose-400 text-[9px] font-black text-white flex items-center justify-center">
                        {stickyRemindersDue > 9 ? '9+' : stickyRemindersDue}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold flex-1 text-left">{menu.label}</span>
                  {menu.id === 'sticky' && stickyRemindersDue > 0 && (
                    <span className="text-[10px] font-extrabold text-rose-200 bg-rose-500/25 px-1.5 py-0.5 rounded-full">วันนี้</span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => { setMobileMoreOpen(false); softRefresh({ silent: false, force: true }); }}
                className="gtp-nav-item flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-teal-100/80 mb-1"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="text-sm font-bold">ซิงก์ข้อมูลทุกเครื่อง</span>
              </button>
              <button onClick={() => { setMobileMoreOpen(false); handleLogout(); }} className="gtp-nav-item flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-rose-200 hover:bg-rose-500/15">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-bold">ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative gtp-main md:rounded-[1.75rem] gtp-main-mobile md:h-[calc(100dvh-1.5rem)] md:pb-0">

        {currentModule === 'dashboard' && (
          <div className="p-6 md:p-8 gtp-module-scroll gtp-fade-in">
            <h2 className="gtp-display text-2xl md:text-[1.7rem] font-extrabold text-[#1e3a4c] mb-6">ภาพรวมการทำงานของแผนก</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'งานทั้งหมด', val: statusCounts.all, c: 'text-[#1e3a4c]', accent: 'from-slate-100 to-white' },
                { label: 'รอรับงาน (Pending)', val: statusCounts.Pending, c: 'text-amber-600', accent: 'from-amber-50 to-white' },
                { label: 'กำลังทำ (Active)', val: statusCounts['In Progress'], c: 'text-sky-600', accent: 'from-sky-50 to-white' },
                { label: 'เสร็จสิ้น (Done)', val: statusCounts.Completed, c: 'text-emerald-600', accent: 'from-emerald-50 to-white' },
              ].map((stat, i) => (
                <div key={i} className={`gtp-card gtp-stat p-5 bg-gradient-to-br ${stat.accent}`}>
                  <p className="text-[#5b7a8a] text-xs font-bold tracking-wide mb-2">{stat.label}</p>
                  <p className={`gtp-display text-4xl font-extrabold ${stat.c}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="gtp-card p-6 flex flex-col">
                <h3 className="gtp-display font-bold text-[#1e3a4c] mb-5 flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2 text-rose-400" /> งานที่ใกล้ถึงกำหนด / ล่าช้า
                </h3>
                <div className="space-y-3 flex-1">
                  {visibleTasks
                    .filter((t) => t.dueDate && t.status !== 'Completed')
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5)
                    .map((task) => {
                      const overdue = isOverdue(task.dueDate, task.status);
                      return (
                        <div key={task.id} className={`flex justify-between items-center p-3.5 rounded-2xl border ${overdue ? 'bg-rose-50/80 border-rose-100' : 'bg-[#f3f9fc] border-transparent'}`}>
                          <div className="overflow-hidden">
                            <p className="font-bold text-[#1e3a4c] text-sm truncate">{task.title}</p>
                            <p className="text-[11px] text-[#5b7a8a] mt-0.5 font-medium">รับผิดชอบ: {users.find((u) => u.id === task.assignedTo)?.name}</p>
                          </div>
                          <div className="shrink-0 pl-3">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide ${overdue ? 'bg-rose-500 text-white' : 'bg-white text-[#5b7a8a] border border-slate-100'}`}>
                              {overdue ? 'ล่าช้า' : formatDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {isManager ? (
                <div className="gtp-card p-6">
                  <h3 className="gtp-display font-bold text-[#1e3a4c] mb-5 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-teal-500" /> ภาระงานรายบุคคล (กำลังทำ / รอรับ)
                  </h3>
                  <div className="space-y-5">
                    {deptUsers.filter((u) => u.role === 'Staff').map((staff) => {
                      const activeTasks = activeTaskCountByUserId.get(String(staff.id)) || 0;
                      const maxLoad = 5;
                      const percentage = Math.min((activeTasks / maxLoad) * 100, 100);
                      return (
                        <div key={staff.id}>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-sm font-bold text-[#1e3a4c]">{staff.name}</span>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${activeTasks >= maxLoad ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-700'}`}>{activeTasks} งาน</span>
                          </div>
                          <div className="w-full bg-[#e8f2f6] rounded-full h-2.5 overflow-hidden">
                            <div className={`h-full rounded-full ${activeTasks >= maxLoad ? 'bg-rose-400' : 'bg-gradient-to-r from-teal-400 to-cyan-500'}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] shadow-lg border border-teal-300/30 p-8 text-white flex flex-col justify-center items-center text-center bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500">
                  <ShieldCheck className="w-14 h-14 mb-4 opacity-90" />
                  <h3 className="gtp-display text-xl font-bold mb-2">ยินดีต้อนรับ, {currentUser.name}</h3>
                  <p className="text-teal-50 text-sm leading-relaxed max-w-sm">มอบหมายงานให้เพื่อนในแผนก สร้างโปรเจกต์ และดึงงานมาทำแทนได้เมื่อจำเป็น</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentModule === 'projects' && !detailProject && (
          <div className="p-6 md:p-8 gtp-module-scroll gtp-fade-in">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c]">โปรเจกต์ทั้งหมด</h2>
                <p className="text-[#5b7a8a] text-sm mt-1 font-medium">
                  {currentUser.role === 'Admin'
                    ? 'ตั้งค่าช่วงเวลา · แผนขั้นตอน · S-Curve (ทุกแผนก)'
                    : `แสดงเฉพาะโปรเจกต์แผนก ${currentUser.department || 'ของคุณ'}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleProjects.length === 0 && (
                <div className="md:col-span-2 xl:col-span-3 gtp-card p-10 text-center text-slate-500">
                  <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-slate-600">ยังไม่มีโปรเจกต์ในแผนกนี้</p>
                  <p className="text-sm mt-1">สร้างโปรเจกต์ใหม่ได้จากปุ่ม 「สร้างงาน」บนกระดานงาน</p>
                </div>
              )}
              {visibleProjects.map((proj) => {
                const projTasks = tasksByProjectId.get(String(proj.id)) || [];
                const projMs = milestonesByProjectId.get(String(proj.id)) || [];
                const completedMs = projMs.filter((m) => m.completed).length;
                const totalW = projMs.reduce((s, m) => s + (Number(m.weight) || 1), 0) || 1;
                const doneW = projMs.filter((m) => m.completed).reduce((s, m) => s + (Number(m.weight) || 1), 0);
                const progress = projMs.length
                  ? Math.round((doneW / totalW) * 100)
                  : (projTasks.length === 0 ? 0 : Math.round((projTasks.filter((t) => t.status === 'Completed').length / projTasks.length) * 100));
                const activityPreview = summarizeRecentActivity(
                  buildProjectActivityForProject(proj.id, {
                    projects: visibleProjects,
                    tasks,
                    taskLogs,
                    milestones,
                    contractExtensions,
                  }),
                  7,
                );
                return (
                  <div
                    key={proj.id}
                    onClick={() => setDetailProjectId(proj.id)}
                    className="gtp-card gtp-card-hover p-6 cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-teal-50 p-2.5 rounded-2xl group-hover:bg-gradient-to-br group-hover:from-teal-400 group-hover:to-cyan-500 transition-all">
                        <FolderKanban className="w-6 h-6 text-teal-600 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-[#f3f9fc] text-[#5b7a8a] rounded-full">
                        {projMs.length ? `${completedMs}/${projMs.length} ขั้นตอน` : `${projTasks.length} งาน`}
                      </span>
                    </div>
                    <h3 className="gtp-display font-extrabold text-lg text-[#1e3a4c] mb-2 group-hover:text-teal-700">{proj.name}</h3>
                    <p className="text-sm text-[#5b7a8a] line-clamp-2 mb-3 flex-1 font-medium leading-relaxed">{proj.description}</p>
                    <p className="text-[11px] font-bold text-teal-700/90 mb-2 line-clamp-1" title={activityPreview.label}>
                      <History className="w-3 h-3 inline mr-1 -mt-0.5" />
                      7 วันล่าสุด: {activityPreview.label}
                    </p>
                    <p className="text-[11px] font-bold text-[#8aa3b0] mb-2">
                      {formatThaiDate(proj.startDate)} → {formatThaiDate(proj.endDate)}
                    </p>
                    <ProjectTimeBar startDate={proj.startDate} endDate={proj.endDate} compact />
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-bold text-[#1e3a4c] mb-2">
                        <span>ความคืบหน้าแผน (S-Curve)</span>
                        <span className={progress === 100 ? 'text-emerald-600' : 'text-teal-600'}>{progress}%</span>
                      </div>
                      <div className="w-full bg-[#e8f2f6] rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-teal-400 to-cyan-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentModule === 'projects' && detailProject && (
          <Suspense fallback={<ModuleLoading label="โปรเจกต์" />}>
            <ProjectDetail
              project={detailProject}
              milestones={milestones}
              contractExtensions={contractExtensions}
              tasks={tasks}
              users={users}
              cachedTaskLogs={taskLogs}
              currentUser={currentUser}
              busy={busy}
              onBack={() => setDetailProjectId(null)}
              onOpenBoard={() => { setActiveProjectId(detailProject.id); setCurrentModule('board'); }}
              onOpenTask={(task) => {
                setSelectedTask(task);
                setTaskModalTab('details');
              }}
              onSaveProject={handleSaveProject}
              onCreateMilestone={handleCreateMilestone}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onReorderMilestones={handleReorderMilestones}
              onCreateContractExtension={handleCreateContractExtension}
              onUpdateContractExtension={handleUpdateContractExtension}
              onDeleteContractExtension={handleDeleteContractExtension}
              showToast={showToast}
            />
          </Suspense>
        )}

        {currentModule === 'board' && (
          <BoardView
            visibleTasks={visibleTasks}
            visibleProjects={visibleProjects}
            activeProjectId={activeProjectId}
            currentUser={currentUser}
            assignableUsers={assignableUsers}
            usersById={usersById}
            projectsById={projectsById}
            commentCounts={commentCounts}
            busy={busy}
            canEditTask={canEditTask}
            canDeleteTask={canDeleteTask}
            onSelectTask={(task) => { setSelectedTask(task); setTaskModalTab('details'); }}
            onSaveTaskTitle={handleSaveBoardTaskTitle}
            onDeleteTask={handleDeleteTask}
            onClearProjectFilter={() => setActiveProjectId(null)}
            onOpenCreate={() => openCreateModule('board')}
          />
        )}

        {currentModule === 'calendar' && (
          <div className="p-6 md:p-8 flex-1 min-h-0 flex flex-col gtp-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 space-y-4 md:space-y-0">
              <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c] flex items-center">
                <CalendarDays className="w-7 h-7 mr-3 text-teal-500" /> ปฏิทินงาน
              </h2>
              <div className="flex items-center space-x-2 bg-white/90 p-1.5 rounded-2xl shadow-sm border border-white">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 text-[#5b7a8a] hover:text-teal-600 hover:bg-teal-50 rounded-xl">
                  <ArrowRightLeft className="w-4 h-4 rotate-180" />
                </button>
                <span className="font-bold text-[#1e3a4c] min-w-[140px] text-center">{formatThaiMonthYear(currentMonth)}</span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 text-[#5b7a8a] hover:text-teal-600 hover:bg-teal-50 rounded-xl">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 gtp-card overflow-hidden flex flex-col">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-[#f3f9fc] shrink-0">
                {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'].map((d, i) => (
                  <div key={d} className={`p-3 text-center text-xs font-bold tracking-wide border-r border-slate-100 last:border-0 ${i === 0 || i === 6 ? 'text-rose-400' : 'text-[#5b7a8a]'}`}>{d}</div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto bg-slate-50/30">
                {Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()).fill(null).map((_, i) => (
                  <div key={`blank-${i}`} className="border-r border-b border-slate-200/50 bg-slate-100/50 min-h-[120px]" />
                ))}
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map((day) => {
                  const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).setHours(0, 0, 0, 0);
                  const isToday = dateStr === new Date().setHours(0, 0, 0, 0);
                  const dayTasks = tasksByDueDay.get(dateStr) || [];
                  return (
                    <div key={day} className={`border-r border-b border-slate-200/50 min-h-[120px] p-2 flex flex-col ${isToday ? 'bg-teal-50/60 ring-1 ring-inset ring-teal-400' : 'bg-white hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-bold ${isToday ? 'bg-teal-500 text-white shadow-md' : 'text-slate-700'}`}>{day}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar px-0.5">
                        {dayTasks.map((task) => (
                          <div key={task.id} onClick={() => setSelectedTask(task)} className={`text-[10px] px-2 py-1.5 rounded-lg cursor-pointer truncate font-bold border shadow-sm ${getStatusColor(task.status)} ${task.status === 'Completed' ? 'opacity-60' : ''}`}>
                            {task.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentModule === 'sticky' && (
          <Suspense fallback={<ModuleLoading label="โน้ตติดผนัง" />}>
            <StickyNotes
              currentUser={currentUser}
              showToast={showToast}
              onRemindersChange={setStickyRemindersDue}
              initialNotes={stickyNotesSnapshot}
              initialNotesFetchedAt={stickyNotesFetchedAt}
            />
          </Suspense>
        )}

        {currentModule === 'settings' && (
          <Suspense fallback={<ModuleLoading label="ตั้งค่า" />}>
            <SettingsPage
              currentUser={currentUser}
              busy={busy}
              onSave={handleSaveSettings}
              onChangePassword={handleChangePassword}
              showToast={showToast}
              isProductionHost={isProductionHost()}
            />
          </Suspense>
        )}

        {currentModule === 'adminUsers' && currentUser.role === 'Admin' && (
          <Suspense fallback={<ModuleLoading label="สิทธิ์ตามแผนก" />}>
            <AdminUsers
              users={users}
              orgUnits={orgUnits}
              currentUser={currentUser}
              busy={busy}
              onLoadUsers={handleAdminLoadUsers}
              onCreate={handleAdminCreateUser}
              onUpdateUser={handleAdminUpdateUser}
              onToggleActive={handleAdminToggleActive}
              onCreateOrg={handleAdminCreateOrg}
              onUpdateOrg={handleAdminUpdateOrg}
              onLoadOrgUnits={handleAdminLoadOrgUnits}
              onDeleteOrg={handleAdminDeleteOrg}
              onSeedDemo={handleAdminSeedDemo}
              onOpenDatabase={handleAdminOpenDatabase}
              showToast={showToast}
            />
          </Suspense>
        )}

        {currentModule === 'reports' && (
          <div className="p-6 md:p-8 gtp-module-scroll gtp-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div>
                <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c] flex items-center">
                  <BarChart2 className="w-7 h-7 mr-3 text-teal-500" /> สถิติ & รายงาน
                </h2>
                <p className="text-sm text-[#5b7a8a] mt-1 font-medium">สรุปประวัติการสร้างงานและการทำสำเร็จ</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => { showToast('⏳ สร้างไฟล์ Excel...'); setTimeout(() => showToast('📥 ดาวน์โหลด Excel สำเร็จ'), 1500); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center shadow-md shadow-emerald-400/25">
                  <Download className="w-4 h-4 mr-2" /> Export Excel
                </button>
                <button onClick={() => { showToast('⏳ สร้างไฟล์ PDF...'); setTimeout(() => showToast('📥 ดาวน์โหลด PDF สำเร็จ'), 1500); }} className="bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center shadow-md shadow-rose-300/30">
                  <FileText className="w-4 h-4 mr-2" /> Export PDF
                </button>
              </div>
            </div>

            <div className="gtp-card p-5 mb-6 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-[#5b7a8a] mb-1.5 tracking-wide">ผู้ปฏิบัติงาน</label>
                <select value={reportUser} onChange={(e) => setReportUser(e.target.value)} className="border border-slate-100 rounded-2xl p-2.5 text-sm font-bold outline-none bg-white focus:border-teal-400">
                  <option value="all">-- ทุกคนในแผนก --</option>
                  {deptUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5b7a8a] mb-1.5 tracking-wide">ช่วงเวลา</label>
                <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)} className="border border-slate-100 rounded-2xl p-2.5 text-sm font-bold outline-none bg-white focus:border-teal-400">
                  <option value="today">วันนี้</option>
                  <option value="week">สัปดาห์นี้</option>
                  <option value="month">เดือนนี้</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <h3 className="font-extrabold text-slate-800 text-sm">ไทม์ไลน์งาน (เรียงตามวันที่สร้าง)</h3>
              </div>
              <div className="p-0">
                {Object.entries(reportData).map(([date, tasksForDate]) => (
                  <div key={date} className="border-b border-slate-100 last:border-0">
                    <div className="bg-teal-50/50 px-6 py-2.5 text-xs font-bold text-teal-700 flex items-center uppercase tracking-wider border-y border-teal-100/50">
                      <CalendarIcon className="w-4 h-4 mr-2" /> วันที่ {date}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {tasksForDate.map((task) => (
                        <div key={task.id} className="px-6 py-4 flex flex-col lg:flex-row justify-between lg:items-center hover:bg-slate-50 group">
                          <div className="mb-3 lg:mb-0">
                            <p className="font-bold text-slate-800 text-sm group-hover:text-teal-600">{task.title}</p>
                            <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center">
                              <User className="w-3 h-3 mr-1" /> {users.find((u) => u.id === task.assignedTo)?.name}
                              {task.projectId && (<><FolderKanban className="w-3 h-3 ml-3 mr-1" /> {projects.find((p) => p.id === task.projectId)?.name}</>)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border ${getStatusColor(task.status)} uppercase tracking-wide`}>{getStatusText(task.status)}</span>
                            {task.completedAt ? (
                              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-center min-w-[130px]">
                                <span className="block">เสร็จ {formatThaiDate(task.completedAt)}</span>
                                <span className="block text-[10px] text-emerald-700/80 font-semibold mt-0.5">
                                  {new Date(task.completedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium px-2.5 py-1 text-center min-w-[90px]">-</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(reportData).length === 0 && (
                  <div className="p-16 text-center text-slate-400 flex flex-col items-center bg-slate-50/50">
                    <Search className="w-12 h-12 mb-4 text-slate-300" />
                    <p className="font-bold text-slate-500">ไม่มีข้อมูลปฏิบัติงานในช่วงเวลาที่เลือก</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentModule === 'create' && (
          <div className="p-6 md:p-8 gtp-module-scroll flex justify-center">
            <div className="max-w-3xl w-full gtp-card p-8 md:p-10 my-auto">
              <button
                type="button"
                onClick={leaveCreateModule}
                className="mb-6 flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-teal-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 shrink-0" />
                {createReturnLabels[createReturnModule] || 'ย้อนกลับ'}
              </button>
              <div className="flex space-x-2 mb-8 bg-slate-100 p-1.5 rounded-2xl">
                <button type="button" onClick={() => setCreateType('task')} className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl ${createType === 'task' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>📝 มอบหมายงาน (Task)</button>
                <button type="button" onClick={() => setCreateType('project')} className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl ${createType === 'project' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>📁 สร้างโปรเจกต์ (Project)</button>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">
                {createType === 'project' ? 'สร้างโปรเจกต์ใหม่' : 'สร้าง / มอบหมายงาน'}
              </h2>
              <form onSubmit={handleCreateSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-2">{createType === 'project' ? 'ชื่อโปรเจกต์' : 'หัวข้องาน'} <span className="text-rose-500">*</span></label>
                  <input required type="text" name={createType === 'project' ? 'name' : 'title'} className="w-full border border-slate-100 rounded-2xl p-3.5 text-slate-800 font-medium outline-none focus:border-teal-400" placeholder="ระบุหัวข้อที่ชัดเจน" />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-2">รายละเอียดเพิ่มเติม</label>
                  <textarea name="description" rows="3" className="w-full border border-slate-100 rounded-2xl p-3.5 text-slate-800 font-medium outline-none focus:border-teal-400" placeholder="ระบุขอบเขตงานหรือความต้องการ" />
                </div>
                {createType === 'project' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {currentUser.role !== 'Admin' && (
                      <div className="md:col-span-2 text-[12px] font-bold text-teal-800 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
                        โปรเจกต์จะอยู่ในแผนก <span className="font-extrabold">{currentUser.department || 'ของคุณ'}</span> — คนในแผนกเดียวกันมองเห็นได้
                      </div>
                    )}
                    {currentUser.role === 'Admin' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-extrabold text-slate-700 mb-2">แผนกเจ้าของโปรเจกต์ <span className="text-rose-500">*</span></label>
                        <select name="department" required defaultValue={currentUser.department === 'SYSTEM' ? 'IT' : currentUser.department} className="w-full border border-slate-100 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-teal-400">
                          {projectDeptOptions.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">วันเริ่มบริหารโครงการ</label>
                      <ThaiDateField clearable inputName="startDate" placeholder="วันเริ่ม พ.ศ." />
                    </div>
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">วันสิ้นสุดโครงการ</label>
                      <ThaiDateField clearable inputName="endDate" placeholder="วันสิ้นสุด พ.ศ." />
                    </div>
                  </div>
                )}
                {createType === 'task' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-extrabold text-slate-700 mb-2">
                          มอบหมายให้ <span className="text-slate-400 font-bold">(ไม่บังคับ)</span>
                        </label>
                        <select name="assignedTo" defaultValue="" className="w-full border border-slate-100 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-teal-400">
                          <option value="">— ทำเอง (ไม่มอบหมาย) —</option>
                          <option value={currentUser.id}>{currentUser.name} (ตัวเอง)</option>
                          {assignableUsers.filter((u) => u.id !== currentUser.id).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}{u.role === 'Head' ? ' (หัวหน้า)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 font-medium mt-1.5">เลือกคนในแผนก {currentUser.department || ''} — เว้นว่าง = ทำเอง</p>
                      </div>
                      <div>
                        <label className="block text-sm font-extrabold text-slate-700 mb-2">
                          กำหนดส่ง (Deadline) <span className="text-slate-400 font-bold">(ไม่บังคับ)</span>
                        </label>
                        <ThaiDateField clearable inputName="dueDate" placeholder="วันกำหนดส่ง พ.ศ." />
                        <p className="text-[11px] text-slate-400 font-medium mt-1.5">เว้นว่างได้ — ระบบจะแสดงเป็น “ไม่ระบุ”</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">จัดอยู่ในโปรเจกต์</label>
                      <select name="projectId" className="w-full border border-slate-100 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-teal-400">
                        <option value="">-- ไม่ระบุ (งานทั่วไป) --</option>
                        {visibleProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 pt-2 bg-[#f3f9fc] p-4 rounded-2xl border border-slate-200">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" name="isRecurring" className="w-5 h-5 text-blue-600 rounded-md border-slate-300" />
                        <span className="text-sm font-bold text-slate-700 flex items-center"><Repeat className="w-4 h-4 mr-1.5 text-slate-400" /> งานประจำ (ทำซ้ำอัตโนมัติ)</span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" name="notifyLine" defaultChecked={!!currentUser.notifyLineDefault} className="w-5 h-5 text-green-600 rounded-md border-slate-300 accent-green-600" />
                        <span className="text-sm font-bold text-slate-700 flex items-center"><Smartphone className="w-4 h-4 mr-1.5 text-green-500" /> แจ้งกลุ่ม LINE แผนก (เมื่อมอบให้คนอื่น)</span>
                      </label>
                    </div>
                  </>
                )}
                <div className="pt-6">
                  <button type="submit" disabled={busy} className="gtp-btn-primary w-full py-4 text-lg flex justify-center items-center disabled:opacity-60">
                    {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                    {createType === 'project' ? 'บันทึกและสร้างโปรเจกต์' : 'บันทึกและสร้างงาน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 gtp-nav border-t border-white/10 gtp-safe-bottom">
        <div className="grid grid-cols-5 gap-0.5 px-1 pt-1.5 pb-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
            { id: 'board', icon: KanbanSquare, label: 'กระดาน', action: () => setActiveProjectId(null) },
            { id: 'create', icon: Plus, label: 'สร้าง', primary: true },
            { id: 'projects', icon: FolderKanban, label: 'โปรเจกต์' },
            { id: 'more', icon: MoreHorizontal, label: 'เพิ่มเติม', openMore: true },
          ].map((item) => {
            const active = item.id !== 'more' && currentModule === item.id;
            const showMoreBadge = item.openMore && stickyRemindersDue > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.openMore) {
                    setMobileMoreOpen(true);
                    return;
                  }
                  if (item.id === 'create') {
                    openCreateModule();
                    return;
                  }
                  setCurrentModule(item.id);
                  if (item.id === 'projects') setDetailProjectId(null);
                  if (item.action) item.action();
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl min-h-[3.25rem] ${
                  item.primary
                    ? 'text-white'
                    : active
                      ? 'text-teal-200'
                      : 'text-teal-100/55'
                }`}
              >
                <span className="relative">
                  {item.primary ? (
                    <span className="flex items-center justify-center w-11 h-11 -mt-5 mb-0.5 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-500/30">
                      <item.icon className="w-5 h-5 text-white" />
                    </span>
                  ) : (
                    <item.icon className="w-5 h-5" />
                  )}
                  {showMoreBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-rose-400 text-[9px] font-black text-white flex items-center justify-center gtp-soft-pulse">
                      {stickyRemindersDue > 9 ? '9+' : stickyRemindersDue}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-[1.75rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-[90vh] border border-white">
            <div className="p-5 md:p-7 border-b border-slate-200 bg-white relative z-10 shrink-0 shadow-sm">
              <div className="pr-12">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wider ${getStatusColor(selectedTask.status)}`}>{getStatusText(selectedTask.status)}</span>
                  {selectedTask.projectId && (
                    <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200 flex items-center">
                      <FolderKanban className="w-3 h-3 mr-1" /> {projects.find((p) => p.id === selectedTask.projectId)?.name}
                    </span>
                  )}
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border flex items-center ${
                    !selectedTask.dueDate
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : isOverdue(selectedTask.dueDate, selectedTask.status)
                        ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <CalendarIcon className="w-3 h-3 mr-1 -mt-0.5" />
                    ครบกำหนด: {formatDate(selectedTask.dueDate)}
                    {isOverdue(selectedTask.dueDate, selectedTask.status) ? ' (ล่าช้า)' : ''}
                  </span>
                  {selectedTask.isRecurring && (
                    <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center">
                      <Repeat className="w-3 h-3 mr-1" /> งานทำซ้ำ
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight tracking-tight">{selectedTask.title}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} className="absolute top-5 md:top-7 right-5 md:right-7 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-full p-2">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-4 md:px-8 shrink-0">
              <button onClick={() => setTaskModalTab('details')} className={`py-4 px-2 md:px-4 font-extrabold text-sm border-b-4 flex-1 md:flex-none ${taskModalTab === 'details' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-500'}`}>อัปเดตสถานะ & รายละเอียด</button>
              <button onClick={() => setTaskModalTab('comments')} className={`py-4 px-2 md:px-4 font-extrabold text-sm border-b-4 flex items-center justify-center flex-1 md:flex-none ${taskModalTab === 'comments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
                แชท & แนบไฟล์
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${taskModalTab === 'comments' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'}`}>
                  {selectedComments.length}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
              <div className="flex-1 overflow-y-auto p-5 md:p-8 lg:border-r border-slate-200 bg-white flex flex-col relative">
                {taskModalTab === 'details' ? (
                  <div className="space-y-6 pb-4">
                    {/* สถานะ + ปุ่มอัปเดต — อยู่บนสุดให้ง่ายต่อการหา */}
                    <div className="rounded-[1.35rem] border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 md:p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-extrabold text-[#1e3a4c] flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-teal-600" /> อัปเดตสถานะงาน
                        </h4>
                        <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${getStatusColor(selectedTask.status)}`}>
                          ตอนนี้: {getStatusText(selectedTask.status)}
                        </span>
                      </div>

                      {currentUser.role === 'Head' && currentUser.id !== selectedTask.assignedTo && canControlSelectedTask && (
                        <p className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 mb-3">
                          สิทธิ์หัวหน้า: ดึงงานมาทำ · เปลี่ยนสถานะ · ส่งต่อให้คนอื่น ได้ตลอด
                        </p>
                      )}

                      {canControlSelectedTask && (
                        <div className="space-y-3">
                          {selectedTask.status === 'Pending' && (
                            <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')} className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-lg disabled:opacity-60">
                              {currentUser.id === selectedTask.assignedTo ? '① กดรับงาน (เริ่มดำเนินการ)' : 'ตั้งเป็นกำลังทำ'}
                            </button>
                          )}
                          {selectedTask.status === 'In Progress' && (
                            <div className="space-y-3">
                              {isStaff && currentUser.id === selectedTask.assignedTo && (
                                <label className="flex items-center space-x-3 cursor-pointer p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                  <input type="checkbox" id="notifyHeadToggle" defaultChecked className="accent-emerald-600 w-5 h-5" />
                                  <span className="font-bold text-emerald-800 text-sm flex items-center"><Smartphone className="w-4 h-4 mr-1.5 text-emerald-600" /> แจ้งกลุ่ม LINE แผนก (รอตรวจ)</span>
                                </label>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'Review', document.getElementById('notifyHeadToggle')?.checked)} className="bg-sky-600 hover:bg-sky-700 text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-lg disabled:opacity-60">
                                  ส่งงาน (รอตรวจ)
                                </button>
                                <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'Completed')} className="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-lg disabled:opacity-60">
                                  เสร็จสิ้น (ปิดงาน)
                                </button>
                              </div>
                            </div>
                          )}
                          {selectedTask.status === 'Review' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'Completed')} className="bg-emerald-500 text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-lg flex justify-center items-center disabled:opacity-60">
                                <CheckCircle className="w-4 h-4 mr-2" /> ตรวจผ่าน (ปิดงาน)
                              </button>
                              <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress', true)} className="bg-white text-rose-600 border-2 border-rose-200 py-3.5 rounded-2xl font-extrabold text-sm shadow-sm flex justify-center items-center disabled:opacity-60">
                                <ArrowRightLeft className="w-4 h-4 mr-2" /> ตีกลับให้แก้
                              </button>
                            </div>
                          )}
                          {selectedTask.status === 'Completed' && (
                            <div className="space-y-3">
                              <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                                งานนี้เสร็จสิ้นแล้ว
                                {selectedTask.completedAt && (
                                  <span className="block text-xs font-semibold text-emerald-600/90 mt-1">
                                    วันเสร็จ {formatThaiDateLong(selectedTask.completedAt)}
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] font-bold text-slate-500 px-1">
                                กดผิดสถานะ? ยกเลิกปิดงานแล้วกลับไปทำต่อได้
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')}
                                  className="bg-white text-sky-700 border-2 border-sky-200 py-3 rounded-2xl font-extrabold text-sm disabled:opacity-60"
                                >
                                  ยกเลิกปิดงาน (กลับไปกำลังทำ)
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleUpdateStatus(selectedTask.id, 'Review')}
                                  className="bg-white text-amber-800 border-2 border-amber-200 py-3 rounded-2xl font-extrabold text-sm disabled:opacity-60"
                                >
                                  กลับไปรอตรวจ
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!canControlSelectedTask && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#5b7a8a]">
                          {isStaff && selectedTask.status !== 'Completed' ? (
                            <span>งานนี้อยู่กับ <strong>{users.find((u) => u.id === selectedTask.assignedTo)?.name}</strong> — ใช้ปุ่ม &quot;ดึงงานมาทำ&quot; ด้านล่างได้</span>
                          ) : (
                            <span>คุณไม่มีสิทธิ์จัดการงานนี้</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-4 h-4 mr-1.5" /> รายละเอียดงาน</h4>
                      {canEditTaskProject && taskEditDraft ? (
                        <div className="space-y-4">
                          <textarea
                            value={taskEditDraft.description}
                            disabled={busy}
                            onChange={(e) => setTaskEditDraft((d) => ({ ...d, description: e.target.value }))}
                            rows={5}
                            placeholder="รายละเอียดงาน..."
                            className="w-full text-slate-700 text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-200 font-medium outline-none focus:border-teal-400 resize-y min-h-[120px]"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-500 mb-1.5 block">วันครบกำหนด</label>
                              <ThaiDateField
                                clearable
                                value={taskEditDraft.dueDate}
                                disabled={busy}
                                onChange={(v) => setTaskEditDraft((d) => ({ ...d, dueDate: v }))}
                                placeholder="วันกำหนดส่ง พ.ศ."
                              />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-100 self-end">
                              <input
                                type="checkbox"
                                checked={taskEditDraft.isRecurring}
                                disabled={busy}
                                onChange={(e) => setTaskEditDraft((d) => ({ ...d, isRecurring: e.target.checked }))}
                                className="w-5 h-5 accent-teal-600"
                              />
                              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Repeat className="w-4 h-4 text-slate-500" /> งานทำซ้ำ
                              </span>
                            </label>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleSaveTaskDetails}
                            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            บันทึกรายละเอียด
                          </button>
                        </div>
                      ) : (
                        <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium">{selectedTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#f3f9fc] p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">ผู้สั่งงาน</span>
                        <span className="font-bold text-sm text-slate-800">{users.find((u) => u.id === selectedTask.createdBy)?.name}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${selectedTask.assignedTo === currentUser.id ? 'bg-teal-50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="block text-[10px] font-black text-blue-500 mb-1 uppercase tracking-wider">รับผิดชอบปัจจุบัน</span>
                        <span className="font-bold text-sm text-blue-800">{users.find((u) => u.id === selectedTask.assignedTo)?.name}</span>
                      </div>
                    </div>

                    {canEditTaskProject && (
                      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                        <label className="block text-xs font-extrabold text-teal-800 mb-2 flex items-center gap-1.5">
                          <FolderKanban className="w-4 h-4" /> จัดอยู่ในโปรเจกต์
                        </label>
                        <select
                          value={selectedTask.projectId || ''}
                          disabled={busy}
                          onChange={(e) => handleUpdateTaskProject(selectedTask.id, e.target.value)}
                          className="w-full border border-teal-200 rounded-xl p-3 text-sm font-bold outline-none bg-white focus:border-teal-400"
                        >
                          <option value="">— ไม่ระบุ (งานทั่วไป) —</option>
                          {visibleProjects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-teal-700/80 font-medium mt-2">เลือกโปรเจกต์ในแผนก — บันทึกทันทีเมื่อเปลี่ยน</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      {canControlSelectedTask && selectedTask.status !== 'Completed' && (
                        <div className="p-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                          <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                            {currentUser.role === 'Head' && currentUser.id !== selectedTask.assignedTo
                              ? 'หัวหน้าส่งต่องานให้คนอื่น'
                              : 'โอนงานให้เพื่อนร่วมทีม'}
                          </p>
                          <div className="flex space-x-3">
                            <select id="forwardSelect" className="flex-1 border border-slate-100 rounded-xl p-2.5 text-sm font-bold outline-none bg-slate-50">
                              <option value="">-- เลือกผู้รับงาน --</option>
                              {deptUsers.filter((u) => u.id !== selectedTask.assignedTo && u.role !== 'Admin').map((u) => (
                                <option key={u.id} value={u.id}>{u.name}{u.role === 'Head' ? ' (หัวหน้า)' : ''}</option>
                              ))}
                            </select>
                            <button disabled={busy} onClick={() => { const s = document.getElementById('forwardSelect').value; if (s) handleForward(selectedTask.id, s); }} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">ส่งต่อ</button>
                          </div>
                        </div>
                      )}

                      {(isStaff || currentUser.role === 'Head' || currentUser.role === 'Admin')
                        && currentUser.id !== selectedTask.assignedTo
                        && selectedTask.status !== 'Completed'
                        && (currentUser.role !== 'Head' || selectedAssignee?.department === currentUser.department || currentUser.role === 'Admin')
                        && (
                        <div className="bg-teal-50 border-2 border-teal-100 rounded-3xl p-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0">
                            <div className="bg-teal-100 p-3 rounded-2xl mr-4 shrink-0"><Grab className="w-6 h-6 text-teal-700" /></div>
                            <div className="flex-1 pr-4">
                              <h5 className="font-extrabold text-teal-900 text-base mb-1">
                                {currentUser.role === 'Head' ? 'ดึงงานลูกน้องมาทำเอง' : 'ดึงงานนี้มาทำแทน (Takeover)'}
                              </h5>
                              <p className="text-xs text-teal-700/80 font-medium leading-relaxed">
                                งานนี้อยู่กับ <strong>{users.find((u) => u.id === selectedTask.assignedTo)?.name}</strong>
                                {currentUser.role === 'Head' ? ' — หัวหน้าดึงมาทำเองได้ตลอด' : ' คุณสามารถดึงมาทำเองได้กรณีฉุกเฉิน'}
                              </p>
                            </div>
                            <button disabled={busy} onClick={() => handleTakeover(selectedTask.id)} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shrink-0 w-full sm:w-auto disabled:opacity-60">ดึงงานมาทำ</button>
                          </div>
                        </div>
                      )}

                      {canDeleteTask(selectedTask) && (
                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeleteTask(selectedTask.id)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-rose-200 text-rose-600 font-extrabold text-sm hover:bg-rose-50 disabled:opacity-60"
                          >
                            <Trash2 className="w-4 h-4" /> ลบงานถาวร
                          </button>
                          <p className="text-[10px] text-slate-400 font-medium text-center mt-2">ลบประวัติและความคิดเห็นของงานนี้ด้วย</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto space-y-5 mb-4 pr-2 pt-2 custom-scrollbar">
                      {activityLoading && selectedComments.length === 0 ? (
                        <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลด...</div>
                      ) : selectedComments.map((comment) => {
                        const isMe = comment.authorId === currentUser.id;
                        const author = users.find((u) => u.id === comment.authorId);
                        return (
                          <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center space-x-2 mb-1.5">
                              {!isMe && <span className="text-[10px] font-black text-slate-500">{author?.name}</span>}
                              <span className="text-[9px] font-bold text-slate-400">{new Date(comment.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`px-5 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm font-medium leading-relaxed ${isMe ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'}`}>
                              {comment.text}
                            </div>
                          </div>
                        );
                      })}
                      {!activityLoading && selectedComments.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <MessageSquare className="w-12 h-12 mb-4 text-slate-200" />
                          <p className="text-sm font-bold text-slate-500">เริ่มต้นการสนทนา</p>
                          <p className="text-xs mt-1 text-slate-400">สอบถามความคืบหน้าหรือแนบลิงก์งานที่นี่</p>
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleAddComment} className="mt-auto flex items-end space-x-3 border-t border-slate-100 pt-5">
                      <button type="button" className="p-3.5 text-slate-400 hover:text-teal-600 bg-slate-100 rounded-xl border border-slate-200"><Paperclip className="w-5 h-5" /></button>
                      <input type="text" name="comment" required placeholder="พิมพ์ข้อความ..." className="flex-1 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-medium outline-none focus:border-teal-400 bg-slate-50 focus:bg-white" autoComplete="off" />
                      <button type="submit" disabled={busy} className="p-3.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 shadow-md disabled:opacity-60"><Send className="w-5 h-5" /></button>
                    </form>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-80 p-6 md:p-8 bg-slate-50 overflow-y-auto border-t lg:border-t-0 shrink-0">
                <div className="flex items-center space-x-2 mb-8">
                  <History className="w-5 h-5 text-teal-500" />
                  <h4 className="font-extrabold text-slate-800 text-sm">ประวัติ (Timeline)</h4>
                </div>
                <div className="border-l-2 border-slate-200 ml-2.5 space-y-6">
                  {activityLoading && selectedLogs.length === 0 ? (
                    <div className="pl-6 text-xs text-slate-400 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> โหลดประวัติ...</div>
                  ) : selectedLogs.map((log, idx) => {
                      const isTakeover = log.actionType === 'Takeover';
                      return (
                        <div key={log.id} className="relative pl-6">
                          <div className={`absolute w-3 h-3 border-2 rounded-full -left-[7px] top-1 ${isTakeover ? 'bg-teal-500 border-white ring-2 ring-teal-200' : (idx === 0 ? 'bg-teal-500 border-white ring-2 ring-teal-200' : 'bg-white border-slate-300')}`} />
                          <p className="text-xs font-black text-slate-800">{users.find((u) => u.id === log.actionBy)?.name}</p>
                          <p className={`text-xs mt-1.5 mb-1.5 p-3 rounded-xl border shadow-sm leading-relaxed font-medium ${isTakeover ? 'bg-teal-50 border-teal-100 text-teal-800' : 'bg-white border-slate-200 text-slate-600'}`}>{log.detail}</p>
                          <p className="text-[10px] font-bold text-slate-400">{formatDate(log.timestamp)} {new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
