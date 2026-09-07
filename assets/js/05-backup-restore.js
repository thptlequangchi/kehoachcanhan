        // ================================================================
        //  DATA BACKUP & RESTORE
        // ================================================================
        const SECURE_BACKUP_FORMAT = 'teacher-notebook-encrypted-backup';
        const SECURE_BACKUP_VERSION = 1;
        const SECURE_BACKUP_ITERATIONS = 210000;

        function secureBackupBytesToBase64(bytes) {
            let binary = '';
            const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            for (let index = 0; index < source.length; index += 0x8000) {
                binary += String.fromCharCode(...source.subarray(index, Math.min(index + 0x8000, source.length)));
            }
            return btoa(binary);
        }

        function secureBackupBase64ToBytes(value) {
            const binary = atob(String(value || ''));
            return Uint8Array.from(binary, char => char.charCodeAt(0));
        }

        async function secureBackupDeriveKey(password, salt, usages) {
            if (!globalThis.crypto?.subtle) throw new Error('Trình duyệt này chưa hỗ trợ Web Crypto để mã hóa sao lưu');
            const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
            return crypto.subtle.deriveKey(
                { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: SECURE_BACKUP_ITERATIONS },
                material,
                { name: 'AES-GCM', length: 256 },
                false,
                usages
            );
        }

        async function secureBackupEncryptPayload(payload, password) {
            if (String(password || '').length < 6) throw new Error('Mật khẩu sao lưu cần ít nhất 6 ký tự');
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await secureBackupDeriveKey(password, salt, ['encrypt']);
            const plaintext = new TextEncoder().encode(JSON.stringify(payload));
            const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
            return {
                format: SECURE_BACKUP_FORMAT,
                version: SECURE_BACKUP_VERSION,
                appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '',
                createdAt: new Date().toISOString(),
                encryption: { algorithm: 'AES-GCM', keyLength: 256, kdf: 'PBKDF2-SHA256', iterations: SECURE_BACKUP_ITERATIONS },
                salt: secureBackupBytesToBase64(salt),
                iv: secureBackupBytesToBase64(iv),
                ciphertext: secureBackupBytesToBase64(new Uint8Array(cipher)),
            };
        }

        async function secureBackupDecryptWrapper(wrapper, password) {
            if (!wrapper || wrapper.format !== SECURE_BACKUP_FORMAT) throw new Error('File không phải bản sao lưu mã hóa hợp lệ');
            if (Number(wrapper.version) !== SECURE_BACKUP_VERSION) throw new Error('Phiên bản sao lưu mã hóa chưa được hỗ trợ');
            if (!password) throw new Error('Cần mật khẩu để mở bản sao lưu');
            try {
                const salt = secureBackupBase64ToBytes(wrapper.salt);
                const iv = secureBackupBase64ToBytes(wrapper.iv);
                const cipher = secureBackupBase64ToBytes(wrapper.ciphertext);
                const key = await secureBackupDeriveKey(password, salt, ['decrypt']);
                const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
                return JSON.parse(new TextDecoder().decode(plain));
            } catch (error) {
                throw new Error('Mật khẩu không đúng hoặc file sao lưu đã bị thay đổi');
            }
        }
        function createBackupPayload() {
            captureActiveYearWorkspace();
            return {
                format: BACKUP_FORMAT,
                version: BACKUP_VERSION,
                exportedAt: new Date().toISOString(),
                appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '',
                dataSchemaVersion: typeof DATA_SCHEMA_VERSION !== 'undefined' ? DATA_SCHEMA_VERSION : null,
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
                    gradebook: state.gradebook,
                    homeroom: state.homeroom,
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
                gradebook: normalizeGradebookWorkspace(data.gradebook ?? savedSelectedWorkspace?.gradebook),
                homeroom: normalizeHomeroomWorkspace(data.homeroom ?? savedSelectedWorkspace?.homeroom),
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
                    gradebook: normalizeGradebookWorkspace(data.gradebook ?? yearWorkspaces[selectedAcademicYear]?.gradebook),
                    homeroom: normalizeHomeroomWorkspace(data.homeroom ?? yearWorkspaces[selectedAcademicYear]?.homeroom),
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
                gradebooks: workspaces.reduce((sum, workspace) => sum + (
                    workspace.gradebook?.books && typeof workspace.gradebook.books === 'object'
                        ? Object.keys(workspace.gradebook.books).length : 0
                ), 0),
                gradebookStudents: workspaces.reduce((sum, workspace) => sum + (
                    workspace.gradebook?.books && typeof workspace.gradebook.books === 'object'
                        ? Object.values(workspace.gradebook.books).reduce((bookSum, book) => bookSum + (Array.isArray(book?.students) ? book.students.length : 0), 0)
                        : 0
                ), 0),
                homeroomBooks: workspaces.reduce((sum, workspace) => sum + (
                    workspace.homeroom?.books && typeof workspace.homeroom.books === 'object'
                        ? Object.keys(workspace.homeroom.books).length : 0
                ), 0),
                homeroomStudents: workspaces.reduce((sum, workspace) => sum + (
                    workspace.homeroom?.books && typeof workspace.homeroom.books === 'object'
                        ? Object.values(workspace.homeroom.books).reduce((bookSum, book) => bookSum + (Array.isArray(book?.students) ? book.students.length : 0), 0)
                        : 0
                ), 0),
            };
        }

        function updateDataSafetySummary() {
            const counts = backupDataCounts();
            dataSafetySummary.textContent = `${counts.years} năm học · ${counts.plans} tuần kế hoạch · ${counts.timetables} tuần TKB · ${counts.schedules} tuần lịch báo giảng${counts.curriculum ? ` · ${counts.curriculum} bộ phân phối` : ''}${counts.gradebooks ? ` · ${counts.gradebooks} sổ điểm/${counts.gradebookStudents} học sinh` : ''}${counts.homeroomBooks ? ` · ${counts.homeroomBooks} sổ chủ nhiệm/${counts.homeroomStudents} học sinh` : ''}${counts.workItems ? ` · ${counts.workItems} mục công việc` : ''}. File sao lưu không chứa API key.`;
            const storageApi = window.teacherNotebookIndexedDB;
            if (storageApi) {
                Promise.all([
                    storageApi.hasBackup(PRE_RESTORE_BACKUP_KEY),
                    storageApi.hasBackup(PRE_CLOUD_SYNC_BACKUP_KEY),
                ]).then(([hasRestore, hasCloud]) => {
                    undoRestoreBtn.hidden = !hasRestore;
                    exportPreCloudBackupBtn.hidden = !hasCloud;
                }).catch(() => {
                    undoRestoreBtn.hidden = !localStorage.getItem(PRE_RESTORE_BACKUP_KEY);
                    exportPreCloudBackupBtn.hidden = !localStorage.getItem(PRE_CLOUD_SYNC_BACKUP_KEY);
                });
            } else {
                undoRestoreBtn.hidden = !localStorage.getItem(PRE_RESTORE_BACKUP_KEY);
                exportPreCloudBackupBtn.hidden = !localStorage.getItem(PRE_CLOUD_SYNC_BACKUP_KEY);
            }
        }

        function persistCoreState() {
            let success = true;
            success = (window.persistAllYearWorkspacesHybrid ? window.persistAllYearWorkspacesHybrid(state.yearWorkspaces) : window.persistYearWorkspacesHybrid ? window.persistYearWorkspacesHybrid(state.yearWorkspaces) : writeStoredJSON(YEAR_WORKSPACES_STORAGE, state.yearWorkspaces)) && success;
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
            applyYearWorkspaceToRuntime(workspace);
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
            if (typeof renderGradebook === 'function') renderGradebook();
            if (typeof renderHomeroom === 'function') renderHomeroom();
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
                const date = new Date().toISOString().slice(0, 10);
                downloadBlobFile(blob, `so-tay-giao-vien-sao-luu-${date}.json`);
                const counts = backupDataCounts(payload);
                try { localStorage.setItem('teacher_last_backup_at_v1', new Date().toISOString()); } catch (_) { /* noop */ }
                if (typeof refreshHealthCenterSummary === 'function') refreshHealthCenterSummary();
                showToast(`✅ Đã sao lưu ${counts.years} năm học, ${counts.plans} tuần kế hoạch, ${counts.timetables} tuần TKB, ${counts.schedules} tuần lịch báo giảng${counts.gradebooks ? `, ${counts.gradebooks} sổ điểm` : ''}${counts.homeroomBooks ? ` và ${counts.homeroomBooks} sổ chủ nhiệm` : ''}`, 'success');
            } catch (error) {
                showToast('❌ Không thể tạo file sao lưu: ' + error.message, 'error');
            }
        });

        document.getElementById('exportEncryptedBackupBtn')?.addEventListener('click', async () => {
            try {
                const password = prompt('Đặt mật khẩu cho bản sao lưu bảo mật (ít nhất 6 ký tự):');
                if (password === null) return;
                if (String(password).length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự');
                const confirmPassword = prompt('Nhập lại mật khẩu để xác nhận:');
                if (confirmPassword === null) return;
                if (password !== confirmPassword) throw new Error('Hai lần nhập mật khẩu chưa khớp');
                const payload = createBackupPayload();
                const wrapper = await secureBackupEncryptPayload(payload, password);
                const blob = new Blob([JSON.stringify(wrapper)], { type: 'application/json;charset=utf-8' });
                const date = new Date().toISOString().slice(0, 10);
                downloadBlobFile(blob, `so-tay-giao-vien-bao-mat-${date}.stgv`);
                try { localStorage.setItem('teacher_last_backup_at_v1', new Date().toISOString()); } catch (_) { /* noop */ }
                updateDataSafetySummary();
                showToast('✅ Đã tạo bản sao lưu mã hóa AES-GCM. Hãy giữ mật khẩu ở nơi an toàn.', 'success');
            } catch (error) {
                showToast('❌ Không thể tạo sao lưu bảo mật: ' + error.message, 'error');
            }
        });

        exportPreCloudBackupBtn.addEventListener('click', async () => {
            try {
                const stored = window.teacherNotebookIndexedDB
                    ? await window.teacherNotebookIndexedDB.getBackup(PRE_CLOUD_SYNC_BACKUP_KEY)
                    : readStoredJSON(PRE_CLOUD_SYNC_BACKUP_KEY, null);
                if (!stored) throw new Error('Không còn bản sao trước đồng bộ');
                const payload = normalizeBackupPayload(stored);
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
                downloadBlobFile(blob, 'so-tay-giao-vien-truoc-dong-bo-firebase.json');
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
            if (!/\.(json|stgv)$/i.test(file.name)) {
                showToast('⚠️ Vui lòng chọn file sao lưu .json hoặc .stgv', 'error');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast('⚠️ File sao lưu vượt quá 10 MB', 'error');
                return;
            }

            try {
                let parsed = JSON.parse(await file.text());
                if (parsed?.format === SECURE_BACKUP_FORMAT) {
                    const password = prompt('Nhập mật khẩu của bản sao lưu bảo mật:');
                    if (password === null) return;
                    parsed = await secureBackupDecryptWrapper(parsed, password);
                }
                const normalized = normalizeBackupPayload(parsed);
                const counts = backupDataCounts(normalized);
                const description = `${counts.years} năm học, ${counts.plans} tuần kế hoạch, ${counts.timetables} tuần TKB, ${counts.schedules} tuần lịch báo giảng`;
                if (!confirm(`Khôi phục ${description} từ file “${file.name}”?\n\nDữ liệu hiện tại sẽ được thay thế. API key vẫn được giữ nguyên.`)) return;

                const storageApi = window.teacherNotebookIndexedDB;
                if (storageApi) await storageApi.removeBackup(PRE_RESTORE_BACKUP_KEY);
                else localStorage.removeItem(PRE_RESTORE_BACKUP_KEY);
                const checkpointPayload = createBackupPayload();
                const checkpointSaved = storageApi
                    ? await storageApi.setBackup(PRE_RESTORE_BACKUP_KEY, checkpointPayload)
                    : writeStoredJSON(PRE_RESTORE_BACKUP_KEY, checkpointPayload);
                if (!checkpointSaved) {
                    if (storageApi) await storageApi.removeBackup(PRE_RESTORE_BACKUP_KEY);
                    else localStorage.removeItem(PRE_RESTORE_BACKUP_KEY);
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

        undoRestoreBtn.addEventListener('click', async () => {
            const storageApi = window.teacherNotebookIndexedDB;
            const stored = storageApi
                ? await storageApi.getBackup(PRE_RESTORE_BACKUP_KEY)
                : readStoredJSON(PRE_RESTORE_BACKUP_KEY, null);
            if (!stored) {
                updateDataSafetySummary();
                showToast('Không còn điểm hoàn tác khôi phục', 'info');
                return;
            }
            if (!confirm('Hoàn tác lần khôi phục gần nhất và quay về dữ liệu trước đó?')) return;
            try {
                const checkpoint = normalizeBackupPayload(stored);
                applyBackupPayload(checkpoint);
                if (storageApi) await storageApi.removeBackup(PRE_RESTORE_BACKUP_KEY);
                else localStorage.removeItem(PRE_RESTORE_BACKUP_KEY);
                updateDataSafetySummary();
                showToast('✅ Đã hoàn tác lần khôi phục gần nhất', 'success');
            } catch (error) {
                console.error(error);
                showToast('❌ Không thể hoàn tác: ' + error.message, 'error');
            }
        });
