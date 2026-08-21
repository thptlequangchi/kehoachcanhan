        // ================================================================
        //  PLAN (Kế hoạch trường)
        // ================================================================
        function getPlanRecognitionPrompt() {
            return `
Bạn là chuyên gia OCR văn bản hành chính trường học Việt Nam. Ảnh là LỊCH CÔNG TÁC THEO TUẦN, thường có cấu trúc giống mẫu:
- Tiêu đề: LỊCH CÔNG TÁC NĂM HỌC ...
- Dòng Tuần, khoảng ngày và thông tin trực tuần.
- Bảng gồm các cột: Thứ/ngày, Buổi sáng, Buổi chiều, Đi công tác.
- Khoảng ngày ghi dưới tiêu đề là phạm vi chính của tuần. Một số mẫu có thể kèm CN của tuần trước ở đầu bảng; nếu ngày đó nằm ngoài khoảng 'Từ ngày ... đến ...' thì không đưa vào days của tuần chính.
- Nếu ảnh có hai dòng CN, phải phân biệt bằng ngày/tháng; giữ dòng CN nằm trong khoảng ngày của tuần và không để hai dòng ghi đè nhau.

YÊU CẦU NHẬN DẠNG CHÍNH XÁC:
1. Đọc đúng số tuần, khoảng ngày, năm học và người/bộ phận trực tuần.
2. Với từng hàng, tách riêng day (ví dụ "Thứ 4" hoặc "Chủ nhật") và date (ví dụ "04/9").
3. Chép nguyên văn nội dung từng ô morning, afternoon, businessTrip; giữ dấu tiếng Việt, giờ, chữ viết tắt và xuống dòng có ý nghĩa.
4. Nội dung màu đỏ, đen, in đậm hay in nghiêng đều phải được đọc; không bỏ sót vì khác màu chữ.
5. Ô trống trả chuỗi rỗng. Tuyệt đối không suy đoán nội dung không nhìn thấy và không chuyển nội dung sang ô bên cạnh.
6. Nếu một phần chữ quá mờ, ghi phần chắc chắn và thêm mô tả vào warnings.
7. Phải trả các hàng ngày trong ảnh; không được trả mảng days rỗng.
8. Chỉ trả JSON đúng lược đồ.`;
        }

        async function handlePlanFiles(files) {
            if (!files || files.length === 0) return;
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            if (state.busy.plan) {
                showToast('Kế hoạch đang được xử lý, vui lòng chờ', 'info');
                return;
            }
            state.busy.plan = true;
            planFileInput.disabled = true;
            planStatus.innerHTML = '<span class="loading-spinner"></span> Đang chuẩn bị nhận dạng...';
            planStatus.className = 'mt-12';

            let successCount = 0;
            let failedCount = 0;
            try {
                const fileList = Array.from(files);
                for (let index = 0; index < fileList.length; index++) {
                    const file = fileList[index];
                    try {
                        validateUpload(file, 'image');
                        const prompt = getPlanRecognitionPrompt();
                        const plan = await recognizeStructuredImage({
                            file,
                            kind: 'plan',
                            prompt,
                            schema: PLAN_SCHEMA,
                            normalize: normalizePlanWeek,
                            validateGemini: data => Array.isArray(data?.days) && data.days.length > 0,
                            onStage: stage => {
                                planStatus.innerHTML = `<span class="loading-spinner"></span> Ảnh ${index + 1}/${fileList.length}: ${escapeHTML(stage)}`;
                            },
                        });
                        if (!canEditSharedPlan()) {
                            throw new Error('Kế hoạch vừa có phiên bản mới. Hãy xử lý thông báo đồng bộ an toàn rồi tải lại ảnh.');
                        }
                        if (!plan || typeof plan !== 'object') throw new Error('Kết quả nhận dạng kế hoạch không hợp lệ');
                        if (!Array.isArray(plan.days)) plan.days = [];
                        plan.schoolYear = state.selectedAcademicYear;
                        plan.updatedAt = new Date().toISOString();
                        applyAutomaticDatesToPlan(plan);

                        const existingIndex = state.planData.findIndex(item => item.week === plan.week);
                        if (existingIndex >= 0) state.planData[existingIndex] = plan;
                        else state.planData.push(plan);
                        // Sort by week
                        state.planData.sort((a, b) => a.week - b.week);
                        writeStoredJSON('teacher_plan_data', state.planData);
                        persistActiveYearWorkspace();
                        invalidateTeachingSchedules('Kế hoạch nhà trường đã thay đổi');
                        renderPlanTable();
                        showPlanWeek(plan.week);
                        successCount++;
                    } catch (fileError) {
                        console.error('Lỗi ảnh kế hoạch:', file.name, fileError);
                        const detail = cleanText(fileError?.message) || 'Lỗi không xác định';
                        // Không để lỗi OCR/Gemini làm mất luôn thao tác tải ảnh. Nếu nhận dạng hỏng bất ngờ,
                        // tạo tuần trống an toàn để giáo viên vẫn có thể mở và nhập/sửa thủ công.
                        try {
                            const emergency = normalizePlanWeek(createPlanDraftFromOcr('', 'manual', detail));
                            if (emergency && canEditSharedPlan()) {
                                emergency.schoolYear = state.selectedAcademicYear;
                                emergency.updatedAt = new Date().toISOString();
                                emergency.warnings = [
                                    'Ảnh đã tải nhưng bộ nhận dạng gặp lỗi. Hệ thống đã tạo mẫu trống an toàn để thầy nhập hoặc thử nhận dạng lại.',
                                    `Chi tiết kỹ thuật: ${detail}`,
                                ];
                                applyAutomaticDatesToPlan(emergency);
                                const existingIndex = state.planData.findIndex(item => item.week === emergency.week);
                                if (existingIndex >= 0) state.planData[existingIndex] = emergency;
                                else state.planData.push(emergency);
                                state.planData.sort((a, b) => a.week - b.week);
                                writeStoredJSON('teacher_plan_data', state.planData);
                                persistActiveYearWorkspace();
                                renderPlanTable();
                                showPlanWeek(emergency.week);
                                showToast(`⚠️ ${file.name}: nhận dạng lỗi, đã tạo mẫu tuần để chỉnh thủ công`, 'info');
                                successCount++;
                                continue;
                            }
                        } catch (fallbackError) {
                            console.error('Không thể tạo mẫu dự phòng kế hoạch:', fallbackError);
                        }
                        failedCount++;
                        showToast(`❌ ${file.name}: ${detail}`, 'error');
                        if (planStatus) planStatus.textContent = `Lỗi ảnh: ${detail}`;
                    }
                }
                if (successCount > 0) {
                    showToast(`✅ Đã cập nhật ${successCount} ảnh kế hoạch${failedCount ? `, lỗi ${failedCount} ảnh` : ''}`, 'success');
                }
            } finally {
                state.busy.plan = false;
                updateSharedPlanEditingControls();
                planStatus.innerHTML = '';
            }
        }

        planFileInput.addEventListener('change', (e) => {
            handlePlanFiles(e.target.files);
            e.target.value = '';
        });

        planUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            planUploadZone.classList.add('dragover');
        });
        planUploadZone.addEventListener('dragleave', () => {
            planUploadZone.classList.remove('dragover');
        });
        planUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            planUploadZone.classList.remove('dragover');
            handlePlanFiles(e.dataTransfer.files);
        });

        function renderPlanTable() {
            updateDataSafetySummary();
            state.planData.sort((a, b) => a.week - b.week);
            const data = state.planData;
            updatePlanListControls();
            if (!data || data.length === 0) {
                planTableBody.innerHTML = `
              <tr><td colspan="5" class="text-center text-muted" style="padding:32px 0;">
                Chưa có dữ liệu. Hãy tải ảnh kế hoạch lên hoặc thêm tuần phụ.
              </td></tr>
            `;
                populatePlanWeekSelect();
                populateTimetableWeekSelect();
                populateWeekSelect();
                renderPlanDetail(0);
                return;
            }
            let html = '';
            for (const p of data) {
                const week = Number.parseInt(p.week, 10) || 0;
                const weekLabel = getPlanWeekLabel(week);
                const auxiliary = isAuxiliaryPlanWeek(week);
                const warningText = p.warnings?.length ? ` · ⚠️ ${p.warnings.length} lưu ý` : '';
                html += `
              <tr class="${auxiliary ? 'auxiliary-plan-row' : ''}">
                <td class="week-num"><span class="plan-week-label ${auxiliary ? 'auxiliary' : ''}">${escapeHTML(weekLabel)}</span></td>
                <td>${escapeHTML(p.dateRange || '—')}</td>
                <td>${escapeHTML(p.duty || '—')}</td>
                <td><span class="status-badge done">✅ ${Array.isArray(p.days) ? p.days.length : 0} ngày${escapeHTML(warningText)}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" style="color:#1e3a5f;border-color:#cbd5e1;" 
                          data-action="view" data-week="${week}" aria-label="Xem kế hoạch ${escapeHTML(weekLabel)}">👁️ Xem</button>
                  <button class="btn btn-danger btn-sm" data-action="delete" data-week="${week}"
                          aria-label="Xóa kế hoạch ${escapeHTML(weekLabel)}" ${canEditSharedPlan() ? '' : 'disabled'}>🗑️</button>
                </td>
              </tr>
            `;
            }
            planTableBody.innerHTML = html;
            populatePlanWeekSelect();
            populateTimetableWeekSelect();
            populateWeekSelect();
        }

        function updatePlanListControls() {
            const mainCount = state.planData.filter(item => isMainSchoolWeek(item.week)).length;
            const auxiliaryCount = state.planData.filter(item => isAuxiliaryPlanWeek(item.week)).length;
            planWeekListSummary.textContent = `Đã có ${mainCount}/${MAX_SCHOOL_WEEKS} tuần chính · ${auxiliaryCount}/2 tuần phụ trước khai giảng`;
            const nextAuxiliaryWeek = AUXILIARY_PLAN_WEEKS.find(week => !state.planData.some(item => item.week === week));
            addAuxiliaryPlanWeekBtn.disabled = !canEditSharedPlan() || typeof nextAuxiliaryWeek === 'undefined';
            addAuxiliaryPlanWeekBtn.textContent = typeof nextAuxiliaryWeek === 'undefined'
                ? '✓ Đủ 2 tuần phụ'
                : `＋ Thêm ${getPlanWeekLabel(nextAuxiliaryWeek)}`;
            addAuxiliaryPlanWeekBtn.title = typeof nextAuxiliaryWeek === 'undefined'
                ? 'Đã đủ tối đa 2 tuần phụ trước khai giảng'
                : `${getPlanWeekLabel(nextAuxiliaryWeek)} nằm trước Tuần 1`;
        }

        function populatePlanWeekSelect() {
            const previous = Number.parseInt(planWeekSelect.value, 10);
            planWeekSelect.innerHTML = '<option value="">-- Chọn tuần --</option>';
            state.planData.forEach(plan => {
                const option = document.createElement('option');
                option.value = String(plan.week);
                option.textContent = `${getPlanWeekLabel(plan.week)}${plan.dateRange ? ` — ${plan.dateRange}` : ''}`;
                planWeekSelect.appendChild(option);
            });
            const selectedWeek = isValidPlanWeek(previous) && state.planData.some(plan => plan.week === previous)
                ? previous
                : getLatestPlanWeek();
            if (selectedWeek !== null) planWeekSelect.value = String(selectedWeek);
            renderPlanDetail(selectedWeek);
            return selectedWeek;
        }

        function showPlanWeek(week, scrollToDetail = false) {
            const normalizedWeek = Number.parseInt(week, 10);
            if (!state.planData.some(item => item.week === normalizedWeek)) return;
            planWeekSelect.value = String(normalizedWeek);
            renderPlanDetail(normalizedWeek);
            if (scrollToDetail) {
                document.getElementById('planDetailCard')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
            }
        }

        function getPlanDisplayTitle(plan) {
            const academicYear = state.selectedAcademicYear || plan.schoolYear;
            let title = cleanText(plan.title) || 'LỊCH CÔNG TÁC';
            if (/NĂM\s+HỌC\s+20\d{2}\s*[-–]\s*20\d{2}/i.test(title)) {
                title = title.replace(
                    /NĂM\s+HỌC\s+20\d{2}\s*[-–]\s*20\d{2}/i,
                    `NĂM HỌC ${academicYear}`
                );
            } else if (normalizeLookupText(title) === 'lichcongtac' && academicYear) {
                title += ` NĂM HỌC ${academicYear}`;
            }
            return title;
        }

        function renderPlanDetail(week) {
            const plan = state.planData.find(item => item.week === Number.parseInt(week, 10));
            if (!plan) {
                planDetailDisplay.innerHTML = '<p class="text-muted text-center" style="padding:28px 0;">Chọn một tuần để xem bảng kế hoạch chi tiết.</p>';
                return;
            }
            const planEditDisabled = canEditSharedPlan() ? '' : 'disabled';

            const rows = plan.days.map((day, index) => ({ day, index }))
                .sort((a, b) => planDayOrder(a.day.day) - planDayOrder(b.day.day))
                .map(({ day, index }) => `
                <tr>
                    <td class="plan-day">
                        <span class="plan-day-name">${escapeHTML(day.day || '—')}</span>
                        <span class="plan-day-date">${escapeHTML(day.date || '')}</span>
                    </td>
                    <td>${escapeHTML(normalizePlanCellText(day.morning))}</td>
                    <td>${escapeHTML(normalizePlanCellText(day.afternoon))}</td>
                    <td class="plan-business">${escapeHTML(normalizePlanCellText(day.businessTrip))}</td>
                    <td class="plan-cell-actions">
                        <button class="btn btn-outline btn-sm" style="color:#1e3a5f;border-color:#93c5fd;"
                                data-plan-action="edit-day" data-week="${plan.week}" data-day-index="${index}" ${planEditDisabled}>✏️ Sửa</button>
                    </td>
                </tr>
            `).join('');
            const warningHtml = plan.warnings.length
                ? `<div class="warning-list"><strong>⚠️ Vị trí cần kiểm tra:</strong><ul>${plan.warnings.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul></div>`
                : '';
            const title = getPlanDisplayTitle(plan);
            const sourceInfo = getRecognitionSourceInfo(plan);
            const transcriptHtml = renderOcrTranscript(plan.offlineOcrText, `data-plan-action="copy-ocr" data-week="${plan.week}"`);
            const recentFile = plan.cacheHash
                ? state.recentRecognitionFiles[`plan:${plan.cacheHash}`] : null;
            const needsRecovery = plan.warnings.length > 0
                || ['offline-spatial', 'offline-ocr', 'manual'].includes(plan.sourceMode);
            const geminiUnavailable = !recentFile || !hasUsableGeminiKey() || isGeminiDailyBlocked();
            const recoveryActions = needsRecovery ? `
                <span class="plan-recovery-actions">
                    <button class="btn btn-outline btn-sm" type="button" style="color:#1d4ed8;border-color:#93c5fd;"
                            data-plan-action="retry-gemini" data-week="${plan.week}" ${geminiUnavailable || !canEditSharedPlan() ? 'disabled' : ''}
                            title="${geminiUnavailable ? 'Cần ảnh gốc trong phiên hiện tại và API Gemini khả dụng' : 'Đọc lại ảnh qua hàng đợi Gemini an toàn'}">🔄 Phân tích lại bằng Gemini</button>
                    <button class="btn btn-outline btn-sm" type="button" style="color:#166534;border-color:#86efac;"
                            data-plan-action="rebuild-spatial-ocr" data-week="${plan.week}" ${recentFile && canEditSharedPlan() ? '' : 'disabled'}
                            title="${recentFile ? 'Dùng tọa độ chữ để ghép lại từng cột' : 'Cần tải lại ảnh gốc để ghép bảng'}">🧩 Ghép lại từ OCR</button>
                </span>
                ${recentFile ? '' : '<span class="plan-recovery-hint">Ảnh gốc không được lưu lâu dài. Hãy tải lại đúng ảnh kế hoạch một lần để bật hai công cụ phục hồi.</span>'}
            ` : '';
            const previewUrl = plan.cacheHash
                ? state.recentRecognitionPreviews[`plan:${plan.cacheHash}`] : '';
            const sourcePreviewHtml = needsRecovery && previewUrl ? `
                <aside class="plan-source-preview-panel">
                    <div class="plan-source-preview-title"><span>🖼️ Ảnh gốc để đối chiếu</span><span>Trong phiên này</span></div>
                    <img src="${escapeHTML(previewUrl)}" alt="Ảnh gốc kế hoạch ${escapeHTML(getPlanWeekLabel(plan.week))}" />
                </aside>
            ` : '';
            planDetailDisplay.innerHTML = `
                <div class="recognition-note">
                    <span>${sourceInfo.icon}</span>
                    <div><strong>${escapeHTML(sourceInfo.title)}</strong> ${escapeHTML(sourceInfo.text)}
                    <button class="btn btn-outline btn-sm" style="color:#1e3a5f;border-color:#93c5fd;margin-left:8px;"
                            data-plan-action="edit-meta" data-week="${plan.week}" ${planEditDisabled}>✏️ Sửa thông tin tuần</button>
                    ${recoveryActions}</div>
                </div>
                <div class="plan-review-workspace ${sourcePreviewHtml ? 'with-preview' : ''}">
                    ${sourcePreviewHtml}
                    <div class="table-wrap">
                      <div class="plan-document">
                        <div class="plan-document-title">${escapeHTML(title)}</div>
                        <div class="plan-document-meta">
                            <span class="plan-meta-chip">${escapeHTML(getPlanWeekLabel(plan.week))}</span>
                            <span class="plan-meta-chip">📅 ${escapeHTML(plan.dateRange || 'Chưa xác định ngày')}</span>
                            ${plan.duty ? `<span class="plan-meta-chip">👤 Trực: ${escapeHTML(plan.duty)}</span>` : ''}
                        </div>
                        <table>
                            <colgroup><col style="width:112px;"><col><col><col style="width:180px;"><col style="width:96px;"></colgroup>
                            <thead><tr><th>Thứ/ngày</th><th>Buổi sáng</th><th>Buổi chiều</th><th>Đi công tác</th><th>Thao tác</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        ${plan.legacyContent && plan.days.length === 0 ? `<p>${escapeHTML(plan.legacyContent)}</p>` : ''}
                      </div>
                    </div>
                </div>
                ${warningHtml}
                ${transcriptHtml}
            `;
        }

        async function reprocessPlanWeek(week, strategy) {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            const currentPlan = state.planData.find(item => item.week === week);
            const file = currentPlan?.cacheHash
                ? state.recentRecognitionFiles[`plan:${currentPlan.cacheHash}`] : null;
            if (!currentPlan || !file) {
                showToast('⚠️ Hãy tải lại đúng ảnh kế hoạch để hệ thống phân tích lại', 'info');
                return;
            }
            if (state.busy.plan) {
                showToast('Kế hoạch đang được xử lý, vui lòng chờ', 'info');
                return;
            }
            if (strategy === 'gemini' && (!hasUsableGeminiKey() || isGeminiDailyBlocked())) {
                showToast('⚠️ Gemini chưa khả dụng; thầy có thể chọn “Ghép lại từ OCR”', 'info');
                return;
            }

            state.busy.plan = true;
            planFileInput.disabled = true;
            const updateStage = stage => {
                planStatus.className = 'mt-12';
                planStatus.innerHTML = `<span class="loading-spinner"></span> ${escapeHTML(stage)}`;
            };
            try {
                let draft;
                if (strategy === 'gemini') {
                    updateStage('Đang phân tích lại ảnh bằng Gemini...');
                    const prompt = getPlanRecognitionPrompt();
                    let json = await geminiExtractVerified(file, prompt, PLAN_SCHEMA, updateStage, true);
                    draft = normalizePlanWeek({ ...json, week: currentPlan.week });
                    if (!draft || draft.days.length === 0) {
                        json = await geminiRecoverStructuredImage(file, prompt, PLAN_SCHEMA, updateStage);
                        draft = normalizePlanWeek({ ...json, week: currentPlan.week });
                        if (!draft || draft.days.length === 0) throw new Error('Gemini vẫn chưa dựng đủ các hàng kế hoạch');
                        draft.sourceMode = 'gemini-recovered';
                    } else {
                        draft.sourceMode = 'gemini-verified';
                    }
                    draft.offlineOcrText = '';
                    draft.fallbackReason = '';
                    setRecognitionRuntime('Gemini · đã phân tích lại', 'gemini');
                } else {
                    updateStage('OCR đang đọc tọa độ và ghép lại các cột...');
                    const ocrResult = await runOfflineOcr(file, updateStage);
                    draft = createPlanDraftFromSpatialOcr(ocrResult, currentPlan.fallbackReason)
                        || createPlanDraftFromOcr(ocrResult.text, 'offline-ocr', 'OCR chưa xác định đủ đường biên của bảng');
                    draft = normalizePlanWeek(draft);
                    if (!draft) throw new Error('OCR chưa tạo được bảng kế hoạch');
                    setRecognitionRuntime(draft.sourceMode === 'offline-spatial'
                        ? 'OCR · đã tự ghép bảng' : 'OCR · cần kiểm tra', 'offline');
                }

                if (!canEditSharedPlan()) {
                    throw new Error('Kế hoạch vừa có phiên bản mới. Hãy xử lý thông báo đồng bộ an toàn rồi phân tích lại.');
                }
                draft.week = currentPlan.week;
                draft.schoolYear = state.selectedAcademicYear;
                draft.cacheHash = currentPlan.cacheHash;
                draft.cacheHit = false;
                draft.updatedAt = new Date().toISOString();
                applyAutomaticDatesToPlan(draft);
                const index = state.planData.findIndex(item => item.week === week);
                state.planData[index] = draft;
                cacheRecognition('plan', currentPlan.cacheHash, draft);
                writeStoredJSON('teacher_plan_data', state.planData);
                persistActiveYearWorkspace();
                invalidateTeachingSchedules('Kế hoạch nhà trường đã được phân tích lại');
                renderPlanTable();
                showPlanWeek(week);
                showToast(strategy === 'gemini'
                    ? '✅ Đã phân tích lại kế hoạch bằng Gemini'
                    : draft.sourceMode === 'offline-spatial'
                        ? '✅ OCR đã tự ghép nội dung vào các cột kế hoạch'
                        : '⚠️ OCR đã đọc chữ nhưng vẫn cần thầy kiểm tra một số ô',
                draft.sourceMode === 'offline-ocr' ? 'info' : 'success');
            } catch (error) {
                console.error('Không thể phân tích lại kế hoạch:', error);
                showToast('❌ Không thể phân tích lại: ' + error.message, 'error');
            } finally {
                state.busy.plan = false;
                updateSharedPlanEditingControls();
                planStatus.innerHTML = '';
            }
        }

        function editPlanMeta(week) {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            const plan = state.planData.find(item => item.week === week);
            if (!plan) return;
            const weekInput = prompt(`Số tuần (1–${MAX_SCHOOL_WEEKS}; nhập -1 cho Tuần phụ 1, -2 cho Tuần phụ 2):`, String(plan.week));
            if (weekInput === null) return;
            const newWeek = Number.parseInt(weekInput, 10);
            if (!isValidPlanWeek(newWeek)) {
                showToast(`⚠️ Chỉ nhận Tuần 1–${MAX_SCHOOL_WEEKS}, Tuần phụ 1 (-1) hoặc Tuần phụ 2 (-2)`, 'error');
                return;
            }
            if (newWeek !== plan.week && state.planData.some(item => item.week === newWeek)) {
                showToast(`⚠️ Đã có dữ liệu ${getPlanWeekLabel(newWeek)}`, 'error');
                return;
            }
            const title = prompt('Tiêu đề kế hoạch:', plan.title);
            if (title === null) return;
            const calculatedRange = getWeekDateInfo(newWeek)?.rangeText || '';
            let dateRange = calculatedRange;
            if (!dateRange) {
                dateRange = prompt(`Khoảng ngày của ${getPlanWeekLabel(newWeek)}:`, plan.dateRange);
                if (dateRange === null) return;
            }
            const duty = prompt('Thông tin trực tuần:', plan.duty);
            if (duty === null) return;
            plan.week = newWeek;
            plan.title = cleanText(title) || 'LỊCH CÔNG TÁC';
            plan.schoolYear = state.selectedAcademicYear;
            plan.dateRange = cleanText(dateRange);
            plan.duty = cleanText(duty);
            plan.updatedAt = new Date().toISOString();
            state.planData.sort((a, b) => a.week - b.week);
            applyAutomaticDatesToPlan(plan);
            saveEditedPlan(plan, `Đã sửa thông tin ${getPlanWeekLabel(newWeek)}`);
        }

        function editPlanDay(week, dayIndex) {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            const plan = state.planData.find(item => item.week === week);
            const day = plan?.days?.[dayIndex];
            if (!day) return;
            const dayName = prompt('Thứ:', day.day);
            if (dayName === null) return;
            const normalizedDay = normalizeDayName(dayName);
            if (!PLAN_DAYS.includes(normalizedDay)) {
                showToast('⚠️ Ngày phải nằm trong khoảng Thứ 2 đến Chủ nhật', 'error');
                return;
            }
            let date = day.date;
            const automaticWeekDate = getWeekDateInfo(week);
            if (automaticWeekDate) {
                const calculatedDate = new Date(automaticWeekDate.start);
                calculatedDate.setDate(calculatedDate.getDate() + PLAN_DAYS.indexOf(normalizedDay));
                date = formatLocalDate(calculatedDate);
            } else {
                date = prompt(`${normalizedDay} — Ngày:`, day.date);
                if (date === null) return;
            }
            const morning = prompt(`${normalizedDay} ${date} — Buổi sáng:`, day.morning);
            if (morning === null) return;
            const afternoon = prompt(`${normalizedDay} ${date} — Buổi chiều:`, day.afternoon);
            if (afternoon === null) return;
            const businessTrip = prompt(`${normalizedDay} ${date} — Đi công tác:`, day.businessTrip);
            if (businessTrip === null) return;
            day.day = normalizedDay;
            day.date = cleanText(date);
            day.morning = normalizePlanCellText(morning);
            day.afternoon = normalizePlanCellText(afternoon);
            day.businessTrip = normalizePlanCellText(businessTrip);
            plan.days.sort((a, b) => planDayOrder(a.day) - planDayOrder(b.day));
            saveEditedPlan(plan, `Đã sửa ${day.day} của ${getPlanWeekLabel(week)}`);
        }

        function saveEditedPlan(plan, message) {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            plan.warnings = [];
            plan.updatedAt = new Date().toISOString();
            applyAutomaticDatesToPlan(plan);
            writeStoredJSON('teacher_plan_data', state.planData);
            persistActiveYearWorkspace();
            refreshRecognitionCache('plan', plan);
            invalidateTeachingSchedules('Kế hoạch nhà trường đã được chỉnh sửa');
            renderPlanTable();
            showPlanWeek(plan.week);
            showToast('✅ ' + message, 'success');
        }

        function deletePlan(week) {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            const weekLabel = getPlanWeekLabel(week);
            if (!confirm(`Xóa kế hoạch ${weekLabel}?`)) return;
            state.planData = state.planData.filter(p => p.week !== week);
            getActiveYearWorkspace().planData = state.planData;
            writeStoredJSON('teacher_plan_data', state.planData);
            persistActiveYearWorkspace();
            invalidateTeachingSchedules('Kế hoạch nhà trường đã thay đổi');
            renderPlanTable();
            renderPlanDetail(Number.parseInt(planWeekSelect.value, 10));
            showToast(`Đã xóa ${weekLabel}`, 'info');
        }

        planTableBody.addEventListener('click', event => {
            const button = event.target.closest('button[data-action][data-week]');
            if (!button) return;
            const week = Number.parseInt(button.dataset.week, 10);
            if (!week) return;
            if (button.dataset.action === 'view') {
                showPlanWeek(week, true);
            }
            if (button.dataset.action === 'delete') deletePlan(week);
        });

        planWeekSelect.addEventListener('change', () => {
            renderPlanDetail(Number.parseInt(planWeekSelect.value, 10));
        });

        addAuxiliaryPlanWeekBtn.addEventListener('click', () => {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            const auxiliaryWeek = AUXILIARY_PLAN_WEEKS.find(week => !state.planData.some(item => item.week === week));
            if (typeof auxiliaryWeek === 'undefined') {
                showToast('Đã đủ tối đa 2 tuần phụ trước khai giảng', 'info');
                return;
            }
            const plan = normalizePlanWeek({
                title: 'LỊCH CÔNG TÁC',
                schoolYear: state.selectedAcademicYear,
                week: auxiliaryWeek,
                dateRange: '',
                duty: '',
                days: PLAN_DAYS.map(day => ({ day, date: '', morning: '', afternoon: '', businessTrip: '' })),
                warnings: [],
                sourceMode: 'manual',
                status: 'done',
                updatedAt: new Date().toISOString(),
            });
            applyAutomaticDatesToPlan(plan);
            state.planData.push(plan);
            state.planData.sort((a, b) => a.week - b.week);
            writeStoredJSON('teacher_plan_data', state.planData);
            persistActiveYearWorkspace();
            renderPlanTable();
            showPlanWeek(auxiliaryWeek, true);
            showToast(`✅ Đã thêm ${getPlanWeekLabel(auxiliaryWeek)} trước khai giảng`, 'success');
        });

        planDetailDisplay.addEventListener('click', event => {
            const button = event.target.closest('button[data-plan-action][data-week]');
            if (!button) return;
            const week = Number.parseInt(button.dataset.week, 10);
            if (button.dataset.planAction === 'edit-meta') editPlanMeta(week);
            if (button.dataset.planAction === 'edit-day') {
                editPlanDay(week, Number.parseInt(button.dataset.dayIndex, 10));
            }
            if (button.dataset.planAction === 'copy-ocr') copyRecognitionText(state.planData.find(item => item.week === week)?.offlineOcrText || '');
            if (button.dataset.planAction === 'retry-gemini') reprocessPlanWeek(week, 'gemini');
            if (button.dataset.planAction === 'rebuild-spatial-ocr') reprocessPlanWeek(week, 'ocr');
        });

        clearPlanBtn.addEventListener('click', () => {
            if (!canEditSharedPlan()) {
                showSharedPlanReadOnlyNotice();
                return;
            }
            if (!confirm('Xóa toàn bộ kế hoạch?')) return;
            state.planData = [];
            getActiveYearWorkspace().planData = state.planData;
            writeStoredJSON('teacher_plan_data', state.planData);
            persistActiveYearWorkspace();
            invalidateTeachingSchedules('Kế hoạch nhà trường đã bị xóa');
            renderPlanTable();
            planWeekSelect.value = '';
            renderPlanDetail(0);
            showToast('Đã xóa tất cả kế hoạch', 'info');
        });
