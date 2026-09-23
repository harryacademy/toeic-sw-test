/** Sheet helpers and one-time setup. */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HA TOEIC')
    .addItem('Khởi tạo các trang tính', 'setupSheets')
    .addToUi();
}

/** Creates any missing tabs and writes header rows. Safe to run more than once. */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = SCHEMA[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  return 'OK';
}

function getTab_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new AppError('SETUP', 'Missing tab "' + name + '". Run setupSheets().');
  return sheet;
}

/** Appends a row given an object keyed by header names. Unknown keys are ignored. */
function appendRow_(tabName, obj) {
  var row = SCHEMA[tabName].map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
    return v;
  });
  getTab_(tabName).appendRow(row);
}

function log_(action, detail) {
  try {
    appendRow_(CONFIG.TABS.LOG, {
      timestamp: new Date(),
      action: action,
      detail: String(detail || '').slice(0, 500)
    });
  } catch (e) {
    console.error('log_ failed: ' + e);
  }
}
