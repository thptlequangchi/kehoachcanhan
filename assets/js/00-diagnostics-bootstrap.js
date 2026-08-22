/* ============================================================================
   SỔ TAY GIÁO VIÊN v43 — DIAGNOSTICS BOOTSTRAP
   Nạp trước các module khác để ghi nhận lỗi khởi động/tài nguyên sớm nhất có thể.
   Không lưu API key, mật khẩu hoặc nội dung dữ liệu nghiệp vụ.
   ============================================================================ */
(() => {
    const LOG_KEY = 'teacher_diagnostic_log_v1';
    const QUARANTINE_KEY = 'teacher_corrupt_quarantine_v1';
    const MAX_LOGS = 50;
    const MAX_QUARANTINE = 10;
    const MAX_TEXT = 2400;
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const safeText = value => {
        let text = String(value ?? '');
        // Không để khóa Gemini hoặc token dài vô tình lọt vào báo cáo kỹ thuật.
        text = text.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
        text = text.replace(/Bearer\s+[A-Za-z0-9._~+\/-]{16,}/gi, 'Bearer [REDACTED]');
        return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + '…' : text;
    };

    const readList = key => {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_) {
            return [];
        }
    };

    const writeList = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (_) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (_) { /* noop */ }
            return false;
        }
    };

    const diagnostics = window.__teacherNotebookDiagnostics = window.__teacherNotebookDiagnostics || {
        sessionId,
        startedAt: new Date().toISOString(),
        errors: [],
        resources: [],
    };

    function record(kind, message, meta = {}) {
        const entry = {
            at: new Date().toISOString(),
            sessionId,
            kind: safeText(kind || 'runtime'),
            message: safeText(message || 'Lỗi không xác định'),
            source: safeText(meta.source || ''),
            line: Number(meta.line) || 0,
            column: Number(meta.column) || 0,
            stack: safeText(meta.stack || ''),
        };
        diagnostics.errors.push(entry);
        if (diagnostics.errors.length > MAX_LOGS) diagnostics.errors.splice(0, diagnostics.errors.length - MAX_LOGS);
        const persisted = [...readList(LOG_KEY), entry].slice(-MAX_LOGS);
        writeList(LOG_KEY, persisted);
        window.dispatchEvent(new CustomEvent('teacher-notebook:diagnostic-error', { detail: entry }));
        return entry;
    }

    window.teacherNotebookRecordError = function (kind, error, meta = {}) {
        const message = error?.message || error || meta.message || 'Lỗi không xác định';
        return record(kind, message, {
            ...meta,
            stack: error?.stack || meta.stack || '',
        });
    };

    window.teacherNotebookGetDiagnosticLog = function () {
        const current = diagnostics.errors || [];
        const persisted = readList(LOG_KEY);
        const merged = [...persisted, ...current];
        const seen = new Set();
        return merged.filter(item => {
            const key = `${item.at}|${item.kind}|${item.message}|${item.source}|${item.line}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(-MAX_LOGS);
    };

    window.teacherNotebookClearDiagnosticLog = function () {
        diagnostics.errors = [];
        try { localStorage.removeItem(LOG_KEY); } catch (_) { /* noop */ }
        try { sessionStorage.removeItem(LOG_KEY); } catch (_) { /* noop */ }
        window.dispatchEvent(new CustomEvent('teacher-notebook:diagnostic-log-cleared'));
    };

    window.teacherNotebookQuarantineStorage = function (key, raw, error) {
        try {
            const list = readList(QUARANTINE_KEY);
            list.push({
                at: new Date().toISOString(),
                key: safeText(key),
                error: safeText(error?.message || error || 'JSON không hợp lệ'),
                rawPreview: safeText(String(raw || '').slice(0, 30000)),
                originalLength: String(raw || '').length,
            });
            writeList(QUARANTINE_KEY, list.slice(-MAX_QUARANTINE));
        } catch (_) { /* không để quarantine làm hỏng startup */ }
    };

    window.teacherNotebookGetQuarantine = function () { return readList(QUARANTINE_KEY).slice(-MAX_QUARANTINE); };
    window.teacherNotebookClearQuarantine = function () {
        try { localStorage.removeItem(QUARANTINE_KEY); } catch (_) { /* noop */ }
    };

    window.addEventListener('error', event => {
        if (event.target && event.target !== window) {
            const source = event.target.src || event.target.href || event.target.tagName || '';
            diagnostics.resources.push({ at: new Date().toISOString(), source: safeText(source), ok: false });
            record('resource', `Không tải được tài nguyên: ${source || 'không xác định'}`, { source });
            return;
        }
        record('javascript', event.message || 'JavaScript error', {
            source: event.filename || '',
            line: event.lineno,
            column: event.colno,
            stack: event.error?.stack || '',
        });
    }, true);

    window.addEventListener('unhandledrejection', event => {
        const reason = event.reason;
        record('promise', reason?.message || reason || 'Unhandled Promise rejection', {
            stack: reason?.stack || '',
        });
    });
})();
