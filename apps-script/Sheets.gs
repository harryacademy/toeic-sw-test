/** Sheet helpers and one-time setup. */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HA TOEIC')
    .addItem('Khởi tạo các trang tính', 'setupSheets')
    .addItem('Chạy thử nghiệm nhiệt độ (temperature)', 'runTemperatureTest')
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
  seedScoreMap_();
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  return 'OK';
}

function getTab_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new AppError('SETUP', 'Missing tab "' + name + '". Run setupSheets().');
  return sheet;
}

/**
 * Converts a value for writing to a cell.
 * Strings that Sheets would turn into a formula (=, +, -, @) or a number (phone "0901..." loses its 0)
 * get a leading apostrophe, which Sheets stores as plain text and does not display.
 */
function cellValue_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
  if (typeof v === 'string' && (/^[=+\-@]/.test(v) || /^[\d\s.,]+$/.test(v))) return "'" + v;
  return v;
}

/** Appends a row given an object keyed by header names. Unknown keys are ignored. */
function appendRow_(tabName, obj) {
  getTab_(tabName).appendRow(SCHEMA[tabName].map(function (h) { return cellValue_(obj[h]); }));
}

/** Overwrites only the given columns of one row. */
function updateCells_(tabName, row, partial) {
  var sheet = getTab_(tabName);
  Object.keys(partial).forEach(function (h) {
    var col = SCHEMA[tabName].indexOf(h) + 1;
    if (col > 0) sheet.getRange(row, col).setValue(cellValue_(partial[h]));
  });
}

/** Finds rows whose column `header` equals `value` exactly. Returns [{ row, obj }]. */
function findRows_(tabName, header, value) {
  var sheet = getTab_(tabName);
  var headers = SCHEMA[tabName];
  var col = headers.indexOf(header) + 1;
  var last = sheet.getLastRow();
  if (col < 1 || last < 2) return [];
  var cells = sheet.getRange(2, col, last - 1, 1)
    .createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findAll();
  return cells.map(function (c) {
    var vals = sheet.getRange(c.getRow(), 1, 1, headers.length).getValues()[0];
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = vals[i]; });
    return { row: c.getRow(), obj: obj };
  });
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
