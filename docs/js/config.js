// Public frontend config. No secrets here — this file is served publicly.
window.HA_CONFIG = {
  // Bump together with the ?v= query on <script> tags in index.html when releasing.
  VERSION: '0.6.0',
  // Apps Script web app URL (ends with /exec). Filled in after `clasp deploy`.
  API_URL: 'https://script.google.com/macros/s/AKfycbxxWFiaSBNKrB-hZQNPK5BNsOMDEjGXNlt1eXxuUdaCFUsqg1dBVal6lGbK6CrKLdEOsw/exec',
  REQUEST_TIMEOUT_MS: 90000,
  // Test deployment of the same Apps Script project (used by mic.html while features are being tried out).
  DEV_API_URL: ''
};
