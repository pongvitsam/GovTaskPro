/** Call Apps Script from GitHub Pages via JSONP (CORS-safe) + form POST fallback */

import { GAS_EXEC_URL } from './config';

const CALL_TIMEOUT_MS = 45000;
const JSONP_PAYLOAD_MAX = 1800;

function isGasMessageOrigin(origin) {
  return (
    !!origin &&
    (origin.includes('script.google.com') ||
      origin.includes('googleusercontent.com'))
  );
}

function replyOrigin() {
  if (typeof location === 'undefined') return 'https://pongvitsam.github.io';
  return location.origin;
}

function jsonpRun(fnName, payload) {
  return new Promise((resolve, reject) => {
    const cbName = `_gtp_cb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const hasPayload = payload !== undefined;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      try {
        delete window[cbName];
      } catch (e) { /* ignore */ }
      try {
        script.remove();
      } catch (e) { /* ignore */ }
    };

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    window[cbName] = (data) => {
      if (data && data.ok) finish(() => resolve(data.result));
      else finish(() => reject(new Error((data && data.error) || 'เรียก API ไม่สำเร็จ')));
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('หมดเวลาเชื่อมต่อเซิร์ฟเวอร์ (45 วินาที)')));
    }, CALL_TIMEOUT_MS);

    const params = new URLSearchParams({
      api: '1',
      fn: fnName,
      callback: cbName,
    });
    if (hasPayload) {
      params.set('hasPayload', '1');
      params.set('payload', JSON.stringify(payload));
    }

    const script = document.createElement('script');
    script.src = `${GAS_EXEC_URL}?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      finish(() => reject(new Error('โหลด API จาก Google Apps Script ไม่สำเร็จ')));
    };
    document.body.appendChild(script);
  });
}

function formPostRun(fnName, payload) {
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
      try { form.remove(); } catch (e) { /* ignore */ }
      try { iframe.remove(); } catch (e) { /* ignore */ }
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
    if (hasPayload) fields.payload = JSON.stringify(payload);

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

/**
 * @param {string} fnName
 * @param {unknown} [payload]
 */
export function httpRun(fnName, payload) {
  const size = payload === undefined ? 0 : JSON.stringify(payload).length;
  if (size <= JSONP_PAYLOAD_MAX) return jsonpRun(fnName, payload);
  return formPostRun(fnName, payload);
}
