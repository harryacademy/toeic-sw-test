/**
 * Web app entry points.
 * Frontend sends POST with Content-Type text/plain and a JSON body:
 *   { action: string, payload: object, session?: string }
 * Every response is JSON: { ok: true, data } or { ok: false, error: { code, message } }.
 * Apps Script cannot set HTTP status codes, so errors are always in the body.
 */

var ACTIONS = {
  ping: actionPing_
};

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: { code: 'BAD_JSON', message: 'Request body is not valid JSON.' } });
  }
  var handler = ACTIONS[req.action];
  if (!handler) {
    return json_({ ok: false, error: { code: 'UNKNOWN_ACTION', message: 'Unknown action: ' + req.action } });
  }
  try {
    return json_({ ok: true, data: handler(req.payload || {}, req) });
  } catch (err) {
    var code = err instanceof AppError ? err.code : 'SERVER';
    if (code === 'SERVER') console.error(err && err.stack || err);
    return json_({ ok: false, error: { code: code, message: String(err.message || err) } });
  }
}

/** GET is only a health check; the app itself uses POST. */
function doGet() {
  return json_({ ok: true, data: { service: 'HA TOEIC SW', time: new Date().toISOString() } });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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
