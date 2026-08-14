import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Calendar as CalendarIcon, FolderKanban } from 'lucide-react';
import { formatThaiDate } from '../formatThaiDate';
import { BOARD_STATUSES, getStatusColor, getStatusText, isOverdue } from './boardUtils';

const ROW_HEIGHT = 52;

export default function BoardListView({
  tasks,
  currentUser,
  usersById,
  projectsById,
  activeProjectId,
  onSelectTask,
}) {
  const parentRef = useRef(null);

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = BOARD_STATUSES.indexOf(a.status) - BOARD_STATUSES.indexOf(b.status);
    if (statusOrder !== 0) return statusOrder;
    const aOverdue = isOverdue(a.dueDate, a.status);
    const bOverdue = isOverdue(b.dueDate, b.status);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDue - bDue;
  });

  const virtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (sortedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-semibold">
        ไม่พบงานที่ตรงกับเงื่อนไข
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-100 bg-white/90 shadow-sm overflow-hidden">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-4 py-3 border-b border-slate-100 bg-[#f8fbfd] text-[11px] font-extrabold text-[#5b7a8a] uppercase tracking-wide shrink-0">
        <span>ชื่องาน</span>
        <span>สถานะ</span>
        <span>ผู้รับผิดชอบ</span>
        <span>กำหนด</span>
        {!activeProjectId && <span>โปรเจกต์</span>}
        {activeProjectId && <span />}
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const task = sortedTasks[virtualRow.index];
            const assignee = usersById.get(task.assignedTo);
            const overdue = isOverdue(task.dueDate, task.status);
            const isMyTask = String(task.assignedTo) === String(currentUser?.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center px-4 text-left border-b border-slate-50 hover:bg-teal-50/50 transition-colors ${
                  overdue ? 'bg-rose-50/40' : ''
                }`}
              >
                <span className={`text-sm font-bold text-[#1e3a4c] truncate pr-2 ${
                  task.status === 'Completed' ? 'line-through text-slate-400' : ''
                }`}
                >
                  {task.title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border w-fit ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                <span className={`text-xs font-bold truncate ${isMyTask ? 'text-teal-700' : 'text-[#5b7a8a]'}`}>
                  {assignee?.name || '—'}
                </span>
                <span className={`text-xs font-bold flex items-center gap-1 ${
                  overdue ? 'text-rose-700' : 'text-slate-500'
                }`}
                >
                  <CalendarIcon className="w-3 h-3 shrink-0" />
                  {task.status === 'Completed' && task.completedAt
                    ? formatThaiDate(task.completedAt)
                    : formatThaiDate(task.dueDate) || '—'}
                </span>
                {!activeProjectId ? (
                  <span className="text-xs font-bold text-teal-700 truncate flex items-center gap-1">
                    {task.projectId ? (
                      <>
                        <FolderKanban className="w-3 h-3 shrink-0" />
                        {projectsById.get(task.projectId)?.name || '—'}
                      </>
                    ) : '—'}
                  </span>
                ) : <span />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
