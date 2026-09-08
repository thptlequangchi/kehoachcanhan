        // ================================================================
        //  v52.5 COMMAND CENTER — Bảng điều hành Hôm nay cho giáo viên
        // ================================================================
        function commandEscape(value) {
            return escapeHTML(cleanText(value));
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
                <button class="command-item command-item-button" type="button" data-command-tab="timetable">
                    <span class="command-item-icon">${teachingSessionOrder(item.session) === 1 ? '☀️' : '🌤️'}</span>
                    <span class="command-item-main"><strong>${commandEscape(item.className || 'Chưa rõ lớp')} · ${commandEscape(item.subject || 'Chưa rõ môn')}</strong><small>${commandEscape(item.session)} · Tiết ${item.period || '—'}</small></span>
                    <span class="command-item-badge">T${item.period || '—'}</span>
                </button>`).join('') : '<div class="command-empty">Không có tiết dạy trong TKB hôm nay.</div>';
        }

        function buildWeeklyPriorities(week, todayIso) {
            const priorities = [];
            if (!week) return priorities;
            const weekStatus = getWeekOperationalStatus(week);
            if (!weekStatus.hasPlan) priorities.push({ level:'warning', icon:'📋', title:`Bổ sung Kế hoạch trường Tuần ${week}`, detail:'Chưa có dữ liệu để đối chiếu ngày nghỉ/hoạt động.', tab:'plan' });
            if (!weekStatus.hasTimetable) priorities.push({ level:'warning', icon:'⏰', title:`Bổ sung TKB Tuần ${week}`, detail:'Chưa thể tổng hợp lịch dạy và tạo báo giảng.', tab:'timetable' });
            if (!weekStatus.hasSchedule) priorities.push({ level:'warning', icon:'📖', title:`Tạo Lịch báo giảng Tuần ${week}`, detail:'Tuần hiện tại chưa có lịch báo giảng.', tab:'teaching' });
            else if (weekStatus.stale) priorities.push({ level:'danger', icon:'🔄', title:'Tạo lại Lịch báo giảng', detail:weekStatus.meta?.staleReason || 'Nguồn dữ liệu của tuần đã thay đổi.', tab:'teaching' });
            else if (!weekStatus.finalized) priorities.push({ level:'warning', icon:'🔒', title:`Kiểm tra và chốt Tuần ${week}`, detail:'Lịch báo giảng hiện vẫn là bản nháp.', tab:'teaching' });

            const tasks = getPendingWorkTasks(todayIso);
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

        function renderHomeroomAttentionCommand() {
            const list = document.getElementById('homeroomAttentionList');
            const summary = document.getElementById('homeroomAttentionSummary');
            if (!list || !summary) return;
            if (typeof homeroomSortedBooks !== 'function' || typeof homeroomBuildMonitoringRows !== 'function') {
                summary.textContent = 'Sổ chủ nhiệm chưa sẵn sàng';
                list.innerHTML = '<div class="command-empty">Mở Sổ chủ nhiệm để bắt đầu theo dõi học sinh.</div>';
                return;
            }
            const activeBook = typeof homeroomActiveBook === 'function' ? homeroomActiveBook() : null;
            const book = activeBook || homeroomSortedBooks()[0] || null;
            if (!book) {
                summary.textContent = 'Chưa có lớp chủ nhiệm';
                list.innerHTML = '<button class="command-item command-item-button" type="button" data-command-tab="homeroom"><span class="command-item-icon">＋</span><span class="command-item-main"><strong>Tạo Sổ chủ nhiệm</strong><small>Thêm lớp và danh sách học sinh để hệ thống tự cảnh báo.</small></span><span class="command-item-badge">Mở</span></button>';
                return;
            }
            const semester = typeof homeroomGetSelectedSemester === 'function' ? homeroomGetSelectedSemester() : '1';
            const rows = homeroomBuildMonitoringRows(book, semester);
            const attention = rows.filter(row => row.metrics.activeSeriousCount > 0 || row.status.flagged || row.metrics.trend?.direction === 'declining');
            const critical = rows.filter(row => row.metrics.activeSeriousCount > 0).length;
            const declining = rows.filter(row => row.metrics.trend?.direction === 'declining').length;
            const improving = rows.filter(row => row.metrics.trend?.direction === 'improving').length;
            summary.textContent = attention.length
                ? `${book.className} · ${critical ? critical + ' nghiêm trọng · ' : ''}${attention.length} cần chú ý${declining ? ' · ' + declining + ' xu hướng giảm' : ''}`
                : `${book.className} · đang ổn${improving ? ' · ' + improving + ' đang tiến bộ' : ''}`;
            list.innerHTML = attention.length ? attention.slice(0, 4).map(row => {
                const isCritical = row.metrics.activeSeriousCount > 0;
                const isDeclining = row.metrics.trend?.direction === 'declining';
                const detailParts = [];
                if (isCritical) detailParts.push(`${row.metrics.activeSeriousCount} vi phạm nghiêm trọng chưa xử lý`);
                else if (row.status.alerts?.length) detailParts.push(row.status.alerts.slice(0, 2).join(' · '));
                if (isDeclining && !detailParts.some(part => part.includes('Xu hướng'))) detailParts.push(row.metrics.trend.label);
                const badge = isCritical ? 'Ưu tiên' : `${Math.round(row.metrics.weekScore)}đ`;
                return `<button class="command-item command-item-button ${isCritical ? 'danger' : (isDeclining ? 'warning' : '')}" type="button" data-command-tab="homeroom" data-command-book="${commandEscape(book.id)}" data-command-student="${commandEscape(row.student.id)}">
                    <span class="command-item-icon">${isCritical ? '🚨' : (isDeclining ? '📉' : '👤')}</span>
                    <span class="command-item-main"><strong>${commandEscape(row.student.name || 'Học sinh')}</strong><small>${commandEscape(detailParts.join(' · ') || row.status.label)}</small></span>
                    <span class="command-item-badge">${commandEscape(badge)}</span>
                </button>`;
            }).join('') : `<button class="command-item command-item-button good" type="button" data-command-tab="homeroom"><span class="command-item-icon">✓</span><span class="command-item-main"><strong>${commandEscape(book.className)} đang ổn</strong><small>Không có học sinh vượt ngưỡng cảnh báo ở thời điểm hiện tại.</small></span><span class="command-item-badge">Tốt</span></button>`;
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
            summary.textContent = rows.length ? `${onTrack}/${rows.length} lớp–môn–buổi ổn · ${attention.length} cần chú ý` : 'Chưa có lớp–môn–buổi để theo dõi';
            list.innerHTML = attention.length ? attention.slice(0, 4).map(row => {
                const danger = row.status === 'behind' || row.forecastState === 'risk';
                const detail = row.status === 'missing' ? 'Chưa có đủ PPCT' : `${row.statusLabel}${row.forecastState === 'risk' ? ' · ' + row.forecastLabel : ''}`;
                return `<button class="command-item command-item-button ${danger ? 'danger' : 'warning'}" type="button" data-command-tab="teaching" data-command-progress="1">
                    <span class="command-item-icon">${danger ? '⏳' : '📚'}</span>
                    <span class="command-item-main"><strong>${commandEscape(row.className)} · ${commandEscape(row.subject)} · ${commandEscape(row.session || '')}</strong><small>${commandEscape(detail)}</small></span>
                    <span class="command-item-badge">${Number.isFinite(row.progressPercent) ? row.progressPercent + '%' : '—'}</span>
                </button>`;
            }).join('') : (rows.length ? '<div class="command-item good"><span class="command-item-icon">✓</span><span class="command-item-main"><strong>Tiến độ đang tốt</strong><small>Không có lớp–môn–buổi chậm hoặc thiếu PPCT đến tuần hiện tại.</small></span><span class="command-item-badge">Ổn</span></div>' : '<div class="command-empty">Chưa có dữ liệu tiến độ.</div>');
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
            renderHomeroomAttentionCommand();
            renderTeachingProgressCommand(week);
        }

        function initTeacherCommandCenter() {
            document.getElementById('refreshCommandCenterBtn')?.addEventListener('click', renderTeacherCommandCenter);
            document.getElementById('todayFocusBtn')?.addEventListener('click', () => document.getElementById('focusModeToggle')?.click());
            document.getElementById('teacherCommandCenter')?.addEventListener('click', event => {
                const button = event.target.closest('[data-command-tab]');
                if (!button) return;
                activateOverviewTab(button.dataset.commandTab);
                if (button.dataset.commandStudent && typeof homeroomSelectStudent === 'function') {
                    setTimeout(() => {
                        if (button.dataset.commandBook && typeof homeroomSelectBook === 'function') homeroomSelectBook(button.dataset.commandBook);
                        homeroomSelectStudent(button.dataset.commandStudent);
                        document.getElementById('homeroomStudentLogPanel')?.scrollIntoView({ behavior:'smooth', block:'center' });
                    }, 80);
                }
                if (button.dataset.commandProgress) setTimeout(() => document.getElementById('progressDashboardCard')?.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
            });
            document.addEventListener('click', event => {
                if (event.target.closest('.btn, .tab-btn, [data-work-action], [data-schedule-action], [data-overview-tab]')) setTimeout(renderTeacherCommandCenter, 160);
            });
            ['schoolYearSelect','week1StartDateInput','scheduleWeekSelect','timetableWeekSelect','progressWeekSelect'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => setTimeout(renderTeacherCommandCenter, 0));
            });
            registerAppDataRefresh('teacher-command-center', renderTeacherCommandCenter, { delay:120 });
            registerMinuteRefresh('teacher-command-center', renderTeacherCommandCenter);
            renderTeacherCommandCenter();
        }
