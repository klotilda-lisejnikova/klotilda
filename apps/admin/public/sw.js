// The admin's service worker: what makes it installable as an app on a phone (registered in
// src/app/install-prompt.ts). Deliberately small, with no precache list to keep in step:
// - pages come from the network, so every deploy shows up on the next start; offline, the last
//   page shell seen is served instead;
// - the build's assets (`/assets/*`, named by their hash, so never changed in place) are kept
//   after their first load;
// - everything else, the API above all (another origin), is left to the browser.

const SHELL_CACHE = 'klotilda-admin-shell';
const ASSET_CACHE = 'klotilda-admin-assets';
/** About two deploys' worth of chunks; the oldest go first. */
const MAX_ASSETS = 150;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function trimAssets() {
  const cache = await caches.open(ASSET_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, -MAX_ASSETS).map((key) => cache.delete(key)));
}

async function servePage(request) {
  try {
    const response = await fetch(request);
    // Every route is the same index.html; a file opened directly (a photo, say) is not.
    if (response.ok && response.headers.get('content-type')?.startsWith('text/html')) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/', response.clone());
    }
    return response;
  } catch (error) {
    const shell = await caches.match('/', { cacheName: SHELL_CACHE });
    if (shell) return shell;
    throw error;
  }
}

async function serveAsset(request) {
  const cached = await caches.match(request, { cacheName: ASSET_CACHE });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
    await trimAssets();
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(servePage(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(serveAsset(request));
  }
});
