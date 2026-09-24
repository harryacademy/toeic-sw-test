// Public frontend config. No secrets here — this file is served publicly.
window.HA_CONFIG = {
  // Bump together with the ?v= query on <script> tags in index.html when releasing.
  VERSION: '0.3.1',
  // Apps Script web app URL (ends with /exec). Filled in after `clasp deploy`.
  API_URL: 'https://script.google.com/macros/s/AKfycbxxWFiaSBNKrB-hZQNPK5BNsOMDEjGXNlt1eXxuUdaCFUsqg1dBVal6lGbK6CrKLdEOsw/exec',
  REQUEST_TIMEOUT_MS: 90000
};
