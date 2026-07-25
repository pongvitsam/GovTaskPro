import React, { useEffect, useMemo, useState } from 'react';
import {
  User, CheckCircle, Clock, Plus, LayoutDashboard, LogOut, Send,
  ArrowRightLeft, History, FolderKanban, Briefcase, KanbanSquare, Bell, Calendar as CalendarIcon,
  BarChart2, MessageSquare, Paperclip, Repeat, Download, FileText, Smartphone, Search,
  Users, CalendarDays, Grab, ShieldCheck, Loader2, Settings2, StickyNote
} from 'lucide-react';
import { api, isProductionGas, isProductionHost } from './api';
import ProjectDetail from './ProjectDetail';
import StickyNotes from './StickyNotes';
import { formatThaiDate, formatThaiMonthYear } from './formatThaiDate';
import ProjectTimeBar from './ProjectTimeBar';

const DAY = 86400000;

function upsertById(list, row) {
  if (!row) return list;
  const id = String(row.id);
  const idx = list.findIndex((x) => String(x.id) === id);
  if (idx < 0) return [row, ...list];
  const next = list.slice();
  next[idx] = row;
  return next;
}

export default function App() {
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  const [currentModule, setCurrentModule] = useState('dashboard');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [detailProjectId, setDetailProjectId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalTab, setTaskModalTab] = useState('details');
  const [createType, setCreateType] = useState('task');
  const [toastMsg, setToastMsg] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reportUser, setReportUser] = useState('all');
  const [reportPeriod, setReportPeriod] = useState('month');
  /** Completed column grows forever — preview recent only unless expanded */
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const COMPLETED_PREVIEW = 8;

  const showToast = (msg, duration = 3000) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), duration);
  };

  const getStatusColor = (status) => ({
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    Review: 'bg-purple-100 text-purple-800 border-purple-200',
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[status] || 'bg-slate-100 text-slate-800');

  const getStatusText = (status) => ({
    Pending: 'รอรับงาน',
    'In Progress': 'กำลังทำ',
    Review: 'รอตรวจ',
    Completed: 'เสร็จสิ้น',
  }[status] || status);

  const formatDate = (iso) => formatThaiDate(iso);
  const isOverdue = (dueDate, status) => dueDate && status !== 'Completed' && new Date(dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  const applyBootstrap = (data) => {
    setUsers(data.users || []);
    setProjects(data.projects || []);
    setTasks(data.tasks || []);
    setTaskLogs(data.taskLogs || []);
    setComments(data.comments || []);
    setCommentCounts(data.commentCounts || {});
    setMilestones(data.milestones || []);
  };

  const patchTask = (task, log) => {
    if (!task) return;
    setTasks((prev) => upsertById(prev, task));
    if (log) setTaskLogs((prev) => upsertById(prev, log));
    setSelectedTask((prev) => (prev && String(prev.id) === String(task.id) ? task : prev));
  };

  const loadBootstrap = async () => {
    setBootLoading(true);
    setBootError(null);
    try {
      const data = await api('getBootstrap');
      if (!data || !Array.isArray(data.users)) {
        throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }
      applyBootstrap(data);
    } catch (err) {
      setBootError(err?.message || String(err));
    } finally {
      setBootLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setBootError(null);
      try {
        const data = await api('getBootstrap');
        if (cancelled) return;
        if (!data || !Array.isArray(data.users)) {
          throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
        }
        applyBootstrap(data);
      } catch (err) {
        if (!cancelled) setBootError(err?.message || String(err));
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedTask) return undefined;
    const taskId = selectedTask.id;
    let cancelled = false;
    setActivityLoading(true);
    (async () => {
      try {
        const data = await api('getTaskActivity', { taskId });
        if (cancelled) return;
        setComments((prev) => {
          const others = prev.filter((c) => String(c.taskId) !== String(taskId));
          return [...others, ...(data.comments || [])];
        });
        setTaskLogs((prev) => {
          const others = prev.filter((l) => String(l.taskId) !== String(taskId));
          return [...others, ...(data.taskLogs || [])];
        });
      } catch (err) {
        if (!cancelled) showToast('❌ โหลดประวัติงานไม่สำเร็จ');
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTask?.id]);

  const usersById = useMemo(() => {
    const m = new Map();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const assignee = usersById.get(task.assignedTo);
    const isMyDepartment = assignee?.department === currentUser?.department;
    const matchesProject = activeProjectId ? task.projectId === activeProjectId : true;
    return isMyDepartment && matchesProject;
  }), [tasks, usersById, currentUser?.department, activeProjectId]);

  const myNotifications = useMemo(() => visibleTasks.filter(
    (t) => (t.assignedTo === currentUser?.id && t.status === 'Pending') || (currentUser?.role === 'Head' && t.status === 'Review')
  ).length, [visibleTasks, currentUser?.id, currentUser?.role]);

  const statusCounts = useMemo(() => ({
    all: visibleTasks.length,
    Pending: visibleTasks.filter((t) => t.status === 'Pending').length,
    'In Progress': visibleTasks.filter((t) => t.status === 'In Progress').length,
    Completed: visibleTasks.filter((t) => t.status === 'Completed').length,
  }), [visibleTasks]);

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
    try {
      if (createType === 'project') {
        const row = await api('createProject', {
          name: formData.get('name'),
          description: formData.get('description'),
          createdBy: currentUser.id,
          startDate: formData.get('startDate') || null,
          endDate: formData.get('endDate') || null,
        });
        setProjects((prev) => upsertById(prev, row));
        setCurrentModule('projects');
        showToast('✅ สร้างโปรเจกต์สำเร็จ');
      } else {
        const rawAssignee = currentUser.role === 'Head' ? String(formData.get('assignedTo') || '') : currentUser.id;
        const selfAssign = !rawAssignee || rawAssignee === currentUser.id;
        const assignedTo = selfAssign ? currentUser.id : rawAssignee;
        const notifyLine = !selfAssign && formData.get('notifyLine') === 'on';
        const result = await api('createTask', {
          projectId: formData.get('projectId') || null,
          title: formData.get('title'),
          description: formData.get('description'),
          createdBy: currentUser.id,
          assignedTo,
          status: selfAssign ? 'In Progress' : 'Pending',
          type: selfAssign ? 'Self' : 'Assigned',
          dueDate: formData.get('dueDate') || null,
          isRecurring: formData.get('isRecurring') === 'on',
          notifyLine,
          logDetail: selfAssign
            ? (currentUser.role === 'Head' ? 'หัวหน้าสร้างงานและรับทำเอง' : 'สร้างงานด้วยตัวเอง')
            : `มอบหมายงานให้ ${usersById.get(assignedTo)?.name}`,
        });
        patchTask(result?.task || result, result?.log);
        if (notifyLine) showToast('🔔 ระบบสร้างงานและส่งแจ้งเตือนผ่าน LINE เรียบร้อยแล้ว');
        else showToast('✅ สร้างงานสำเร็จ');
        setActiveProjectId(null);
        setCurrentModule('board');
      }
      e.target.reset();
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus, notifyLine = false) => {
    if (busy || !currentUser) return;
    setBusy(true);
    try {
      const result = await api('updateTaskStatus', {
        taskId,
        status: newStatus,
        userId: currentUser.id,
        notifyLine,
        logDetail: `เปลี่ยนสถานะเป็น "${getStatusText(newStatus)}"`,
      });
      patchTask(result?.task || result, result?.log);
      if (notifyLine) showToast(`📱 อัปเดตเป็น ${getStatusText(newStatus)} และแจ้งเตือน LINE แล้ว`);
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
      setSelectedTask(null);
      showToast(`โอนงานให้ ${name} เรียบร้อยแล้ว`);
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
      setComments((prev) => [...prev, row]);
      setCommentCounts((prev) => {
        const k = String(selectedTask.id);
        return { ...prev, [k]: (prev[k] || 0) + 1 };
      });
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

  const detailProject = projects.find((p) => p.id === detailProjectId);

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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center text-slate-600">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="font-bold">กำลังโหลด GovTaskPro...</p>
          <p className="text-xs mt-1 text-slate-400">{isProductionHost() ? 'เชื่อมต่อ Google Sheets' : 'โหมดพัฒนา (local)'}</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-rose-100">
          <p className="font-extrabold text-rose-600 mb-2">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="text-sm text-slate-600 mb-6">{bootError}</p>
          <button onClick={loadBootstrap} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold">ลองใหม่</button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-center text-slate-800 mb-2 tracking-tight">
            GovTask<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-center text-slate-500 mb-2 font-medium">Ultimate Task & Project Management</p>
          <p className="text-center text-[11px] text-emerald-600 font-bold mb-8">
            {isProductionHost()
              ? (isProductionGas() ? '● Production · Apps Script UI' : '● Production · GitHub Pages + Sheets')
              : '○ Dev mode · local store'}
          </p>
          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setCurrentUser(user)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${
                  user.role === 'Head'
                    ? 'border-blue-200 hover:border-blue-500 hover:bg-blue-50'
                    : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full transition-colors ${
                    user.role === 'Head'
                      ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-600 group-hover:text-white'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{user.role} | {user.department}</p>
                  </div>
                </div>
                <ArrowRightLeft className="text-slate-300 group-hover:text-slate-500 w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {toastMsg && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center border border-slate-700">
          <span className="font-semibold text-sm">{toastMsg}</span>
        </div>
      )}

      <nav className="bg-[#0f172a] text-slate-300 w-full md:w-64 flex-shrink-0 flex flex-col shadow-2xl z-20">
        <div className="p-5 border-b border-slate-800/60 flex justify-between items-center bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight text-white tracking-wide">GovTask</h2>
              <p className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">{currentUser.division}</p>
            </div>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white" onClick={() => showToast('🔔 ไม่มีแจ้งเตือนใหม่')} />
            {myNotifications > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 animate-pulse" />}
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 flex items-center space-x-3 border-b border-slate-800/60">
          <div className={`p-2 rounded-xl ${currentUser.role === 'Head' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400">{currentUser.role === 'Head' ? 'หัวหน้าแผนก' : 'พนักงานปฏิบัติการ'}</p>
          </div>
        </div>

        <div className="flex-1 py-4 px-3 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible no-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม (Dashboard)' },
            { id: 'projects', icon: FolderKanban, label: 'โปรเจกต์ (Projects)' },
            { id: 'board', icon: KanbanSquare, label: 'กระดานงาน (Board)', action: () => setActiveProjectId(null) },
            { id: 'calendar', icon: CalendarDays, label: 'ปฏิทินงาน (Calendar)' },
            { id: 'sticky', icon: StickyNote, label: 'เตือนความจำ (ส่วนตัว)' },
            { id: 'reports', icon: BarChart2, label: 'สถิติ & รายงาน (Reports)' },
            { id: 'create', icon: Plus, label: 'สร้างงาน (Create)' },
          ].map((menu) => (
            <button
              key={menu.id}
              onClick={() => { setCurrentModule(menu.id); if (menu.id === 'projects') setDetailProjectId(null); if (menu.action) menu.action(); }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl w-full whitespace-nowrap transition-all ${
                currentModule === menu.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 font-medium'
              }`}
            >
              <menu.icon className={`w-5 h-5 ${currentModule === menu.id ? 'opacity-100' : 'opacity-70'}`} />
              <span className="text-sm">{menu.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800/60">
          <button onClick={() => setCurrentUser(null)} className="flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 font-medium">
            <LogOut className="w-5 h-5 opacity-70" />
            <span className="text-sm">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {currentModule === 'dashboard' && (
          <div className="p-6 md:p-8 overflow-y-auto h-full">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">ภาพรวมการทำงานของแผนก</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'งานทั้งหมด', val: statusCounts.all, c: 'text-slate-800', b: 'border-slate-200' },
                { label: 'รอรับงาน (Pending)', val: statusCounts.Pending, c: 'text-amber-600', b: 'border-amber-200 border-b-4 border-b-amber-500' },
                { label: 'กำลังทำ (Active)', val: statusCounts['In Progress'], c: 'text-blue-600', b: 'border-blue-200 border-b-4 border-b-blue-600' },
                { label: 'เสร็จสิ้น (Done)', val: statusCounts.Completed, c: 'text-emerald-600', b: 'border-emerald-200 border-b-4 border-b-emerald-500' },
              ].map((stat, i) => (
                <div key={i} className={`bg-white p-5 rounded-2xl shadow-sm border ${stat.b}`}>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{stat.label}</p>
                  <p className={`text-4xl font-black ${stat.c}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-5 flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2 text-rose-500" /> งานที่ใกล้ถึงกำหนด / ล่าช้า
                </h3>
                <div className="space-y-3 flex-1">
                  {visibleTasks
                    .filter((t) => t.dueDate && t.status !== 'Completed')
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5)
                    .map((task) => {
                      const overdue = isOverdue(task.dueDate, task.status);
                      return (
                        <div key={task.id} className={`flex justify-between items-center p-3 rounded-xl border ${overdue ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="overflow-hidden">
                            <p className="font-bold text-slate-800 text-sm truncate">{task.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">รับผิดชอบ: {users.find((u) => u.id === task.assignedTo)?.name}</p>
                          </div>
                          <div className="shrink-0 pl-3">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${overdue ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}`}>
                              {overdue ? 'ล่าช้า (Overdue)' : formatDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {currentUser.role === 'Head' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-5 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-indigo-500" /> ภาระงานรายบุคคล (กำลังทำ / รอรับ)
                  </h3>
                  <div className="space-y-5">
                    {users.filter((u) => u.role === 'Staff').map((staff) => {
                      const activeTasks = tasks.filter((t) => t.assignedTo === staff.id && (t.status === 'In Progress' || t.status === 'Pending')).length;
                      const maxLoad = 5;
                      const percentage = Math.min((activeTasks / maxLoad) * 100, 100);
                      return (
                        <div key={staff.id}>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-sm font-bold text-slate-700">{staff.name}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTasks >= maxLoad ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>{activeTasks} งาน</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div className={`h-full rounded-full ${activeTasks >= maxLoad ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg border border-indigo-400 p-8 text-white flex flex-col justify-center items-center text-center">
                  <ShieldCheck className="w-16 h-16 mb-4 opacity-80" />
                  <h3 className="text-xl font-bold mb-2">ยินดีต้อนรับ, {currentUser.name}</h3>
                  <p className="text-indigo-100 text-sm">ระบบตรวจสอบสิทธิ์แล้ว คุณกำลังใช้งานในระดับ Staff<br />คุณสามารถดูงานทั้งหมดในแผนก และดึงงานมาทำแทนได้หากจำเป็น</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentModule === 'projects' && !detailProject && (
          <div className="p-6 md:p-8 overflow-y-auto h-full">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">โปรเจกต์ทั้งหมด (Projects)</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">ตั้งค่าช่วงเวลา · แผนขั้นตอน · S-Curve</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((proj) => {
                const projTasks = tasks.filter((t) => t.projectId === proj.id);
                const projMs = milestones.filter((m) => m.projectId === proj.id);
                const completedMs = projMs.filter((m) => m.completed).length;
                const totalW = projMs.reduce((s, m) => s + (Number(m.weight) || 1), 0) || 1;
                const doneW = projMs.filter((m) => m.completed).reduce((s, m) => s + (Number(m.weight) || 1), 0);
                const progress = projMs.length
                  ? Math.round((doneW / totalW) * 100)
                  : (projTasks.length === 0 ? 0 : Math.round((projTasks.filter((t) => t.status === 'Completed').length / projTasks.length) * 100));
                return (
                  <div
                    key={proj.id}
                    onClick={() => setDetailProjectId(proj.id)}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-50 p-2.5 rounded-xl group-hover:bg-indigo-600 transition-colors">
                        <FolderKanban className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                        {projMs.length ? `${completedMs}/${projMs.length} ขั้นตอน` : `${projTasks.length} งาน`}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-800 mb-2 group-hover:text-indigo-700">{proj.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3 flex-1 font-medium">{proj.description}</p>
                    <p className="text-[11px] font-bold text-slate-400 mb-2">
                      {formatThaiDate(proj.startDate)} → {formatThaiDate(proj.endDate)}
                    </p>
                    <ProjectTimeBar startDate={proj.startDate} endDate={proj.endDate} compact />
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                        <span>ความคืบหน้าแผน (S-Curve)</span>
                        <span className={progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentModule === 'projects' && detailProject && (
          <ProjectDetail
            project={detailProject}
            milestones={milestones}
            tasks={tasks}
            currentUser={currentUser}
            busy={busy}
            onBack={() => setDetailProjectId(null)}
            onOpenBoard={() => { setActiveProjectId(detailProject.id); setCurrentModule('board'); }}
            onSaveProject={handleSaveProject}
            onCreateMilestone={handleCreateMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            showToast={showToast}
          />
        )}

        {currentModule === 'board' && (
          <div className="flex flex-col h-full p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center tracking-tight">
                กระดานงาน
                {activeProjectId && (
                  <span className="ml-3 text-sm font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-full">
                    {projects.find((p) => p.id === activeProjectId)?.name}
                  </span>
                )}
              </h2>
              <div className="flex space-x-3">
                {activeProjectId && (
                  <button onClick={() => setActiveProjectId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm">
                    ดูทั้งหมด
                  </button>
                )}
                <button onClick={() => setCurrentModule('create')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center shadow-md">
                  <Plus className="w-4 h-4 mr-1.5" /> สร้างงาน
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-5 h-full min-w-max items-start">
                {['Pending', 'In Progress', 'Review', 'Completed'].map((status, index) => {
                  let colTasks = visibleTasks.filter((t) => t.status === status);
                  if (status === 'Completed') {
                    colTasks = [...colTasks].sort((a, b) => {
                      const ta = new Date(a.completedAt || a.dueDate || a.createdAt || 0).getTime();
                      const tb = new Date(b.completedAt || b.dueDate || b.createdAt || 0).getTime();
                      return tb - ta;
                    });
                  }
                  const totalInCol = colTasks.length;
                  const hiddenCompleted = status === 'Completed' && !showAllCompleted && totalInCol > COMPLETED_PREVIEW
                    ? totalInCol - COMPLETED_PREVIEW
                    : 0;
                  const shownTasks = hiddenCompleted > 0 ? colTasks.slice(0, COMPLETED_PREVIEW) : colTasks;
                  const borders = ['border-amber-200', 'border-blue-200', 'border-purple-200', 'border-emerald-200'];
                  const bgs = ['bg-amber-50/50', 'bg-blue-50/50', 'bg-purple-50/50', 'bg-emerald-50/50'];
                  return (
                    <div key={status} className={`w-80 flex flex-col rounded-2xl border ${borders[index]} ${bgs[index]} max-h-full shrink-0 shadow-sm`}>
                      <div className="p-4 flex justify-between items-center border-b border-black/5">
                        <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">{getStatusText(status)}</h3>
                        <span className="bg-white/80 text-xs font-bold px-2.5 py-1 rounded-full text-slate-700 shadow-sm">{totalInCol}</span>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {shownTasks.map((task) => {
                          const assignee = users.find((u) => u.id === task.assignedTo);
                          const overdue = isOverdue(task.dueDate, task.status);
                          const isMyTask = task.assignedTo === currentUser.id;
                          const commentCount = commentCounts[String(task.id)] || 0;
                          return (
                            <div
                              key={task.id}
                              onClick={() => { setSelectedTask(task); setTaskModalTab('details'); }}
                              className={`bg-white p-4 rounded-xl shadow-sm border ${
                                overdue ? 'border-rose-400' : (isMyTask && status === 'Pending' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200')
                              } ${status === 'Completed' ? 'opacity-80' : ''} cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all relative group`}
                            >
                              {task.isRecurring && <Repeat className="w-4 h-4 absolute top-3.5 right-3.5 text-slate-300" />}
                              {isMyTask && status === 'Pending' && <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">งานใหม่!</div>}
                              {!isMyTask && overdue && <div className="absolute -top-2 -right-2 bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">เลยกำหนด</div>}
                              {task.projectId && !activeProjectId && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mb-2 inline-block border border-indigo-100 truncate max-w-[80%]">
                                  {projects.find((p) => p.id === task.projectId)?.name}
                                </span>
                              )}
                              <h4 className={`font-bold text-slate-800 text-sm mb-4 leading-relaxed pr-6 ${status === 'Completed' ? 'line-through decoration-slate-300' : ''}`}>{task.title}</h4>
                              <div className="flex justify-between items-end pt-3 border-t border-slate-100/80">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold ${isMyTask ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                    {assignee?.name?.charAt(0)}
                                  </div>
                                  <span className={`text-[11px] font-bold ${isMyTask ? 'text-blue-700' : 'text-slate-500'}`}>{assignee?.name?.split(' ')[0]}</span>
                                </div>
                                <div className="flex items-center space-x-2.5 text-[11px] font-bold">
                                  {commentCount > 0 && <span className="flex items-center text-slate-400"><MessageSquare className="w-3.5 h-3.5 mr-1" />{commentCount}</span>}
                                  <span className={`flex items-center px-1.5 py-0.5 rounded ${
                                    !task.dueDate
                                      ? 'text-slate-400 bg-slate-50 border border-slate-100'
                                      : overdue
                                        ? 'text-rose-700 bg-rose-100 border border-rose-200'
                                        : 'text-slate-500 bg-slate-50 border border-slate-100'
                                  }`}>
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    {status === 'Completed' && task.completedAt
                                      ? formatThaiDate(task.completedAt)
                                      : formatThaiDate(task.dueDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {status === 'Completed' && hiddenCompleted > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAllCompleted(true)}
                            className="w-full py-2.5 text-xs font-bold text-emerald-700 bg-white/90 border border-emerald-200 rounded-xl hover:bg-emerald-50 shadow-sm"
                          >
                            แสดงงานเสร็จเก่าอีก {hiddenCompleted} รายการ
                          </button>
                        )}
                        {status === 'Completed' && showAllCompleted && totalInCol > COMPLETED_PREVIEW && (
                          <button
                            type="button"
                            onClick={() => setShowAllCompleted(false)}
                            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-white/90 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
                          >
                            ย่อเหลือ {COMPLETED_PREVIEW} รายการล่าสุด
                          </button>
                        )}
                        {status === 'Completed' && totalInCol === 0 && (
                          <p className="text-center text-xs text-slate-400 font-medium py-8">ยังไม่มีงานเสร็จสิ้น</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentModule === 'calendar' && (
          <div className="p-6 md:p-8 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 space-y-4 md:space-y-0">
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center tracking-tight">
                <CalendarDays className="w-7 h-7 mr-3 text-blue-600" /> ปฏิทินงาน (Deadlines)
              </h2>
              <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <ArrowRightLeft className="w-4 h-4 rotate-180" />
                </button>
                <span className="font-bold text-slate-800 min-w-[140px] text-center">{formatThaiMonthYear(currentMonth)}</span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
                {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'].map((d, i) => (
                  <div key={d} className={`p-3 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-200 last:border-0 ${i === 0 || i === 6 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>
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
                    <div key={day} className={`border-r border-b border-slate-200/50 min-h-[120px] p-2 flex flex-col ${isToday ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-500' : 'bg-white hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-bold ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>{day}</span>
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
          <StickyNotes currentUser={currentUser} showToast={showToast} />
        )}

        {currentModule === 'reports' && (
          <div className="p-6 md:p-8 overflow-y-auto h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center tracking-tight">
                  <BarChart2 className="w-7 h-7 mr-3 text-indigo-600" /> สถิติ & รายงาน
                </h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">สรุปประวัติการสร้างงานและการทำสำเร็จ</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => { showToast('⏳ สร้างไฟล์ Excel...'); setTimeout(() => showToast('📥 ดาวน์โหลด Excel สำเร็จ'), 1500); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-md">
                  <Download className="w-4 h-4 mr-2" /> Export Excel
                </button>
                <button onClick={() => { showToast('⏳ สร้างไฟล์ PDF...'); setTimeout(() => showToast('📥 ดาวน์โหลด PDF สำเร็จ'), 1500); }} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-md">
                  <FileText className="w-4 h-4 mr-2" /> Export PDF
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ผู้ปฏิบัติงาน</label>
                <select value={reportUser} onChange={(e) => setReportUser(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none bg-slate-50 focus:border-indigo-500">
                  <option value="all">-- ทุกคนในแผนก --</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">ช่วงเวลา</label>
                <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)} className="border-2 border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none bg-slate-50 focus:border-indigo-500">
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
                    <div className="bg-indigo-50/50 px-6 py-2.5 text-xs font-bold text-indigo-700 flex items-center uppercase tracking-wider border-y border-indigo-100/50">
                      <CalendarIcon className="w-4 h-4 mr-2" /> วันที่ {date}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {tasksForDate.map((task) => (
                        <div key={task.id} className="px-6 py-4 flex flex-col lg:flex-row justify-between lg:items-center hover:bg-slate-50 group">
                          <div className="mb-3 lg:mb-0">
                            <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600">{task.title}</p>
                            <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center">
                              <User className="w-3 h-3 mr-1" /> {users.find((u) => u.id === task.assignedTo)?.name}
                              {task.projectId && (<><FolderKanban className="w-3 h-3 ml-3 mr-1" /> {projects.find((p) => p.id === task.projectId)?.name}</>)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border ${getStatusColor(task.status)} uppercase tracking-wide`}>{getStatusText(task.status)}</span>
                            {task.completedAt ? (
                              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-center min-w-[90px]">
                                เสร็จ: {new Date(task.completedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
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
          <div className="p-6 md:p-8 overflow-y-auto h-full flex justify-center">
            <div className="max-w-3xl w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 my-auto">
              {currentUser.role === 'Head' && (
                <div className="flex space-x-2 mb-8 bg-slate-100 p-1.5 rounded-2xl">
                  <button onClick={() => setCreateType('task')} className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl ${createType === 'task' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>📝 มอบหมายงาน (Task)</button>
                  <button onClick={() => setCreateType('project')} className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl ${createType === 'project' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>📁 สร้างโปรเจกต์ (Project)</button>
                </div>
              )}
              <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">
                {createType === 'project' ? 'สร้างโปรเจกต์ใหม่' : (currentUser.role === 'Head' ? 'สร้าง / มอบหมายงาน' : 'บันทึกงานของตัวเอง')}
              </h2>
              <form onSubmit={handleCreateSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-2">{createType === 'project' ? 'ชื่อโปรเจกต์' : 'หัวข้องาน'} <span className="text-rose-500">*</span></label>
                  <input required type="text" name={createType === 'project' ? 'name' : 'title'} className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-medium outline-none focus:border-blue-500" placeholder="ระบุหัวข้อที่ชัดเจน" />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-2">รายละเอียดเพิ่มเติม</label>
                  <textarea name="description" rows="3" className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-medium outline-none focus:border-blue-500" placeholder="ระบุขอบเขตงานหรือความต้องการ" />
                </div>
                {createType === 'project' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">วันเริ่มบริหารโครงการ</label>
                      <input type="date" name="startDate" className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">วันสิ้นสุดโครงการ</label>
                      <input type="date" name="endDate" className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-blue-500" />
                    </div>
                  </div>
                )}
                {createType === 'task' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {currentUser.role === 'Head' && (
                        <div>
                          <label className="block text-sm font-extrabold text-slate-700 mb-2">
                            มอบหมายให้ <span className="text-slate-400 font-bold">(ไม่บังคับ)</span>
                          </label>
                          <select name="assignedTo" defaultValue="" className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-blue-500">
                            <option value="">— ทำเอง (ไม่มอบหมาย) —</option>
                            <option value={currentUser.id}>{currentUser.name} (ตัวเอง)</option>
                            {users.filter((u) => u.role === 'Staff').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <p className="text-[11px] text-slate-400 font-medium mt-1.5">เว้นว่างหรือเลือกตัวเอง = หัวหน้ารับทำเองทันที</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-extrabold text-slate-700 mb-2">
                          กำหนดส่ง (Deadline) <span className="text-slate-400 font-bold">(ไม่บังคับ)</span>
                        </label>
                        <input type="date" name="dueDate" className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-blue-500" />
                        <p className="text-[11px] text-slate-400 font-medium mt-1.5">เว้นว่างได้ — ระบบจะแสดงเป็น “ไม่ระบุ”</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">จัดอยู่ในโปรเจกต์</label>
                      <select name="projectId" className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-slate-800 font-bold outline-none bg-white focus:border-blue-500">
                        <option value="">-- ไม่ระบุ (งานทั่วไป) --</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" name="isRecurring" className="w-5 h-5 text-blue-600 rounded-md border-slate-300" />
                        <span className="text-sm font-bold text-slate-700 flex items-center"><Repeat className="w-4 h-4 mr-1.5 text-slate-400" /> งานประจำ (ทำซ้ำอัตโนมัติ)</span>
                      </label>
                      {currentUser.role === 'Head' && (
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input type="checkbox" name="notifyLine" defaultChecked className="w-5 h-5 text-green-600 rounded-md border-slate-300 accent-green-600" />
                          <span className="text-sm font-bold text-slate-700 flex items-center"><Smartphone className="w-4 h-4 mr-1.5 text-green-500" /> แจ้งเตือนเข้า LINE ทันที</span>
                        </label>
                      )}
                    </div>
                  </>
                )}
                <div className="pt-6">
                  <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white rounded-2xl py-4 font-extrabold text-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex justify-center items-center disabled:opacity-60">
                    {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                    บันทึกและสร้างงาน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-[90vh] border border-slate-200">
            <div className="p-5 md:p-7 border-b border-slate-200 bg-white relative z-10 shrink-0 shadow-sm">
              <div className="pr-12">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wider ${getStatusColor(selectedTask.status)}`}>{getStatusText(selectedTask.status)}</span>
                  {selectedTask.projectId && (
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 flex items-center">
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
              <button onClick={() => setTaskModalTab('details')} className={`py-4 px-2 md:px-4 font-extrabold text-sm border-b-4 flex-1 md:flex-none ${taskModalTab === 'details' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>รายละเอียด & จัดการ</button>
              <button onClick={() => setTaskModalTab('comments')} className={`py-4 px-2 md:px-4 font-extrabold text-sm border-b-4 flex items-center justify-center flex-1 md:flex-none ${taskModalTab === 'comments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
                แชท & แนบไฟล์
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${taskModalTab === 'comments' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
                  {selectedComments.length}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
              <div className="flex-1 overflow-y-auto p-5 md:p-8 lg:border-r border-slate-200 bg-white flex flex-col relative">
                {taskModalTab === 'details' ? (
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-4 h-4 mr-1.5" /> รายละเอียดงาน</h4>
                      <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium">{selectedTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">ผู้สั่งงาน</span>
                        <span className="font-bold text-sm text-slate-800">{users.find((u) => u.id === selectedTask.createdBy)?.name}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${selectedTask.assignedTo === currentUser.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="block text-[10px] font-black text-blue-500 mb-1 uppercase tracking-wider">รับผิดชอบปัจจุบัน</span>
                        <span className="font-bold text-sm text-blue-800">{users.find((u) => u.id === selectedTask.assignedTo)?.name}</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Settings2 className="w-4 h-4 mr-1.5" /> จัดการสถานะงาน</h4>

                      {currentUser.id === selectedTask.assignedTo && (
                        <div className="space-y-4">
                          {selectedTask.status === 'Pending' && (
                            <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg disabled:opacity-60">
                              กดรับงาน (เริ่มดำเนินการ)
                            </button>
                          )}
                          {selectedTask.status === 'In Progress' && (
                            <div className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-200">
                              {currentUser.role === 'Staff' && (
                                <label className="flex items-center space-x-3 cursor-pointer p-3 bg-green-50 rounded-xl border border-green-200">
                                  <input type="checkbox" id="notifyHeadToggle" defaultChecked className="accent-green-600 w-5 h-5" />
                                  <span className="font-bold text-green-800 text-sm flex items-center"><Smartphone className="w-4 h-4 mr-1.5 text-green-600" /> แจ้งเตือนหัวหน้าผ่าน LINE</span>
                                </label>
                              )}
                              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                                {currentUser.role === 'Staff' && (
                                  <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'Review', document.getElementById('notifyHeadToggle')?.checked)} className="flex-1 bg-purple-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg disabled:opacity-60">ส่งงาน (รอตรวจ)</button>
                                )}
                                <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'Completed')} className="flex-1 bg-emerald-500 text-white py-3.5 rounded-xl font-black text-sm shadow-lg disabled:opacity-60">
                                  {currentUser.role === 'Head' ? 'เสร็จสิ้น (ปิดงาน)' : 'เสร็จสิ้น (ปิดจบเอง)'}
                                </button>
                              </div>
                            </div>
                          )}
                          {(selectedTask.status === 'Pending' || selectedTask.status === 'In Progress') && (
                            <div className="mt-6 p-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                              <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">โอนงานให้เพื่อนร่วมทีม</p>
                              <div className="flex space-x-3">
                                <select id="forwardSelect" className="flex-1 border-2 border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none bg-slate-50">
                                  <option value="">-- เลือกผู้รับงาน --</option>
                                  {users.filter((u) => u.id !== currentUser.id && (u.role === 'Staff' || u.role === 'Head')).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <button disabled={busy} onClick={() => { const s = document.getElementById('forwardSelect').value; if (s) handleForward(selectedTask.id, s); }} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">ส่งต่อ</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {currentUser.role === 'Staff' && currentUser.id !== selectedTask.assignedTo && selectedTask.status !== 'Completed' && (
                        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0">
                            <div className="bg-indigo-100 p-3 rounded-2xl mr-4 shrink-0"><Grab className="w-6 h-6 text-indigo-700" /></div>
                            <div className="flex-1 pr-4">
                              <h5 className="font-extrabold text-indigo-900 text-base mb-1">ดึงงานนี้มาทำแทน (Takeover)</h5>
                              <p className="text-xs text-indigo-700/80 font-medium leading-relaxed">งานนี้อยู่กับ <strong>{users.find((u) => u.id === selectedTask.assignedTo)?.name}</strong> คุณสามารถดึงมาทำเองได้กรณีฉุกเฉิน ระบบจะบันทึก Log ให้อัตโนมัติ</p>
                            </div>
                            <button disabled={busy} onClick={() => handleTakeover(selectedTask.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shrink-0 w-full sm:w-auto disabled:opacity-60">ดึงงานมาทำ</button>
                          </div>
                        </div>
                      )}

                      {currentUser.role === 'Head' && currentUser.id !== selectedTask.assignedTo && selectedTask.status === 'Review' && (
                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-2 p-5 bg-purple-50 rounded-3xl border border-purple-100">
                          <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'Completed')} className="flex-1 bg-emerald-500 text-white py-3.5 rounded-xl font-black text-sm shadow-lg flex justify-center items-center disabled:opacity-60">
                            <CheckCircle className="w-4 h-4 mr-2" /> ตรวจผ่าน (ปิดงาน)
                          </button>
                          <button disabled={busy} onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress', true)} className="flex-1 bg-white text-rose-600 border-2 border-rose-200 py-3.5 rounded-xl font-black text-sm shadow-sm flex justify-center items-center disabled:opacity-60">
                            <ArrowRightLeft className="w-4 h-4 mr-2" /> ตีกลับให้แก้ (แจ้ง LINE)
                          </button>
                        </div>
                      )}
                      {currentUser.role === 'Head' && currentUser.id !== selectedTask.assignedTo && selectedTask.status !== 'Review' && selectedTask.status !== 'Completed' && (
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 border-dashed text-center">
                          <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm font-bold text-slate-500">รอรับการส่งงาน</p>
                          <p className="text-xs text-slate-400 mt-1">หัวหน้าจะตรวจได้เมื่อสถานะเป็น &quot;รอตรวจ&quot;</p>
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
                            <div className={`px-5 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm font-medium leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'}`}>
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
                      <button type="button" className="p-3.5 text-slate-400 hover:text-blue-600 bg-slate-100 rounded-xl border border-slate-200"><Paperclip className="w-5 h-5" /></button>
                      <input type="text" name="comment" required placeholder="พิมพ์ข้อความ..." className="flex-1 border-2 border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium outline-none focus:border-blue-500 bg-slate-50 focus:bg-white" autoComplete="off" />
                      <button type="submit" disabled={busy} className="p-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md disabled:opacity-60"><Send className="w-5 h-5" /></button>
                    </form>
                  </div>
                )}
              </div>

              <div className="w-full lg:w-80 p-6 md:p-8 bg-slate-50 overflow-y-auto border-t lg:border-t-0 shrink-0">
                <div className="flex items-center space-x-2 mb-8">
                  <History className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-extrabold text-slate-800 text-sm">ประวัติ (Timeline)</h4>
                </div>
                <div className="border-l-2 border-slate-200 ml-2.5 space-y-6">
                  {activityLoading && selectedLogs.length === 0 ? (
                    <div className="pl-6 text-xs text-slate-400 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> โหลดประวัติ...</div>
                  ) : selectedLogs.map((log, idx) => {
                      const isTakeover = log.actionType === 'Takeover';
                      return (
                        <div key={log.id} className="relative pl-6">
                          <div className={`absolute w-3 h-3 border-2 rounded-full -left-[7px] top-1 ${isTakeover ? 'bg-indigo-500 border-white ring-2 ring-indigo-200' : (idx === 0 ? 'bg-blue-500 border-white ring-2 ring-blue-200' : 'bg-white border-slate-300')}`} />
                          <p className="text-xs font-black text-slate-800">{users.find((u) => u.id === log.actionBy)?.name}</p>
                          <p className={`text-xs mt-1.5 mb-1.5 p-3 rounded-xl border shadow-sm leading-relaxed font-medium ${isTakeover ? 'bg-indigo-50 border-indigo-100 text-indigo-800' : 'bg-white border-slate-200 text-slate-600'}`}>{log.detail}</p>
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
