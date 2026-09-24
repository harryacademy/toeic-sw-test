/**
 * Gemini REST client (generateContent). The API key is read from Script Properties.
 * Every HTTP call counts toward CONFIG.DAILY_GEMINI_CAP, retries included.
 */

/** Builds one UrlFetchApp request object. parts: Gemini content parts for the user turn. */
function geminiRequest_(systemText, parts, schema, temperature) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new AppError('SETUP', 'GEMINI_API_KEY is not set in Script Properties.');
  return {
    url: CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent',
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: parts }],
      generationConfig: {
        temperature: temperature,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        thinkingConfig: { thinkingLevel: CONFIG.GEMINI_THINKING_LEVEL }
      }
    })
  };
}

/**
 * Sends requests in parallel. Retries HTTP 429/5xx, network failures and unparsable output.
 * Returns an array in the same order: each item is the parsed JSON object or an AppError.
 */
function geminiFetchAll_(requests) {
  var results = new Array(requests.length);
  var todo = requests.map(function (_, i) { return i; });
  for (var attempt = 1; attempt <= CONFIG.GEMINI_MAX_ATTEMPTS && todo.length; attempt++) {
    if (attempt > 1) Utilities.sleep(2000 * attempt);
    reserveGeminiCalls_(todo.length);
    var responses;
    try {
      responses = UrlFetchApp.fetchAll(todo.map(function (i) { return requests[i]; }));
    } catch (err) {
      todo.forEach(function (i) { results[i] = new AppError('GRADER_BUSY', 'Gemini network error: ' + err.message); });
      continue;
    }
    var retry = [];
    responses.forEach(function (res, k) {
      var i = todo[k];
      var code = res.getResponseCode();
      if (code === 200) {
        try {
          results[i] = parseGeminiJson_(res.getContentText());
        } catch (err) {
          results[i] = err;
          retry.push(i);
        }
        return;
      }
      var transient = code === 429 || code >= 500;
      results[i] = new AppError(transient ? 'GRADER_BUSY' : 'GRADER_ERROR',
        'Gemini HTTP ' + code + ': ' + res.getContentText().slice(0, 300));
      if (transient) retry.push(i);
    });
    todo = retry;
  }
  return results;
}

/** Extracts the JSON answer from a generateContent response, skipping thought parts. */
function parseGeminiJson_(text) {
  var body = JSON.parse(text);
  var cand = body.candidates && body.candidates[0];
  if (!cand || !cand.content || !cand.content.parts) {
    throw new AppError('GRADER_BUSY', 'Gemini returned no content (' + (cand ? cand.finishReason : 'no candidate') + ').');
  }
  var out = cand.content.parts.filter(function (p) { return !p.thought && p.text; })
    .map(function (p) { return p.text; }).join('');
  try {
    return JSON.parse(out);
  } catch (err) {
    throw new AppError('GRADER_BUSY', 'Gemini output is not valid JSON (' + cand.finishReason + ').');
  }
}

/** Counts n calls against today's cap, or throws DAILY_CAP. */
function reserveGeminiCalls_(n) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'gemini_calls_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
    var used = Number(props.getProperty(key) || 0);
    if (used + n > CONFIG.DAILY_GEMINI_CAP) {
      log_('dailyCap', used + ' used, cap ' + CONFIG.DAILY_GEMINI_CAP);
      throw new AppError('DAILY_CAP', 'Hệ thống đã đạt giới hạn chấm bài trong ngày. Vui lòng liên hệ Harry Academy.');
    }
    if (used === 0) {
      props.getKeys().forEach(function (k) { if (k.indexOf('gemini_calls_') === 0 && k !== key) props.deleteProperty(k); });
    }
    props.setProperty(key, String(used + n));
  } finally {
    lock.releaseLock();
  }
}
