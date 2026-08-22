/* ============================================================================
   SỔ TAY GIÁO VIÊN v47.0 — TRUNG TÂM LƯU TRỮ NHIỀU NĂM
   ============================================================================ */
(() => {
    const byId = id => document.getElementById(id);
    let initialized = false;

    function bytes(value) {
        const n = Number(value) || 0;
        if (n < 1024) return `${n} B`;
        if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
        if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
        return `${(n / 1024 ** 3).toFixed(2)} GB`;
    }

    async function browserUsageText() {
        if (!navigator.storage?.estimate) return 'Không có thống kê quota';
        try {
            const estimate = await navigator.storage.estimate();
            const usage = Number(estimate.usage) || 0;
            const quota = Number(estimate.quota) || 0;
            return quota ? `${bytes(usage)} / ${bytes(quota)} · ${Math.round(usage / quota * 100)}%` : bytes(usage);
        } catch (_) { return 'Không đọc được quota'; }
    }

    async function renderStorageCenter(message = '') {
        const api = window.teacherNotebookIndexedDB;
        const engine = byId('storageProEngine');
        const years = byId('storageProYears');
        const cache = byId('storageProCache');
        const backups = byId('storageProBackups');
        const usage = byId('storageProUsage');
        const note = byId('storageProStatus');
        if (!api) {
            if (engine) engine.textContent = 'LocalStorage';
            if (note) note.textContent = 'Module IndexedDB chưa được tải; dữ liệu vẫn dùng cơ chế cũ.';
            return;
        }
        const stats = await api.stats();
        if (engine) {
            engine.textContent = stats.ready ? 'IndexedDB · đang hoạt động' : stats.available ? 'IndexedDB · chưa sẵn sàng' : 'LocalStorage fallback';
            engine.className = stats.ready ? 'storage-pro-value good' : 'storage-pro-value warn';
        }
        if (years) years.textContent = `${stats.workspaceCount} năm · ${bytes(stats.workspaceBytes)}`;
        if (cache) cache.textContent = `${stats.cacheCount} ảnh · ${bytes(stats.cacheBytes)}`;
        if (backups) backups.textContent = `${stats.backupCount} checkpoint · ${bytes(stats.backupBytes)}`;
        if (usage) usage.textContent = `${await browserUsageText()} · local ${bytes(stats.localBytes)}`;
        if (note) {
            note.textContent = message || (stats.ready
                ? 'Năm học đang mở vẫn có bản local an toàn; các năm khác, cache nhận dạng và checkpoint lớn được chuyển sang IndexedDB.'
                : `Đang dùng LocalStorage dự phòng${stats.error ? ` · ${stats.error}` : ''}.`);
        }
    }

    async function optimizeStorage() {
        const btn = byId('storageProOptimizeBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Đang tối ưu…'; }
        try {
            const api = window.teacherNotebookIndexedDB;
            if (!api) throw new Error('IndexedDB chưa sẵn sàng');
            await api.optimize();
            await renderStorageCenter('✅ Đã đồng bộ toàn bộ năm học vào IndexedDB và thu gọn bản local về năm đang mở.');
            if (typeof refreshHealthCenterSummary === 'function') refreshHealthCenterSummary();
            showToast('✅ Đã tối ưu bộ nhớ nhiều năm', 'success');
        } catch (error) {
            window.teacherNotebookRecordError?.('storage-optimize', error);
            await renderStorageCenter(`⚠️ Chưa tối ưu được: ${error.message}`);
            showToast('⚠️ Không thể tối ưu bộ nhớ: ' + error.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '⚡ Tối ưu bộ nhớ'; }
        }
    }

    async function clearOcrCache() {
        if (!confirm('Xóa cache nhận dạng ảnh đã lưu trong IndexedDB? Kế hoạch, TKB, PPCT và lịch báo giảng không bị xóa.')) return;
        try {
            state.recognitionCache = {};
            await window.teacherNotebookIndexedDB?.clearRecognitionCache();
            localStorage.removeItem(RECOGNITION_CACHE_KEY);
            await renderStorageCenter('Đã xóa cache nhận dạng ảnh. Dữ liệu năm học không thay đổi.');
            setRecognitionRuntime?.('Đã xóa nhớ ảnh');
            showToast('✅ Đã dọn cache nhận dạng ảnh', 'success');
        } catch (error) {
            showToast('❌ Không thể dọn cache: ' + error.message, 'error');
        }
    }

    function initStorageCenter() {
        if (initialized) return;
        initialized = true;
        byId('storageProOptimizeBtn')?.addEventListener('click', optimizeStorage);
        byId('storageProCheckBtn')?.addEventListener('click', () => renderStorageCenter('Đã cập nhật thống kê kho dữ liệu.'));
        byId('storageProClearOcrBtn')?.addEventListener('click', clearOcrCache);
        window.addEventListener('teacher-notebook:storage-ready', () => renderStorageCenter());
        window.addEventListener('teacher-data-changed', () => {
            clearTimeout(initStorageCenter._timer);
            initStorageCenter._timer = setTimeout(() => renderStorageCenter(), 500);
        });
        renderStorageCenter();
    }

    window.initStorageCenter = initStorageCenter;
    window.renderStorageCenter = renderStorageCenter;
})();
