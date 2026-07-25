import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StickyNote, Plus, Trash2, Loader2, Lock, Maximize2, Minimize2, Palette
} from 'lucide-react';
import { api } from './api';

const COLORS = [
  { id: 'yellow', label: 'เหลือง', bg: '#fef08a', ink: '#713f12', tape: 'rgba(253,224,71,0.85)' },
  { id: 'pink', label: 'ชมพู', bg: '#fbcfe8', ink: '#9d174d', tape: 'rgba(244,114,182,0.75)' },
  { id: 'mint', label: 'มิ้นต์', bg: '#a7f3d0', ink: '#065f46', tape: 'rgba(52,211,153,0.75)' },
  { id: 'blue', label: 'ฟ้า', bg: '#bfdbfe', ink: '#1e3a8a', tape: 'rgba(96,165,250,0.8)' },
  { id: 'lavender', label: 'ม่วง', bg: '#e9d5ff', ink: '#6b21a8', tape: 'rgba(192,132,252,0.8)' },
];

const EMOJI_PRESETS = ['📌', '✨', '💡', '⚠️', '✅', '🔥', '📝', '🎯'];
const SIZE_PRESETS = [
  { id: 'sm', label: 'เล็ก', width: 180, height: 160 },
  { id: 'md', label: 'กลาง', width: 220, height: 200 },
  { id: 'lg', label: 'ใหญ่', width: 280, height: 260 },
];

function colorMeta(id) {
  return COLORS.find((c) => c.id === id) || COLORS[0];
}

function hashRotate(id) {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % 11;
  return (h - 5) * 0.35;
}

export default function StickyNotes({ currentUser, showToast }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const saveTimerRef = useRef({});
  const topZRef = useRef(1);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api('listStickyNotes', { userId: currentUser.id });
      const list = Array.isArray(rows) ? rows : [];
      setNotes(list);
      topZRef.current = list.reduce((m, n) => Math.max(m, n.zIndex || 0), 1);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadNotes();
    return () => {
      Object.values(saveTimerRef.current).forEach((t) => clearTimeout(t));
    };
  }, [loadNotes]);

  const queueSave = useCallback((id, patch) => {
    if (saveTimerRef.current[id]) clearTimeout(saveTimerRef.current[id]);
    saveTimerRef.current[id] = setTimeout(async () => {
      try {
        await api('updateStickyNote', { id, userId: currentUser.id, ...patch });
      } catch (err) {
        showToast(err?.message || 'บันทึกโน้ตไม่สำเร็จ');
      }
    }, 450);
  }, [currentUser.id, showToast]);

  const bringToFront = (id) => {
    topZRef.current += 1;
    const zIndex = topZRef.current;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, zIndex } : n)));
    queueSave(id, { zIndex });
    setSelectedId(id);
  };

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('createStickyNote', {
        userId: currentUser.id,
        title: 'โน้ตใหม่',
        body: '',
        color: COLORS[notes.length % COLORS.length].id,
        emoji: '📌',
      });
      setNotes((prev) => [...prev, row]);
      topZRef.current = Math.max(topZRef.current, row.zIndex || 1);
      setSelectedId(row.id);
      showToast('เพิ่มโน้ตแล้ว');
    } catch (err) {
      showToast(err?.message || 'เพิ่มโน้ตไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (busy) return;
    if (!window.confirm('ลบโน้ตนี้ไหม?')) return;
    setBusy(true);
    try {
      await api('deleteStickyNote', { id, userId: currentUser.id });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) setSelectedId(null);
      showToast('ลบโน้ตแล้ว');
    } catch (err) {
      showToast(err?.message || 'ลบโน้ตไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const patchNote = (id, patch, { persist = true } = {}) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    if (persist) queueSave(id, patch);
  };

  const onPointerDown = (e, note) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (target.closest('[data-no-drag]')) return;
    e.preventDefault();
    bringToFront(note.id);
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    dragRef.current = {
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y,
      boardW: rect.width,
      boardH: rect.height,
      noteW: note.width,
      noteH: note.height,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const x = Math.max(8, Math.min(d.origX + dx, Math.max(8, d.boardW - d.noteW - 8)));
    const y = Math.max(8, Math.min(d.origY + dy, Math.max(8, d.boardH - d.noteH - 8)));
    d.lastX = x;
    d.lastY = y;
    patchNote(d.id, { x, y }, { persist: false });
  };

  const finishDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (d.lastX !== undefined && d.lastY !== undefined) {
      queueSave(d.id, { x: d.lastX, y: d.lastY });
    }
  }, [queueSave]);

  useEffect(() => {
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [finishDrag]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#3d2b1f]">
        <Loader2 className="w-8 h-8 text-amber-200 animate-spin mb-3" />
        <p className="text-amber-100/80 text-sm font-medium">กำลังโหลดโน้ตส่วนตัว...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#3d2b1f] p-8 text-center">
        <p className="text-rose-200 font-bold mb-3">{error}</p>
        <button onClick={loadNotes} className="px-4 py-2 rounded-xl bg-amber-400 text-amber-950 font-bold text-sm">
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col sticky-board-root">
      <div className="shrink-0 px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/30 bg-gradient-to-r from-[#4a3423] via-[#5c4030] to-[#3d2b1f]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-200 border border-amber-300/20">
            <StickyNote className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-amber-50 tracking-tight truncate">เตือนความจำ (ส่วนตัว)</h2>
            <p className="text-[11px] text-amber-200/70 font-medium flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> เห็นได้เฉพาะคุณ · ลากเพื่อจัดตำแหน่ง · คลิกเพื่อแก้ไข
            </p>
          </div>
        </div>
        <button
          disabled={busy}
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm shadow-lg shadow-black/20 disabled:opacity-60 transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          เพิ่มโน้ต
        </button>
      </div>

      <div
        ref={boardRef}
        className="relative flex-1 overflow-auto cork-board custom-scrollbar"
        onPointerMove={onPointerMove}
      >
        <div className="relative min-h-full min-w-full" style={{ height: Math.max(720, ...notes.map((n) => n.y + n.height + 80)), width: '100%' }}>
          {notes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-200/90 shadow-xl rotate-[-6deg] flex items-center justify-center mb-5 border border-amber-300">
                <StickyNote className="w-9 h-9 text-amber-800" />
              </div>
              <p className="text-amber-100 font-bold text-base mb-1">ยังไม่มีโน้ต</p>
              <p className="text-amber-200/60 text-sm max-w-sm">กด &quot;เพิ่มโน้ต&quot; เพื่อติดเตือนความจำส่วนตัวบนกระดานนี้ — คนอื่นในระบบจะไม่เห็น</p>
            </div>
          )}

          {notes.map((note) => {
            const meta = colorMeta(note.color);
            const selected = selectedId === note.id;
            const rot = hashRotate(note.id);
            return (
              <div
                key={note.id}
                role="article"
                onPointerDown={(e) => onPointerDown(e, note)}
                onClick={() => setSelectedId(note.id)}
                className={`absolute select-none sticky-note ${selected ? 'sticky-note-selected' : ''} ${dragRef.current?.id === note.id ? 'sticky-note-dragging' : ''}`}
                style={{
                  left: note.x,
                  top: note.y,
                  width: note.width,
                  height: note.height,
                  zIndex: note.zIndex,
                  background: meta.bg,
                  color: meta.ink,
                  transform: `rotate(${rot}deg)`,
                  boxShadow: selected
                    ? '0 18px 40px rgba(0,0,0,0.28), 0 0 0 2px rgba(255,255,255,0.55)'
                    : '0 10px 24px rgba(0,0,0,0.22)',
                }}
              >
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 rounded-sm shadow-sm"
                  style={{ background: meta.tape, transform: `rotate(${rot * -0.4}deg)` }}
                />
                <div className="h-full flex flex-col p-3 pt-4">
                  <div className="flex items-start gap-1.5 mb-1" data-no-drag>
                    <button
                      type="button"
                      className="text-lg leading-none shrink-0 hover:scale-110 transition"
                      title="เปลี่ยนอีโมจิ"
                      onClick={(e) => {
                        e.stopPropagation();
                        const i = EMOJI_PRESETS.indexOf(note.emoji);
                        const next = EMOJI_PRESETS[(i + 1) % EMOJI_PRESETS.length];
                        patchNote(note.id, { emoji: next });
                      }}
                    >
                      {note.emoji || '📌'}
                    </button>
                    <input
                      data-no-drag
                      value={note.title}
                      onChange={(e) => patchNote(note.id, { title: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent border-0 outline-none font-extrabold text-sm placeholder:opacity-40"
                      placeholder="หัวข้อ..."
                      style={{ color: meta.ink }}
                    />
                    <button
                      type="button"
                      data-no-drag
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      className="p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-black/10 transition"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    data-no-drag
                    value={note.body}
                    onChange={(e) => patchNote(note.id, { body: e.target.value })}
                    className="flex-1 w-full resize-none bg-transparent border-0 outline-none text-[13px] leading-relaxed font-medium placeholder:opacity-35 custom-scrollbar"
                    placeholder="เขียนเตือนความจำ..."
                    style={{ color: meta.ink }}
                  />
                  {selected && (
                    <div className="mt-2 pt-2 border-t border-black/10 flex flex-wrap items-center gap-1.5" data-no-drag>
                      <Palette className="w-3.5 h-3.5 opacity-50" />
                      {COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.label}
                          onClick={() => patchNote(note.id, { color: c.id })}
                          className={`w-5 h-5 rounded-full border-2 transition ${note.color === c.id ? 'border-slate-800 scale-110' : 'border-white/70'}`}
                          style={{ background: c.bg }}
                        />
                      ))}
                      <span className="mx-1 w-px h-4 bg-black/15" />
                      {SIZE_PRESETS.map((s) => {
                        const active = note.width === s.width && note.height === s.height;
                        const Icon = s.id === 'sm' ? Minimize2 : Maximize2;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            title={s.label}
                            onClick={() => patchNote(note.id, { width: s.width, height: s.height })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${active ? 'bg-black/15' : 'hover:bg-black/10'}`}
                          >
                            <Icon className="w-3 h-3" />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
