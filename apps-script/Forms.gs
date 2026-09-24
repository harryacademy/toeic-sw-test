/**
 * Test form registry. Each Form*.gs file adds one form with:
 *   var FORMS = FORMS || {};
 *   FORMS['ID'] = { id, title, section, steps: [...] };
 *
 * A step is one timed screen: { id, type, time_sec, directions_en, questions: [...] }.
 * Step types: picture_sentence (Writing Q1–5), email (Q6–7), essay (Q8).
 * Anything under a question's `grading` key is for the grader only and is never sent to the browser.
 */
var FORMS = FORMS || {};

function getForm_(id) {
  var form = FORMS[id];
  if (!form) throw new AppError('SETUP', 'Unknown form: ' + id);
  return form;
}

function publicForm_(form) {
  var copy = JSON.parse(JSON.stringify(form));
  copy.steps.forEach(function (step) {
    step.questions.forEach(function (q) { delete q.grading; });
  });
  return copy;
}

function findQuestion_(form, qid) {
  for (var i = 0; i < form.steps.length; i++) {
    var step = form.steps[i];
    for (var j = 0; j < step.questions.length; j++) {
      if (step.questions[j].id === qid) return { step: step, question: step.questions[j] };
    }
  }
  return null;
}
