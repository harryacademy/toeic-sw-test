// Calls the Apps Script backend.
// text/plain avoids the CORS preflight that Apps Script cannot answer.
// Apps Script replies with a 302 to script.googleusercontent.com; fetch follows it.
(function () {
  'use strict';

  class ApiError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }

  async function call(action, payload, session) {
    const url = window.HA_CONFIG.API_URL;
    if (!url || url.indexOf('/exec') === -1) {
      throw new ApiError('NO_API_URL', 'Chưa cấu hình địa chỉ máy chủ (API_URL).');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), window.HA_CONFIG.REQUEST_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload: payload || {}, session: session || null }),
        redirect: 'follow',
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') throw new ApiError('TIMEOUT', 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
      throw new ApiError('NETWORK', 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
    } finally {
      clearTimeout(timer);
    }

    let body;
    try {
      body = await res.json();
    } catch (err) {
      // Usually an HTML error/login page: deployment access is not "Anyone".
      throw new ApiError('BAD_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ (HTTP ' + res.status + ').');
    }
    if (!body.ok) {
      const e = body.error || {};
      throw new ApiError(e.code || 'SERVER', e.message || 'Lỗi máy chủ.');
    }
    return body.data;
  }

  window.HA_API = { call, ApiError };
})();
