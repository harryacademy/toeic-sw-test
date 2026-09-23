/**
 * Central configuration. Edit values here, then `clasp push` and redeploy.
 * Secrets (GEMINI_API_KEY) live in Script Properties, never in this file.
 */
var CONFIG = {
  // Gemini — verified 2026-09-23 at https://ai.google.dev/gemini-api/docs/models
  GEMINI_MODEL: 'gemini-3.8-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/',
  // Google recommends 1.0 for all Gemini 3 models (lower values may loop / degrade).
  GEMINI_TEMPERATURE: 1.0,
  GEMINI_THINKING_LEVEL: 'low',

  // Cost protection (used from Phase 3)
  DAILY_GEMINI_CAP: 500,
  SESSION_TTL_MINUTES: 180,

  // Sheet tab names
  TABS: {
    RESULTS: 'Results',
    SESSIONS: 'Sessions',
    CODES: 'Codes',
    LOG: 'Log'
  },

  // Optional: Drive folder ID for audio files (empty = do not save audio)
  AUDIO_FOLDER_ID: '',

  // Optional: consultant email on test completion (empty = off)
  CONSULTANT_EMAIL: ''
};

/** Header rows for each tab. Order matters: rows are written in this order. */
var SCHEMA = {
  Results: [
    'timestamp', 'session_id', 'code', 'full_name', 'phone', 'form_id',
    'section', 'question_id', 'response', 'audio_link',
    'ai_score', 'max_score', 'criteria', 'errors', 'feedback_vi', 'band_note',
    'review_flag', 'estimated_range'
  ],
  Sessions: [
    'session_id', 'code', 'full_name', 'phone', 'consent_at', 'started_at',
    'expires_at', 'completed_at', 'form_id',
    'speaking_raw', 'writing_raw', 'speaking_estimate', 'writing_estimate', 'status'
  ],
  Codes: ['code', 'created_by', 'created_at', 'used_at', 'status', 'session_id'],
  Log: ['timestamp', 'action', 'detail']
};
