/* ============================================================================
   SỔ TAY GIÁO VIÊN v42 — PWA / INSTALL / OFFLINE / SAFE UPDATE
   Không thay đổi dữ liệu nghiệp vụ; chỉ quản lý lớp ứng dụng và cache tĩnh.
   ============================================================================ */
(() => {
    const APP_CACHE_PREFIX = 'teacher-notebook-app-';
    const byId = id => document.getElementById(id);
    const networkBadge = byId('networkStatusBadge');
    const networkText = byId('networkStatusText');
    const installBtn = byId('pwaInstallBtn');
    const installSettingsBtn = byId('pwaInstallSettingsBtn');
    const updateBtn = byId('pwaUpdateBtn');
    const updateBar = byId('pwaUpdateBar');
    const applyUpdateBtn = byId('pwaApplyUpdateBtn');
    const dismissUpdateBtn = byId('pwaDismissUpdateBtn');
    const checkUpdateBtn = byId('pwaCheckUpdateBtn');
    const refreshCacheBtn = byId('pwaRefreshCacheBtn');
    const persistStorageBtn = byId('pwaPersistStorageBtn');
    const appModeStatus = byId('pwaAppModeStatus');
    const cacheStatus = byId('pwaCacheStatus');
    const storageStatus = byId('pwaStorageStatus');
    const settingsNote = byId('pwaSettingsNote');

    let deferredInstallPrompt = null;
    let registration = null;
    let reloadingForUpdate = false;

    const notify = (message, type = 'info') => {
        if (typeof window.showToast === 'function') window.showToast(message, type);
        else console.info(message);
    };

    const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    function updateAppMode() {
        if (appModeStatus) appModeStatus.textContent = isStandalone() ? 'Đã cài như ứng dụng' : 'Đang mở trên trình duyệt';
    }

    function updateNetworkState() {
        const online = navigator.onLine;
        document.body.classList.toggle('is-offline', !online);
        if (networkBadge) networkBadge.className = `pwa-network-badge ${online ? 'online' : 'offline'}`;
        if (networkText) networkText.textContent = online ? 'Online' : 'Ngoại tuyến';
        if (settingsNote) {
            settingsNote.textContent = online
                ? 'Khi đã mở ít nhất một lần, phần lõi của ứng dụng được lưu để tải nhanh hơn và hỗ trợ mạng chập chờn.'
                : 'Đang ngoại tuyến. Dữ liệu lưu trên máy và các chức năng không cần Internet vẫn tiếp tục sử dụng được.';
        }
    }

    function setInstallButtons(visible) {
        [installBtn, installSettingsBtn].forEach(button => {
            if (button) button.hidden = !visible;
        });
    }

    async function promptInstall() {
        if (isStandalone()) {
            notify('Ứng dụng đã được cài trên thiết bị này', 'info');
            return;
        }
        if (!deferredInstallPrompt) {
            notify('Trình duyệt chưa cung cấp nút cài tự động. Có thể dùng menu trình duyệt → Cài ứng dụng / Thêm vào màn hình chính.', 'info');
            return;
        }
        deferredInstallPrompt.prompt();
        try {
            await deferredInstallPrompt.userChoice;
        } finally {
            deferredInstallPrompt = null;
            setInstallButtons(false);
            updateAppMode();
        }
    }

    function showUpdateAvailable() {
        if (updateBar) updateBar.hidden = false;
        if (updateBtn) updateBtn.hidden = false;
    }

    function hideUpdateAvailable() {
        if (updateBar) updateBar.hidden = true;
        if (updateBtn) updateBtn.hidden = true;
    }

    function applyWaitingUpdate() {
        if (!registration?.waiting) {
            registration?.update?.();
            notify('Đang kiểm tra phiên bản mới…', 'info');
            return;
        }
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    async function refreshCacheStatus() {
        if (!cacheStatus) return;
        if (!('caches' in window)) {
            cacheStatus.textContent = 'Không hỗ trợ';
            return;
        }
        try {
            const keys = await caches.keys();
            const appKeys = keys.filter(key => key.startsWith(APP_CACHE_PREFIX));
            cacheStatus.textContent = appKeys.length ? 'Sẵn sàng ngoại tuyến' : 'Đang tạo bộ nhớ';
        } catch (error) {
            cacheStatus.textContent = 'Không kiểm tra được';
        }
    }

    async function refreshStorageStatus() {
        if (!storageStatus) return;
        if (!navigator.storage?.persisted) {
            storageStatus.textContent = 'Trình duyệt tự quản lý';
            if (persistStorageBtn) persistStorageBtn.hidden = true;
            return;
        }
        try {
            const persisted = await navigator.storage.persisted();
            storageStatus.textContent = persisted ? 'Đã ưu tiên lưu bền vững' : 'Đang dùng lưu trữ tiêu chuẩn';
            if (persistStorageBtn) {
                persistStorageBtn.disabled = persisted;
                persistStorageBtn.textContent = persisted ? '✓ Đã bảo vệ dữ liệu' : '🛡️ Bảo vệ dữ liệu';
            }
        } catch (error) {
            storageStatus.textContent = 'Không kiểm tra được';
        }
    }

    async function requestPersistentStorage() {
        if (!navigator.storage?.persist) {
            notify('Trình duyệt này không hỗ trợ yêu cầu lưu trữ bền vững', 'info');
            return;
        }
        try {
            const granted = await navigator.storage.persist();
            await refreshStorageStatus();
            notify(granted
                ? '✅ Trình duyệt đã ưu tiên giữ dữ liệu Sổ Tay Giáo Viên trên thiết bị này'
                : 'Trình duyệt chưa cấp chế độ lưu bền vững; dữ liệu vẫn được lưu bình thường trên máy', granted ? 'success' : 'info');
        } catch (error) {
            notify('Không thể yêu cầu chế độ lưu trữ bền vững: ' + error.message, 'error');
        }
    }

    async function refreshAppCache() {
        if (!confirm('Làm mới bộ nhớ ứng dụng?\n\nDữ liệu năm học, TKB, PPCT và API key KHÔNG bị xóa. Chỉ cache file giao diện/JavaScript được tải lại từ website.')) return;
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.filter(key => key.startsWith(APP_CACHE_PREFIX)).map(key => caches.delete(key)));
            }
            if (registration) await registration.update();
            notify('✅ Đã làm mới bộ nhớ ứng dụng. Trang sẽ tải lại phiên bản hiện tại.', 'success');
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            notify('Không thể làm mới bộ nhớ ứng dụng: ' + error.message, 'error');
        }
    }

    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            if (cacheStatus) cacheStatus.textContent = 'Trình duyệt không hỗ trợ PWA';
            return;
        }
        if (!window.isSecureContext) {
            if (cacheStatus) cacheStatus.textContent = 'Cần HTTPS';
            if (settingsNote) settingsNote.textContent = 'PWA cần HTTPS. Khi đưa lên GitHub Pages, tính năng này sẽ tự hoạt động.';
            return;
        }
        try {
            registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
            await refreshCacheStatus();
            if (registration.waiting) showUpdateAvailable();

            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateAvailable();
                    }
                    if (worker.state === 'activated') refreshCacheStatus();
                });
            });

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (reloadingForUpdate) return;
                reloadingForUpdate = true;
                window.location.reload();
            });
        } catch (error) {
            console.warn('Không thể đăng ký Service Worker:', error);
            if (cacheStatus) cacheStatus.textContent = 'Chưa kích hoạt';
        }
    }

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        setInstallButtons(!isStandalone());
    });
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        setInstallButtons(false);
        updateAppMode();
        notify('✅ Sổ Tay Giáo Viên đã được cài như ứng dụng', 'success');
    });
    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);

    installBtn?.addEventListener('click', promptInstall);
    installSettingsBtn?.addEventListener('click', promptInstall);
    updateBtn?.addEventListener('click', applyWaitingUpdate);
    applyUpdateBtn?.addEventListener('click', applyWaitingUpdate);
    dismissUpdateBtn?.addEventListener('click', hideUpdateAvailable);
    checkUpdateBtn?.addEventListener('click', async () => {
        if (!registration) {
            notify('PWA chưa sẵn sàng; hãy tải lại trang qua HTTPS rồi thử lại', 'info');
            return;
        }
        checkUpdateBtn.disabled = true;
        const previous = checkUpdateBtn.textContent;
        checkUpdateBtn.textContent = 'Đang kiểm tra…';
        try {
            await registration.update();
            if (registration.waiting) showUpdateAvailable();
            else notify('✅ Đang dùng phiên bản ứng dụng mới nhất', 'success');
        } catch (error) {
            notify('Không thể kiểm tra cập nhật: ' + error.message, 'error');
        } finally {
            checkUpdateBtn.disabled = false;
            checkUpdateBtn.textContent = previous;
        }
    });
    refreshCacheBtn?.addEventListener('click', refreshAppCache);
    persistStorageBtn?.addEventListener('click', requestPersistentStorage);

    updateNetworkState();
    updateAppMode();
    refreshStorageStatus();
    registerServiceWorker();
})();
