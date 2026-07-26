import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StickyNote, Plus, Trash2, Loader2, Lock, Maximize2, Minimize2, Palette,
  Pin, PinOff, Archive, ArchiveRestore, Search, ListChecks, Bell, BellOff,
  Copy, Tag, Image as ImageIcon, RotateCcw, AlarmClock
} from 'lucide-react';
import { api } from './api';

const COLORS = [
  { id: 'yellow', label: 'เหลือง', bg: '#fef08a', ink: '#713f12', tape: 'rgba(253,224,71,0.85)' },
  { id: 'orange', label: 'ส้ม', bg: '#fdba74', ink: '#9a3412', tape: 'rgba(251,146,60,0.85)' },
  { id: 'pink', label: 'ชมพู', bg: '#fbcfe8', ink: '#9d174d', tape: 'rgba(244,114,182,0.75)' },
  { id: 'mint', label: 'มิ้นต์', bg: '#a7f3d0', ink: '#065f46', tape: 'rgba(52,211,153,0.75)' },
  { id: 'teal', label: 'เขียวน้ำทะเล', bg: '#99f6e4', ink: '#115e59', tape: 'rgba(45,212,191,0.8)' },
  { id: 'blue', label: 'ฟ้า', bg: '#bfdbfe', ink: '#1e3a8a', tape: 'rgba(96,165,250,0.8)' },
  { id: 'lavender', label: 'ม่วง', bg: '#e9d5ff', ink: '#6b21a8', tape: 'rgba(192,132,252,0.8)' },
  { id: 'white', label: 'ขาว', bg: '#f8fafc', ink: '#334155', tape: 'rgba(203,213,225,0.9)' },
];

const EMOJI_PRESETS = ['📌', '✨', '💡', '⚠️', '✅', '🔥', '📝', '🎯', '🛒', '📅'];
const SIZE_PRESETS = [
  { id: 'sm', label: 'เล็ก', width: 200, height: 180 },
  { id: 'md', label: 'กลาง', width: 240, height: 220 },
  { id: 'lg', label: 'ใหญ่', width: 300, height: 280 },
];

const VIEWS = [
  { id: 'notes', label: 'โน้ต', icon: StickyNote },
  { id: 'reminders', label: 'การเตือน', icon: Bell },
  { id: 'archive', label: 'คลัง', icon: Archive },
  { id: 'trash', label: 'ถังขยะ', icon: Trash2 },
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

function normalizeNote(n) {
  return {
    ...n,
    noteType: n.noteType === 'list' ? 'list' : 'text',
    items: Array.isArray(n.items) ? n.items : [],
    labels: Array.isArray(n.labels) ? n.labels : [],
    pinned: !!n.pinned,
    archived: !!n.archived,
    trashed: !!n.trashed,
    reminderAt: n.reminderAt || null,
    imageUrl: n.imageUrl || '',
  };
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function newItem(text = '') {
  return { id: `i_${Date.now()}_${Math.floor(Math.random() * 1000)}`, text, done: false };
}

export default function StickyNotes({ currentUser, showToast }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('notes');
  const [query, setQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const saveTimerRef = useRef({});
  const topZRef = useRef(1);
  const remindedRef = useRef(new Set());

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api('listStickyNotes', { userId: currentUser.id });
      const list = (Array.isArray(rows) ? rows : []).map(normalizeNote);
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
        const row = await api('updateStickyNote', { id, userId: currentUser.id, ...patch });
        if (row) setNotes((prev) => prev.map((n) => (n.id === id ? normalizeNote(row) : n)));
      } catch (err) {
        showToast(err?.message || 'บันทึกโน้ตไม่สำเร็จ');
      }
    }, 450);
  }, [currentUser.id, showToast]);

  const allLabels = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => (n.labels || []).forEach((l) => set.add(l)));
    return [...set].sort((a, b) => a.localeCompare(b, 'th'));
  }, [notes]);

  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (view === 'notes') return !n.trashed && !n.archived;
        if (view === 'reminders') return !n.trashed && !n.archived && !!n.reminderAt;
        if (view === 'archive') return !n.trashed && n.archived;
        if (view === 'trash') return n.trashed;
        return true;
      })
      .filter((n) => {
        if (!labelFilter) return true;
        return (n.labels || []).includes(labelFilter);
      })
      .filter((n) => {
        if (!q) return true;
        const hay = [
          n.title, n.body, n.emoji, ...(n.labels || []),
          ...(n.items || []).map((i) => i.text),
        ].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (a.zIndex || 0) - (b.zIndex || 0);
      });
  }, [notes, view, query, labelFilter]);

  // Browser / in-app reminders (like Keep time reminders)
  useEffect(() => {
    const timers = [];
    notes.forEach((n) => {
      if (!n.reminderAt || n.trashed || n.archived) return;
      const when = new Date(n.reminderAt).getTime();
      if (Number.isNaN(when)) return;
      const delay = when - Date.now();
      if (delay < -60000) return;
      if (remindedRef.current.has(`${n.id}:${n.reminderAt}`)) return;
      const fire = () => {
        remindedRef.current.add(`${n.id}:${n.reminderAt}`);
        const msg = `⏰ เตือน: ${n.title || 'โน้ต'}`;
        showToast(msg, 6000);
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('GovTaskPro · เตือนความจำ', { body: n.title || n.body || 'ถึงเวลาเตือนแล้ว' });
          }
        } catch (_) { /* ignore */ }
      };
      if (delay <= 0) fire();
      else if (delay < 7 * 86400000) timers.push(setTimeout(fire, delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [notes, showToast]);

  const bringToFront = (id) => {
    topZRef.current += 1;
    const zIndex = topZRef.current;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, zIndex } : n)));
    queueSave(id, { zIndex });
    setSelectedId(id);
  };

  const handleAdd = async (noteType = 'text') => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('createStickyNote', {
        userId: currentUser.id,
        title: noteType === 'list' ? 'รายการ' : 'โน้ตใหม่',
        body: '',
        noteType,
        items: noteType === 'list' ? [newItem(''), newItem('')] : [],
        color: COLORS[notes.length % COLORS.length].id,
        emoji: noteType === 'list' ? '✅' : '📌',
      });
      setNotes((prev) => [...prev, normalizeNote(row)]);
      topZRef.current = Math.max(topZRef.current, row.zIndex || 1);
      setSelectedId(row.id);
      setView('notes');
      showToast(noteType === 'list' ? 'เพิ่มรายการแล้ว' : 'เพิ่มโน้ตแล้ว');
    } catch (err) {
      showToast(err?.message || 'เพิ่มโน้ตไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (busy) return;
    const note = notes.find((n) => n.id === id);
    const permanent = !!note?.trashed;
    if (!window.confirm(permanent ? 'ลบถาวรโน้ตนี้?' : 'ย้ายโน้ตไปถังขยะ?')) return;
    setBusy(true);
    try {
      await api('deleteStickyNote', { id, userId: currentUser.id, permanent });
      if (permanent) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        showToast('ลบถาวรแล้ว');
      } else {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, trashed: true, archived: false } : n)));
        showToast('ย้ายไปถังขยะแล้ว');
      }
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      showToast(err?.message || 'ลบโน้ตไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (busy) return;
    if (!window.confirm('ล้างถังขยะทั้งหมด?')) return;
    setBusy(true);
    try {
      const res = await api('emptyStickyTrash', { userId: currentUser.id });
      setNotes((prev) => prev.filter((n) => !n.trashed));
      showToast(`ล้างถังขยะแล้ว (${res?.removed || 0})`);
    } catch (err) {
      showToast(err?.message || 'ล้างถังขยะไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (id) => {
    if (busy) return;
    setBusy(true);
    try {
      const row = await api('duplicateStickyNote', { id, userId: currentUser.id });
      setNotes((prev) => [...prev, normalizeNote(row)]);
      setSelectedId(row.id);
      setView('notes');
      showToast('ทำสำเนาแล้ว');
    } catch (err) {
      showToast(err?.message || 'ทำสำเนาไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const patchNote = (id, patch, { persist = true } = {}) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? normalizeNote({ ...n, ...patch }) : n)));
    if (persist) queueSave(id, patch);
  };

  const convertToList = (note) => {
    if (note.noteType === 'list') return;
    const lines = String(note.body || '')
      .split(/\r?\n/)
      .map((l) => l.replace(/^[\-\*\u2022]\s*/, '').trim())
      .filter(Boolean);
    const items = (lines.length ? lines : ['']).map((t) => newItem(t));
    patchNote(note.id, { noteType: 'list', items, body: '' });
  };

  const convertToText = (note) => {
    if (note.noteType !== 'list') return;
    const body = (note.items || []).map((i) => `${i.done ? '☑' : '☐'} ${i.text || ''}`).join('\n');
    patchNote(note.id, { noteType: 'text', body, items: [] });
  };

  const onPointerDown = (e, note) => {
    if (e.button !== 0 || note.trashed) return;
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

  const enableBrowserNotify = async () => {
    try {
      if (typeof Notification === 'undefined') {
        showToast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
        return;
      }
      const perm = await Notification.requestPermission();
      showToast(perm === 'granted' ? 'เปิดแจ้งเตือนเบราว์เซอร์แล้ว' : 'ยังไม่ได้อนุญาตการแจ้งเตือน');
    } catch (_) {
      showToast('เปิดแจ้งเตือนไม่สำเร็จ');
    }
  };

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
      <div className="shrink-0 px-4 py-3 space-y-3 border-b border-amber-900/30 bg-gradient-to-r from-[#4a3423] via-[#5c4030] to-[#3d2b1f]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-200 border border-amber-300/20">
              <StickyNote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-amber-50 tracking-tight truncate">เตือนความจำ</h2>
              <p className="text-[11px] text-amber-200/70 font-medium flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> ส่วนตัวแบบ Google Keep · โน้ต · รายการ · เตือน · ป้าย · คลัง · ถังขยะ
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAdd('text')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-lg shadow-black/20 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              โน้ต
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAdd('list')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-amber-50 font-bold text-xs border border-amber-200/20 disabled:opacity-60"
            >
              <ListChecks className="w-3.5 h-3.5" />
              รายการ
            </button>
            <button
              type="button"
              onClick={enableBrowserNotify}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-100/80 font-bold text-xs border border-amber-200/10"
              title="อนุญาตแจ้งเตือนเบราว์เซอร์"
            >
              <AlarmClock className="w-3.5 h-3.5" />
              แจ้งเตือน
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-200/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาโน้ต ป้ายกำกับ รายการ..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/20 border border-amber-200/15 text-amber-50 text-xs font-medium placeholder:text-amber-200/40 outline-none focus:border-amber-300/40"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    active ? 'bg-amber-400 text-amber-950' : 'bg-white/5 text-amber-100/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>
          {view === 'trash' && (
            <button
              type="button"
              disabled={busy || !notes.some((n) => n.trashed)}
              onClick={handleEmptyTrash}
              className="ml-auto text-[11px] font-bold text-rose-200 hover:text-rose-100 disabled:opacity-40"
            >
              ล้างถังขยะ
            </button>
          )}
        </div>

        {allLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-200/50" />
            <button
              type="button"
              onClick={() => setLabelFilter('')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${!labelFilter ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-amber-100'}`}
            >
              ทั้งหมด
            </button>
            {allLabels.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLabelFilter((prev) => (prev === l ? '' : l))}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${labelFilter === l ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-amber-100'}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={boardRef}
        className="relative flex-1 overflow-auto cork-board custom-scrollbar"
        onPointerMove={onPointerMove}
      >
        <div
          className="relative min-h-full min-w-full"
          style={{ height: Math.max(720, ...visibleNotes.map((n) => n.y + n.height + 80)), width: '100%' }}
        >
          {visibleNotes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-200/90 shadow-xl rotate-[-6deg] flex items-center justify-center mb-5 border border-amber-300">
                <StickyNote className="w-9 h-9 text-amber-800" />
              </div>
              <p className="text-amber-100 font-bold text-base mb-1">
                {view === 'trash' ? 'ถังขยะว่าง' : view === 'archive' ? 'ยังไม่มีโน้ตในคลัง' : view === 'reminders' ? 'ยังไม่มีการเตือน' : 'ยังไม่มีโน้ต'}
              </p>
              <p className="text-amber-200/60 text-sm max-w-sm">
                {view === 'notes'
                  ? 'สร้างโน้ตหรือรายการ · ตั้งเตือน · ติดป้าย · ปักหมุด — คนอื่นในระบบจะไม่เห็น'
                  : 'สลับมุมมองด้านบนเพื่อดูโน้ตในหมวดอื่น'}
              </p>
            </div>
          )}

          {visibleNotes.map((note) => {
            const meta = colorMeta(note.color);
            const selected = selectedId === note.id;
            const rot = note.pinned ? 0 : hashRotate(note.id);
            const overdue = note.reminderAt && new Date(note.reminderAt).getTime() < Date.now();
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
                  zIndex: note.zIndex + (note.pinned ? 1000 : 0),
                  background: meta.bg,
                  color: meta.ink,
                  transform: `rotate(${rot}deg)`,
                  opacity: note.trashed ? 0.72 : 1,
                  boxShadow: selected
                    ? '0 18px 40px rgba(0,0,0,0.28), 0 0 0 2px rgba(255,255,255,0.55)'
                    : '0 10px 24px rgba(0,0,0,0.22)',
                }}
              >
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 rounded-sm shadow-sm"
                  style={{ background: meta.tape, transform: `rotate(${rot * -0.4}deg)` }}
                />
                {note.pinned && (
                  <div className="absolute top-2 right-2 text-[10px] font-black opacity-70">📌</div>
                )}
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
                      disabled={note.trashed}
                    />
                  </div>

                  {note.imageUrl ? (
                    <div className="mb-1.5 rounded-lg overflow-hidden border border-black/10" data-no-drag>
                      <img src={note.imageUrl} alt="" className="w-full max-h-24 object-cover" />
                    </div>
                  ) : null}

                  {note.noteType === 'list' ? (
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5" data-no-drag>
                      {(note.items || []).map((item, idx) => (
                        <div key={item.id || idx} className="flex items-start gap-1.5">
                          <input
                            type="checkbox"
                            checked={!!item.done}
                            disabled={note.trashed}
                            onChange={() => {
                              const items = note.items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
                              patchNote(note.id, { items });
                            }}
                            className="mt-1 accent-teal-700"
                          />
                          <input
                            value={item.text}
                            disabled={note.trashed}
                            onChange={(e) => {
                              const items = note.items.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it));
                              patchNote(note.id, { items });
                            }}
                            className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-[12px] font-medium ${item.done ? 'line-through opacity-50' : ''}`}
                            placeholder="รายการ..."
                            style={{ color: meta.ink }}
                          />
                          {!note.trashed && (
                            <button
                              type="button"
                              className="opacity-40 hover:opacity-90 text-[11px] font-bold"
                              onClick={() => patchNote(note.id, { items: note.items.filter((_, i) => i !== idx) })}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {!note.trashed && (
                        <button
                          type="button"
                          className="text-[11px] font-bold opacity-60 hover:opacity-100 mt-1"
                          onClick={() => patchNote(note.id, { items: [...(note.items || []), newItem('')] })}
                        >
                          + เพิ่มรายการ
                        </button>
                      )}
                    </div>
                  ) : (
                    <textarea
                      data-no-drag
                      value={note.body}
                      disabled={note.trashed}
                      onChange={(e) => patchNote(note.id, { body: e.target.value })}
                      className="flex-1 w-full resize-none bg-transparent border-0 outline-none text-[13px] leading-relaxed font-medium placeholder:opacity-35 custom-scrollbar"
                      placeholder="เขียนเตือนความจำ..."
                      style={{ color: meta.ink }}
                    />
                  )}

                  {(note.labels?.length > 0 || note.reminderAt) && (
                    <div className="flex flex-wrap gap-1 mt-1" data-no-drag>
                      {note.reminderAt && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${overdue ? 'bg-rose-500/20 text-rose-800' : 'bg-black/10'}`}>
                          ⏰ {new Date(note.reminderAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                      {(note.labels || []).map((l) => (
                        <span key={l} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/10">
                          {l}
                        </span>
                      ))}
                    </div>
                  )}

                  {selected && (
                    <div className="mt-2 pt-2 border-t border-black/10 space-y-1.5" data-no-drag>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          title={note.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
                          disabled={note.trashed}
                          onClick={() => patchNote(note.id, { pinned: !note.pinned })}
                          className="p-1 rounded-md hover:bg-black/10 disabled:opacity-40"
                        >
                          {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          title={note.noteType === 'list' ? 'เปลี่ยนเป็นข้อความ' : 'เปลี่ยนเป็นรายการ'}
                          disabled={note.trashed}
                          onClick={() => (note.noteType === 'list' ? convertToText(note) : convertToList(note))}
                          className="p-1 rounded-md hover:bg-black/10 disabled:opacity-40"
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="ทำสำเนา"
                          disabled={note.trashed}
                          onClick={() => handleDuplicate(note.id)}
                          className="p-1 rounded-md hover:bg-black/10 disabled:opacity-40"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {note.trashed ? (
                          <button
                            type="button"
                            title="กู้คืน"
                            onClick={() => patchNote(note.id, { trashed: false, archived: false })}
                            className="p-1 rounded-md hover:bg-black/10"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title={note.archived ? 'นำออกจากคลัง' : 'เก็บเข้าคลัง'}
                            onClick={() => patchNote(note.id, { archived: !note.archived })}
                            className="p-1 rounded-md hover:bg-black/10"
                          >
                            {note.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          title={note.trashed ? 'ลบถาวร' : 'ย้ายไปถังขยะ'}
                          onClick={() => handleDelete(note.id)}
                          className="p-1 rounded-md hover:bg-black/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 opacity-50" />
                        {COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            title={c.label}
                            disabled={note.trashed}
                            onClick={() => patchNote(note.id, { color: c.id })}
                            className={`w-4 h-4 rounded-full border-2 transition ${note.color === c.id ? 'border-slate-800 scale-110' : 'border-white/70'} disabled:opacity-40`}
                            style={{ background: c.bg }}
                          />
                        ))}
                        <span className="mx-0.5 w-px h-4 bg-black/15" />
                        {SIZE_PRESETS.map((s) => {
                          const active = note.width === s.width && note.height === s.height;
                          const Icon = s.id === 'sm' ? Minimize2 : Maximize2;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              title={s.label}
                              disabled={note.trashed}
                              onClick={() => patchNote(note.id, { width: s.width, height: s.height })}
                              className={`px-1 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 disabled:opacity-40 ${active ? 'bg-black/15' : 'hover:bg-black/10'}`}
                            >
                              <Icon className="w-3 h-3" />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {note.reminderAt ? <Bell className="w-3 h-3 opacity-60" /> : <BellOff className="w-3 h-3 opacity-40" />}
                        <input
                          type="datetime-local"
                          disabled={note.trashed}
                          value={toDatetimeLocal(note.reminderAt)}
                          onChange={(e) => patchNote(note.id, { reminderAt: fromDatetimeLocal(e.target.value) })}
                          className="bg-black/5 rounded-md px-1.5 py-0.5 outline-none font-bold disabled:opacity-40"
                          style={{ color: meta.ink }}
                        />
                        {note.reminderAt && !note.trashed && (
                          <button type="button" className="font-bold opacity-60 hover:opacity-100" onClick={() => patchNote(note.id, { reminderAt: null })}>
                            ล้าง
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 opacity-50" />
                        <input
                          data-no-drag
                          disabled={note.trashed}
                          defaultValue={(note.labels || []).join(', ')}
                          key={`labels-${note.id}-${(note.labels || []).join('|')}`}
                          onBlur={(e) => {
                            const labels = e.target.value
                              .split(/[,|]/)
                              .map((x) => x.trim())
                              .filter(Boolean);
                            patchNote(note.id, { labels });
                          }}
                          placeholder="ป้ายกำกับ คั่นด้วย ,"
                          className="flex-1 min-w-0 bg-black/5 rounded-md px-1.5 py-0.5 text-[10px] font-bold outline-none disabled:opacity-40"
                          style={{ color: meta.ink }}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 opacity-50" />
                        <input
                          data-no-drag
                          disabled={note.trashed}
                          defaultValue={note.imageUrl || ''}
                          key={`img-${note.id}-${note.imageUrl || ''}`}
                          onBlur={(e) => patchNote(note.id, { imageUrl: e.target.value.trim() })}
                          placeholder="ลิงก์รูปภาพ (URL)"
                          className="flex-1 min-w-0 bg-black/5 rounded-md px-1.5 py-0.5 text-[10px] font-bold outline-none disabled:opacity-40"
                          style={{ color: meta.ink }}
                        />
                      </div>
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
