// ============================================================================
// UX EXCELLENCE v53.4 — điều hướng, khả dụng, trợ năng, không đổi nghiệp vụ.
// ============================================================================
(() => {
    const LAST_TAB_KEY = 'teacher_notebook_last_tab_v1';
    const VALID_TABS = new Set(['plan','timetable','teaching','gradebook','homeroom','reports','workspace','links']);

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (_) { /* noop */ }
    }

    function activeTabButton() {
        return document.querySelector('.tab-btn.active[data-tab]');
    }

    function activeTabName() {
        return activeTabButton()?.dataset.tab || 'plan';
    }

    function applyTabA11y() {
        document.querySelectorAll('.tab-btn[data-tab]').forEach((button, index) => {
            const tab = button.dataset.tab;
            if (!tab) return;
            if (!button.id) button.id = `main-tab-${tab}`;
            button.setAttribute('tabindex', button.classList.contains('active') ? '0' : '-1');
            const panel = document.getElementById(`tab-${tab}`);
            if (panel) {
                panel.setAttribute('aria-labelledby', button.id);
                panel.setAttribute('tabindex', '0');
            }
        });
    }

    function updateDocumentTitle(tabName = activeTabName()) {
        const button = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (!button) return;
        const label = (button.textContent || '').replace(/\s+/g, ' ').trim();
        document.title = `${label} · Sổ Tay Giáo Viên Pro`;
    }

    function centerActiveTab(button, behavior = 'smooth') {
        try { button?.scrollIntoView({ behavior, block:'nearest', inline:'center' }); } catch (_) { /* noop */ }
    }

    function switchToSavedTab() {
        const hashTab = location.hash.startsWith('#tab-') ? location.hash.slice(5) : '';
        const saved = hashTab || safeGet(LAST_TAB_KEY) || '';
        if (!VALID_TABS.has(saved)) return;
        const button = document.querySelector(`.tab-btn[data-tab="${saved}"]`);
        if (!button || button.classList.contains('active')) return;
        button.click();
        centerActiveTab(button, 'auto');
    }

    function enhanceTabNavigation() {
        const nav = document.getElementById('tabNav');
        if (!nav) return;
        applyTabA11y();
        nav.addEventListener('click', event => {
            const button = event.target.closest('.tab-btn[data-tab]');
            if (!button) return;
            const tab = button.dataset.tab;
            if (!VALID_TABS.has(tab)) return;
            safeSet(LAST_TAB_KEY, tab);
            history.replaceState(null, '', `#tab-${tab}`);
            document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => btn.setAttribute('tabindex', btn === button ? '0' : '-1'));
            updateDocumentTitle(tab);
            centerActiveTab(button);
            // Khi chuyển tab lúc đang ở sâu trong một trang dài, đưa người dùng về đầu vùng nội dung.
            const navTop = nav.offsetTop;
            if (window.scrollY > navTop + 260) {
                window.scrollTo({ top: Math.max(0, navTop - 6), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            }
        });
    }

    function addBackToTop() {
        if (document.querySelector('.ux-back-to-top')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ux-back-to-top';
        button.setAttribute('aria-label', 'Về đầu trang');
        button.title = 'Về đầu trang';
        button.textContent = '↑';
        document.body.appendChild(button);
        const sync = () => {
            const visible = window.scrollY > 650;
            button.classList.toggle('is-visible', visible);
            document.body.classList.toggle('ux-has-scrolled', window.scrollY > 90);
        };
        button.addEventListener('click', () => window.scrollTo({ top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
        window.addEventListener('scroll', sync, { passive:true });
        sync();
    }

    function addAccessibleLabels() {
        const labels = {
            gradebookRosterTextarea:'Danh sách học sinh dán vào Sổ điểm',
            gradebookScoresTextarea:'Bảng điểm dán từ Excel',
            homeroomCustomOfficerLabel:'Tên chức vụ tùy chỉnh',
            homeroomCustomOfficerStudent:'Học sinh giữ chức vụ tùy chỉnh',
            homeroomRosterTextarea:'Danh sách học sinh dán vào Sổ chủ nhiệm',
            workSearchInput:'Tìm công việc',
            externalLinkName:'Tên liên kết',
            externalLinkUrl:'Địa chỉ liên kết',
            workItemCompleted:'Đánh dấu công việc đã hoàn thành',
            globalCommandInput:'Tìm kiếm và chạy lệnh nhanh'
        };
        Object.entries(labels).forEach(([id, label]) => {
            const el = document.getElementById(id);
            if (el && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) el.setAttribute('aria-label', label);
        });
    }

    function enhanceHorizontalScrollHints() {
        const selectors = [
            '.table-wrap','.gradebook-table-wrap','.homeroom-roster-wrap','.homeroom-monitoring-table-wrap',
            '.homeroom-conduct-table-host','.homeroom-rules-table-wrap','.report-table-wrap'
        ];
        const update = el => {
            const overflows = el.scrollWidth > el.clientWidth + 24;
            el.classList.toggle('ux-scrollable', overflows);
            el.classList.toggle('ux-scrolled-x', el.scrollLeft > 16);
        };
        const scan = () => document.querySelectorAll(selectors.join(',')).forEach(el => {
            if (el.dataset.uxScrollBound !== '1') {
                el.dataset.uxScrollBound = '1';
                el.addEventListener('scroll', () => update(el), { passive:true });
            }
            update(el);
        });
        scan();
        const observer = new MutationObserver(() => requestAnimationFrame(scan));
        observer.observe(document.body, { childList:true, subtree:true });
        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(() => scan());
            ro.observe(document.body);
        }
    }

    function cleanVisibleVersionNoise() {
        const brandMeta = document.querySelector('.brand-meta span');
        if (brandMeta && /Pro\s*\d+/i.test(brandMeta.textContent || '')) {
            brandMeta.textContent = 'Sổ Tay Giáo Viên Pro · Gọn · Nhanh · An toàn';
        }
        const storageBadge = document.querySelector('.storage-pro-badge');
        if (storageBadge) storageBadge.textContent = 'Bộ nhớ Pro';
        const healthApp = document.getElementById('healthSummaryApp');
        if (healthApp && /^v?\d/i.test((healthApp.textContent || '').trim())) healthApp.textContent = 'Đang kiểm tra…';
    }

    function improveButtonSemantics() {
        document.querySelectorAll('button[title]:not([aria-label])').forEach(button => {
            const text = (button.textContent || '').replace(/\s+/g,' ').trim();
            if (!text) button.setAttribute('aria-label', button.title);
        });
    }

    function initUxExcellence() {
        document.documentElement.dataset.uxRelease = '53.4';
        cleanVisibleVersionNoise();
        addAccessibleLabels();
        improveButtonSemantics();
        enhanceTabNavigation();
        addBackToTop();
        enhanceHorizontalScrollHints();
        switchToSavedTab();
        applyTabA11y();
        updateDocumentTitle();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUxExcellence, { once:true });
    else initUxExcellence();
})();
