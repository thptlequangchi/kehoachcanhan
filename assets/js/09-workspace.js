        // ================================================================
        //  SỔ CÔNG VIỆC PRO — v44
        //  Hôm nay / Quá hạn / Kanban / Lặp lại / Liên kết nghiệp vụ
        // ================================================================
        let workProInitialized = false;
        let workSuggestionCache = [];
        const workPendingSourceKeys = new Set();

        function workTypeInfo(type) {
            if (type === 'lesson') return { icon: '📘', label: 'Bài soạn' };
            if (type === 'task') return { icon: '✅', label: 'Nhiệm vụ' };
            return { icon: '📝', label: 'Ghi chú' };
        }

        function workStatusInfo(status) {
            if (status === 'doing') return { label: 'Đang làm', icon: '▶', className: 'doing' };
            if (status === 'waiting') return { label: 'Chờ xử lý', icon: '⏳', className: 'waiting' };
            if (status === 'done') return { label: 'Hoàn thành', icon: '✓', className: 'done' };
            return { label: 'Chưa làm', icon: '○', className: 'todo' };
        }

        function workPriorityInfo(priority) {
            if (priority === 'urgent') return { label: 'Gấp', icon: '🔥', className: 'urgent', rank: 4 };
            if (priority === 'high') return { label: 'Cao', icon: '▲', className: 'high', rank: 3 };
            if (priority === 'low') return { label: 'Thấp', icon: '▽', className: 'low', rank: 1 };
            return { label: 'Bình thường', icon: '•', className: 'normal', rank: 2 };
        }

        function createWorkItemId() {
            if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
            return `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }

        function sharedWorkScopeAvailable() {
            return Boolean(state.account.accessMode === 'group'
                && state.account.firebaseReady
                && state.account.user
                && state.account.profile?.status === 'active');
        }

        function canManageWorkItem(item) {
            if (item?.scope !== 'shared') return true;
            return Boolean(sharedWorkScopeAvailable()
                && (item.createdBy === state.account.user?.uid || state.account.profile?.role === 'admin'));
        }

        function currentWorkItems() {
            return state.workScope === 'shared' ? state.sharedWorkItems : state.workItems;
        }

        function workTodayISO(date = new Date()) {
            return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
        }

        function workParseISODate(value) {
            const normalized = normalizeISODate(value);
            if (!normalized) return null;
            const [y, m, d] = normalized.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            date.setHours(0, 0, 0, 0);
            return date;
        }

        function workWeekBounds(today = new Date()) {
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);
            const offset = (start.getDay() + 6) % 7;
            start.setDate(start.getDate() - offset);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return { start, end };
        }

        function workDueState(item, today = new Date()) {
            if (item?.type !== 'task' || item.status === 'done' || !item.dueDate) return { key: '', label: '', className: '' };
            const due = workParseISODate(item.dueDate);
            if (!due) return { key: '', label: '', className: '' };
            const now = new Date(today); now.setHours(0, 0, 0, 0);
            const diff = Math.round((due - now) / 86400000);
            if (diff < 0) return { key: 'overdue', label: `Quá hạn ${Math.abs(diff)} ngày`, className: 'overdue' };
            if (diff === 0) return { key: 'today', label: item.dueTime ? `Hôm nay · ${item.dueTime}` : 'Hôm nay', className: 'today' };
            if (diff === 1) return { key: 'tomorrow', label: item.dueTime ? `Ngày mai · ${item.dueTime}` : 'Ngày mai', className: 'soon' };
            if (diff <= 7) return { key: 'soon', label: `${formatISODateForDisplay(item.dueDate)}${item.dueTime ? ' · ' + item.dueTime : ''}`, className: 'soon' };
            return { key: 'later', label: `${formatISODateForDisplay(item.dueDate)}${item.dueTime ? ' · ' + item.dueTime : ''}`, className: '' };
        }

        function workIsDueThisWeek(item, today = new Date()) {
            if (item?.type !== 'task' || item.status === 'done' || !item.dueDate) return false;
            const due = workParseISODate(item.dueDate);
            if (!due) return false;
            const { start, end } = workWeekBounds(today);
            return due >= start && due <= end;
        }

        function setWorkScope(scope, notify = false) {
            const nextScope = scope === 'shared' && sharedWorkScopeAvailable() ? 'shared' : 'personal';
            state.workScope = nextScope;
            localStorage.setItem(WORK_SCOPE_STORAGE, nextScope);
            renderWorkWorkspace();
            if (notify && scope === 'shared' && nextScope !== 'shared') {
                showToast('🔒 Hãy đăng nhập nhóm giáo viên để mở sổ công việc chung', 'info');
            }
        }

        function setWorkView(view) {
            state.workView = ['kanban','calendar'].includes(view) ? view : 'list';
            localStorage.setItem(WORK_VIEW_STORAGE, state.workView);
            renderWorkWorkspace();
        }

        function setWorkSmartFilter(filter) {
            const allowed = ['all', 'today', 'overdue', 'week', 'urgent', 'doing', 'done'];
            state.workSmartFilter = allowed.includes(filter) ? filter : 'all';
            localStorage.setItem(WORK_SMART_FILTER_STORAGE, state.workSmartFilter);
            renderWorkWorkspace();
        }

        function formatWorkTimestamp(value) {
            const normalized = normalizeWorkTimestamp(value);
            if (!normalized) return '';
            return new Date(normalized).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        }

        function populateWorkWeekOptions() {
            const filter = document.getElementById('workWeekFilter');
            const editor = document.getElementById('workItemLinkedWeek');
            [filter, editor].forEach(select => {
                if (!select) return;
                const previous = select.value;
                const firstLabel = select.id === 'workWeekFilter' ? 'Tất cả tuần' : 'Không chọn';
                select.innerHTML = `<option value="">${firstLabel}</option>`;
                for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                    const option = document.createElement('option');
                    option.value = String(week);
                    const info = typeof getWeekDateInfo === 'function' ? getWeekDateInfo(week) : null;
                    option.textContent = info ? `Tuần ${week} · ${info.rangeText}` : `Tuần ${week}`;
                    select.appendChild(option);
                }
                if ([...select.options].some(option => option.value === previous)) select.value = previous;
            });
        }

        function buildWorkStats(allItems) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayISO = workTodayISO(today);
            const tasks = allItems.filter(item => item.type === 'task');
            return {
                today: tasks.filter(item => item.status !== 'done' && item.dueDate === todayISO).length,
                overdue: tasks.filter(item => item.status !== 'done' && item.dueDate && workParseISODate(item.dueDate) < today).length,
                week: tasks.filter(item => workIsDueThisWeek(item, today)).length,
                doing: tasks.filter(item => item.status === 'doing').length,
                done: tasks.filter(item => item.status === 'done').length,
                note: allItems.filter(item => item.type === 'note').length,
                lesson: allItems.filter(item => item.type === 'lesson').length,
                task: tasks.length,
            };
        }

        function workSmartFilterMatch(item, filter) {
            if (!filter || filter === 'all') return true;
            if (item.type !== 'task') return false;
            const due = workDueState(item);
            if (filter === 'today') return due.key === 'today';
            if (filter === 'overdue') return due.key === 'overdue';
            if (filter === 'week') return workIsDueThisWeek(item);
            if (filter === 'urgent') return item.status !== 'done' && ['urgent', 'high'].includes(item.priority);
            if (filter === 'doing') return item.status === 'doing';
            if (filter === 'done') return item.status === 'done';
            return true;
        }

        function filteredWorkItems(allItems) {
            const typeFilter = workTypeFilter?.value || '';
            const statusFilter = workStatusFilter?.value || '';
            const priorityFilter = document.getElementById('workPriorityFilter')?.value || '';
            const weekFilter = Number.parseInt(document.getElementById('workWeekFilter')?.value, 10) || null;
            const search = normalizeLookupText(workSearchInput?.value || '');
            return allItems
                .filter(item => !typeFilter || item.type === typeFilter)
                .filter(item => statusFilter !== 'pinned' ? (!statusFilter || item.status === statusFilter) : item.pinned)
                .filter(item => !priorityFilter || item.priority === priorityFilter)
                .filter(item => !weekFilter || item.linkedWeek === weekFilter)
                .filter(item => workSmartFilterMatch(item, state.workSmartFilter))
                .filter(item => !search || normalizeLookupText(`${item.title} ${item.content} ${item.createdByName} ${item.className} ${item.subject}`).includes(search))
                .sort((a, b) => Number(b.pinned) - Number(a.pinned)
                    || workPriorityInfo(b.priority).rank - workPriorityInfo(a.priority).rank
                    || Number(a.status === 'done') - Number(b.status === 'done')
                    || String(a.dueDate || '9999-99-99').localeCompare(String(b.dueDate || '9999-99-99'))
                    || Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
        }

        function renderWorkStats(allItems) {
            const stats = buildWorkStats(allItems);
            if (workStatGrid) {
                workStatGrid.innerHTML = `
                    <button class="work-pro-stat today ${state.workSmartFilter === 'today' ? 'active' : ''}" type="button" data-work-smart-filter="today"><span>Hôm nay</span><strong>${stats.today}</strong><small>Cần xử lý</small></button>
                    <button class="work-pro-stat overdue ${state.workSmartFilter === 'overdue' ? 'active' : ''}" type="button" data-work-smart-filter="overdue"><span>Quá hạn</span><strong>${stats.overdue}</strong><small>Cần ưu tiên</small></button>
                    <button class="work-pro-stat week ${state.workSmartFilter === 'week' ? 'active' : ''}" type="button" data-work-smart-filter="week"><span>Tuần này</span><strong>${stats.week}</strong><small>Đến hạn</small></button>
                    <button class="work-pro-stat progress ${state.workSmartFilter === 'doing' ? 'active' : ''}" type="button" data-work-smart-filter="doing"><span>Đang làm</span><strong>${stats.doing}</strong><small>Đang tiến hành</small></button>
                    <button class="work-pro-stat done ${state.workSmartFilter === 'done' ? 'active' : ''}" type="button" data-work-smart-filter="done"><span>Đã xong</span><strong>${stats.done}</strong><small>Trong năm học</small></button>`;
            }
            const summary = document.getElementById('workTypeSummary');
            if (summary) summary.textContent = `${stats.note} ghi chú · ${stats.lesson} bài soạn · ${stats.task} nhiệm vụ`;
        }

        function renderWorkActiveFilter() {
            document.querySelectorAll('[data-work-smart-filter]').forEach(button => {
                if (button.classList.contains('work-smart-chip')) button.classList.toggle('active', button.dataset.workSmartFilter === state.workSmartFilter);
            });
            const box = document.getElementById('workActiveFilter');
            if (!box) return;
            const labels = { today: 'Hôm nay', overdue: 'Quá hạn', week: 'Tuần này', urgent: 'Ưu tiên cao', doing: 'Đang làm', done: 'Đã hoàn thành' };
            if (state.workSmartFilter === 'all') {
                box.hidden = true;
                box.innerHTML = '';
                return;
            }
            box.hidden = false;
            box.innerHTML = `<span>Đang lọc: <strong>${labels[state.workSmartFilter] || state.workSmartFilter}</strong></span><button type="button" class="work-clear-filter" data-work-smart-filter="all">✕ Bỏ lọc</button>`;
        }

        function workContextChips(item) {
            const chips = [];
            if (item.linkedWeek) chips.push(`Tuần ${item.linkedWeek}`);
            if (item.className) chips.push(item.className);
            if (item.subject) chips.push(item.subject);
            if (item.recurrence && item.recurrence !== 'none') chips.push(item.recurrence === 'weekly' ? '↻ Hàng tuần' : '↻ Hàng tháng');
            return chips.map(value => `<span class="work-context-chip">${escapeHTML(value)}</span>`).join('');
        }

        function workLinkLabel(target) {
            return ({ plan:'Kế hoạch', timetable:'TKB', teaching:'Báo giảng', reports:'Báo cáo', automation:'Tự động hóa' }[target] || 'Mở liên kết');
        }

        function renderWorkCard(item, options = {}) {
            const info = workTypeInfo(item.type);
            const manageable = canManageWorkItem(item);
            const updated = formatWorkTimestamp(item.updatedAt || item.createdAt);
            const owner = item.scope === 'shared' ? cleanText(item.createdByName) || resolveSharedEditorName(item.createdBy) : 'Của tôi';
            const due = workDueState(item);
            const status = item.type === 'task' ? workStatusInfo(item.status) : null;
            const priority = item.type === 'task' ? workPriorityInfo(item.priority) : null;
            return `<article class="work-item-card work-pro-card ${item.pinned ? 'pinned' : ''} ${item.completed ? 'completed' : ''} ${due.className || ''}" ${options.draggable && manageable ? 'draggable="true"' : ''} data-work-id="${escapeHTML(item.id)}">
                <div class="work-item-top">
                    <div class="work-badge-row"><span class="work-type-badge ${item.type}">${info.icon} ${escapeHTML(info.label)}</span>${status ? `<span class="work-status-badge ${status.className}">${status.icon} ${status.label}</span>` : ''}${priority ? `<span class="work-priority-badge ${priority.className}">${priority.icon} ${priority.label}</span>` : ''}</div>
                    <span class="work-pin-mark">${item.pinned ? '📌' : ''}</span>
                </div>
                <h3>${escapeHTML(item.title)}</h3>
                <p class="work-item-content">${escapeHTML(item.content || 'Chưa có nội dung chi tiết.')}</p>
                <div class="work-context-row">${workContextChips(item)}</div>
                <div class="work-item-meta">
                    <span>👤 ${escapeHTML(owner)}</span>
                    ${due.label ? `<span class="work-due-label ${due.className}">📅 ${escapeHTML(due.label)}</span>` : ''}
                    ${updated ? `<span>· Cập nhật ${escapeHTML(updated)}</span>` : ''}
                </div>
                ${manageable ? `<div class="work-item-actions">
                    ${item.type === 'task' && item.status !== 'done' ? `<button class="btn btn-outline btn-sm" type="button" data-work-action="advance" data-work-id="${escapeHTML(item.id)}">${item.status === 'todo' ? '▶ Bắt đầu' : item.status === 'doing' ? '⏳ Chờ' : '✓ Hoàn thành'}</button>` : ''}
                    ${item.type === 'task' && item.status === 'done' ? `<button class="btn btn-outline btn-sm" type="button" data-work-action="reopen" data-work-id="${escapeHTML(item.id)}">↩ Mở lại</button>` : ''}
                    ${item.linkTarget ? `<button class="btn btn-outline btn-sm" type="button" data-work-action="open-link" data-work-id="${escapeHTML(item.id)}">↗ ${escapeHTML(workLinkLabel(item.linkTarget))}</button>` : ''}
                    <button class="btn btn-outline btn-sm" type="button" data-work-action="edit" data-work-id="${escapeHTML(item.id)}">✏️ Sửa</button>
                    <button class="btn btn-outline btn-sm danger" type="button" data-work-action="delete" data-work-id="${escapeHTML(item.id)}">🗑️</button>
                </div>` : item.linkTarget ? `<div class="work-item-actions"><button class="btn btn-outline btn-sm" type="button" data-work-action="open-link" data-work-id="${escapeHTML(item.id)}">↗ ${escapeHTML(workLinkLabel(item.linkTarget))}</button></div>` : ''}
            </article>`;
        }

        function renderWorkList(items, filtered) {
            if (!items.length) {
                workItemList.innerHTML = `<div class="work-empty-state"><strong>${filtered ? 'Không có công việc phù hợp' : 'Sổ công việc đang trống'}</strong>${filtered ? 'Bỏ bớt bộ lọc hoặc đổi từ khóa.' : 'Nhấn “Thêm công việc” hoặc dùng gợi ý của hệ thống để bắt đầu.'}</div>`;
                return;
            }
            workItemList.className = 'work-item-list work-list-mode';
            workItemList.innerHTML = items.map(item => renderWorkCard(item)).join('');
        }

        function renderWorkKanban(items) {
            const tasks = items.filter(item => item.type === 'task');
            const columns = ['todo', 'doing', 'waiting', 'done'];
            workItemList.className = 'work-item-list work-kanban-mode';
            if (!tasks.length) {
                workItemList.innerHTML = '<div class="work-empty-state"><strong>Kanban chưa có nhiệm vụ phù hợp</strong>Ghi chú và bài soạn được xem ở chế độ Danh sách.</div>';
                return;
            }
            workItemList.innerHTML = `<div class="work-kanban-board">${columns.map(status => {
                const info = workStatusInfo(status);
                const rows = tasks.filter(item => item.status === status);
                return `<section class="work-kanban-column ${info.className}" data-work-drop-status="${status}">
                    <header><span>${info.icon} ${info.label}</span><b>${rows.length}</b></header>
                    <div class="work-kanban-cards">${rows.map(item => renderWorkCard(item, { draggable: true })).join('') || '<div class="work-kanban-empty">Kéo nhiệm vụ vào đây</div>'}</div>
                </section>`;
            }).join('')}</div>`;
        }

        function workSuggestionExists(sourceKey, allItems = normalizeWorkItems(currentWorkItems(), state.workScope)) {
            return allItems.find(item => sourceKey && item.sourceKey === sourceKey) || null;
        }

        function workWeekEndISO(week) {
            const info = getWeekDateInfo?.(week);
            return info?.end ? workTodayISO(info.end) : '';
        }

        function buildWorkSystemSuggestions() {
            const suggestions = [];
            const week = typeof getAutomationReferenceWeek === 'function' ? getAutomationReferenceWeek() : (Number(state.selectedTimetableWeek) || 1);
            const dueDate = workWeekEndISO(week);
            const year = state.selectedAcademicYear;
            const weekStatus = getWeekOperationalStatus(week);
            const add = (key, title, content, priority, linkTarget, linkedWeek = week, className = '', subject = '') => suggestions.push({
                key, title, content, priority, linkTarget, linkedWeek, className, subject, dueDate,
            });
            if (!weekStatus.hasPlan) add(`system:${year}:plan:${week}`, `Bổ sung Kế hoạch Tuần ${week}`, 'Tuần hiện tại chưa có Kế hoạch nhà trường.', 'high', 'plan');
            if (!weekStatus.hasTimetable) add(`system:${year}:timetable:${week}`, `Hoàn thiện TKB Tuần ${week}`, 'Tuần hiện tại chưa có Thời khóa biểu.', 'high', 'timetable');
            if (!weekStatus.hasSchedule) add(`system:${year}:schedule:${week}`, `Tạo Lịch báo giảng Tuần ${week}`, 'Đã đến tuần làm việc nhưng chưa có Lịch báo giảng.', 'high', 'teaching');
            else if (weekStatus.stale) add(`system:${year}:schedule-stale:${week}`, `Tạo lại Lịch báo giảng Tuần ${week}`, cleanText(weekStatus.meta?.staleReason) || 'Dữ liệu nguồn đã thay đổi.', 'urgent', 'teaching');
            else if (!weekStatus.finalized) add(`system:${year}:finalize:${week}`, `Kiểm tra & chốt Tuần ${week}`, 'Lịch báo giảng đã có nhưng chưa chốt.', 'normal', 'teaching');

            if (typeof collectAutomationMakeupLedger === 'function') {
                try {
                    const ledger = collectAutomationMakeupLedger(Math.max(week, 1));
                    ledger.outstanding.slice(0, 4).forEach((loss, index) => {
                        const item = loss.item || {};
                        add(`system:${year}:makeup:${loss.week}:${item.id || index}:${normalizeClassKey(item.class)}:${normalizeLookupText(item.subject)}`,
                            `Bố trí học bù ${cleanText(item.class) || 'lớp'} · ${cleanText(item.subject) || 'môn học'}`,
                            `Tiết Không học từ Tuần ${loss.week}${item.day ? ` · ${item.day}` : ''}${item.notTeachingReason ? ` · ${item.notTeachingReason}` : ''}.`,
                            'urgent', 'teaching', Math.max(week, loss.week), cleanText(item.class), cleanText(item.subject));
                    });
                } catch (_) { /* lớp gợi ý không được làm gián đoạn sổ */ }
            }

            try {
                const last = localStorage.getItem('teacher_last_backup_at_v1');
                const age = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : 999;
                if (!last || age > 14) {
                    suggestions.push({ key:`system:${year}:backup`, title:'Sao lưu dữ liệu Sổ Tay Giáo Viên', content:last ? `Đã ${age} ngày chưa xuất file sao lưu.` : 'Chưa ghi nhận file sao lưu gần đây.', priority:'high', linkTarget:'', linkedWeek:null, className:'', subject:'', dueDate:workTodayISO() });
                }
            } catch (_) { /* noop */ }
            return suggestions.slice(0, 8);
        }

        function renderWorkSuggestions(allItems) {
            const list = document.getElementById('workSuggestionList');
            const summary = document.getElementById('workSuggestionSummary');
            const panel = document.getElementById('workSuggestionPanel');
            if (!list || !summary || !panel) return;
            workSuggestionCache = buildWorkSystemSuggestions();
            if (!workSuggestionCache.length) {
                summary.textContent = 'Không phát hiện việc hệ thống nào cần bổ sung.';
                list.innerHTML = '<div class="work-suggestion-ok">✓ Kế hoạch công việc đang gọn. Không có cảnh báo cần chuyển thành nhiệm vụ.</div>';
                return;
            }
            const pending = workSuggestionCache.filter(item => !workSuggestionExists(item.key, allItems)).length;
            summary.textContent = pending ? `${pending} gợi ý chưa có trong Sổ công việc` : 'Các gợi ý hiện tại đã có trong Sổ công việc';
            list.innerHTML = workSuggestionCache.map((suggestion, index) => {
                const existing = workSuggestionExists(suggestion.key, allItems);
                const pending = workPendingSourceKeys.has(suggestion.key);
                const priority = workPriorityInfo(suggestion.priority);
                return `<div class="work-suggestion-item ${existing || pending ? 'added' : ''}">
                    <span class="work-suggestion-icon">${existing ? '✓' : priority.icon}</span>
                    <div><strong>${escapeHTML(suggestion.title)}</strong><small>${escapeHTML(suggestion.content)}</small></div>
                    ${existing ? `<button class="btn btn-outline btn-sm" type="button" data-work-suggestion-action="open-existing" data-work-existing-id="${escapeHTML(existing.id)}">Đã có trong sổ</button>` : pending ? '<button class="btn btn-outline btn-sm" type="button" disabled>Đang thêm…</button>' : `<button class="btn btn-primary btn-sm" type="button" data-work-suggestion-action="add" data-work-suggestion-index="${index}">＋ Thêm vào sổ</button>`}
                </div>`;
            }).join('');
        }

        function renderWorkWorkspace() {
            if (!workItemList) return;
            populateWorkWeekOptions();
            const groupAvailable = sharedWorkScopeAvailable();
            sharedWorkScopeBtn.hidden = !groupAvailable;
            if (state.workScope === 'shared' && !groupAvailable && state.account.accessMode !== 'group') {
                state.workScope = 'personal';
                localStorage.setItem(WORK_SCOPE_STORAGE, 'personal');
            }
            personalWorkScopeBtn.classList.toggle('active', state.workScope === 'personal');
            sharedWorkScopeBtn.classList.toggle('active', state.workScope === 'shared');
            document.getElementById('workListViewBtn')?.classList.toggle('active', state.workView === 'list');
            document.getElementById('workKanbanViewBtn')?.classList.toggle('active', state.workView === 'kanban');
            document.getElementById('workCalendarViewBtn')?.classList.toggle('active', state.workView === 'calendar');

            const allItems = normalizeWorkItems(currentWorkItems(), state.workScope);
            renderWorkStats(allItems);
            renderWorkActiveFilter();
            renderWorkSuggestions(allItems);
            if (typeof window.renderSmartReminderCenter === 'function') window.renderSmartReminderCenter(allItems);

            workWorkspaceNotice.hidden = true;
            workWorkspaceNotice.className = 'work-workspace-notice';
            workWorkspaceNotice.textContent = '';
            if (state.workScope === 'shared') {
                if (state.workSyncError) {
                    workWorkspaceNotice.hidden = false;
                    workWorkspaceNotice.classList.add('error');
                    workWorkspaceNotice.innerHTML = `<b>Chưa mở được sổ công việc nhóm.</b> ${escapeHTML(state.workSyncError)} <button class="btn btn-outline btn-sm" type="button" data-work-action="copy-rules" style="margin-left:8px;color:#991b1b;border-color:#fca5a5;">📋 Sao chép Firestore Rules v44</button>`;
                } else if (!state.account.sharedWorkItemsLoaded) {
                    workWorkspaceNotice.hidden = false;
                    workWorkspaceNotice.classList.add('warning');
                    workWorkspaceNotice.textContent = 'Đang tải Sổ Công Việc Pro của nhóm…';
                }
                workLiveState.innerHTML = state.account.sharedWorkItemsLoaded ? '<strong>● Đồng bộ thời gian thực</strong> · thành viên đang hoạt động cùng nhìn thấy' : 'Đang kết nối dữ liệu nhóm…';
            } else {
                workLiveState.innerHTML = accountCloudSyncEnabled() && state.account.personalYearLoaded ? '<strong>● Đã đồng bộ</strong> · chỉ tài khoản của thầy nhìn thấy' : 'Dữ liệu cá nhân đang lưu an toàn trên thiết bị này.';
            }

            const items = filteredWorkItems(allItems);
            const filtered = Boolean(workTypeFilter?.value || workStatusFilter?.value || document.getElementById('workPriorityFilter')?.value || document.getElementById('workWeekFilter')?.value || workSearchInput?.value || state.workSmartFilter !== 'all');
            const calendarMode = state.workView === 'calendar';
            const smartRow = document.getElementById('workSmartFilterRow');
            const filterBar = document.querySelector('.work-pro-filters');
            if (smartRow) smartRow.hidden = calendarMode;
            if (filterBar) filterBar.hidden = calendarMode;
            if (calendarMode) {
                const activeFilter = document.getElementById('workActiveFilter');
                if (activeFilter) activeFilter.hidden = true;
                if (typeof window.renderWorkCalendar === 'function') window.renderWorkCalendar(allItems);
                else renderWorkList(items, filtered);
            } else if (state.workView === 'kanban') renderWorkKanban(items);
            else renderWorkList(items, filtered);
        }

        function updateWorkItemFormByType() {
            const task = workItemType.value === 'task';
            const fields = document.getElementById('workTaskFields');
            if (fields) fields.hidden = !task;
            workItemScopeHelp.textContent = workItemScope.value === 'shared'
                ? 'Mọi thành viên hoạt động đều xem được; chủ sở hữu hoặc admin được sửa.'
                : 'Mục cá nhân chỉ tài khoản của thầy nhìn thấy.';
        }

        function openWorkItemEditor(item = null, defaults = null) {
            const seed = item || defaults || null;
            const editing = Boolean(item?.id);
            workItemEditorContext = item ? { id: item.id, scope: item.scope } : { id: '', scope: state.workScope };
            workItemForm.reset();
            setFormFeedback(workItemFormError, '');
            workItemModalTitle.textContent = editing ? 'Sửa công việc' : 'Thêm công việc';
            workItemModalSubtitle.textContent = editing ? 'Thay đổi sẽ được lưu và đồng bộ ngay.' : `Năm học ${state.selectedAcademicYear} · có thể liên kết trực tiếp tới tuần/lớp/môn.`;
            const sharedOption = workItemScope.querySelector('option[value="shared"]');
            sharedOption.disabled = !sharedWorkScopeAvailable();
            workItemScope.value = seed?.scope === 'shared' || (!seed && state.workScope === 'shared') ? 'shared' : 'personal';
            workItemScope.disabled = editing;
            workItemType.value = seed?.type || 'task';
            workItemTitle.value = seed?.title || '';
            workItemContent.value = seed?.content || '';
            document.getElementById('workItemStatus').value = seed?.status || 'todo';
            document.getElementById('workItemPriority').value = seed?.priority || 'normal';
            workItemDueDate.value = seed?.dueDate || '';
            document.getElementById('workItemDueTime').value = seed?.dueTime || '';
            document.getElementById('workItemRecurrence').value = seed?.recurrence || 'none';
            document.getElementById('workItemLinkTarget').value = seed?.linkTarget || '';
            document.getElementById('workItemLinkedWeek').value = seed?.linkedWeek ? String(seed.linkedWeek) : '';
            document.getElementById('workItemClassName').value = seed?.className || '';
            document.getElementById('workItemSubject').value = seed?.subject || '';
            workItemPinned.checked = Boolean(seed?.pinned);
            if (typeof window.populateWorkReminderEditor === 'function') window.populateWorkReminderEditor(seed);
            updateWorkItemFormByType();
            openAppModal(workItemModal, workItemTitle);
        }

        function sharedWorkPayload(item, ownerUid, ownerName, firestoreModule, existing = null) {
            const payload = {
                schemaVersion: 2,
                academicYear: state.selectedAcademicYear,
                scope: 'shared',
                type: item.type,
                title: item.title,
                content: item.content,
                dueDate: item.dueDate,
                dueTime: item.dueTime,
                status: item.status,
                priority: item.priority,
                completed: item.completed,
                recurrence: item.recurrence,
                recurrenceSpawnedAt: item.recurrenceSpawnedAt || '',
                pinned: item.pinned,
                linkedWeek: item.linkedWeek || null,
                className: item.className,
                subject: item.subject,
                linkTarget: item.linkTarget,
                sourceKey: item.sourceKey,
                createdBy: ownerUid,
                createdByName: ownerName,
                updatedAt: firestoreModule.serverTimestamp(),
            };
            if (!existing) payload.createdAt = firestoreModule.serverTimestamp();
            return payload;
        }

        async function saveSharedWorkItem(item, existing = null) {
            if (!sharedWorkScopeAvailable()) throw new Error('Chưa kết nối tài khoản nhóm');
            const { firestoreModule } = state.account.modules;
            const collectionRef = getSharedWorkItemsRef(state.selectedAcademicYear);
            const itemRef = existing?.id ? firestoreModule.doc(collectionRef, existing.id) : firestoreModule.doc(collectionRef);
            const ownerUid = existing?.createdBy || state.account.user.uid;
            const ownerName = existing?.createdByName || cleanText(state.account.profile?.displayName || state.account.user.displayName || state.account.user.email) || 'Giáo viên';
            await firestoreModule.setDoc(itemRef, sharedWorkPayload(item, ownerUid, ownerName, firestoreModule, existing), { merge: Boolean(existing) });
            return itemRef.id;
        }

        async function savePersonalWorkItem(item) {
            const index = state.workItems.findIndex(entry => entry.id === item.id);
            if (index >= 0) state.workItems[index] = item;
            else state.workItems.push(item);
            persistActiveYearWorkspace();
            renderWorkWorkspace();
        }

        async function saveWorkItemFromForm(event) {
            event.preventDefault();
            if (saveWorkItemBtn.disabled) return;
            setFormFeedback(workItemFormError, '');
            const title = cleanText(workItemTitle.value).slice(0, 160);
            const content = workItemContent.value.trim().slice(0, 12000);
            if (!title) {
                setFormFeedback(workItemFormError, 'Vui lòng nhập tiêu đề.');
                workItemTitle.focus();
                return;
            }
            const scope = workItemEditorContext?.id ? workItemEditorContext.scope : workItemScope.value;
            const source = scope === 'shared' ? state.sharedWorkItems : state.workItems;
            const existing = workItemEditorContext?.id ? source.find(item => item.id === workItemEditorContext.id) : null;
            if (existing && !canManageWorkItem(existing)) {
                setFormFeedback(workItemFormError, 'Thầy không có quyền sửa mục này.');
                return;
            }
            const type = WORK_ITEM_TYPES.includes(workItemType.value) ? workItemType.value : 'task';
            const status = type === 'task' && WORK_TASK_STATUSES.includes(document.getElementById('workItemStatus').value) ? document.getElementById('workItemStatus').value : '';
            const now = new Date().toISOString();
            const item = normalizeWorkItem({
                ...(existing || {}),
                id: existing?.id || createWorkItemId(),
                academicYear: state.selectedAcademicYear,
                scope,
                type,
                title,
                content,
                dueDate: type === 'task' ? workItemDueDate.value : '',
                dueTime: type === 'task' ? document.getElementById('workItemDueTime').value : '',
                status,
                priority: type === 'task' ? document.getElementById('workItemPriority').value : '',
                completed: status === 'done',
                recurrence: type === 'task' ? document.getElementById('workItemRecurrence').value : 'none',
                recurrenceSpawnedAt: existing?.recurrenceSpawnedAt || '',
                pinned: workItemPinned.checked,
                linkedWeek: document.getElementById('workItemLinkedWeek').value,
                className: document.getElementById('workItemClassName').value,
                subject: document.getElementById('workItemSubject').value,
                linkTarget: document.getElementById('workItemLinkTarget').value,
                sourceKey: existing?.sourceKey || '',
                createdAt: existing?.createdAt || now,
                updatedAt: now,
                createdBy: existing?.createdBy || state.account.user?.uid || 'local',
                createdByName: existing?.createdByName || state.account.profile?.displayName || state.teacherProfile.teacherName,
            }, scope);

            saveWorkItemBtn.disabled = true;
            saveWorkItemBtn.textContent = 'Đang lưu…';
            try {
                let persistedId = item.id;
                if (scope === 'shared') persistedId = await saveSharedWorkItem(item, existing);
                else await savePersonalWorkItem(item);
                if (persistedId) item.id = persistedId;
                if (typeof window.saveWorkReminderEditorPreference === 'function') window.saveWorkReminderEditorPreference(item);
                closeAppModal(workItemModal);
                showToast(`✅ Đã lưu ${workTypeInfo(type).label.toLowerCase()}`, 'success');
            } catch (error) {
                console.error('Không thể lưu mục công việc:', error);
                state.workSyncError = translateAccountError(error);
                setFormFeedback(workItemFormError, state.workSyncError + (scope === 'shared' ? ' · Nếu vừa nâng v44, hãy cập nhật Firestore Rules mới trong Cài đặt.' : ''));
                renderWorkWorkspace();
            } finally {
                saveWorkItemBtn.disabled = false;
                saveWorkItemBtn.textContent = '💾 Lưu';
            }
        }

        async function updateSharedWorkItemFields(item, changes) {
            const { firestoreModule } = state.account.modules;
            const itemRef = firestoreModule.doc(getSharedWorkItemsRef(state.selectedAcademicYear), item.id);
            await firestoreModule.setDoc(itemRef, { ...changes, updatedAt: firestoreModule.serverTimestamp() }, { merge: true });
        }

        function nextRecurringDueDate(item) {
            const base = workParseISODate(item.dueDate) || new Date();
            const next = new Date(base);
            if (item.recurrence === 'weekly') next.setDate(next.getDate() + 7);
            else if (item.recurrence === 'monthly') {
                const day = next.getDate();
                next.setDate(1);
                next.setMonth(next.getMonth() + 1);
                const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                next.setDate(Math.min(day, lastDay));
            } else return '';
            return workTodayISO(next);
        }

        async function spawnRecurringWorkItem(item) {
            if (item.type !== 'task' || !['weekly', 'monthly'].includes(item.recurrence) || item.recurrenceSpawnedAt) return false;
            if (item.scope === 'shared' && item.createdBy !== state.account.user?.uid) return false;
            const now = new Date().toISOString();
            const next = normalizeWorkItem({
                ...item,
                id: createWorkItemId(),
                dueDate: nextRecurringDueDate(item),
                status: 'todo',
                completed: false,
                pinned: false,
                recurrenceSpawnedAt: '',
                sourceKey: '',
                createdAt: now,
                updatedAt: now,
                createdBy: item.scope === 'shared' ? state.account.user.uid : item.createdBy,
                createdByName: item.scope === 'shared' ? (state.account.profile?.displayName || item.createdByName) : item.createdByName,
            }, item.scope);
            if (item.scope === 'shared') await saveSharedWorkItem(next, null);
            else state.workItems.push(next);
            return true;
        }

        async function setWorkTaskStatus(item, newStatus) {
            if (!item || item.type !== 'task' || !WORK_TASK_STATUSES.includes(newStatus)) return;
            const completing = newStatus === 'done' && item.status !== 'done';
            const spawned = completing ? await spawnRecurringWorkItem(item) : false;
            const changes = {
                status: newStatus,
                completed: newStatus === 'done',
                recurrenceSpawnedAt: completing && spawned ? new Date().toISOString() : (item.recurrenceSpawnedAt || ''),
            };
            if (item.scope === 'shared') await updateSharedWorkItemFields(item, changes);
            else {
                Object.assign(item, changes, { updatedAt: new Date().toISOString() });
                persistActiveYearWorkspace();
                renderWorkWorkspace();
            }
            if (spawned) showToast('🔁 Đã tạo lần lặp tiếp theo', 'info');
        }

        function openWorkItemLink(item) {
            const week = item.linkedWeek || (typeof getAutomationReferenceWeek === 'function' ? getAutomationReferenceWeek() : state.selectedTimetableWeek || 1);
            if (['plan', 'timetable', 'teaching'].includes(item.linkTarget)) {
                if (typeof openAutomationTarget === 'function') openAutomationTarget(item.linkTarget, week);
                else activateOverviewTab(item.linkTarget === 'plan' ? 'plan' : item.linkTarget === 'timetable' ? 'timetable' : 'teaching');
                return;
            }
            if (item.linkTarget === 'reports') {
                activateOverviewTab('reports');
                return;
            }
            if (item.linkTarget === 'automation') {
                if (typeof scrollToDashboardSection === 'function') scrollToDashboardSection('automationCenter');
                else document.getElementById('automationCenter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        async function handleWorkItemAction(action, itemId) {
            const items = currentWorkItems();
            const item = items.find(entry => entry.id === itemId);
            if (!item) return;
            if (action === 'open-link') {
                openWorkItemLink(item);
                return;
            }
            if (!canManageWorkItem(item)) return;
            if (action === 'edit') {
                openWorkItemEditor(item);
                return;
            }
            try {
                if (action === 'toggle' && item.type === 'task') {
                    await setWorkTaskStatus(item, item.status === 'done' ? 'todo' : 'done');
                    return;
                }
                if (action === 'advance' && item.type === 'task') {
                    const next = item.status === 'todo' ? 'doing' : item.status === 'doing' ? 'waiting' : 'done';
                    await setWorkTaskStatus(item, next);
                    showToast(next === 'done' ? '✅ Đã hoàn thành nhiệm vụ' : `Đã chuyển sang “${workStatusInfo(next).label}”`, 'success');
                    return;
                }
                if (action === 'reopen' && item.type === 'task') {
                    await setWorkTaskStatus(item, 'todo');
                    showToast('↩ Đã mở lại nhiệm vụ', 'info');
                    return;
                }
                if (action === 'delete') {
                    if (!confirm(`Xóa “${item.title}”?`)) return;
                    if (item.scope === 'shared') {
                        const { firestoreModule } = state.account.modules;
                        await firestoreModule.deleteDoc(firestoreModule.doc(getSharedWorkItemsRef(state.selectedAcademicYear), item.id));
                    } else {
                        state.workItems = state.workItems.filter(entry => entry.id !== item.id);
                        persistActiveYearWorkspace();
                        renderWorkWorkspace();
                    }
                    if (typeof window.removeWorkReminderPreference === 'function') window.removeWorkReminderPreference(item);
                    showToast('Đã xóa mục công việc', 'info');
                }
            } catch (error) {
                console.error('Không thể cập nhật sổ công việc:', error);
                state.workSyncError = translateAccountError(error);
                renderWorkWorkspace();
                showToast('❌ ' + state.workSyncError, 'error');
            }
        }

        async function addWorkSuggestion(index) {
            const suggestion = workSuggestionCache[index];
            if (!suggestion) return;
            const allItems = normalizeWorkItems(currentWorkItems(), state.workScope);
            const existing = workSuggestionExists(suggestion.key, allItems);
            if (existing || workPendingSourceKeys.has(suggestion.key)) {
                showToast('ℹ️ Công việc này đã có hoặc đang được thêm vào sổ', 'info');
                return;
            }
            workPendingSourceKeys.add(suggestion.key);
            renderWorkSuggestions(allItems);
            const now = new Date().toISOString();
            const item = normalizeWorkItem({
                id:createWorkItemId(), academicYear:state.selectedAcademicYear, scope:state.workScope,
                type:'task', title:suggestion.title, content:suggestion.content, dueDate:suggestion.dueDate,
                status:'todo', priority:suggestion.priority, completed:false, recurrence:'none', pinned:false,
                linkedWeek:suggestion.linkedWeek, className:suggestion.className, subject:suggestion.subject,
                linkTarget:suggestion.linkTarget, sourceKey:suggestion.key, createdAt:now, updatedAt:now,
                createdBy:state.account.user?.uid || 'local', createdByName:state.account.profile?.displayName || state.teacherProfile.teacherName,
            }, state.workScope);
            try {
                if (state.workScope === 'shared') await saveSharedWorkItem(item, null);
                else await savePersonalWorkItem(item);
                showToast('✅ Đã thêm gợi ý vào Sổ công việc', 'success');
            } catch (error) {
                state.workSyncError = translateAccountError(error);
                showToast('❌ ' + state.workSyncError, 'error');
            } finally {
                workPendingSourceKeys.delete(suggestion.key);
                renderWorkWorkspace();
            }
        }

        async function createWeeklyWorkTemplate() {
            const current = typeof getAutomationReferenceWeek === 'function' ? getAutomationReferenceWeek() : Number(state.selectedTimetableWeek) || 1;
            const week = Math.min(MAX_SCHOOL_WEEKS, current + 1);
            const due = workWeekEndISO(week);
            const templates = [
                ['plan', `Kiểm tra Kế hoạch Tuần ${week}`, 'Đọc kế hoạch nhà trường và xác định các hoạt động ảnh hưởng giờ dạy.', 'normal'],
                ['timetable', `Kiểm tra TKB Tuần ${week}`, 'Giữ nguyên tuần trước hoặc cập nhật những tiết thay đổi.', 'normal'],
                ['teaching', `Hoàn thiện Lịch báo giảng Tuần ${week}`, 'Đối chiếu PPCT, Kế hoạch trường và kiểm tra trước khi chốt.', 'high'],
                ['reports', `Rà soát hồ sơ Tuần ${week}`, 'Kiểm tra các mục còn thiếu trước khi kết thúc tuần.', 'normal'],
            ];
            const existing = normalizeWorkItems(currentWorkItems(), state.workScope);
            let added = 0;
            for (const [target, title, content, priority] of templates) {
                const key = `template:${state.selectedAcademicYear}:weekly:${week}:${target}`;
                if (workSuggestionExists(key, existing)) continue;
                const now = new Date().toISOString();
                const item = normalizeWorkItem({ id:createWorkItemId(), academicYear:state.selectedAcademicYear, scope:state.workScope, type:'task', title, content, dueDate:due, status:'todo', priority, completed:false, recurrence:'none', pinned:false, linkedWeek:week, linkTarget:target, sourceKey:key, createdAt:now, updatedAt:now, createdBy:state.account.user?.uid || 'local', createdByName:state.account.profile?.displayName || state.teacherProfile.teacherName }, state.workScope);
                if (state.workScope === 'shared') await saveSharedWorkItem(item, null);
                else state.workItems.push(item);
                existing.push(item);
                added++;
            }
            if (state.workScope === 'personal' && added) persistActiveYearWorkspace();
            renderWorkWorkspace();
            showToast(added ? `✨ Đã tạo ${added} việc chuẩn bị Tuần ${week}` : `Tuần ${week} đã có đủ checklist chuẩn bị`, added ? 'success' : 'info');
        }

        async function moveKanbanTask(itemId, status) {
            const item = currentWorkItems().find(entry => entry.id === itemId);
            if (!item || item.type !== 'task' || !canManageWorkItem(item) || item.status === status) return;
            try {
                await setWorkTaskStatus(item, status);
                showToast(`Đã chuyển “${item.title}” → ${workStatusInfo(status).label}`, 'success');
            } catch (error) {
                showToast('❌ ' + translateAccountError(error), 'error');
            }
        }

        function initWorkPro() {
            if (workProInitialized) return;
            workProInitialized = true;
            populateWorkWeekOptions();
            document.getElementById('workListViewBtn')?.addEventListener('click', () => setWorkView('list'));
            document.getElementById('workKanbanViewBtn')?.addEventListener('click', () => setWorkView('kanban'));
            document.getElementById('workCalendarViewBtn')?.addEventListener('click', () => setWorkView('calendar'));
            document.getElementById('workPriorityFilter')?.addEventListener('change', renderWorkWorkspace);
            document.getElementById('workWeekFilter')?.addEventListener('change', renderWorkWorkspace);
            document.getElementById('workSmartFilterRow')?.addEventListener('click', event => {
                const button = event.target.closest('[data-work-smart-filter]');
                if (button) setWorkSmartFilter(button.dataset.workSmartFilter);
            });
            workStatGrid?.addEventListener('click', event => {
                const button = event.target.closest('[data-work-smart-filter]');
                if (button) setWorkSmartFilter(button.dataset.workSmartFilter);
            });
            document.getElementById('workActiveFilter')?.addEventListener('click', event => {
                const button = event.target.closest('[data-work-smart-filter]');
                if (button) setWorkSmartFilter(button.dataset.workSmartFilter);
            });
            document.getElementById('workRefreshSuggestionsBtn')?.addEventListener('click', renderWorkWorkspace);
            document.getElementById('workSuggestionList')?.addEventListener('click', event => {
                const button = event.target.closest('[data-work-suggestion-action]');
                if (!button) return;
                if (button.dataset.workSuggestionAction === 'add') addWorkSuggestion(Number.parseInt(button.dataset.workSuggestionIndex, 10));
                if (button.dataset.workSuggestionAction === 'open-existing') {
                    const item = currentWorkItems().find(entry => entry.id === button.dataset.workExistingId);
                    if (item) openWorkItemEditor(item);
                }
            });
            document.getElementById('workWeeklyTemplateBtn')?.addEventListener('click', () => createWeeklyWorkTemplate().catch(error => showToast('❌ ' + translateAccountError(error), 'error')));

            let draggedId = '';
            workItemList.addEventListener('dragstart', event => {
                const card = event.target.closest('[data-work-id]');
                if (!card) return;
                draggedId = card.dataset.workId;
                card.classList.add('dragging');
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', draggedId);
                }
            });
            workItemList.addEventListener('dragend', event => {
                event.target.closest('[data-work-id]')?.classList.remove('dragging');
                document.querySelectorAll('.work-kanban-column.drag-over').forEach(el => el.classList.remove('drag-over'));
                draggedId = '';
            });
            workItemList.addEventListener('dragover', event => {
                const column = event.target.closest('[data-work-drop-status]');
                if (!column) return;
                event.preventDefault();
                column.classList.add('drag-over');
            });
            workItemList.addEventListener('dragleave', event => {
                const column = event.target.closest('[data-work-drop-status]');
                if (column && !column.contains(event.relatedTarget)) column.classList.remove('drag-over');
            });
            workItemList.addEventListener('drop', event => {
                const column = event.target.closest('[data-work-drop-status]');
                if (!column) return;
                event.preventDefault();
                column.classList.remove('drag-over');
                const id = draggedId || event.dataTransfer?.getData('text/plain');
                if (id) moveKanbanTask(id, column.dataset.workDropStatus);
            });

            registerAppDataRefresh('work-workspace', renderWorkWorkspace, {
                activeWhen: () => document.getElementById('tab-workspace')?.classList.contains('active')
            });
        }
