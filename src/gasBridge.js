/** postMessage bridge to Apps Script (works from GitHub Pages; google.script.run only works inside GAS) */

import { GAS_EXEC_URL } from './config';

const BRIDGE_SRC = `${GAS_EXEC_URL}?bridge=1`;
const CALL_TIMEOUT_MS = 25000;

let iframeEl = null;
let readyPromise = null;
const pending = new Map();

function isAllowedBridgeOrigin(origin) {
  return (
    origin.includes('script.google.com') ||
    origin.includes('googleusercontent.com') ||
    origin.includes('script.googleusercontent.com')
  );
}

function onWindowMessage(ev) {
  if (!isAllowedBridgeOrigin(ev.origin)) return;
  const data = ev.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'gtp-ready' && readyPromise?.resolve) {
    readyPromise.resolve();
    readyPromise.resolve = null;
    return;
  }

  if (data.type === 'gtp-result' && data.id && pending.has(data.id)) {
    const { resolve, reject, timer } = pending.get(data.id);
    pending.delete(data.id);
    clearTimeout(timer);
    if (data.ok) resolve(data.result);
    else reject(new Error(data.error || 'เรียก API ไม่สำเร็จ'));
  }
}

function ensureListener() {
  if (window.__gtpBridgeListening) return;
  window.__gtpBridgeListening = true;
  window.addEventListener('message', onWindowMessage);
}

function ensureBridge() {
  ensureListener();
  if (iframeEl && readyPromise?.done) return Promise.resolve(iframeEl);

  if (!iframeEl) {
    iframeEl = document.createElement('iframe');
    iframeEl.src = BRIDGE_SRC;
    iframeEl.title = 'GovTaskPro API';
    iframeEl.setAttribute('aria-hidden', 'true');
    iframeEl.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(iframeEl);

    readyPromise = { done: false, resolve: null };
    const p = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('เชื่อมต่อ Google Apps Script ไม่สำเร็จ (bridge timeout)')), CALL_TIMEOUT_MS);
      readyPromise.resolve = () => {
        clearTimeout(timer);
        readyPromise.done = true;
        resolve(iframeEl);
      };
    });
    readyPromise.promise = p;
    return p;
  }

  return readyPromise.promise;
}

export async function bridgeRun(fnName, payload) {
  const iframe = await ensureBridge();
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('หมดเวลาเชื่อมต่อเซิร์ฟเวอร์ (25 วินาที)'));
    }, CALL_TIMEOUT_MS);

    pending.set(id, { resolve, reject, timer });

    iframe.contentWindow.postMessage(
      {
        type: 'gtp-call',
        id,
        fn: fnName,
        payload: payload === undefined ? null : payload,
        hasPayload: payload !== undefined,
      },
      '*'
    );
  });
}
