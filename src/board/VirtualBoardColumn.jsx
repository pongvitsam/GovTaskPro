import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import BoardTaskCard from './BoardTaskCard';
import { boardColumnTheme, getColumnPreviewLimit, getStatusText } from './boardUtils';

const CARD_GAP = 8;
const CARD_HEIGHT_COMPACT = 72;
const CARD_HEIGHT_NORMAL = 136;

export default function VirtualBoardColumn({
  status,
  tasks,
  expanded,
  onExpand,
  onCollapse,
  collapsed,
  onToggleCollapse,
  compact,
  currentUser,
  usersById,
  projectsById,
  commentCounts,
  activeProjectId,
  editingTaskId,
  titleDraft,
  busy,
  canEditTask,
  canDeleteTask,
  onSelectTask,
  onStartEdit,
  onTitleDraftChange,
  onSaveTitle,
  onCancelEdit,
  onDeleteTask,
}) {
  const parentRef = useRef(null);
  const theme = boardColumnTheme[status];
  const limit = getColumnPreviewLimit(status);
  const totalInCol = tasks.length;
  const hiddenCount = !expanded && totalInCol > limit ? totalInCol - limit : 0;
  const shownTasks = hiddenCount > 0 ? tasks.slice(0, limit) : tasks;

  const estimateSize = compact ? CARD_HEIGHT_COMPACT : CARD_HEIGHT_NORMAL;
  const useVirtual = shownTasks.length > 20;
  const virtualizer = useVirtualizer({
    count: shownTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + CARD_GAP,
    overscan: 4,
  });

  useEffect(() => {
    if (useVirtual) virtualizer.measure();
  }, [compact, shownTasks.length, useVirtual, virtualizer]);

  const renderCard = (task) => (
    <BoardTaskCard
      key={task.id}
      task={task}
      status={status}
      assignee={usersById.get(task.assignedTo)}
      currentUser={currentUser}
      commentCount={commentCounts[String(task.id)] || 0}
      projectName={projectsById.get(task.projectId)?.name}
      showProjectChip={!!task.projectId && !activeProjectId}
      compact={compact}
      editing={editingTaskId === task.id}
      titleDraft={titleDraft}
      busy={busy}
      canEdit={canEditTask(task)}
      canDelete={canDeleteTask(task)}
      onSelect={onSelectTask}
      onStartEdit={onStartEdit}
      onTitleDraftChange={onTitleDraftChange}
      onSaveTitle={onSaveTitle}
      onCancelEdit={onCancelEdit}
      onDelete={onDeleteTask}
    />
  );

  if (collapsed && status === 'Completed') {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className={`w-80 shrink-0 rounded-[1.5rem] border-2 ${theme.border} ${theme.bg} shadow-md p-4 text-left hover:shadow-lg transition-shadow`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm" />
            <h3 className="gtp-display font-extrabold text-sm text-emerald-900">{getStatusText(status)}</h3>
          </div>
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow-sm ${theme.badge}`}>{totalInCol}</span>
        </div>
        <p className="text-xs text-emerald-700 font-bold mt-2">คลิกเพื่อขยายคอลัมน์</p>
      </button>
    );
  }

  return (
    <div className={`w-80 flex flex-col rounded-[1.5rem] border-2 ${theme.border} ${theme.bg} max-h-full shrink-0 shadow-md overflow-hidden`}>
      <div className={`p-4 flex justify-between items-center sticky top-0 z-10 ${theme.header}`}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
          <h3 className="gtp-display font-extrabold text-sm tracking-wide">{getStatusText(status)}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {status === 'Completed' && (
            <button
              type="button"
              title="ย่อคอลัมน์"
              onClick={onToggleCollapse}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30"
            >
              ย่อ
            </button>
          )}
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow-sm ${theme.badge}`}>{totalInCol}</span>
        </div>
      </div>

      <div ref={parentRef} className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        {shownTasks.length === 0 ? (
          <p className="text-center text-xs text-slate-400 font-medium py-8">
            {status === 'Completed' ? 'ยังไม่มีงานเสร็จสิ้น' : 'ยังไม่มีงานในคอลัมน์นี้'}
          </p>
        ) : useVirtual ? (
          <div
            key={compact ? 'compact' : 'normal'}
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const task = shownTasks[virtualRow.index];
              return (
                <div
                  key={task.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderCard(task)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
            {shownTasks.map((task) => renderCard(task))}
          </div>
        )}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={onExpand}
            className="w-full mt-3 py-2.5 text-xs font-bold text-teal-700 bg-white/90 border border-teal-200 rounded-xl hover:bg-teal-50 shadow-sm"
          >
            แสดงอีก {hiddenCount} รายการ
          </button>
        )}
        {expanded && totalInCol > limit && (
          <button
            type="button"
            onClick={onCollapse}
            className="w-full mt-3 py-2.5 text-xs font-bold text-slate-600 bg-white/90 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
          >
            ย่อเหลือ {limit} รายการแรก
          </button>
        )}
      </div>
    </div>
  );
}
