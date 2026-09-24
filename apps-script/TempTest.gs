/**
 * Temperature experiment: grades every anchor CONFIG.TEMP_TEST_RUNS times at each temperature in
 * CONFIG.TEMP_TEST_TEMPERATURES, with that anchor left out of the few-shot examples.
 * Rows go to the TempTest tab; a summary (exact agreement, mean absolute error, spread) goes to the Log tab.
 * Run from the Sheet menu HA TOEIC, or from the editor. Uses Gemini calls (counts toward the daily cap).
 */
function runTemperatureTest() {
  var anchors = ANCHORS.filter(function (a) { return a.response && a.owner_score !== undefined && a.owner_score !== ''; });
  if (!anchors.length) {
    var msg = 'No anchors with owner_score in Rubrics.gs yet.';
    log_('tempTest', msg);
    return msg;
  }
  var started = Date.now();
  var stats = {};
  CONFIG.TEMP_TEST_TEMPERATURES.forEach(function (t) { stats[t] = { n: 0, exact: 0, absErr: 0, spread: 0 }; });

  anchors.forEach(function (a) {
    CONFIG.TEMP_TEST_TEMPERATURES.forEach(function (t) {
      if (Date.now() - started > 5 * 60 * 1000) return;  // stay under the 6-minute execution limit
      var g, error = '';
      try {
        g = gradeQuestion_(a.type, a.question, a.response, {
          temperature: t, runs: CONFIG.TEMP_TEST_RUNS, excludeAnchorId: a.id
        });
      } catch (err) {
        error = String(err.message);
      }
      var runs = g ? g.grade_runs : [];
      runs.forEach(function (score, i) {
        appendRow_(CONFIG.TABS.TEMP_TEST, {
          timestamp: new Date(), anchor_id: a.id, type: a.type, owner_score: a.owner_score,
          temperature: t, run: i + 1, ai_score: score
        });
        var s = stats[t];
        s.n++;
        if (score === Number(a.owner_score)) s.exact++;
        s.absErr += Math.abs(score - Number(a.owner_score));
      });
      if (runs.length) stats[t].spread += Math.max.apply(null, runs) - Math.min.apply(null, runs);
      if (error) {
        appendRow_(CONFIG.TABS.TEMP_TEST, {
          timestamp: new Date(), anchor_id: a.id, type: a.type, owner_score: a.owner_score, temperature: t, error: error
        });
      }
    });
  });

  var summary = CONFIG.TEMP_TEST_TEMPERATURES.map(function (t) {
    var s = stats[t];
    if (!s.n) return 'T=' + t + ': no results';
    return 'T=' + t + ': ' + s.n + ' scores, exact ' + Math.round(100 * s.exact / s.n) + '%, MAE ' +
      (s.absErr / s.n).toFixed(2) + ', avg spread per anchor ' + (s.spread / anchors.length).toFixed(2);
  }).join(' | ');
  log_('tempTest', summary);
  return summary;
}

/** Editor check: grades one sample e-mail answer and logs the result. Uses 1 Gemini call. */
function testGradeOnce() {
  var q = FORMS['W-SAMPLE-01'].steps[1].questions[0];
  var answer = 'Dear Members Desk,\n\nI am interested in the yoga class. Is the class suitable for people who never do yoga before? ' +
    'And how much it cost for one month? I work in an office until 6 p.m., so the evening time is good for me.\n\nBest regards,\nNam';
  var g = gradeQuestion_('email', q, answer, {});
  Logger.log(JSON.stringify(g, null, 2));
  return g.score;
}
