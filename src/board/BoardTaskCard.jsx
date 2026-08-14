import React, { memo } from 'react';
import {
  Calendar as CalendarIcon,
  Loader2,
  MessageSquare,
  Pencil,
  Repeat,
  Save,
  Trash2,
} from 'lucide-react';
import { formatThaiDate } from '../formatThaiDate';
import { boardColumnTheme, isOverdue } from './boardUtils';

function BoardTaskCardInner({
  task,
  status,
  assignee,
  currentUser,
  commentCount,
  projectName,
  showProjectChip,
  compact,
  editing,
  titleDraft,
  busy,
  canEdit,
  canDelete,
  onSelect,
  onStartEdit,
  onTitleDraftChange,
  onSaveTitle,
  onCancelEdit,
  onDelete,
}) {
  const theme = boardColumnTheme[status];
  const overdue = isOverdue(task.dueDate, task.status);
  const isMyTask = String(task.assignedTo) === String(currentUser?.id);
  const cardPadding = compact ? 'p-2.5' : 'p-4';
  const titleClass = compact ? 'text-xs mb-1' : 'text-sm mb-2';

  return (
    <div
      onClick={() => {
        if (editing) return;
        onSelect(task);
      }}
      className={`bg-white ${cardPadding} rounded-2xl shadow-sm border-2 relative group cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${
        overdue ? 'border-rose-400 ring-2 ring-rose-100' : theme.cardBorder
      } ${isMyTask && status === 'Pending' ? 'ring-2 ring-amber-200' : ''} ${status === 'Completed' ? 'opacity-90' : ''} ${
        editing ? 'ring-2 ring-teal-300 cursor-default' : ''
      }`}
    >
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${theme.accent}`} />
      {task.isRecurring && !editing && (
        <Repeat className={`${compact ? 'w-3 h-3 top-2 right-2' : 'w-4 h-4 top-3.5 right-3.5'} absolute text-slate-300`} />
      )}
      {(canEdit || canDelete) && !editing && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
          {canEdit && (
            <button
              type="button"
              title="แก้ไขชื่องาน"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(task);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              title="ลบงาน"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {isMyTask && status === 'Pending' && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
          งานใหม่!
        </div>
      )}
      {!isMyTask && overdue && (
        <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
          เลยกำหนด
        </div>
      )}
      {showProjectChip && projectName && (
        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-lg mb-2 inline-block truncate max-w-[80%] ml-2">
          {projectName}
        </span>
      )}
      {editing ? (
        <div className="pl-2 pr-1 mb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={titleDraft}
            disabled={busy}
            autoFocus
            onChange={(e) => onTitleDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveTitle(task.id);
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="w-full text-sm font-bold text-[#1e3a4c] border-2 border-teal-300 rounded-xl px-3 py-2 outline-none focus:border-teal-500 bg-white"
            placeholder="ชื่องาน"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onSaveTitle(task.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            บันทึก
          </button>
        </div>
      ) : (
        <h4 className={`font-bold text-[#1e3a4c] leading-relaxed pr-6 pl-2 ${titleClass} ${
          status === 'Completed' ? 'line-through decoration-slate-300' : ''
        }`}
        >
          {task.title}
        </h4>
      )}
      {!compact && isMyTask && status !== 'Completed' && (
        <p className="text-[10px] font-extrabold text-teal-600 mb-3 pl-2">แตะการ์ด → อัปเดตสถานะ</p>
      )}
      <div className={`flex justify-between items-end ${compact ? 'pt-1.5' : 'pt-3'} border-t border-slate-100/80 pl-2`}>
        <div className="flex items-center space-x-2">
          <div className={`${compact ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]'} rounded-full flex items-center justify-center font-extrabold ${
            isMyTask ? 'bg-teal-500 text-white' : 'bg-[#f3f9fc] text-[#5b7a8a]'
          }`}
          >
            {assignee?.name?.charAt(0)}
          </div>
          {!compact && (
            <span className={`text-[11px] font-bold ${isMyTask ? 'text-teal-700' : 'text-[#5b7a8a]'}`}>
              {assignee?.name?.split(' ')[0]}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-bold">
          {commentCount > 0 && (
            <span className="flex items-center text-slate-400">
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              {commentCount}
            </span>
          )}
          <span className={`flex items-center px-1.5 py-0.5 rounded ${
            !task.dueDate
              ? 'text-slate-400 bg-slate-50 border border-slate-100'
              : overdue
                ? 'text-rose-700 bg-rose-100 border border-rose-200'
                : 'text-slate-500 bg-slate-50 border border-slate-100'
          }`}
          >
            <CalendarIcon className="w-3 h-3 mr-1" />
            {status === 'Completed' && task.completedAt
              ? formatThaiDate(task.completedAt)
              : formatThaiDate(task.dueDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

const BoardTaskCard = memo(BoardTaskCardInner);
export default BoardTaskCard;
