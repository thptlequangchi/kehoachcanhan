/* ==========================================================================
   SỔ TAY GIÁO VIÊN v49 — BƯỚC 16: NHẮC VIỆC THÔNG MINH & LỊCH CÔNG VIỆC
   - Nhắc theo hạn + ưu tiên, snooze, bỏ qua trong ngày
   - Cảnh báo hệ thống có thể tắt theo loại
   - Lịch tháng: nhiệm vụ + lịch dạy
   - Xuất nhiệm vụ có hạn ra iCalendar (.ics)
   - Thiết lập nhắc là cá nhân trên thiết bị, không đổi schema Firestore
   ========================================================================== */
(() => {
    const REMINDER_PREFS_KEY = 'teacher_work_reminder_prefs_v1';
    const ALERT_SETTINGS_KEY = 'teacher_smart_alert_settings_v1';
    const NOTIFIED_KEY = 'teacher_smart_reminder_notified_v1';
    const CALENDAR_MONTH_KEY = 'teacher_work_calendar_month_v1';
    const CALENDAR_VIEW_KEY = 'teacher_work_calendar_view_v1';
    const REMINDER_FILTER_KEY = 'teacher_work_reminder_filter_v1';
    const MAX_NOTIFIED_KEYS = 120;
    let initialized = false;
    let currentAlerts = [];
    let reminderFilter = ['all','urgent','today','upcoming','system'].includes(localStorage.getItem(REMINDER_FILTER_KEY))
        ? localStorage.getItem(REMINDER_FILTER_KEY) : 'all';
    let calendarAnchor = loadCalendarAnchor();
    let calendarView = localStorage.getItem(CALENDAR_VIEW_KEY) === 'week' ? 'week' : 'month';

    const byId = id => document.getElementById(id);
    const safeArray = value => Array.isArray(value) ? value : [];
    const clean = value => typeof cleanText === 'function' ? cleanText(value) : String(value ?? '').trim();
    const esc = value => typeof escapeHTML === 'function' ? escapeHTML(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

    function safeReadObject(key, fallback = {}) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || 'null');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
        } catch (_) { return fallback; }
    }
    function safeWriteObject(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (_) { return false; }
    }
    function reminderItemKey(item) {
        return `${state?.selectedAcademicYear || ''}|${item?.scope || 'personal'}|${clean(item?.id)}`;
    }
    function alertTodayISO() {
        if (typeof workTodayISO === 'function') return workTodayISO();
        const d = new Date();
        return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
    }
    function parseLocalDateTime(dateValue, timeValue = '') {
        const normalized = typeof normalizeISODate === 'function' ? normalizeISODate(dateValue) : dateValue;
        if (!normalized) return null;
        const [y,m,d] = normalized.split('-').map(Number);
        const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(timeValue || '')) ? String(timeValue) : '08:00';
        const [hh,mm] = time.split(':').map(Number);
        const date = new Date(y,m-1,d,hh,mm,0,0);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    function formatDateTime(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    }
    function getReminderPrefs() { return safeReadObject(REMINDER_PREFS_KEY, {}); }
    function getAlertSettings() {
        const data = safeReadObject(ALERT_SETTINGS_KEY, {});
        return {
            mutedCategories: data.mutedCategories && typeof data.mutedCategories === 'object' ? data.mutedCategories : {},
            snoozed: data.snoozed && typeof data.snoozed === 'object' ? data.snoozed : {},
            dismissedDate: data.dismissedDate && typeof data.dismissedDate === 'object' ? data.dismissedDate : {},
        };
    }
    function saveAlertSettings(value) { safeWriteObject(ALERT_SETTINGS_KEY, value); }
    function getItemReminderPref(item) {
        const prefs = getReminderPrefs();
        const value = prefs[reminderItemKey(item)] || {};
        return {
            lead: ['auto','none','0','30','120','1440','2880'].includes(String(value.lead)) ? String(value.lead) : 'auto',
            snoozeUntil: clean(value.snoozeUntil),
            dismissedDate: clean(value.dismissedDate),
        };
    }
    function setItemReminderPref(item, patch) {
        if (!item?.id) return;
        const prefs = getReminderPrefs();
        const key = reminderItemKey(item);
        prefs[key] = { ...prefs[key], ...patch };
        safeWriteObject(REMINDER_PREFS_KEY, prefs);
    }
    function defaultLeadMinutes(item) {
        if (item?.priority === 'urgent') return 1440;
        if (item?.priority === 'high') return 1440;
        if (item?.priority === 'low') return -1;
        return 0;
    }
    function resolvedLeadMinutes(item, pref) {
        if (pref.lead === 'none') return -1;
        if (pref.lead === 'auto') return defaultLeadMinutes(item);
        const value = Number.parseInt(pref.lead, 10);
        return Number.isFinite(value) ? value : defaultLeadMinutes(item);
    }
    function reminderCategoryFromSuggestion(suggestion) {
        const key = clean(suggestion?.key);
        if (key.includes(':makeup:')) return 'makeup';
        if (key.includes(':backup')) return 'backup';
        if (key.includes(':timetable:')) return 'timetable';
        if (key.includes(':plan:')) return 'plan';
        if (key.includes(':schedule')) return 'schedule';
        if (key.includes(':finalize:')) return 'schedule';
        if (key.includes(':ppct:')) return 'ppct';
        return 'system';
    }
    function categoryLabel(category) {
        return ({plan:'Kế hoạch',timetable:'Thời khóa biểu',schedule:'Báo giảng',makeup:'Học bù',backup:'Sao lưu',ppct:'PPCT',system:'Hệ thống'}[category] || 'Hệ thống');
    }
    function alertPriorityRank(priority) {
        return ({urgent:4,high:3,normal:2,low:1}[priority] || 2);
    }
    function isSystemSuggestionReminderWorthy(suggestion) {
        return ['urgent','high'].includes(clean(suggestion?.priority));
    }
    function getSmartReminderManagedSuggestionKeys() {
        let suggestions = [];
        try { suggestions = typeof buildWorkSystemSuggestions === 'function' ? buildWorkSystemSuggestions() : []; }
        catch (_) { suggestions = []; }
        return new Set(safeArray(suggestions)
            .filter(isSystemSuggestionReminderWorthy)
            .map(item => clean(item?.key))
            .filter(Boolean));
    }
    window.getSmartReminderManagedSuggestionKeys = getSmartReminderManagedSuggestionKeys;

    function buildTaskAlerts(allItems, now = new Date()) {
        const today = alertTodayISO();
        return safeArray(allItems).filter(item => item?.type === 'task' && item.status !== 'done' && item.dueDate).map(item => {
            const dueAt = parseLocalDateTime(item.dueDate, item.dueTime);
            if (!dueAt) return null;
            const pref = getItemReminderPref(item);
            const lead = resolvedLeadMinutes(item, pref);
            if (lead < 0 || pref.dismissedDate === today) return null;
            const snooze = pref.snoozeUntil ? new Date(pref.snoozeUntil) : null;
            if (snooze && !Number.isNaN(snooze.getTime()) && snooze > now) return null;
            const trigger = new Date(dueAt.getTime() - lead * 60000);
            const diffMs = dueAt - now;
            const diffDays = Math.ceil(diffMs / 86400000);
            const overdue = diffMs < 0;
            const active = overdue || now >= trigger;
            const upcoming = !active && diffDays <= 7;
            if (!active && !upcoming) return null;
            const severity = overdue || item.priority === 'urgent' ? 'urgent' : item.priority === 'high' || diffDays <= 1 ? 'high' : 'normal';
            return {
                id:`task:${item.scope || 'personal'}:${item.id}`,
                kind:'task', item, severity,
                bucket: overdue ? 'urgent' : item.dueDate === today ? 'today' : 'upcoming',
                active,
                title:item.title,
                detail:overdue ? `Đã quá hạn · ${formatDateTime(dueAt)}` : active ? `Sắp đến hạn · ${formatDateTime(dueAt)}` : `Sắp tới · ${formatDateTime(dueAt)}`,
                dueAt,
                category:'task',
            };
        }).filter(Boolean);
    }

    function buildSystemAlerts(allItems) {
        const settings = getAlertSettings();
        const now = Date.now();
        const today = alertTodayISO();
        const existingSourceKeys = new Set(safeArray(allItems).map(item => clean(item.sourceKey)).filter(Boolean));
        let suggestions = [];
        try { suggestions = typeof buildWorkSystemSuggestions === 'function' ? buildWorkSystemSuggestions() : []; }
        catch (_) { suggestions = []; }
        return safeArray(suggestions).filter(isSystemSuggestionReminderWorthy).map(suggestion => {
            const category = reminderCategoryFromSuggestion(suggestion);
            if (settings.mutedCategories[category]) return null;
            if (settings.dismissedDate[suggestion.key] === today) return null;
            const snoozeUntil = settings.snoozed[suggestion.key] ? new Date(settings.snoozed[suggestion.key]).getTime() : 0;
            if (snoozeUntil > now) return null;
            const existing = existingSourceKeys.has(clean(suggestion.key));
            if (existing) return null;
            return {
                id:`system:${suggestion.key}`, kind:'system', suggestion, severity:suggestion.priority === 'urgent' ? 'urgent' : suggestion.priority === 'high' ? 'high' : 'normal',
                bucket:'system', active:true, title:suggestion.title, detail:suggestion.content,
                category, categoryLabel:categoryLabel(category), dueAt:parseLocalDateTime(suggestion.dueDate, ''),
            };
        }).filter(Boolean);
    }

    function collectSmartAlerts(allItems) {
        return [...buildTaskAlerts(allItems), ...buildSystemAlerts(allItems)]
            .sort((a,b) => Number(b.active) - Number(a.active)
                || alertPriorityRank(b.severity) - alertPriorityRank(a.severity)
                || (a.dueAt?.getTime?.() || Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime?.() || Number.MAX_SAFE_INTEGER));
    }

    function filterAlerts(alerts) {
        if (reminderFilter === 'all') return alerts;
        if (reminderFilter === 'urgent') return alerts.filter(a => a.severity === 'urgent' || (a.kind === 'task' && a.dueAt < new Date()));
        if (reminderFilter === 'today') return alerts.filter(a => a.bucket === 'today' || (a.kind === 'task' && a.dueAt < new Date()));
        if (reminderFilter === 'upcoming') return alerts.filter(a => a.bucket === 'upcoming');
        if (reminderFilter === 'system') return alerts.filter(a => a.kind === 'system');
        return alerts;
    }

    function renderReminderStats(alerts) {
        const stats = byId('smartReminderStats');
        if (!stats) return;
        const now = new Date();
        const values = {
            urgent: alerts.filter(a => a.severity === 'urgent' || (a.kind === 'task' && a.dueAt < now)).length,
            today: alerts.filter(a => a.bucket === 'today' || (a.kind === 'task' && a.dueAt < now)).length,
            upcoming: alerts.filter(a => a.bucket === 'upcoming').length,
            system: alerts.filter(a => a.kind === 'system').length,
        };
        stats.querySelectorAll('[data-reminder-filter]').forEach(button => {
            const key = button.dataset.reminderFilter;
            const strong = button.querySelector('strong');
            if (strong) strong.textContent = String(values[key] || 0);
            button.classList.toggle('active', reminderFilter === key);
        });
    }

    function reminderIcon(alert) {
        if (alert.kind === 'system') return alert.category === 'backup' ? '💾' : alert.category === 'makeup' ? '🔁' : alert.category === 'ppct' ? '📚' : '⚠️';
        if (alert.severity === 'urgent') return '🔥';
        if (alert.bucket === 'today') return '⏰';
        return '📅';
    }

    function renderReminderList(alerts) {
        const list = byId('smartReminderList');
        const summary = byId('smartReminderSummary');
        if (!list || !summary) return;
        const visible = filterAlerts(alerts).slice(0, 10);
        const activeCount = alerts.filter(a => a.active && a.bucket !== 'upcoming').length;
        const upcomingCount = alerts.filter(a => a.bucket === 'upcoming').length;
        summary.textContent = activeCount ? `${activeCount} việc/cảnh báo cần chú ý${upcomingCount ? ` · ${upcomingCount} việc sắp tới` : ''}` : upcomingCount ? `${upcomingCount} việc sắp tới trong 7 ngày` : 'Không có việc cần nhắc trong 7 ngày tới.';
        if (!visible.length) {
            list.innerHTML = '<div class="smart-reminder-empty"><span>✓</span><div><strong>Không có nhắc việc phù hợp</strong><small>Thầy có thể đổi bộ lọc hoặc thêm hạn cho nhiệm vụ trong Sổ Công Việc.</small></div></div>';
            return;
        }
        list.innerHTML = visible.map(alert => {
            const priority = alert.severity === 'urgent' ? 'Khẩn cấp' : alert.severity === 'high' ? 'Quan trọng' : 'Bình thường';
            return `<article class="smart-reminder-item ${alert.severity} ${alert.bucket}">
                <div class="smart-reminder-item-icon">${reminderIcon(alert)}</div>
                <div class="smart-reminder-item-main">
                    <div class="smart-reminder-item-top"><strong>${esc(alert.title)}</strong><span>${esc(priority)}</span></div>
                    <p>${esc(alert.detail)}</p>
                    <div class="smart-reminder-item-meta">${alert.kind === 'system' ? `<span>🤖 ${esc(alert.categoryLabel)}</span>` : `<span>🗂️ ${alert.item.scope === 'shared' ? 'Nhóm' : 'Cá nhân'}</span>${alert.item.className ? `<span>🏫 ${esc(alert.item.className)}</span>` : ''}${alert.item.subject ? `<span>📘 ${esc(alert.item.subject)}</span>` : ''}`}</div>
                </div>
                <div class="smart-reminder-item-actions">
                    ${alert.kind === 'task' ? '<button class="btn btn-success btn-sm" type="button" data-reminder-action="done">✓ Xong</button>' : '<button class="btn btn-primary btn-sm" type="button" data-reminder-action="add-system">＋ Thêm vào sổ</button>'}
                    <button class="btn btn-outline btn-sm" type="button" data-reminder-action="open">Mở</button>
                    <button class="btn btn-outline btn-sm" type="button" data-reminder-action="snooze">⏱ 1 giờ</button>
                    ${alert.kind === 'system' ? '<button class="smart-reminder-link-btn" type="button" data-reminder-action="mute-category">Tắt loại này</button>' : '<button class="smart-reminder-link-btn" type="button" data-reminder-action="dismiss">Bỏ qua hôm nay</button>'}
                </div>
            </article>`;
        }).join('');
        list.querySelectorAll('.smart-reminder-item').forEach((node,index) => { node.dataset.reminderVisibleIndex = String(index); });
        list.__visibleAlerts = visible;
    }

    function updatePermissionUI() {
        const btn = byId('smartReminderPermissionBtn');
        const note = byId('smartReminderPermissionNote');
        if (!btn || !note) return;
        if (!('Notification' in window)) {
            btn.hidden = true;
            note.textContent = 'Trình duyệt này không hỗ trợ Notification API; nhắc việc trong ứng dụng vẫn hoạt động bình thường.';
            return;
        }
        btn.hidden = false;
        if (Notification.permission === 'granted') {
            btn.textContent = '🔔 Thông báo đã bật'; btn.disabled = true;
            note.textContent = 'Thông báo đã được cấp quyền. Sổ Tay sẽ gửi khi có nhắc việc đến hạn trong lúc ứng dụng đang mở/hoạt động.';
        } else if (Notification.permission === 'denied') {
            btn.textContent = '🔕 Đã chặn thông báo'; btn.disabled = true;
            note.textContent = 'Trình duyệt đang chặn thông báo. Có thể bật lại trong quyền của website; nhắc việc trong ứng dụng vẫn hoạt động.';
        } else {
            btn.textContent = '🔔 Bật thông báo'; btn.disabled = false;
            note.textContent = 'Thông báo chỉ được xin quyền khi thầy bấm nút; Sổ Tay không tự bật quyền trình duyệt.';
        }
    }

    function updateRestoreMutedButton() {
        const btn = byId('smartReminderRestoreBtn');
        if (!btn) return;
        const settings = getAlertSettings();
        const count = Object.values(settings.mutedCategories).filter(Boolean).length;
        btn.hidden = count === 0;
        btn.textContent = count ? `↺ Bật lại ${count} loại` : '↺ Bật lại cảnh báo';
    }

    function updateHeaderBadge(alerts) {
        const badge = byId('smartReminderHeaderBadge');
        const button = byId('smartReminderHeaderBtn');
        if (!badge || !button) return;
        const count = alerts.filter(a => a.active && a.bucket !== 'upcoming').length;
        badge.hidden = count <= 0;
        badge.textContent = count > 99 ? '99+' : String(count);
        button.classList.toggle('has-alerts', count > 0);
        button.title = count ? `${count} việc/cảnh báo cần chú ý` : 'Không có nhắc việc khẩn cấp';
    }

    function renderSmartReminderCenter(allItems = null) {
        const items = allItems || (typeof currentWorkItems === 'function' && typeof normalizeWorkItems === 'function' ? normalizeWorkItems(currentWorkItems(), state.workScope) : []);
        currentAlerts = collectSmartAlerts(items);
        renderReminderStats(currentAlerts);
        renderReminderList(currentAlerts);
        updateHeaderBadge(currentAlerts);
        updatePermissionUI();
        updateRestoreMutedButton();
        maybeNotify(currentAlerts);
    }
    window.renderSmartReminderCenter = renderSmartReminderCenter;

    async function markAlertDone(alert) {
        if (!alert?.item || typeof setWorkTaskStatus !== 'function') return;
        try {
            await setWorkTaskStatus(alert.item, 'done');
            renderSmartReminderCenter();
            if (typeof renderWorkWorkspace === 'function') renderWorkWorkspace();
        } catch (error) { showToast?.('❌ ' + (typeof translateAccountError === 'function' ? translateAccountError(error) : error.message), 'error'); }
    }
    function snoozeAlert(alert, minutes = 60) {
        const until = new Date(Date.now() + minutes * 60000).toISOString();
        if (alert.kind === 'task') setItemReminderPref(alert.item, { snoozeUntil:until, dismissedDate:'' });
        else {
            const settings = getAlertSettings(); settings.snoozed[alert.suggestion.key] = until; saveAlertSettings(settings);
        }
        clearNotifiedForAlert(alert);
        renderSmartReminderCenter();
        showToast?.(`⏱ Sẽ nhắc lại sau ${minutes >= 60 ? Math.round(minutes/60) + ' giờ' : minutes + ' phút'}`, 'info');
    }
    function dismissAlertToday(alert) {
        if (alert.kind !== 'task') return;
        setItemReminderPref(alert.item, { dismissedDate:alertTodayISO(), snoozeUntil:'' });
        renderSmartReminderCenter();
        showToast?.('Đã bỏ qua nhắc việc này trong hôm nay', 'info');
    }
    function muteSystemCategory(alert) {
        if (alert.kind !== 'system') return;
        const settings = getAlertSettings(); settings.mutedCategories[alert.category] = true; saveAlertSettings(settings);
        renderSmartReminderCenter();
        showToast?.(`🔕 Đã tắt cảnh báo “${categoryLabel(alert.category)}”. Có thể bật lại tại Trung tâm nhắc việc.`, 'info');
    }
    function openReminderAlert(alert) {
        if (alert.kind === 'task') {
            if (alert.item.linkTarget && typeof openWorkItemLink === 'function') openWorkItemLink(alert.item);
            else if (typeof openWorkItemEditor === 'function') openWorkItemEditor(alert.item);
            return;
        }
        const s = alert.suggestion;
        if (alert.category === 'backup') { byId('exportBackupBtn')?.click(); return; }
        if (s.linkTarget && typeof openAutomationTarget === 'function') openAutomationTarget(s.linkTarget, s.linkedWeek || 1);
        else if (s.linkTarget === 'reports' && typeof activateOverviewTab === 'function') activateOverviewTab('reports');
        else byId('workSuggestionPanel')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
    async function addSystemAlertToWork(alert) {
        if (alert.kind !== 'system') return;
        if (typeof addWorkSystemSuggestion !== 'function') {
            showToast?.('⚠️ Bộ máy gợi ý chưa sẵn sàng', 'error');
            return;
        }
        await addWorkSystemSuggestion(alert.suggestion, { successMessage:'✅ Đã thêm cảnh báo vào Sổ Công Việc' });
        renderSmartReminderCenter();
    }

    async function handleReminderAction(action, alert) {
        if (!alert) return;
        if (action === 'done') return markAlertDone(alert);
        if (action === 'snooze') return snoozeAlert(alert, 60);
        if (action === 'dismiss') return dismissAlertToday(alert);
        if (action === 'mute-category') return muteSystemCategory(alert);
        if (action === 'open') return openReminderAlert(alert);
        if (action === 'add-system') return addSystemAlertToWork(alert);
    }

    function notifiedKeys() {
        try { const arr = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'); return Array.isArray(arr) ? arr : []; }
        catch (_) { return []; }
    }
    function markNotified(key) {
        const values = [key, ...notifiedKeys().filter(item => item !== key)].slice(0, MAX_NOTIFIED_KEYS);
        try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(values)); } catch (_) { /* noop */ }
    }
    function clearNotifiedForAlert(alert) {
        if (!alert?.id) return;
        const suffix = `|${alert.id}`;
        const values = notifiedKeys().filter(key => !String(key).endsWith(suffix));
        try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(values)); } catch (_) { /* noop */ }
    }
    async function showBrowserNotification(alert) {
        const title = alert.kind === 'system' ? `⚠️ ${alert.title}` : `🔔 ${alert.title}`;
        const options = { body:alert.detail, tag:`teacher-reminder-${alert.id}`, renotify:false, icon:'./assets/icons/icon-192.png', badge:'./assets/icons/icon-192.png' };
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration?.showNotification) { await registration.showNotification(title, options); return; }
            }
            new Notification(title, options);
        } catch (_) { /* Notification errors must never block the app. */ }
    }
    function maybeNotify(alerts) {
        if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState !== 'visible') return;
        const today = alertTodayISO();
        const seen = new Set(notifiedKeys());
        alerts.filter(a => a.active && a.bucket !== 'upcoming' && ['urgent','high'].includes(a.severity)).slice(0,3).forEach(alert => {
            const key = `${today}|${alert.id}`;
            if (seen.has(key)) return;
            markNotified(key);
            showBrowserNotification(alert);
        });
    }
    async function requestNotificationPermission() {
        if (!('Notification' in window)) return;
        try {
            const permission = await Notification.requestPermission();
            updatePermissionUI();
            if (permission === 'granted') {
                showToast?.('🔔 Đã bật thông báo nhắc việc', 'success');
                renderSmartReminderCenter();
            }
        } catch (error) { showToast?.('Không thể yêu cầu quyền thông báo: ' + error.message, 'error'); }
    }

    // ------------------------------------------------------------------
    // Calendar
    // ------------------------------------------------------------------
    function loadCalendarAnchor() {
        const raw = localStorage.getItem(CALENDAR_MONTH_KEY) || '';
        const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(raw);
        if (match) return new Date(Number(match[1]), Number(match[2])-1, Number(match[3] || 1));
        const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    function saveCalendarAnchor() {
        try { localStorage.setItem(CALENDAR_MONTH_KEY, isoFromDate(calendarAnchor)); localStorage.setItem(CALENDAR_VIEW_KEY, calendarView); } catch (_) { /* noop */ }
    }
    function isoFromDate(date) { return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-'); }
    function dateFromWeekDay(week, dayName) {
        if (typeof getWeekDateInfo !== 'function') return null;
        const info = getWeekDateInfo(week); if (!info?.start) return null;
        const normalized = typeof normalizeDayName === 'function' ? normalizeDayName(dayName) : dayName;
        const days = typeof SCHOOL_DAYS !== 'undefined' ? SCHOOL_DAYS : ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
        const idx = days.indexOf(normalized); if (idx < 0) return null;
        const date = new Date(info.start); date.setDate(date.getDate()+idx); date.setHours(0,0,0,0); return date;
    }
    function collectCalendarEvents(allItems) {
        const events = [];
        safeArray(allItems).filter(item => item.type === 'task' && item.dueDate).forEach(item => events.push({
            date:item.dueDate, kind:'task', id:item.id, title:item.title, status:item.status, priority:item.priority,
            time:item.dueTime || '', item,
        }));
        Object.entries(state?.teachingSchedule || {}).forEach(([weekKey, rows]) => {
            const week = Number.parseInt(weekKey,10); if (!(week > 0)) return;
            safeArray(rows).forEach(row => {
                const date = dateFromWeekDay(week, row.day); if (!date) return;
                events.push({ date:isoFromDate(date), kind:'teaching', week, id:row.id || `${week}-${row.day}-${row.period}`, title:row.notTeaching ? `Không học · ${clean(row.class)}` : `${clean(row.class) || 'Lớp'} · ${clean(row.subject) || 'Môn'}`, sub:`${clean(row.session)}${row.period ? ` · Tiết ${row.period}` : ''}`, row });
            });
        });
        return events;
    }
    function calendarGridDates(anchor) {
        const base = calendarView === 'week' ? new Date(anchor) : new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        base.setHours(0,0,0,0);
        const offset = (base.getDay()+6)%7;
        const start = new Date(base); start.setDate(start.getDate()-offset);
        const length = calendarView === 'week' ? 7 : 42;
        return Array.from({length},(_,i)=>{ const d=new Date(start); d.setDate(d.getDate()+i); return d; });
    }
    function eventHtml(event) {
        if (event.kind === 'task') {
            const cls = event.status === 'done' ? 'done' : event.priority === 'urgent' ? 'urgent' : event.priority === 'high' ? 'high' : '';
            return `<button class="work-calendar-event task ${cls}" type="button" data-calendar-task-id="${esc(event.id)}" title="${esc(event.title)}">${event.time ? `<time>${esc(event.time)}</time>` : '<span>☐</span>'}${esc(event.title)}</button>`;
        }
        return `<button class="work-calendar-event teaching ${event.row?.notTeaching ? 'canceled' : ''}" type="button" data-calendar-teaching-week="${event.week}" title="${esc(event.title)} ${esc(event.sub || '')}"><span>${event.row?.notTeaching ? '⏸️' : '📚'}</span>${esc(event.title)}</button>`;
    }
    function renderWorkCalendar(allItems) {
        const host = byId('workItemList'); if (!host) return;
        host.className = 'work-item-list work-calendar-mode';
        const events = collectCalendarEvents(allItems);
        const byDate = new Map();
        events.forEach(event => { if (!byDate.has(event.date)) byDate.set(event.date, []); byDate.get(event.date).push(event); });
        const days = calendarGridDates(calendarAnchor);
        const today = alertTodayISO();
        const month = calendarAnchor.getMonth();
        const monthTitle = calendarView === 'week'
            ? `Tuần ${days[0].toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})} – ${days[days.length-1].toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}`
            : calendarAnchor.toLocaleDateString('vi-VN', {month:'long',year:'numeric'});
        host.innerHTML = `<section class="work-calendar-shell">
            <div class="work-calendar-toolbar">
                <div><span class="work-calendar-kicker">LỊCH CÔNG VIỆC</span><strong>${esc(monthTitle)}</strong><small>Nhiệm vụ có hạn + lịch dạy từ Lịch báo giảng</small></div>
                <div class="work-calendar-actions"><div class="work-calendar-mode-switch"><button type="button" data-calendar-mode="week" class="${calendarView==='week'?'active':''}">Tuần</button><button type="button" data-calendar-mode="month" class="${calendarView==='month'?'active':''}">Tháng</button></div><div class="work-calendar-nav"><button type="button" data-calendar-nav="prev">‹</button><button type="button" data-calendar-nav="today">Hôm nay</button><button type="button" data-calendar-nav="next">›</button></div></div>
            </div>
            <div class="work-calendar-legend"><span><i class="task-dot"></i>Nhiệm vụ</span><span><i class="teaching-dot"></i>Lịch dạy</span><span><i class="canceled-dot"></i>Không học</span></div>
            <div class="work-calendar-weekdays">${['T2','T3','T4','T5','T6','T7','CN'].map(d=>`<span>${d}</span>`).join('')}</div>
            <div class="work-calendar-grid">${days.map(date => {
                const iso = isoFromDate(date); const dayEvents = (byDate.get(iso)||[]).sort((a,b)=>Number(a.kind==='teaching')-Number(b.kind==='teaching')).slice(0,4);
                const extra = Math.max(0,(byDate.get(iso)||[]).length-dayEvents.length);
                return `<div class="work-calendar-day ${calendarView==='month' && date.getMonth()!==month?'outside':''} ${iso===today?'today':''}"><div class="work-calendar-day-head"><span>${date.getDate()}</span>${iso===today?'<em>Hôm nay</em>':''}</div><div class="work-calendar-events">${dayEvents.map(eventHtml).join('')}${extra?`<small class="work-calendar-more">+${extra} mục khác</small>`:''}</div></div>`;
            }).join('')}</div>
        </section>`;
    }
    window.renderWorkCalendar = renderWorkCalendar;

    function changeCalendarMonth(delta) {
        if (calendarView === 'week') { calendarAnchor = new Date(calendarAnchor); calendarAnchor.setDate(calendarAnchor.getDate()+delta*7); }
        else calendarAnchor = new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth()+delta, 1);
        saveCalendarAnchor();
        if (typeof renderWorkWorkspace === 'function') renderWorkWorkspace();
    }
    function goCalendarToday() {
        const now = new Date(); calendarAnchor = calendarView === 'week' ? new Date(now) : new Date(now.getFullYear(),now.getMonth(),1); saveCalendarAnchor();
        if (typeof renderWorkWorkspace === 'function') renderWorkWorkspace();
    }

    // ------------------------------------------------------------------
    // iCalendar export — tasks only (avoids inventing lesson clock times)
    // ------------------------------------------------------------------
    function icsEscape(value) { return String(value ?? '').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
    function icsDate(dateStr) { return String(dateStr || '').replace(/-/g,''); }
    function icsDateTime(dateStr,timeStr) { return `${icsDate(dateStr)}T${String(timeStr || '08:00').replace(':','')}00`; }
    function exportWorkCalendarIcs() {
        const allItems = typeof normalizeWorkItems === 'function' ? normalizeWorkItems(currentWorkItems(), state.workScope) : safeArray(currentWorkItems());
        const tasks = allItems.filter(item => item.type === 'task' && item.status !== 'done' && item.dueDate);
        if (!tasks.length) { showToast?.('ℹ️ Chưa có nhiệm vụ đang mở nào có hạn để xuất lịch', 'info'); return; }
        const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//So Tay Giao Vien Pro//VI','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
        const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
        tasks.forEach(item => {
            const uid = `${clean(item.id) || Math.random().toString(36).slice(2)}@so-tay-giao-vien`;
            lines.push('BEGIN:VEVENT',`UID:${icsEscape(uid)}`,`DTSTAMP:${stamp}`);
            if (item.dueTime) {
                const start = parseLocalDateTime(item.dueDate,item.dueTime); const end = new Date(start.getTime()+30*60000);
                const endDate=isoFromDate(end), endTime=`${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
                lines.push(`DTSTART:${icsDateTime(item.dueDate,item.dueTime)}`,`DTEND:${icsDateTime(endDate,endTime)}`);
            } else {
                const d = parseLocalDateTime(item.dueDate,'00:00'); const next = new Date(d); next.setDate(next.getDate()+1);
                lines.push(`DTSTART;VALUE=DATE:${icsDate(item.dueDate)}`,`DTEND;VALUE=DATE:${icsDate(isoFromDate(next))}`);
            }
            lines.push(`SUMMARY:${icsEscape(item.title)}`,`DESCRIPTION:${icsEscape(item.content || '')}`,'END:VEVENT');
        });
        lines.push('END:VCALENDAR');
        const blob = new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'});
        downloadBlobFile(blob, `so-tay-giao-vien-cong-viec-${state.selectedAcademicYear || 'nam-hoc'}.ics`);
        showToast?.(`📤 Đã xuất ${tasks.length} nhiệm vụ sang file .ics`, 'success');
    }
    window.exportWorkCalendarIcs = exportWorkCalendarIcs;

    // ------------------------------------------------------------------
    // Editor integration — personal local reminder preferences
    // ------------------------------------------------------------------
    function populateWorkReminderEditor(item) {
        const select = byId('workItemReminderLead'); if (!select) return;
        if (!item?.id || item?.type !== 'task') { select.value = 'auto'; return; }
        select.value = getItemReminderPref(item).lead;
    }
    window.populateWorkReminderEditor = populateWorkReminderEditor;
    function saveWorkReminderEditorPreference(item) {
        const select = byId('workItemReminderLead'); if (!select || item?.type !== 'task' || !item?.id) return;
        setItemReminderPref(item,{lead:select.value,snoozeUntil:'',dismissedDate:''});
        renderSmartReminderCenter();
    }
    window.saveWorkReminderEditorPreference = saveWorkReminderEditorPreference;
    function removeWorkReminderPreference(item) {
        if (!item?.id) return;
        const prefs=getReminderPrefs(); delete prefs[reminderItemKey(item)]; safeWriteObject(REMINDER_PREFS_KEY,prefs);
    }
    window.removeWorkReminderPreference=removeWorkReminderPreference;

    function openSmartReminderCenter() {
        if (typeof activateOverviewTab === 'function') activateOverviewTab('workspace');
        setTimeout(() => { renderSmartReminderCenter(); byId('smartReminderCenter')?.scrollIntoView({behavior:'smooth',block:'start'}); }, 30);
    }
    window.openSmartReminderCenter = openSmartReminderCenter;

    function restoreMutedAlerts() {
        const settings=getAlertSettings(); settings.mutedCategories={}; settings.snoozed={}; settings.dismissedDate={}; saveAlertSettings(settings);
        renderSmartReminderCenter(); showToast?.('🔔 Đã bật lại các cảnh báo hệ thống', 'success');
    }

    function initSmartReminderCenter() {
        if (initialized) return;
        initialized=true;
        byId('smartReminderHeaderBtn')?.addEventListener('click', openSmartReminderCenter);
        byId('smartReminderRefreshBtn')?.addEventListener('click', () => { renderSmartReminderCenter(); showToast?.('↻ Đã làm mới nhắc việc', 'info'); });
        byId('smartReminderPermissionBtn')?.addEventListener('click', requestNotificationPermission);
        byId('smartReminderRestoreBtn')?.addEventListener('click', restoreMutedAlerts);
        byId('workExportIcsBtn')?.addEventListener('click', exportWorkCalendarIcs);
        byId('smartReminderStats')?.addEventListener('click', event => {
            const btn=event.target.closest('[data-reminder-filter]'); if(!btn)return;
            const next=btn.dataset.reminderFilter || 'all'; reminderFilter=reminderFilter===next?'all':next; localStorage.setItem(REMINDER_FILTER_KEY,reminderFilter); renderSmartReminderCenter();
        });
        byId('smartReminderList')?.addEventListener('click', event => {
            const btn=event.target.closest('[data-reminder-action]'); if(!btn)return;
            const card=btn.closest('[data-reminder-visible-index]'); const list=byId('smartReminderList');
            const alert=list?.__visibleAlerts?.[Number.parseInt(card?.dataset.reminderVisibleIndex,10)];
            Promise.resolve(handleReminderAction(btn.dataset.reminderAction,alert)).catch(error=>showToast?.('❌ '+(error?.message||error),'error'));
        });
        byId('workItemList')?.addEventListener('click', event => {
            const mode=event.target.closest('[data-calendar-mode]');
            if(mode){ calendarView=mode.dataset.calendarMode==='week'?'week':'month'; if(calendarView==='week') calendarAnchor=new Date(); else calendarAnchor=new Date(calendarAnchor.getFullYear(),calendarAnchor.getMonth(),1); saveCalendarAnchor(); if(typeof renderWorkWorkspace==='function')renderWorkWorkspace(); return; }
            const nav=event.target.closest('[data-calendar-nav]');
            if(nav){ const action=nav.dataset.calendarNav; if(action==='prev')changeCalendarMonth(-1); else if(action==='next')changeCalendarMonth(1); else goCalendarToday(); return; }
            const task=event.target.closest('[data-calendar-task-id]');
            if(task){ const item=currentWorkItems().find(entry=>entry.id===task.dataset.calendarTaskId); if(item&&typeof openWorkItemEditor==='function')openWorkItemEditor(item); return; }
            const lesson=event.target.closest('[data-calendar-teaching-week]');
            if(lesson&&typeof openAutomationTarget==='function')openAutomationTarget('teaching',Number.parseInt(lesson.dataset.calendarTeachingWeek,10));
        });
        document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible')renderSmartReminderCenter(); });
        registerAppDataRefresh('smart-reminder', renderSmartReminderCenter);
        registerMinuteRefresh('smart-reminder', renderSmartReminderCenter);
        renderSmartReminderCenter();
    }
    window.initSmartReminderCenter=initSmartReminderCenter;
})();
