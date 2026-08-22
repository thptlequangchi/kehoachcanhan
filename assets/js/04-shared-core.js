/* ============================================================================
   SỔ TAY GIÁO VIÊN v50.3 — SHARED CORE
   Hợp nhất các quy tắc dùng chung giữa Overview / Trợ lý tuần / Dashboard /
   Sổ Công Việc / Reminder / Report mà không thay đổi schema dữ liệu.
============================================================================ */

function isScheduleFinalized(meta) {
    const status = cleanText(meta?.status).toLowerCase();
    return ['final', 'finalized'].includes(status) && !Boolean(meta?.stale);
}

function getWeekOperationalStatus(week) {
    const normalizedWeek = Number.parseInt(week, 10);
    const validWeek = normalizedWeek > 0 && normalizedWeek <= MAX_SCHOOL_WEEKS;
    const hasPlan = validWeek && Boolean(state.planData?.some(item => Number(item?.week) === normalizedWeek));
    const timetable = validWeek ? (state.timetablesByWeek?.[normalizedWeek] || null) : null;
    const hasTimetable = Boolean(timetable);
    const schedule = validWeek && Array.isArray(state.teachingSchedule?.[normalizedWeek])
        ? state.teachingSchedule[normalizedWeek] : [];
    const hasSchedule = schedule.length > 0;
    const meta = validWeek
        ? (typeof getScheduleMeta === 'function' ? getScheduleMeta(normalizedWeek) : (state.scheduleMeta?.[normalizedWeek] || {}))
        : {};
    const stale = Boolean(hasSchedule && meta?.stale);
    const finalized = Boolean(hasSchedule && isScheduleFinalized(meta));

    let stateKey = 'empty';
    let label = 'Chưa có dữ liệu';
    if (stale) {
        stateKey = 'stale';
        label = 'Lịch cần tạo lại';
    } else if (finalized) {
        stateKey = 'finalized';
        label = 'Đã chốt';
    } else if (hasSchedule) {
        stateKey = 'draft';
        label = 'Lịch bản nháp';
    } else if (hasPlan && hasTimetable) {
        stateKey = 'ready';
        label = 'Đủ nguồn, chưa tạo báo giảng';
    } else if (hasPlan || hasTimetable) {
        stateKey = 'partial';
        label = hasPlan ? 'Có kế hoạch, thiếu TKB' : 'Có TKB, thiếu kế hoạch';
    }

    return {
        week: validWeek ? normalizedWeek : null,
        hasPlan,
        timetable,
        hasTimetable,
        schedule,
        hasSchedule,
        meta,
        stale,
        finalized,
        stateKey,
        label,
    };
}

function teachingSessionOrder(session) {
    const text = normalizeSessionLabel(session || '');
    if (text === 'Buổi sáng') return 1;
    if (text === 'Buổi chiều') return 2;
    return 3;
}

function getTodayTeachingItems(week, dayLabel) {
    const timetable = state.timetablesByWeek?.[week];
    if (!timetable?.sessions) return [];
    const items = [];
    timetable.sessions.forEach(session => {
        (session.periods || []).forEach(period => {
            (period.cells || []).forEach(cell => {
                if (normalizeDayName(cell?.day) !== dayLabel) return;
                items.push({
                    session: session.label || normalizeSessionLabel(session.key),
                    period: Number.parseInt(period.period, 10) || 0,
                    className: cleanText(cell.className),
                    subject: cleanText(cell.subject || cell.content),
                });
            });
        });
    });
    return items.sort((a, b) => teachingSessionOrder(a.session) - teachingSessionOrder(b.session) || a.period - b.period);
}

function getPendingWorkTasks(todayIso = '') {
    const personal = normalizeWorkItems(state.workItems, 'personal');
    const shared = typeof sharedWorkScopeAvailable === 'function' && sharedWorkScopeAvailable()
        ? normalizeWorkItems(state.sharedWorkItems, 'shared') : [];
    return [...personal, ...shared]
        .filter(item => item.type === 'task' && !item.completed)
        .sort((a, b) => {
            const ad = a.dueDate || '9999-12-31';
            const bd = b.dueDate || '9999-12-31';
            return ad.localeCompare(bd) || Number(b.pinned) - Number(a.pinned);
        })
        .map(item => ({ ...item, overdue: Boolean(todayIso && item.dueDate && item.dueDate < todayIso) }));
}

function classifyProgressRows(courseRows) {
    const rows = Array.isArray(courseRows) ? courseRows : [];
    const onTrackRows = rows.filter(row => ['ontrack', 'ahead', 'completed'].includes(row?.status));
    const attentionRows = rows.filter(row => row?.status === 'behind' || row?.status === 'missing' || row?.forecastState === 'risk')
        .sort((a, b) => {
            const aDanger = Number(a?.status === 'behind' || a?.forecastState === 'risk');
            const bDanger = Number(b?.status === 'behind' || b?.forecastState === 'risk');
            return bDanger - aDanger || (a?.difference ?? 0) - (b?.difference ?? 0);
        });
    return { courseRows: rows, onTrackRows, attentionRows };
}

function buildProgressAttentionSnapshot(referenceWeek) {
    const normalizedWeek = Math.max(1, Math.min(MAX_SCHOOL_WEEKS, Number.parseInt(referenceWeek, 10) || 1));
    if (typeof buildProgressCourseCatalog !== 'function' || typeof buildCourseProgressRow !== 'function') {
        return { referenceWeek: normalizedWeek, catalog: [], courseRows: [], onTrackRows: [], attentionRows: [] };
    }
    const catalog = buildProgressCourseCatalog();
    const classified = classifyProgressRows(catalog.map(course => buildCourseProgressRow(course, normalizedWeek)));
    return { referenceWeek: normalizedWeek, catalog, ...classified };
}

function downloadBlobFile(blob, filename, revokeDelay = 1000) {
    if (!blob) throw new Error('Không có dữ liệu để tải');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), revokeDelay);
}

function triggerPrintMode(className = 'print-report-mode', cleanupDelay = 1800) {
    document.body.classList.add(className);
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        document.body.classList.remove(className);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    setTimeout(cleanup, cleanupDelay);
}

const appDataRefreshRegistry = new Map();
let appDataRefreshBound = false;

function registerAppDataRefresh(key, callback, options = {}) {
    if (!key || typeof callback !== 'function') return () => {};
    const entry = {
        callback,
        delay: Math.max(0, Number(options.delay) || 0),
        activeWhen: typeof options.activeWhen === 'function' ? options.activeWhen : null,
        timer: null,
    };
    appDataRefreshRegistry.set(key, entry);

    if (!appDataRefreshBound) {
        appDataRefreshBound = true;
        window.addEventListener('teacher-data-changed', event => {
            appDataRefreshRegistry.forEach((refresh, refreshKey) => {
                if (refresh.activeWhen && !refresh.activeWhen(event)) return;
                if (refresh.timer) clearTimeout(refresh.timer);
                refresh.timer = setTimeout(() => {
                    refresh.timer = null;
                    try {
                        refresh.callback(event);
                    } catch (error) {
                        console.error(`Không thể làm mới module “${refreshKey}”:`, error);
                        window.teacherNotebookRecordError?.('data-refresh', error, { module: refreshKey });
                    }
                }, refresh.delay);
            });
        });
    }

    return () => {
        const current = appDataRefreshRegistry.get(key);
        if (current?.timer) clearTimeout(current.timer);
        appDataRefreshRegistry.delete(key);
    };
}

const appMinuteRefreshRegistry = new Map();
let appMinuteTimer = null;

function runMinuteRefreshers(source = 'timer') {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    appMinuteRefreshRegistry.forEach((entry, key) => {
        if (entry.activeWhen && !entry.activeWhen()) return;
        try {
            entry.callback({ source, at: new Date() });
        } catch (error) {
            console.error(`Không thể cập nhật phút cho module “${key}”:`, error);
            window.teacherNotebookRecordError?.('minute-refresh', error, { module: key });
        }
    });
}

function registerMinuteRefresh(key, callback, options = {}) {
    if (!key || typeof callback !== 'function') return () => {};
    appMinuteRefreshRegistry.set(key, {
        callback,
        activeWhen: typeof options.activeWhen === 'function' ? options.activeWhen : null,
    });
    if (!appMinuteTimer) {
        appMinuteTimer = setInterval(() => runMinuteRefreshers('timer'), 60000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') runMinuteRefreshers('visibility');
        });
    }
    return () => appMinuteRefreshRegistry.delete(key);
}
