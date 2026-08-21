        // ================================================================
        //  v34 UX OVERVIEW — Hôm nay / Tuần này / Cảnh báo nhanh
        // ================================================================
        function getOverviewCurrentWeek(today = new Date()) {
            const point = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                const info = getWeekDateInfo(week);
                if (!info) continue;
                const start = new Date(info.start.getFullYear(), info.start.getMonth(), info.start.getDate());
                const end = new Date(info.end.getFullYear(), info.end.getMonth(), info.end.getDate(), 23, 59, 59, 999);
                if (point >= start && point <= end) return week;
            }
            return null;
        }

        function overviewDayLabel(date = new Date()) {
            const labels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            return labels[date.getDay()] || '';
        }

        function countTodayTimetableLessons(week, dayLabel) {
            const timetable = state.timetablesByWeek?.[week];
            if (!timetable?.sessions) return 0;
            return timetable.sessions.reduce((total, session) => total + (session.periods || []).reduce((sum, period) => {
                return sum + (period.cells || []).filter(cell => normalizeDayName(cell?.day) === dayLabel).length;
            }, 0), 0);
        }

        function getOverviewPendingTasks() {
            const personal = normalizeWorkItems(state.workItems, 'personal');
            const shared = sharedWorkScopeAvailable() ? normalizeWorkItems(state.sharedWorkItems, 'shared') : [];
            const all = [...personal, ...shared];
            return all.filter(item => item.type === 'task' && !item.completed);
        }

        function renderTeacherOverview() {
            const title = document.getElementById('overviewTitle');
            if (!title) return;
            const today = new Date();
            const week = getOverviewCurrentWeek(today);
            const dayLabel = overviewDayLabel(today);
            const context = document.getElementById('headerAcademicContext');
            const weekValue = document.getElementById('overviewWeekValue');
            const weekMeta = document.getElementById('overviewWeekMeta');
            const lessonValue = document.getElementById('overviewLessonValue');
            const lessonMeta = document.getElementById('overviewLessonMeta');
            const scheduleValue = document.getElementById('overviewScheduleValue');
            const scheduleMetaEl = document.getElementById('overviewScheduleMeta');
            const taskValue = document.getElementById('overviewTaskValue');
            const taskMeta = document.getElementById('overviewTaskMeta');
            const subtitle = document.getElementById('overviewSubtitle');
            const alert = document.getElementById('overviewAlert');
            const alertIcon = document.getElementById('overviewAlertIcon');
            const alertText = document.getElementById('overviewAlertText');

            const dateText = today.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
            title.textContent = `${dayLabel} · ${today.toLocaleDateString('vi-VN')}`;
            subtitle.textContent = week ? `Năm học ${state.selectedAcademicYear} · đang ở Tuần ${week}` : `Năm học ${state.selectedAcademicYear} · ngoài khoảng 37 tuần đã thiết lập`;
            if (context) context.textContent = week ? `${state.selectedAcademicYear} · Tuần ${week}` : state.selectedAcademicYear;

            if (week) {
                const info = getWeekDateInfo(week);
                weekValue.textContent = `Tuần ${week}`;
                weekMeta.textContent = info?.rangeText || 'Tuần hiện tại';
            } else {
                weekValue.textContent = 'Ngoài kỳ';
                weekMeta.textContent = 'Kiểm tra ngày Tuần 1';
            }

            const lessonCount = week ? countTodayTimetableLessons(week, dayLabel) : 0;
            lessonValue.textContent = lessonCount ? `${lessonCount} tiết` : 'Chưa có';
            lessonMeta.textContent = lessonCount ? `${dayLabel} theo TKB tuần ${week}` : 'Không thấy tiết trong TKB hôm nay';

            const scheduleItems = week ? (state.teachingSchedule?.[week] || []) : [];
            const meta = week ? (state.scheduleMeta?.[week] || {}) : {};
            if (!scheduleItems.length) {
                scheduleValue.textContent = 'Chưa tạo';
                scheduleMetaEl.textContent = week ? `Lịch báo giảng Tuần ${week}` : 'Lịch báo giảng';
            } else if (meta.stale) {
                scheduleValue.textContent = 'Cần tạo lại';
                scheduleMetaEl.textContent = 'Nguồn dữ liệu đã thay đổi';
            } else if (meta.status === 'finalized') {
                scheduleValue.textContent = 'Đã chốt';
                scheduleMetaEl.textContent = `${scheduleItems.length} dòng lịch Tuần ${week}`;
            } else {
                scheduleValue.textContent = 'Bản nháp';
                scheduleMetaEl.textContent = `${scheduleItems.length} dòng lịch Tuần ${week}`;
            }

            const pendingTasks = getOverviewPendingTasks();
            const todayIso = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
            const overdue = pendingTasks.filter(item => item.dueDate && item.dueDate < todayIso).length;
            taskValue.textContent = pendingTasks.length ? `${pendingTasks.length} việc` : 'Đã xong';
            taskMeta.textContent = overdue ? `${overdue} việc đã quá hạn` : 'Nhiệm vụ chưa hoàn thành';

            const issues = [];
            let level = 'ok';
            if (week && !state.planData?.some(item => Number(item.week) === Number(week))) issues.push('chưa có kế hoạch trường');
            if (week && !state.timetablesByWeek?.[week]) issues.push('chưa có TKB tuần');
            if (meta.stale) { issues.push('lịch báo giảng cần tạo lại'); level = 'danger'; }
            if (overdue) { issues.push(`${overdue} việc quá hạn`); if (level !== 'danger') level = 'warning'; }
            if (issues.length && level === 'ok') level = 'warning';
            alert.className = 'overview-alert' + (level === 'warning' ? ' warning' : level === 'danger' ? ' danger' : '');
            alertIcon.textContent = issues.length ? (level === 'danger' ? '!' : '⚠') : '✓';
            alertText.textContent = issues.length ? `Cần chú ý: ${issues.join(' · ')}.` : `Dữ liệu ${dateText} đang ở trạng thái tốt.`;
        }

        function activateOverviewTab(tabName) {
            const button = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
            if (!button) return;
            button.click();
            document.getElementById('tabNav')?.scrollIntoView({ behavior:'smooth', block:'start' });
        }

        function openSettingsHub() {
            const hub = document.getElementById('settingsHub');
            if (!hub) return;
            hub.open = true;
            hub.scrollIntoView({ behavior:'smooth', block:'start' });
        }

        function initTeacherOverview() {
            document.getElementById('openSettingsHubBtn')?.addEventListener('click', openSettingsHub);
            document.querySelectorAll('[data-overview-tab]').forEach(button => {
                button.addEventListener('click', () => activateOverviewTab(button.dataset.overviewTab));
            });
            ['schoolYearSelect','week1StartDateInput','scheduleWeekSelect','timetableWeekSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => setTimeout(renderTeacherOverview, 0));
            });
            document.addEventListener('click', event => {
                if (event.target.closest('.btn, .tab-btn, [data-work-action], [data-schedule-action]')) {
                    setTimeout(renderTeacherOverview, 120);
                }
            });
            setInterval(renderTeacherOverview, 60000);
            renderTeacherOverview();
        }
