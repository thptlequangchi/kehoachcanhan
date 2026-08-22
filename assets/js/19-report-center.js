        // ================================================================
        //  v40 REPORT CENTER — Báo cáo & xuất hồ sơ giáo viên
        // ================================================================
        const REPORT_SCOPE_STORAGE = 'teacher_report_scope_v40';
        const REPORT_MONTH_STORAGE = 'teacher_report_month_v40';
        let reportCenterInitialized = false;

        function reportEscape(value) {
            return typeof escapeHTML === 'function'
                ? escapeHTML(String(value ?? ''))
                : String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
        }

        function reportClean(value) {
            return typeof cleanText === 'function' ? cleanText(value) : String(value ?? '').trim();
        }

        function reportClassKey(value) {
            return typeof normalizeClassKey === 'function'
                ? normalizeClassKey(value)
                : reportClean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
        }

        function reportSubjectKey(value) {
            if (typeof canonicalScheduleSubjectKey === 'function') return canonicalScheduleSubjectKey(value);
            if (typeof normalizeLookupText === 'function') return normalizeLookupText(value);
            return reportClean(value).toLowerCase();
        }

        function reportCurrentWeek() {
            if (typeof getYearDashboardCurrentWeek === 'function') {
                const value = Number.parseInt(getYearDashboardCurrentWeek(new Date()), 10);
                if (value > 0 && value <= MAX_SCHOOL_WEEKS) return value;
            }
            if (typeof getDefaultProgressWeek === 'function') {
                const value = Number.parseInt(getDefaultProgressWeek(), 10);
                if (value > 0 && value <= MAX_SCHOOL_WEEKS) return value;
            }
            return Math.max(1, Math.min(MAX_SCHOOL_WEEKS, Number.parseInt(state?.selectedTimetableWeek, 10) || 1));
        }

        function reportAcademicYearParts() {
            const match = String(state?.selectedAcademicYear || '').match(/^(20\d{2})-(20\d{2})$/);
            const now = new Date();
            const start = match ? Number(match[1]) : (now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1);
            return { start, end: start + 1 };
        }

        function reportPopulateWeekSelect(select, preferred) {
            if (!select) return;
            const keep = Number.parseInt(preferred ?? select.value, 10);
            select.innerHTML = '';
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                const option = document.createElement('option');
                option.value = String(week);
                option.textContent = `Tuần ${week}`;
                select.appendChild(option);
            }
            select.value = String(keep > 0 && keep <= MAX_SCHOOL_WEEKS ? keep : 1);
        }

        function reportPopulateMonthSelect(preferred = '') {
            const select = document.getElementById('reportMonthSelect');
            if (!select) return;
            const { start, end } = reportAcademicYearParts();
            const values = [];
            for (let month = 8; month <= 12; month++) values.push({ year:start, month });
            for (let month = 1; month <= 7; month++) values.push({ year:end, month });
            select.innerHTML = '';
            values.forEach(({ year, month }) => {
                const value = `${year}-${String(month).padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = value;
                option.textContent = new Intl.DateTimeFormat('vi-VN', { month:'long', year:'numeric' }).format(new Date(year, month - 1, 1));
                select.appendChild(option);
            });
            const nowValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const stored = preferred || localStorage.getItem(REPORT_MONTH_STORAGE) || nowValue;
            select.value = values.some(item => `${item.year}-${String(item.month).padStart(2, '0')}` === stored)
                ? stored : `${start}-08`;
        }

        function reportResolveMonthWeeks(monthValue) {
            const match = String(monthValue || '').match(/^(20\d{2})-(\d{2})$/);
            if (!match) return [];
            const year = Number(match[1]);
            const month = Number(match[2]);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
            const weeks = [];
            if (typeof getWeekDateInfo !== 'function') return weeks;
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                const info = getWeekDateInfo(week);
                if (!info?.start || !info?.end) continue;
                if (info.start <= monthEnd && info.end >= monthStart) weeks.push(week);
            }
            return weeks;
        }

        function reportRangeDates(startWeek, endWeek) {
            if (typeof getWeekDateInfo !== 'function') return { start:null, end:null, text:'' };
            const first = getWeekDateInfo(startWeek);
            const last = getWeekDateInfo(endWeek);
            const start = first?.start || null;
            const end = last?.end || null;
            return {
                start,
                end,
                text: start && end ? `${start.toLocaleDateString('vi-VN')} – ${end.toLocaleDateString('vi-VN')}` : '',
            };
        }

        function getReportRange() {
            const scope = document.getElementById('reportScopeSelect')?.value || 'currentMonth';
            const current = reportCurrentWeek();
            let weeks = [];
            let label = '';
            if (scope === 'currentWeek') {
                weeks = [current];
                label = `Tuần ${current}`;
            } else if (scope === 'semester1') {
                weeks = Array.from({ length:18 }, (_, index) => index + 1);
                label = 'Học kỳ I · Tuần 1–18';
            } else if (scope === 'semester2') {
                weeks = Array.from({ length:MAX_SCHOOL_WEEKS - 18 }, (_, index) => index + 19);
                label = `Học kỳ II · Tuần 19–${MAX_SCHOOL_WEEKS}`;
            } else if (scope === 'year') {
                weeks = Array.from({ length:MAX_SCHOOL_WEEKS }, (_, index) => index + 1);
                label = `Cả năm học ${state.selectedAcademicYear}`;
            } else if (scope === 'custom') {
                let start = Number.parseInt(document.getElementById('reportStartWeek')?.value, 10) || 1;
                let end = Number.parseInt(document.getElementById('reportEndWeek')?.value, 10) || start;
                if (start > end) [start, end] = [end, start];
                weeks = Array.from({ length:end - start + 1 }, (_, index) => start + index);
                label = start === end ? `Tuần ${start}` : `Tuần ${start}–${end}`;
            } else {
                const month = document.getElementById('reportMonthSelect')?.value || '';
                weeks = reportResolveMonthWeeks(month);
                if (!weeks.length) weeks = [current];
                const monthSelect = document.getElementById('reportMonthSelect');
                label = monthSelect?.selectedOptions?.[0]?.textContent || `Tháng ${month}`;
            }
            weeks = [...new Set(weeks)].filter(week => week > 0 && week <= MAX_SCHOOL_WEEKS).sort((a, b) => a - b);
            if (!weeks.length) weeks = [current];
            const startWeek = weeks[0];
            const endWeek = weeks[weeks.length - 1];
            const dates = reportRangeDates(startWeek, endWeek);
            return { scope, weeks, startWeek, endWeek, label, ...dates };
        }

        function reportUpdateScopeFields() {
            const scope = document.getElementById('reportScopeSelect')?.value || 'currentMonth';
            const monthField = document.getElementById('reportMonthField');
            const customFields = document.getElementById('reportCustomWeekFields');
            if (monthField) monthField.hidden = scope !== 'currentMonth';
            if (customFields) customFields.hidden = scope !== 'custom';
        }

        function reportBuildCourseCatalogSafe() {
            if (typeof buildProgressCourseCatalog === 'function') return buildProgressCourseCatalog();
            const map = new Map();
            Object.values(state?.teachingSchedule || {}).forEach(items => (items || []).forEach(item => {
                const className = reportClean(item?.class);
                const subject = reportClean(item?.subject);
                const classKey = reportClassKey(className);
                const subjectKey = reportSubjectKey(subject);
                if (!classKey || !subjectKey) return;
                map.set(`${classKey}|${subjectKey}`, { classKey, className, subjectKey, subject });
            }));
            return Array.from(map.values());
        }

        function reportRefreshCourseFilters() {
            const classSelect = document.getElementById('reportClassSelect');
            const subjectSelect = document.getElementById('reportSubjectSelect');
            if (!classSelect || !subjectSelect) return;
            const catalog = reportBuildCourseCatalogSafe();
            const previousClass = classSelect.value;
            const classMap = new Map();
            catalog.forEach(course => classMap.set(course.classKey, course.className));
            classSelect.innerHTML = '<option value="">Tất cả lớp</option>';
            Array.from(classMap, ([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, 'vi', { numeric:true }))
                .forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.value;
                    option.textContent = item.label;
                    classSelect.appendChild(option);
                });
            classSelect.value = classMap.has(previousClass) ? previousClass : '';

            const previousSubject = subjectSelect.value;
            const subjectMap = new Map();
            catalog.filter(course => !classSelect.value || course.classKey === classSelect.value)
                .forEach(course => subjectMap.set(course.subjectKey, course.subject));
            subjectSelect.innerHTML = '<option value="">Tất cả môn</option>';
            Array.from(subjectMap, ([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
                .forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.value;
                    option.textContent = item.label;
                    subjectSelect.appendChild(option);
                });
            subjectSelect.value = subjectMap.has(previousSubject) ? previousSubject : '';
        }

        function reportMatchesFilters(className, subject, filters) {
            if (filters.classKey && reportClassKey(className) !== filters.classKey) return false;
            if (filters.subjectKey && reportSubjectKey(subject) !== filters.subjectKey) return false;
            return true;
        }

        function reportDateForScheduleItem(week, dayName) {
            if (typeof getWeekDateInfo !== 'function') return '';
            const info = getWeekDateInfo(week);
            if (!info?.start) return '';
            const normalizedDay = typeof normalizeDayName === 'function' ? normalizeDayName(dayName) : dayName;
            const days = Array.isArray(globalThis.PLAN_DAYS) ? PLAN_DAYS : ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
            const index = days.indexOf(normalizedDay);
            if (index < 0) return '';
            const date = new Date(info.start);
            date.setDate(date.getDate() + index);
            return date.toLocaleDateString('vi-VN');
        }

        function reportCollectScheduleRows(range, filters) {
            const rows = [];
            range.weeks.forEach(week => {
                const source = state?.teachingSchedule?.[week] || [];
                const items = typeof getSortedScheduleItems === 'function' ? getSortedScheduleItems(source) : source;
                (items || []).forEach(item => {
                    if (!reportMatchesFilters(item?.class, item?.subject, filters)) return;
                    rows.push({
                        week,
                        date: reportDateForScheduleItem(week, item?.day),
                        day: reportClean(item?.day),
                        session: reportClean(item?.session),
                        period: reportClean(item?.period),
                        ppctPeriod: item?.notTeaching ? '' : reportClean(item?.ppctPeriod),
                        className: reportClean(item?.class),
                        subject: reportClean(item?.subject),
                        topic: item?.notTeaching
                            ? `KHÔNG HỌC${reportClean(item?.notTeachingReason) ? ` — ${reportClean(item.notTeachingReason)}` : ''}`
                            : reportClean(item?.topic),
                        note: [item?.makeupLesson ? 'Tiết học bù' : '', reportClean(item?.note)].filter(Boolean).join(' — '),
                        notTeaching: Boolean(item?.notTeaching),
                        makeupLesson: Boolean(item?.makeupLesson),
                    });
                });
            });
            return rows;
        }

        function reportCollectPlanRows(range) {
            const rows = [];
            range.weeks.forEach(week => {
                const plan = (state?.planData || []).find(item => Number.parseInt(item?.week, 10) === week);
                if (!plan) return;
                (plan.days || []).forEach(day => {
                    const morning = reportClean(day?.morning);
                    const afternoon = reportClean(day?.afternoon);
                    const trip = reportClean(day?.businessTrip);
                    if (!morning && !afternoon && !trip) return;
                    rows.push({
                        week,
                        date: reportClean(day?.date),
                        day: reportClean(day?.day),
                        morning,
                        afternoon,
                        businessTrip: trip,
                    });
                });
            });
            return rows;
        }

        function reportWorkItemDate(item) {
            const due = item?.dueDate ? new Date(`${item.dueDate}T12:00:00`) : null;
            if (due && !Number.isNaN(due.getTime())) return due;
            const updated = new Date(item?.updatedAt || item?.createdAt || '');
            return Number.isNaN(updated.getTime()) ? null : updated;
        }

        function reportCollectWorkRows(range) {
            const map = new Map();
            const add = (item, scope) => {
                if (!item) return;
                const key = `${scope}:${item.id || `${item.title}|${item.createdAt}`}`;
                map.set(key, { ...item, scope });
            };
            (state?.workItems || []).forEach(item => add(item, 'personal'));
            (state?.sharedWorkItems || []).forEach(item => add(item, 'shared'));
            return Array.from(map.values()).filter(item => {
                const date = reportWorkItemDate(item);
                if (!range.start || !range.end || !date) return range.scope === 'year';
                return date >= range.start && date <= range.end;
            }).sort((a, b) => {
                const ad = reportWorkItemDate(a)?.getTime() || 0;
                const bd = reportWorkItemDate(b)?.getTime() || 0;
                return ad - bd;
            }).map(item => ({
                type: item.type || 'note',
                title: reportClean(item.title),
                dueDate: reportClean(item.dueDate),
                completed: Boolean(item.completed),
                scope: item.scope,
                owner: reportClean(item.createdByName) || (item.scope === 'shared' ? 'Nhóm giáo viên' : 'Cá nhân'),
                content: reportClean(item.content),
            }));
        }

        function reportBuildProgressRows(endWeek, filters) {
            const catalog = reportBuildCourseCatalogSafe().filter(course => reportMatchesFilters(course.className, course.subject, filters));
            if (typeof buildCourseProgressRow !== 'function') return [];
            return catalog.map(course => buildCourseProgressRow(course, endWeek));
        }

        function reportWeekSummary(range) {
            return range.weeks.map(week => {
                const plan = (state?.planData || []).find(item => Number.parseInt(item?.week, 10) === week);
                const timetable = state?.timetablesByWeek?.[week] || null;
                const timetableCount = typeof getTimetableLessonCount === 'function' ? getTimetableLessonCount(timetable) : 0;
                const schedule = state?.teachingSchedule?.[week] || [];
                const meta = state?.scheduleMeta?.[week] || {};
                const info = typeof getWeekDateInfo === 'function' ? getWeekDateInfo(week) : null;
                let status = 'Chưa có lịch';
                if (schedule.length) status = meta?.stale ? 'Cần tạo lại' : meta?.status === 'final' ? 'Đã chốt' : 'Bản nháp';
                return {
                    week,
                    dateRange: info?.rangeText || reportClean(plan?.dateRange),
                    hasPlan: Boolean(plan),
                    timetableCount,
                    scheduleCount: schedule.length,
                    status,
                    finalized: Boolean(schedule.length && meta?.status === 'final' && !meta?.stale),
                };
            });
        }

        function buildReportSnapshot() {
            reportRefreshCourseFilters();
            const range = getReportRange();
            const filters = {
                classKey: document.getElementById('reportClassSelect')?.value || '',
                subjectKey: document.getElementById('reportSubjectSelect')?.value || '',
            };
            const weekRows = reportWeekSummary(range);
            const scheduleRows = reportCollectScheduleRows(range, filters);
            const planRows = reportCollectPlanRows(range);
            const progressRows = reportBuildProgressRows(range.endWeek, filters);
            const workRows = reportCollectWorkRows(range);
            const effectiveEnd = Math.min(range.endWeek, reportCurrentWeek());
            const evaluableWeeks = range.weeks.filter(week => week <= effectiveEnd);
            const evaluated = weekRows.filter(row => evaluableWeeks.includes(row.week));
            const planCoverage = weekRows.filter(row => row.hasPlan).length;
            const timetableCoverage = weekRows.filter(row => row.timetableCount > 0).length;
            const scheduleCoverage = weekRows.filter(row => row.scheduleCount > 0).length;
            const finalizedWeeks = weekRows.filter(row => row.finalized).length;
            const activeLessons = scheduleRows.filter(row => !row.notTeaching).length;
            const canceledLessons = scheduleRows.filter(row => row.notTeaching).length;
            const makeupLessons = scheduleRows.filter(row => row.makeupLesson && !row.notTeaching).length;
            const behindCourses = progressRows.filter(row => row.status === 'behind' || row.forecastState === 'risk').length;
            const denominator = Math.max(1, evaluated.length * 4);
            const completionPoints = evaluated.reduce((sum, row) => sum
                + Number(row.hasPlan)
                + Number(row.timetableCount > 0)
                + Number(row.scheduleCount > 0)
                + Number(row.finalized), 0);
            const completionPercent = Math.round(completionPoints * 100 / denominator);
            const profile = typeof normalizeTeacherProfile === 'function'
                ? normalizeTeacherProfile(state?.teacherProfile || {})
                : (state?.teacherProfile || {});
            return {
                academicYear: state?.selectedAcademicYear || profile.academicYear || '',
                profile,
                range,
                filters,
                weekRows,
                scheduleRows,
                planRows,
                progressRows,
                workRows,
                stats: {
                    weekCount: range.weeks.length,
                    planCoverage,
                    timetableCoverage,
                    scheduleCoverage,
                    finalizedWeeks,
                    activeLessons,
                    canceledLessons,
                    makeupLessons,
                    behindCourses,
                    completionPercent,
                    evaluableCount: evaluated.length,
                },
            };
        }

        function reportStatusClass(status) {
            if (status === 'Đã chốt') return 'good';
            if (status === 'Cần tạo lại') return 'danger';
            if (status === 'Bản nháp') return 'warning';
            return '';
        }

        function reportRenderKpis(snapshot) {
            const values = {
                reportKpiWeeks: snapshot.stats.weekCount,
                reportKpiPlan: `${snapshot.stats.planCoverage}/${snapshot.stats.weekCount}`,
                reportKpiTimetable: `${snapshot.stats.timetableCoverage}/${snapshot.stats.weekCount}`,
                reportKpiFinal: `${snapshot.stats.finalizedWeeks}/${snapshot.stats.weekCount}`,
                reportKpiLessons: snapshot.stats.activeLessons,
                reportKpiCanceled: snapshot.stats.canceledLessons,
                reportKpiMakeup: snapshot.stats.makeupLessons,
                reportKpiBehind: snapshot.stats.behindCourses,
            };
            Object.entries(values).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = String(value);
            });
            const bar = document.getElementById('reportCompletionBar');
            const text = document.getElementById('reportCompletionText');
            if (bar) bar.style.width = `${snapshot.stats.completionPercent}%`;
            if (text) text.textContent = snapshot.stats.evaluableCount
                ? `${snapshot.stats.completionPercent}% hoàn thiện hồ sơ đến Tuần ${Math.min(snapshot.range.endWeek, reportCurrentWeek())}`
                : 'Chưa có tuần cần đánh giá trong phạm vi này';
            const subtitle = document.getElementById('reportCenterSubtitle');
            if (subtitle) subtitle.textContent = `${snapshot.range.label}${snapshot.range.text ? ` · ${snapshot.range.text}` : ''} · Năm học ${snapshot.academicYear}`;
            const hint = document.getElementById('reportRangeHint');
            if (hint) hint.innerHTML = `<strong>${reportEscape(snapshot.range.label)}</strong>${snapshot.range.text ? ` · ${reportEscape(snapshot.range.text)}` : ''} · ${snapshot.stats.scheduleCoverage}/${snapshot.stats.weekCount} tuần có lịch báo giảng`;
        }

        function reportTable(rows, headers, mapper, emptyText, limit = 200) {
            if (!rows.length) return `<div class="report-empty">${reportEscape(emptyText)}</div>`;
            const shown = rows.slice(0, limit);
            const head = headers.map(item => `<th>${reportEscape(item)}</th>`).join('');
            const body = shown.map(mapper).join('');
            const note = rows.length > limit ? `<div class="report-table-note">Đang xem ${limit}/${rows.length} dòng. File xuất vẫn chứa toàn bộ dữ liệu.</div>` : '';
            return `${note}<div class="report-table-wrap"><table class="report-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
        }

        function reportRenderPreview(snapshot) {
            const preview = document.getElementById('reportPreview');
            if (!preview) return;
            const weekTable = reportTable(snapshot.weekRows,
                ['Tuần','Khoảng ngày','Kế hoạch','TKB','Báo giảng','Trạng thái'],
                row => `<tr><td class="text-center"><strong>${row.week}</strong></td><td>${reportEscape(row.dateRange || '—')}</td><td class="text-center">${row.hasPlan ? '✓' : '—'}</td><td class="text-center">${row.timetableCount || '—'}</td><td class="text-center">${row.scheduleCount || '—'}</td><td><span class="report-status ${reportStatusClass(row.status)}">${reportEscape(row.status)}</span></td></tr>`,
                'Chưa có dữ liệu tuần trong phạm vi báo cáo.', 80);
            const scheduleTable = reportTable(snapshot.scheduleRows,
                ['Tuần','Ngày','Thứ','Buổi','Tiết TKB','PPCT','Lớp','Môn','Bài dạy / Chủ đề','Ghi chú'],
                row => `<tr${row.notTeaching ? ' class="report-row-muted"' : ''}><td>${row.week}</td><td>${reportEscape(row.date || '—')}</td><td>${reportEscape(row.day)}</td><td>${reportEscape(row.session)}</td><td class="text-center">${reportEscape(row.period)}</td><td class="text-center">${reportEscape(row.ppctPeriod || '—')}</td><td>${reportEscape(row.className)}</td><td>${reportEscape(row.subject)}</td><td>${reportEscape(row.topic || '—')}</td><td>${reportEscape(row.note || '')}</td></tr>`,
                'Phạm vi này chưa có Lịch báo giảng phù hợp bộ lọc.', 220);
            const progressTable = reportTable(snapshot.progressRows,
                ['Lớp','Môn','PPCT kế hoạch','PPCT thực tế','Tiến độ','Bài đang dạy','Không học','Học bù','Dự báo'],
                row => `<tr><td>${reportEscape(row.className)}</td><td>${reportEscape(row.subject)}</td><td class="text-center">${row.plannedPpct || '—'}</td><td class="text-center">${row.actualPpct || '—'}</td><td><span class="report-status ${row.status === 'behind' || row.forecastState === 'risk' ? 'danger' : row.status === 'ahead' ? 'warning' : 'good'}">${reportEscape(row.statusLabel)}</span></td><td>${reportEscape(row.currentTopic || '—')}</td><td class="text-center">${row.canceledCount}</td><td class="text-center">${row.makeupCount}</td><td>${reportEscape(row.forecastLabel)}</td></tr>`,
                'Chưa đủ TKB/PPCT/Lịch báo giảng để lập bảng tiến độ.', 160);
            const planTable = reportTable(snapshot.planRows,
                ['Tuần','Ngày','Thứ','Buổi sáng','Buổi chiều','Đi công tác'],
                row => `<tr><td class="text-center">${row.week}</td><td>${reportEscape(row.date || '—')}</td><td>${reportEscape(row.day)}</td><td>${reportEscape(row.morning || '')}</td><td>${reportEscape(row.afternoon || '')}</td><td>${reportEscape(row.businessTrip || '')}</td></tr>`,
                'Chưa có nội dung Kế hoạch trường trong phạm vi báo cáo.', 160);
            const workTable = reportTable(snapshot.workRows,
                ['Loại','Tiêu đề','Hạn/Cập nhật','Phạm vi','Trạng thái','Nội dung'],
                row => `<tr><td>${row.type === 'task' ? 'Nhiệm vụ' : row.type === 'lesson' ? 'Bài soạn' : 'Ghi chú'}</td><td>${reportEscape(row.title)}</td><td>${reportEscape(row.dueDate || '—')}</td><td>${row.scope === 'shared' ? 'Nhóm' : 'Cá nhân'}</td><td>${row.type === 'task' ? (row.completed ? 'Đã xong' : 'Chưa xong') : '—'}</td><td>${reportEscape(row.content || '')}</td></tr>`,
                'Không có mục Sổ công việc phát sinh trong phạm vi này.', 100);
            preview.innerHTML = `
                <details class="report-section" open><summary><span>📌 Tổng hợp theo tuần</span><small>${snapshot.weekRows.length} tuần</small></summary><div class="report-section-body">${weekTable}</div></details>
                <details class="report-section"><summary><span>📖 Lịch báo giảng</span><small>${snapshot.scheduleRows.length} dòng · ${snapshot.stats.activeLessons} tiết học</small></summary><div class="report-section-body">${scheduleTable}</div></details>
                <details class="report-section"><summary><span>📈 Tiến độ PPCT</span><small>${snapshot.progressRows.length} lớp–môn</small></summary><div class="report-section-body">${progressTable}</div></details>
                <details class="report-section"><summary><span>📋 Kế hoạch trường</span><small>${snapshot.planRows.length} dòng có nội dung</small></summary><div class="report-section-body">${planTable}</div></details>
                <details class="report-section"><summary><span>🗂️ Sổ công việc</span><small>${snapshot.workRows.length} mục trong kỳ</small></summary><div class="report-section-body">${workTable}</div></details>`;
        }

        function renderReportCenter() {
            const root = document.getElementById('reportCenterCard');
            if (!root) return null;
            reportUpdateScopeFields();
            const snapshot = buildReportSnapshot();
            reportRenderKpis(snapshot);
            reportRenderPreview(snapshot);
            root.dataset.reportStartWeek = String(snapshot.range.startWeek);
            root.dataset.reportEndWeek = String(snapshot.range.endWeek);
            return snapshot;
        }

        function reportWorkbookRows(snapshot) {
            const summary = [
                [snapshot.profile.schoolName || ''],
                [`BÁO CÁO HỒ SƠ GIẢNG DẠY — ${snapshot.range.label.toUpperCase()}`],
                [`Giáo viên: ${snapshot.profile.teacherName || ''}`, `Môn: ${snapshot.profile.subject || ''}`, `Năm học: ${snapshot.academicYear}`],
                [snapshot.range.text || ''],
                [],
                ['Tuần','Khoảng ngày','Có Kế hoạch','Số tiết TKB','Số dòng Báo giảng','Trạng thái'],
                ...snapshot.weekRows.map(row => [row.week, row.dateRange, row.hasPlan ? 'Có' : 'Chưa', row.timetableCount, row.scheduleCount, row.status]),
            ];
            const schedule = [
                ['Tuần','Ngày','Thứ','Buổi','Tiết TKB','Tiết PPCT','Lớp','Môn','Bài dạy / Chủ đề','Ghi chú'],
                ...snapshot.scheduleRows.map(row => [row.week,row.date,row.day,row.session,row.period,row.ppctPeriod || '—',row.className,row.subject,row.topic,row.note]),
            ];
            const progress = [
                ['Lớp','Môn','PPCT dự kiến','PPCT thực tế','Chênh lệch','Bài đang dạy','Số tiết đã dạy','Không học','Học bù','Trạng thái','Dự báo hoàn thành'],
                ...snapshot.progressRows.map(row => [row.className,row.subject,row.plannedPpct || '',row.actualPpct || '',row.difference ?? '',row.currentTopic || '',row.taughtCount,row.canceledCount,row.makeupCount,row.statusLabel,row.forecastLabel]),
            ];
            const plan = [
                ['Tuần','Ngày','Thứ','Buổi sáng','Buổi chiều','Đi công tác'],
                ...snapshot.planRows.map(row => [row.week,row.date,row.day,row.morning,row.afternoon,row.businessTrip]),
            ];
            const work = [
                ['Loại','Tiêu đề','Hạn','Phạm vi','Trạng thái','Nội dung'],
                ...snapshot.workRows.map(row => [row.type,row.title,row.dueDate,row.scope,row.type === 'task' ? (row.completed ? 'Đã xong' : 'Chưa xong') : '',row.content]),
            ];
            return { summary, schedule, progress, plan, work };
        }

        function reportFilenameSuffix(snapshot) {
            const raw = `${snapshot.academicYear}-${snapshot.range.label}`
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
            return raw || 'bao-cao';
        }

        function exportReportExcel() {
            if (!window.XLSX?.utils) {
                showToast('❌ Thư viện xuất Excel chưa tải được', 'error');
                return;
            }
            const snapshot = buildReportSnapshot();
            const rows = reportWorkbookRows(snapshot);
            const workbook = XLSX.utils.book_new();
            const addSheet = (name, data, widths) => {
                const sheet = XLSX.utils.aoa_to_sheet(data);
                if (widths) sheet['!cols'] = widths.map(wch => ({ wch }));
                XLSX.utils.book_append_sheet(workbook, sheet, name);
            };
            addSheet('Tong quan', rows.summary, [10,24,16,14,16,18]);
            addSheet('Lich bao giang', rows.schedule, [7,12,10,14,8,10,10,14,42,30]);
            addSheet('Tien do PPCT', rows.progress, [10,14,13,13,11,42,13,10,9,18,22]);
            addSheet('Ke hoach truong', rows.plan, [7,12,10,42,42,30]);
            addSheet('Cong viec', rows.work, [12,28,12,12,14,55]);
            XLSX.writeFile(workbook, `ho-so-giang-day-${reportFilenameSuffix(snapshot)}.xlsx`);
            showToast('✅ Đã xuất Excel hồ sơ giảng dạy', 'success');
        }

        function reportDocumentTable(headers, rows, mapper) {
            if (!rows.length) return '<p><i>Chưa có dữ liệu.</i></p>';
            return `<table><thead><tr>${headers.map(item => `<th>${reportEscape(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(mapper).join('')}</tbody></table>`;
        }

        function reportBuildDocumentBody(snapshot) {
            const summaryTable = reportDocumentTable(['Tuần','Khoảng ngày','Kế hoạch','TKB','Báo giảng','Trạng thái'], snapshot.weekRows,
                row => `<tr><td>${row.week}</td><td>${reportEscape(row.dateRange || '—')}</td><td>${row.hasPlan ? 'Có' : 'Chưa'}</td><td>${row.timetableCount || '—'}</td><td>${row.scheduleCount || '—'}</td><td>${reportEscape(row.status)}</td></tr>`);
            const scheduleTable = reportDocumentTable(['Tuần','Ngày','Thứ','Buổi','TKB','PPCT','Lớp','Môn','Bài dạy / Chủ đề','Ghi chú'], snapshot.scheduleRows,
                row => `<tr><td>${row.week}</td><td>${reportEscape(row.date || '—')}</td><td>${reportEscape(row.day)}</td><td>${reportEscape(row.session)}</td><td>${reportEscape(row.period)}</td><td>${reportEscape(row.ppctPeriod || '—')}</td><td>${reportEscape(row.className)}</td><td>${reportEscape(row.subject)}</td><td>${reportEscape(row.topic)}</td><td>${reportEscape(row.note)}</td></tr>`);
            const progressTable = reportDocumentTable(['Lớp','Môn','PPCT KH','PPCT TT','Trạng thái','Bài đang dạy','Không học','Học bù','Dự báo'], snapshot.progressRows,
                row => `<tr><td>${reportEscape(row.className)}</td><td>${reportEscape(row.subject)}</td><td>${row.plannedPpct || '—'}</td><td>${row.actualPpct || '—'}</td><td>${reportEscape(row.statusLabel)}</td><td>${reportEscape(row.currentTopic || '—')}</td><td>${row.canceledCount}</td><td>${row.makeupCount}</td><td>${reportEscape(row.forecastLabel)}</td></tr>`);
            const planTable = reportDocumentTable(['Tuần','Ngày','Thứ','Buổi sáng','Buổi chiều','Đi công tác'], snapshot.planRows,
                row => `<tr><td>${row.week}</td><td>${reportEscape(row.date || '—')}</td><td>${reportEscape(row.day)}</td><td>${reportEscape(row.morning)}</td><td>${reportEscape(row.afternoon)}</td><td>${reportEscape(row.businessTrip)}</td></tr>`);
            const workTable = reportDocumentTable(['Loại','Tiêu đề','Hạn','Phạm vi','Trạng thái','Nội dung'], snapshot.workRows,
                row => `<tr><td>${reportEscape(row.type)}</td><td>${reportEscape(row.title)}</td><td>${reportEscape(row.dueDate || '—')}</td><td>${row.scope === 'shared' ? 'Nhóm' : 'Cá nhân'}</td><td>${row.type === 'task' ? (row.completed ? 'Đã xong' : 'Chưa xong') : '—'}</td><td>${reportEscape(row.content)}</td></tr>`);
            return `
                <div class="report-doc-header">
                    <h3>${reportEscape(snapshot.profile.schoolName || '')}</h3>
                    <h1>BÁO CÁO HỒ SƠ GIẢNG DẠY</h1>
                    <h2>${reportEscape(snapshot.range.label)}</h2>
                    <p>${snapshot.range.text ? `Thời gian: <b>${reportEscape(snapshot.range.text)}</b> · ` : ''}Giáo viên: <b>${reportEscape(snapshot.profile.teacherName || '')}</b> · Môn: <b>${reportEscape(snapshot.profile.subject || '')}</b> · Năm học: <b>${reportEscape(snapshot.academicYear)}</b></p>
                </div>
                <h2>I. TỔNG HỢP</h2>
                <p><b>${snapshot.stats.activeLessons}</b> tiết học · <b>${snapshot.stats.canceledLessons}</b> tiết không học · <b>${snapshot.stats.makeupLessons}</b> tiết học bù · <b>${snapshot.stats.finalizedWeeks}/${snapshot.stats.weekCount}</b> tuần đã chốt · Mức hoàn thiện hồ sơ: <b>${snapshot.stats.completionPercent}%</b>.</p>
                ${summaryTable}
                <h2>II. LỊCH BÁO GIẢNG</h2>${scheduleTable}
                <h2>III. TIẾN ĐỘ PPCT</h2>${progressTable}
                <h2>IV. KẾ HOẠCH NHÀ TRƯỜNG</h2>${planTable}
                <h2>V. SỔ CÔNG VIỆC</h2>${workTable}`;
        }

        function exportReportWord() {
            const snapshot = buildReportSnapshot();
            const body = reportBuildDocumentBody(snapshot);
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                @page { size:A4 landscape; margin:12mm; }
                body { font-family:"Times New Roman",serif; color:#000; font-size:11pt; }
                h1,h2,h3,p { text-align:center; margin:5px 0; } h1{font-size:16pt;} h2{font-size:13pt;margin-top:16px;}
                table { width:100%; border-collapse:collapse; margin:8px 0 14px; font-size:9.5pt; }
                th,td { border:1px solid #000; padding:4px 5px; vertical-align:top; } th{font-weight:bold;text-align:center;}
            </style></head><body>${body}</body></html>`;
            const blob = new Blob(['\ufeff', html], { type:'application/msword;charset=utf-8' });
            if (typeof downloadScheduleBlob === 'function') downloadScheduleBlob(blob, `ho-so-giang-day-${reportFilenameSuffix(snapshot)}.doc`);
            else {
                const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `ho-so-giang-day-${reportFilenameSuffix(snapshot)}.doc`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            showToast('✅ Đã xuất Word hồ sơ giảng dạy', 'success');
        }

        function printReportPdf() {
            const snapshot = buildReportSnapshot();
            const area = document.getElementById('reportPrintArea');
            if (!area) return;
            area.innerHTML = reportBuildDocumentBody(snapshot);
            document.body.classList.add('print-report-mode');
            const cleanup = () => document.body.classList.remove('print-report-mode');
            window.addEventListener('afterprint', cleanup, { once:true });
            window.print();
            setTimeout(cleanup, 1800);
        }

        function openReportCenter() {
            if (typeof activateOverviewTab === 'function') activateOverviewTab('reports');
            else document.querySelector('.tab-btn[data-tab="reports"]')?.click();
            setTimeout(() => {
                renderReportCenter();
                document.getElementById('reportCenterCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
            }, 30);
        }

        function initReportCenter() {
            if (reportCenterInitialized) return;
            const root = document.getElementById('reportCenterCard');
            if (!root) return;
            reportCenterInitialized = true;
            const current = reportCurrentWeek();
            reportPopulateWeekSelect(document.getElementById('reportStartWeek'), Math.max(1, current - 3));
            reportPopulateWeekSelect(document.getElementById('reportEndWeek'), current);
            reportPopulateMonthSelect();
            const scopeSelect = document.getElementById('reportScopeSelect');
            if (scopeSelect) {
                const stored = localStorage.getItem(REPORT_SCOPE_STORAGE);
                scopeSelect.value = ['currentWeek','currentMonth','semester1','semester2','year','custom'].includes(stored) ? stored : 'currentMonth';
            }
            reportRefreshCourseFilters();
            reportUpdateScopeFields();
            ['reportScopeSelect','reportMonthSelect','reportStartWeek','reportEndWeek','reportClassSelect','reportSubjectSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    if (id === 'reportScopeSelect') localStorage.setItem(REPORT_SCOPE_STORAGE, document.getElementById(id).value);
                    if (id === 'reportMonthSelect') localStorage.setItem(REPORT_MONTH_STORAGE, document.getElementById(id).value);
                    if (id === 'reportClassSelect') reportRefreshCourseFilters();
                    reportUpdateScopeFields();
                    renderReportCenter();
                });
            });
            document.getElementById('refreshReportBtn')?.addEventListener('click', () => {
                renderReportCenter();
                showToast('✅ Báo cáo đã được cập nhật từ dữ liệu hiện tại', 'success');
            });
            document.getElementById('exportReportExcelBtn')?.addEventListener('click', exportReportExcel);
            document.getElementById('exportReportWordBtn')?.addEventListener('click', exportReportWord);
            document.getElementById('printReportBtn')?.addEventListener('click', printReportPdf);
            document.getElementById('openReportCenterBtn')?.addEventListener('click', openReportCenter);
            document.querySelector('[data-overview-tab="reports"]')?.addEventListener('click', () => setTimeout(renderReportCenter, 0));
            ['schoolYearSelect','academicYearSelect','progressAcademicYearSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => setTimeout(() => {
                    reportPopulateMonthSelect();
                    reportRefreshCourseFilters();
                    renderReportCenter();
                }, 0));
            });
            document.getElementById('week1StartDateInput')?.addEventListener('change', () => setTimeout(renderReportCenter, 0));
            let timer = null;
            window.addEventListener('teacher-data-changed', () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => { reportRefreshCourseFilters(); renderReportCenter(); }, 100);
            });
            document.addEventListener('click', event => {
                if (event.target.closest('.btn, [data-schedule-action], [data-work-action], [data-automation-action]')) setTimeout(() => {
                    if (document.getElementById('tab-reports')?.classList.contains('active')) renderReportCenter();
                }, 220);
            });
            renderReportCenter();
        }
