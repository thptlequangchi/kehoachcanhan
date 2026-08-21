        // ================================================================
        //  INIT
        // ================================================================
        function init() {
            // Kế hoạch cơ bản: tài khoản và dữ liệu nhóm đồng bộ qua Firestore;
            // Gemini dùng API key riêng của từng giáo viên, không cần cổng máy chủ.
            updateAccountPresentation();
            initializeAccountSystem();
            // Chỉ migration dữ liệu cũ khi phiên bản schema yêu cầu; không sửa lại toàn bộ PPCT ở mỗi lần mở trang.
            syncPlanDatesForActiveYear();
            const migration = runDataMigrationsForActiveYear();
            if (migration.changed) persistTeachingScheduleState();
            else persistActiveYearWorkspace();
            persistLegacyActiveYear();
            renderPlanTable();
            populateTimetableWeekSelect();
            activateTimetableWeek(state.selectedTimetableWeek, false);
            populateAcademicYearSelect(state.selectedAcademicYear);
            initializeProgressDashboardControls();
            updateSchoolYearWeekInfo();
            curriculumSubjectInput.value = state.teacherProfile.subject;
            updateCurriculumTargetUI();
            renderCurriculumProfiles();
            populateWeekSelect();
            updateDataSafetySummary();
            renderWorkWorkspace();

            // If there's a saved teaching schedule for the selected week, show it
            const savedWeek = getActiveYearWorkspace()?.selectedTeachingWeek
                || localStorage.getItem('teacher_selected_week');
            if (savedWeek) {
                const weekNum = parseInt(savedWeek);
                if (state.teachingSchedule[weekNum]) {
                    renderTeachingSchedule(weekNum);
                    scheduleInfo.textContent = state.scheduleMeta[weekNum]?.stale
                        ? 'Lịch tuần ' + weekNum + ' cần tạo lại'
                        : 'Đã có lịch tuần ' + weekNum;
                    // set select
                    const opt = scheduleWeekSelect.querySelector(`option[value="${weekNum}"]`);
                    if (opt) scheduleWeekSelect.value = weekNum;
                }
            }
            renderProgressDashboard();
            initTeacherOverview();
            renderTeacherOverview();

            if (storageWarnings.length > 0) {
                showToast('⚠️ Một số dữ liệu lưu cũ bị hỏng đã được bỏ qua an toàn.', 'info');
            }
        }

        init();

        // Auto-save when closing
        window.addEventListener('beforeunload', () => {
            persistActiveYearWorkspace();
            persistLegacyActiveYear();
            persistTimetablesByWeek();
            writeStoredJSON('teacher_profile', state.teacherProfile);
        });

        console.log(`📚 Sổ Tay Giáo Viên v${APP_VERSION} · Sổ công việc cá nhân + nhóm đã sẵn sàng!`);
        console.log('💡 Hãy nhập Gemini API key và tải ảnh lên để bắt đầu.');
    
