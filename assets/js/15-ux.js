        // ================================================================
        //  v34 UX OVERVIEW — Hôm nay / Tuần này / Cảnh báo nhanh
        // ================================================================
        function getOverviewCurrentCalendarWeek(today = new Date()) {
            const point = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const weeks = typeof getAcademicCalendarWeekSequence === 'function'
                ? getAcademicCalendarWeekSequence()
                : Array.from({ length: MAX_SCHOOL_WEEKS }, (_, index) => index + 1);
            for (const week of weeks) {
                const info = getWeekDateInfo(week);
                if (!info) continue;
                const start = new Date(info.start.getFullYear(), info.start.getMonth(), info.start.getDate());
                const end = new Date(info.end.getFullYear(), info.end.getMonth(), info.end.getDate(), 23, 59, 59, 999);
                if (point >= start && point <= end) return week;
            }
            return null;
        }

        function getOverviewCurrentWeek(today = new Date()) {
            const calendarWeek = getOverviewCurrentCalendarWeek(today);
            return isMainSchoolWeek(calendarWeek) ? calendarWeek : null;
        }

        function overviewDayLabel(date = new Date()) {
            const labels = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            return labels[date.getDay()] || '';
        }

        function renderTeacherOverview() {
            const title = document.getElementById('overviewTitle');
            if (!title) return;
            const today = new Date();
            const calendarWeek = getOverviewCurrentCalendarWeek(today);
            const week = isMainSchoolWeek(calendarWeek) ? calendarWeek : null;
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
            const calendarWeekLabel = calendarWeek ? getPlanWeekLabel(calendarWeek) : '';
            subtitle.textContent = calendarWeek
                ? `Năm học ${state.selectedAcademicYear} · đang ở ${calendarWeekLabel} trong lịch ${TOTAL_ACADEMIC_CALENDAR_WEEKS} tuần`
                : `Năm học ${state.selectedAcademicYear} · ngoài lịch tối đa ${TOTAL_ACADEMIC_CALENDAR_WEEKS} tuần đã thiết lập`;
            if (context) context.textContent = calendarWeek ? `${state.selectedAcademicYear} · ${calendarWeekLabel}` : state.selectedAcademicYear;

            if (calendarWeek) {
                const info = getWeekDateInfo(calendarWeek);
                weekValue.textContent = calendarWeekLabel;
                weekMeta.textContent = info?.rangeText || 'Tuần hiện tại';
            } else {
                weekValue.textContent = 'Ngoài kỳ';
                weekMeta.textContent = 'Kiểm tra ngày Tuần 1';
            }

            const lessonCount = week ? getTodayTeachingItems(week, dayLabel).length : 0;
            lessonValue.textContent = lessonCount ? `${lessonCount} tiết` : 'Chưa có';
            lessonMeta.textContent = lessonCount
                ? `${dayLabel} theo TKB tuần ${week}`
                : (calendarWeek && isAuxiliaryPlanWeek(calendarWeek) ? 'Tuần phụ trước khai giảng · chưa tính TKB' : 'Không thấy tiết trong TKB hôm nay');

            const weekStatus = week ? getWeekOperationalStatus(week) : null;
            const scheduleItems = weekStatus?.schedule || [];
            const meta = weekStatus?.meta || {};
            if (calendarWeek && isAuxiliaryPlanWeek(calendarWeek)) {
                scheduleValue.textContent = 'Tuần phụ';
                scheduleMetaEl.textContent = 'Không tính PPCT / lịch báo giảng';
            } else if (!weekStatus?.hasSchedule) {
                scheduleValue.textContent = 'Chưa tạo';
                scheduleMetaEl.textContent = week ? `Lịch báo giảng Tuần ${week}` : 'Lịch báo giảng';
            } else if (weekStatus.stale) {
                scheduleValue.textContent = 'Cần tạo lại';
                scheduleMetaEl.textContent = 'Nguồn dữ liệu đã thay đổi';
            } else if (weekStatus.finalized) {
                scheduleValue.textContent = 'Đã chốt';
                scheduleMetaEl.textContent = `${scheduleItems.length} dòng lịch Tuần ${week}`;
            } else {
                scheduleValue.textContent = 'Bản nháp';
                scheduleMetaEl.textContent = `${scheduleItems.length} dòng lịch Tuần ${week}`;
            }

            const pendingTasks = getPendingWorkTasks();
            const todayIso = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
            const overdue = pendingTasks.filter(item => item.dueDate && item.dueDate < todayIso).length;
            taskValue.textContent = pendingTasks.length ? `${pendingTasks.length} việc` : 'Đã xong';
            taskMeta.textContent = overdue ? `${overdue} việc đã quá hạn` : 'Nhiệm vụ chưa hoàn thành';

            const issues = [];
            let level = 'ok';
            if (calendarWeek && isAuxiliaryPlanWeek(calendarWeek)) {
                const hasAuxPlan = state.planData?.some(item => Number.parseInt(item?.week, 10) === calendarWeek);
                if (!hasAuxPlan) issues.push(`chưa có kế hoạch ${getPlanWeekLabel(calendarWeek).toLowerCase()}`);
            }
            if (weekStatus && !weekStatus.hasPlan) issues.push('chưa có kế hoạch trường');
            if (weekStatus && !weekStatus.hasTimetable) issues.push('chưa có TKB tuần');
            if (weekStatus?.stale) { issues.push('lịch báo giảng cần tạo lại'); level = 'danger'; }
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
            registerMinuteRefresh('teacher-overview', renderTeacherOverview);
            renderTeacherOverview();
        }
