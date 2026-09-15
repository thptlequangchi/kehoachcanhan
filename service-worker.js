/* Sổ Tay Giáo Viên v53.3.13 STABLE — Service Worker */
const APP_VERSION = '53.3.13';
const CACHE_PREFIX = 'teacher-notebook-app-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${APP_VERSION}`;
const STATIC_CDN_HOSTS = new Set(['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'www.gstatic.com', 'tessdata.projectnaptha.com']);
const INDEX_URL = new URL('./index.html', self.location.href).href;
const ROOT_URL = new URL('./', self.location.href).href;
const OCR_ASSETS = [
    'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js',
    'https://tessdata.projectnaptha.com/4.0.0_fast/vie.traineddata.gz',
    'https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz',
];
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './release-manifest.json',
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
    './assets/css/pro-workspace-v51.css',
    './assets/css/gradebook-v51.css',
    './assets/css/homeroom-v51.css',
    './assets/css/homeroom-v52-2.css',
    './assets/css/homeroom-v52-3.css',
    './assets/css/homeroom-v52-4.css',
    './assets/css/homeroom-v53-1.css',
    './assets/css/homeroom-v53-2.css',
    './assets/css/homeroom-v53-4.css',
    './assets/css/plan-revision-v51.css',
    './assets/css/contrast-v53-3-12.css',
    './assets/css/homeroom-edit-v53-3-13.css',
    './assets/css/release-v52.css',
    './assets/css/release-v52-5.css',
    './assets/css/timetable-v52-1.css',
    './assets/icons/apple-touch-icon.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-512.png',
    './assets/js/35-stable-guard.js',
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
    './assets/js/11-plan-revision.js',
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
    './assets/js/28-gradebook.js',
    './assets/js/29-homeroom.js',
    './assets/js/30-lazy-vendors.js',
    './assets/js/31-release-shell.js',
    './assets/js/32-module-loader.js',
    './assets/js/33-browser-smoke.js',
    './assets/js/34-safety-snapshots.js',
    './assets/js/config.js'
];

async function warmOcrRuntimeCache() {
    const cache = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(OCR_ASSETS.map(async url => {
        const request = new Request(url, { mode: 'cors', credentials: 'omit' });
        const existing = await cache.match(request);
        if (existing) return true;
        const response = await fetch(request);
        if (response && response.ok) await cache.put(request, response.clone());
        return Boolean(response?.ok);
    }));
}

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_SHELL);
        // OCR là dự phòng khi mất mạng. Làm ấm trước nhưng không để lỗi CDN chặn cài PWA.
        await warmOcrRuntimeCache();
    })());
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
    if (event.data?.type === 'WARM_OCR_CACHE') event.waitUntil(warmOcrRuntimeCache());
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
