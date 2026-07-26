import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Plus, KeyRound, Loader2, UserX, UserCheck, Shield,
  Building2, Eye, EyeOff, Save, Trash2, RefreshCw
} from 'lucide-react';

const ROLES = [
  { id: 'Staff', label: 'พนักงาน' },
  { id: 'Head', label: 'หัวหน้า' },
  { id: 'Admin', label: 'แอดมิน' },
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
  showToast,
}) {
  const [tab, setTab] = useState('users');
  const [adminList, setAdminList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showPasswords, setShowPasswords] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'Staff',
    department: 'IT',
    division: '',
  });

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [divName, setDivName] = useState('');
  const [divParent, setDivParent] = useState('IT');

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
      .sort((a, b) => String(a.role).localeCompare(String(b.role)) || String(a.name).localeCompare(String(b.name))),
    [adminList, users]
  );

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
    const row = await onUpdateUser({
      adminId: currentUser.id,
      userId: editingId,
      name: editDraft.name.trim(),
      username: editDraft.username.trim(),
      password: editDraft.password,
      role: editDraft.role,
      department: editDraft.department.trim(),
      division: editDraft.division.trim(),
    });
    if (row) {
      setAdminList((prev) => {
        const next = prev.length ? prev : sorted;
        return next.map((u) => (String(u.id) === String(row.id) ? { ...u, ...row } : u));
      });
    }
    cancelEdit();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password || !form.name.trim()) {
      showToast('❌ กรอกชื่อผู้ใช้ รหัสผ่าน และชื่อแสดง');
      return;
    }
    const row = await onCreate({
      adminId: currentUser.id,
      username: form.username.trim(),
      password: form.password,
      name: form.name.trim(),
      role: form.role,
      department: form.department.trim() || 'IT',
      division: form.division.trim(),
    });
    if (row) {
      setAdminList((prev) => {
        const base = prev.length ? prev : sorted;
        const without = base.filter((u) => String(u.id) !== String(row.id));
        return [...without, row];
      });
    }
    setForm({ username: '', password: '', name: '', role: 'Staff', department: form.department, division: form.division });
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

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full gtp-fade-in">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c] flex items-center">
              <Users className="w-7 h-7 mr-3 text-teal-500" /> จัดการระบบ (แอดมิน)
            </h2>
            <p className="text-[#5b7a8a] text-sm mt-1 font-medium">
              เพิ่มคน · แผนก · กอง · ดูรหัสผ่าน · กำหนดสิทธิ์แต่ละคน
            </p>
          </div>
          <div className="flex bg-[#e8f2f6] p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${tab === 'users' ? 'bg-white text-teal-700 shadow-sm' : 'text-[#5b7a8a]'}`}
            >
              ผู้ใช้ & สิทธิ์
            </button>
            <button
              type="button"
              onClick={() => setTab('org')}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all ${tab === 'org' ? 'bg-white text-teal-700 shadow-sm' : 'text-[#5b7a8a]'}`}
            >
              แผนก & กอง
            </button>
          </div>
        </div>

        {tab === 'users' && (
          <>
            <form onSubmit={handleCreate} className="gtp-card p-6 space-y-4">
              <h3 className="gtp-display font-extrabold text-[#1e3a4c] flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-500" /> เพิ่มผู้ใช้ใหม่
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Username *</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" placeholder="เช่น somchai" autoComplete="off" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">รหัสผ่านเริ่มต้น *</label>
                  <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" placeholder="ตั้งให้ผู้ใช้" autoComplete="new-password" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อที่แสดง *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-medium outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">สิทธิ์ (บทบาท)</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={busy} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none bg-white">
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">แผนก</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value, division: '' })}
                    disabled={busy}
                    className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none bg-white"
                  >
                    {departments.length === 0 && <option value="IT">IT</option>}
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">กอง / หน่วยงาน</label>
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
                สร้างบัญชี
              </button>
            </form>

            <div className="gtp-card overflow-hidden">
              <div className="px-5 py-4 bg-[#f3f9fc] border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="gtp-display font-extrabold text-[#1e3a4c] text-sm flex items-center gap-2">
                  รายชื่อผู้ใช้ทั้งหมด ({sorted.length})
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

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="text-left text-[11px] font-bold text-[#5b7a8a] bg-white border-b border-slate-100">
                      <th className="px-4 py-3">ชื่อ / Username</th>
                      <th className="px-4 py-3">รหัสผ่าน</th>
                      <th className="px-4 py-3">สิทธิ์</th>
                      <th className="px-4 py-3">แผนก / กอง</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sorted.map((u) => {
                      const isEdit = editingId === u.id;
                      const draft = isEdit ? editDraft : null;
                      return (
                        <tr key={u.id} className={u.active === false ? 'opacity-50 bg-[#f8fafb]' : ''}>
                          <td className="px-4 py-3 align-top">
                            {isEdit ? (
                              <div className="space-y-2">
                                <input value={draft.name} onChange={(e) => setEditDraft({ ...draft, name: e.target.value })} className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-bold outline-none focus:border-teal-400" />
                                <input value={draft.username} onChange={(e) => setEditDraft({ ...draft, username: e.target.value })} className="w-full border border-slate-100 rounded-xl px-2.5 py-1.5 font-bold outline-none focus:border-teal-400" />
                              </div>
                            ) : (
                              <>
                                <p className="font-extrabold text-[#1e3a4c]">{u.name}</p>
                                <p className="text-[11px] font-bold text-[#5b7a8a] mt-0.5">@{u.username || '—'}</p>
                              </>
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
                              <div className="space-y-2 min-w-[140px]">
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
                                  <option value="">— ไม่ระบุ —</option>
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
                                    แก้ไขสิทธิ์
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
                    })}
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
                <label className="text-xs font-bold text-slate-500 mb-1 block">รหัสแผนก (สำหรับล็อกอิน)</label>
                <input
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  disabled={busy}
                  placeholder="เช่น HR"
                  className="w-full border border-slate-100 rounded-2xl p-3 font-mono font-bold outline-none focus:border-teal-400"
                />
                <p className="text-[11px] text-[#8aa3b0] font-medium mt-1">รหัสอ้างอิงแผนก (ไม่ใช้ตอนล็อกอินแล้ว — พนักงานกรอกแค่ username)</p>
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
