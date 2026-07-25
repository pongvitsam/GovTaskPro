/** Call Apps Script from GitHub Pages via hidden form POST + window.top postMessage */

import { GAS_EXEC_URL, PAGES_URL } from './config';

const CALL_TIMEOUT_MS = 45000;

function isGasMessageOrigin(origin) {
  return (
    !!origin &&
    (origin.includes('script.google.com') ||
      origin.includes('googleusercontent.com'))
  );
}

function replyOrigin() {
  if (typeof location === 'undefined') return PAGES_URL;
  // postMessage targetOrigin must be exact; use page origin (e.g. https://pongvitsam.github.io)
  return location.origin;
}

/**
 * @param {string} fnName
 * @param {unknown} [payload]
 */
export function httpRun(fnName, payload) {
  return new Promise((resolve, reject) => {
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const hasPayload = payload !== undefined;

    const iframe = document.createElement('iframe');
    iframe.name = `gtp_frame_${id}`;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(iframe);

    let settled = false;
    const cleanup = () => {
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      try {
        form.remove();
      } catch (e) { /* ignore */ }
      try {
        iframe.remove();
      } catch (e) { /* ignore */ }
    };

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onMsg = (ev) => {
      if (!isGasMessageOrigin(ev.origin)) return;
      const data = ev.data;
      if (!data || data.type !== 'gtp-result' || data.id !== id) return;
      if (data.ok) finish(() => resolve(data.result));
      else finish(() => reject(new Error(data.error || 'เรียก API ไม่สำเร็จ')));
    };

    window.addEventListener('message', onMsg);

    const timer = setTimeout(() => {
      finish(() => reject(new Error('หมดเวลาเชื่อมต่อเซิร์ฟเวอร์ (45 วินาที) — ตรวจว่า Web App = Anyone')));
    }, CALL_TIMEOUT_MS);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GAS_EXEC_URL;
    form.target = iframe.name;
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';

    const fields = {
      fn: fnName,
      id,
      replyOrigin: replyOrigin(),
      hasPayload: hasPayload ? '1' : '0',
    };
    if (hasPayload) {
      fields.payload = JSON.stringify(payload);
    }

    Object.keys(fields).forEach((name) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  });
}
