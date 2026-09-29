/**
 * Speaking answers.
 * Phase 2b: stores the recording in Drive and writes the Results row (not graded yet: review_flag NOT_GRADED).
 * Phase 2c adds grading in the same action.
 */

/**
 * payload: { question_id, audio_b64?, duration_ms, peak } → { question_id, audio_link, review_flag }
 * No audio_b64 means the recording was lost (e.g. the page was reloaded while recording): the row is
 * written with review_flag NO_AUDIO so the answer is visibly missing rather than silently absent.
 * Idempotent per (session, question), like submitAnswer.
 */
function actionSubmitSpeaking_(payload, req) {
  var s = requireSession_(req);
  var qid = String(payload.question_id || '');
  var found = formForQuestion_(s, qid);
  if (!found || found.form.section !== 'speaking') throw new AppError('INVALID', 'Unknown question: ' + qid);

  var existing = findRows_(CONFIG.TABS.RESULTS, 'session_id', s.session_id).filter(function (r) {
    return r.obj.question_id === qid;
  })[0];
  if (existing && (existing.obj.audio_link || existing.obj.review_flag === 'NO_AUDIO')) {
    return { question_id: qid, audio_link: existing.obj.audio_link, review_flag: existing.obj.review_flag };
  }

  var link = '', flag = 'NOT_GRADED';
  if (payload.audio_b64) {
    var saved = saveAudio_(payload.audio_b64, String(s.session_id).slice(0, 8) + '_' + qid + '.wav');
    link = saved.url;
  } else {
    flag = 'NO_AUDIO';
  }
  var seconds = Math.round(Number(payload.duration_ms || 0) / 100) / 10;
  var row = {
    timestamp: new Date(), session_id: s.session_id, code: s.code, full_name: s.full_name,
    phone: String(s.phone), form_id: found.form.id, section: 'speaking', question_id: qid,
    response: '', audio_link: link, ai_score: '', max_score: MAX_SCORE[found.step.type],
    review_flag: flag, grade_runs: '', model: CONFIG.GEMINI_MODEL,
    criteria: { duration_sec: seconds, peak: Number(payload.peak || 0) }
  };
  if (existing) updateCells_(CONFIG.TABS.RESULTS, existing.row, row);
  else appendRow_(CONFIG.TABS.RESULTS, row);
  return { question_id: qid, audio_link: link, review_flag: flag };
}
