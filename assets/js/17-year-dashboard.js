
        // ================================================================
        //  v38 YEAR DASHBOARD — Toàn cảnh 37 tuần
        // ================================================================
        function yearDashboardEscape(value) {
            if (typeof commandEscape === 'function') return commandEscape(value);
            return escapeHTML(cleanText(value));
        }

        function getYearDashboardCurrentWeek(today = new Date()) {
            return typeof getOverviewCurrentWeek === 'function' ? getOverviewCurrentWeek(today) : null;
        }

        function getLatestYearDataWeek() {
            const weeks = [];
            (state.planData || []).forEach(item => weeks.push(Number.parseInt(item?.week, 10)));
            Object.keys(state.timetablesByWeek || {}).forEach(value => weeks.push(Number.parseInt(value, 10)));
            Object.keys(state.teachingSchedule || {}).forEach(value => weeks.push(Number.parseInt(value, 10)));
            weeks.push(Number.parseInt(state.selectedTimetableWeek, 10));
            const workspaceWeek = Number.parseInt(getActiveYearWorkspace?.()?.selectedTeachingWeek, 10);
            if (workspaceWeek) weeks.push(workspaceWeek);
            return Math.max(0, ...weeks.filter(week => week > 0 && week <= MAX_SCHOOL_WEEKS));
        }

        function getYearDashboardReferenceWeek(today = new Date()) {
            return getYearDashboardCurrentWeek(today) || getLatestYearDataWeek() || 1;
        }

        function getYearWeekState(week, referenceWeek) {
            const status = getWeekOperationalStatus(week);
            const future = week > referenceWeek && !status.hasPlan && !status.hasTimetable && !status.hasSchedule;
            return { ...status, week:Number(week), future };
        }

        function buildYearDashboardSnapshot(today = new Date()) {
            const currentWeek = getYearDashboardCurrentWeek(today);
            const referenceWeek = getYearDashboardReferenceWeek(today);
            const weekStates = [];
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) weekStates.push(getYearWeekState(week, referenceWeek));
            const elapsedStates = weekStates.filter(item => item.week <= referenceWeek);
            const progressSnapshot = buildProgressAttentionSnapshot(referenceWeek);
            const courseRows = progressSnapshot.courseRows;
            const onTrackRows = progressSnapshot.onTrackRows;
            const attentionRows = progressSnapshot.attentionRows;
            return {
                currentWeek,
                referenceWeek,
                weekStates,
                elapsedStates,
                planCount: elapsedStates.filter(item => item.hasPlan).length,
                timetableCount: elapsedStates.filter(item => item.hasTimetable).length,
                scheduleCount: elapsedStates.filter(item => item.hasSchedule).length,
                finalizedCount: elapsedStates.filter(item => item.finalized).length,
                staleCount: elapsedStates.filter(item => item.stateKey === 'stale').length,
                draftCount: elapsedStates.filter(item => item.stateKey === 'draft').length,
                courseRows,
                onTrackRows,
                attentionRows,
                schoolProgressPercent: currentWeek ? Math.min(100, Math.round(currentWeek * 100 / MAX_SCHOOL_WEEKS)) : 0,
            };
        }

        function renderYearDashboardKpis(snapshot) {
            const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
            setText('yearKpiCurrentWeek', snapshot.currentWeek ? `Tuần ${snapshot.currentWeek}` : 'Ngoài kỳ');
            setText('yearKpiSchoolProgress', snapshot.currentWeek ? `${snapshot.schoolProgressPercent}%` : `T${snapshot.referenceWeek}`);
            setText('yearKpiPlanCoverage', `${snapshot.planCount}/${snapshot.referenceWeek}`);
            setText('yearKpiTimetableCoverage', `${snapshot.timetableCount}/${snapshot.referenceWeek}`);
            setText('yearKpiFinalized', `${snapshot.finalizedCount}/${snapshot.referenceWeek}`);
            setText('yearKpiOnTrack', snapshot.courseRows.length ? `${snapshot.onTrackRows.length}/${snapshot.courseRows.length}` : '—');
            const bar = document.getElementById('yearProgressBar');
            if (bar) bar.style.width = `${snapshot.schoolProgressPercent}%`;
            setText('yearProgressTitle', snapshot.currentWeek ? `Đang ở Tuần ${snapshot.currentWeek}/${MAX_SCHOOL_WEEKS}` : `Năm học ${state.selectedAcademicYear}`);
            setText('yearProgressMeta', snapshot.currentWeek
                ? `Đã đi qua khoảng ${snapshot.schoolProgressPercent}% số tuần chính của năm học.`
                : `Chưa nằm trong khoảng 37 tuần đã thiết lập; số liệu đang đối chiếu đến Tuần ${snapshot.referenceWeek}.`);
            const subtitle = document.getElementById('yearDashboardSubtitle');
            if (subtitle) {
                const notes = [];
                if (snapshot.staleCount) notes.push(`${snapshot.staleCount} tuần cần tạo lại báo giảng`);
                if (snapshot.attentionRows.length) notes.push(`${snapshot.attentionRows.length} lớp–môn cần chú ý`);
                if (snapshot.finalizedCount < snapshot.referenceWeek) notes.push(`${snapshot.referenceWeek - snapshot.finalizedCount} tuần chưa chốt hoàn chỉnh`);
                subtitle.textContent = `Năm học ${state.selectedAcademicYear} · đối chiếu đến Tuần ${snapshot.referenceWeek}${notes.length ? ' · ' + notes.join(' · ') : ' · dữ liệu hiện đang ổn'}`;
            }
        }

        function renderYearWeekGrid(snapshot) {
            const grid = document.getElementById('yearWeekGrid');
            if (!grid) return;
            grid.innerHTML = snapshot.weekStates.map(item => {
                const classes = ['year-week-chip', item.stateKey];
                if (item.future) classes.push('future');
                if (snapshot.currentWeek === item.week) classes.push('current');
                const parts = [`Tuần ${item.week}`, item.label];
                if (item.hasPlan) parts.push('Có kế hoạch');
                if (item.hasTimetable) parts.push('Có TKB');
                if (item.hasSchedule) parts.push(item.finalized ? 'Báo giảng đã chốt' : 'Có báo giảng');
                return `<button class="${classes.join(' ')}" type="button" data-year-week="${item.week}" title="${yearDashboardEscape(parts.join(' · '))}"><span>T${item.week}</span>${item.stateKey !== 'empty' ? '<i class="week-dot"></i>' : ''}</button>`;
            }).join('');
        }

        function buildIncompleteWeekActions(snapshot) {
            const rows = [];
            snapshot.elapsedStates.forEach(item => {
                const missing = [];
                let target = 'teaching';
                let level = 'warning';
                let icon = '🧩';
                if (!item.hasPlan) { missing.push('Kế hoạch'); target = 'plan'; icon = '📋'; }
                if (!item.hasTimetable) { missing.push('TKB'); if (item.hasPlan) target = 'timetable'; icon = '⏰'; }
                if (item.stateKey === 'stale') { missing.push('Báo giảng cần tạo lại'); target = 'teaching'; level = 'danger'; icon = '🔄'; }
                else if (!item.hasSchedule) { missing.push('Báo giảng'); if (item.hasTimetable) target = 'teaching'; }
                else if (!item.finalized) { missing.push('Chưa chốt'); target = 'teaching'; icon = '🔒'; }
                if (!missing.length) return;
                if (item.week === snapshot.currentWeek && level !== 'danger') level = 'warning';
                rows.push({ week:item.week, target, level, icon, missing, current:item.week === snapshot.currentWeek });
            });
            return rows.sort((a, b) => Number(b.current) - Number(a.current) || Number(b.level === 'danger') - Number(a.level === 'danger') || b.week - a.week);
        }

        function renderYearIncompleteWeeks(snapshot) {
            const list = document.getElementById('yearIncompleteList');
            const summary = document.getElementById('yearIncompleteSummary');
            if (!list || !summary) return;
            const rows = buildIncompleteWeekActions(snapshot);
            summary.textContent = rows.length ? `${rows.length} tuần còn việc cần hoàn thiện đến Tuần ${snapshot.referenceWeek}` : `Đã hoàn thiện dữ liệu đến Tuần ${snapshot.referenceWeek}`;
            list.innerHTML = rows.length ? rows.slice(0, 7).map(row => `
                <button class="year-action-item ${row.level}" type="button" data-year-week="${row.week}" data-year-target="${row.target}">
                    <span class="year-action-icon">${row.icon}</span>
                    <span class="year-action-main"><strong>Tuần ${row.week}${row.current ? ' · tuần hiện tại' : ''}</strong><small>${yearDashboardEscape(row.missing.join(' · '))}</small></span>
                    <span class="year-action-badge">Mở</span>
                </button>`).join('') : '<div class="year-action-item good"><span class="year-action-icon">✓</span><span class="year-action-main"><strong>Không có tuần tồn đọng</strong><small>Kế hoạch, TKB và lịch báo giảng đến mốc đối chiếu đều đã hoàn thiện.</small></span><span class="year-action-badge">Tốt</span></div>';
        }

        function getUpcomingTeachingDays(today = new Date(), horizonDays = 14) {
            if (typeof getTodayTeachingItems !== 'function') return [];
            const results = [];
            for (let offset = 0; offset <= horizonDays; offset++) {
                const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                date.setDate(date.getDate() + offset);
                const week = getYearDashboardCurrentWeek(date);
                if (!week) continue;
                const dayLabel = overviewDayLabel(date);
                const lessons = getTodayTeachingItems(week, dayLabel);
                if (!lessons.length) continue;
                results.push({ date, week, dayLabel, lessons });
                if (results.length >= 6) break;
            }
            return results;
        }

        function renderYearUpcomingTeaching() {
            const list = document.getElementById('yearUpcomingList');
            const summary = document.getElementById('yearUpcomingSummary');
            if (!list || !summary) return;
            const days = getUpcomingTeachingDays(new Date(), 14);
            const totalLessons = days.reduce((sum, item) => sum + item.lessons.length, 0);
            summary.textContent = days.length ? `${totalLessons} tiết trong ${days.length} ngày dạy gần nhất` : 'Chưa thấy lịch dạy trong 14 ngày tới';
            list.innerHTML = days.length ? days.map(item => {
                const first = item.lessons.slice(0, 3).map(lesson => `${cleanText(lesson.className) || '?'} ${cleanText(lesson.subject) || ''}`.trim()).join(' · ');
                const extra = item.lessons.length > 3 ? ` +${item.lessons.length - 3} tiết` : '';
                const isToday = item.date.toDateString() === new Date().toDateString();
                return `<button class="year-action-item${isToday ? ' good' : ''}" type="button" data-year-week="${item.week}" data-year-target="timetable">
                    <span class="year-action-icon">${isToday ? '🎓' : '🗓️'}</span>
                    <span class="year-action-main"><strong>${yearDashboardEscape(isToday ? 'Hôm nay' : item.dayLabel)} · ${item.date.toLocaleDateString('vi-VN')}</strong><small>${yearDashboardEscape(first + extra)}</small></span>
                    <span class="year-action-badge">${item.lessons.length} tiết</span>
                </button>`;
            }).join('') : '<div class="year-empty">Không có tiết dạy trong TKB của 14 ngày tới, hoặc chưa thiết lập đúng ngày bắt đầu Tuần 1.</div>';
        }

        function renderYearCourseAttention(snapshot) {
            const list = document.getElementById('yearCourseAttentionList');
            const summary = document.getElementById('yearCourseSummary');
            if (!list || !summary) return;
            const rows = snapshot.attentionRows;
            const behind = rows.filter(row => row.status === 'behind').length;
            const risk = rows.filter(row => row.forecastState === 'risk').length;
            summary.textContent = snapshot.courseRows.length
                ? `${snapshot.onTrackRows.length}/${snapshot.courseRows.length} lớp–môn ổn${behind ? ` · ${behind} đang chậm` : ''}${risk ? ` · ${risk} có nguy cơ` : ''}`
                : 'Chưa đủ TKB/PPCT/Lịch báo giảng để đối chiếu';
            list.innerHTML = rows.length ? rows.slice(0, 6).map(row => {
                const danger = row.status === 'behind' || row.forecastState === 'risk';
                const detail = row.status === 'missing'
                    ? 'Thiếu PPCT để xác định tiến độ'
                    : `${row.statusLabel}${row.forecastState === 'risk' ? ' · ' + row.forecastLabel : ''}${row.currentTopic ? ' · ' + row.currentTopic : ''}`;
                return `<button class="year-action-item ${danger ? 'danger' : 'warning'}" type="button" data-year-progress="1">
                    <span class="year-action-icon">${danger ? '⏳' : '📚'}</span>
                    <span class="year-action-main"><strong>${yearDashboardEscape(row.className)} · ${yearDashboardEscape(row.subject)}</strong><small>${yearDashboardEscape(detail)}</small></span>
                    <span class="year-action-badge">${Number.isFinite(row.progressPercent) ? row.progressPercent + '%' : '—'}</span>
                </button>`;
            }).join('') : (snapshot.courseRows.length
                ? '<div class="year-action-item good"><span class="year-action-icon">✓</span><span class="year-action-main"><strong>Tất cả lớp–môn đang ổn</strong><small>Không phát hiện lớp chậm PPCT hoặc có nguy cơ hoàn thành muộn đến mốc đối chiếu.</small></span><span class="year-action-badge">Ổn</span></div>'
                : '<div class="year-empty">Hãy tải TKB và PPCT, sau đó tạo lịch báo giảng để Dashboard theo dõi tiến độ từng lớp.</div>');
        }

        function openYearDashboardWeek(week, target = '') {
            const normalizedWeek = Number.parseInt(week, 10);
            if (!(normalizedWeek > 0 && normalizedWeek <= MAX_SCHOOL_WEEKS)) return;
            const stateInfo = getYearWeekState(normalizedWeek, getYearDashboardReferenceWeek());
            const resolvedTarget = target || (stateInfo.hasSchedule ? 'teaching' : stateInfo.hasTimetable ? 'teaching' : stateInfo.hasPlan ? 'timetable' : 'plan');
            if (resolvedTarget === 'plan') {
                activateOverviewTab('plan');
                if (typeof showPlanWeek === 'function' && stateInfo.hasPlan) showPlanWeek(normalizedWeek, true);
                else document.getElementById('planTableCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
                return;
            }
            if (resolvedTarget === 'timetable') {
                activateOverviewTab('timetable');
                const select = document.getElementById('timetableWeekSelect');
                if (select?.querySelector(`option[value="${normalizedWeek}"]`)) {
                    select.value = String(normalizedWeek);
                    select.dispatchEvent(new Event('change', { bubbles:true }));
                }
                document.getElementById('timetableDisplay')?.scrollIntoView({ behavior:'smooth', block:'start' });
                return;
            }
            activateOverviewTab('teaching');
            if (typeof openProgressDashboardWeek === 'function') openProgressDashboardWeek(normalizedWeek);
        }

        function openYearDashboardProgress() {
            activateOverviewTab('teaching');
            const snapshot = buildYearDashboardSnapshot();
            const select = document.getElementById('progressWeekSelect');
            if (select?.querySelector(`option[value="${snapshot.referenceWeek}"]`)) {
                select.value = String(snapshot.referenceWeek);
                if (typeof renderProgressDashboard === 'function') renderProgressDashboard();
            }
            document.getElementById('progressDashboardCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
        }

        function renderYearDashboard() {
            const root = document.getElementById('yearDashboard');
            if (!root) return null;
            const snapshot = buildYearDashboardSnapshot();
            renderYearDashboardKpis(snapshot);
            renderYearWeekGrid(snapshot);
            renderYearIncompleteWeeks(snapshot);
            renderYearUpcomingTeaching();
            renderYearCourseAttention(snapshot);
            return snapshot;
        }

        function initYearDashboard() {
            document.getElementById('refreshYearDashboardBtn')?.addEventListener('click', () => {
                renderYearDashboard();
                showToast('✅ Dashboard năm học đã được cập nhật', 'success');
            });
            document.getElementById('openYearProgressBtn')?.addEventListener('click', openYearDashboardProgress);
            document.getElementById('yearDashboard')?.addEventListener('click', event => {
                const progressButton = event.target.closest('[data-year-progress]');
                if (progressButton) { openYearDashboardProgress(); return; }
                const button = event.target.closest('[data-year-week]');
                if (!button) return;
                openYearDashboardWeek(button.dataset.yearWeek, button.dataset.yearTarget || '');
            });
            ['schoolYearSelect','week1StartDateInput','scheduleWeekSelect','timetableWeekSelect','progressWeekSelect','progressGradeSelect','progressClassSelect','progressSubjectSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => setTimeout(renderYearDashboard, 0));
            });
            document.addEventListener('click', event => {
                if (event.target.closest('.btn, .tab-btn, [data-work-action], [data-schedule-action], [data-overview-tab], [data-command-tab]')) {
                    setTimeout(renderYearDashboard, 180);
                }
            });
            registerAppDataRefresh('year-dashboard', renderYearDashboard, { delay:80 });
            registerMinuteRefresh('year-dashboard', renderYearDashboard);
            renderYearDashboard();
        }
