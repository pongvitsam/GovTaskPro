import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Plus, KeyRound, Loader2, UserX, UserCheck, Shield,
  Building2, Eye, EyeOff, Save, Trash2, RefreshCw
} from 'lucide-react';

const ROLES = [
  { id: 'Staff', label: 'พนักงาน' },
  { id: 'Head', label: 'หัวหน้าแผนก' },
  { id: 'Admin', label: 'แอดมินระบบ' },
];

function roleBadge(role) {
  if (role === 'Admin') return 'bg-amber-50 text-amber-700';
  if (role === 'Head') return 'bg-sky-50 text-sky-700';
  return 'bg-emerald-50 text-emerald-700';
}

export default function AdminUsers({
  users,
  orgUnits,
  currentUser,
  busy,
  onLoadUsers,
  onCreate,
  onUpdateUser,
  onToggleActive,
  onCreateOrg,
  onDeleteOrg,
  onSeedDemo,
  showToast,
}) {
  const [tab, setTab] = useState('rights');
  const [adminList, setAdminList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showPasswords, setShowPasswords] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [filterDept, setFilterDept] = useState('all');

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'Staff',
    department: '',
    division: '',
  });

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [divName, setDivName] = useState('');
  const [divParent, setDivParent] = useState('');

  const departments = useMemo(
    () => (orgUnits || []).filter((o) => o.type === 'department').map((o) => o.name).sort(),
    [orgUnits]
  );
  const divisions = useMemo(
    () => (orgUnits || []).filter((o) => o.type === 'division'),
    [orgUnits]
  );
  const divisionsForDept = useMemo(
    () => divisions.filter((d) => !form.department || d.parent === form.department || !d.parent),
    [divisions, form.department]
  );

  const sorted = useMemo(
    () => [...(adminList.length ? adminList : users || [])]
      .sort((a, b) => {
        const da = String(a.department || '').localeCompare(String(b.department || ''), 'th');
        if (da !== 0) return da;
        return String(a.role).localeCompare(String(b.role)) || String(a.name).localeCompare(String(b.name), 'th');
      }),
    [adminList, users]
  );

  const filtered = useMemo(() => {
    if (filterDept === 'all') return sorted;
    if (filterDept === 'SYSTEM') {
      return sorted.filter((u) => u.role === 'Admin' || String(u.department || '') === 'SYSTEM');
    }
    return sorted.filter((u) => String(u.department || '') === filterDept);
  }, [sorted, filterDept]);

  const byDepartment = useMemo(() => {
    const map = new Map();
    filtered.forEach((u) => {
      const key = u.role === 'Admin' ? 'SYSTEM (แอดมิน)' : (u.department || 'ยังไม่ระบุแผนก');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    });
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    if (!form.department && departments.length) {
      setForm((prev) => ({ ...prev, department: departments.includes('IT') ? 'IT' : departments[0] }));
    }
  }, [departments, form.department]);

  useEffect(() => {
    if (!divParent && departments.length) {
      setDivParent(departments.includes('IT') ? 'IT' : departments[0]);
    }
  }, [departments, divParent]);

  const refreshAdminList = async () => {
    if (!onLoadUsers) return;
    setLoadingList(true);
    try {
      const list = await onLoadUsers({ adminId: currentUser.id });
      setAdminList(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast('❌ ' + (err?.message || String(err)));
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    refreshAdminList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditDraft({
      name: u.name || '',
      username: u.username || '',
      password: u.password || '',
      role: u.role || 'Staff',
      department: u.department || '',
      division: u.division || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editDraft || !editingId) return;
    if (!editDraft.username.trim()) {
      showToast('❌ ต้องตั้ง Username สำหรับเข้าแผนก');
      return;
    }
    if (!editDraft.department.trim() && editDraft.role !== 'Admin') {
      showToast('❌ ต้องระบุว่าคนนี้อยู่แผนกอะไร');
      return;
    }
    const row = await onUpdateUser({
      adminId: currentUser.id,
      userId: editingId,
      name: editDraft.name.trim(),
      username: editDraft.username.trim(),
      password: editDraft.password,
      role: editDraft.role,
      department: editDraft.department.trim() || (editDraft.role === 'Admin' ? 'SYSTEM' : ''),
      division: editDraft.division.trim(),
    });
    if (row) {
      setAdminList((prev) => {
        const next = prev.length ? prev : sorted;
        return next.map((u) => (String(u.id) === String(row.id) ? { ...u, ...row } : u));
      });
      showToast('✅ บันทึกสิทธิ์แผนกแล้ว');
    }
    cancelEdit();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password || !form.name.trim()) {
      showToast('❌ กรอก Username, รหัสผ่าน และชื่อแสดง');
      return;
    }
    if (!form.department.trim() && form.role !== 'Admin') {
      showToast('❌ ต้องเลือกแผนกของคนนี้');
      return;
    }
    const row = await onCreate({
      adminId: currentUser.id,
      username: form.username.trim(),
      password: form.password,
      name: form.name.trim(),
      role: form.role,
      department: form.department.trim() || (form.role === 'Admin' ? 'SYSTEM' : ''),
      division: form.division.trim(),
    });
    if (row) {
      setAdminList((prev) => {
        const base = prev.length ? prev : sorted;
        const without = base.filter((u) => String(u.id) !== String(row.id));
        return [...without, row];
      });
      showToast('✅ สร้างบัญชีและผูกแผนกแล้ว');
    }
    setForm({
      username: '',
      password: '',
      name: '',
      role: 'Staff',
      department: form.department,
      division: '',
    });
    await refreshAdminList();
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) {
      showToast('❌ กรอกชื่อแผนก');
      return;
    }
    await onCreateOrg({
      adminId: currentUser.id,
      type: 'department',
      name: deptName.trim(),
      code: (deptCode.trim() || deptName.trim()).replace(/\s+/g, '').toUpperCase(),
    });
    setDeptName('');
    setDeptCode('');
  };

  const handleCreateDiv = async (e) => {
    e.preventDefault();
    if (!divName.trim() || !divParent) {
      showToast('❌ กรอกชื่อกองและเลือกแผนก');
      return;
    }
    await onCreateOrg({
      adminId: currentUser.id,
      type: 'division',
      name: divName.trim(),
      parent: divParent,
    });
    setDivName('');
  };

  const renderUserRow = (u) => {
    const isEdit = editingId === u.id;
    const draft = isEdit ? editDraft : null;
    return (
      <tr key={u.id} className={u.active === false ? 'opacity-50 bg-[#f8fafb]' : ''}>
        <td className="px-4 py-3 align-top">
          {isEdit ? (
            <input value={draft.name} onChange={(e) => setEditDraft({ ...draft, name: e.target.value })} className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-bold outline-none focus:border-teal-400" placeholder="ชื่อที่แสดง" />
          ) : (
            <p className="font-extrabold text-[#1e3a4c]">{u.name}</p>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          {isEdit ? (
            <input value={draft.username} onChange={(e) => setEditDraft({ ...draft, username: e.target.value })} className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-bold outline-none focus:border-teal-400" placeholder="username เข้าแผนก" />
          ) : (
            <p className="font-mono font-bold text-teal-700">@{u.username || '—'}</p>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          {isEdit ? (
            <input
              type="text"
              value={draft.password}
              onChange={(e) => setEditDraft({ ...draft, password: e.target.value })}
              className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-mono font-bold outline-none focus:border-teal-400"
            />
          ) : (
            <span className="font-mono font-bold text-[#1e3a4c] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              {showPasswords ? (u.password || '—') : '••••••••'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          {isEdit ? (
            <select value={draft.role} onChange={(e) => setEditDraft({ ...draft, role: e.target.value })} className="border border-slate-100 rounded-xl px-2.5 py-1.5 font-bold outline-none bg-white">
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          ) : (
            <span className={`text-[10px] font-black px-2 py-1 rounded-full inline-flex items-center gap-1 ${roleBadge(u.role)}`}>
              {u.role === 'Admin' && <Shield className="w-3 h-3" />}
              {ROLES.find((r) => r.id === u.role)?.label || u.role}
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          {isEdit ? (
            <div className="space-y-2 min-w-[150px]">
              <select
                value={draft.department}
                onChange={(e) => setEditDraft({ ...draft, department: e.target.value, division: '' })}
                className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-bold outline-none bg-white"
              >
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                {draft.department && !departments.includes(draft.department) && (
                  <option value={draft.department}>{draft.department}</option>
                )}
              </select>
              <select
                value={draft.division}
                onChange={(e) => setEditDraft({ ...draft, division: e.target.value })}
                className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-medium outline-none bg-white"
              >
                <option value="">— ไม่ระบุกอง —</option>
                {divisions
                  .filter((d) => !draft.department || d.parent === draft.department || !d.parent)
                  .map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-[12px] font-bold text-[#5b7a8a]">
              {u.department || '—'}
              {u.division ? <span className="block font-medium text-[#8aa3b0]">{u.division}</span> : null}
            </p>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-wrap justify-end gap-2">
            {isEdit ? (
              <>
                <button type="button" disabled={busy} onClick={saveEdit} className="text-xs font-bold px-3 py-2 rounded-xl bg-teal-500 text-white flex items-center gap-1 disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> บันทึก
                </button>
                <button type="button" disabled={busy} onClick={cancelEdit} className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-100">ยกเลิก</button>
              </>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={() => startEdit(u)} className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-100 hover:bg-[#f3f9fc]">
                  ตั้งแผนก / แก้ไข
                </button>
                {u.id !== currentUser.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const row = await onToggleActive({
                        adminId: currentUser.id,
                        userId: u.id,
                        active: u.active === false,
                      });
                      if (row) {
                        setAdminList((prev) => (prev.length ? prev : sorted).map((x) => (String(x.id) === String(row.id) ? { ...x, ...row } : x)));
                      }
                    }}
                    className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-100 hover:bg-[#f3f9fc] disabled:opacity-50 flex items-center gap-1"
                  >
                    {u.active === false ? <><UserCheck className="w-3.5 h-3.5" /> เปิดใช้</> : <><UserX className="w-3.5 h-3.5" /> ปิดใช้</>}
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full gtp-fade-in">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c] flex items-center">
              <Users className="w-7 h-7 mr-3 text-teal-500" /> สิทธิ์แยกตามแผนก
            </h2>
            <p className="text-[#5b7a8a] text-sm mt-1 font-medium">
              ตั้งแผนกของแต่ละคน · รหัสแผนกใช้เข้าสู่ระบบ · แอดมินเท่านั้นที่ใช้ username + รหัสผ่าน
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {onSeedDemo && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm('โหลดข้อมูลตัวอย่างครบทุกฟังก์ชัน?\n(เพิ่มแผนก HR/Finance, โปรเจกต์, งานทุกสถานะ, โน้ต — ไม่ลบข้อมูลเดิมที่มี id ซ้ำ)')) return;
                  await onSeedDemo();
                  await refreshAdminList();
                }}
                className="text-xs font-extrabold px-3.5 py-2.5 rounded-2xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 disabled:opacity-50"
              >
                โหลดข้อมูลตัวอย่าง (Demo)
              </button>
            )}
            <div className="flex bg-[#e8f2f6] p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setTab('rights')}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${tab === 'rights' ? 'bg-white text-teal-700 shadow-sm' : 'text-[#5b7a8a]'}`}
            >
              คน & สิทธิ์แผนก
            </button>
            <button
              type="button"
              onClick={() => setTab('org')}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${tab === 'org' ? 'bg-white text-teal-700 shadow-sm' : 'text-[#5b7a8a]'}`}
            >
              จัดการแผนก & กอง
            </button>
            </div>
          </div>
        </div>

        {tab === 'rights' && (
          <>
            <form onSubmit={handleCreate} className="gtp-card p-6 space-y-4">
              <h3 className="gtp-display font-extrabold text-[#1e3a4c] flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-500" /> เพิ่มคนเข้าแผนก
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">1) แผนกของคนนี้ *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value, division: '' })}
                    disabled={busy}
                    className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none bg-white"
                  >
                    {departments.length === 0 && <option value="IT">IT</option>}
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <p className="text-[11px] text-[#8aa3b0] font-medium mt-1">สิทธิ์งานจะเห็นเฉพาะแผนกนี้ (ยกเว้นแอดมิน)</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">2) รหัสอ้างอิงผู้ใช้ (Username)</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    disabled={busy}
                    className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400"
                    placeholder="เช่น somchai"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-[#8aa3b0] font-medium mt-1">พนักงานล็อกอินด้วยรหัสแผนกแล้วเลือกชื่อ — Username สำคัญกับแอดมิน</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">3) บทบาทในแผนก</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none bg-white">
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">รหัสผ่านเริ่มต้น *</label>
                  <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" placeholder="ตั้งให้ผู้ใช้" autoComplete="new-password" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อที่แสดง *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-medium outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">กอง / หน่วยงาน (ถ้ามี)</label>
                  <select
                    value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value })}
                    disabled={busy}
                    className="w-full border border-slate-100 rounded-2xl p-3 font-medium outline-none bg-white"
                  >
                    <option value="">— ไม่ระบุ —</option>
                    {divisionsForDept.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}{d.parent ? ` (${d.parent})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={busy} className="gtp-btn-primary px-5 py-2.5 text-sm flex items-center disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                สร้างบัญชีและผูกแผนก
              </button>
            </form>

            <div className="gtp-card overflow-hidden">
              <div className="px-5 py-4 bg-[#f3f9fc] border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="gtp-display font-extrabold text-[#1e3a4c] text-sm flex items-center gap-2">
                    รายชื่อตามแผนก ({filtered.length})
                    {loadingList && <Loader2 className="w-4 h-4 animate-spin text-teal-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowPasswords((v) => !v)} className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-100 bg-white text-[#5b7a8a] flex items-center gap-1.5">
                      {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPasswords ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                    </button>
                    <button type="button" disabled={busy || loadingList} onClick={refreshAdminList} className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-100 bg-white text-[#5b7a8a] flex items-center gap-1.5 disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} /> รีเฟรช
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterDept('all')}
                    className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${filterDept === 'all' ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-[#5b7a8a] border-slate-100'}`}
                  >
                    ทุกแผนก
                  </button>
                  {departments.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFilterDept(d)}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${filterDept === d ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-[#5b7a8a] border-slate-100'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[920px]">
                  <thead>
                    <tr className="text-left text-[11px] font-bold text-[#5b7a8a] bg-white border-b border-slate-100">
                      <th className="px-4 py-3">ชื่อ</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">รหัสผ่าน</th>
                      <th className="px-4 py-3">บทบาท</th>
                      <th className="px-4 py-3">แผนก / กอง</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byDepartment.map(([deptLabel, rows]) => (
                      <React.Fragment key={deptLabel}>
                        <tr className="bg-[#eef6f9]">
                          <td colSpan={6} className="px-4 py-2.5">
                            <span className="text-xs font-extrabold text-[#1e3a4c] inline-flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-teal-500" />
                              {deptLabel}
                              <span className="text-[#8aa3b0] font-bold">({rows.length} คน)</span>
                            </span>
                          </td>
                        </tr>
                        {rows.map(renderUserRow)}
                      </React.Fragment>
                    ))}
                    {!filtered.length && !loadingList && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-[#8aa3b0]">
                          ยังไม่มีผู้ใช้ในแผนกนี้ — เพิ่มคนด้านบน
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'org' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleCreateDept} className="gtp-card p-6 space-y-4">
              <h3 className="gtp-display font-extrabold text-[#1e3a4c] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-500" /> เพิ่มแผนก
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อแผนก</label>
                <input
                  value={deptName}
                  onChange={(e) => {
                    setDeptName(e.target.value);
                    if (!deptCode) setDeptCode(e.target.value.replace(/\s+/g, '').toUpperCase());
                  }}
                  disabled={busy}
                  placeholder="เช่น HR, Finance"
                  className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">รหัสอ้างอิงแผนก</label>
                <input
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  disabled={busy}
                  placeholder="เช่น HR"
                  className="w-full border border-slate-100 rounded-2xl p-3 font-mono font-bold outline-none focus:border-teal-400"
                />
                <p className="text-[11px] text-[#8aa3b0] font-medium mt-1">รหัสนี้ใช้ตอนล็อกอินพนักงาน (กรอกรหัสแผนกแล้วเลือกชื่อ)</p>
              </div>
              <button type="submit" disabled={busy} className="gtp-btn-primary px-5 py-2.5 text-sm flex items-center disabled:opacity-60">
                <Plus className="w-4 h-4 mr-2" /> เพิ่มแผนก
              </button>
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold text-[#5b7a8a]">แผนกทั้งหมด ({departments.length})</p>
                {(orgUnits || []).filter((o) => o.type === 'department').map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-[#f3f9fc]">
                    <div>
                      <span className="font-extrabold text-[#1e3a4c] text-sm block">{o.name}</span>
                      <span className="text-[11px] font-mono font-bold text-teal-700">รหัส: {o.code || o.name}</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDeleteOrg({ adminId: currentUser.id, id: o.id })}
                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบ
                    </button>
                  </div>
                ))}
              </div>
            </form>

            <form onSubmit={handleCreateDiv} className="gtp-card p-6 space-y-4">
              <h3 className="gtp-display font-extrabold text-[#1e3a4c] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-500" /> เพิ่มกอง / หน่วยงาน
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">อยู่ภายใต้แผนก</label>
                <select value={divParent} onChange={(e) => setDivParent(e.target.value)} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none bg-white">
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <input
                value={divName}
                onChange={(e) => setDivName(e.target.value)}
                disabled={busy}
                placeholder="เช่น กองเทคโนโลยี"
                className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400"
              />
              <button type="submit" disabled={busy} className="gtp-btn-primary px-5 py-2.5 text-sm flex items-center disabled:opacity-60">
                <Plus className="w-4 h-4 mr-2" /> เพิ่มกอง
              </button>
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold text-[#5b7a8a]">กองทั้งหมด ({divisions.length})</p>
                {divisions.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-[#f3f9fc]">
                    <div>
                      <span className="font-extrabold text-[#1e3a4c] text-sm block">{o.name}</span>
                      <span className="text-[11px] font-bold text-[#8aa3b0]">แผนก {o.parent || '—'}</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDeleteOrg({ adminId: currentUser.id, id: o.id })}
                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบ
                    </button>
                  </div>
                ))}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
