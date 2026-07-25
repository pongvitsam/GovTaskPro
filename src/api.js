/** google.script.run (GAS embed) · HTTP form bridge (GitHub Pages) · mock (Vite DEV) */

import { httpRun } from './gasHttp';

function isGas() {
  return typeof google !== 'undefined' && google?.script?.run;
}

function gasRun(fnName, ...args) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('หมดเวลาเชื่อมต่อเซิร์ฟเวอร์ (20 วินาที) — ลองรีเฟรชหน้า หรือตรวจสิทธิ์ Sheets'));
    }, 20000);

    const runner = google.script.run
      .withSuccessHandler((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      })
      .withFailureHandler((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const msg = err && err.message ? err.message : String(err || 'เรียก API ไม่สำเร็จ');
        reject(new Error(msg));
      });

    try {
      if (args.length) runner[fnName](...args);
      else runner[fnName]();
    } catch (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    }
  });
}

export async function api(fnName, payload) {
  if (isGas()) {
    return payload === undefined ? gasRun(fnName) : gasRun(fnName, payload);
  }

  // Production GitHub Pages (and optional DEV against live GAS)
  if (import.meta.env.PROD || import.meta.env.VITE_USE_GAS === '1') {
    return httpRun(fnName, payload);
  }

  const { runLocal } = await import('./mockDb.js');
  return runLocal(fnName, payload);
}

export function isProductionGas() {
  return isGas();
}

export function isProductionHost() {
  return isGas() || (typeof location !== 'undefined' && String(location.hostname || '').endsWith('github.io'));
}
