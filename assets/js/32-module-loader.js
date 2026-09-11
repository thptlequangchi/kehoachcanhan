/* ============================================================================
   SỔ TAY GIÁO VIÊN v52.6 — FEATURE MODULE LOADER
   Giữ phần lõi khởi động nhanh; tải báo cáo/liên kết/chẩn đoán khi thực sự cần.
   ============================================================================ */
(() => {
    const registry = {
        reports: ['assets/js/19-report-center.js', 'assets/js/25-profile-package.js'],
        links: ['assets/js/22-links-center.js'],
        diagnostics: ['assets/js/21-health-check.js', 'assets/js/24-storage-center.js', 'assets/js/27-regression-tests.js'],
    };
    const loaded = new Set();
    const pending = new Map();
    const stats = { startedAt: performance?.now?.() || Date.now(), requests: [], loaded: [] };

    function loadScript(src) {
        if (loaded.has(src)) return Promise.resolve(src);
        if (pending.has(src)) return pending.get(src);
        const promise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[data-lazy-module="${src}"]`);
            if (existing) {
                if (existing.dataset.loaded === '1') { loaded.add(src); resolve(src); return; }
                existing.addEventListener('load', () => resolve(src), { once: true });
                existing.addEventListener('error', () => reject(new Error(`Không tải được ${src}`)), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.dataset.lazyModule = src;
            script.addEventListener('load', () => {
                script.dataset.loaded = '1'; loaded.add(src); pending.delete(src); stats.loaded.push({ src, at: Date.now() }); resolve(src);
            }, { once: true });
            script.addEventListener('error', () => { pending.delete(src); reject(new Error(`Không tải được ${src}`)); }, { once: true });
            document.body.appendChild(script);
        });
        pending.set(src, promise);
        return promise;
    }

    async function ensureGroup(group) {
        const sources = registry[group] || [];
        if (!sources.length) return true;
        stats.requests.push({ group, at: Date.now() });
        for (const src of sources) await loadScript(src);
        if (group === 'reports') {
            window.initReportCenter?.(); window.renderReportCenter?.();
            window.initProfilePackageCenter?.(); window.renderProfilePackageCenter?.();
        } else if (group === 'links') {
            window.initLinkCenter?.(); window.renderLinkCenter?.();
        } else if (group === 'diagnostics') {
            window.initHealthCenter?.(); window.initStorageCenter?.(); window.initRegressionTestCenter?.();
        }
        return true;
    }

    function idle(callback, timeout = 4500) {
        if ('requestIdleCallback' in window) return requestIdleCallback(callback, { timeout });
        return setTimeout(callback, Math.min(timeout, 1800));
    }

    function openBrowserSmoke() {
        const url = new URL(location.href);
        url.searchParams.set('smoke', '1');
        window.open(url.href, '_blank', 'noopener');
    }

    document.addEventListener('click', event => {
        const tab = event.target.closest?.('.tab-btn[data-tab]')?.dataset?.tab;
        if (tab === 'reports') ensureGroup('reports').catch(console.error);
        if (tab === 'links') ensureGroup('links').catch(console.error);
        const id = event.target.closest?.('[id]')?.id || '';
        if (id === 'runBrowserSmokeBtn') { event.preventDefault(); openBrowserSmoke(); return; }
        if (/Health|Regression|Storage|Diagnostic|health|regression|storage/.test(id)) ensureGroup('diagnostics').catch(console.error);
    }, true);

    if (new URLSearchParams(location.search).get('smoke') === '1') {
        loadScript('assets/js/33-browser-smoke.js').catch(console.error);
    }

    window.addEventListener('teacher-notebook:init-complete', () => {
        stats.initCompletedAt = performance?.now?.() || Date.now();
        // Chỉ chuẩn bị chẩn đoán khi trình duyệt rảnh; không chặn màn hình Hôm nay.
        if (!window.teacherNotebookStableGuard?.safeMode) idle(() => ensureGroup('diagnostics').catch(() => {}), 7000);
    }, { once: true });

    window.teacherNotebookModules = { ensureGroup, loadScript, stats, registry };
})();
