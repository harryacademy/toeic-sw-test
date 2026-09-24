// Background submission queue. Answers are queued and sent one at a time while the student
// keeps working; the queue lives in localStorage so a reload or a dropped connection loses nothing.
// Each item keeps its request id (rid) for life, so resending never grades an answer twice.
(function () {
  'use strict';

  const KEY = 'ha_sw_queue';
  // Errors worth retrying later: network trouble, server busy, Gemini overloaded.
  const RETRY_LATER = new Set(['NETWORK', 'TIMEOUT', 'BAD_RESPONSE', 'RID_MISMATCH', 'PENDING', 'USE_POST', 'GRADER_BUSY', 'SERVER']);
  const BACKOFF_MS = [5000, 15000, 30000, 60000];
  const MAX_ATTEMPTS = 8;

  let items = load();
  let running = false;
  let wakeTimer = null;
  const listeners = new Set();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[queue] could not save', e);
    }
    listeners.forEach((fn) => fn(items));
  }

  // Adds an item unless one with the same key is already queued. key: e.g. 'submit:W3'.
  function add(key, action, payload, session) {
    if (items.some((it) => it.key === key)) return;
    items.push({ key, rid: HA_API.newRid(), action, payload, session, status: 'pending', attempts: 0, result: null, error: null });
    save();
    kick();
  }

  function kick() {
    clearTimeout(wakeTimer);
    wakeTimer = null;
    if (!running) run();
  }

  async function run() {
    running = true;
    try {
      let item;
      while ((item = items.find((it) => it.status === 'pending'))) {
        try {
          item.result = await HA_API.call(item.action, item.payload, item.session, { rid: item.rid });
          item.status = 'done';
          item.error = null;
          save();
        } catch (err) {
          item.attempts++;
          item.error = { code: err.code || 'ERROR', message: err.message };
          if (!RETRY_LATER.has(err.code) || item.attempts >= MAX_ATTEMPTS) {
            item.status = 'failed';
            save();
            continue;
          }
          save();
          const delay = BACKOFF_MS[Math.min(item.attempts - 1, BACKOFF_MS.length - 1)];
          wakeTimer = setTimeout(kick, delay);
          return;
        }
      }
    } finally {
      running = false;
    }
  }

  // Puts failed items back in line (the "Thử lại" button).
  function retryFailed() {
    items.forEach((it) => {
      if (it.status === 'failed') {
        it.status = 'pending';
        it.attempts = 0;
      }
    });
    save();
    kick();
  }

  function clear() {
    items = [];
    save();
  }

  function counts() {
    const c = { pending: 0, done: 0, failed: 0 };
    items.forEach((it) => c[it.status]++);
    return c;
  }

  window.addEventListener('online', kick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick();
  });

  window.HA_QUEUE = {
    add, kick, retryFailed, clear, counts,
    items: () => items,
    onChange: (fn) => listeners.add(fn)
  };
})();
