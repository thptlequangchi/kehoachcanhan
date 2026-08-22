        // ================================================================
        //  v39 AUTOMATION CENTER — Kế hoạch → Báo giảng → Học bù
        // ================================================================
        const AUTOMATION_MAKEUP_LOOKAHEAD_WEEKS = 3;
        const AUTOMATION_MAX_VISIBLE_ITEMS = 6;

        function automationEscape(value) {
            return typeof yearDashboardEscape === 'function'
                ? yearDashboardEscape(value)
                : escapeHTML(cleanText(value));
        }

        function automationCourseKey(className, subject) {
            return `${normalizeClassKey(className)}|${normalizeLookupText(subject)}`;
        }

        function getAutomationReferenceWeek(today = new Date()) {
            if (typeof getYearDashboardReferenceWeek === 'function') return getYearDashboardReferenceWeek(today);
            if (typeof getOverviewCurrentWeek === 'function') return getOverviewCurrentWeek(today) || 1;
            return Number.parseInt(state.selectedTimetableWeek, 10) || 1;
        }

        function getAutomationSelectedWeek() {
            const select = document.getElementById('automationWeekSelect');
            const value = Number.parseInt(select?.value, 10);
            return value > 0 && value <= MAX_SCHOOL_WEEKS ? value : getAutomationReferenceWeek();
        }

        function populateAutomationWeekSelect(preferredWeek = getAutomationReferenceWeek()) {
            const select = document.getElementById('automationWeekSelect');
            if (!select) return;
            const previous = Number.parseInt(select.value, 10);
            select.innerHTML = '';
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                const option = document.createElement('option');
                option.value = String(week);
                const info = typeof getWeekDateInfo === 'function' ? getWeekDateInfo(week) : null;
                option.textContent = info ? `Tuần ${week} · ${info.rangeText}` : `Tuần ${week}`;
                select.appendChild(option);
            }
            const target = previous > 0 ? previous : preferredWeek;
            select.value = String(Math.min(MAX_SCHOOL_WEEKS, Math.max(1, target || 1)));
        }

        function buildAutomationPlanImpacts(week) {
            const plan = state.planData?.find(item => Number.parseInt(item?.week, 10) === Number.parseInt(week, 10));
            const timetable = state.timetablesByWeek?.[week] || null;
            if (!plan) return { plan:null, timetable, impacts:[], lessonCount:0, highCount:0, reviewCount:0 };
            const impacts = [];
            (plan.days || []).forEach(day => {
                const normalizedDay = normalizeDayName(day?.day);
                if (!normalizedDay) return;
                [
                    { field:'morning', session:'Buổi sáng' },
                    { field:'afternoon', session:'Buổi chiều' },
                ].forEach(def => {
                    const signal = typeof detectPlanScheduleSignal === 'function' ? detectPlanScheduleSignal(day?.[def.field]) : null;
                    if (!signal) return;
                    const lessons = [];
                    if (timetable?.sessions) {
                        const sessionKey = def.field === 'afternoon' ? 'afternoon' : 'morning';
                        const session = timetable.sessions.find(item => item?.key === sessionKey);
                        (session?.periods || []).forEach(period => {
                            const cell = (period?.cells || []).find(item => normalizeDayName(item?.day) === normalizedDay);
                            if (cell) lessons.push({
                                period: String(period.period || ''),
                                className: cleanText(cell.className),
                                subject: cleanText(cell.subject),
                                content: cleanText(cell.content),
                            });
                        });
                    }
                    impacts.push({
                        day: normalizedDay,
                        date: cleanText(day?.date),
                        session: def.session,
                        level: signal.level,
                        label: signal.label,
                        evidence: signal.evidence,
                        lessons,
                    });
                });
            });
            const lessonCount = impacts.reduce((sum, item) => sum + item.lessons.length, 0);
            return {
                plan,
                timetable,
                impacts,
                lessonCount,
                highCount: impacts.filter(item => item.level === 'high').length,
                reviewCount: impacts.filter(item => item.level !== 'high').length,
            };
        }

        function collectAutomationMakeupLedger(limitWeek = MAX_SCHOOL_WEEKS) {
            const events = [];
            for (let week = 1; week <= Math.min(MAX_SCHOOL_WEEKS, limitWeek); week++) {
                const ordered = typeof getSortedScheduleItems === 'function'
                    ? getSortedScheduleItems(state.teachingSchedule?.[week] || [])
                    : [...(state.teachingSchedule?.[week] || [])];
                ordered.forEach((item, index) => {
                    if (!cleanText(item?.class) || !cleanText(item?.subject)) return;
                    if (!item.notTeaching && !item.makeupLesson) return;
                    events.push({ week, index, item, key:automationCourseKey(item.class, item.subject) });
                });
            }
            events.sort((a, b) => a.week - b.week || a.index - b.index);
            const queues = new Map();
            const matched = [];
            const extraMakeups = [];
            events.forEach(event => {
                if (!queues.has(event.key)) queues.set(event.key, []);
                const queue = queues.get(event.key);
                if (event.item.notTeaching) {
                    queue.push({ ...event, compensated:false });
                    return;
                }
                if (event.item.makeupLesson) {
                    const loss = queue.find(entry => !entry.compensated);
                    if (loss) {
                        loss.compensated = true;
                        matched.push({ loss, makeup:event });
                    } else {
                        extraMakeups.push(event);
                    }
                }
            });
            const outstanding = [];
            queues.forEach(queue => queue.filter(entry => !entry.compensated).forEach(entry => outstanding.push(entry)));
            outstanding.sort((a, b) => a.week - b.week || a.index - b.index);
            return { outstanding, matched, extraMakeups, totalLost: outstanding.length + matched.length, totalMakeups: matched.length + extraMakeups.length };
        }

        function automationSlotDate(week, dayName) {
            const info = typeof getWeekDateInfo === 'function' ? getWeekDateInfo(week) : null;
            if (!info) return null;
            const index = SCHOOL_DAYS.indexOf(normalizeDayName(dayName));
            if (index < 0) return null;
            const date = new Date(info.start);
            date.setDate(date.getDate() + index);
            return date;
        }

        function findAutomationMakeupSlots(loss, referenceWeek = getAutomationReferenceWeek(), maxResults = 3) {
            const results = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const sourceWeek = Number.parseInt(loss?.week, 10) || referenceWeek;
            const startWeek = Math.max(1, referenceWeek, sourceWeek);
            const endWeek = Math.min(MAX_SCHOOL_WEEKS, startWeek + AUTOMATION_MAKEUP_LOOKAHEAD_WEEKS - 1);
            for (let week = startWeek; week <= endWeek && results.length < maxResults; week++) {
                const timetable = state.timetablesByWeek?.[week];
                if (!timetable?.sessions?.length) continue;
                const meta = typeof getScheduleMeta === 'function' ? getScheduleMeta(week) : state.scheduleMeta?.[week];
                if (meta?.status === 'final') continue;
                for (const day of SCHOOL_DAYS) {
                    const date = automationSlotDate(week, day);
                    if (date && date < today) continue;
                    for (const session of timetable.sessions || []) {
                        const sessionLabel = normalizeSessionLabel(session?.label || (session?.key === 'afternoon' ? 'Buổi chiều' : 'Buổi sáng'));
                        for (const period of session?.periods || []) {
                            const periodNo = Number.parseInt(period?.period, 10);
                            if (!(periodNo > 0)) continue;
                            const timetableCell = (period?.cells || []).find(cell => normalizeDayName(cell?.day) === day);
                            if (timetableCell) continue;
                            const occupied = (state.teachingSchedule?.[week] || []).some(item =>
                                !item.notTeaching
                                && normalizeDayName(item.day) === day
                                && normalizeSessionLabel(item.session) === sessionLabel
                                && Number.parseInt(item.period, 10) === periodNo
                            );
                            if (occupied) continue;
                            results.push({ week, day, session:sessionLabel, period:String(periodNo), date });
                            if (results.length >= maxResults) break;
                        }
                        if (results.length >= maxResults) break;
                    }
                    if (results.length >= maxResults) break;
                }
            }
            return results;
        }

        function buildAutomationSnapshot(week = getAutomationSelectedWeek()) {
            const referenceWeek = getAutomationReferenceWeek();
            const planImpact = buildAutomationPlanImpacts(week);
            const schedule = state.teachingSchedule?.[week] || [];
            const syncResult = schedule.length && typeof buildPlanScheduleSyncCandidates === 'function'
                ? buildPlanScheduleSyncCandidates(week)
                : { plan:planImpact.plan, candidates:[] };
            const ledger = collectAutomationMakeupLedger(referenceWeek);
            const unresolved = ledger.outstanding.map(loss => ({
                ...loss,
                suggestions: findAutomationMakeupSlots(loss, referenceWeek, 3),
            }));
            let validation = null;
            if (schedule.length && typeof validateTeachingScheduleWeek === 'function') {
                try { validation = validateTeachingScheduleWeek(week); } catch (error) { console.warn('Không thể kiểm tra tự động tuần:', error); }
            }
            return { week, referenceWeek, planImpact, syncResult, ledger, unresolved, validation };
        }

        function renderAutomationKpis(snapshot) {
            const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
            set('automationKpiPlan', snapshot.planImpact.lessonCount || snapshot.planImpact.impacts.length || 0);
            set('automationKpiConfirm', snapshot.syncResult.candidates?.length || 0);
            set('automationKpiMakeup', snapshot.ledger.outstanding.length);
            set('automationKpiResolved', snapshot.ledger.matched.length);
            const subtitle = document.getElementById('automationSubtitle');
            if (subtitle) {
                const details = [];
                if (snapshot.planImpact.impacts.length) details.push(`${snapshot.planImpact.impacts.length} tín hiệu từ kế hoạch`);
                if (snapshot.syncResult.candidates?.length) details.push(`${snapshot.syncResult.candidates.length} tiết chờ xác nhận`);
                if (snapshot.ledger.outstanding.length) details.push(`${snapshot.ledger.outstanding.length} tiết chưa bù`);
                subtitle.textContent = `Tuần ${snapshot.week} · ${details.length ? details.join(' · ') : 'chưa phát hiện việc cần tự động hóa'}`;
            }
        }

        function renderAutomationPlanPanel(snapshot) {
            const list = document.getElementById('automationPlanImpactList');
            const summary = document.getElementById('automationPlanImpactSummary');
            if (!list || !summary) return;
            const impacts = snapshot.planImpact.impacts;
            if (!snapshot.planImpact.plan) {
                summary.textContent = `Tuần ${snapshot.week} chưa có Kế hoạch trường`;
                list.innerHTML = '<div class="automation-empty">Hãy tải Kế hoạch trường. Hệ thống sẽ tự đối chiếu theo ngày và buổi với TKB/Lịch báo giảng.</div>';
                return;
            }
            summary.textContent = impacts.length
                ? `${impacts.length} khung thời gian có khả năng ảnh hưởng · ${snapshot.planImpact.lessonCount} tiết TKB liên quan`
                : 'Chưa phát hiện nội dung nghỉ học/thi/hoạt động chung ảnh hưởng lịch';
            if (!impacts.length) {
                list.innerHTML = '<div class="automation-ok">✓ Kế hoạch tuần hiện chưa tạo cảnh báo cho lịch dạy.</div>';
                return;
            }
            const hasSchedule = Boolean(state.teachingSchedule?.[snapshot.week]?.length);
            list.innerHTML = impacts.slice(0, AUTOMATION_MAX_VISIBLE_ITEMS).map(impact => {
                const lessonText = impact.lessons.length
                    ? impact.lessons.slice(0, 3).map(item => `T${item.period} ${item.className || '?'}${item.subject ? ' · ' + item.subject : ''}`).join(' · ')
                    : 'Chưa có TKB để xác định tiết bị ảnh hưởng';
                return `<div class="automation-item ${impact.level === 'high' ? 'danger' : 'warning'}">
                    <span class="automation-icon">${impact.level === 'high' ? '🚫' : '🔎'}</span>
                    <div class="automation-item-main"><strong>${automationEscape(impact.day)} · ${automationEscape(impact.session)} · ${automationEscape(impact.label)}</strong><small>${automationEscape(impact.evidence.replace(/\n+/g, ' · '))}</small><em>${automationEscape(lessonText)}</em></div>
                    <span class="automation-badge">${impact.lessons.length || '—'} tiết</span>
                </div>`;
            }).join('') + `<div class="automation-panel-actions"><button class="btn btn-primary btn-sm" type="button" data-automation-action="${hasSchedule ? 'sync-plan' : 'open-schedule'}" data-week="${snapshot.week}">${hasSchedule ? 'Đối chiếu & xác nhận' : 'Tạo lịch báo giảng trước'} →</button></div>`;
        }

        function renderAutomationMakeupPanel(snapshot) {
            const list = document.getElementById('automationMakeupList');
            const summary = document.getElementById('automationMakeupSummary');
            if (!list || !summary) return;
            const rows = snapshot.unresolved;
            summary.textContent = rows.length
                ? `${rows.length} tiết Không học chưa được cân bằng bằng tiết học bù đến Tuần ${snapshot.referenceWeek}`
                : `Đã cân bằng ${snapshot.ledger.matched.length} tiết học bù; hiện không còn tiết thiếu`;
            if (!rows.length) {
                list.innerHTML = '<div class="automation-ok">✓ Không phát hiện tiết Không học nào đang thiếu học bù.</div>';
                return;
            }
            list.innerHTML = rows.slice(0, AUTOMATION_MAX_VISIBLE_ITEMS).map((loss, index) => {
                const item = loss.item;
                const slot = loss.suggestions[0];
                const reason = cleanText(item.notTeachingReason) || 'Không học';
                const slotText = slot
                    ? `Gợi ý: Tuần ${slot.week} · ${slot.day} · ${slot.session} · Tiết ${slot.period}${slot.date ? ' · ' + slot.date.toLocaleDateString('vi-VN') : ''}`
                    : 'Chưa tìm thấy khung trống trong TKB 3 tuần gần nhất';
                return `<div class="automation-item danger">
                    <span class="automation-icon">🔁</span>
                    <div class="automation-item-main"><strong>Tuần ${loss.week} · ${automationEscape(item.class)} · ${automationEscape(item.subject)}</strong><small>${automationEscape(item.day)} · ${automationEscape(item.session)} · Tiết TKB ${automationEscape(item.period || '—')}${item.ppctPeriod ? ` · PPCT ${automationEscape(item.ppctPeriod)}` : ''} · ${automationEscape(reason)}</small><em>${automationEscape(slotText)} · cần xác nhận học sinh có thể học</em></div>
                    ${slot ? `<button class="btn btn-success btn-sm" type="button" data-automation-action="prefill-makeup" data-loss-index="${index}">Điền gợi ý</button>` : `<button class="btn btn-outline btn-sm" type="button" data-automation-action="open-schedule" data-week="${Math.max(snapshot.referenceWeek, loss.week)}">Mở báo giảng</button>`}
                </div>`;
            }).join('');
        }

        function renderAutomationWorkflow(snapshot) {
            const list = document.getElementById('automationWorkflowList');
            const summary = document.getElementById('automationWorkflowSummary');
            if (!list || !summary) return;
            const week = snapshot.week;
            const hasPlan = Boolean(snapshot.planImpact.plan);
            const hasTimetable = Boolean(state.timetablesByWeek?.[week]);
            const hasSchedule = Boolean(state.teachingSchedule?.[week]?.length);
            const meta = hasSchedule && typeof getScheduleMeta === 'function' ? getScheduleMeta(week) : state.scheduleMeta?.[week] || {};
            const pendingPlan = snapshot.syncResult.candidates?.length || 0;
            const errors = snapshot.validation?.errorCount || 0;
            const warnings = snapshot.validation?.warningCount || 0;
            const steps = [
                { done:hasPlan, label:'Kế hoạch trường', detail:hasPlan ? 'Đã có dữ liệu tuần' : 'Chưa có Kế hoạch', target:'plan' },
                { done:hasTimetable, label:'Thời khóa biểu', detail:hasTimetable ? 'Đã có TKB tuần' : 'Chưa có TKB', target:'timetable' },
                { done:hasSchedule, label:'Lịch báo giảng', detail:hasSchedule ? 'Đã tạo lịch' : 'Chưa tạo lịch báo giảng', target:'teaching' },
                { done:hasSchedule && pendingPlan === 0, label:'Đối chiếu Kế hoạch', detail:!hasSchedule ? 'Cần tạo báo giảng trước' : pendingPlan ? `${pendingPlan} tiết đang chờ xác nhận` : 'Không còn tiết chờ xử lý', target:'teaching', action:pendingPlan ? 'sync-plan' : '' },
                { done:hasSchedule && errors === 0, label:'Kiểm tra tuần', detail:!hasSchedule ? 'Chưa thể kiểm tra' : errors ? `${errors} lỗi · ${warnings} cảnh báo` : `${warnings} cảnh báo · không có lỗi bắt buộc`, target:'teaching', action:hasSchedule ? 'validate' : '' },
                { done:meta?.status === 'final' && !meta?.stale, label:'Chốt tuần', detail:meta?.status === 'final' && !meta?.stale ? 'Đã chốt' : meta?.stale ? 'Lịch đã cũ, cần tạo lại' : 'Chưa chốt', target:'teaching' },
            ];
            const doneCount = steps.filter(step => step.done).length;
            summary.textContent = `${doneCount}/${steps.length} bước đã hoàn tất cho Tuần ${week}`;
            list.innerHTML = steps.map(step => `<button class="automation-step ${step.done ? 'done' : 'pending'}" type="button" data-automation-action="${step.action || 'open-target'}" data-target="${step.target}" data-week="${week}">
                <span>${step.done ? '✓' : '!'}</span><div><strong>${automationEscape(step.label)}</strong><small>${automationEscape(step.detail)}</small></div><b>→</b>
            </button>`).join('');
        }

        function prefillAutomationMakeup(loss) {
            const suggestion = loss?.suggestions?.[0];
            if (!loss?.item || !suggestion) {
                showToast('⚠️ Chưa có khung giờ trống để điền tự động', 'error');
                return;
            }
            if (typeof openScheduleEditor !== 'function') return;
            openScheduleEditor(suggestion.week);
            if (!scheduleEditorModal || scheduleEditorModal.hidden) return;
            scheduleEditorDay.value = suggestion.day;
            scheduleEditorSession.value = suggestion.session;
            scheduleEditorPeriod.value = suggestion.period;
            scheduleEditorClass.value = cleanText(loss.item.class).toUpperCase();
            scheduleEditorSubject.value = cleanText(loss.item.subject);
            scheduleEditorTopic.value = '';
            const ppctNote = loss.item.ppctPeriod ? `, Tiết PPCT ${loss.item.ppctPeriod}` : '';
            scheduleEditorNote.value = `Học bù cho tiết Không học Tuần ${loss.week} (${loss.item.day}${ppctNote})`;
            resetScheduleConflictConfirmation?.();
            updateScheduleEditorMappingHint?.();
            showToast('💡 Đã điền gợi ý học bù. Thầy kiểm tra lịch học sinh rồi nhấn “Thêm tiết học bù”.', 'info');
        }

        function openAutomationTarget(target, week) {
            const normalizedWeek = Number.parseInt(week, 10) || getAutomationSelectedWeek();
            if (target === 'plan') {
                activateOverviewTab('plan');
                if (typeof showPlanWeek === 'function' && state.planData?.some(item => Number(item.week) === normalizedWeek)) showPlanWeek(normalizedWeek, true);
                return;
            }
            if (target === 'timetable') {
                if (typeof openYearDashboardWeek === 'function') openYearDashboardWeek(normalizedWeek, 'timetable');
                else activateOverviewTab('timetable');
                return;
            }
            if (typeof openYearDashboardWeek === 'function') openYearDashboardWeek(normalizedWeek, 'teaching');
            else activateOverviewTab('teaching');
        }

        function handleAutomationAction(button) {
            const action = button.dataset.automationAction;
            const week = Number.parseInt(button.dataset.week, 10) || getAutomationSelectedWeek();
            if (action === 'sync-plan') {
                openAutomationTarget('teaching', week);
                setTimeout(() => typeof openPlanScheduleSyncPreview === 'function' && openPlanScheduleSyncPreview(week), 120);
                return;
            }
            if (action === 'validate') {
                openAutomationTarget('teaching', week);
                setTimeout(() => typeof openScheduleValidationPanel === 'function' && openScheduleValidationPanel(week), 120);
                return;
            }
            if (action === 'prefill-makeup') {
                const snapshot = buildAutomationSnapshot();
                const index = Number.parseInt(button.dataset.lossIndex, 10);
                prefillAutomationMakeup(snapshot.unresolved[index]);
                return;
            }
            if (action === 'open-schedule') {
                openAutomationTarget('teaching', week);
                return;
            }
            openAutomationTarget(button.dataset.target || 'teaching', week);
        }

        function renderAutomationCenter() {
            const root = document.getElementById('automationCenter');
            if (!root) return null;
            const snapshot = buildAutomationSnapshot();
            renderAutomationKpis(snapshot);
            renderAutomationPlanPanel(snapshot);
            renderAutomationMakeupPanel(snapshot);
            renderAutomationWorkflow(snapshot);
            root.dataset.renderedWeek = String(snapshot.week);
            return snapshot;
        }

        function initAutomationCenter() {
            populateAutomationWeekSelect();
            document.getElementById('automationWeekSelect')?.addEventListener('change', renderAutomationCenter);
            document.getElementById('refreshAutomationBtn')?.addEventListener('click', () => {
                renderAutomationCenter();
                showToast('✅ Đã quét lại luồng tự động hóa', 'success');
            });
            document.getElementById('automationCenter')?.addEventListener('click', event => {
                const button = event.target.closest('[data-automation-action]');
                if (button) handleAutomationAction(button);
            });
            let timer = null;
            const scheduleRefresh = () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    populateAutomationWeekSelect(getAutomationSelectedWeek());
                    renderAutomationCenter();
                }, 120);
            };
            window.addEventListener('teacher-data-changed', scheduleRefresh);
            document.addEventListener('click', event => {
                if (event.target.closest('.btn, [data-schedule-action], [data-overview-tab], [data-year-week]')) setTimeout(renderAutomationCenter, 220);
            });
            ['schoolYearSelect','week1StartDateInput','scheduleWeekSelect','timetableWeekSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', scheduleRefresh);
            });
            renderAutomationCenter();
        }
