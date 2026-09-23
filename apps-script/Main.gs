/**
 * Web app entry points.
 * Frontend sends POST with Content-Type text/plain and a JSON body:
 *   { action: string, payload: object, session?: string, rid: string }
 * Every response is JSON: { ok: true, rid, data } or { ok: false, rid, error: { code, message } }.
 * Apps Script cannot set HTTP status codes, so errors are always in the body.
 *
 * rid (request id) makes retries safe: Google's redirect step occasionally loses a reply
 * or returns another request's reply. The client checks that rid matches and retries with
 * the same rid; the server returns the cached result instead of doing the work twice.
 */

var ACTIONS = {
  ping: actionPing_
};

var RID_TTL_SECONDS = 600;       // how long a finished result is kept for retries
var RID_PENDING_SECONDS = 360;   // Apps Script max run time; marks a request still running
var CACHE_VALUE_LIMIT = 90000;   // CacheService limit is 100 KB per value

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: { code: 'BAD_JSON', message: 'Request body is not valid JSON.' } });
  }
  var rid = typeof req.rid === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(req.rid) ? req.rid : null;
  var cache = CacheService.getScriptCache();
  var key = rid && 'rid:' + rid;

  if (key) {
    var cached = cache.get(key);
    if (cached === 'pending') {
      return json_({ ok: false, rid: rid, error: { code: 'PENDING', message: 'Request is still being processed.' } });
    }
    if (cached) return text_(cached);
    cache.put(key, 'pending', RID_PENDING_SECONDS);
  }

  var body = JSON.stringify(handle_(req, rid));
  if (key) {
    if (body.length <= CACHE_VALUE_LIMIT) cache.put(key, body, RID_TTL_SECONDS);
    else cache.remove(key);
  }
  return text_(body);
}

function handle_(req, rid) {
  var handler = ACTIONS[req.action];
  if (!handler) {
    return { ok: false, rid: rid, error: { code: 'UNKNOWN_ACTION', message: 'Unknown action: ' + req.action } };
  }
  try {
    return { ok: true, rid: rid, data: handler(req.payload || {}, req) };
  } catch (err) {
    var code = err instanceof AppError ? err.code : 'SERVER';
    if (code === 'SERVER') console.error(err && err.stack || err);
    return { ok: false, rid: rid, error: { code: code, message: String(err.message || err) } };
  }
}

/** GET is only a health check. It answers ok:false so a POST that Google turned into a GET is never mistaken for success. */
function doGet() {
  return json_({ ok: false, error: { code: 'USE_POST', message: 'HA TOEIC SW is running. Use POST.' } });
}

function text_(str) {
  return ContentService.createTextOutput(str).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return text_(JSON.stringify(obj));
}

function AppError(code, message) {
  this.code = code;
  this.message = message;
}
AppError.prototype = Object.create(Error.prototype);

/** Phase 0 round trip: writes one Log row, returns server info. */
function actionPing_(payload) {
  var note = String(payload.note || '').slice(0, 200);
  log_('ping', note);
  return {
    serverTime: new Date().toISOString(),
    sheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
    model: CONFIG.GEMINI_MODEL,
    geminiKeySet: !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')
  };
}
