        // ================================================================
        //  TEACHING SCHEDULE (Lịch báo giảng)
        // ================================================================
        function getSelectedScheduleWeek() {
            const week = Number.parseInt(scheduleWeekSelect.value, 10);
            return week > 0 && week <= MAX_SCHOOL_WEEKS ? week : null;
        }

        function populateAcademicYearSelect(preferredYear = state.selectedAcademicYear) {
            const normalizedPreferred = normalizeAcademicYear(preferredYear) || DEFAULT_TEACHER_PROFILE.academicYear;
            const preferredStart = Number.parseInt(normalizedPreferred.slice(0, 4), 10);
            const today = new Date();
            const currentStart = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
            const starts = new Set([
                preferredStart,
                ...Object.keys(state.yearWorkspaces || {}).map(year => Number.parseInt(year, 10)).filter(Boolean),
            ]);
            for (let start = currentStart - 3; start <= currentStart + 3; start++) starts.add(start);
            [schoolYearSelect, academicYearSelect, progressAcademicYearSelect].filter(Boolean).forEach(select => {
                select.innerHTML = '';
                Array.from(starts).filter(Number.isFinite).sort((a, b) => b - a).forEach(start => {
                    const option = document.createElement('option');
                    option.value = `${start}-${start + 1}`;
                    option.textContent = `${start}-${start + 1}`;
                    select.appendChild(option);
                });
                if (!Array.from(select.options).some(option => option.value === normalizedPreferred)) {
                    const preferredOption = document.createElement('option');
                    preferredOption.value = normalizedPreferred;
                    preferredOption.textContent = normalizedPreferred;
                    select.appendChild(preferredOption);
                }
                const customOption = document.createElement('option');
                customOption.value = '__custom__';
                customOption.textContent = 'Năm học khác…';
                select.appendChild(customOption);
                select.value = normalizedPreferred;
            });
        }

        function applyAcademicYear(value, notify = true) {
            const academicYear = normalizeAcademicYear(value);
            if (!academicYear) {
                showToast('⚠️ Năm học phải có dạng 2025-2026 và hai năm liên tiếp', 'error');
                return false;
            }
            try {
                const changed = activateAcademicYearWorkspace(academicYear, notify);
                if (!changed) populateAcademicYearSelect(state.selectedAcademicYear);
                return Boolean(changed);
            } catch (error) {
                console.error('Không thể chuyển năm học:', academicYear, error);
                populateAcademicYearSelect(state.selectedAcademicYear);
                showToast(`❌ Không thể chuyển năm học: ${cleanText(error?.message) || 'Lỗi không xác định'}`, 'error');
                return false;
            }
        }

        function handleAcademicYearSelectChange(select) {
            if (!select) return;
            const previousYear = state.selectedAcademicYear;
            if (select.value === '__custom__') {
                const entered = prompt('Nhập năm học (ví dụ 2025-2026):', state.teacherProfile.academicYear);
                if (entered === null || !applyAcademicYear(entered)) {
                    populateAcademicYearSelect(previousYear);
                }
                return;
            }
            if (!applyAcademicYear(select.value)) populateAcademicYearSelect(previousYear);
        }

        academicYearSelect.addEventListener('change', () => handleAcademicYearSelectChange(academicYearSelect));
        schoolYearSelect.addEventListener('change', () => handleAcademicYearSelectChange(schoolYearSelect));
        progressAcademicYearSelect.addEventListener('change', () => handleAcademicYearSelectChange(progressAcademicYearSelect));

        function formatWeekStartInput(value) {
            const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
            if (digits.length <= 2) return digits;
            if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
            return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        }

        week1StartDateInput.addEventListener('input', () => {
            if (/^[\d/]*$/.test(week1StartDateInput.value)) {
                week1StartDateInput.value = formatWeekStartInput(week1StartDateInput.value);
            }
        });
        week1StartDateInput.addEventListener('blur', () => {
            const normalized = normalizeISODate(week1StartDateInput.value);
            if (normalized) week1StartDateInput.value = formatISODateForDisplay(normalized);
        });
        week1StartDateInput.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            saveWeek1StartBtn.click();
        });

        saveWeek1StartBtn.addEventListener('click', () => {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            const value = normalizeISODate(week1StartDateInput.value);
            if (!value) {
                showToast('⚠️ Vui lòng nhập ngày hợp lệ theo định dạng ngày/tháng/năm', 'error');
                week1StartDateInput.focus();
                return;
            }
            if (!isMondayISODate(value)) {
                showToast('⚠️ Ngày bắt đầu Tuần 1 phải là Thứ 2', 'error');
                week1StartDateInput.focus();
                return;
            }
            const workspace = getActiveYearWorkspace();
            workspace.week1Start = value;
            week1StartDateInput.value = formatISODateForDisplay(value);
            syncPlanDatesForActiveYear();
            persistActiveYearWorkspace();
            persistLegacyActiveYear();
            updateSchoolYearWeekInfo();
            renderPlanTable();
            populateTimetableWeekSelect();
            populateWeekSelect();
            const week1 = getWeekDateInfo(1);
            showToast(`✅ Đã tính 37 tuần chính, bắt đầu từ Thứ 2 ngày ${week1.startText}`, 'success');
        });

        function getScheduleMeta(week) {
            const current = state.scheduleMeta[week] || {};
            const meta = {
                ...current,
                stale: Boolean(current.stale),
                staleReason: cleanText(current.staleReason),
                generatedAt: cleanText(current.generatedAt),
                sourceMode: cleanText(current.sourceMode),
                status: current.status === 'final' ? 'final' : 'draft',
                finalizedAt: cleanText(current.finalizedAt),
                removedSourceSlots: Array.isArray(current.removedSourceSlots)
                    ? [...new Set(current.removedSourceSlots.map(cleanText).filter(Boolean))]
                    : [],
                affectedScope: current.affectedScope === 'slots' ? 'slots' : 'all',
                affectedSourceSlots: Array.isArray(current.affectedSourceSlots)
                    ? [...new Set(current.affectedSourceSlots.map(cleanText).filter(Boolean))]
                    : [],
            };
            state.scheduleMeta[week] = meta;
            return meta;
        }

        function persistTeachingScheduleState() {
            const scheduleSaved = writeStoredJSON('teacher_teaching_schedule', state.teachingSchedule);
            const metaSaved = writeStoredJSON('teacher_schedule_meta', state.scheduleMeta);
            persistActiveYearWorkspace();
            return scheduleSaved && metaSaved;
        }

        function getSortedScheduleItems(items) {
            const sessionOrder = { 'Buổi sáng': 0, 'Buổi chiều': 1 };
            return [...(items || [])].sort((a, b) => {
                const dayDiff = SCHOOL_DAYS.indexOf(normalizeDayName(a.day)) - SCHOOL_DAYS.indexOf(normalizeDayName(b.day));
                if (dayDiff) return dayDiff;
                const sessionDiff = (sessionOrder[normalizeSessionLabel(a.session)] ?? 9)
                    - (sessionOrder[normalizeSessionLabel(b.session)] ?? 9);
                if (sessionDiff) return sessionDiff;
                const periodDiff = (Number.parseInt(a.period, 10) || 0) - (Number.parseInt(b.period, 10) || 0);
                if (periodDiff) return periodDiff;
                return cleanText(a.class).localeCompare(cleanText(b.class), 'vi');
            });
        }

        function updateSchedulePrintHeader(week) {
            const plan = state.planData.find(item => item.week === week);
            const automaticDate = getWeekDateInfo(week);
            const dateRange = automaticDate?.rangeText || cleanText(plan?.dateRange);
            const profile = state.teacherProfile;
            const meta = week ? getScheduleMeta(week) : { status: 'draft' };
            schedulePrintHeader.innerHTML = `
                <div class="school-name">${escapeHTML(profile.schoolName)}</div>
                <h3>LỊCH BÁO GIẢNG TUẦN ${week || '—'}</h3>
                <div class="profile-line">
                    Giáo viên: <strong>${escapeHTML(profile.teacherName)}</strong>
                    &nbsp;·&nbsp; Môn: <strong>${escapeHTML(profile.subject)}</strong>
                    &nbsp;·&nbsp; Năm học: <strong>${escapeHTML(profile.academicYear)}</strong>
                </div>
                <div class="profile-line">
                    ${dateRange ? `Thời gian: <strong>${escapeHTML(dateRange)}</strong> &nbsp;·&nbsp; ` : ''}
                    Trạng thái: <strong>${meta.status === 'final' ? 'ĐÃ CHỐT' : 'BẢN NHÁP'}</strong>
                </div>`;
        }

        function updateScheduleToolbar(week = getSelectedScheduleWeek()) {
            const hasData = Boolean(week && state.teachingSchedule[week]?.length);
            const meta = week ? getScheduleMeta(week) : { status: 'draft' };
            const isFinal = meta.status === 'final';
            scheduleStatusBadge.textContent = isFinal ? '✅ Đã chốt tuần' : '✏️ Bản nháp';
            scheduleStatusBadge.className = `schedule-status-badge ${isFinal ? 'final' : 'draft'}`;
            addScheduleRowBtn.disabled = !week || isFinal;
            syncPlanScheduleBtn.disabled = !hasData || isFinal;
            syncPlanScheduleBtn.title = !hasData
                ? 'Cần tạo lịch báo giảng trước khi đồng bộ'
                : isFinal ? 'Mở lại tuần trước khi đồng bộ' : 'Đối chiếu kế hoạch trường với lịch báo giảng';
            if (planSyncContext && planSyncContext.week !== week) closePlanSyncPanel();
            validateScheduleBtn.disabled = !hasData;
            validateScheduleBtn.title = hasData
                ? 'Kiểm tra PPCT, tên bài, xung đột và dữ liệu nguồn trước khi chốt'
                : 'Cần tạo lịch báo giảng trước khi kiểm tra';
            if (scheduleValidationContext && scheduleValidationContext.week !== week) closeScheduleValidationPanel();
            toggleScheduleFinalBtn.disabled = !hasData;
            toggleScheduleFinalBtn.textContent = isFinal ? '🔓 Mở lại tuần' : '🔒 Chốt tuần';
            undoScheduleEditBtn.disabled = !week || !(scheduleUndoStack[week]?.length);
            exportScheduleExcelBtn.disabled = !hasData;
            exportScheduleWordBtn.disabled = !hasData;
            printScheduleBtn.disabled = !hasData;
            updateSchedulePrintHeader(week);
            renderCurriculumMatchSummary(week);
        }

        function pushScheduleUndo(week) {
            if (!week) return;
            const stack = scheduleUndoStack[week] || (scheduleUndoStack[week] = []);
            stack.push({
                schedule: cloneRecognitionData(state.teachingSchedule[week] || []),
                meta: cloneRecognitionData(getScheduleMeta(week)),
            });
            if (stack.length > 20) stack.shift();
            updateScheduleToolbar(week);
        }

        function persistScheduleEdit(week, message) {
            if (scheduleValidationContext?.week === week) closeScheduleValidationPanel();
            state.teachingSchedule[week] = (state.teachingSchedule[week] || [])
                .map((item, index) => normalizeScheduleItem(item, week, index))
                .filter(Boolean);
            renumberStoredSchedulesFrom(week);
            const meta = getScheduleMeta(week);
            meta.status = 'draft';
            meta.finalizedAt = '';
            persistTeachingScheduleState();
            renderTeachingSchedule(week);
            updateDataSafetySummary();
            if (message) showToast('✅ ' + message, 'success');
        }

        const PLAN_SYNC_SIGNAL_RULES = [
            {
                level: 'high', label: 'Nghỉ / không học',
                terms: ['nghihoc', 'hocsinhnghi', 'khonghoc', 'tamngunghoc', 'nghile', 'nghitet', 'nghibao', 'nghitoantruong'],
            },
            {
                level: 'review', label: 'Thi / kiểm tra tập trung',
                terms: ['thihocky', 'thitaptrung', 'kiemtrataptrung', 'khaosatchatluong'],
            },
            {
                level: 'review', label: 'Hoạt động chung',
                terms: ['hoatdongtrainghiem', 'ngoaikhoa', 'sinhhoattapthe', 'lekhaigiang', 'lebeigiang', 'daingayhoi'],
            },
        ];

        function detectPlanScheduleSignal(value) {
            const text = normalizePlanCellText(value);
            const lookup = normalizeLookupText(text);
            if (!lookup) return null;
            for (const rule of PLAN_SYNC_SIGNAL_RULES) {
                if (rule.terms.some(term => lookup.includes(term))) {
                    return { ...rule, evidence: text };
                }
            }
            return null;
        }

        function buildPlanScheduleSyncCandidates(week) {
            const plan = state.planData.find(item => Number.parseInt(item.week, 10) === Number.parseInt(week, 10));
            if (!plan) return { plan: null, candidates: [] };
            const planDays = new Map((plan.days || []).map(day => [normalizeDayName(day.day), day]));
            const candidates = [];
            getSortedScheduleItems(state.teachingSchedule[week] || []).forEach(item => {
                if (item.notTeaching) return;
                const planDay = planDays.get(normalizeDayName(item.day));
                if (!planDay) return;
                const field = normalizeSessionLabel(item.session) === 'Buổi chiều' ? 'afternoon' : 'morning';
                const signal = detectPlanScheduleSignal(planDay[field]);
                if (!signal) return;
                const evidence = signal.evidence.replace(/\n+/g, ' · ');
                candidates.push({
                    itemId: item.id,
                    day: item.day,
                    session: item.session,
                    period: item.period,
                    ppctPeriod: item.ppctPeriod,
                    className: item.class,
                    topic: item.topic,
                    level: signal.level,
                    label: signal.label,
                    recommended: signal.level === 'high',
                    evidence: evidence.length > 220 ? `${evidence.slice(0, 217)}…` : evidence,
                    reason: `Theo kế hoạch trường — ${signal.label}: ${evidence}`,
                });
            });
            return { plan, candidates };
        }

        function closePlanSyncPanel() {
            planScheduleSyncPanel.hidden = true;
            planSyncContext = null;
            planSyncContent.innerHTML = '';
        }

        function updatePlanSyncSelectionState() {
            const checkboxes = Array.from(planSyncContent.querySelectorAll?.('input[data-plan-sync-item]') || []);
            const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;
            applyPlanSyncBtn.disabled = selectedCount === 0;
            applyPlanSyncBtn.textContent = selectedCount
                ? `Áp dụng ${selectedCount} tiết “Không học” và cập nhật PPCT`
                : 'Chọn tiết cần áp dụng';
        }

        function openPlanScheduleSyncPreview(week) {
            if (!ensureScheduleEditable(week)) return;
            if (!state.teachingSchedule[week]?.length) {
                showToast('⚠️ Cần tạo lịch báo giảng trước khi đồng bộ', 'error');
                return;
            }
            const result = buildPlanScheduleSyncCandidates(week);
            planSyncContext = { week, ...result };
            planScheduleSyncPanel.hidden = false;
            if (!result.plan) {
                planSyncSummary.textContent = `Tuần ${week} chưa có Kế hoạch trường để đối chiếu.`;
                planSyncContent.innerHTML = '<div class="plan-sync-empty">Hãy tải hoặc nhập Kế hoạch trường của tuần này trước, sau đó quay lại nhấn “Đồng bộ kế hoạch”.</div>';
                planSyncFooter.hidden = true;
                return;
            }
            const recommendedCount = result.candidates.filter(candidate => candidate.recommended).length;
            const reviewCount = result.candidates.length - recommendedCount;
            planSyncSummary.textContent = result.candidates.length
                ? `Tuần ${week}: ${recommendedCount} tiết đề xuất chắc chắn${reviewCount ? ` · ${reviewCount} tiết cần thầy kiểm tra` : ''}. Chưa có dữ liệu nào bị thay đổi.`
                : `Tuần ${week}: chưa phát hiện nội dung nghỉ học, thi tập trung hoặc hoạt động chung ảnh hưởng đến lịch.`;
            if (!result.candidates.length) {
                planSyncContent.innerHTML = '<div class="plan-sync-empty">✅ Kế hoạch trường hiện không tạo ra cảnh báo cho các tiết trong lịch báo giảng tuần này.</div>';
                planSyncFooter.hidden = true;
                return;
            }
            planSyncFooter.hidden = false;
            planSyncContent.innerHTML = `<div class="plan-sync-table-wrap"><table class="plan-sync-table">
                <thead><tr><th>Chọn</th><th>Mức</th><th>Thứ / Buổi</th><th>Tiết TKB</th><th>Lớp</th><th>Tiết PPCT</th><th>Căn cứ từ kế hoạch trường</th></tr></thead>
                <tbody>${result.candidates.map(candidate => `<tr>
                    <td class="sync-check-cell"><input type="checkbox" data-plan-sync-item="${escapeHTML(candidate.itemId)}" ${candidate.recommended ? 'checked' : ''} aria-label="Chọn tiết ${escapeHTML(candidate.itemId)}"></td>
                    <td><span class="plan-sync-signal ${candidate.level}">${candidate.level === 'high' ? 'Chắc chắn' : 'Kiểm tra'}</span></td>
                    <td><strong>${escapeHTML(candidate.day)}</strong><br>${escapeHTML(candidate.session)}</td>
                    <td class="text-center">${escapeHTML(candidate.period || '—')}</td>
                    <td><strong>${escapeHTML(candidate.className || '—')}</strong></td>
                    <td class="text-center">${escapeHTML(candidate.ppctPeriod || '—')}</td>
                    <td class="plan-sync-evidence"><strong>${escapeHTML(candidate.label)}:</strong> ${escapeHTML(candidate.evidence)}</td>
                </tr>`).join('')}</tbody>
            </table></div>`;
            updatePlanSyncSelectionState();
            planScheduleSyncPanel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        }

        function applyPlanScheduleSync() {
            const context = planSyncContext;
            if (!context || !ensureScheduleEditable(context.week)) return;
            const selectedIds = new Set(
                Array.from(planSyncContent.querySelectorAll('input[data-plan-sync-item]:checked'))
                    .map(checkbox => checkbox.dataset.planSyncItem)
            );
            if (!selectedIds.size) {
                showToast('⚠️ Chưa chọn tiết cần đồng bộ', 'error');
                return;
            }
            pushScheduleUndo(context.week);
            let appliedCount = 0;
            context.candidates.forEach(candidate => {
                if (!selectedIds.has(candidate.itemId)) return;
                const item = state.teachingSchedule[context.week]?.find(row => row.id === candidate.itemId);
                if (!item || item.notTeaching) return;
                item.notTeaching = true;
                item.notTeachingReason = candidate.reason;
                item.manualEdited = true;
                item.updatedAt = new Date().toISOString();
                appliedCount++;
            });
            persistScheduleEdit(context.week);
            closePlanSyncPanel();
            showToast(
                `✅ Đã đồng bộ ${appliedCount} tiết Không học; PPCT hiện tại và các tuần sau đã cập nhật. Có thể dùng “Thêm tiết học bù” khi cần.`,
                'success'
            );
        }

        const SCHEDULE_VALIDATION_CHECKS = [
            { key: 'source', label: 'Dữ liệu nguồn' },
            { key: 'date', label: 'Năm học và ngày' },
            { key: 'required', label: 'Thông tin tiết học' },
            { key: 'conflict', label: 'Xung đột lịch' },
            { key: 'ppct', label: 'Dãy Tiết PPCT' },
            { key: 'curriculum', label: 'Tên bài theo PPCT' },
            { key: 'plan', label: 'Kế hoạch trường' },
            { key: 'makeup', label: 'Không học và học bù' },
        ];

        function scheduleValidationCategoryLabel(key) {
            return SCHEDULE_VALIDATION_CHECKS.find(item => item.key === key)?.label || 'Kiểm tra dữ liệu';
        }

        function validateTeachingScheduleWeek(week) {
            const normalizedWeek = Number.parseInt(week, 10);
            const issues = [];
            let issueNumber = 0;
            const addIssue = (severity, category, title, message, itemId = '') => {
                issues.push({
                    id: `validation-${normalizedWeek}-${++issueNumber}`,
                    severity,
                    category,
                    title: cleanText(title),
                    message: cleanText(message),
                    itemId: cleanText(itemId),
                });
            };
            const data = getSortedScheduleItems(state.teachingSchedule[normalizedWeek] || []);
            const meta = normalizedWeek ? getScheduleMeta(normalizedWeek) : { stale: false, status: 'draft' };
            const timetable = state.timetablesByWeek?.[normalizedWeek] || null;
            const plan = state.planData.find(item => Number.parseInt(item.week, 10) === normalizedWeek) || null;
            const dateInfo = getWeekDateInfo(normalizedWeek);

            if (!(normalizedWeek > 0 && normalizedWeek <= MAX_SCHOOL_WEEKS)) {
                addIssue('error', 'date', 'Tuần không hợp lệ', `Số tuần phải nằm trong khoảng 1 đến ${MAX_SCHOOL_WEEKS}.`);
            }
            if (!data.length) {
                addIssue('error', 'required', 'Chưa có lịch báo giảng', 'Hãy tạo lịch báo giảng trước khi chốt tuần.');
            }
            if (meta.stale) {
                addIssue(
                    'error', 'source', 'Lịch được tạo từ dữ liệu cũ',
                    `${meta.staleReason || 'Kế hoạch trường, thời khóa biểu hoặc phân phối chương trình đã thay đổi'}. Hãy tạo lại lịch báo giảng.`
                );
            }
            if (!timetable) {
                addIssue('warning', 'source', 'Chưa có thời khóa biểu tuần', 'Không thể đối chiếu vị trí Tiết TKB với thời khóa biểu của tuần này.');
            }
            if (!plan) {
                addIssue('warning', 'source', 'Chưa có Kế hoạch trường', 'Không thể kiểm tra các ngày nghỉ, thi tập trung hoặc hoạt động chung của tuần.');
            }
            if (!dateInfo) {
                addIssue('warning', 'date', 'Chưa thiết lập ngày bắt đầu Tuần 1', 'Hãy nhập ngày Thứ 2 của Tuần 1 để hệ thống tự tính đúng khoảng ngày của tuần.');
            }
            if (normalizeAcademicYear(state.teacherProfile.academicYear) !== state.selectedAcademicYear) {
                addIssue(
                    'warning', 'date', 'Năm học trong hồ sơ chưa đồng bộ',
                    `Hồ sơ đang ghi ${state.teacherProfile.academicYear || 'chưa xác định'}, trong khi dữ liệu đang chọn năm học ${state.selectedAcademicYear}.`
                );
            }
            if (plan?.schoolYear && normalizeAcademicYear(plan.schoolYear)
                && normalizeAcademicYear(plan.schoolYear) !== state.selectedAcademicYear) {
                addIssue(
                    'warning', 'date', 'Kế hoạch trường khác năm học',
                    `Kế hoạch tuần ${normalizedWeek} ghi năm học ${plan.schoolYear}, khác với ${state.selectedAcademicYear}.`
                );
            }
            if (plan && dateInfo && cleanText(plan.dateRange)
                && normalizeLookupText(plan.dateRange) !== normalizeLookupText(dateInfo.rangeText)) {
                addIssue(
                    'warning', 'date', 'Khoảng ngày của kế hoạch chưa khớp',
                    `Hệ thống tính tuần ${normalizedWeek} là ${dateInfo.rangeText}, nhưng kế hoạch đang ghi ${plan.dateRange}.`
                );
            }

            const activeItems = [];
            data.forEach(item => {
                if (item.notTeaching) {
                    if (cleanText(item.ppctPeriod)) {
                        addIssue(
                            'error', 'ppct', 'Tiết Không học vẫn đang tính PPCT',
                            `${item.day}, ${item.session}, Tiết TKB ${item.period}, lớp ${item.class || '—'} phải để trống Tiết PPCT.`, item.id
                        );
                    }
                    if (!cleanText(item.notTeachingReason)) {
                        addIssue(
                            'warning', 'makeup', 'Chưa ghi lý do Không học',
                            `${item.day}, ${item.session}, Tiết TKB ${item.period}, lớp ${item.class || '—'} chưa có lý do.`, item.id
                        );
                    }
                    return;
                }
                activeItems.push(item);
                const missingFields = [];
                if (!SCHOOL_DAYS.includes(normalizeDayName(item.day))) missingFields.push('Thứ');
                if (!['Buổi sáng', 'Buổi chiều'].includes(normalizeSessionLabel(item.session))) missingFields.push('Buổi');
                const period = Number.parseInt(item.period, 10);
                if (!(period > 0 && period <= 15)) missingFields.push('Tiết TKB');
                if (!cleanText(item.class)) missingFields.push('Lớp');
                if (!cleanText(item.subject)) missingFields.push('Môn');
                if (missingFields.length) {
                    addIssue(
                        'error', 'required', 'Thiếu thông tin tiết học',
                        `Dòng ${item.day || 'chưa có Thứ'}, Tiết TKB ${item.period || '—'} thiếu: ${missingFields.join(', ')}.`, item.id
                    );
                }
                const ppct = Number.parseInt(item.ppctPeriod, 10);
                if (!(ppct > 0)) {
                    addIssue(
                        'error', 'ppct', 'Chưa có Tiết PPCT',
                        `${item.day}, ${item.session}, Tiết TKB ${item.period}, lớp ${item.class || '—'} chưa được đánh Tiết PPCT.`, item.id
                    );
                }
                const lesson = ppct > 0
                    ? getCurriculumLessonByPpct(item.class, item.subject, ppct)
                    : null;
                if (!lesson) {
                    addIssue(
                        'error', 'curriculum', 'Chưa có tên bài tương ứng',
                        `Không tìm thấy ánh xạ Tiết PPCT ${item.ppctPeriod || '—'} của lớp ${item.class || '—'} trong phân phối chương trình.`, item.id
                    );
                } else if (!cleanText(item.topic)
                    || normalizeLookupText(item.topic) !== normalizeLookupText(lesson.topic)) {
                    addIssue(
                        'error', 'curriculum', 'Tên bài chưa khớp Tiết PPCT',
                        `Tiết PPCT ${item.ppctPeriod} của lớp ${item.class}: phải là “${lesson.topic}”, hiện đang là “${item.topic || 'chưa xác định'}”.`, item.id
                    );
                }
            });

            const slotGroups = new Map();
            activeItems.forEach(item => {
                const normalizedPeriod = Number.parseInt(item.period, 10);
                const key = [
                    normalizeDayName(item.day),
                    normalizeSessionLabel(item.session),
                    normalizedPeriod > 0 ? String(normalizedPeriod) : cleanText(item.period),
                ].join('|');
                if (!slotGroups.has(key)) slotGroups.set(key, []);
                slotGroups.get(key).push(item);
            });
            slotGroups.forEach(items => {
                if (items.length < 2) return;
                const first = items[0];
                addIssue(
                    'error', 'conflict', 'Trùng giờ dạy',
                    `${first.day}, ${first.session}, Tiết TKB ${first.period} đang có ${items.length} lớp: ${items.map(item => item.class || '—').join(', ')}.`, first.id
                );
            });

            if (timetable) {
                activeItems.forEach(item => {
                    const day = normalizeDayName(item.day);
                    const session = normalizeSessionLabel(item.session);
                    const sessionKey = session === 'Buổi chiều' ? 'afternoon' : 'morning';
                    const cell = getTimetableCellAt(timetable, sessionKey, item.period, day);
                    if (item.manualAdded) {
                        if (cell) {
                            addIssue(
                                'error', 'conflict', 'Tiết học bù trùng thời khóa biểu',
                                `${day}, ${session}, Tiết TKB ${item.period} đã có ${timetableCellText(cell)} trong thời khóa biểu.`, item.id
                            );
                        }
                        return;
                    }
                    if (!cell) {
                        addIssue(
                            'error', 'source', 'Tiết không còn trong thời khóa biểu',
                            `${day}, ${session}, Tiết TKB ${item.period}, lớp ${item.class || '—'} không còn xuất hiện trong TKB tuần ${normalizedWeek}.`, item.id
                        );
                        return;
                    }
                    if (normalizeClassKey(cell.className) !== normalizeClassKey(item.class)
                        || !curriculumSubjectMatches(item.subject, cell.subject || cell.content)) {
                        addIssue(
                            'error', 'source', 'Lịch báo giảng khác thời khóa biểu',
                            `${day}, ${session}, Tiết TKB ${item.period}: TKB ghi “${timetableCellText(cell)}”, lịch báo giảng ghi “${item.class} - ${item.subject}”.`, item.id
                        );
                    }
                });
            }

            const courseGroups = new Map();
            activeItems.forEach(item => {
                if (!cleanText(item.class) || !cleanText(item.subject)) return;
                const key = scheduleClassSubjectKey(item);
                if (!courseGroups.has(key)) courseGroups.set(key, []);
                courseGroups.get(key).push(item);
            });
            courseGroups.forEach(items => {
                const ordered = getSortedScheduleItems(items);
                let expected = getAutomaticPpctStart(normalizedWeek, ordered[0].class, ordered[0].subject);
                ordered.forEach(item => {
                    const actual = Number.parseInt(item.ppctPeriod, 10);
                    if (actual > 0 && actual !== expected) {
                        addIssue(
                            'error', 'ppct', 'Dãy Tiết PPCT không liên tục',
                            `${item.day}, ${item.session}, Tiết TKB ${item.period}, lớp ${item.class}: phải là Tiết PPCT ${expected}, hiện đang là ${actual}.`, item.id
                        );
                    }
                    expected++;
                });
            });

            if (plan) {
                buildPlanScheduleSyncCandidates(normalizedWeek).candidates.forEach(candidate => {
                    addIssue(
                        candidate.recommended ? 'error' : 'warning', 'plan',
                        candidate.recommended ? 'Kế hoạch trường ghi nghỉ học' : 'Cần đối chiếu Kế hoạch trường',
                        `${candidate.day}, ${candidate.session}, Tiết TKB ${candidate.period}, lớp ${candidate.className}: ${candidate.label} — ${candidate.evidence}.`,
                        candidate.itemId
                    );
                });
            }

            const canceledByCourse = new Map();
            const makeupByCourse = new Map();
            data.forEach(item => {
                const key = scheduleClassSubjectKey(item);
                if (!key || key === '|') return;
                if (item.notTeaching) {
                    if (!canceledByCourse.has(key)) canceledByCourse.set(key, []);
                    canceledByCourse.get(key).push(item);
                }
                if (item.makeupLesson && !item.notTeaching) {
                    makeupByCourse.set(key, (makeupByCourse.get(key) || 0) + 1);
                }
            });
            canceledByCourse.forEach((items, key) => {
                const makeupCount = makeupByCourse.get(key) || 0;
                if (items.length <= makeupCount) return;
                const first = items[0];
                addIssue(
                    'warning', 'makeup', 'Có tiết Không học chưa bố trí học bù',
                    `Trong tuần ${normalizedWeek}, lớp ${first.class} có ${items.length} tiết Không học và ${makeupCount} tiết học bù. Thầy kiểm tra xem có cần bố trí bù không.`, first.id
                );
            });

            const errorCount = issues.filter(issue => issue.severity === 'error').length;
            const warningCount = issues.filter(issue => issue.severity === 'warning').length;
            const affectedCategories = new Set(issues.map(issue => issue.category));
            return {
                week: normalizedWeek,
                issues,
                errorCount,
                warningCount,
                passedChecks: Math.max(0, SCHEDULE_VALIDATION_CHECKS.length - affectedCategories.size),
                totalChecks: SCHEDULE_VALIDATION_CHECKS.length,
                canFinalize: errorCount === 0,
                checkedAt: new Date().toISOString(),
            };
        }

        function closeScheduleValidationPanel() {
            scheduleValidationPanel.hidden = true;
            scheduleValidationContext = null;
            scheduleValidationContent.innerHTML = '';
        }

        function renderScheduleValidationReport(report, shouldScroll = true) {
            scheduleValidationContext = report;
            scheduleValidationPanel.hidden = false;
            scheduleValidationSummary.textContent = report.errorCount
                ? `Tuần ${report.week} chưa thể chốt: cần sửa ${report.errorCount} lỗi bắt buộc.`
                : report.warningCount
                    ? `Tuần ${report.week} không có lỗi bắt buộc; thầy cần xem lại ${report.warningCount} cảnh báo trước khi chốt.`
                    : `Tuần ${report.week} đã vượt qua toàn bộ kiểm tra và đủ điều kiện chốt.`;
            scheduleValidationStats.innerHTML = `
                <div class="validation-stat error"><strong>${report.errorCount}</strong><span>LỖI BẮT BUỘC SỬA</span></div>
                <div class="validation-stat warning"><strong>${report.warningCount}</strong><span>CẢNH BÁO CẦN XEM</span></div>
                <div class="validation-stat passed"><strong>${report.passedChecks}/${report.totalChecks}</strong><span>NHÓM KIỂM TRA ĐẠT</span></div>`;
            if (!report.issues.length) {
                scheduleValidationContent.innerHTML = '<div class="schedule-validation-success"><strong>✅ Dữ liệu hợp lệ.</strong> Tiết PPCT liên tục, tên bài khớp phân phối, không có xung đột và dữ liệu nguồn đang đồng bộ.</div>';
            } else {
                const ordered = [...report.issues].sort((a, b) => {
                    const severityOrder = { error: 0, warning: 1 };
                    return severityOrder[a.severity] - severityOrder[b.severity]
                        || a.category.localeCompare(b.category, 'vi');
                });
                scheduleValidationContent.innerHTML = `<div class="schedule-validation-list">${ordered.map(issue => `
                    <div class="schedule-validation-issue ${issue.severity}">
                        <div class="validation-issue-icon">${issue.severity === 'error' ? '🔴' : '🟡'}</div>
                        <div>
                            <div class="validation-issue-title">${escapeHTML(issue.title)}</div>
                            <div class="validation-issue-message">${escapeHTML(issue.message)}</div>
                            <span class="validation-category">${escapeHTML(scheduleValidationCategoryLabel(issue.category))}</span>
                        </div>
                        ${issue.itemId ? `<button class="btn btn-outline btn-sm" type="button" data-validation-item-id="${escapeHTML(issue.itemId)}">Đi đến tiết</button>` : ''}
                    </div>`).join('')}</div>`;
            }
            const isFinal = getScheduleMeta(report.week).status === 'final';
            finalizeValidatedWeekBtn.hidden = isFinal || !report.canFinalize;
            finalizeValidatedWeekBtn.textContent = report.warningCount
                ? `🔒 Chốt tuần sau khi xem ${report.warningCount} cảnh báo`
                : '🔒 Chốt tuần đã kiểm tra';
            if (shouldScroll) scheduleValidationPanel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        }

        function openScheduleValidationPanel(week, shouldScroll = true) {
            if (!week || !state.teachingSchedule[week]?.length) {
                showToast('⚠️ Cần tạo lịch báo giảng trước khi kiểm tra', 'error');
                return null;
            }
            if (planSyncContext) closePlanSyncPanel();
            const report = validateTeachingScheduleWeek(week);
            renderScheduleValidationReport(report, shouldScroll);
            return report;
        }

        function focusScheduleValidationIssue(itemId) {
            const rows = Array.from(scheduleDisplay.querySelectorAll?.('tr[data-schedule-row-id]') || []);
            const row = rows.find(item => item.dataset.scheduleRowId === itemId);
            if (!row) {
                showToast('Tiết cần kiểm tra không còn trong bảng hiện tại', 'info');
                return;
            }
            rows.forEach(item => item.classList.remove('validation-target-row'));
            row.classList.add('validation-target-row');
            row.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            setTimeout(() => row.classList.remove('validation-target-row'), 3500);
        }

        function mergeScheduleWithManualChanges(week, generatedItems) {
            const previous = state.teachingSchedule[week] || [];
            const meta = getScheduleMeta(week);
            const removed = new Set(meta.removedSourceSlots);
            const manualBySource = new Map(
                previous
                    .filter(item => item.manualEdited && !item.manualAdded && item.sourceSlotKey)
                    .map(item => [item.sourceSlotKey, item])
            );
            const prepared = (generatedItems || [])
                .map((item, index) => normalizeScheduleItem(item, week, index))
                .filter(Boolean)
                .filter(item => !removed.has(item.sourceSlotKey))
                .map(item => manualBySource.has(item.sourceSlotKey)
                    ? cloneRecognitionData(manualBySource.get(item.sourceSlotKey))
                    : item);
            previous.filter(item => item.manualAdded).forEach(item => prepared.push(cloneRecognitionData(item)));
            return prepared.map((item, index) => normalizeScheduleItem(item, week, index)).filter(Boolean);
        }

        function ensureScheduleEditable(week) {
            if (!week) {
                showToast('⚠️ Vui lòng chọn tuần', 'error');
                return false;
            }
            if (getScheduleMeta(week).status === 'final') {
                showToast('🔒 Tuần đã chốt. Hãy nhấn “Mở lại tuần” trước khi chỉnh sửa.', 'info');
                return false;
            }
            return true;
        }

        function openScheduleEditor(week, itemId = '') {
            if (!ensureScheduleEditable(week)) return;
            const item = itemId ? state.teachingSchedule[week]?.find(row => row.id === itemId) : null;
            if (itemId && !item) return;
            scheduleEditorContext = { week, itemId: item?.id || '', mode: item ? 'edit' : 'add' };
            scheduleEditorTitle.textContent = item
                ? `Sửa tiết học — ${item.class || 'Chưa xác định'}`
                : 'Thêm tiết học bù';
            scheduleEditorSubtitle.textContent = item
                ? `Tuần ${week} · ${item.day}, ${item.session}, Tiết TKB ${item.period}`
                : `Tuần ${week} · PPCT và tên bài sẽ tự động cập nhật sau khi lưu.`;
            scheduleEditorDay.value = item?.day || 'Thứ 2';
            scheduleEditorSession.value = item?.session || 'Buổi sáng';
            scheduleEditorPeriod.value = item?.period || '1';
            scheduleEditorClass.value = item?.class || '';
            scheduleEditorSubject.value = item?.subject || state.teacherProfile.subject;
            scheduleEditorPpctField.hidden = !item || Boolean(item.makeupLesson);
            scheduleEditorPpct.value = item && !item.makeupLesson && item.manualPpct ? item.ppctPeriod : '';
            scheduleEditorTopic.value = item?.manualTopic ? item.topic : '';
            scheduleEditorNote.value = item?.note || (item ? '' : 'Tiết học bù');
            saveScheduleEditorBtn.textContent = item ? '💾 Lưu thay đổi' : '＋ Thêm tiết học bù';
            setFormFeedback(scheduleEditorError);
            resetScheduleConflictConfirmation();
            updateScheduleEditorMappingHint();
            openAppModal(scheduleEditorModal, item ? scheduleEditorPeriod : scheduleEditorClass);
        }

        function editScheduleItem(week, itemId) {
            openScheduleEditor(week, itemId);
        }

        function submitScheduleEditor(event) {
            event.preventDefault();
            const context = scheduleEditorContext;
            if (!context || !ensureScheduleEditable(context.week)) return;
            const day = normalizeDayName(scheduleEditorDay.value);
            const session = normalizeSessionLabel(scheduleEditorSession.value);
            const rawPeriod = Number(scheduleEditorPeriod.value);
            const period = Number.isInteger(rawPeriod) ? rawPeriod : NaN;
            const className = cleanText(scheduleEditorClass.value).toUpperCase();
            const subjectInput = cleanText(scheduleEditorSubject.value);
            const ppctPeriod = cleanText(scheduleEditorPpct.value);
            const topic = cleanText(scheduleEditorTopic.value);
            const note = cleanText(scheduleEditorNote.value);
            const errors = [];
            if (!SCHOOL_DAYS.includes(day)) errors.push('Chọn Thứ từ Thứ 2 đến Thứ 7.');
            if (!['Buổi sáng', 'Buổi chiều'].includes(session)) errors.push('Chọn đúng buổi học.');
            if (!(period > 0 && period <= 15)) errors.push('Tiết TKB phải từ 1 đến 15.');
            if (!className) errors.push('Vui lòng nhập tên lớp.');
            if (!subjectInput) errors.push('Vui lòng nhập môn học.');
            if (ppctPeriod && !/^\d+$/.test(ppctPeriod)) errors.push('Tiết PPCT phải là số nguyên dương hoặc để trống.');
            if (errors.length) {
                setFormFeedback(scheduleEditorError, errors.join(' '));
                return;
            }
            setFormFeedback(scheduleEditorError);
            const item = context.mode === 'edit'
                ? state.teachingSchedule[context.week]?.find(row => row.id === context.itemId)
                : null;
            if (context.mode === 'edit' && !item) {
                setFormFeedback(scheduleEditorError, 'Tiết học này không còn tồn tại. Hãy đóng biểu mẫu và mở lại.');
                return;
            }
            const allowMatchingTimetable = Boolean(item && !item.manualAdded);
            const conflicts = getMakeupScheduleConflicts(
                context.week, day, session, period, className, item?.id || '', allowMatchingTimetable
            );
            if (conflicts.length && !scheduleEditorConflictConfirm.checked) {
                scheduleEditorConflictList.innerHTML = conflicts.map(conflict => `<li>${escapeHTML(conflict)}</li>`).join('');
                scheduleEditorConflict.hidden = false;
                scheduleEditorConflict.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                return;
            }
            const preferredSubject = getPreferredScheduleSubjectLabel(context.week, className, subjectInput);
            const curriculum = getCurriculumForClass(context.week, className, preferredSubject);
            pushScheduleUndo(context.week);
            if (item) {
                Object.assign(item, {
                    day,
                    session,
                    period: String(period),
                    ppctPeriod: item.makeupLesson ? '' : ppctPeriod,
                    manualPpct: !item.makeupLesson && Boolean(ppctPeriod),
                    class: className,
                    subject: preferredSubject,
                    topic,
                    manualTopic: Boolean(topic),
                    note,
                    curriculumSource: curriculum.sourceLabel,
                    curriculumProfileId: curriculum.profileId,
                    manualEdited: true,
                    updatedAt: new Date().toISOString(),
                });
                const meta = getScheduleMeta(context.week);
                if (meta.affectedScope === 'slots') {
                    meta.affectedSourceSlots = meta.affectedSourceSlots.filter(key => key !== item.sourceSlotKey);
                    if (meta.affectedSourceSlots.length === 0) {
                        meta.stale = false;
                        meta.staleReason = '';
                    }
                }
                if (item.makeupLesson) unlockPpctSequenceAfterMakeup(context.week, item);
                closeAppModal(scheduleEditorModal);
                persistScheduleEdit(context.week, 'Đã cập nhật tiết học');
                return;
            }
            const id = `schedule-manual-${context.week}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
            state.teachingSchedule[context.week] ||= [];
            const addedItem = {
                day,
                session,
                period: String(period),
                ppctPeriod: '',
                manualPpct: false,
                class: className,
                subject: preferredSubject,
                topic,
                manualTopic: Boolean(topic),
                note: note || 'Tiết học bù',
                curriculumSource: curriculum.sourceLabel,
                curriculumProfileId: curriculum.profileId,
                id,
                sourceSlotKey: `manual:${id}`,
                manualEdited: true,
                manualAdded: true,
                makeupLesson: true,
                notTeaching: false,
                notTeachingReason: '',
                updatedAt: new Date().toISOString(),
            };
            state.teachingSchedule[context.week].push(addedItem);
            unlockPpctSequenceAfterMakeup(context.week, addedItem);
            closeAppModal(scheduleEditorModal);
            persistScheduleEdit(context.week);
            showToast(
                `✅ Đã thêm tiết học bù tại Tiết PPCT ${addedItem.ppctPeriod || '—'}; các tiết tiếp theo đã tự động cập nhật`,
                'success'
            );
        }

        function getMakeupScheduleConflicts(
            week, day, session, period, className, excludeItemId = '', allowMatchingTimetable = false
        ) {
            const conflicts = [];
            const occupiedItems = (state.teachingSchedule[week] || []).filter(item =>
                item.id !== excludeItemId
                && !item.notTeaching
                && normalizeDayName(item.day) === day
                && normalizeSessionLabel(item.session) === session
                && Number.parseInt(item.period, 10) === Number.parseInt(period, 10)
            );
            if (occupiedItems.length) {
                conflicts.push(`Giáo viên đã có lịch: ${occupiedItems.map(item => `${item.class || '—'} (${item.subject || '—'})`).join(', ')}`);
            }
            const sessionKey = session === 'Buổi chiều' ? 'afternoon' : 'morning';
            const timetableCell = getTimetableCellAt(state.timetablesByWeek?.[week], sessionKey, period, day);
            const timetableMatchesEditedClass = allowMatchingTimetable
                && normalizeClassKey(timetableCell?.className) === normalizeClassKey(className);
            if (timetableCell && !timetableMatchesEditedClass && !occupiedItems.some(item =>
                normalizeClassKey(item.class) === normalizeClassKey(timetableCell.className)
            )) {
                conflicts.push(`TKB tại vị trí này đang có ${timetableCell.content || `${timetableCell.className} - ${timetableCell.subject}`}`);
            }
            if (occupiedItems.some(item => normalizeClassKey(item.class) === normalizeClassKey(className))) {
                conflicts.push(`Lớp ${cleanText(className)} đã có tiết học tại đúng khung giờ này`);
            }
            return [...new Set(conflicts)];
        }

        function addScheduleItem(week) {
            openScheduleEditor(week);
        }

        function toggleScheduleNotTeaching(week, itemId) {
            if (!ensureScheduleEditable(week)) return;
            const item = state.teachingSchedule[week]?.find(row => row.id === itemId);
            if (!item) return;
            const markingNotTeaching = !item.notTeaching;
            notTeachingEditorContext = { week, itemId, markingNotTeaching };
            notTeachingModalTitle.textContent = markingNotTeaching
                ? 'Đánh dấu Không học'
                : 'Khôi phục thành tiết có học';
            notTeachingContext.innerHTML = `
                <strong>${escapeHTML(item.day)}, ${escapeHTML(item.session)}, Tiết TKB ${escapeHTML(item.period)}</strong><br>
                Lớp ${escapeHTML(item.class || '—')} · ${escapeHTML(item.subject || '—')}
                ${item.ppctPeriod ? ` · Tiết PPCT ${escapeHTML(item.ppctPeriod)}` : ''}`;
            notTeachingReasonField.hidden = !markingNotTeaching;
            notTeachingReason.value = item.notTeachingReason || 'Không học';
            confirmNotTeachingBtn.className = markingNotTeaching ? 'btn btn-danger' : 'btn btn-success';
            confirmNotTeachingBtn.textContent = markingNotTeaching
                ? '🚫 Xác nhận Không học'
                : '↩️ Khôi phục tiết học';
            setFormFeedback(notTeachingError);
            openAppModal(notTeachingModal, markingNotTeaching ? notTeachingReason : confirmNotTeachingBtn);
        }

        function submitNotTeachingEditor(event) {
            event.preventDefault();
            const context = notTeachingEditorContext;
            if (!context || !ensureScheduleEditable(context.week)) return;
            const item = state.teachingSchedule[context.week]?.find(row => row.id === context.itemId);
            if (!item) {
                setFormFeedback(notTeachingError, 'Tiết học này không còn tồn tại.');
                return;
            }
            let reason = '';
            if (context.markingNotTeaching) {
                reason = cleanText(notTeachingReason.value);
                if (!reason) {
                    setFormFeedback(notTeachingError, 'Vui lòng nhập lý do Không học.');
                    notTeachingReason.focus();
                    return;
                }
            }
            setFormFeedback(notTeachingError);
            pushScheduleUndo(context.week);
            item.notTeaching = context.markingNotTeaching;
            item.notTeachingReason = context.markingNotTeaching ? reason : '';
            item.manualEdited = true;
            item.updatedAt = new Date().toISOString();
            closeAppModal(notTeachingModal);
            persistScheduleEdit(
                context.week,
                context.markingNotTeaching
                    ? 'Đã đánh dấu Không học; tiết này không tính PPCT và các tiết sau đã tự lùi'
                    : 'Đã khôi phục tiết học và tính lại dãy Tiết PPCT'
            );
        }

        function undoScheduleEdit(week) {
            const stack = scheduleUndoStack[week];
            if (!week || !stack?.length) {
                showToast('Không còn thao tác lịch báo giảng để hoàn tác', 'info');
                return;
            }
            const snapshot = stack.pop();
            if (scheduleValidationContext?.week === week) closeScheduleValidationPanel();
            state.teachingSchedule[week] = snapshot.schedule;
            state.scheduleMeta[week] = snapshot.meta;
            renumberStoredSchedulesFrom(week);
            persistTeachingScheduleState();
            renderTeachingSchedule(week);
            showToast('✅ Đã hoàn tác thay đổi gần nhất', 'success');
        }

        function editTeacherProfile() {
            const current = state.teacherProfile;
            teacherProfileSchool.value = current.schoolName;
            teacherProfileName.value = current.teacherName;
            teacherProfileSubject.value = current.subject;
            teacherProfileYear.value = current.academicYear;
            setFormFeedback(teacherProfileError);
            openAppModal(teacherProfileModal, teacherProfileSchool);
        }

        function submitTeacherProfileEditor(event) {
            event.preventDefault();
            const schoolName = cleanText(teacherProfileSchool.value);
            const teacherName = cleanText(teacherProfileName.value);
            const subject = cleanText(teacherProfileSubject.value);
            const academicYear = cleanText(teacherProfileYear.value);
            const errors = [];
            if (!schoolName) errors.push('Vui lòng nhập tên trường.');
            if (!teacherName) errors.push('Vui lòng nhập tên giáo viên.');
            if (!subject) errors.push('Vui lòng nhập môn giảng dạy.');
            const normalizedYear = normalizeAcademicYear(academicYear);
            if (!normalizedYear) errors.push('Năm học phải có dạng 2025-2026 và hai năm liên tiếp.');
            if (errors.length) {
                setFormFeedback(teacherProfileError, errors.join(' '));
                return;
            }
            setFormFeedback(teacherProfileError);
            state.teacherProfile = normalizeTeacherProfile({ schoolName, teacherName, subject, academicYear: normalizedYear });
            writeStoredJSON('teacher_profile', state.teacherProfile);
            closeAppModal(teacherProfileModal);
            if (normalizedYear !== state.selectedAcademicYear) {
                activateAcademicYearWorkspace(normalizedYear, false);
            } else {
                populateAcademicYearSelect(normalizedYear);
                persistActiveYearWorkspace();
            }
            curriculumSubjectInput.value = state.teacherProfile.subject;
            updateSchedulePrintHeader(getSelectedScheduleWeek());
            updateDataSafetySummary();
            showToast('✅ Đã cập nhật thông tin hồ sơ', 'success');
        }

        function toggleScheduleFinal(week, warningsConfirmed = false) {
            if (!week || !state.teachingSchedule[week]?.length) return;
            const isFinal = getScheduleMeta(week).status === 'final';
            if (isFinal) {
                if (!confirm(`Mở lại lịch báo giảng tuần ${week} để tiếp tục chỉnh sửa?`)) return;
                pushScheduleUndo(week);
                const meta = getScheduleMeta(week);
                meta.status = 'draft';
                meta.finalizedAt = '';
                persistTeachingScheduleState();
                renderTeachingSchedule(week);
                showToast(`Đã mở lại tuần ${week}`, 'info');
                return;
            }
            const report = validateTeachingScheduleWeek(week);
            if (report.errorCount) {
                renderScheduleValidationReport(report);
                showToast(`❌ Chưa thể chốt: còn ${report.errorCount} lỗi bắt buộc sửa`, 'error');
                return;
            }
            if (report.warningCount && !warningsConfirmed) {
                renderScheduleValidationReport(report);
                showToast(`⚠️ Hãy xem ${report.warningCount} cảnh báo rồi dùng nút “Chốt tuần sau khi xem cảnh báo”`, 'info');
                return;
            }
            pushScheduleUndo(week);
            const meta = getScheduleMeta(week);
            meta.status = 'final';
            meta.finalizedAt = new Date().toISOString();
            persistTeachingScheduleState();
            if (scheduleValidationContext?.week === week) closeScheduleValidationPanel();
            renderTeachingSchedule(week);
            showToast(`✅ Đã chốt lịch báo giảng tuần ${week}`, 'success');
        }

        function getScheduleDocumentData(week) {
            const plan = state.planData.find(item => item.week === week);
            const automaticDate = getWeekDateInfo(week);
            return {
                week,
                dateRange: automaticDate?.rangeText || cleanText(plan?.dateRange),
                profile: state.teacherProfile,
                meta: getScheduleMeta(week),
                items: getSortedScheduleItems(state.teachingSchedule[week] || []),
            };
        }

        function getScheduleDocumentTopic(item) {
            if (!item.notTeaching) return cleanText(item.topic);
            return `KHÔNG HỌC${item.notTeachingReason ? ` — ${item.notTeachingReason}` : ''}`;
        }

        function downloadScheduleBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function exportScheduleExcel(week) {
            if (!week || !state.teachingSchedule[week]?.length) return;
            if (!window.XLSX?.utils) {
                showToast('❌ Thư viện xuất Excel chưa tải được', 'error');
                return;
            }
            const doc = getScheduleDocumentData(week);
            const rows = [
                [doc.profile.schoolName],
                [`LỊCH BÁO GIẢNG TUẦN ${week}${doc.dateRange ? ` (${doc.dateRange})` : ''}`],
                [`Giáo viên: ${doc.profile.teacherName}`, `Môn: ${doc.profile.subject}`, `Năm học: ${doc.profile.academicYear}`],
                [],
                ['Thứ', 'Buổi', 'Tiết TKB', 'Tiết PPCT', 'Lớp', 'Môn', 'Bài dạy / Chủ đề', 'Ghi chú'],
                ...doc.items.map(item => [
                    item.day, item.session, item.period, item.notTeaching ? '—' : item.ppctPeriod,
                    item.class, item.subject, getScheduleDocumentTopic(item),
                    [item.makeupLesson ? 'Tiết học bù' : '', item.note].filter(Boolean).join(' — '),
                ]),
            ];
            const sheet = XLSX.utils.aoa_to_sheet(rows);
            sheet['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 7 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 42 }, { wch: 30 }];
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, `Tuan ${week}`);
            XLSX.writeFile(workbook, `lich-bao-giang-tuan-${week}.xlsx`);
            showToast(`✅ Đã xuất Excel lịch báo giảng tuần ${week}`, 'success');
        }

        function exportScheduleWord(week) {
            if (!week || !state.teachingSchedule[week]?.length) return;
            const doc = getScheduleDocumentData(week);
            const rows = doc.items.map(item => `<tr${item.notTeaching ? ' style="color:#64748b;background:#f1f5f9;"' : ''}>
                <td>${escapeHTML(item.day)}</td><td>${escapeHTML(item.session)}</td><td>${escapeHTML(item.period)}</td><td>${escapeHTML(item.notTeaching ? '—' : item.ppctPeriod || '—')}</td>
                <td>${escapeHTML(item.class)}</td><td>${escapeHTML(item.subject)}</td>
                <td>${escapeHTML(getScheduleDocumentTopic(item))}</td><td>${escapeHTML([item.makeupLesson ? 'Tiết học bù' : '', item.note].filter(Boolean).join(' — '))}</td>
            </tr>`).join('');
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                @page { size: A4 landscape; margin: 12mm; }
                body { font-family: "Times New Roman", serif; color:#000; }
                h1,h2,p { text-align:center; margin:4px 0; }
                table { width:100%; border-collapse:collapse; margin-top:12px; font-size:11pt; }
                th,td { border:1px solid #000; padding:5px 6px; vertical-align:top; }
                th { font-weight:bold; }
            </style></head><body>
                <h2>${escapeHTML(doc.profile.schoolName)}</h2>
                <h1>LỊCH BÁO GIẢNG TUẦN ${week}</h1>
                <p>${doc.dateRange ? `Thời gian: ${escapeHTML(doc.dateRange)} · ` : ''}Giáo viên: <b>${escapeHTML(doc.profile.teacherName)}</b> · Môn: <b>${escapeHTML(doc.profile.subject)}</b> · Năm học: <b>${escapeHTML(doc.profile.academicYear)}</b></p>
                <table><thead><tr><th>Thứ</th><th>Buổi</th><th>Tiết TKB</th><th>Tiết PPCT</th><th>Lớp</th><th>Môn</th><th>Bài dạy / Chủ đề</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>
            </body></html>`;
            downloadScheduleBlob(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }), `lich-bao-giang-tuan-${week}.doc`);
            showToast(`✅ Đã xuất Word lịch báo giảng tuần ${week}`, 'success');
        }

        function printSchedule(week) {
            if (!week || !state.teachingSchedule[week]?.length) return;
            updateSchedulePrintHeader(week);
            document.body.classList.add('print-schedule-mode');
            const cleanup = () => document.body.classList.remove('print-schedule-mode');
            window.addEventListener('afterprint', cleanup, { once: true });
            window.print();
            setTimeout(cleanup, 1500);
        }

        scheduleEditorForm.addEventListener('submit', submitScheduleEditor);
        notTeachingForm.addEventListener('submit', submitNotTeachingEditor);
        teacherProfileForm.addEventListener('submit', submitTeacherProfileEditor);
        [scheduleEditorDay, scheduleEditorSession, scheduleEditorPeriod, scheduleEditorClass].forEach(field => {
            field.addEventListener('input', resetScheduleConflictConfirmation);
            field.addEventListener('change', resetScheduleConflictConfirmation);
        });
        [scheduleEditorClass, scheduleEditorSubject, scheduleEditorPpct].forEach(field => {
            field.addEventListener('input', updateScheduleEditorMappingHint);
            field.addEventListener('change', updateScheduleEditorMappingHint);
        });
        $$('[data-close-modal]').forEach(button => {
            button.addEventListener('click', () => closeAppModal(document.getElementById(button.dataset.closeModal)));
        });
        [accountModal, teamAdminModal, scheduleEditorModal, notTeachingModal, workItemModal, teacherProfileModal].forEach(modal => {
            modal.addEventListener('mousedown', event => {
                if (event.target === modal) closeAppModal(modal);
            });
        });
        window.addEventListener('keydown', event => {
            const openModal = [teamAdminModal, accountModal, workItemModal, teacherProfileModal, notTeachingModal, scheduleEditorModal]
                .find(modal => modal && !modal.hidden);
            if (!openModal) return;
            if (event.key === 'Escape') closeAppModal(openModal);
            if (event.key === 'Tab') {
                const focusable = Array.from(openModal.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(item => !item.hidden && item.offsetParent !== null);
                if (focusable.length > 0) {
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            }
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                openModal.querySelector?.('form')?.requestSubmit?.();
            }
        });

        scheduleProfileBtn.addEventListener('click', editTeacherProfile);
        [progressWeekSelect, progressGradeSelect, progressClassSelect, progressSubjectSelect].forEach(select => {
            select.addEventListener('change', renderProgressDashboard);
        });
        refreshProgressDashboardBtn.addEventListener('click', () => {
            renderProgressDashboard();
            showToast('✅ Đã cập nhật bảng tiến độ', 'success');
        });
        exportProgressDashboardBtn.addEventListener('click', exportProgressDashboardExcel);
        progressDashboardTable.addEventListener('click', event => {
            const button = event.target.closest?.('button[data-progress-open-week]');
            if (button) openProgressDashboardWeek(button.dataset.progressOpenWeek);
        });
        addScheduleRowBtn.addEventListener('click', () => addScheduleItem(getSelectedScheduleWeek()));
        syncPlanScheduleBtn.addEventListener('click', () => openPlanScheduleSyncPreview(getSelectedScheduleWeek()));
        closePlanSyncBtn.addEventListener('click', closePlanSyncPanel);
        planSyncContent.addEventListener('change', event => {
            if (event.target.matches?.('input[data-plan-sync-item]')) updatePlanSyncSelectionState();
        });
        selectRecommendedSyncBtn.addEventListener('click', () => {
            const recommendedIds = new Set(
                (planSyncContext?.candidates || []).filter(candidate => candidate.recommended).map(candidate => candidate.itemId)
            );
            Array.from(planSyncContent.querySelectorAll('input[data-plan-sync-item]')).forEach(checkbox => {
                checkbox.checked = recommendedIds.has(checkbox.dataset.planSyncItem);
            });
            updatePlanSyncSelectionState();
        });
        selectAllSyncBtn.addEventListener('click', () => {
            Array.from(planSyncContent.querySelectorAll('input[data-plan-sync-item]')).forEach(checkbox => {
                checkbox.checked = true;
            });
            updatePlanSyncSelectionState();
        });
        applyPlanSyncBtn.addEventListener('click', applyPlanScheduleSync);
        undoScheduleEditBtn.addEventListener('click', () => undoScheduleEdit(getSelectedScheduleWeek()));
        validateScheduleBtn.addEventListener('click', () => openScheduleValidationPanel(getSelectedScheduleWeek()));
        closeScheduleValidationBtn.addEventListener('click', closeScheduleValidationPanel);
        rerunScheduleValidationBtn.addEventListener('click', () => openScheduleValidationPanel(getSelectedScheduleWeek(), false));
        finalizeValidatedWeekBtn.addEventListener('click', () => toggleScheduleFinal(
            scheduleValidationContext?.week || getSelectedScheduleWeek(), true
        ));
        scheduleValidationContent.addEventListener('click', event => {
            const button = event.target.closest?.('button[data-validation-item-id]');
            if (button) focusScheduleValidationIssue(button.dataset.validationItemId);
        });
        toggleScheduleFinalBtn.addEventListener('click', () => toggleScheduleFinal(getSelectedScheduleWeek()));
        exportScheduleExcelBtn.addEventListener('click', () => exportScheduleExcel(getSelectedScheduleWeek()));
        exportScheduleWordBtn.addEventListener('click', () => exportScheduleWord(getSelectedScheduleWeek()));
        printScheduleBtn.addEventListener('click', () => printSchedule(getSelectedScheduleWeek()));

        scheduleDisplay.addEventListener('click', event => {
            const button = event.target.closest('button[data-schedule-action][data-schedule-id]');
            if (!button) return;
            const week = getSelectedScheduleWeek();
            if (button.dataset.scheduleAction === 'edit') editScheduleItem(week, button.dataset.scheduleId);
            if (button.dataset.scheduleAction === 'toggle-not-teaching') {
                toggleScheduleNotTeaching(week, button.dataset.scheduleId);
            }
        });

        function populateWeekSelect() {
            const select = scheduleWeekSelect;
            select.innerHTML = '<option value="">-- Chọn tuần --</option>';
            for (const w of collectKnownWeeks()) {
                const opt = document.createElement('option');
                opt.value = w;
                opt.textContent = weekOptionLabel(w);
                select.appendChild(opt);
            }
            // Restore last selected
            const last = Number.parseInt(
                getActiveYearWorkspace()?.selectedTeachingWeek
                    || localStorage.getItem('teacher_selected_week'),
                10
            );
            if (last > 0 && select.querySelector(`option[value="${last}"]`)) {
                select.value = String(last);
            }

            const selectedWeek = Number.parseInt(select.value, 10);
            if (selectedWeek && state.teachingSchedule[selectedWeek]) {
                renderTeachingSchedule(selectedWeek);
                scheduleInfo.textContent = state.scheduleMeta[selectedWeek]?.stale
                    ? 'Lịch tuần ' + selectedWeek + ' cần tạo lại'
                    : 'Đã có lịch tuần ' + selectedWeek;
            } else {
                updateScheduleToolbar(selectedWeek || null);
            }
        }

        scheduleWeekSelect.addEventListener('change', () => {
            const week = Number.parseInt(scheduleWeekSelect.value, 10);
            if (!week) {
                updateScheduleToolbar(null);
                return;
            }
            localStorage.setItem('teacher_selected_week', String(week));
            const workspace = getActiveYearWorkspace();
            if (workspace) workspace.selectedTeachingWeek = week;
            persistActiveYearWorkspace();
            if (state.teachingSchedule[week]) {
                renderTeachingSchedule(week);
                scheduleInfo.textContent = state.scheduleMeta[week]?.stale
                    ? 'Lịch tuần ' + week + ' cần tạo lại'
                    : 'Đã có lịch tuần ' + week;
            } else {
                scheduleDisplay.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">Tuần này chưa có lịch báo giảng. Nhấn “Tạo lịch báo giảng” để bắt đầu.</p>';
                scheduleInfo.textContent = '';
                updateScheduleToolbar(week);
            }
        });

        generateScheduleBtn.addEventListener('click', async () => {
            const week = parseInt(scheduleWeekSelect.value);
            if (!week || week < 1) {
                showToast('⚠️ Vui lòng chọn tuần hợp lệ', 'error');
                return;
            }
            if (getScheduleMeta(week).status === 'final'
                && !confirm(`Tuần ${week} đã chốt. Tạo lại lịch sẽ chuyển tuần về bản nháp nhưng vẫn giữ các dòng đã sửa thủ công. Tiếp tục?`)) return;
            localStorage.setItem('teacher_selected_week', String(week));
            await generateTeachingSchedule(week);
        });

        function persistTeachingSchedule(week, schedule, sourceMode = 'gemini') {
            if (scheduleValidationContext?.week === week) closeScheduleValidationPanel();
            if (state.teachingSchedule[week]?.length) pushScheduleUndo(week);
            state.teachingSchedule[week] = mergeScheduleWithManualChanges(week, schedule);
            renumberStoredSchedulesFrom(week);
            const meta = getScheduleMeta(week);
            Object.assign(meta, {
                stale: false,
                staleReason: '',
                generatedAt: new Date().toISOString(),
                sourceMode,
                status: 'draft',
                finalizedAt: '',
                affectedScope: 'all',
                affectedSourceSlots: [],
            });
            persistTeachingScheduleState();
            renderTeachingSchedule(week);
            updateDataSafetySummary();
        }

        async function generateTeachingSchedule(week) {
            if (state.busy.schedule) {
                showToast('Lịch báo giảng đang được tạo, vui lòng chờ', 'info');
                return;
            }
            state.busy.schedule = true;
            generateScheduleBtn.disabled = true;
            const originalButtonText = generateScheduleBtn.textContent;
            generateScheduleBtn.textContent = 'Đang tạo...';
            scheduleDisplay.innerHTML = '<div class="text-center"><span class="loading-spinner"></span> Đang tạo lịch báo giảng...</div>';
            scheduleInfo.textContent = 'Đang xử lý...';
            let fallbackTimetable = null;
            let fallbackCurriculumMap = [];

            try {
                // Get timetable
                const tt = state.timetablesByWeek[week] || null;
                const ttLessonCount = tt?.sessions
                    ?.flatMap(session => session.periods || [])
                    .reduce((total, period) => total + (period.cells?.length || 0), 0) || 0;
                if (!tt || ttLessonCount === 0) {
                    scheduleDisplay.innerHTML = `
                <div class="card" style="background:#fef2f2;border:1px solid #fecaca;">
                  <p style="color:#991b1b;">⚠️ Chưa có thời khóa biểu tuần ${week}. Hãy chọn tuần ${week} ở mục Thời khóa biểu để tải ảnh hoặc giữ nguyên tuần trước.</p>
                </div>
              `;
                    scheduleInfo.textContent = 'Thiếu dữ liệu TKB';
                    return;
                }
                fallbackTimetable = tt;

                // Ghép phân phối theo từng lớp: lớp cụ thể > khối > dữ liệu dùng chung.
                const curriculumMap = buildCurriculumMapForTimetable(week, tt);
                fallbackCurriculumMap = curriculumMap;
                renderCurriculumMatchSummary(week);

                // Get plan for this week
                const plan = state.planData.find(p => p.week === week);
                const planContent = plan ? JSON.stringify(plan, null, 2) : '';

                if (state.recognitionMode === 'offline' || !hasUsableGeminiKey() || isGeminiDailyBlocked()) {
                    const fallbackSchedule = generateFallbackSchedule(week, tt, curriculumMap);
                    if (fallbackSchedule.length === 0) throw new Error('Không có tiết học phù hợp để tạo lịch');
                    persistTeachingSchedule(week, fallbackSchedule, 'local');
                    scheduleInfo.textContent = 'Đã tạo lịch trên máy cho tuần ' + week;
                    setRecognitionRuntime('Tạo lịch không dùng API', 'offline');
                    showToast('✅ Đã tạo lịch báo giảng không dùng Gemini', 'success');
                    return;
                }

                // Build the schedule using Gemini
                const prompt = `
              Bạn là trợ lý giáo dục. Tạo lịch báo giảng cho tuần ${week} dựa trên:
              
              THỜI KHÓA BIỂU CẢ TUẦN (hai buổi, Thứ 2 đến Thứ 7):
              ${JSON.stringify(tt, null, 2)}
              
              PHÂN PHỐI CHƯƠNG TRÌNH ĐÃ GHÉP RIÊNG CHO TỪNG LỚP ở tuần ${week}:
              ${JSON.stringify(curriculumMap, null, 2)}
              
              KẾ HOẠCH NHÀ TRƯỜNG tuần ${week}:
              ${planContent || 'Không có'}
              
              Hãy tạo lịch báo giảng chi tiết cho MỌI ô có tiết học trong thời khóa biểu.
              - period là Tiết TKB: sao chép chính xác day, session, class, period và subject từ thời khóa biểu; không đổi vị trí tiết.
              - day dùng dạng "Thứ 2" đến "Thứ 7"; session dùng "Buổi sáng" hoặc "Buổi chiều".
              - Với mỗi ô, topic chỉ được lấy từ đúng phần tử có className trùng lớp trong danh sách phân phối đã ghép; không dùng bài của lớp hoặc khối khác.
              - ppctPeriod là Tiết PPCT, hoàn toàn khác period. Tên bài phải tra bằng ppctPeriod; tuyệt đối không dùng period (Tiết TKB) để chọn tên bài.
              - Với mỗi lớp, ppctPeriod bắt đầu bằng ppctStart rồi tăng 1 theo thứ tự các tiết học của lớp trong tuần.
              - Nếu topics của lớp đang trống, ghi "Chưa có phân phối tuần ${week} cho lớp [tên lớp]"; note ghi ảnh hưởng liên quan trong kế hoạch nhà trường nếu có.
              Nếu thiếu thông tin khác, điền "—" hoặc "Chưa xác định".
              Chỉ trả JSON đúng lược đồ.
              `;

                const text = await geminiGenerate([{ text: prompt }], {
                    schema: TEACHING_SCHEDULE_SCHEMA,
                    thinkingLevel: 'high',
                    timeoutMs: 120000,
                    onRateLimit: stage => {
                        scheduleInfo.textContent = stage;
                    },
                });
                const json = parseAIJson(text);

                if (json && json.schedule && Array.isArray(json.schedule)) {
                    const normalized = json.schedule.map(item => ({
                        day: normalizeDayName(item?.day),
                        session: normalizeSessionLabel(item?.session),
                        class: String(item?.class || '').trim(),
                        period: String(item?.period || '').trim(),
                        ppctPeriod: String(item?.ppctPeriod || '').trim(),
                        subject: String(item?.subject || '').trim(),
                        topic: String(item?.topic || '').trim(),
                        note: String(item?.note || '').trim(),
                    })).filter(item => item.class && item.subject);
                    persistTeachingSchedule(week, reconcileGeneratedSchedule(week, tt, normalized, curriculumMap), 'gemini');
                    scheduleInfo.textContent = 'Đã tạo lịch tuần ' + week;
                    showToast('✅ Đã tạo lịch báo giảng tuần ' + week, 'success');
                } else {
                    // fallback: generate from timetable + curriculum
                    const fallbackSchedule = generateFallbackSchedule(week, tt, curriculumMap);
                    if (fallbackSchedule.length === 0) throw new Error('Không có tiết học phù hợp để tạo lịch');
                    persistTeachingSchedule(week, fallbackSchedule, 'local-fallback');
                    scheduleInfo.textContent = 'Đã tạo lịch dự phòng tuần ' + week;
                    showToast('✅ Đã tạo lịch báo giảng (dự phòng) tuần ' + week, 'info');
                }
            } catch (err) {
                console.error(err);
                if (err.isDailyQuota) {
                    state.dailyQuotaBlocked = true;
                    sessionStorage.setItem('gemini_daily_quota_blocked', '1');
                }
                const fallbackSchedule = fallbackTimetable
                    ? generateFallbackSchedule(week, fallbackTimetable, fallbackCurriculumMap)
                    : [];
                if (fallbackSchedule.length > 0 && shouldUseOfflineFallback(err)) {
                    persistTeachingSchedule(week, fallbackSchedule, 'local-fallback');
                    scheduleInfo.textContent = 'Gemini không dùng được · đã tạo lịch dự phòng tuần ' + week;
                    setRecognitionRuntime(err.isQuota ? 'Gemini hết quota · lịch dự phòng' : 'Lịch dự phòng trên máy', 'offline');
                    showToast('✅ Gemini không dùng được; đã tạo lịch báo giảng dự phòng', 'info');
                } else {
                    scheduleDisplay.innerHTML = `
              <div class="card" style="background:#fef2f2;border:1px solid #fecaca;">
                <p style="color:#991b1b;">❌ Lỗi: ${escapeHTML(err.message)}</p>
              </div>
            `;
                    scheduleInfo.textContent = 'Lỗi: ' + err.message;
                    showToast('❌ Lỗi: ' + err.message, 'error');
                }
            } finally {
                state.busy.schedule = false;
                generateScheduleBtn.disabled = false;
                generateScheduleBtn.textContent = originalButtonText;
            }
        }

        function findCurriculumMapEntry(curriculumMap, className, subject) {
            const classKey = normalizeClassKey(className);
            const subjectKey = normalizeLookupText(subject);
            return (curriculumMap || []).find(item =>
                normalizeClassKey(item.className) === classKey
                && normalizeLookupText(item.subject) === subjectKey
            ) || (curriculumMap || []).find(item => normalizeClassKey(item.className) === classKey) || null;
        }

        function generateFallbackSchedule(week, tt, curriculumMap) {
            const slots = [];
            for (const session of tt.sessions || []) {
                for (const period of session.periods || []) {
                    for (const cell of period.cells || []) {
                        const className = cell.className || 'Chưa xác định';
                        const subject = cell.subject || cell.content || '—';
                        slots.push({
                            day: cell.day,
                            session: normalizeSessionLabel(session.label),
                            class: className,
                            period: String(period.period),
                            subject,
                        });
                    }
                }
            }
            const sessionOrder = { 'Buổi sáng': 0, 'Buổi chiều': 1 };
            slots.sort((a, b) => {
                const dayDiff = SCHOOL_DAYS.indexOf(a.day) - SCHOOL_DAYS.indexOf(b.day);
                if (dayDiff) return dayDiff;
                const sessionDiff = (sessionOrder[a.session] ?? 9) - (sessionOrder[b.session] ?? 9);
                if (sessionDiff) return sessionDiff;
                return (Number.parseInt(a.period, 10) || 0) - (Number.parseInt(b.period, 10) || 0);
            });
            const occurrenceByClass = new Map();
            const curriculumLessonCache = new Map();
            return slots.map(slot => {
                const curriculum = findCurriculumMapEntry(curriculumMap, slot.class, slot.subject);
                const occurrenceKey = `${normalizeClassKey(slot.class)}|${normalizeLookupText(slot.subject)}`;
                const occurrence = occurrenceByClass.get(occurrenceKey) || 0;
                occurrenceByClass.set(occurrenceKey, occurrence + 1);
                const ppctPeriod = String((Number.parseInt(curriculum?.ppctStart, 10) || 1) + occurrence);
                const exactLesson = getCurriculumLessonByPpct(
                    slot.class, slot.subject, ppctPeriod, curriculumLessonCache
                );
                return {
                    ...slot,
                    ppctPeriod,
                    topic: cleanText(exactLesson?.topic)
                        || `⚠️ Chưa có ánh xạ Tiết PPCT ${ppctPeriod} → Tên bài trong bộ phân phối`,
                    note: '',
                    curriculumSource: exactLesson?.sourceLabel || curriculum?.sourceLabel || 'Chưa có phân phối',
                    curriculumProfileId: exactLesson?.profileId || curriculum?.profileId || '',
                };
            });
        }

        function reconcileGeneratedSchedule(week, tt, generated, curriculumMap) {
            const exactSlots = generateFallbackSchedule(week, tt, curriculumMap);
            return exactSlots.map(slot => {
                const match = generated.find(item =>
                    normalizeDayName(item.day) === slot.day
                    && normalizeSessionLabel(item.session) === slot.session
                    && String(item.period) === String(slot.period)
                    && cleanText(item.class).toLowerCase() === cleanText(slot.class).toLowerCase()
                );
                return {
                    ...slot,
                    ppctPeriod: cleanText(slot.ppctPeriod),
                    // Tên bài chỉ lấy từ ánh xạ Tiết PPCT đã kiểm chứng, không lấy theo Tiết TKB do AI suy đoán.
                    topic: slot.topic,
                    note: cleanText(match?.note),
                };
            });
        }

        function renderTeachingSchedule(week) {
            updateDataSafetySummary();
            const data = state.teachingSchedule[week];
            if (!data || data.length === 0) {
                scheduleDisplay.innerHTML = `
              <div class="card" style="background:#fef9e7;border:1px solid #fde68a;">
                <p style="color:#92400e;">⚠️ Không có dữ liệu lịch báo giảng cho tuần này.</p>
              </div>
            `;
                updateScheduleToolbar(week);
                renderProgressDashboard();
                return;
            }

            const meta = getScheduleMeta(week);
            let html = meta.stale
                ? `<div class="stale-warning">⚠️ Lịch này được tạo từ dữ liệu cũ. ${escapeHTML(meta.staleReason || 'Nguồn dữ liệu đã thay đổi')}. ${meta.affectedScope === 'slots' ? 'Các dòng bị ảnh hưởng đã được tô đỏ.' : ''} Hãy nhấn “Tạo lịch báo giảng” để cập nhật.</div>`
                : '';
            if (meta.status === 'final') {
                html += `<div class="finalized-note"><span>🔒</span><div><strong>Tuần ${week} đã được chốt.</strong> Nội dung đang khóa để tránh sửa nhầm. Nhấn “Mở lại tuần” nếu cần điều chỉnh.</div></div>`;
            }
            if (String(meta.sourceMode || '').startsWith('local')) {
                html += `<div class="recognition-note"><span>🖥️</span><div><strong>Lịch dự phòng không dùng Gemini.</strong> Thứ, buổi, Tiết TKB, lớp và môn được lấy trực tiếp từ thời khóa biểu; tên bài được tra riêng bằng Tiết PPCT.</div></div>`;
            }
            html += `<div class="table-wrap"><table class="schedule-table">`;
            html += `<thead><tr><th>Thứ</th><th>Buổi</th><th>Tiết TKB</th><th>Tiết PPCT</th><th>Lớp</th><th>Môn</th><th>Bài dạy / Chủ đề</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>`;

            const sortedItems = getSortedScheduleItems(data);
            for (const item of sortedItems) {
                const isAffected = meta.stale && meta.affectedScope === 'slots'
                    && meta.affectedSourceSlots.includes(item.sourceSlotKey);
                const rowClass = item.notTeaching ? 'not-teaching-row'
                    : isAffected ? 'affected-row'
                    : item.manualAdded ? 'manual-added-row' : item.manualEdited ? 'manual-row' : '';
                const manualMark = item.makeupLesson
                    ? '<span class="makeup-mark">🔁 Tiết học bù</span>'
                    : item.manualAdded
                        ? '<span class="manual-mark">＋ Thêm thủ công</span>'
                    : item.manualEdited ? '<span class="manual-mark">✏️ Đã sửa thủ công</span>' : '';
                const affectedMark = isAffected ? '<span class="affected-mark">⚠️ Nguồn tiết đã thay đổi</span>' : '';
                const curriculumMark = item.curriculumSource
                    ? `<span class="curriculum-source-mark">📚 ${escapeHTML(item.curriculumSource)}</span>` : '';
                const topicContent = item.notTeaching
                    ? `<strong>Không học</strong>${item.notTeachingReason ? ` — ${escapeHTML(item.notTeachingReason)}` : ''}
                       <span class="not-teaching-mark">Không tính Tiết PPCT</span>
                       ${item.topic ? `<div style="font-size:11px;margin-top:3px;">Bài dự kiến: ${escapeHTML(item.topic)}</div>` : ''}`
                    : `${escapeHTML(item.topic || '—')}${curriculumMark}${manualMark}${affectedMark}`;
                html += `<tr class="${rowClass}" data-schedule-row-id="${escapeHTML(item.id)}">`;
                html += `<td style="font-weight:700;white-space:nowrap;">${escapeHTML(item.day || '—')}</td>`;
                html += `<td style="white-space:nowrap;">${escapeHTML(item.session || '—')}</td>`;
                html += `<td class="text-center">${escapeHTML(item.period || '—')}</td>`;
                html += `<td class="text-center" style="font-weight:700;color:#7c3aed;">${escapeHTML(item.ppctPeriod || '—')}</td>`;
                html += `<td style="font-weight:700;">${escapeHTML(item.class || '—')}</td>`;
                html += `<td><span class="lesson-cell">${escapeHTML(item.subject || '—')}</span></td>`;
                html += `<td>${topicContent}</td>`;
                html += `<td>${escapeHTML(item.note || '')}</td>`;
                html += `<td><div class="schedule-row-actions">${meta.status === 'final'
                    ? '<span title="Tuần đã chốt">🔒</span>'
                    : `<button class="btn btn-outline btn-sm" type="button" style="color:#1e3a5f;border-color:#94a3b8;"
                               data-schedule-action="edit" data-schedule-id="${escapeHTML(item.id)}" aria-label="Sửa tiết học">✏️</button>
                       <button class="btn ${item.notTeaching ? 'btn-outline' : 'btn-danger'} btn-sm" type="button"
                               data-schedule-action="toggle-not-teaching" data-schedule-id="${escapeHTML(item.id)}"
                               aria-label="${item.notTeaching ? 'Khôi phục tiết học' : 'Đánh dấu không học'}">${item.notTeaching ? '↩️ Học lại' : '🚫 Không học'}</button>`}
                    </div></td>`;
                html += `</tr>`;
            }
            html += `</tbody></table></div>`;
            scheduleDisplay.innerHTML = html;
            scheduleInfo.textContent = meta.stale
                ? `Lịch tuần ${week} cần cập nhật`
                : meta.status === 'final' ? `Tuần ${week} đã chốt` : `Tuần ${week} đang là bản nháp`;
            updateScheduleToolbar(week);
            renderProgressDashboard();
        }
