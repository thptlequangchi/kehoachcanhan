        // ================================================================
        //  DATA BACKUP & RESTORE
        // ================================================================
        function createBackupPayload() {
            captureActiveYearWorkspace();
            return {
                format: BACKUP_FORMAT,
                version: BACKUP_VERSION,
                exportedAt: new Date().toISOString(),
                security: {
                    apiKeyIncluded: false,
                    recognitionCacheIncluded: false,
                },
                data: {
                    selectedAcademicYear: state.selectedAcademicYear,
                    yearWorkspaces: state.yearWorkspaces,
                    planData: state.planData,
                    timetablesByWeek: state.timetablesByWeek,
                    selectedTimetableWeek: state.selectedTimetableWeek,
                    curriculumText: state.curriculumText,
                    curriculumProfiles: state.curriculumProfiles,
                    teachingSchedule: state.teachingSchedule,
                    scheduleMeta: state.scheduleMeta,
                    teacherProfile: state.teacherProfile,
                    selectedTeachingWeek: Number.parseInt(localStorage.getItem('teacher_selected_week'), 10) || null,
                    recognitionMode: state.recognitionMode,
                },
            };
        }

        function normalizeBackupPayload(payload) {
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                throw new Error('File sao lưu không có cấu trúc hợp lệ');
            }
            if (payload.format !== BACKUP_FORMAT) {
                throw new Error('Đây không phải file sao lưu của Sổ Tay Giáo Viên');
            }
            const version = Number.parseInt(payload.version, 10);
            if (!(version > 0) || version > BACKUP_VERSION) {
                throw new Error('Phiên bản file sao lưu chưa được trang web này hỗ trợ');
            }
            const data = payload.data;
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('File sao lưu thiếu phần dữ liệu chính');
            }

            const planData = Array.isArray(data.planData)
                ? data.planData.map(normalizePlanWeek).filter(Boolean).sort((a, b) => a.week - b.week)
                : [];
            const rawTimetables = data.timetablesByWeek && typeof data.timetablesByWeek === 'object' && !Array.isArray(data.timetablesByWeek)
                ? data.timetablesByWeek
                : {};
            const timetablesByWeek = Object.fromEntries(
                Object.entries(rawTimetables)
                    .map(([week, timetable]) => [Number.parseInt(week, 10), normalizeTimetable(timetable)])
                    .filter(([week, timetable]) => week > 0 && week <= MAX_SCHOOL_WEEKS && timetable)
                    .map(([week, timetable]) => [String(week), { ...timetable, week }])
            );
            const timetableWeeks = Object.keys(timetablesByWeek).map(Number).sort((a, b) => a - b);
            const requestedTimetableWeek = Number.parseInt(data.selectedTimetableWeek, 10);
            const selectedTimetableWeek = requestedTimetableWeek > 0 && requestedTimetableWeek <= MAX_SCHOOL_WEEKS
                ? requestedTimetableWeek
                : timetableWeeks[0] || planData[0]?.week || 1;
            const curriculumText = typeof data.curriculumText === 'string'
                ? data.curriculumText
                : Array.isArray(data.curriculumText) ? JSON.stringify(data.curriculumText) : '';
            const curriculumProfiles = normalizeCurriculumProfiles(
                data.curriculumProfiles,
                typeof data.curriculumProfiles === 'undefined' ? curriculumText : ''
            );
            const recognitionMode = RECOGNITION_MODES.includes(data.recognitionMode) ? data.recognitionMode : 'auto';
            const selectedTeachingWeek = Number.parseInt(data.selectedTeachingWeek, 10);
            const teacherProfile = normalizeTeacherProfile(data.teacherProfile);
            const selectedAcademicYear = normalizeAcademicYear(data.selectedAcademicYear)
                || teacherProfile.academicYear;
            const yearWorkspaces = {};
            if (data.yearWorkspaces && typeof data.yearWorkspaces === 'object' && !Array.isArray(data.yearWorkspaces)) {
                Object.entries(data.yearWorkspaces).forEach(([academicYear, workspace]) => {
                    const normalizedYear = normalizeAcademicYear(academicYear);
                    if (normalizedYear) yearWorkspaces[normalizedYear] = normalizeYearWorkspace(workspace);
                });
            }
            const savedSelectedWorkspace = yearWorkspaces[selectedAcademicYear];
            yearWorkspaces[selectedAcademicYear] = normalizeYearWorkspace({
                ...(savedSelectedWorkspace || {}),
                planData,
                timetablesByWeek,
                selectedTimetableWeek,
                curriculumText,
                curriculumProfiles,
                teachingSchedule: normalizeTeachingScheduleBackup(data.teachingSchedule),
                scheduleMeta: normalizeScheduleMetaBackup(data.scheduleMeta),
                selectedTeachingWeek: selectedTeachingWeek > 0 && selectedTeachingWeek <= MAX_SCHOOL_WEEKS
                    ? selectedTeachingWeek : savedSelectedWorkspace?.selectedTeachingWeek || null,
            });
            teacherProfile.academicYear = selectedAcademicYear;

            return {
                format: BACKUP_FORMAT,
                version,
                exportedAt: cleanText(payload.exportedAt),
                data: {
                    selectedAcademicYear,
                    yearWorkspaces,
                    planData,
                    timetablesByWeek,
                    selectedTimetableWeek,
                    curriculumText,
                    curriculumProfiles,
                    teachingSchedule: normalizeTeachingScheduleBackup(data.teachingSchedule),
                    scheduleMeta: normalizeScheduleMetaBackup(data.scheduleMeta),
                    teacherProfile,
                    selectedTeachingWeek: selectedTeachingWeek > 0 && selectedTeachingWeek <= MAX_SCHOOL_WEEKS ? selectedTeachingWeek : null,
                    recognitionMode,
                },
            };
        }

        function backupDataCounts(payload = createBackupPayload()) {
            const data = payload.data || {};
            const workspaces = data.yearWorkspaces && typeof data.yearWorkspaces === 'object'
                && !Array.isArray(data.yearWorkspaces)
                ? Object.values(data.yearWorkspaces)
                : [data];
            return {
                years: workspaces.length,
                plans: workspaces.reduce((sum, workspace) => sum + (Array.isArray(workspace.planData) ? workspace.planData.length : 0), 0),
                timetables: workspaces.reduce((sum, workspace) => sum + (
                    workspace.timetablesByWeek && typeof workspace.timetablesByWeek === 'object'
                        ? Object.keys(workspace.timetablesByWeek).length : 0
                ), 0),
                schedules: workspaces.reduce((sum, workspace) => sum + (
                    workspace.teachingSchedule && typeof workspace.teachingSchedule === 'object'
                        ? Object.keys(workspace.teachingSchedule).filter(week =>
                            Array.isArray(workspace.teachingSchedule[week]) && workspace.teachingSchedule[week].length > 0
                        ).length : 0
                ), 0),
                curriculum: workspaces.reduce((sum, workspace) => sum + (
                    Array.isArray(workspace.curriculumProfiles)
                        ? workspace.curriculumProfiles.length
                        : Boolean(cleanText(workspace.curriculumText)) ? 1 : 0
                ), 0),
                workItems: workspaces.reduce((sum, workspace) => sum + (
                    Array.isArray(workspace.workItems) ? workspace.workItems.length : 0
                ), 0),
            };
        }

        function updateDataSafetySummary() {
            const counts = backupDataCounts();
            dataSafetySummary.textContent = `${counts.years} năm học · ${counts.plans} tuần kế hoạch · ${counts.timetables} tuần TKB · ${counts.schedules} tuần lịch báo giảng${counts.curriculum ? ` · ${counts.curriculum} bộ phân phối` : ''}${counts.workItems ? ` · ${counts.workItems} mục công việc` : ''}. File sao lưu không chứa API key.`;
            undoRestoreBtn.hidden = !localStorage.getItem(PRE_RESTORE_BACKUP_KEY);
            exportPreCloudBackupBtn.hidden = !localStorage.getItem(PRE_CLOUD_SYNC_BACKUP_KEY);
        }

        function persistCoreState() {
            let success = true;
            success = writeStoredJSON(YEAR_WORKSPACES_STORAGE, state.yearWorkspaces) && success;
            success = writeStoredJSON('teacher_plan_data', state.planData) && success;
            success = writeStoredJSON('teacher_timetables_by_week', state.timetablesByWeek) && success;
            success = writeStoredJSON('teacher_teaching_schedule', state.teachingSchedule) && success;
            success = writeStoredJSON('teacher_schedule_meta', state.scheduleMeta) && success;
            success = writeStoredJSON('teacher_profile', state.teacherProfile) && success;
            success = writeStoredJSON(CURRICULUM_PROFILES_STORAGE, { version: 2, profiles: state.curriculumProfiles }) && success;
            try {
                localStorage.setItem('teacher_curriculum_text', state.curriculumText || '');
                localStorage.setItem(SELECTED_ACADEMIC_YEAR_STORAGE, state.selectedAcademicYear);
                localStorage.setItem('teacher_timetable_selected_week', String(state.selectedTimetableWeek));
                localStorage.setItem('teacher_recognition_mode', state.recognitionMode);
                if (state.timetableData) localStorage.setItem('teacher_timetable_data', JSON.stringify(state.timetableData));
                else localStorage.removeItem('teacher_timetable_data');
            } catch (error) {
                console.error('Không thể lưu toàn bộ dữ liệu khôi phục:', error);
                success = false;
            }
            return success;
        }

        function assignBackupData(payload) {
            const data = payload.data;
            state.selectedAcademicYear = normalizeAcademicYear(data.selectedAcademicYear)
                || normalizeTeacherProfile(data.teacherProfile).academicYear;
            state.yearWorkspaces = {};
            Object.entries(data.yearWorkspaces || {}).forEach(([academicYear, workspace]) => {
                const normalizedYear = normalizeAcademicYear(academicYear);
                if (normalizedYear) state.yearWorkspaces[normalizedYear] = normalizeYearWorkspace(workspace);
            });
            const workspace = state.yearWorkspaces[state.selectedAcademicYear]
                || normalizeYearWorkspace(data);
            state.yearWorkspaces[state.selectedAcademicYear] = workspace;
            state.planData = workspace.planData;
            state.timetablesByWeek = workspace.timetablesByWeek;
            state.selectedTimetableWeek = workspace.selectedTimetableWeek;
            state.timetableData = state.timetablesByWeek[state.selectedTimetableWeek] || null;
            state.curriculumText = workspace.curriculumText;
            state.curriculumProfiles = workspace.curriculumProfiles;
            state.teachingSchedule = workspace.teachingSchedule;
            state.scheduleMeta = workspace.scheduleMeta;
            state.workItems = workspace.workItems;
            state.teacherProfile = normalizeTeacherProfile(data.teacherProfile);
            state.teacherProfile.academicYear = state.selectedAcademicYear;
            state.recognitionMode = data.recognitionMode;
        }

        function refreshViewsAfterRestore(payload) {
            timetableDiffOpen = false;
            recognitionModeSelect.value = state.recognitionMode;
            updateRecognitionModeHelp();
            syncPlanDatesForActiveYear();
            populateAcademicYearSelect(state.selectedAcademicYear);
            updateSchoolYearWeekInfo();
            renderPlanTable();
            populateTimetableWeekSelect();
            activateTimetableWeek(state.selectedTimetableWeek, true);
            renderCurriculumProfiles();
            populateWeekSelect();

            const teachingWeek = getActiveYearWorkspace()?.selectedTeachingWeek
                || payload.data.selectedTeachingWeek;
            if (teachingWeek && scheduleWeekSelect.querySelector(`option[value="${teachingWeek}"]`)) {
                scheduleWeekSelect.value = String(teachingWeek);
                localStorage.setItem('teacher_selected_week', String(teachingWeek));
                if (state.teachingSchedule[teachingWeek]?.length) {
                    renderTeachingSchedule(teachingWeek);
                    scheduleInfo.textContent = state.scheduleMeta[teachingWeek]?.stale
                        ? `Lịch tuần ${teachingWeek} cần tạo lại`
                        : `Đã có lịch tuần ${teachingWeek}`;
                } else {
                    scheduleDisplay.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">Tuần này chưa có lịch báo giảng.</p>';
                    scheduleInfo.textContent = '';
                }
            } else {
                scheduleWeekSelect.value = '';
                localStorage.removeItem('teacher_selected_week');
                scheduleDisplay.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">Chọn tuần và nhấn “Tạo lịch báo giảng”</p>';
                scheduleInfo.textContent = '';
            }
            updateDataSafetySummary();
            renderWorkWorkspace();
            if (typeof renderYearDashboard === 'function') renderYearDashboard();
        }

        function applyBackupPayload(payload) {
            const rollback = normalizeBackupPayload(createBackupPayload());
            assignBackupData(payload);
            repairExistingMakeupLessonSequences();
            renumberStoredSchedulesFrom(1);
            if (!persistCoreState()) {
                assignBackupData(rollback);
                persistCoreState();
                throw new Error('Bộ nhớ trình duyệt không đủ; dữ liệu cũ đã được phục hồi');
            }
            refreshViewsAfterRestore(payload);
        }

        exportBackupBtn.addEventListener('click', () => {
            try {
                const payload = createBackupPayload();
                const json = JSON.stringify(payload, null, 2);
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const date = new Date().toISOString().slice(0, 10);
                link.href = url;
                link.download = `so-tay-giao-vien-sao-luu-${date}.json`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                const counts = backupDataCounts(payload);
                showToast(`✅ Đã sao lưu ${counts.years} năm học, ${counts.plans} tuần kế hoạch, ${counts.timetables} tuần TKB và ${counts.schedules} tuần lịch báo giảng`, 'success');
            } catch (error) {
                showToast('❌ Không thể tạo file sao lưu: ' + error.message, 'error');
            }
        });

        exportPreCloudBackupBtn.addEventListener('click', () => {
            try {
                const raw = localStorage.getItem(PRE_CLOUD_SYNC_BACKUP_KEY);
                if (!raw) throw new Error('Không còn bản sao trước đồng bộ');
                const payload = normalizeBackupPayload(JSON.parse(raw));
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'so-tay-giao-vien-truoc-dong-bo-firebase.json';
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showToast('✅ Đã tải bản sao dữ liệu trước lần đồng bộ Firebase đầu tiên', 'success');
            } catch (error) {
                showToast('❌ ' + error.message, 'error');
            }
        });

        restoreBackupBtn.addEventListener('click', () => restoreBackupInput.click());

        restoreBackupInput.addEventListener('change', async () => {
            const file = restoreBackupInput.files?.[0];
            restoreBackupInput.value = '';
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.json')) {
                showToast('⚠️ Vui lòng chọn file sao lưu định dạng JSON', 'error');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast('⚠️ File sao lưu vượt quá 10 MB', 'error');
                return;
            }

            try {
                const parsed = JSON.parse(await file.text());
                const normalized = normalizeBackupPayload(parsed);
                const counts = backupDataCounts(normalized);
                const description = `${counts.years} năm học, ${counts.plans} tuần kế hoạch, ${counts.timetables} tuần TKB, ${counts.schedules} tuần lịch báo giảng`;
                if (!confirm(`Khôi phục ${description} từ file “${file.name}”?\n\nDữ liệu hiện tại sẽ được thay thế. API key vẫn được giữ nguyên.`)) return;

                localStorage.removeItem(PRE_RESTORE_BACKUP_KEY);
                const checkpointSaved = writeStoredJSON(PRE_RESTORE_BACKUP_KEY, createBackupPayload());
                if (!checkpointSaved) {
                    localStorage.removeItem(PRE_RESTORE_BACKUP_KEY);
                    if (!confirm('Không thể tạo điểm hoàn tác do bộ nhớ trình duyệt hạn chế. Vẫn tiếp tục khôi phục?')) return;
                }
                applyBackupPayload(normalized);
                updateDataSafetySummary();
                showToast(`✅ Đã khôi phục ${description}`, 'success');
            } catch (error) {
                console.error(error);
                showToast('❌ Không thể khôi phục: ' + error.message, 'error');
            }
        });

        undoRestoreBtn.addEventListener('click', () => {
            const raw = localStorage.getItem(PRE_RESTORE_BACKUP_KEY);
            if (!raw) {
                updateDataSafetySummary();
                showToast('Không còn điểm hoàn tác khôi phục', 'info');
                return;
            }
            if (!confirm('Hoàn tác lần khôi phục gần nhất và quay về dữ liệu trước đó?')) return;
            try {
                const checkpoint = normalizeBackupPayload(JSON.parse(raw));
                applyBackupPayload(checkpoint);
                localStorage.removeItem(PRE_RESTORE_BACKUP_KEY);
                updateDataSafetySummary();
                showToast('✅ Đã hoàn tác lần khôi phục gần nhất', 'success');
            } catch (error) {
                console.error(error);
                showToast('❌ Không thể hoàn tác: ' + error.message, 'error');
            }
        });
