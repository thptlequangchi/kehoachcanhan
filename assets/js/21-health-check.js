/* ============================================================================
   SỔ TAY GIÁO VIÊN v47.0 — TRUNG TÂM KIỂM TRA SỨC KHỎE & CHẨN ĐOÁN
   Chỉ đọc trạng thái hệ thống. Không tự sửa hoặc gửi dữ liệu ra ngoài.
   ============================================================================ */
(() => {
    const LAST_BACKUP_KEY = 'teacher_last_backup_at_v1';
    const HEALTH_RECOVERY_CHECKPOINT = 'teacher_health_recovery_checkpoint_v1';
    const byId = id => document.getElementById(id);
    let initialized = false;
    let lastReport = null;

    const statusIcon = status => ({ pass:'✅', warn:'⚠️', error:'❌', info:'ℹ️', pending:'…' }[status] || 'ℹ️');
    const statusWeight = status => ({ pass: 100, warn: 60, error: 0 }[status]);
    const clean = value => String(value ?? '').replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
    const safeDate = value => {
        const date = value ? new Date(value) : null;
        return date && !Number.isNaN(date.getTime()) ? date : null;
    };
    const formatDateTime = value => {
        const date = safeDate(value);
        return date ? date.toLocaleString('vi-VN') : 'Chưa có';
    };
    const bytes = value => {
        const n = Number(value) || 0;
        if (n < 1024) return `${n} B`;
        if (n < 1024 ** 2) return `${(n/1024).toFixed(1)} KB`;
        if (n < 1024 ** 3) return `${(n/1024**2).toFixed(1)} MB`;
        return `${(n/1024**3).toFixed(2)} GB`;
    };

    function add(results, id, label, status, summary, detail = '') {
        results.push({ id, label, status, summary: clean(summary), detail: clean(detail) });
    }

    function getDataCountsSafe() {
        try {
            if (typeof backupDataCounts === 'function') return backupDataCounts();
        } catch (_) { /* noop */ }
        return {
            years: Object.keys(state?.yearWorkspaces || {}).length,
            plans: Array.isArray(state?.planData) ? state.planData.length : 0,
            timetables: Object.keys(state?.timetablesByWeek || {}).length,
            schedules: Object.values(state?.teachingSchedule || {}).filter(Array.isArray).filter(items => items.length).length,
            curriculum: Array.isArray(state?.curriculumProfiles) ? state.curriculumProfiles.length : 0,
            workItems: Array.isArray(state?.workItems) ? state.workItems.length : 0,
        };
    }

    function quickHealthResults() {
        const results = [];
        const initErrors = window.__teacherNotebookInitErrors || [];
        add(results, 'app', 'Ứng dụng', typeof APP_VERSION === 'string' ? 'pass' : 'error',
            typeof APP_VERSION === 'string' ? `v${APP_VERSION} · schema ${DATA_SCHEMA_VERSION}` : 'Không đọc được phiên bản ứng dụng');
        add(results, 'init', 'Khởi động', initErrors.length ? 'error' : (window.__teacherNotebookInitCompleted ? 'pass' : 'warn'),
            initErrors.length ? `${initErrors.length} module khởi tạo báo lỗi` : (window.__teacherNotebookInitCompleted ? 'Hoàn tất không lỗi' : 'Đang hoàn tất khởi động'));

        let localOk = false;
        try {
            const key = `__teacher_health_${Date.now()}`;
            localStorage.setItem(key, 'ok');
            localOk = localStorage.getItem(key) === 'ok';
            localStorage.removeItem(key);
        } catch (_) { localOk = false; }
        add(results, 'storage', 'Local storage', localOk ? 'pass' : 'error', localOk ? 'Đọc/ghi bình thường' : 'Không thể đọc/ghi dữ liệu trên máy');

        const selectedYear = typeof normalizeAcademicYear === 'function' ? normalizeAcademicYear(state?.selectedAcademicYear) : state?.selectedAcademicYear;
        const workspace = selectedYear ? state?.yearWorkspaces?.[selectedYear] : null;
        add(results, 'year', 'Năm học', selectedYear && workspace ? 'pass' : 'error',
            selectedYear && workspace ? `${selectedYear} · workspace hợp lệ` : 'Không tìm thấy workspace của năm học đang chọn');

        const week1 = workspace?.week1Start;
        if (!week1) add(results, 'week1', 'Mốc Tuần 1', 'warn', 'Chưa thiết lập Thứ 2 bắt đầu Tuần 1');
        else {
            const monday = typeof isMondayISODate === 'function' ? isMondayISODate(week1) : true;
            add(results, 'week1', 'Mốc Tuần 1', monday ? 'pass' : 'error', monday ? `Đã đặt ${week1}` : `Ngày ${week1} không phải Thứ 2`);
        }

        const migrationKey = typeof getActiveDataSchemaStorageKey === 'function' ? getActiveDataSchemaStorageKey() : '';
        const migrationVersion = migrationKey ? Number.parseInt(localStorage.getItem(migrationKey), 10) || 0 : 0;
        add(results, 'schema', 'Schema dữ liệu', migrationVersion >= Number(DATA_SCHEMA_VERSION) ? 'pass' : 'warn',
            migrationKey ? `Đang ở schema ${migrationVersion || 0}/${DATA_SCHEMA_VERSION}` : `Schema ${DATA_SCHEMA_VERSION}`,
            migrationVersion < Number(DATA_SCHEMA_VERSION) ? 'Migration sẽ được thử lại ở lần khởi động/chuyển năm học tiếp theo.' : '');

        const quarantine = window.teacherNotebookGetQuarantine?.() || [];
        add(results, 'quarantine', 'Dữ liệu lỗi cách ly', quarantine.length ? 'warn' : 'pass',
            quarantine.length ? `${quarantine.length} mục JSON lỗi đã được giữ bản xem trước` : 'Không phát hiện dữ liệu JSON hỏng');

        const diagnosticLog = window.teacherNotebookGetDiagnosticLog?.() || [];
        const recentSession = diagnosticLog.filter(item => item.sessionId === window.__teacherNotebookDiagnostics?.sessionId);
        add(results, 'runtime', 'Lỗi kỹ thuật phiên này', recentSession.length ? 'warn' : 'pass',
            recentSession.length ? `${recentSession.length} lỗi/tài nguyên cần xem nhật ký` : 'Chưa ghi nhận lỗi runtime');

        const tesseractOk = Boolean(window.Tesseract?.createWorker);
        add(results, 'ocr', 'OCR Tesseract', tesseractOk ? 'pass' : (navigator.onLine ? 'error' : 'warn'),
            tesseractOk ? 'Thư viện OCR đã sẵn sàng' : 'Tesseract chưa được tải');
        add(results, 'document-libs', 'Word / Excel', window.mammoth && window.XLSX ? 'pass' : 'warn',
            window.mammoth && window.XLSX ? 'Mammoth + XLSX đã sẵn sàng' : 'Thiếu Mammoth hoặc XLSX');

        const key = String(state?.apiKey || '');
        if (state?.dailyQuotaBlocked) add(results, 'gemini', 'Gemini', 'warn', 'API có key nhưng đang hết hạn mức · OCR sẽ thay thế');
        else if (state?.apiValidated) add(results, 'gemini', 'Gemini', 'pass', 'API key đã được xác thực trong phiên');
        else if (key.length >= 20) add(results, 'gemini', 'Gemini', 'warn', 'Đã có API key nhưng chưa xác thực trong phiên');
        else add(results, 'gemini', 'Gemini', 'info', 'Chưa dùng API key · OCR trên máy vẫn khả dụng');

        const account = state?.account || {};
        if (account.accessMode !== 'group') {
            add(results, 'firebase', 'Firebase / Firestore', 'info', 'Đang ở chế độ cá nhân · cloud không bắt buộc');
        } else if (account.status === 'error') {
            add(results, 'firebase', 'Firebase / Firestore', 'error', account.errorMessage || 'Cloud đang báo lỗi');
        } else if (!account.firebaseReady) {
            add(results, 'firebase', 'Firebase / Firestore', 'warn', 'Đang kết nối hoặc chưa sẵn sàng');
        } else if (!account.user) {
            add(results, 'firebase', 'Firebase / Firestore', 'warn', 'Firebase sẵn sàng nhưng chưa đăng nhập');
        } else if (account.profile?.status !== 'active') {
            add(results, 'firebase', 'Firebase / Firestore', 'warn', 'Tài khoản chưa ở trạng thái hoạt động');
        } else if (['error','conflict'].includes(account.cloudStatus)) {
            add(results, 'firebase', 'Firebase / Firestore', 'error', account.cloudStatusMessage || 'Đồng bộ cloud có lỗi/xung đột');
        } else {
            add(results, 'firebase', 'Firebase / Firestore', 'pass', account.cloudStatusMessage || 'Đã kết nối và có hồ sơ hoạt động');
        }

        add(results, 'network', 'Kết nối mạng', navigator.onLine ? 'pass' : 'info', navigator.onLine ? 'Đang Online' : 'Đang ngoại tuyến · phần local vẫn dùng được');

        const lastBackup = safeDate(localStorage.getItem(LAST_BACKUP_KEY));
        if (!lastBackup) add(results, 'backup', 'Sao lưu gần nhất', 'warn', 'Chưa ghi nhận lần sao lưu file nào');
        else {
            const ageDays = Math.floor((Date.now() - lastBackup.getTime()) / 86400000);
            add(results, 'backup', 'Sao lưu gần nhất', ageDays <= 14 ? 'pass' : 'warn', `${formatDateTime(lastBackup)} · ${ageDays} ngày trước`);
        }

        return results;
    }


    async function indexedDbResult(results) {
        const api = window.teacherNotebookIndexedDB;
        if (!api) {
            add(results, 'indexeddb', 'IndexedDB / dữ liệu nhiều năm', 'warn', 'Module Storage Pro chưa được tải');
            return;
        }
        try {
            const stats = await api.stats();
            const status = stats.ready ? 'pass' : stats.available ? 'warn' : 'info';
            add(results, 'indexeddb', 'IndexedDB / dữ liệu nhiều năm', status,
                stats.ready ? `${stats.workspaceCount} năm · ${stats.cacheCount} cache · ${stats.backupCount} checkpoint` : 'Đang dùng LocalStorage dự phòng',
                stats.error || 'Năm đang mở có bản local an toàn; dữ liệu lớn được tách khỏi LocalStorage.');
        } catch (error) {
            add(results, 'indexeddb', 'IndexedDB / dữ liệu nhiều năm', 'warn', 'Không đọc được thống kê IndexedDB', error.message);
        }
    }

    async function storageEstimateResult(results) {
        if (!navigator.storage?.estimate) {
            add(results, 'quota', 'Dung lượng trình duyệt', 'info', 'Trình duyệt không cung cấp thống kê dung lượng');
            return;
        }
        try {
            const estimate = await navigator.storage.estimate();
            const usage = Number(estimate.usage) || 0;
            const quota = Number(estimate.quota) || 0;
            const ratio = quota ? usage / quota : 0;
            const status = ratio >= .85 ? 'error' : ratio >= .70 ? 'warn' : 'pass';
            add(results, 'quota', 'Dung lượng trình duyệt', status,
                quota ? `${bytes(usage)} / ${bytes(quota)} (${Math.round(ratio*100)}%)` : `${bytes(usage)} đang dùng`);
        } catch (error) {
            add(results, 'quota', 'Dung lượng trình duyệt', 'warn', 'Không đọc được dung lượng', error.message);
        }
    }

    async function persistentStorageResult(results) {
        if (!navigator.storage?.persisted) {
            add(results, 'persistent', 'Lưu trữ bền vững', 'info', 'Trình duyệt tự quản lý');
            return;
        }
        try {
            const persisted = await navigator.storage.persisted();
            add(results, 'persistent', 'Lưu trữ bền vững', persisted ? 'pass' : 'warn', persisted ? 'Đã được ưu tiên giữ dữ liệu' : 'Chưa được trình duyệt cấp ưu tiên');
        } catch (error) {
            add(results, 'persistent', 'Lưu trữ bền vững', 'warn', 'Không kiểm tra được', error.message);
        }
    }

    async function pwaResult(results) {
        if (!('serviceWorker' in navigator)) {
            add(results, 'pwa', 'PWA / Service Worker', 'warn', 'Trình duyệt không hỗ trợ Service Worker');
            return;
        }
        if (!window.isSecureContext) {
            add(results, 'pwa', 'PWA / Service Worker', 'warn', 'Cần HTTPS/localhost để kích hoạt');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.getRegistration('./');
            const controller = navigator.serviceWorker.controller;
            add(results, 'pwa', 'PWA / Service Worker', registration ? 'pass' : 'warn',
                registration ? `${controller ? 'Đang điều khiển trang' : 'Đã đăng ký, chờ lần tải tiếp theo'}${registration.waiting ? ' · có bản cập nhật chờ' : ''}` : 'Chưa đăng ký Service Worker');
        } catch (error) {
            add(results, 'pwa', 'PWA / Service Worker', 'warn', 'Không kiểm tra được Service Worker', error.message);
        }
    }

    async function assetResult(results) {
        if (!navigator.onLine) {
            add(results, 'assets', 'Tệp hệ thống', 'info', 'Đang offline · bỏ qua kiểm tra server, dùng app-shell đã cache');
            return;
        }
        const refs = new Set();
        document.querySelectorAll('script[src^="assets/"], link[href^="assets/"]').forEach(node => {
            const ref = node.getAttribute('src') || node.getAttribute('href');
            if (ref) refs.add(ref);
        });
        refs.add('manifest.webmanifest');
        refs.add('service-worker.js');
        const list = [...refs];
        let ok = 0;
        const failed = [];
        for (const ref of list) {
            try {
                const url = new URL(ref, location.href);
                url.searchParams.set('__health', String(APP_VERSION));
                const response = await fetch(url.href, { cache: 'no-store' });
                if (response.ok) ok++;
                else failed.push(`${ref} (${response.status})`);
            } catch (error) {
                failed.push(`${ref} (${error.message})`);
            }
        }
        add(results, 'assets', 'Tệp hệ thống', failed.length ? 'error' : 'pass',
            failed.length ? `${failed.length}/${list.length} tệp không đọc được` : `${ok}/${list.length} tệp lõi có mặt trên server`, failed.slice(0,4).join(' · '));
    }

    function computeOverall(results) {
        const scored = results.filter(item => typeof statusWeight(item.status) === 'number');
        const score = scored.length ? Math.round(scored.reduce((sum,item) => sum + statusWeight(item.status), 0) / scored.length) : 100;
        const errors = results.filter(item => item.status === 'error').length;
        const warnings = results.filter(item => item.status === 'warn').length;
        return {
            score,
            errors,
            warnings,
            level: errors ? 'error' : warnings ? 'warn' : 'good',
            label: errors ? `Có ${errors} lỗi` : warnings ? `${warnings} cảnh báo` : 'Hệ thống tốt',
        };
    }

    function renderResults(report) {
        const resultsEl = byId('healthCheckResults');
        const badge = byId('healthOverallStatus');
        const meta = byId('healthRunMeta');
        const counts = report.counts;
        if (badge) {
            badge.className = `health-overall-badge ${report.overall.level}`;
            badge.textContent = `${report.overall.label} · ${report.overall.score}%`;
        }
        if (meta) meta.textContent = `Kiểm tra lúc ${formatDateTime(report.checkedAt)} · ${report.results.length} hạng mục · báo cáo không chứa API key.`;
        if (resultsEl) {
            resultsEl.innerHTML = report.results.map(item => `
                <div class="health-result ${item.status}">
                    <div class="health-result-icon" aria-hidden="true">${statusIcon(item.status)}</div>
                    <div class="health-result-copy"><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.summary)}${item.detail ? `<br>${escapeHTML(item.detail)}` : ''}</span></div>
                </div>`).join('');
        }
        const map = {
            healthSummaryApp: `v${APP_VERSION}`,
            healthSummaryData: `${counts.years} năm · ${counts.plans} KH · ${counts.timetables} TKB`,
            healthSummaryCloud: state?.account?.accessMode === 'group' ? (state.account.cloudStatusMessage || 'Đang kiểm tra') : 'Chế độ cá nhân',
            healthSummaryErrors: `${report.logCount} lỗi lưu · ${report.quarantineCount} dữ liệu cách ly`,
        };
        Object.entries(map).forEach(([id,value]) => { const el=byId(id); if(el) el.textContent=value; });
        renderDiagnosticLog();
        refreshSafeRecoveryButton();
    }

    function renderDiagnosticLog() {
        const list = window.teacherNotebookGetDiagnosticLog?.() || [];
        const logEl = byId('healthErrorLog');
        const countEl = byId('healthErrorCount');
        const quarantine = window.teacherNotebookGetQuarantine?.() || [];
        if (countEl) countEl.textContent = `${list.length} lỗi · ${quarantine.length} dữ liệu cách ly`;
        if (!logEl) return;
        if (!list.length) {
            logEl.innerHTML = '<div class="health-empty">✅ Chưa có lỗi kỹ thuật nào trong nhật ký.</div>';
            return;
        }
        logEl.innerHTML = [...list].reverse().slice(0, 12).map(item => `
            <div class="health-log-entry"><strong>${escapeHTML(item.kind || 'runtime')} · ${escapeHTML(formatDateTime(item.at))}</strong><span>${escapeHTML(item.message || '')}</span>${item.source ? `<span>${escapeHTML(item.source)}${item.line ? `:${item.line}` : ''}</span>` : ''}</div>`).join('');
    }

    async function newestRecoveryCandidate() {
        const candidates = [
            ['Trước lần khôi phục gần nhất', PRE_RESTORE_BACKUP_KEY],
            ['Trước đồng bộ Firebase đầu tiên', PRE_CLOUD_SYNC_BACKUP_KEY],
        ];
        const valid = [];
        for (const [label,key] of candidates) {
            try {
                const payload = window.teacherNotebookIndexedDB
                    ? await window.teacherNotebookIndexedDB.getBackup(key)
                    : readStoredJSON(key, null);
                if (!payload) continue;
                const normalized = normalizeBackupPayload(payload);
                valid.push({ label, key, payload: normalized, date: safeDate(normalized.exportedAt) || new Date(0) });
            } catch (_) { /* bỏ checkpoint lỗi */ }
        }
        valid.sort((a,b) => b.date - a.date);
        return valid[0] || null;
    }

    async function refreshSafeRecoveryButton() {
        const button = byId('healthSafeRecoveryBtn');
        const note = byId('healthRecoveryNote');
        if (!button || !note) return;
        const candidate = await newestRecoveryCandidate();
        button.disabled = !candidate;
        note.textContent = candidate
            ? `Có bản an toàn: “${candidate.label}” · ${formatDateTime(candidate.payload.exportedAt)}. Chỉ khôi phục khi dữ liệu hiện tại có vấn đề.`
            : 'Chưa có bản sao an toàn tự động. Hãy dùng “Sao lưu dữ liệu” để tạo file dự phòng định kỳ.';
    }

    async function runHealthCheck(options = {}) {
        const runBtn = byId('runHealthCheckBtn');
        const badge = byId('healthOverallStatus');
        const meta = byId('healthRunMeta');
        if (runBtn) { runBtn.disabled = true; runBtn.textContent = 'Đang kiểm tra…'; }
        if (badge) { badge.className = 'health-overall-badge running'; badge.textContent = 'Đang kiểm tra…'; }
        if (meta) meta.textContent = 'Đang kiểm tra dữ liệu, PWA, thư viện và tệp triển khai…';
        const results = quickHealthResults();
        await Promise.all([storageEstimateResult(results), persistentStorageResult(results), pwaResult(results), indexedDbResult(results)]);
        if (options.assets !== false) await assetResult(results);
        const counts = getDataCountsSafe();
        const log = window.teacherNotebookGetDiagnosticLog?.() || [];
        const quarantine = window.teacherNotebookGetQuarantine?.() || [];
        lastReport = {
            appVersion: typeof APP_VERSION === 'string' ? APP_VERSION : 'unknown',
            schemaVersion: typeof DATA_SCHEMA_VERSION !== 'undefined' ? DATA_SCHEMA_VERSION : 'unknown',
            checkedAt: new Date().toISOString(),
            academicYear: state?.selectedAcademicYear || '',
            online: navigator.onLine,
            results,
            counts,
            logCount: log.length,
            quarantineCount: quarantine.length,
            overall: computeOverall(results),
            recentErrors: log.slice(-10),
        };
        renderResults(lastReport);
        if (runBtn) { runBtn.disabled = false; runBtn.textContent = '🩺 Kiểm tra hệ thống'; }
        return lastReport;
    }

    function reportText(report = lastReport) {
        if (!report) return 'Chưa chạy kiểm tra hệ thống.';
        const lines = [
            'SỔ TAY GIÁO VIÊN — BÁO CÁO CHẨN ĐOÁN',
            `Phiên bản: v${report.appVersion} · schema ${report.schemaVersion}`,
            `Thời điểm: ${formatDateTime(report.checkedAt)}`,
            `Năm học: ${report.academicYear || 'chưa xác định'}`,
            `Mạng: ${report.online ? 'Online' : 'Ngoại tuyến'}`,
            `Tổng trạng thái: ${report.overall.label} · điểm ${report.overall.score}%`,
            `Dữ liệu: ${report.counts.years} năm · ${report.counts.plans} kế hoạch · ${report.counts.timetables} TKB · ${report.counts.schedules} báo giảng · ${report.counts.curriculum} PPCT`,
            '',
            'CÁC HẠNG MỤC:',
            ...report.results.map(item => `${statusIcon(item.status)} ${item.label}: ${item.summary}${item.detail ? ` — ${item.detail}` : ''}`),
            '',
            `NHẬT KÝ: ${report.logCount} lỗi đã lưu · ${report.quarantineCount} dữ liệu JSON cách ly`,
            ...report.recentErrors.map(item => `- ${formatDateTime(item.at)} [${item.kind}] ${clean(item.message)}${item.source ? ` @ ${clean(item.source)}${item.line ? `:${item.line}` : ''}` : ''}`),
            '',
            'Báo cáo không chứa API key hoặc mật khẩu.',
        ];
        return lines.join('\n');
    }

    async function copyReport() {
        if (!lastReport) await runHealthCheck({ assets: false });
        const text = reportText();
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
            else prompt('Sao chép báo cáo:', text);
            showToast('✅ Đã sao chép báo cáo chẩn đoán', 'success');
        } catch (_) {
            prompt('Sao chép báo cáo:', text);
        }
    }

    function downloadReport() {
        if (!lastReport) return runHealthCheck({ assets: false }).then(downloadReport);
        const blob = new Blob([reportText()], { type: 'text/plain;charset=utf-8' });
        downloadBlobFile(blob, `so-tay-giao-vien-chan-doan-v${APP_VERSION}-${new Date().toISOString().slice(0,10)}.txt`);
    }

    function exportQuarantine() {
        const data = window.teacherNotebookGetQuarantine?.() || [];
        if (!data.length) { showToast('Không có dữ liệu lỗi đang cách ly', 'info'); return; }
        const blob = new Blob([JSON.stringify({ exportedAt:new Date().toISOString(), entries:data }, null, 2)], { type:'application/json;charset=utf-8' });
        downloadBlobFile(blob, `du-lieu-loi-cach-ly-${new Date().toISOString().slice(0,10)}.json`);
        showToast('✅ Đã xuất dữ liệu lỗi cách ly để kiểm tra', 'success');
    }

    async function safeRecovery() {
        const candidate = await newestRecoveryCandidate();
        if (!candidate) { showToast('Chưa có bản sao an toàn để khôi phục', 'info'); return; }
        const counts = backupDataCounts(candidate.payload);
        if (!confirm(`Khôi phục bản “${candidate.label}” (${formatDateTime(candidate.payload.exportedAt)})?\n\nBản này có ${counts.years} năm học, ${counts.plans} kế hoạch, ${counts.timetables} TKB và ${counts.schedules} tuần báo giảng.\n\nDữ liệu hiện tại sẽ được lưu thành checkpoint khẩn cấp trước khi thay thế.`)) return;
        try {
            const current = createBackupPayload();
            const stored = window.teacherNotebookIndexedDB
                ? await window.teacherNotebookIndexedDB.setBackup(HEALTH_RECOVERY_CHECKPOINT, current)
                : writeStoredJSON(HEALTH_RECOVERY_CHECKPOINT, current);
            if (!stored) throw new Error('Không đủ bộ nhớ để tạo checkpoint khẩn cấp');
            applyBackupPayload(candidate.payload);
            updateDataSafetySummary();
            showToast('✅ Đã khôi phục bản sao an toàn. Dữ liệu trước khôi phục vẫn được giữ ở checkpoint khẩn cấp.', 'success');
            setTimeout(() => runHealthCheck({ assets:false }), 100);
        } catch (error) {
            window.teacherNotebookRecordError?.('health-recovery', error);
            showToast('❌ Không thể khôi phục an toàn: ' + error.message, 'error');
        }
    }

    function initHealthCenter() {
        if (initialized) return;
        initialized = true;
        byId('runHealthCheckBtn')?.addEventListener('click', () => runHealthCheck({ assets:true }));
        byId('copyHealthReportBtn')?.addEventListener('click', copyReport);
        byId('downloadHealthReportBtn')?.addEventListener('click', downloadReport);
        byId('healthClearLogBtn')?.addEventListener('click', () => {
            window.teacherNotebookClearDiagnosticLog?.();
            renderDiagnosticLog();
            showToast('Đã xóa nhật ký kỹ thuật trên thiết bị này', 'info');
        });
        byId('healthExportQuarantineBtn')?.addEventListener('click', exportQuarantine);
        byId('healthSafeRecoveryBtn')?.addEventListener('click', safeRecovery);
        window.addEventListener('teacher-notebook:diagnostic-error', renderDiagnosticLog);
        window.addEventListener('teacher-notebook:diagnostic-log-cleared', renderDiagnosticLog);
        window.addEventListener('teacher-notebook:init-complete', () => runHealthCheck({ assets:false }));
        renderDiagnosticLog();
        refreshSafeRecoveryButton();
    }

    function refreshHealthCenterSummary() {
        if (!initialized) initHealthCenter();
        return runHealthCheck({ assets:false });
    }

    window.initHealthCenter = initHealthCenter;
    window.refreshHealthCenterSummary = refreshHealthCenterSummary;
    window.runTeacherNotebookHealthCheck = runHealthCheck;
})();
