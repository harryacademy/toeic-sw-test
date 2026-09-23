// Calls the Apps Script backend.
// text/plain avoids the CORS preflight that Apps Script cannot answer.
// Apps Script replies with a 302 to script.googleusercontent.com; fetch follows it.
//
// Google's redirect step occasionally loses a reply (404 HTML) or returns a reply meant
// for another request. Every call therefore carries a request id (rid): the reply must
// echo it, and on a lost or mismatched reply we retry with the SAME rid. The server
// caches results by rid, so a retry never repeats work (or a paid Gemini call).
(function () {
  'use strict';

  const RETRY_DELAYS_MS = [1500, 4000, 8000];
  const RETRYABLE = new Set(['NETWORK', 'BAD_RESPONSE', 'RID_MISMATCH', 'PENDING', 'USE_POST']);

  class ApiError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }

  function newRid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function once(url, body, rid, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        redirect: 'follow',
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') throw new ApiError('TIMEOUT', 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
      throw new ApiError('NETWORK', 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
    } finally {
      clearTimeout(timer);
    }

    let reply;
    try {
      reply = await res.json();
    } catch (err) {
      throw new ApiError('BAD_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ (HTTP ' + res.status + ').');
    }
    if (!reply.ok) {
      const e = reply.error || {};
      throw new ApiError(e.code || 'SERVER', e.message || 'Lỗi máy chủ.');
    }
    if (reply.rid !== rid) {
      throw new ApiError('RID_MISMATCH', 'Máy chủ trả về phản hồi không khớp.');
    }
    return reply.data;
  }

  async function call(action, payload, session) {
    const cfg = window.HA_CONFIG;
    if (!cfg.API_URL || cfg.API_URL.indexOf('/exec') === -1) {
      throw new ApiError('NO_API_URL', 'Chưa cấu hình địa chỉ máy chủ (API_URL).');
    }
    const rid = newRid();
    const body = JSON.stringify({ action, payload: payload || {}, session: session || null, rid });
    let lastErr;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await once(cfg.API_URL, body, rid, cfg.REQUEST_TIMEOUT_MS);
      } catch (err) {
        lastErr = err;
        if (!RETRYABLE.has(err.code) || attempt === RETRY_DELAYS_MS.length) break;
        console.warn('[api] retry', action, err.code, 'attempt', attempt + 1);
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    if (lastErr.code === 'PENDING' || lastErr.code === 'RID_MISMATCH' || lastErr.code === 'USE_POST') {
      throw new ApiError(lastErr.code, 'Máy chủ đang bận. Vui lòng thử lại sau ít phút.');
    }
    throw lastErr;
  }

  window.HA_API = { call, ApiError };
})();
