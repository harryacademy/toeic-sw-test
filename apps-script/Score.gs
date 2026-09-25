/**
 * Estimated 0–200 scaled score, following the ETS method described in the owner's TOEIC workshop manual:
 * average each question type, weight the types (harder types weigh more), convert with a table.
 *
 * Weights, conversion points, ETS levels and the range width live in the ScoreMap tab so the owner can
 * calibrate them without code. Columns: section | kind | x | y | note
 *   weight  x = question type,        y = weight (weights of a section should add up to 1)
 *   point   x = weighted score 0–1,   y = scaled score 0–200 (straight lines between points)
 *   level   x = lowest scaled score,  y = ETS proficiency level
 *   setting x = 'range_half_width',   y = half the width of the range shown (10 → "140–160")
 */

var DEFAULT_SCORE_MAP = [
  // Writing weights (start values, calibrate with real ETS scores)
  ['writing', 'weight', 'picture_sentence', 0.20, 'Q1-5'],
  ['writing', 'weight', 'email', 0.35, 'Q6-7'],
  ['writing', 'weight', 'essay', 0.45, 'Q8'],
  // Conversion points, fitted to the example table in the ETS manual (2019)
  ['writing', 'point', 0, 0, 'no response'],
  ['writing', 'point', 0.288, 40, 'Q1-5 nearly all 1 | Q6-7 2,1 or 1,1 | Q8 1'],
  ['writing', 'point', 0.301, 55, 'Q1-5 mostly 1 | Q6-7 2,1 or 1,1 | Q8 1'],
  ['writing', 'point', 0.411, 75, 'Q1-5 some 1, some 2 | Q6-7 2,1 or 1,1 | Q8 2'],
  ['writing', 'point', 0.519, 95, 'Q1-5 mostly 2 | Q6-7 3,2 or 2,2 | Q8 2'],
  ['writing', 'point', 0.609, 120, 'Q1-5 mostly 2 | Q6-7 3,2 or 2,2 | Q8 3'],
  ['writing', 'point', 0.698, 150, 'Q1-5 mostly 2 | Q6-7 4,4 to 3,3 | Q8 3  (or Q6-7 3,2 | Q8 4)'],
  ['writing', 'point', 0.883, 180, 'Q1-5 all or nearly all 3 | Q6-7 4,4 or 4,3 | Q8 4'],
  ['writing', 'point', 0.973, 200, 'Q1-5 all or nearly all 3 | Q6-7 4,4 or 4,3 | Q8 5'],
  ['writing', 'point', 1, 200, ''],
  // ETS Writing proficiency levels
  ['writing', 'level', 0, 1, '0-30'],
  ['writing', 'level', 40, 2, '40'],
  ['writing', 'level', 50, 3, '50-60'],
  ['writing', 'level', 70, 4, '70-80'],
  ['writing', 'level', 90, 5, '90-100'],
  ['writing', 'level', 110, 6, '110-130'],
  ['writing', 'level', 140, 7, '140-160'],
  ['writing', 'level', 170, 8, '170-190'],
  ['writing', 'level', 200, 9, '200'],
  ['writing', 'setting', 'range_half_width', 10, 'shown range = estimate rounded to 10, plus/minus this']
];

/** Fills the ScoreMap tab with the defaults if it has no data rows. Called from setupSheets(). */
function seedScoreMap_() {
  var sheet = getTab_(CONFIG.TABS.SCORE_MAP);
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, DEFAULT_SCORE_MAP.length, 5).setValues(DEFAULT_SCORE_MAP);
}

function loadScoreMap_(section) {
  var sheet = getTab_(CONFIG.TABS.SCORE_MAP);
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, 5).getValues() : [];
  var map = { weights: {}, points: [], levels: [], halfWidth: 10 };
  rows.forEach(function (r) {
    if (String(r[0]).trim() !== section) return;
    var kind = String(r[1]).trim();
    if (kind === 'weight') map.weights[String(r[2]).trim()] = Number(r[3]);
    else if (kind === 'point') map.points.push([Number(r[2]), Number(r[3])]);
    else if (kind === 'level') map.levels.push([Number(r[2]), Number(r[3])]);
    else if (kind === 'setting' && String(r[2]).trim() === 'range_half_width') map.halfWidth = Number(r[3]);
  });
  map.points.sort(function (a, b) { return a[0] - b[0]; });
  map.levels.sort(function (a, b) { return a[0] - b[0]; });
  if (!map.points.length || !Object.keys(map.weights).length) {
    throw new AppError('SETUP', 'ScoreMap has no weights/points for "' + section + '". Run setupSheets().');
  }
  return map;
}

/**
 * groups: [{ type, scores: [number|null], max }] from finishTest. Unanswered/ungraded questions count as 0.
 * Returns { weighted, score, low, high, level } or null when the map does not cover these types.
 */
function estimateScaled_(groups, map) {
  var weighted = 0, total = 0;
  groups.forEach(function (g) {
    var w = map.weights[g.type];
    if (w === undefined) return;
    var sum = g.scores.reduce(function (a, b) { return a + (b || 0); }, 0);
    weighted += w * (sum / g.scores.length) / g.max;
    total += w;
  });
  if (!total) return null;
  weighted = weighted / total;  // keeps the scale 0–1 even if the weights do not add up to exactly 1

  var score = interpolate_(map.points, weighted);
  var center = Math.max(0, Math.min(200, Math.round(score / 10) * 10));
  var low = Math.max(0, center - map.halfWidth);
  var high = Math.min(200, center + map.halfWidth);
  var level = null;
  map.levels.forEach(function (l) { if (center >= l[0]) level = l[1]; });
  return { weighted: Math.round(weighted * 1000) / 1000, score: Math.round(score), low: low, high: high, level: level };
}

function interpolate_(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (var i = 1; i < points.length; i++) {
    var a = points[i - 1], b = points[i];
    if (x <= b[0]) return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  return points[points.length - 1][1];
}

/** Editor check: every example row of the ETS table should land in its own range. No Gemini calls. */
function testScoreMap() {
  var map = loadScoreMap_('writing');
  // [label, Q1-5 scores, Q6-7 scores, Q8, expected min, expected max]
  var cases = [
    ['L2 40', [1, 1, 1, 1, 1], [2, 1], 1, 40, 40],
    ['L3 50-60', [1, 1, 1, 2, 1], [2, 1], 1, 50, 60],
    ['L4 70-80', [1, 2, 1, 2, 2], [2, 1], 2, 70, 80],
    ['L5 90-100', [2, 2, 2, 2, 1], [3, 2], 2, 90, 100],
    ['L6 110-130', [2, 2, 2, 2, 1], [3, 2], 3, 110, 130],
    ['L7 140-160 a', [2, 2, 2, 2, 1], [4, 3], 3, 140, 160],
    ['L7 140-160 b', [2, 2, 2, 2, 1], [3, 2], 4, 140, 160],
    ['L8 170-190', [3, 3, 3, 3, 2], [4, 3], 4, 170, 190],
    ['L9 200', [3, 3, 3, 3, 3], [4, 4], 5, 200, 200]
  ];
  var fails = [];
  cases.forEach(function (c) {
    var e = estimateScaled_([
      { type: 'picture_sentence', scores: c[1], max: 3 },
      { type: 'email', scores: c[2], max: 4 },
      { type: 'essay', scores: [c[3]], max: 5 }
    ], map);
    var ok = e.score >= c[4] - 5 && e.score <= c[5] + 5;
    Logger.log((ok ? 'OK   ' : 'FAIL ') + c[0] + ' -> ' + e.score + ' (' + e.low + '-' + e.high + ', Level ' + e.level + ')');
    if (!ok) fails.push(c[0]);
  });
  Logger.log(fails.length ? 'FAILED: ' + fails.join(', ') : 'All ' + cases.length + ' ETS example rows land in their range.');
  return fails.length;
}
