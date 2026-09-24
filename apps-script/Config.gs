/**
 * Central configuration. Edit values here, then `clasp push` and redeploy.
 * Secrets (GEMINI_API_KEY, TEMP_ACCESS_CODE) live in Script Properties, never in this file.
 */
var CONFIG = {
  // Gemini — verified 2026-09-23 at https://ai.google.dev/gemini-api/docs/models
  GEMINI_MODEL: 'gemini-3.8-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/',
  // Google recommends 1.0 for all Gemini 3 models (lower values may loop / degrade).
  GEMINI_TEMPERATURE: 1.0,
  GEMINI_THINKING_LEVEL: 'low',
  GEMINI_MAX_ATTEMPTS: 3,          // per call, for HTTP 429/5xx and malformed JSON

  // Grading
  DOUBLE_GRADE_TYPES: ['essay'],   // graded twice; scores differing by >= REVIEW_DIFF get a review flag
  REVIEW_DIFF: 1,

  // Test forms: which form a new session gets (see Form*.gs)
  ACTIVE_FORM: 'W-SAMPLE-01',
  // Public site; the server fetches raster images (png/jpg/webp) from here to show Gemini the picture
  PAGES_BASE_URL: 'https://harryacademy.github.io/toeic-sw-test/',

  // Cost protection
  DAILY_GEMINI_CAP: 100,           // Gemini calls per day (Asia/Ho_Chi_Minh), all students together. ~9 calls per Writing test
  SESSION_TTL_MINUTES: 180,

  // Temperature experiment (runTemperatureTest in TempTest.gs)
  TEMP_TEST_TEMPERATURES: [1.0, 0.2],
  TEMP_TEST_RUNS: 3,

  // Sheet tab names
  TABS: {
    RESULTS: 'Results',
    SESSIONS: 'Sessions',
    CODES: 'Codes',
    LOG: 'Log',
    TEMP_TEST: 'TempTest'
  },

  // Optional: Drive folder ID for audio files (empty = do not save audio)
  AUDIO_FOLDER_ID: '',

  // Optional: consultant email on test completion (empty = off)
  CONSULTANT_EMAIL: ''
};

/** Header rows for each tab. Order matters: rows are written in this order. New columns go at the end. */
var SCHEMA = {
  Results: [
    'timestamp', 'session_id', 'code', 'full_name', 'phone', 'form_id',
    'section', 'question_id', 'response', 'audio_link',
    'ai_score', 'max_score', 'criteria', 'errors', 'feedback_vi', 'band_note',
    'review_flag', 'estimated_range', 'grade_runs', 'model'
  ],
  Sessions: [
    'session_id', 'code', 'full_name', 'phone', 'consent_at', 'started_at',
    'expires_at', 'completed_at', 'form_id',
    'speaking_raw', 'writing_raw', 'speaking_estimate', 'writing_estimate', 'status'
  ],
  Codes: ['code', 'created_by', 'created_at', 'used_at', 'status', 'session_id'],
  Log: ['timestamp', 'action', 'detail'],
  TempTest: ['timestamp', 'anchor_id', 'type', 'owner_score', 'temperature', 'run', 'ai_score', 'error']
};
