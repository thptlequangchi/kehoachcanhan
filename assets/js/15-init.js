        // ================================================================
        //  INIT
        // ================================================================
        function init() {
            // Danh sách năm học là điều khiển lõi: luôn khởi tạo trước mọi dịch vụ khác.
            // HTML đã có sẵn phương án dự phòng nên người dùng vẫn chọn được ngay cả khi một module khác lỗi.
            try {
                populateAcademicYearSelect(state.selectedAcademicYear);
            } catch (error) {
                console.error('Không thể làm mới danh sách năm học; dùng danh sách HTML dự phòng:', error);
            }

            // Kế hoạch cơ bản: tài khoản và dữ liệu nhóm đồng bộ qua Firestore;
            // Gemini dùng API key riêng của từng giáo viên, không cần cổng máy chủ.
            try {
                updateAccountPresentation();
                initializeAccountSystem();
            } catch (error) {
                console.error('Khởi tạo tài khoản/Firebase gặp lỗi, tiếp tục ở chế độ cục bộ:', error);
            }
            // Chỉ migration dữ liệu cũ khi phiên bản schema yêu cầu; không sửa lại toàn bộ PPCT ở mỗi lần mở trang.
            syncPlanDatesForActiveYear();
            const migration = runDataMigrationsForActiveYear();
            if (migration.changed) persistTeachingScheduleState();
            else persistActiveYearWorkspace();
            persistLegacyActiveYear();
            renderPlanTable();
            populateTimetableWeekSelect();
            activateTimetableWeek(state.selectedTimetableWeek, false);
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
            initTeacherCommandCenter();
            renderTeacherCommandCenter();

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
    
