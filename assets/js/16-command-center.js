        // ================================================================
        //  v35 COMMAND CENTER — Trợ lý tuần cho giáo viên
        // ================================================================
        function commandEscape(value) {
            return escapeHTML(cleanText(value));
        }

        function commandSessionOrder(session) {
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
            return items.sort((a, b) => commandSessionOrder(a.session) - commandSessionOrder(b.session) || a.period - b.period);
        }

        function getCommandPendingTasks(todayIso) {
            const personal = normalizeWorkItems(state.workItems, 'personal');
            const shared = sharedWorkScopeAvailable() ? normalizeWorkItems(state.sharedWorkItems, 'shared') : [];
            return [...personal, ...shared]
                .filter(item => item.type === 'task' && !item.completed)
                .sort((a, b) => {
                    const ad = a.dueDate || '9999-12-31';
                    const bd = b.dueDate || '9999-12-31';
                    return ad.localeCompare(bd) || Number(b.pinned) - Number(a.pinned);
                })
                .map(item => ({ ...item, overdue: Boolean(item.dueDate && item.dueDate < todayIso) }));
        }

        function renderTodayTeachingCommand(week, dayLabel) {
            const list = document.getElementById('todayTeachingList');
            const summary = document.getElementById('todayTeachingSummary');
            if (!list || !summary) return;
            if (!week) {
                summary.textContent = 'Ngoài khoảng tuần đã thiết lập';
                list.innerHTML = '<div class="command-empty">Hãy kiểm tra ngày bắt đầu Tuần 1.</div>';
                return;
            }
            const items = getTodayTeachingItems(week, dayLabel);
            summary.textContent = items.length ? `${items.length} tiết · ${dayLabel} · Tuần ${week}` : `${dayLabel} · chưa thấy tiết dạy`;
            list.innerHTML = items.length ? items.slice(0, 6).map(item => `
                <div class="command-item">
                    <span class="command-item-icon">${commandSessionOrder(item.session) === 1 ? '☀️' : '🌤️'}</span>
                    <span class="command-item-main"><strong>${commandEscape(item.className || 'Chưa rõ lớp')} · ${commandEscape(item.subject || 'Chưa rõ môn')}</strong><small>${commandEscape(item.session)} · Tiết ${item.period || '—'}</small></span>
                    <span class="command-item-badge">T${item.period || '—'}</span>
                </div>`).join('') : '<div class="command-empty">Không có tiết dạy trong TKB hôm nay.</div>';
        }

        function buildWeeklyPriorities(week, todayIso) {
            const priorities = [];
            if (!week) return priorities;
            const plan = state.planData?.some(item => Number(item.week) === Number(week));
            const timetable = state.timetablesByWeek?.[week];
            const schedule = state.teachingSchedule?.[week] || [];
            const meta = getScheduleMeta ? getScheduleMeta(week) : (state.scheduleMeta?.[week] || {});
            if (!plan) priorities.push({ level:'warning', icon:'📋', title:`Bổ sung Kế hoạch trường Tuần ${week}`, detail:'Chưa có dữ liệu để đối chiếu ngày nghỉ/hoạt động.', tab:'plan' });
            if (!timetable) priorities.push({ level:'warning', icon:'⏰', title:`Bổ sung TKB Tuần ${week}`, detail:'Chưa thể tổng hợp lịch dạy và tạo báo giảng.', tab:'timetable' });
            if (!schedule.length) priorities.push({ level:'warning', icon:'📖', title:`Tạo Lịch báo giảng Tuần ${week}`, detail:'Tuần hiện tại chưa có lịch báo giảng.', tab:'teaching' });
            else if (meta.stale) priorities.push({ level:'danger', icon:'🔄', title:'Tạo lại Lịch báo giảng', detail:meta.staleReason || 'Nguồn dữ liệu của tuần đã thay đổi.', tab:'teaching' });
            else if (!['final','finalized'].includes(meta.status)) priorities.push({ level:'warning', icon:'🔒', title:`Kiểm tra và chốt Tuần ${week}`, detail:'Lịch báo giảng hiện vẫn là bản nháp.', tab:'teaching' });

            const tasks = getCommandPendingTasks(todayIso);
            tasks.filter(item => item.overdue).slice(0, 2).forEach(item => priorities.push({ level:'danger', icon:'⏰', title:item.title || 'Nhiệm vụ quá hạn', detail:`Quá hạn${item.dueDate ? ' ' + formatISODateForDisplay(item.dueDate) : ''}.`, tab:'workspace' }));
            if (!tasks.some(item => item.overdue)) tasks.filter(item => item.dueDate).slice(0, 1).forEach(item => priorities.push({ level:'', icon:'✅', title:item.title || 'Nhiệm vụ sắp tới', detail:`Hạn ${formatISODateForDisplay(item.dueDate)}.`, tab:'workspace' }));
            return priorities.slice(0, 5);
        }

        function renderWeeklyPriorityCommand(week, todayIso) {
            const list = document.getElementById('weeklyPriorityList');
            const summary = document.getElementById('weeklyPrioritySummary');
            if (!list || !summary) return;
            const priorities = buildWeeklyPriorities(week, todayIso);
            const dangerCount = priorities.filter(item => item.level === 'danger').length;
            summary.textContent = !priorities.length ? 'Không có việc khẩn cấp' : dangerCount ? `${dangerCount} mục cần xử lý sớm` : `${priorities.length} mục nên hoàn thành`;
            list.innerHTML = priorities.length ? priorities.map(item => `
                <button class="command-item ${item.level || ''}" type="button" data-command-tab="${item.tab}">
                    <span class="command-item-icon">${item.icon}</span>
                    <span class="command-item-main"><strong>${commandEscape(item.title)}</strong><small>${commandEscape(item.detail)}</small></span>
                    <span class="command-item-badge">Mở</span>
                </button>`).join('') : '<div class="command-item good"><span class="command-item-icon">✓</span><span class="command-item-main"><strong>Tuần đang ổn</strong><small>Kế hoạch, TKB, báo giảng và nhiệm vụ chưa có cảnh báo quan trọng.</small></span><span class="command-item-badge">Tốt</span></div>';
        }

        function renderTeachingProgressCommand(week) {
            const list = document.getElementById('teachingProgressList');
            const summary = document.getElementById('teachingProgressSummary');
            if (!list || !summary) return;
            if (!week || typeof buildProgressCourseCatalog !== 'function') {
                summary.textContent = 'Chưa đủ dữ liệu';
                list.innerHTML = '<div class="command-empty">Cần có lịch báo giảng và PPCT để theo dõi tiến độ.</div>';
                return;
            }
            const rows = buildProgressCourseCatalog().map(course => buildCourseProgressRow(course, week));
            const attention = rows.filter(row => row.status === 'behind' || row.status === 'missing' || row.forecastState === 'risk')
                .sort((a, b) => Number(a.status !== 'behind') - Number(b.status !== 'behind') || (a.difference || 0) - (b.difference || 0));
            const onTrack = rows.filter(row => ['ontrack','ahead','completed'].includes(row.status)).length;
            summary.textContent = rows.length ? `${onTrack}/${rows.length} lớp–môn ổn · ${attention.length} cần chú ý` : 'Chưa có lớp–môn để theo dõi';
            list.innerHTML = attention.length ? attention.slice(0, 4).map(row => {
                const danger = row.status === 'behind' || row.forecastState === 'risk';
                const detail = row.status === 'missing' ? 'Chưa có đủ PPCT' : `${row.statusLabel}${row.forecastState === 'risk' ? ' · ' + row.forecastLabel : ''}`;
                return `<div class="command-item ${danger ? 'danger' : 'warning'}">
                    <span class="command-item-icon">${danger ? '⏳' : '📚'}</span>
                    <span class="command-item-main"><strong>${commandEscape(row.className)} · ${commandEscape(row.subject)}</strong><small>${commandEscape(detail)}</small></span>
                    <span class="command-item-badge">${Number.isFinite(row.progressPercent) ? row.progressPercent + '%' : '—'}</span>
                </div>`;
            }).join('') : (rows.length ? '<div class="command-item good"><span class="command-item-icon">✓</span><span class="command-item-main"><strong>Tiến độ đang tốt</strong><small>Không có lớp–môn chậm hoặc thiếu PPCT đến tuần hiện tại.</small></span><span class="command-item-badge">Ổn</span></div>' : '<div class="command-empty">Chưa có dữ liệu tiến độ.</div>');
        }

        function renderTeacherCommandCenter() {
            const today = new Date();
            const week = getOverviewCurrentWeek(today);
            const dayLabel = overviewDayLabel(today);
            const todayIso = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
            const subtitle = document.getElementById('commandCenterSubtitle');
            if (subtitle) subtitle.textContent = week ? `Tuần ${week} · ${dayLabel}, ${today.toLocaleDateString('vi-VN')} · ưu tiên được cập nhật tự động` : `Năm học ${state.selectedAcademicYear} · chưa xác định tuần hiện tại`;
            renderTodayTeachingCommand(week, dayLabel);
            renderWeeklyPriorityCommand(week, todayIso);
            renderTeachingProgressCommand(week);
        }

        function initTeacherCommandCenter() {
            document.getElementById('refreshCommandCenterBtn')?.addEventListener('click', renderTeacherCommandCenter);
            document.getElementById('teacherCommandCenter')?.addEventListener('click', event => {
                const button = event.target.closest('[data-command-tab]');
                if (!button) return;
                activateOverviewTab(button.dataset.commandTab);
                if (button.dataset.commandProgress) document.getElementById('progressDashboardCard')?.scrollIntoView({ behavior:'smooth', block:'start' });
            });
            document.addEventListener('click', event => {
                if (event.target.closest('.btn, .tab-btn, [data-work-action], [data-schedule-action], [data-overview-tab]')) setTimeout(renderTeacherCommandCenter, 160);
            });
            ['schoolYearSelect','week1StartDateInput','scheduleWeekSelect','timetableWeekSelect','progressWeekSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => setTimeout(renderTeacherCommandCenter, 0));
            });
            setInterval(renderTeacherCommandCenter, 60000);
            renderTeacherCommandCenter();
        }
