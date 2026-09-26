// Keeps recordings in IndexedDB until they are uploaded, so a reload or a dropped connection
// loses nothing. localStorage is too small for audio (a full Speaking test is about 10 MB).
(function () {
  'use strict';

  const DB = 'ha_sw_audio';
  const STORE = 'clips';
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  // Blobs are stored as ArrayBuffers: older Safari versions cannot store Blob objects in IndexedDB.
  async function put(key, blob) {
    const buf = await blob.arrayBuffer();
    return tx('readwrite', (s) => s.put({ buf, type: blob.type }, key));
  }

  async function get(key) {
    const rec = await tx('readonly', (s) => s.get(key));
    return rec ? new Blob([rec.buf], { type: rec.type }) : null;
  }

  function del(key) {
    return tx('readwrite', (s) => s.delete(key));
  }

  function toBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  window.HA_AUDIO_STORE = { put, get, del, toBase64 };
})();
