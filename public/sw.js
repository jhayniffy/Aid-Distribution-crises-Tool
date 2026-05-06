// public/sw.js — Offline queue for distribution requests
const QUEUE_KEY = 'aid_offline_queue';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.includes('/api/distribute')) return;

  event.respondWith(
    fetch(request.clone()).catch(async () => {
      // Offline: save to IndexedDB-backed queue
      const body = await request.clone().json();
      await enqueue(body);
      return new Response(JSON.stringify({ queued: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    })
  );
});

// Sync queued requests when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'aid-sync') event.waitUntil(flushQueue());
});

async function enqueue(payload) {
  const db = await openDB();
  const tx = db.transaction(QUEUE_KEY, 'readwrite');
  tx.objectStore(QUEUE_KEY).add({ payload, ts: Date.now() });
  return tx.complete;
}

async function flushQueue() {
  const db = await openDB();
  const tx = db.transaction(QUEUE_KEY, 'readwrite');
  const store = tx.objectStore(QUEUE_KEY);
  const all = await promisify(store.getAll());
  for (const record of all) {
    try {
      await fetch('/api/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.payload),
      });
      store.delete(record.id);
    } catch {
      break; // still offline, stop flushing
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('aid_queue_db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore(QUEUE_KEY, { autoIncrement: true, keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisify(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}
