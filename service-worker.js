/* Sổ Tay Giáo Viên v50.2 — Service Worker */
const APP_VERSION = '50.2.0';
const CACHE_PREFIX = 'teacher-notebook-app-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${APP_VERSION}`;
const STATIC_CDN_HOSTS = new Set(['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'www.gstatic.com']);
const INDEX_URL = new URL('./index.html', self.location.href).href;
const ROOT_URL = new URL('./', self.location.href).href;
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/css/app.css',
    './assets/css/premium-ui.css',
    './assets/css/pwa.css',
    './assets/css/health-check.css',
    './assets/css/work-pro.css',
    './assets/css/links-center.css',
    './assets/css/command-palette.css',
    './assets/css/storage-pro.css',
    './assets/css/profile-package.css',
    './assets/css/reminder-calendar.css',
    './assets/css/regression-test.css',
    './assets/icons/apple-touch-icon.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/js/00-diagnostics-bootstrap.js',
    './assets/js/01-state.js',
    './assets/js/01-indexeddb-storage.js',
    './assets/js/02-dom.js',
    './assets/js/03-ui-core.js',
    './assets/js/04-account-firestore.js',
    './assets/js/04-shared-core.js',
    './assets/js/05-backup-restore.js',
    './assets/js/06-recognition.js',
    './assets/js/07-api-key.js',
    './assets/js/08-gemini.js',
    './assets/js/09-workspace.js',
    './assets/js/10-tabs.js',
    './assets/js/11-plan.js',
    './assets/js/12-timetable.js',
    './assets/js/13-curriculum.js',
    './assets/js/14-teaching-schedule.js',
    './assets/js/15-init.js',
    './assets/js/15-ux.js',
    './assets/js/16-command-center.js',
    './assets/js/17-year-dashboard.js',
    './assets/js/18-automation-center.js',
    './assets/js/19-report-center.js',
    './assets/js/20-pwa.js',
    './assets/js/21-health-check.js',
    './assets/js/22-links-center.js',
    './assets/js/23-global-command.js',
    './assets/js/24-storage-center.js',
    './assets/js/25-profile-package.js',
    './assets/js/26-reminder-calendar.js',
    './assets/js/27-regression-tests.js',
    './assets/js/config.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter(key => key.startsWith(CACHE_PREFIX) && ![CACHE_NAME, RUNTIME_CACHE].includes(key))
            .map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        return (await cache.match(request)) || (await cache.match(INDEX_URL)) || (await cache.match(ROOT_URL));
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
}

async function runtimeCdnCache(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
    return response;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    // Health Check cần xác nhận file thật trên server, không dùng lại bản cache cũ.
    if (url.origin === self.location.origin && (url.searchParams.has('__health') || url.searchParams.has('__regression'))) {
        event.respondWith(fetch(request, { cache: 'no-store' }));
        return;
    }
    if (url.origin !== self.location.origin) {
        if (STATIC_CDN_HOSTS.has(url.hostname)) event.respondWith(runtimeCdnCache(request));
        return;
    }
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }
    event.respondWith(cacheFirst(request));
});
