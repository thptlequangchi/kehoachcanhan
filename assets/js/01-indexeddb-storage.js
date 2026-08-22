/* ============================================================================
   SỔ TAY GIÁO VIÊN v47.0 — STORAGE PRO / INDEXEDDB
   - LocalStorage giữ cấu hình nhỏ + bản an toàn của năm học đang mở.
   - IndexedDB giữ các năm học khác, cache nhận dạng và checkpoint dung lượng lớn.
   - Luôn có fallback về localStorage nếu IndexedDB không khả dụng.
   ============================================================================ */
(() => {
    const DB_NAME = 'teacher-notebook-storage';
    const DB_VERSION = 1;
    const WORKSPACE_STORE = 'workspaces';
    const CACHE_STORE = 'recognitionCache';
    const BACKUP_STORE = 'backups';
    const META_STORE = 'meta';
    const YEAR_INDEX_KEY = 'teacher_year_workspace_index_v1';
    const HEALTH_RECOVERY_KEY = 'teacher_health_recovery_checkpoint_v1';
    const MIGRATION_MARKER = 'teacher_indexeddb_migration_v1';
    const BACKUP_KEYS = [PRE_RESTORE_BACKUP_KEY, PRE_CLOUD_SYNC_BACKUP_KEY, HEALTH_RECOVERY_KEY];

    const runtime = {
        available: typeof indexedDB !== 'undefined',
        ready: false,
        initializing: null,
        db: null,
        error: '',
        migratedAt: '',
    };

    function nowIso() { return new Date().toISOString(); }
    function jsonBytes(value) {
        try { return new Blob([JSON.stringify(value)]).size; }
        catch (_) { return 0; }
    }
    function recordError(kind, error, extra = {}) {
        console.warn(`[Storage Pro] ${kind}:`, error);
        window.teacherNotebookRecordError?.('indexeddb', error, { source: kind, ...extra });
    }

    function openDb() {
        if (!runtime.available) return Promise.reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
        if (runtime.db) return Promise.resolve(runtime.db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(WORKSPACE_STORE)) db.createObjectStore(WORKSPACE_STORE, { keyPath: 'key' });
                if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
                if (!db.objectStoreNames.contains(BACKUP_STORE)) db.createObjectStore(BACKUP_STORE, { keyPath: 'key' });
                if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' });
            };
            request.onsuccess = () => {
                runtime.db = request.result;
                runtime.db.onversionchange = () => {
                    try { runtime.db.close(); } catch (_) { /* noop */ }
                    runtime.db = null;
                    runtime.ready = false;
                };
                resolve(runtime.db);
            };
            request.onerror = () => reject(request.error || new Error('Không mở được IndexedDB'));
            request.onblocked = () => reject(new Error('IndexedDB đang bị một tab khác giữ phiên bản cũ'));
        });
    }

    async function withStore(storeName, mode, executor) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            let settled = false;
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            let result;
            try { result = executor(store, tx); }
            catch (error) { reject(error); return; }
            tx.oncomplete = () => { if (!settled) { settled = true; resolve(result); } };
            tx.onerror = () => { if (!settled) { settled = true; reject(tx.error || new Error(`Lỗi IndexedDB: ${storeName}`)); } };
            tx.onabort = () => { if (!settled) { settled = true; reject(tx.error || new Error(`Giao dịch IndexedDB bị hủy: ${storeName}`)); } };
        });
    }

    async function putRecord(storeName, key, value, meta = {}) {
        const record = { key, value, updatedAt: nowIso(), bytes: jsonBytes(value), ...meta };
        await withStore(storeName, 'readwrite', store => { store.put(record); });
        return record;
    }

    async function getRecord(storeName, key) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error(`Không đọc được ${key}`));
        });
    }

    async function getAllRecords(storeName) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
            request.onerror = () => reject(request.error || new Error(`Không đọc được ${storeName}`));
        });
    }

    async function deleteRecord(storeName, key) {
        await withStore(storeName, 'readwrite', store => { store.delete(key); });
        return true;
    }

    async function clearStore(storeName) {
        await withStore(storeName, 'readwrite', store => { store.clear(); });
        return true;
    }

    function compactLocalWorkspaces() {
        if (!runtime.ready || !state?.selectedAcademicYear) return false;
        const active = state.yearWorkspaces?.[state.selectedAcademicYear];
        if (!active) return false;
        const compact = { [state.selectedAcademicYear]: active };
        const saved = writeStoredJSON(YEAR_WORKSPACES_STORAGE, compact);
        try {
            const index = Object.entries(state.yearWorkspaces || {}).map(([academicYear, workspace]) => ({
                academicYear,
                active: academicYear === state.selectedAcademicYear,
                bytes: jsonBytes(workspace),
                updatedAt: nowIso(),
            }));
            localStorage.setItem(YEAR_INDEX_KEY, JSON.stringify(index));
        } catch (_) { /* index chỉ là metadata */ }
        return saved;
    }

    async function saveWorkspace(academicYear, workspace) {
        const year = typeof normalizeAcademicYear === 'function' ? normalizeAcademicYear(academicYear) : String(academicYear || '');
        if (!year || !workspace) throw new Error('Workspace không hợp lệ');
        return putRecord(WORKSPACE_STORE, year, workspace, { academicYear: year });
    }

    async function saveAllWorkspaces(workspaces = state?.yearWorkspaces || {}) {
        const entries = Object.entries(workspaces || {}).filter(([, workspace]) => workspace && typeof workspace === 'object');
        for (const [academicYear, workspace] of entries) await saveWorkspace(academicYear, workspace);
        await putRecord(META_STORE, 'workspace-index', entries.map(([academicYear, workspace]) => ({ academicYear, bytes: jsonBytes(workspace) })));
        return entries.length;
    }

    async function hydrateWorkspaces() {
        // V46 lưu tất cả năm trong localStorage; lần đầu v47 sẽ đưa chúng sang IndexedDB.
        const localEntries = Object.entries(state?.yearWorkspaces || {});
        if (localEntries.length) await saveAllWorkspaces(Object.fromEntries(localEntries));
        const records = await getAllRecords(WORKSPACE_STORE);
        records.forEach(record => {
            const year = typeof normalizeAcademicYear === 'function' ? normalizeAcademicYear(record.key) : record.key;
            if (!year || !record.value) return;
            if (!state.yearWorkspaces[year]) {
                state.yearWorkspaces[year] = typeof normalizeYearWorkspace === 'function'
                    ? normalizeYearWorkspace(record.value)
                    : record.value;
            }
        });
        return records.length;
    }

    async function migrateRecognitionCache() {
        const localCache = state?.recognitionCache && typeof state.recognitionCache === 'object' ? state.recognitionCache : {};
        for (const [key, entry] of Object.entries(localCache)) {
            if (entry) await putRecord(CACHE_STORE, key, entry, { savedAt: entry.savedAt || nowIso() });
        }
        const records = await getAllRecords(CACHE_STORE);
        const recent = records
            .filter(record => record?.value)
            .sort((a, b) => String(b.value?.savedAt || b.updatedAt || '').localeCompare(String(a.value?.savedAt || a.updatedAt || '')))
            .slice(0, 20);
        state.recognitionCache = Object.fromEntries(recent.map(record => [record.key, record.value]));
        if (records.length || Object.keys(localCache).length) localStorage.removeItem(RECOGNITION_CACHE_KEY);
        return recent.length;
    }

    async function saveRecognitionEntry(key, entry) {
        if (!key || !entry) return false;
        try {
            await putRecord(CACHE_STORE, key, entry, { savedAt: entry.savedAt || nowIso() });
            const all = await getAllRecords(CACHE_STORE);
            if (all.length > 20) {
                const stale = all.sort((a,b) => String(b.value?.savedAt || b.updatedAt || '').localeCompare(String(a.value?.savedAt || a.updatedAt || ''))).slice(20);
                for (const record of stale) await deleteRecord(CACHE_STORE, record.key);
            }
            localStorage.removeItem(RECOGNITION_CACHE_KEY);
            return true;
        } catch (error) {
            recordError('save-recognition', error);
            try { writeStoredJSON(RECOGNITION_CACHE_KEY, state.recognitionCache || {}); } catch (_) { /* noop */ }
            return false;
        }
    }

    async function clearRecognitionCache() {
        try { await clearStore(CACHE_STORE); } catch (error) { recordError('clear-recognition', error); }
        localStorage.removeItem(RECOGNITION_CACHE_KEY);
        return true;
    }

    async function migrateBackupKey(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
            const value = JSON.parse(raw);
            await putRecord(BACKUP_STORE, key, value, { exportedAt: value?.exportedAt || nowIso() });
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            recordError('migrate-backup', error, { key });
            return false;
        }
    }

    async function setBackup(key, value) {
        if (!key || !value) return false;
        if (runtime.ready) {
            try {
                await putRecord(BACKUP_STORE, key, value, { exportedAt: value?.exportedAt || nowIso() });
                localStorage.removeItem(key);
                return true;
            } catch (error) { recordError('set-backup', error, { key }); }
        }
        return writeStoredJSON(key, value);
    }

    async function getBackup(key) {
        if (runtime.ready) {
            try {
                const record = await getRecord(BACKUP_STORE, key);
                if (record?.value) return record.value;
            } catch (error) { recordError('get-backup', error, { key }); }
        }
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch (error) { recordError('get-backup-local', error, { key }); return null; }
    }

    async function hasBackup(key) { return Boolean(await getBackup(key)); }

    async function removeBackup(key) {
        try { if (runtime.ready) await deleteRecord(BACKUP_STORE, key); }
        catch (error) { recordError('remove-backup', error, { key }); }
        localStorage.removeItem(key);
        return true;
    }

    async function migrateBackups() {
        let count = 0;
        for (const key of BACKUP_KEYS) if (await migrateBackupKey(key)) count++;
        return count;
    }

    function localStorageBytes() {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i) || '';
                const value = localStorage.getItem(key) || '';
                total += new Blob([key, value]).size;
            }
        } catch (_) { /* noop */ }
        return total;
    }

    async function stats() {
        const result = {
            available: runtime.available,
            ready: runtime.ready,
            error: runtime.error,
            localBytes: localStorageBytes(),
            workspaceCount: 0,
            workspaceBytes: 0,
            cacheCount: 0,
            cacheBytes: 0,
            backupCount: 0,
            backupBytes: 0,
            totalIndexedBytes: 0,
        };
        if (!runtime.ready) return result;
        try {
            const [workspaces, cache, backups] = await Promise.all([
                getAllRecords(WORKSPACE_STORE), getAllRecords(CACHE_STORE), getAllRecords(BACKUP_STORE)
            ]);
            result.workspaceCount = workspaces.length;
            result.workspaceBytes = workspaces.reduce((sum, item) => sum + (Number(item.bytes) || jsonBytes(item.value)), 0);
            result.cacheCount = cache.length;
            result.cacheBytes = cache.reduce((sum, item) => sum + (Number(item.bytes) || jsonBytes(item.value)), 0);
            result.backupCount = backups.length;
            result.backupBytes = backups.reduce((sum, item) => sum + (Number(item.bytes) || jsonBytes(item.value)), 0);
            result.totalIndexedBytes = result.workspaceBytes + result.cacheBytes + result.backupBytes;
        } catch (error) {
            result.error = error.message;
            recordError('stats', error);
        }
        return result;
    }

    async function optimize() {
        if (!runtime.ready) await initialize();
        await saveAllWorkspaces(state?.yearWorkspaces || {});
        for (const [key, entry] of Object.entries(state?.recognitionCache || {})) await saveRecognitionEntry(key, entry);
        compactLocalWorkspaces();
        localStorage.setItem(MIGRATION_MARKER, nowIso());
        return stats();
    }

    async function initialize() {
        if (runtime.initializing) return runtime.initializing;
        runtime.initializing = (async () => {
            if (!runtime.available) {
                runtime.error = 'Trình duyệt không hỗ trợ IndexedDB; đang dùng LocalStorage.';
                return runtime;
            }
            try {
                await openDb();
                runtime.ready = true;
                await hydrateWorkspaces();
                await migrateRecognitionCache();
                await migrateBackups();
                compactLocalWorkspaces();
                runtime.migratedAt = nowIso();
                try { localStorage.setItem(MIGRATION_MARKER, runtime.migratedAt); } catch (_) { /* noop */ }
                window.dispatchEvent(new CustomEvent('teacher-notebook:storage-ready'));
            } catch (error) {
                runtime.ready = false;
                runtime.error = error.message || String(error);
                recordError('initialize', error);
            }
            return runtime;
        })();
        return runtime.initializing;
    }

    // Hàm đồng bộ cho các module cũ: local giữ năm đang mở; IndexedDB ghi toàn bộ ở nền.
    window.persistYearWorkspacesHybrid = function persistYearWorkspacesHybrid(workspaces = state?.yearWorkspaces || {}) {
        if (!runtime.ready) return writeStoredJSON(YEAR_WORKSPACES_STORAGE, workspaces);
        const activeYear = state?.selectedAcademicYear;
        const activeWorkspace = activeYear ? workspaces?.[activeYear] : null;
        const localPayload = activeYear && activeWorkspace ? { [activeYear]: activeWorkspace } : workspaces;
        const localOk = writeStoredJSON(YEAR_WORKSPACES_STORAGE, localPayload);
        const savePromise = activeYear && activeWorkspace
            ? saveWorkspace(activeYear, activeWorkspace)
            : saveAllWorkspaces(workspaces);
        savePromise.then(() => compactLocalWorkspaces()).catch(error => {
            recordError('persist-workspace-active', error);
            // Nếu IndexedDB lỗi giữa chừng, quay lại lưu đầy đủ bằng localStorage khi còn đủ chỗ.
            try { writeStoredJSON(YEAR_WORKSPACES_STORAGE, workspaces); } catch (_) { /* noop */ }
        });
        return localOk;
    };

    // Dùng khi Restore/Recovery thay đổi đồng thời nhiều năm học.
    window.persistAllYearWorkspacesHybrid = function persistAllYearWorkspacesHybrid(workspaces = state?.yearWorkspaces || {}) {
        if (!runtime.ready) return writeStoredJSON(YEAR_WORKSPACES_STORAGE, workspaces);
        const activeYear = state?.selectedAcademicYear;
        const activeWorkspace = activeYear ? workspaces?.[activeYear] : null;
        const localPayload = activeYear && activeWorkspace ? { [activeYear]: activeWorkspace } : workspaces;
        const localOk = writeStoredJSON(YEAR_WORKSPACES_STORAGE, localPayload);
        saveAllWorkspaces(workspaces).then(() => compactLocalWorkspaces()).catch(error => {
            recordError('persist-workspaces-all', error);
            try { writeStoredJSON(YEAR_WORKSPACES_STORAGE, workspaces); } catch (_) { /* noop */ }
        });
        return localOk;
    };

    window.teacherNotebookIndexedDB = {
        DB_NAME,
        DB_VERSION,
        get available() { return runtime.available; },
        get ready() { return runtime.ready; },
        get error() { return runtime.error; },
        initialize,
        optimize,
        stats,
        saveWorkspace,
        saveAllWorkspaces,
        compactLocalWorkspaces,
        saveRecognitionEntry,
        clearRecognitionCache,
        setBackup,
        getBackup,
        hasBackup,
        removeBackup,
        _getAllRecords: getAllRecords,
    };
})();
