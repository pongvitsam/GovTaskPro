import React, { useEffect, useRef, useState } from 'react';
import {
  KanbanSquare,
  LayoutList,
  ListFilter,
  Plus,
  Search,
  User,
  UserCircle2,
  X,
} from 'lucide-react';
import { BOARD_STATUSES } from './boardUtils';
import { useBoardFilters } from './useBoardFilters';
import VirtualBoardColumn from './VirtualBoardColumn';
import BoardListView from './BoardListView';

export default function BoardView({
  visibleTasks,
  visibleProjects,
  activeProjectId,
  currentUser,
  assignableUsers,
  usersById,
  projectsById,
  commentCounts,
  busy,
  canEditTask,
  canDeleteTask,
  onSelectTask,
  onSaveTaskTitle,
  onDeleteTask,
  onClearProjectFilter,
  onOpenCreate,
}) {
  const [viewMode, setViewMode] = useState('kanban');
  const [compactCards, setCompactCards] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [expandedColumns, setExpandedColumns] = useState({});
  const [personFilterOpen, setPersonFilterOpen] = useState(false);
  const personFilterRef = useRef(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [titleDraft, setTitleDraft] = useState('');

  const filters = useBoardFilters({
    visibleTasks,
    currentUser,
    projectsById,
    assignableUsers,
  });

  const {
    search,
    setSearch,
    personFilter,
    setPersonFilter,
    statusFilter,
    overdueOnly,
    myTasksOnly,
    boardFilterUsers,
    taskCountByAssignee,
    stats,
    filteredTasks,
    boardTasksByStatus,
    hasActiveFilters,
    clearFilters,
    toggleChip,
  } = filters;

  useEffect(() => {
    if (!personFilterOpen) return undefined;
    const onDoc = (e) => {
      if (personFilterRef.current?.contains(e.target)) return;
      setPersonFilterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [personFilterOpen]);

  const displayTasks = viewMode === 'mine'
    ? filteredTasks.filter((t) => String(t.assignedTo) === String(currentUser?.id))
    : filteredTasks;

  const displayByStatus = viewMode === 'mine'
    ? BOARD_STATUSES.reduce((acc, status) => {
      acc[status] = displayTasks.filter((t) => t.status === status);
      return acc;
    }, {})
    : boardTasksByStatus;

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setTitleDraft(task.title || '');
  };

  const handleSaveTitle = async (taskId) => {
    const ok = await onSaveTaskTitle(taskId, titleDraft);
    if (ok !== false) {
      setEditingTaskId(null);
      setTitleDraft('');
    }
  };

  const chipClass = (active) => (
    active
      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
      : 'bg-white/90 text-[#5b7a8a] border-slate-100 hover:bg-white'
  );

  return (
    <div className="flex flex-col h-full p-6 md:p-8 gtp-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0">
        <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c] flex items-center flex-wrap gap-2">
          กระดานงาน
          {activeProjectId && (
            <span className="text-sm font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">
              {visibleProjects.find((p) => p.id === activeProjectId)?.name}
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-slate-100 bg-white/90 p-1 shadow-sm">
            {[
              { id: 'kanban', icon: KanbanSquare, label: 'Kanban' },
              { id: 'list', icon: LayoutList, label: 'รายการ' },
              { id: 'mine', icon: UserCircle2, label: 'ของฉัน' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors ${
                  viewMode === id ? 'bg-teal-600 text-white' : 'text-[#5b7a8a] hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          {activeProjectId && (
            <button
              type="button"
              onClick={onClearProjectFilter}
              className="px-4 py-2.5 text-sm font-bold text-[#5b7a8a] bg-white/90 border border-slate-100 rounded-2xl hover:bg-white shadow-sm"
            >
              ดูทั้งหมด
            </button>
          )}
          <button type="button" onClick={onOpenCreate} className="gtp-btn-primary px-4 py-2.5 text-sm flex items-center">
            <Plus className="w-4 h-4 mr-1.5" /> สร้างงาน
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่องานหรือโปรเจกต์..."
              className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold rounded-2xl border border-slate-100 bg-white/90 shadow-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="relative" ref={personFilterRef}>
            <button
              type="button"
              onClick={() => setPersonFilterOpen((v) => !v)}
              className={`px-4 py-2.5 text-sm font-extrabold rounded-2xl border flex items-center gap-2 shadow-sm transition-colors ${
                personFilter !== 'all'
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-white/90 border-slate-100 text-[#5b7a8a] hover:bg-white'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              {personFilter === 'all'
                ? 'ฟิลเตอร์คน'
                : (usersById.get(personFilter)?.name || 'ฟิลเตอร์คน')}
            </button>
            {personFilterOpen && (
              <div className="absolute right-0 top-full mt-2 z-30 w-64 max-h-72 overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl py-2 gtp-fade-in">
                <button
                  type="button"
                  onClick={() => { setPersonFilter('all'); setPersonFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-[#f3f9fc] flex items-center justify-between ${
                    personFilter === 'all' ? 'text-teal-700 bg-teal-50/60' : 'text-[#1e3a4c]'
                  }`}
                >
                  ทุกคน
                  <span className="text-[10px] font-black text-slate-400">{visibleTasks.length}</span>
                </button>
                {boardFilterUsers.map((u) => {
                  const count = taskCountByAssignee.get(String(u.id)) || 0;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setPersonFilter(u.id); setPersonFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-[#f3f9fc] flex items-center gap-2 ${
                        personFilter === u.id ? 'text-teal-700 bg-teal-50/60' : 'text-[#1e3a4c]'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-full bg-[#f3f9fc] text-[#5b7a8a] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                        {u.name?.charAt(0)}
                      </span>
                      <span className="flex-1 truncate">{u.name}</span>
                      <span className="text-[10px] font-black text-slate-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCompactCards((v) => !v)}
            className={`px-4 py-2.5 text-sm font-extrabold rounded-2xl border shadow-sm transition-colors ${
              compactCards
                ? 'bg-teal-50 border-teal-200 text-teal-800'
                : 'bg-white/90 border-slate-100 text-[#5b7a8a] hover:bg-white'
            }`}
          >
            การ์ดกระชับ
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
            <ListFilter className="w-3.5 h-3.5" />
            ฟิลเตอร์ด่วน
          </span>
          <button type="button" onClick={() => toggleChip('all')} className={`px-3 py-1.5 text-xs font-extrabold rounded-full border ${chipClass(!hasActiveFilters && viewMode !== 'mine')}`}>
            ทั้งหมด {stats.total}
          </button>
          <button type="button" onClick={() => toggleChip('mine')} className={`px-3 py-1.5 text-xs font-extrabold rounded-full border ${chipClass(myTasksOnly || viewMode === 'mine')}`}>
            ของฉัน {stats.myCount}
          </button>
          <button type="button" onClick={() => toggleChip('overdue')} className={`px-3 py-1.5 text-xs font-extrabold rounded-full border ${chipClass(overdueOnly)}`}>
            เลยกำหนด {stats.overdueCount}
          </button>
          <button type="button" onClick={() => toggleChip('review')} className={`px-3 py-1.5 text-xs font-extrabold rounded-full border ${chipClass(statusFilter === 'Review')}`}>
            รอตรวจ {stats.reviewCount}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs font-extrabold rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              ล้างฟิลเตอร์
            </button>
          )}
        </div>

        {(hasActiveFilters || viewMode === 'mine') && (
          <p className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 w-fit">
            แสดง {displayTasks.length} จาก {visibleTasks.length} งาน
            {viewMode === 'mine' && ' · มุมมองของฉัน'}
          </p>
        )}
      </div>

      {viewMode === 'list' || viewMode === 'mine' ? (
        <BoardListView
          tasks={displayTasks}
          currentUser={currentUser}
          usersById={usersById}
          projectsById={projectsById}
          activeProjectId={activeProjectId}
          onSelectTask={(task) => onSelectTask(task)}
        />
      ) : (
        <div className="flex-1 overflow-x-auto pb-4 min-h-0">
          <div className="flex gap-5 h-full min-w-max items-start">
            {BOARD_STATUSES.map((status) => (
              <VirtualBoardColumn
                key={status}
                status={status}
                tasks={displayByStatus[status] || []}
                expanded={!!expandedColumns[status]}
                onExpand={() => setExpandedColumns((prev) => ({ ...prev, [status]: true }))}
                onCollapse={() => setExpandedColumns((prev) => ({ ...prev, [status]: false }))}
                collapsed={status === 'Completed' && completedCollapsed}
                onToggleCollapse={() => setCompletedCollapsed((v) => !v)}
                compact={compactCards}
                currentUser={currentUser}
                usersById={usersById}
                projectsById={projectsById}
                commentCounts={commentCounts}
                activeProjectId={activeProjectId}
                editingTaskId={editingTaskId}
                titleDraft={titleDraft}
                busy={busy}
                canEditTask={canEditTask}
                canDeleteTask={canDeleteTask}
                onSelectTask={(task) => onSelectTask(task)}
                onStartEdit={handleStartEdit}
                onTitleDraftChange={setTitleDraft}
                onSaveTitle={handleSaveTitle}
                onCancelEdit={() => { setEditingTaskId(null); setTitleDraft(''); }}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
