        // ================================================================
        //  INIT — v45.2: nền v45.1 + nút nhanh TKB/vnEdu trên thanh công cụ
        // ================================================================
        function safeInitStage(name, fn) {
            try {
                return fn();
            } catch (error) {
                console.error(`[INIT] ${name} thất bại:`, error);
                window.__teacherNotebookInitErrors = window.__teacherNotebookInitErrors || [];
                window.__teacherNotebookInitErrors.push({ name, error: String(error?.message || error) });
                window.teacherNotebookRecordError?.('init', error, { source: name });
                return undefined;
            }
        }

        function setHeaderAcademicContextFallback() {
            const context = document.getElementById('headerAcademicContext');
            if (!context) return;
            const year = state?.selectedAcademicYear || schoolYearSelect?.value || 'Chưa chọn năm học';
            context.textContent = year;
        }

        function init() {
            // 1) UI lõi phải sống trước mọi tác vụ dữ liệu/cloud.
            safeInitStage('Danh sách năm học', () => populateAcademicYearSelect(state.selectedAcademicYear));
            safeInitStage('Header năm học', setHeaderAcademicContextFallback);
            safeInitStage('Tabs', () => {
                // tab listeners được đăng ký trong 10-tabs.js; chỉ bảo đảm trạng thái hiển thị hiện tại.
                const active = document.querySelector('.tab-btn.active') || document.querySelector('.tab-btn');
                const activeName = active?.dataset?.tab;
                if (activeName) {
                    document.querySelectorAll('.tab-content').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${activeName}`));
                }
            });

            // 2) Tổng quan được khởi tạo sớm. Nếu dữ liệu phụ chưa sẵn sàng, nó vẫn hiển thị năm học.
            safeInitStage('Tổng quan giáo viên', () => {
                initTeacherOverview();
                renderTeacherOverview();
            });

            // 3) Tài khoản/Firebase là bất đồng bộ và không được chặn phần còn lại.
            safeInitStage('Giao diện tài khoản', updateAccountPresentation);
            try {
                Promise.resolve(initializeAccountSystem()).catch(error => {
                    console.error('[INIT] Tài khoản/Firebase bất đồng bộ thất bại, tiếp tục chế độ cục bộ:', error);
                    window.__teacherNotebookInitErrors = window.__teacherNotebookInitErrors || [];
                    window.__teacherNotebookInitErrors.push({ name: 'Firebase', error: String(error?.message || error) });
                    window.teacherNotebookRecordError?.('firebase-init', error, { source: 'initializeAccountSystem' });
                    safeInitStage('Làm mới tổng quan sau lỗi Firebase', renderTeacherOverview);
                });
            } catch (error) {
                console.error('[INIT] Không thể bắt đầu Firebase, tiếp tục chế độ cục bộ:', error);
            }

            // 4) Mỗi khối nghiệp vụ chạy độc lập. Một lỗi không được chặn các khối phía sau.
            safeInitStage('Đồng bộ ngày kế hoạch', syncPlanDatesForActiveYear);
            safeInitStage('Migration dữ liệu', () => {
                const migration = runDataMigrationsForActiveYear();
                if (migration?.changed) persistTeachingScheduleState();
                else persistActiveYearWorkspace();
            });
            safeInitStage('Lưu năm học tương thích', persistLegacyActiveYear);
            safeInitStage('Bảng kế hoạch', renderPlanTable);
            safeInitStage('Danh sách tuần TKB', populateTimetableWeekSelect);
            safeInitStage('Kích hoạt tuần TKB', () => activateTimetableWeek(state.selectedTimetableWeek, false));
            safeInitStage('Dashboard tiến độ', initializeProgressDashboardControls);
            safeInitStage('Thông tin tuần năm học', updateSchoolYearWeekInfo);
            safeInitStage('Môn dạy mặc định', () => {
                if (curriculumSubjectInput) curriculumSubjectInput.value = state.teacherProfile?.subject || '';
            });
            safeInitStage('Phạm vi PPCT', updateCurriculumTargetUI);
            safeInitStage('Danh sách PPCT', renderCurriculumProfiles);
            safeInitStage('Danh sách tuần báo giảng', populateWeekSelect);
            safeInitStage('An toàn dữ liệu', updateDataSafetySummary);
            safeInitStage('Sổ Công Việc Pro', () => { initWorkPro(); renderWorkWorkspace(); });

            safeInitStage('Khôi phục lịch báo giảng đang chọn', () => {
                const savedWeek = getActiveYearWorkspace()?.selectedTeachingWeek
                    || localStorage.getItem('teacher_selected_week');
                if (!savedWeek) return;
                const weekNum = parseInt(savedWeek, 10);
                if (!state.teachingSchedule?.[weekNum]) return;
                renderTeachingSchedule(weekNum);
                if (scheduleInfo) {
                    scheduleInfo.textContent = state.scheduleMeta?.[weekNum]?.stale
                        ? 'Lịch tuần ' + weekNum + ' cần tạo lại'
                        : 'Đã có lịch tuần ' + weekNum;
                }
                const opt = scheduleWeekSelect?.querySelector(`option[value="${weekNum}"]`);
                if (opt) scheduleWeekSelect.value = weekNum;
            });

            safeInitStage('Vẽ dashboard tiến độ', renderProgressDashboard);
            safeInitStage('Trợ lý tuần', () => {
                initTeacherCommandCenter();
                renderTeacherCommandCenter();
            });
            safeInitStage('Dashboard năm học', () => {
                initYearDashboard();
                renderYearDashboard();
            });
            safeInitStage('Tự động hóa công việc', () => {
                initAutomationCenter();
                renderAutomationCenter();
            });
            safeInitStage('Báo cáo & hồ sơ', () => {
                initReportCenter();
                renderReportCenter();
            });
            safeInitStage('Trung tâm chẩn đoán', () => {
                initHealthCenter();
            });
            safeInitStage('Trung tâm liên kết', () => {
                if (typeof initLinkCenter === 'function') initLinkCenter();
                if (typeof renderLinkCenter === 'function') renderLinkCenter();
            });

            // Cập nhật lại header/tổng quan sau khi mọi dữ liệu cục bộ đã nạp.
            safeInitStage('Cập nhật tổng quan cuối', () => {
                setHeaderAcademicContextFallback();
                renderTeacherOverview();
            });

            if (storageWarnings?.length > 0) {
                safeInitStage('Cảnh báo dữ liệu', () => showToast('⚠️ Một số dữ liệu lưu cũ bị hỏng đã được bỏ qua an toàn.', 'info'));
            }

            const initErrors = window.__teacherNotebookInitErrors || [];
            if (initErrors.length) {
                console.warn('Trang đã khởi động với một số module lỗi nhưng giao diện lõi vẫn hoạt động:', initErrors);
            }
            window.__teacherNotebookInitCompleted = true;
            window.dispatchEvent(new CustomEvent('teacher-notebook:init-complete'));
        }

        // Đảm bảo DOM đã tồn tại đầy đủ kể cả khi cách nhúng script thay đổi sau này.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init, { once: true });
        } else {
            init();
        }

        // Auto-save when closing — từng thao tác lưu độc lập để một lỗi không chặn phần còn lại.
        window.addEventListener('beforeunload', () => {
            safeInitStage('Lưu workspace khi đóng', persistActiveYearWorkspace);
            safeInitStage('Lưu năm học khi đóng', persistLegacyActiveYear);
            safeInitStage('Lưu TKB khi đóng', persistTimetablesByWeek);
            safeInitStage('Lưu hồ sơ khi đóng', () => writeStoredJSON('teacher_profile', state.teacherProfile));
        });

        console.log(`📚 Sổ Tay Giáo Viên v${APP_VERSION} · Premium Teacher Workspace đã sẵn sàng`);
