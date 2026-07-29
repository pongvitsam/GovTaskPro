import React, { useMemo, useState } from 'react';
import { History, Loader2, KanbanSquare, ListChecks, FileClock, FolderKanban } from 'lucide-react';
import { isProductionHost } from './api';
import {
  ACTIVITY_FILTERS,
  buildProjectActivityEvents,
  filterActivityEvents,
  groupActivityByDay,
  CATEGORY_STYLE,
} from './projectActivity';
import { formatThaiDateLong } from './formatThaiDate';

export default function ProjectActivityPanel({
  project,
  projectTasks,
  projectMilestones,
  projectExtensions,
  users,
  taskLogs,
  loading,
  loadError,
  onOpenTask,
  onGoContractTab,
  onGoPlanTab,
}) {
  const [filter, setFilter] = useState('all');

  const allEvents = useMemo(
    () => buildProjectActivityEvents({
      project,
      projectTasks,
      taskLogs: taskLogs || [],
      milestones: projectMilestones,
      contractExtensions: projectExtensions,
    }),
    [project, projectTasks, taskLogs, projectMilestones, projectExtensions],
  );

  const filtered = useMemo(
    () => filterActivityEvents(allEvents, filter),
    [allEvents, filter],
  );

  const groups = useMemo(() => groupActivityByDay(filtered), [filtered]);

  const userName = (id) => users?.find((u) => String(u.id) === String(id))?.name || (id ? 'ผู้ใช้' : 'ระบบ');

  const iconFor = (category) => {
    if (category === 'task') return KanbanSquare;
    if (category === 'plan' || category === 'project') return ListChecks;
    if (category === 'contract') return FileClock;
    return History;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold border transition-all ${
              filter === f.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <History className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">ความเคลื่อนไหวในโปรเจกต์</h3>
            <p className="text-[11px] text-slate-500 font-medium">รวมงานในบอร์ด ขั้นตอนแผน และการขยายสัญญา</p>
            {!isProductionHost() && (
              <p className="text-[10px] text-teal-700 font-bold mt-1">โหมด demo — กด Ctrl+F5 ถ้าไม่เห็นข้อมูลตัวอย่าง</p>
            )}
          </div>
        </div>

        <div className="p-5 md:p-6">
          {loading && allEvents.length === 0 && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลดประวัติ...
            </div>
          )}
          {loadError && (
            <p className="text-sm text-rose-600 font-medium mb-4">{loadError}</p>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-bold text-slate-500">ยังไม่มีรายการในหมวดนี้</p>
              <p className="text-xs mt-1">เมื่อมีงาน ขั้นตอน หรือขยายสัญญา จะแสดงที่นี่</p>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.dayKey || group.label}>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wide mb-4 sticky top-0 bg-white/95 py-1 z-[1]">
                    {group.label}
                  </h4>
                  <div className="border-l-2 border-slate-200 ml-2.5 space-y-5">
                    {group.events.map((ev) => {
                      const style = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.task;
                      const Icon = iconFor(ev.category);
                      return (
                        <div key={ev.id} className="relative pl-6">
                          <div className={`absolute w-3 h-3 border-2 border-white rounded-full -left-[7px] top-1.5 ring-2 ${style.dot}`} />
                          <div className="flex flex-wrap items-start gap-2 mb-1">
                            <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-sm font-extrabold text-slate-800 flex-1 min-w-[200px]">{ev.title}</p>
                          </div>
                          {ev.detail && (
                            <p className={`text-xs mt-1 mb-2 p-3 rounded-xl border shadow-sm leading-relaxed font-medium ml-6 ${style.card}`}>
                              {ev.detail}
                            </p>
                          )}
                          <p className="text-[10px] font-bold text-slate-400 ml-6">
                            {userName(ev.actorId)}
                            {' · '}
                            {formatThaiDateLong(ev.timestamp, { emptyLabel: '—' })}
                            {' '}
                            {new Date(ev.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2 ml-6">
                            {ev.taskId && onOpenTask && (
                              <button
                                type="button"
                                onClick={() => {
                                  const task = projectTasks.find((t) => String(t.id) === String(ev.taskId));
                                  if (task) onOpenTask(task);
                                }}
                                className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100"
                              >
                                เปิดงาน
                              </button>
                            )}
                            {ev.extensionId && onGoContractTab && (
                              <button
                                type="button"
                                onClick={onGoContractTab}
                                className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-100"
                              >
                                ดูขยายสัญญา
                              </button>
                            )}
                            {ev.milestoneId && onGoPlanTab && (
                              <button
                                type="button"
                                onClick={onGoPlanTab}
                                className="text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-100"
                              >
                                ไปแผนงาน
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
