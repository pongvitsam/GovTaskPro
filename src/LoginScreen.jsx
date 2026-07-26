import React, { useState } from 'react';
import {
  Briefcase, Shield, KeyRound, User, ArrowLeft, Loader2, X
} from 'lucide-react';
import { isProductionGas, isProductionHost } from './api';

/**
 * หน้าแรก: พนักงาน/หัวหน้า — กรอกแค่ username
 * มุมบนขวา: ปุ่มแอดมิน — username + รหัสผ่าน
 */
export default function LoginScreen({
  busy,
  error,
  onLoginStaff,
  onLoginAdmin,
}) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');

  const hostHint = isProductionHost()
    ? (isProductionGas() ? 'Production · Apps Script' : 'Production · GitHub Pages')
    : 'โหมดพัฒนา (local)';

  const submitStaff = async (e) => {
    e.preventDefault();
    await onLoginStaff({ username: username.trim() });
  };

  const submitAdmin = async (e) => {
    e.preventDefault();
    await onLoginAdmin({
      username: adminUser.trim(),
      password: adminPass,
    });
  };

  return (
    <div className="min-h-dvh gtp-login-bg flex items-center justify-center p-4 gtp-safe-top gtp-safe-bottom relative">
      {/* Admin entry — top right */}
      <button
        type="button"
        onClick={() => { setAdminOpen(true); }}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20 inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 backdrop-blur-md px-3.5 py-2.5 text-sm font-extrabold text-[#1e3a4c] shadow-sm hover:bg-white hover:shadow-md transition-all"
      >
        <Shield className="w-4 h-4 text-amber-600" />
        แอดมิน
      </button>

      <div className="gtp-login-card p-7 md:p-10 max-w-md w-full gtp-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-teal-400 via-cyan-500 to-sky-500 p-4 rounded-[1.35rem] shadow-xl shadow-teal-400/35">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="gtp-display text-3xl font-extrabold text-center text-[#1e3a4c] mb-1.5">
          GovTask<span className="text-teal-600">Pro</span>
        </h1>
        <p className="text-center text-[#5b7a8a] text-sm font-medium mb-1">
          กรอก Username ที่แอดมินตั้งให้สำหรับเข้าแผนกของคุณ
        </p>
        <p className="text-center text-[11px] text-teal-600 font-bold mb-8">● {hostHint}</p>

        <form onSubmit={submitStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5b7a8a] mb-1.5 tracking-wide">ชื่อผู้ใช้ (Username)</label>
            <div className="relative">
              <User className="w-4 h-4 text-teal-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy || adminOpen}
                autoFocus
                className="gtp-input gtp-input--icon"
                placeholder="เช่น somchai / boss"
                autoComplete="username"
              />
            </div>
            <p className="text-[11px] text-[#8aa3b0] font-medium mt-1.5">
              สิทธิ์งานแยกตามแผนก — แอดมินเป็นผู้ตั้งแผนกและ Username
            </p>
          </div>

          {!adminOpen && error && (
            <p className="text-sm text-rose-600 font-semibold bg-rose-50/90 border border-rose-100 rounded-2xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || adminOpen || !username.trim()}
            className="gtp-btn-primary w-full py-3.5 flex items-center justify-center gap-2"
          >
            {busy && !adminOpen ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
            เข้าสู่ระบบ
          </button>
        </form>
      </div>

      {/* Admin modal */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pt-[max(4.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            aria-label="ปิด"
            onClick={() => setAdminOpen(false)}
          />
          <div className="relative gtp-login-card p-6 md:p-8 max-w-sm w-full gtp-fade-in shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="gtp-display font-extrabold text-lg text-[#1e3a4c] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" /> ผู้ดูแลระบบ
                </p>
                <p className="text-[12px] text-[#5b7a8a] font-medium mt-1">ต้องใส่ username และรหัสผ่าน</p>
              </div>
              <button type="button" onClick={() => setAdminOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5b7a8a] mb-1.5">Username</label>
                <input
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  disabled={busy}
                  autoFocus
                  className="gtp-input"
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5b7a8a] mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    disabled={busy}
                    className="gtp-input gtp-input--icon"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-rose-600 font-semibold bg-rose-50/90 border border-rose-100 rounded-2xl px-4 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy || !adminUser.trim() || !adminPass}
                className="w-full py-3.5 rounded-[1.15rem] font-extrabold text-white bg-[#1e3a4c] hover:bg-[#163542] shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-55"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                เข้าสู่ระบบแอดมิน
              </button>

              <button type="button" onClick={() => setAdminOpen(false)} className="w-full text-sm font-bold text-[#5b7a8a] flex items-center justify-center gap-1.5 py-2">
                <ArrowLeft className="w-4 h-4" /> กลับไปเข้าใช้งานปกติ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
