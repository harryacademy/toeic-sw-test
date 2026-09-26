/**
 * Audio storage in Google Drive.
 * Files go to one folder whose ID is kept in Script Property AUDIO_FOLDER_ID; the folder is created on
 * first use ("HA TOEIC SW - Ghi am"). Only the script owner can open it unless the owner shares it.
 * Files older than CONFIG.AUDIO_RETENTION_DAYS are moved to the Drive trash by a daily trigger
 * (install once from the menu). Google empties the trash for good after 30 days.
 */

var AUDIO_FOLDER_NAME = 'HA TOEIC SW - Ghi am';

function getAudioFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('AUDIO_FOLDER_ID');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (e) {
      console.warn('AUDIO_FOLDER_ID not usable, creating a new folder: ' + e);
    }
  }
  var folder = DriveApp.createFolder(AUDIO_FOLDER_NAME);
  props.setProperty('AUDIO_FOLDER_ID', folder.getId());
  log_('audioFolder', 'created ' + folder.getId());
  return folder;
}

/** Saves base64 WAV audio. Returns { id, url, bytes }. */
function saveAudio_(b64, fileName) {
  var bytes = Utilities.base64Decode(String(b64 || ''));
  if (!bytes.length) throw new AppError('INVALID', 'Không nhận được dữ liệu ghi âm.');
  if (bytes.length > CONFIG.AUDIO_MAX_BYTES) throw new AppError('INVALID', 'File ghi âm quá lớn.');
  var blob = Utilities.newBlob(bytes, 'audio/wav', fileName);
  var file = getAudioFolder_().createFile(blob);
  return { id: file.getId(), url: file.getUrl(), bytes: bytes.length };
}

/**
 * Phase 2a device test (mic.html): stores one recording, no grading.
 * payload: { access_code, label, audio_b64, duration_ms, ua }
 */
function actionUploadTestAudio_(payload) {
  var expected = PropertiesService.getScriptProperties().getProperty('TEMP_ACCESS_CODE');
  if (!expected || String(payload.access_code || '').trim().toUpperCase() !== expected.trim().toUpperCase()) {
    throw new AppError('BAD_CODE', 'Mã truy cập không đúng.');
  }
  var label = String(payload.label || 'test').replace(/[^\w-]+/g, '_').slice(0, 40);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  var saved = saveAudio_(payload.audio_b64, 'devicetest_' + stamp + '_' + label + '.wav');
  log_('uploadTestAudio', label + ' ' + saved.bytes + 'B ' + Math.round(Number(payload.duration_ms || 0) / 100) / 10 + 's | ' +
    String(payload.ua || '').slice(0, 300));
  return { url: saved.url, bytes: saved.bytes };
}

/** Moves recordings older than the retention period to the Drive trash. Run daily by a trigger. */
function cleanupOldAudio() {
  var cutoff = Date.now() - CONFIG.AUDIO_RETENTION_DAYS * 24 * 3600 * 1000;
  var files = getAudioFolder_().getFiles();
  var n = 0;
  while (files.hasNext()) {
    var f = files.next();
    if (f.getDateCreated().getTime() < cutoff) {
      f.setTrashed(true);
      n++;
    }
  }
  if (n) log_('cleanupOldAudio', n + ' file(s) moved to trash');
  return n;
}

/** Menu action: installs the daily cleanup trigger (safe to run again; keeps only one). */
function installAudioCleanup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cleanupOldAudio') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cleanupOldAudio').timeBased().everyDays(1).atHour(3).create();
  getAudioFolder_();
  var msg = 'Đã bật tự động xóa ghi âm cũ hơn ' + CONFIG.AUDIO_RETENTION_DAYS + ' ngày (chạy lúc 3 giờ sáng mỗi ngày).';
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'HA TOEIC', 10); } catch (e) { /* run from editor */ }
  log_('installAudioCleanup', msg);
  return msg;
}
