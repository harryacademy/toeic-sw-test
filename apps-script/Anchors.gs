/**
 * Anchor samples kept in the Anchors tab of the Sheet (private: the Sheet is not in git).
 *
 * Workflow for the owner:
 *   1. In the Results tab, select the row(s) of answers to use as anchors.
 *   2. Menu HA TOEIC → "Tạo anchor từ dòng đang chọn". Each row is copied to the Anchors tab.
 *   3. In the Anchors tab, fill owner_score and owner_note, then tick "active".
 * Only rows with active ticked and an owner_score are used. Untick to stop using one without deleting it.
 * The task text comes from the form (form_id + question_id), so the form must still exist.
 */

/** Anchors from the Anchors tab plus any defined in code (PrivateAnchors.gs). */
function allAnchors_() {
  var list = ANCHORS.slice();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TABS.ANCHORS);
  if (!sheet || sheet.getLastRow() < 2) return list;
  var h = SCHEMA.Anchors;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, h.length).getValues().forEach(function (r) {
    var o = {};
    h.forEach(function (k, i) { o[k] = r[i]; });
    if (!(o.active === true || String(o.active).toUpperCase() === 'TRUE')) return;
    if (o.owner_score === '' || o.owner_score === null || !o.response) return;
    var form = FORMS[o.form_id];
    var found = form && findQuestion_(form, String(o.question_id));
    if (!found) return;
    list.push({
      id: String(o.anchor_id),
      type: found.step.type,
      question: found.question,
      response: String(o.response),
      owner_score: Number(o.owner_score),
      owner_note: String(o.owner_note || '')
    });
  });
  return list;
}

/** Menu action: copies the selected Results rows into the Anchors tab (inactive, score to be filled). */
function createAnchorsFromSelection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  if (sheet.getName() !== CONFIG.TABS.RESULTS) {
    ss.toast('Hãy mở tab Results và chọn (các) dòng bài làm trước.', 'HA TOEIC', 8);
    return 0;
  }
  var range = sheet.getActiveRange();
  var h = SCHEMA.Results;
  var added = 0;
  for (var r = Math.max(2, range.getRow()); r < range.getRow() + range.getNumRows(); r++) {
    var vals = sheet.getRange(r, 1, 1, h.length).getValues()[0];
    var obj = {};
    h.forEach(function (k, i) { obj[k] = vals[i]; });
    if (addAnchorFromResult_(obj, '', '', false)) added++;
  }
  ss.toast(added ? 'Đã thêm ' + added + ' dòng vào tab Anchors. Điền owner_score, owner_note rồi tick active.'
    : 'Không có dòng mới nào được thêm (dòng trống hoặc đã có trong Anchors).', 'HA TOEIC', 10);
  return added;
}

/** Appends one Results row to the Anchors tab unless it is already there. Returns true if added. */
function addAnchorFromResult_(res, score, note, active) {
  if (!res.response || !res.question_id) return false;
  var id = res.question_id + '-' + String(res.session_id).slice(0, 8);
  if (findRows_(CONFIG.TABS.ANCHORS, 'anchor_id', id).length) return false;
  var form = FORMS[res.form_id];
  var found = form && findQuestion_(form, String(res.question_id));
  appendRow_(CONFIG.TABS.ANCHORS, {
    anchor_id: id, active: active, type: found ? found.step.type : '',
    form_id: res.form_id, question_id: res.question_id,
    owner_score: score, owner_note: note, response: String(res.response),
    source_session: res.session_id, created_at: new Date()
  });
  var tab = getTab_(CONFIG.TABS.ANCHORS);
  var cell = tab.getRange(tab.getLastRow(), SCHEMA.Anchors.indexOf('active') + 1);
  if (cell.insertCheckboxes) cell.insertCheckboxes().setValue(active === true);
  return true;
}

/** Finds a Results row by session id prefix (first 8 characters are enough) and question id. */
function findResultRow_(sessionPrefix, qid) {
  var sheet = getTab_(CONFIG.TABS.RESULTS);
  var h = SCHEMA.Results;
  if (sheet.getLastRow() < 2) return null;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, h.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    var o = {};
    h.forEach(function (k, j) { o[k] = rows[i][j]; });
    if (String(o.session_id).indexOf(sessionPrefix) === 0 && o.question_id === qid) return o;
  }
  return null;
}
