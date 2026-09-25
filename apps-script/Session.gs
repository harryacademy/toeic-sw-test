/**
 * Sessions and test actions.
 *
 * Phase 1 uses one shared temporary access code (Script Property TEMP_ACCESS_CODE).
 * Phase 3 replaces it with single-use codes from the Codes tab.
 */

var SESSION_CACHE_SECONDS = 600;

/** payload: { full_name, phone, consent, access_code } → { session_id, expires_at, form } */
function actionStartSession_(payload) {
  var name = String(payload.full_name || '').replace(/\s+/g, ' ').trim();
  var phone = String(payload.phone || '').replace(/[\s.\-()]/g, '');
  if (name.length < 2 || name.length > 80) throw new AppError('INVALID', 'Vui lòng nhập họ và tên (2–80 ký tự).');
  if (!/^(0|\+84)\d{9,10}$/.test(phone)) throw new AppError('INVALID', 'Số điện thoại chưa đúng định dạng.');
  if (payload.consent !== true) throw new AppError('INVALID', 'Bạn cần đồng ý với thông báo thu thập thông tin.');

  var expected = PropertiesService.getScriptProperties().getProperty('TEMP_ACCESS_CODE');
  if (!expected) throw new AppError('SETUP', 'Máy chủ chưa cài mã truy cập (TEMP_ACCESS_CODE).');
  var code = String(payload.access_code || '').trim();
  if (code.toUpperCase() !== expected.trim().toUpperCase()) throw new AppError('BAD_CODE', 'Mã truy cập không đúng.');

  var form = getForm_(CONFIG.ACTIVE_FORM);
  var now = new Date();
  var expires = new Date(now.getTime() + CONFIG.SESSION_TTL_MINUTES * 60000);
  var id = Utilities.getUuid();
  appendRow_(CONFIG.TABS.SESSIONS, {
    session_id: id, code: 'TEMP', full_name: name, phone: phone,
    consent_at: now, started_at: now, expires_at: expires,
    form_id: form.id, status: 'started'
  });
  log_('startSession', id + ' ' + form.id);
  return { session_id: id, expires_at: expires.toISOString(), form: publicForm_(form) };
}

/** Returns the form again (e.g. after the browser lost its saved copy). */
function actionGetForm_(payload, req) {
  var s = requireSession_(req);
  return { form: publicForm_(getForm_(s.form_id)) };
}

/**
 * payload: { question_id, response } → graded result.
 * Idempotent per (session, question): a second submission returns the stored grade.
 * The answer is written to the sheet even when grading fails, so it is never lost.
 */
function actionSubmitAnswer_(payload, req) {
  var s = requireSession_(req);
  var form = getForm_(s.form_id);
  var qid = String(payload.question_id || '');
  var found = findQuestion_(form, qid);
  if (!found) throw new AppError('INVALID', 'Unknown question: ' + qid);
  var response = String(payload.response || '').slice(0, 20000);

  var existing = findRows_(CONFIG.TABS.RESULTS, 'session_id', s.session_id).filter(function (r) {
    return r.obj.question_id === qid;
  })[0];
  if (existing && existing.obj.ai_score !== '') return resultFromRow_(existing.obj);

  var base = {
    timestamp: new Date(), session_id: s.session_id, code: s.code, full_name: s.full_name,
    phone: String(s.phone), form_id: form.id, section: form.section, question_id: qid,
    response: response, max_score: MAX_SCORE[found.step.type], model: CONFIG.GEMINI_MODEL
  };

  var g;
  try {
    g = gradeQuestion_(found.step.type, found.question, response, {});
  } catch (err) {
    var failed = Object.assign({}, base, { ai_score: '', review_flag: 'AI_ERROR: ' + String(err.message).slice(0, 200) });
    if (existing) updateCells_(CONFIG.TABS.RESULTS, existing.row, failed);
    else appendRow_(CONFIG.TABS.RESULTS, failed);
    throw err;
  }

  var row = Object.assign(base, {
    ai_score: g.score, criteria: g.criteria, errors: g.errors, feedback_vi: g.feedback_vi,
    band_note: g.band_note, review_flag: g.review_flag, grade_runs: g.grade_runs.join('|')
  });
  if (existing) updateCells_(CONFIG.TABS.RESULTS, existing.row, row);
  else appendRow_(CONFIG.TABS.RESULTS, row);
  return resultFromRow_(row);
}

/** Totals the section from the sheet (the source of truth) and closes the session. */
function actionFinishTest_(payload, req) {
  var s = requireSession_(req);
  var form = getForm_(s.form_id);
  var rows = {};
  findRows_(CONFIG.TABS.RESULTS, 'session_id', s.session_id).forEach(function (r) {
    rows[r.obj.question_id] = r.obj;
  });

  // Scores are reported per question type, not as one sum: ETS weights the harder types more,
  // so a plain total would overstate Q1–5. The 0–200 estimate (Score.gs) is built from these groups.
  var items = [], groups = [], byType = {};
  form.steps.forEach(function (step) {
    var g = byType[step.type];
    if (!g) {
      g = byType[step.type] = { type: step.type, first: null, last: null, scores: [], max: MAX_SCORE[step.type] };
      groups.push(g);
    }
    step.questions.forEach(function (q) {
      var n = q.id.replace(/^\D+/, '');
      if (g.first === null) g.first = n;
      g.last = n;
      var r = rows[q.id];
      if (r && r.ai_score !== '') {
        var item = resultFromRow_(r);
        item.type = step.type;
        items.push(item);
        g.scores.push(item.ai_score);
      } else {
        items.push({ question_id: q.id, type: step.type, ai_score: null, max_score: MAX_SCORE[step.type], missing: true });
        g.scores.push(null);
      }
    });
  });
  groups.forEach(function (g) {
    var got = g.scores.filter(function (x) { return x !== null; });
    g.label = g.first === g.last ? 'Q' + g.first : 'Q' + g.first + '-' + g.last;
    g.avg = got.length ? Math.round(10 * got.reduce(function (a, b) { return a + b; }, 0) / got.length) / 10 : null;
    delete g.first;
    delete g.last;
  });
  // e.g. "Q1-5 TB 2.4/3 | Q6-7 3, 2 /4 | Q8 3.5/5"
  var summary = groups.map(function (g) {
    var shown = g.scores.map(function (x) { return x === null ? '-' : x; });
    return g.label + ' ' + (g.scores.length > 2 ? 'TB ' + g.avg + '/' + g.max : shown.join(', ') + ' /' + g.max);
  }).join(' | ');

  var estimate = estimateScaled_(groups, loadScoreMap_(form.section));
  var estimateText = estimate
    ? estimate.low + '-' + estimate.high + ' (Level ' + estimate.level + ') | ' + estimate.score + ' | weighted ' + estimate.weighted
    : '';

  var update = { completed_at: new Date(), status: 'completed' };
  update[form.section + '_raw'] = summary;
  update[form.section + '_estimate'] = estimateText;
  updateCells_(CONFIG.TABS.SESSIONS, s.row, update);
  log_('finishTest', s.session_id + ' ' + summary + ' | ' + estimateText);
  return { section: form.section, groups: groups, items: items, estimate: estimate };
}

function resultFromRow_(r) {
  return {
    question_id: r.question_id,
    ai_score: r.ai_score === '' ? null : Number(r.ai_score),
    max_score: Number(r.max_score),
    criteria: parseJson_(r.criteria, []),
    errors: parseJson_(r.errors, []),
    feedback_vi: r.feedback_vi,
    band_note: r.band_note,
    review_flag: r.review_flag
  };
}

function parseJson_(v, fallback) {
  if (typeof v !== 'string') return v || fallback;
  try { return JSON.parse(v); } catch (e) { return fallback; }
}

/** Validates req.session and returns the session record (cached briefly). */
function requireSession_(req) {
  var id = String(req.session || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError('NO_SESSION', 'Chưa bắt đầu phiên làm bài.');
  var cache = CacheService.getScriptCache();
  var hit = cache.get('sess:' + id);
  var s = hit ? JSON.parse(hit) : null;
  if (!s) {
    var found = findRows_(CONFIG.TABS.SESSIONS, 'session_id', id)[0];
    if (!found) throw new AppError('NO_SESSION', 'Phiên làm bài không tồn tại.');
    s = found.obj;
    s.row = found.row;
    s.expires_ms = new Date(s.expires_at).getTime();
    cache.put('sess:' + id, JSON.stringify(s), SESSION_CACHE_SECONDS);
  }
  if (Date.now() > s.expires_ms) throw new AppError('SESSION_EXPIRED', 'Phiên làm bài đã hết hạn.');
  return s;
}
