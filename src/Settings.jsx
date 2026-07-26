import React, { useEffect, useState } from 'react';
import {
  Settings2, User, Mail, Bell, Save, Loader2, Smartphone, Info, ShieldCheck, KeyRound
} from 'lucide-react';

function boolish(v, fallback = true) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).toUpperCase();
  if (s === 'FALSE' || s === '0' || s === 'NO') return false;
  if (s === 'TRUE' || s === '1' || s === 'YES') return true;
  return fallback;
}

function roleLabel(role) {
  if (role === 'Admin') return 'แอดมินระบบ';
  if (role === 'Head') return 'หัวหน้าแผนก';
  return 'พนักงาน';
}

export default function Settings({
  currentUser,
  busy,
  onSave,
  onChangePassword,
  showToast,
  isProductionHost,
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    department: '',
    division: '',
    notifyEmail: true,
    notifyAssign: true,
    notifyStatus: true,
    notifyReview: true,
    notifyLineDefault: true,
  });
  const [dirty, setDirty] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!currentUser) return;
    setForm({
      name: currentUser.name || '',
      email: currentUser.email || '',
      department: currentUser.department || '',
      division: currentUser.division || '',
      notifyEmail: boolish(currentUser.notifyEmail, true),
      notifyAssign: boolish(currentUser.notifyAssign, true),
      notifyStatus: boolish(currentUser.notifyStatus, true),
      notifyReview: boolish(currentUser.notifyReview, currentUser.role === 'Head' || currentUser.role === 'Admin'),
      notifyLineDefault: boolish(currentUser.notifyLineDefault, true),
    });
    setDirty(false);
    setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
  }, [currentUser]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('❌ กรุณาระบุชื่อที่แสดง');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      showToast('❌ รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (form.notifyEmail && !form.email.trim()) {
      showToast('❌ กรอกอีเมลก่อนเปิดการแจ้งเตือนทางอีเมล');
      return;
    }
    await onSave({
      id: currentUser.id,
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department.trim(),
      division: form.division.trim(),
      notifyEmail: form.notifyEmail,
      notifyAssign: form.notifyAssign,
      notifyStatus: form.notifyStatus,
      notifyReview: form.notifyReview,
      notifyLineDefault: form.notifyLineDefault,
    });
    setDirty(false);
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (!pw.currentPassword || !pw.newPassword) {
      showToast('❌ กรอกรหัสผ่านปัจจุบันและรหัสใหม่');
      return;
    }
    if (pw.newPassword.length < 4) {
      showToast('❌ รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (pw.newPassword !== pw.confirmPassword) {
      showToast('❌ ยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    await onChangePassword({
      currentPassword: pw.currentPassword,
      newPassword: pw.newPassword,
    });
    setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="gtp-display text-2xl font-extrabold text-[#1e3a4c] flex items-center">
            <Settings2 className="w-7 h-7 mr-3 text-teal-500" /> ตั้งค่า
          </h2>
          <p className="text-[#5b7a8a] text-sm mt-1 font-medium">
            โปรไฟล์ รหัสผ่าน และการแจ้งเตือนสถานะงานของบัญชีนี้
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="gtp-card p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-teal-500" />
              <h3 className="gtp-display font-extrabold text-[#1e3a4c]">โปรไฟล์</h3>
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">ชื่อที่แสดง <span className="text-rose-500">*</span></label>
              <input
                required
                value={form.name}
                disabled={busy}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full border border-slate-100 rounded-2xl p-3.5 font-medium outline-none focus:border-teal-400 disabled:bg-slate-50"
                placeholder="เช่น สมชาย ใจดี"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">อีเมลสำหรับแจ้งสถานะงาน</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={form.email}
                  disabled={busy}
                  onChange={(e) => setField('email', e.target.value)}
                  className="w-full border border-slate-100 rounded-2xl pl-10 pr-3.5 py-3.5 font-medium outline-none focus:border-teal-400 disabled:bg-slate-50"
                  placeholder="name@agency.go.th"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                ใช้รับอีเมลเมื่อมีงานใหม่ / เปลี่ยนสถานะ (ส่งผ่านบัญชี Google ของเจ้าของสคริปต์)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-2">แผนก / ฝ่าย</label>
                <input
                  value={form.department}
                  disabled={busy || currentUser.role !== 'Admin'}
                  onChange={(e) => setField('department', e.target.value)}
                  className="w-full border border-slate-100 rounded-2xl p-3.5 font-bold outline-none focus:border-teal-400 disabled:bg-slate-50"
                />
                {currentUser.role !== 'Admin' && (
                  <p className="text-[11px] text-slate-400 font-medium mt-1">1 Username = 1 แผนก · เปลี่ยนได้เฉพาะแอดมิน</p>
                )}
                {currentUser.role === 'Admin' && (
                  <p className="text-[11px] text-teal-600 font-medium mt-1">แอดมินแก้ไขแผนกได้ทั้งหมด</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-2">กอง / หน่วยงาน</label>
                <input
                  value={form.division}
                  disabled={busy || currentUser.role !== 'Admin'}
                  onChange={(e) => setField('division', e.target.value)}
                  className="w-full border border-slate-100 rounded-2xl p-3.5 font-bold outline-none focus:border-teal-400 disabled:bg-slate-50"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Username: {currentUser.username || currentUser.id} · บทบาท: {roleLabel(currentUser.role)} (เปลี่ยนบทบาทได้เฉพาะแอดมิน)
            </div>
          </section>

          <section className="gtp-card p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-slate-800">การแจ้งเตือน</h3>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.notifyEmail}
                disabled={busy}
                onChange={(e) => setField('notifyEmail', e.target.checked)}
                className="mt-1 w-5 h-5 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-extrabold text-slate-800">แจ้งทางอีเมล</span>
                <span className="block text-[11px] text-slate-500 font-medium mt-0.5">ส่งอีเมลเมื่อมีเหตุการณ์ตามที่เลือกด้านล่าง</span>
              </span>
            </label>

            <div className={`grid gap-3 pl-2 ${form.notifyEmail ? '' : 'opacity-50 pointer-events-none'}`}>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.notifyAssign} disabled={busy || !form.notifyEmail} onChange={(e) => setField('notifyAssign', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                เมื่อได้รับมอบหมายงานใหม่
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.notifyStatus} disabled={busy || !form.notifyEmail} onChange={(e) => setField('notifyStatus', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                เมื่อสถานะงานของฉันเปลี่ยน
              </label>
              {(currentUser.role === 'Head' || currentUser.role === 'Admin') && (
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={form.notifyReview} disabled={busy || !form.notifyEmail} onChange={(e) => setField('notifyReview', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  เมื่อมีงานเข้าสถานะ &quot;รอตรวจ&quot;
                </label>
              )}
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={form.notifyLineDefault}
                disabled={busy}
                onChange={(e) => setField('notifyLineDefault', e.target.checked)}
                className="mt-1 w-5 h-5 accent-green-600"
              />
              <span>
                <span className="text-sm font-extrabold text-slate-800 inline-flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-green-600" /> ค่าเริ่มต้นแจ้ง LINE ตอนสร้าง/อัปเดตงาน
                </span>
                <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                  ติ๊กให้ช่อง &quot;แจ้ง LINE&quot; ในฟอร์มสร้างงานเปิดไว้เป็นค่าเริ่มต้น (ต้องตั้ง Webhook ฝั่งเซิร์ฟเวอร์)
                </span>
              </span>
            </label>
          </section>

          <section className="gtp-card bg-[#f3f9fc] p-5 text-[11px] text-slate-500 font-medium space-y-1">
            <p className="flex items-center gap-1.5 font-extrabold text-slate-600"><Info className="w-3.5 h-3.5" /> หมายเหตุ</p>
            <p>• อีเมลส่งจากบัญชี Google ของเจ้าของ Apps Script (โควต้า MailApp ของ Google)</p>
            <p>• โหมด: {isProductionHost ? 'Production (Sheets)' : 'พัฒนา local'}</p>
          </section>

          <button
            type="submit"
            disabled={busy || !dirty}
            className="w-full md:w-auto gtp-btn-primary text-white px-6 py-3.5 rounded-2xl font-extrabold flex items-center justify-center disabled:opacity-50 "
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            บันทึกการตั้งค่า
          </button>
        </form>

        {currentUser.role === 'Admin' ? (
          <form onSubmit={handlePassword} className="gtp-card p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-5 h-5 text-slate-700" />
              <h3 className="font-extrabold text-slate-800">เปลี่ยนรหัสผ่านแอดมิน</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">รหัสผ่านปัจจุบัน</label>
              <input type="password" value={pw.currentPassword} disabled={busy} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" autoComplete="current-password" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสผ่านใหม่</label>
                <input type="password" value={pw.newPassword} disabled={busy} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ยืนยันรหัสใหม่</label>
                <input type="password" value={pw.confirmPassword} disabled={busy} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} className="w-full border border-slate-100 rounded-2xl p-3 font-bold outline-none focus:border-teal-400" autoComplete="new-password" />
              </div>
            </div>
            <button type="submit" disabled={busy} className="bg-slate-800 text-white px-5 py-3 rounded-2xl font-extrabold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 inline animate-spin mr-2" /> : null}
              เปลี่ยนรหัสผ่าน
            </button>
          </form>
        ) : (
          <div className="gtp-card p-6 md:p-8 shadow-sm">
            <p className="text-sm font-bold text-[#5b7a8a]">
              พนักงาน/หัวหน้าล็อกอินด้วย Username แผนก แล้วเลือกชื่อ — ไม่ใช้รหัสผ่านรายคน
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
