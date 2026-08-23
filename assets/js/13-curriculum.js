        // ================================================================
        //  CURRICULUM (Phân phối chương trình)
        // ================================================================
        let curriculumBoundaryTargetId = '';
        let curriculumBoundarySuggestionPrefill = false;

        function persistCurriculumProfiles() {
            const success = writeStoredJSON(CURRICULUM_PROFILES_STORAGE, {
                version: 2,
                profiles: state.curriculumProfiles,
            });
            persistActiveYearWorkspace();
            renderCurriculumProfiles();
            updateDataSafetySummary();
            renderCurriculumMatchSummary(getSelectedScheduleWeek());
            return success;
        }

        function updateCurriculumTargetUI() {
            const isClass = curriculumScopeSelect.value === 'class';
            curriculumClassField.hidden = !isClass;
            const grade = curriculumGradeSelect.value;
            const className = cleanText(curriculumClassInput.value).toUpperCase();
            const subject = cleanText(curriculumSubjectInput.value) || state.teacherProfile.subject;
            curriculumTargetNote.textContent = isClass
                ? className
                    ? `File sắp tải sẽ chỉ áp dụng cho lớp ${className}, môn ${subject}; dữ liệu này sẽ ưu tiên hơn phân phối Khối ${inferGradeFromClass(className) || grade}.`
                    : 'Nhập tên lớp chính xác như trong thời khóa biểu, ví dụ 10A1, 11A3 hoặc 12A2.'
                : `File sắp tải sẽ áp dụng cho tất cả các lớp thuộc Khối ${grade}, môn ${subject}.`;
            updateCurriculumSemesterBoundaryUI();
        }

        function getSelectedCurriculumTarget() {
            const scope = curriculumScopeSelect.value === 'class' ? 'class' : 'grade';
            const subject = cleanText(curriculumSubjectInput.value) || state.teacherProfile.subject;
            let grade = cleanText(curriculumGradeSelect.value);
            let className = '';
            if (scope === 'class') {
                className = cleanText(curriculumClassInput.value).toUpperCase();
                grade = inferGradeFromClass(className);
                if (!normalizeClassKey(className) || !grade) {
                    throw new Error('Tên lớp cần bắt đầu bằng 10, 11 hoặc 12; ví dụ 12A1');
                }
                curriculumGradeSelect.value = grade;
            }
            if (!['10', '11', '12'].includes(grade)) throw new Error('Khối học chưa hợp lệ');
            const target = { scope, grade, className, subject };
            target.id = curriculumTargetId(target);
            return target;
        }

        function getCurriculumProfileForTarget(target) {
            if (!target?.id) return null;
            return (state.curriculumProfiles || []).find(profile => profile.id === target.id) || null;
        }

        function getCurriculumBoundaryDisplay(profile) {
            const totalPpct = getCurriculumProfileTotalPpct(profile);
            const confirmed = Math.max(0, Number.parseInt(profile?.semesterOneEndPpct, 10) || 0);
            const suggestion = detectSemesterOneEndSuggestion(profile);
            return { totalPpct, confirmed, suggestion };
        }

        function updateCurriculumSemesterBoundaryUI(options = {}) {
            if (!curriculumSemester1EndInput || !curriculumSemester1EndHint || !saveCurriculumSemester1EndBtn) return;
            let target = null;
            try { target = getSelectedCurriculumTarget(); } catch (_) { /* target đang nhập dở */ }
            const profile = target ? getCurriculumProfileForTarget(target) : null;
            const boundary = profile ? getCurriculumBoundaryDisplay(profile) : null;
            const targetId = target?.id || '';
            const targetChanged = targetId !== curriculumBoundaryTargetId;
            if (targetChanged || options.force) {
                curriculumBoundaryTargetId = targetId;
                curriculumSemester1EndInput.value = boundary?.confirmed > 0
                    ? String(boundary.confirmed)
                    : boundary?.suggestion?.ppct > 0 ? String(boundary.suggestion.ppct) : '';
                curriculumBoundarySuggestionPrefill = !(boundary?.confirmed > 0) && Boolean(boundary?.suggestion?.ppct > 0);
            }
            saveCurriculumSemester1EndBtn.disabled = !profile;
            if (!profile) {
                curriculumSemester1EndHint.className = 'curriculum-boundary-hint';
                curriculumSemester1EndHint.textContent = 'Có thể nhập mốc HKI trước khi tải file. Sau khi đọc PPCT, hệ thống còn gợi ý từ “Kiểm tra học kỳ I” hoặc tiết “Trả bài” ngay sau đó.';
                return;
            }
            const { totalPpct, confirmed, suggestion } = boundary;
            if (confirmed > 0) {
                curriculumSemester1EndHint.className = 'curriculum-boundary-hint good';
                curriculumSemester1EndHint.textContent = `Đã xác nhận HKI kết thúc ở Tiết ${confirmed}. Tổng PPCT cả năm: ${totalPpct || '—'} tiết; HKII còn ${totalPpct > 0 ? Math.max(0, totalPpct - confirmed) : '—'} tiết.`;
            } else if (suggestion.ppct > 0) {
                curriculumSemester1EndHint.className = 'curriculum-boundary-hint warn';
                curriculumSemester1EndHint.textContent = `Chưa xác nhận mốc HKI. Gợi ý: Tiết ${suggestion.ppct} (${suggestion.reason}) — “${suggestion.topic}”. Nhập hoặc dùng số này rồi bấm Lưu mốc.`;
            } else {
                curriculumSemester1EndHint.className = 'curriculum-boundary-hint warn';
                curriculumSemester1EndHint.textContent = `Chưa xác nhận Tiết kết thúc HKI. Tổng PPCT cả năm: ${totalPpct || '—'} tiết. Hệ thống sẽ chưa dự báo theo học kỳ cho đến khi có mốc này.`;
            }
        }

        function saveCurriculumSemesterOneBoundary() {
            let target;
            try {
                target = getSelectedCurriculumTarget();
            } catch (error) {
                showToast('⚠️ ' + error.message, 'error');
                return;
            }
            const profile = getCurriculumProfileForTarget(target);
            if (!profile) {
                showToast('⚠️ Hãy tải phân phối chương trình cho khối/lớp này trước khi lưu mốc HKI.', 'error');
                return;
            }
            const totalPpct = getCurriculumProfileTotalPpct(profile);
            const raw = cleanText(curriculumSemester1EndInput.value);
            const value = Number.parseInt(raw, 10) || 0;
            if (!raw) {
                if (profile.semesterOneEndPpct > 0 && !confirm('Xóa mốc kết thúc HKI đã xác nhận? Dự báo theo học kỳ sẽ tạm dừng cho đến khi nhập lại.')) return;
                profile.semesterOneEndPpct = 0;
                profile.semesterOneEndConfirmedAt = '';
                persistCurriculumProfiles();
                updateCurriculumSemesterBoundaryUI({ force: true });
                showToast('Đã xóa mốc HKI. Hệ thống sẽ chờ giáo viên xác nhận lại.', 'info');
                return;
            }
            if (!(value > 0)) {
                showToast('⚠️ Tiết kết thúc HKI phải là số nguyên dương.', 'error');
                return;
            }
            if (totalPpct > 0 && value > totalPpct) {
                showToast(`⚠️ Mốc HKI không thể lớn hơn tổng ${totalPpct} tiết của cả năm.`, 'error');
                return;
            }
            profile.semesterOneEndPpct = value;
            profile.semesterOneEndConfirmedAt = new Date().toISOString();
            profile.updatedAt = new Date().toISOString();
            persistCurriculumProfiles();
            updateCurriculumSemesterBoundaryUI({ force: true });
            showToast(`✅ Đã xác nhận HKI kết thúc ở Tiết ${value}. Hệ thống đã tính lại dự báo HKI/HKII.`, 'success');
        }

        function renderCurriculumProfiles() {
            const profiles = [...(state.curriculumProfiles || [])].sort((a, b) => {
                const gradeDiff = (Number.parseInt(a.grade, 10) || 99) - (Number.parseInt(b.grade, 10) || 99);
                if (gradeDiff) return gradeDiff;
                if (a.scope !== b.scope) return a.scope === 'grade' ? -1 : a.scope === 'class' ? 0 : 1;
                return cleanText(a.className).localeCompare(cleanText(b.className), 'vi');
            });
            if (profiles.length === 0) {
                curriculumProfileList.innerHTML = '<div class="curriculum-empty">Chưa có bộ phân phối nào. Chọn khối hoặc lớp ở trên rồi tải file Word/Excel.</div>';
                renderProgressDashboard();
                return;
            }
            curriculumProfileList.innerHTML = profiles.map(profile => {
                const weeks = profile.weeks.map(item => item.week);
                const ppctLessonCount = countMappedCurriculumPeriods(profile.weeks);
                const mappingStatus = ppctLessonCount
                    ? `${ppctLessonCount} tiết PPCT đã khớp tên bài`
                    : '<span style="color:#b45309;font-weight:700;">⚠️ Cần tải lại file để đọc cột Tiết PPCT</span>';
                const range = weeks.length === 1 ? `Tuần ${weeks[0]}` : `Tuần ${Math.min(...weeks)}–${Math.max(...weeks)}`;
                const badgeClass = profile.scope === 'class' ? 'class' : profile.scope === 'all' ? 'all' : '';
                const boundary = getCurriculumBoundaryDisplay(profile);
                const boundaryMeta = boundary.confirmed > 0
                    ? `<div class="curriculum-profile-boundary"><strong>Cả năm: ${boundary.totalPpct || '—'} tiết</strong> · HKI kết thúc Tiết ${boundary.confirmed} ✅ · HKII ${boundary.totalPpct > 0 ? Math.max(0, boundary.totalPpct - boundary.confirmed) : '—'} tiết</div>`
                    : boundary.suggestion.ppct > 0
                        ? `<div class="curriculum-profile-boundary"><strong>Cả năm: ${boundary.totalPpct || '—'} tiết</strong> · ⚠️ Chưa xác nhận HKI · gợi ý Tiết ${boundary.suggestion.ppct} (${escapeHTML(boundary.suggestion.reason)})</div>`
                        : `<div class="curriculum-profile-boundary"><strong>Cả năm: ${boundary.totalPpct || '—'} tiết</strong> · ⚠️ Chưa nhập Tiết kết thúc HKI</div>`;
                return `<div class="curriculum-profile-item">
                    <div class="curriculum-profile-main">
                        <div class="curriculum-profile-title">
                            <span class="curriculum-target-badge ${badgeClass}">${escapeHTML(curriculumProfileLabel(profile))}</span>
                            <span>${escapeHTML(profile.subject)}</span>
                        </div>
                        <div class="curriculum-profile-meta">
                            ${profile.weeks.length} tuần · ${mappingStatus} · ${escapeHTML(range)}<br>
                            ${escapeHTML(profile.fileName)}${profile.migrated ? ' · đã chuyển từ dữ liệu cũ' : ''}
                            ${boundaryMeta}
                        </div>
                    </div>
                    <div class="schedule-row-actions">
                        ${profile.scope !== 'all' ? `<button class="btn btn-outline btn-sm" type="button" data-curriculum-action="select" data-curriculum-id="${escapeHTML(profile.id)}" title="Chọn để thay file">↗</button>` : ''}
                        <button class="btn btn-danger btn-sm" type="button" data-curriculum-action="delete" data-curriculum-id="${escapeHTML(profile.id)}" title="Xóa phân phối">🗑️</button>
                    </div>
                </div>`;
            }).join('');
            if (document.activeElement !== curriculumSemester1EndInput) updateCurriculumSemesterBoundaryUI({ force: true });
            renderProgressDashboard();
        }

        function selectCurriculumProfile(profile) {
            if (!profile || profile.scope === 'all') return;
            curriculumScopeSelect.value = profile.scope;
            curriculumGradeSelect.value = profile.grade;
            curriculumClassInput.value = profile.className;
            curriculumSubjectInput.value = profile.subject;
            updateCurriculumTargetUI();
            curriculumUploadZone.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            showToast(`Đã chọn ${curriculumProfileLabel(profile)}; tải file mới để cập nhật`, 'info');
        }

        function curriculumTargetMatchesScheduleItem(target, item) {
            if (!curriculumSubjectMatches(target.subject, item.subject)) return false;
            if (target.scope === 'all') return true;
            if (target.scope === 'class') return normalizeClassKey(target.className) === normalizeClassKey(item.class);
            return cleanText(target.grade) === inferGradeFromClass(item.class);
        }

        function invalidateSchedulesForCurriculumTarget(target, reason) {
            Object.entries(state.teachingSchedule).forEach(([week, items]) => {
                const slots = (items || [])
                    .filter(item => curriculumTargetMatchesScheduleItem(target, item))
                    .map(item => item.sourceSlotKey)
                    .filter(Boolean);
                if (slots.length) invalidateTeachingSchedules(reason, Number.parseInt(week, 10), slots);
            });
        }

        function saveCurriculumProfile(target, weeks, fileName) {
            const existingIndex = state.curriculumProfiles.findIndex(profile => profile.id === target.id);
            const existingProfile = existingIndex >= 0 ? state.curriculumProfiles[existingIndex] : null;
            if (existingIndex >= 0
                && !confirm(`${curriculumProfileLabel(existingProfile)} đã có phân phối. Thay bằng file ${fileName}?`)) return false;
            const normalizedWeeks = normalizeCurriculumWeeks(weeks);
            const tempProfile = { ...target, weeks: normalizedWeeks };
            const totalPpct = getCurriculumProfileTotalPpct(tempProfile);
            const enteredBoundary = curriculumBoundarySuggestionPrefill
                ? 0
                : Math.max(0, Number.parseInt(curriculumSemester1EndInput?.value, 10) || 0);
            const semesterOneEndPpct = enteredBoundary > 0 ? enteredBoundary : Math.max(0, Number.parseInt(existingProfile?.semesterOneEndPpct, 10) || 0);
            if (semesterOneEndPpct > 0 && totalPpct > 0 && semesterOneEndPpct > totalPpct) {
                throw new Error(`Tiết kết thúc HKI (${semesterOneEndPpct}) lớn hơn tổng ${totalPpct} tiết của cả năm.`);
            }
            const profile = {
                ...target,
                fileName: cleanText(fileName) || 'Phân phối chương trình',
                weeks: normalizedWeeks,
                semesterOneEndPpct,
                semesterOneEndConfirmedAt: enteredBoundary > 0 ? new Date().toISOString() : cleanText(existingProfile?.semesterOneEndConfirmedAt),
                updatedAt: new Date().toISOString(),
                migrated: false,
            };
            if (existingIndex >= 0) state.curriculumProfiles[existingIndex] = profile;
            else state.curriculumProfiles.push(profile);
            persistCurriculumProfiles();
            renumberStoredSchedulesFrom(1);
            persistTeachingScheduleState();
            invalidateSchedulesForCurriculumTarget(target, `Phân phối ${curriculumProfileLabel(profile)} đã thay đổi`);
            return profile;
        }

        function deleteCurriculumProfile(profileId) {
            const profile = state.curriculumProfiles.find(item => item.id === profileId);
            if (!profile || !confirm(`Xóa phân phối ${curriculumProfileLabel(profile)}, môn ${profile.subject}?`)) return;
            state.curriculumProfiles = state.curriculumProfiles.filter(item => item.id !== profileId);
            persistCurriculumProfiles();
            renumberStoredSchedulesFrom(1);
            persistTeachingScheduleState();
            invalidateSchedulesForCurriculumTarget(profile, `Phân phối ${curriculumProfileLabel(profile)} đã bị xóa`);
            populateWeekSelect();
            showToast(`Đã xóa phân phối ${curriculumProfileLabel(profile)}`, 'info');
        }

        async function handleCurriculumFile(file) {
            if (!file) return;
            if (state.busy.curriculum) {
                showToast('Phân phối chương trình đang được xử lý, vui lòng chờ', 'info');
                return;
            }
            let target;
            try {
                target = getSelectedCurriculumTarget();
            } catch (error) {
                showToast('⚠️ ' + error.message, 'error');
                return;
            }
            state.busy.curriculum = true;
            curriculumFileInput.disabled = true;
            curriculumStatus.innerHTML = `<span class="loading-spinner"></span> Đang phân tích cho ${escapeHTML(curriculumProfileLabel(target))}...`;
            curriculumStatus.className = 'mt-12';

            try {
                validateUpload(file, 'document');
                const prompt = `
              Bạn là trợ lý giáo dục theo Chương trình GDPT 2018. Phân tích nội dung phân phối chương trình môn ${target.subject} cho ${curriculumProfileLabel(target)}.
              QUY ƯỚC BẮT BUỘC TRONG FILE PHÂN PHỐI:
              - Cột "Tuần PPCT" là tuần của phân phối chương trình.
              - Cột "Tiết" trong file này chính là "Tiết PPCT" và phải đưa vào ppctPeriod.
              - File phân phối không có Tiết TKB. Không được hiểu cột "Tiết" là vị trí tiết học trong buổi.
              Trích xuất theo tuần và giữ chính xác quan hệ giữa từng số Tiết PPCT với tên bài.
              Tiết PPCT là khóa để tra tên bài, không được tự đổi số, bỏ số hoặc ghép nhiều tên bài vào một tiết.
              Trả về JSON:
              {
                "weeks": [
                  {
                    "week": 1,
                    "topics": "Tóm tắt nội dung trong tuần",
                    "lessons": [
                      { "ppctPeriod": "1", "topic": "Bài 1" },
                      { "ppctPeriod": "2", "topic": "Bài 1" },
                      { "ppctPeriod": "3", "topic": "Bài 1" }
                    ]
                  },
                  ...
                ]
              }
              Nếu một bài kéo dài từ Tiết PPCT 1 đến 6 thì phải tạo đủ 6 phần tử lessons, cùng tên bài và lần lượt mang số 1, 2, 3, 4, 5, 6; không trả khoảng "1-6".
              Trường topics chỉ là tóm tắt, tuyệt đối không dùng chuỗi ghép "Bài 1; Bài 2" làm topic của một tiết.
              Không bỏ bài hoặc đổi thứ tự bài. Nếu bảng không có cột Tuần nhưng có cột Tiết và Tên bài, đặt toàn bộ các dòng vào tuần 1 và vẫn giữ đủ từng số PPCT.
              Nếu file hoàn toàn không ghi số tiết thì mới để ppctPeriod là chuỗi rỗng.
              Nếu không có, trả { "weeks": [] }.
              Chỉ trả JSON.
              `;
                const extractedContent = await extractDocumentText(file);
                let weeks = [];
                let usedLocalParser = state.recognitionMode === 'offline' || !hasUsableGeminiKey() || isGeminiDailyBlocked();
                if (!usedLocalParser) {
                    try {
                        const text = await geminiTextFromFile(file, prompt, extractedContent, stage => {
                            curriculumStatus.innerHTML = `<span class="loading-spinner"></span> ${escapeHTML(stage)}`;
                        });
                        const json = parseAIJson(text);
                        if (json && Array.isArray(json.weeks)) {
                            weeks = normalizeCurriculumWeeks(json.weeks);
                        }
                    } catch (error) {
                        if (error.isDailyQuota) {
                            state.dailyQuotaBlocked = true;
                            sessionStorage.setItem('gemini_daily_quota_blocked', '1');
                        }
                        console.warn('Gemini không phân tích được chương trình, chuyển sang bộ đọc cục bộ:', error);
                        usedLocalParser = true;
                        setRecognitionRuntime(error.isQuota ? 'Gemini hết quota · đọc file trên máy' : 'Đọc file trên máy', 'offline');
                    }
                }
                const localWeeks = parseCurriculumWeeksLocally(extractedContent);
                const aiMappedCount = countMappedCurriculumPeriods(weeks);
                const localMappedCount = countMappedCurriculumPeriods(localWeeks);
                if (localMappedCount > aiMappedCount || weeks.length === 0) {
                    usedLocalParser = true;
                    weeks = localWeeks;
                }
                if (weeks.length > 0) {
                    weeks = normalizeCurriculumWeeks(weeks);
                    if (weeks.length === 0) throw new Error('Không tìm thấy nội dung theo tuần trong file');
                    const mappedCount = countMappedCurriculumPeriods(weeks);
                    if (mappedCount === 0) {
                        throw new Error('Đã thấy tên bài nhưng chưa đọc được cột Tiết PPCT. Vui lòng kiểm tra file có các cột Tuần PPCT, Tiết và Tên bài.');
                    }
                    state.curriculumText = extractedContent;
                    localStorage.setItem('teacher_curriculum_text', state.curriculumText);
                    const savedProfile = saveCurriculumProfile(target, weeks, file.name);
                    if (!savedProfile) return;
                    populateWeekSelect();
                    updateCurriculumSemesterBoundaryUI({ force: true });
                    const boundary = getCurriculumBoundaryDisplay(savedProfile);
                    if (!(boundary.confirmed > 0) && boundary.suggestion.ppct > 0) {
                        curriculumSemester1EndInput.value = String(boundary.suggestion.ppct);
                        curriculumBoundarySuggestionPrefill = true;
                        curriculumSemester1EndHint.className = 'curriculum-boundary-hint warn';
                        curriculumSemester1EndHint.textContent = `Gợi ý mốc HKI: Tiết ${boundary.suggestion.ppct} (${boundary.suggestion.reason}) — “${boundary.suggestion.topic}”. Hãy kiểm tra rồi bấm “Lưu mốc”.`;
                        showToast(`✅ Đã đọc ${mappedCount} Tiết PPCT cả năm. Gợi ý HKI kết thúc ở Tiết ${boundary.suggestion.ppct}; thầy kiểm tra và bấm Lưu mốc để xác nhận.`, 'success');
                    } else {
                        showToast(`✅ Đã khớp ${mappedCount} Tiết PPCT với tên bài cho ${curriculumProfileLabel(target)}${usedLocalParser ? ' trực tiếp từ bảng' : ''}`, 'success');
                    }
                } else {
                    throw new Error('Không tìm thấy các dòng Tuần trong file Word/Excel');
                }
            } catch (err) {
                console.error(err);
                showToast('❌ Lỗi: ' + err.message, 'error');
            } finally {
                state.busy.curriculum = false;
                curriculumFileInput.disabled = false;
                curriculumStatus.innerHTML = '';
            }
        }

        curriculumFileInput.addEventListener('change', (e) => {
            handleCurriculumFile(e.target.files[0]);
            e.target.value = '';
        });

        curriculumScopeSelect.addEventListener('change', updateCurriculumTargetUI);
        curriculumGradeSelect.addEventListener('change', updateCurriculumTargetUI);
        curriculumClassInput.addEventListener('input', updateCurriculumTargetUI);
        curriculumClassInput.addEventListener('blur', () => {
            const grade = inferGradeFromClass(curriculumClassInput.value);
            if (grade) curriculumGradeSelect.value = grade;
            curriculumClassInput.value = cleanText(curriculumClassInput.value).toUpperCase();
            updateCurriculumTargetUI();
        });
        curriculumSubjectInput.addEventListener('input', updateCurriculumTargetUI);
        curriculumSubjectInput.addEventListener('blur', updateCurriculumSemesterBoundaryUI);
        curriculumSemester1EndInput.addEventListener('input', () => {
            curriculumBoundarySuggestionPrefill = false;
            const value = Number.parseInt(curriculumSemester1EndInput.value, 10) || 0;
            if (value > 0) {
                curriculumSemester1EndHint.className = 'curriculum-boundary-hint';
                curriculumSemester1EndHint.textContent = `Đang nhập mốc HKI: Tiết ${value}. Bấm “Lưu mốc” để xác nhận và tính lại dự báo.`;
            } else {
                updateCurriculumSemesterBoundaryUI();
            }
        });
        saveCurriculumSemester1EndBtn.addEventListener('click', saveCurriculumSemesterOneBoundary);

        curriculumProfileList.addEventListener('click', event => {
            const button = event.target.closest('button[data-curriculum-action][data-curriculum-id]');
            if (!button) return;
            const profile = state.curriculumProfiles.find(item => item.id === button.dataset.curriculumId);
            if (button.dataset.curriculumAction === 'select') selectCurriculumProfile(profile);
            if (button.dataset.curriculumAction === 'delete') deleteCurriculumProfile(button.dataset.curriculumId);
        });

        curriculumUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            curriculumUploadZone.classList.add('dragover');
        });
        curriculumUploadZone.addEventListener('dragleave', () => {
            curriculumUploadZone.classList.remove('dragover');
        });
        curriculumUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            curriculumUploadZone.classList.remove('dragover');
            handleCurriculumFile(e.dataTransfer.files[0]);
        });
