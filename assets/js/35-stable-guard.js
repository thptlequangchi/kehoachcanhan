/* ============================================================================
   SỔ TAY GIÁO VIÊN v53.2 STABLE — SAFE BOOT GUARD
   Nếu cùng một tab khởi động lỗi lặp lại, phiên kế tiếp giảm tải module phụ tự động.
   Không thay đổi dữ liệu nghiệp vụ và không gửi telemetry ra ngoài.
   ============================================================================ */
(() => {
    const STABLE_VERSION = '53.2.0';
    const BOOT_KEY = 'teacher_stable_boot_guard_v1';
    const SAFE_QUERY = new URLSearchParams(location.search).get('safe') === '1';
    const startedAt = Date.now();
    const startedPerf = performance?.now?.() || 0;
    let previous = null;
    try { previous = JSON.parse(sessionStorage.getItem(BOOT_KEY) || 'null'); } catch (_) { previous = null; }
    const previousIncomplete = Boolean(previous?.state === 'booting'
        && previous?.version === STABLE_VERSION
        && startedAt - Number(previous?.at || 0) < 3 * 60 * 1000);
    const failureCount = previousIncomplete ? Number(previous?.failureCount || 0) + 1 : 0;
    const safeMode = SAFE_QUERY || failureCount >= 2;

    function stableStore(value) {
        try { sessionStorage.setItem(BOOT_KEY, JSON.stringify(value)); } catch (_) { /* sessionStorage có thể bị chặn */ }
    }
    function stableErrorMessage(value) {
        const raw = value?.message || value?.reason?.message || value?.reason || value || '';
        return String(raw).slice(0, 240);
    }
    stableStore({ state:'booting', version:STABLE_VERSION, at:startedAt, failureCount, safeMode });
    document.documentElement.dataset.teacherNotebookStable = safeMode ? 'safe' : 'normal';

    window.addEventListener('error', event => {
        stableStore({ state:'booting', version:STABLE_VERSION, at:startedAt, failureCount, safeMode, lastError:stableErrorMessage(event.error || event.message) });
    });
    window.addEventListener('unhandledrejection', event => {
        stableStore({ state:'booting', version:STABLE_VERSION, at:startedAt, failureCount, safeMode, lastError:stableErrorMessage(event.reason) });
    });
    window.addEventListener('teacher-notebook:init-complete', () => {
        const durationMs = Math.max(0, Math.round((performance?.now?.() || 0) - startedPerf));
        const initErrors = (window.__teacherNotebookInitErrors || []).map(item => ({ name:item.name, error:String(item.error || '').slice(0,180) }));
        stableStore({ state:'ready', version:STABLE_VERSION, at:startedAt, readyAt:Date.now(), failureCount:0, safeMode, durationMs, initErrors:initErrors.length });
        window.__teacherNotebookBootReport = {
            version: STABLE_VERSION,
            channel: 'stable',
            safeMode,
            previousIncomplete,
            durationMs,
            initErrors,
            lazyLoaded: window.teacherNotebookModules?.stats?.loaded?.length || 0,
        };
        if (safeMode) setTimeout(() => window.showToast?.('🛡️ v53 đang chạy chế độ khởi động an toàn; module phụ chỉ tải khi thầy mở.', 'info'), 250);
    }, { once:true });

    window.teacherNotebookStableGuard = { version:STABLE_VERSION, safeMode, previousIncomplete, failureCount };
})();
