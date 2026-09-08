        // ================================================================
        //  PLAN REVISION · v51.2
        //  So sánh ảnh lịch công tác điều chỉnh với bản tuần đang lưu.
        //  Nguyên tắc: không ghi đè trước khi giáo viên duyệt thay đổi.
        // ================================================================
        let planRevisionReviewContext = null;

        const PLAN_REVISION_CELL_FIELDS = [
            { key: 'morning', label: 'Buổi sáng', session: 'Buổi sáng' },
            { key: 'afternoon', label: 'Buổi chiều', session: 'Buổi chiều' },
            { key: 'businessTrip', label: 'Đi công tác', session: '' },
        ];

        function planRevisionComparableText(value) {
            return normalizePlanCellText(value)
                .normalize?.('NFC')
                ?.replace(/\s+/g, ' ')
                ?.trim()
                ?.toLocaleLowerCase?.('vi-VN') || '';
        }

        function getPlanRevisionDay(plan, dayName) {
            const normalizedDay = normalizeDayName(dayName);
            return (plan?.days || []).find(day => normalizeDayName(day?.day) === normalizedDay) || null;
        }

        function ensurePlanRevisionDay(plan, dayName) {
            const normalizedDay = normalizeDayName(dayName);
            let day = getPlanRevisionDay(plan, normalizedDay);
            if (day) return day;
            day = { day: normalizedDay, date: '', morning: '', afternoon: '', businessTrip: '' };
            if (!Array.isArray(plan.days)) plan.days = [];
            plan.days.push(day);
            return day;
        }

        function planRevisionFingerprint(plan) {
            if (!plan) return '';
            const payload = {
                week: Number.parseInt(plan.week, 10) || 0,
                title: planRevisionComparableText(plan.title),
                duty: planRevisionComparableText(plan.duty),
                days: PLAN_DAYS.map(dayName => {
                    const day = getPlanRevisionDay(plan, dayName) || {};
                    return [
                        normalizeDayName(dayName),
                        ...PLAN_REVISION_CELL_FIELDS.map(field => planRevisionComparableText(day[field.key])),
                    ];
                }),
            };
            return hashText(JSON.stringify(payload));
        }

        function buildPlanRevisionDiff(existingPlan, incomingPlan) {
            const existing = normalizePlanWeek(existingPlan);
            const incoming = normalizePlanWeek(incomingPlan);
            const week = Number.parseInt(incoming?.week || existing?.week, 10) || 0;
            const items = [];
            const counts = { added: 0, changed: 0, removed: 0, unchanged: 0 };

            if (!existing || !incoming || existing.week !== incoming.week) {
                return { week, existing, incoming, items, counts, comparable: false };
            }

            const pushDiff = ({ key, scope, day = '', field = '', label, before, after }) => {
                const beforeText = normalizePlanCellText(before);
                const afterText = normalizePlanCellText(after);
                const beforeSignature = planRevisionComparableText(beforeText);
                const afterSignature = planRevisionComparableText(afterText);
                if (beforeSignature === afterSignature) {
                    counts.unchanged++;
                    return;
                }
                let type = 'changed';
                if (!beforeSignature && afterSignature) type = 'added';
                else if (beforeSignature && !afterSignature) type = 'removed';
                counts[type]++;
                items.push({ key, scope, day, field, label, type, before: beforeText, after: afterText });
            };

            pushDiff({ key: 'meta:title', scope: 'meta', field: 'title', label: 'Tiêu đề', before: existing.title, after: incoming.title });
            pushDiff({ key: 'meta:duty', scope: 'meta', field: 'duty', label: 'Trực tuần', before: existing.duty, after: incoming.duty });

            PLAN_DAYS.forEach(dayName => {
                const beforeDay = getPlanRevisionDay(existing, dayName) || {};
                const afterDay = getPlanRevisionDay(incoming, dayName) || {};
                PLAN_REVISION_CELL_FIELDS.forEach(field => {
                    pushDiff({
                        key: `cell:${normalizeLookupText(dayName)}:${field.key}`,
                        scope: 'cell',
                        day: dayName,
                        field: field.key,
                        label: `${dayName} · ${field.label}`,
                        before: beforeDay[field.key],
                        after: afterDay[field.key],
                    });
                });
            });

            return {
                week,
                existing,
                incoming,
                items,
                counts,
                comparable: true,
                baseFingerprint: planRevisionFingerprint(existing),
                incomingFingerprint: planRevisionFingerprint(incoming),
            };
        }

        function planRevisionSelectedCounts(diff, selectedKeys = null) {
            const selected = selectedKeys instanceof Set ? selectedKeys : new Set((diff?.items || []).map(item => item.key));
            const counts = { added: 0, changed: 0, removed: 0, total: 0 };
            (diff?.items || []).forEach(item => {
                if (!selected.has(item.key)) return;
                if (Object.prototype.hasOwnProperty.call(counts, item.type)) counts[item.type]++;
                counts.total++;
            });
            return counts;
        }

        function summarizePlanRevisionDiff(diff, selectedKeys = null) {
            const counts = planRevisionSelectedCounts(diff, selectedKeys);
            if (!counts.total) return 'Không áp dụng thay đổi nào';
            const parts = [`${counts.total} thay đổi`];
            if (counts.added) parts.push(`+${counts.added} thêm`);
            if (counts.changed) parts.push(`↻${counts.changed} sửa`);
            if (counts.removed) parts.push(`−${counts.removed} bỏ`);
            return parts.join(' · ');
        }

        function applyPlanRevisionSelection(existingPlan, incomingPlan, diff, selectedKeys = null, mode = 'selected', options = {}) {
            if (!diff?.comparable || !existingPlan || !incomingPlan) throw new Error('Không thể hợp nhất hai kế hoạch khác tuần');
            const allKeys = new Set((diff.items || []).map(item => item.key));
            const selected = mode === 'replace'
                ? allKeys
                : selectedKeys instanceof Set ? selectedKeys : allKeys;
            const selectedItems = (diff.items || []).filter(item => selected.has(item.key));
            if (mode !== 'replace' && selectedItems.length === 0) throw new Error('Chưa chọn thay đổi nào để cập nhật');

            let merged = mode === 'replace'
                ? cloneRecognitionData(incomingPlan)
                : cloneRecognitionData(existingPlan);
            const existing = normalizePlanWeek(existingPlan);
            const incoming = normalizePlanWeek(incomingPlan);

            if (mode !== 'replace') {
                selectedItems.forEach(item => {
                    if (item.scope === 'meta') {
                        merged[item.field] = incoming[item.field];
                        return;
                    }
                    const targetDay = ensurePlanRevisionDay(merged, item.day);
                    const sourceDay = getPlanRevisionDay(incoming, item.day) || {};
                    targetDay[item.field] = normalizePlanCellText(sourceDay[item.field]);
                });
            }

            merged.week = existing.week;
            merged.schoolYear = state.selectedAcademicYear || existing.schoolYear;
            merged.sourceMode = mode === 'replace' ? incoming.sourceMode : 'revision-merge';
            merged.offlineOcrText = incoming.offlineOcrText || merged.offlineOcrText || '';
            merged.cacheHash = incoming.cacheHash || merged.cacheHash || '';
            merged.cacheHit = mode === 'replace' ? Boolean(incoming.cacheHit) : false;
            merged.fallbackReason = incoming.fallbackReason || '';
            merged.ocrLayoutConfidence = incoming.ocrLayoutConfidence;
            merged.warnings = mode === 'replace'
                ? [...(incoming.warnings || [])]
                : [...new Set([...(existing.warnings || []), ...(incoming.warnings || [])])].slice(0, 16);

            const at = new Date().toISOString();
            merged.updatedAt = at;
            applyAutomaticDatesToPlan(merged);
            let normalized = normalizePlanWeek(merged);
            if (!normalized) throw new Error('Kế hoạch sau khi hợp nhất không hợp lệ');

            const selectedCounts = planRevisionSelectedCounts(diff, selected);
            const summary = summarizePlanRevisionDiff(diff, selected);
            const history = Array.isArray(existing.revisionHistory) ? [...existing.revisionHistory] : [];
            const entry = {
                at,
                fileName: cleanText(options.fileName),
                mode,
                sourceMode: cleanText(incoming.sourceMode),
                appliedCount: selectedCounts.total,
                totalChanges: diff.items.length,
                added: selectedCounts.added,
                changed: selectedCounts.changed,
                removed: selectedCounts.removed,
                summary,
                changedKeys: selectedItems.map(item => item.key).slice(0, 32),
                beforeFingerprint: planRevisionFingerprint(existing),
                afterFingerprint: planRevisionFingerprint(normalized),
            };
            normalized.revisionHistory = [...history, entry].slice(-20);
            normalized.lastRevisionAt = at;
            normalized.lastRevisionSummary = summary;
            normalized.lastRevisionFileName = cleanText(options.fileName);
            normalized.updatedAt = at;
            return { plan: normalized, entry, selectedItems, selectedCounts };
        }

        function getPlanRevisionAffectedSourceSlots(week, diff, selectedKeys = null) {
            const schedule = state.teachingSchedule?.[week] || [];
            if (!schedule.length) return [];
            const selected = selectedKeys instanceof Set ? selectedKeys : new Set((diff?.items || []).map(item => item.key));
            const impacted = [];
            (diff?.items || []).forEach(item => {
                if (!selected.has(item.key) || item.scope !== 'cell') return;
                const sessions = item.field === 'morning'
                    ? ['Buổi sáng']
                    : item.field === 'afternoon'
                        ? ['Buổi chiều']
                        : item.field === 'businessTrip'
                            ? ['Buổi sáng', 'Buổi chiều']
                            : [];
                if (!sessions.length) return;
                schedule.forEach(row => {
                    if (normalizeDayName(row.day) !== normalizeDayName(item.day)) return;
                    if (!sessions.includes(normalizeSessionLabel(row.session))) return;
                    if (cleanText(row.sourceSlotKey)) impacted.push(cleanText(row.sourceSlotKey));
                });
            });
            return [...new Set(impacted)];
        }

        function planRevisionHasScheduleImpact(diff, selectedKeys = null) {
            const selected = selectedKeys instanceof Set ? selectedKeys : new Set((diff?.items || []).map(item => item.key));
            return (diff?.items || []).some(item => selected.has(item.key)
                && item.scope === 'cell'
                && ['morning', 'afternoon', 'businessTrip'].includes(item.field));
        }

        function planRevisionTypePresentation(type) {
            if (type === 'added') return { label: 'Thêm mới', icon: '＋' };
            if (type === 'removed') return { label: 'Bỏ', icon: '−' };
            return { label: 'Thay đổi', icon: '↻' };
        }

        function planRevisionPreviewText(value, type, side) {
            const text = normalizePlanCellText(value);
            if (text) return escapeHTML(text);
            if (type === 'removed' && side === 'after') return '<span class="plan-revision-empty removed">Bỏ nội dung này</span>';
            if (type === 'added' && side === 'before') return '<span class="plan-revision-empty">Chưa có</span>';
            return '<span class="plan-revision-empty">Trống</span>';
        }

        function renderPlanRevisionReview(context) {
            const { diff, incoming, fileName } = context;
            planUpdateCompareTitle.textContent = `🔄 Lịch công tác ${getPlanWeekLabel(diff.week)} có điều chỉnh`;
            planUpdateCompareSubtitle.textContent = `${fileName ? `${fileName} · ` : ''}So sánh ảnh mới với bản đang lưu. Chọn đúng thay đổi trước khi cập nhật.`;
            const counts = diff.counts;
            planUpdateCompareSummary.innerHTML = `
                <div class="plan-revision-summary-main"><strong>Phát hiện ${diff.items.length} thay đổi</strong><span>${counts.unchanged} vị trí giữ nguyên</span></div>
                <div class="plan-revision-badges">
                    <span class="plan-revision-badge added">＋ ${counts.added} thêm mới</span>
                    <span class="plan-revision-badge changed">↻ ${counts.changed} thay đổi</span>
                    <span class="plan-revision-badge removed">− ${counts.removed} bỏ</span>
                </div>`;

            const warnings = Array.isArray(incoming?.warnings) ? incoming.warnings.filter(Boolean) : [];
            planUpdateCompareWarning.hidden = warnings.length === 0;
            planUpdateCompareWarning.innerHTML = warnings.length
                ? `<strong>⚠️ Ảnh mới có ${warnings.length} lưu ý nhận dạng.</strong><ul>${warnings.slice(0, 5).map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul><span>Hãy kiểm tra kỹ các dòng bị bỏ hoặc đổi trước khi áp dụng.</span>`
                : '';

            const sourceMode = cleanText(incoming?.sourceMode);
            const removalsDefaultSelected = warnings.length === 0 && sourceMode.startsWith('gemini');
            const fullReplaceUnsafe = ['manual', 'offline-ocr'].includes(sourceMode);
            planUpdateReplaceAllBtn.disabled = fullReplaceUnsafe;
            planUpdateReplaceAllBtn.title = fullReplaceUnsafe
                ? 'Ảnh mới chưa đủ độ tin cậy để thay toàn bộ dữ liệu tuần. Hãy chọn từng thay đổi cần áp dụng.'
                : 'Thay toàn bộ nội dung tuần bằng nội dung nhận dạng từ ảnh mới';
            planUpdateCompareBody.innerHTML = diff.items.map((item, index) => {
                const presentation = planRevisionTypePresentation(item.type);
                const checked = item.type !== 'removed' || removalsDefaultSelected;
                return `<tr class="plan-revision-row ${item.type}">
                    <td class="plan-revision-check"><input type="checkbox" data-plan-revision-key="${escapeHTML(item.key)}" ${checked ? 'checked' : ''} aria-label="Chọn thay đổi ${index + 1}" /></td>
                    <td class="plan-revision-location"><strong>${escapeHTML(item.label)}</strong></td>
                    <td><span class="plan-revision-type ${item.type}">${presentation.icon} ${presentation.label}</span></td>
                    <td><div class="plan-revision-text before">${planRevisionPreviewText(item.before, item.type, 'before')}</div></td>
                    <td><div class="plan-revision-text after">${planRevisionPreviewText(item.after, item.type, 'after')}</div></td>
                </tr>`;
            }).join('');
            planUpdateSelectAll.checked = false;
            planUpdateSelectAll.indeterminate = false;
            updatePlanRevisionSelectionState();
            if (!removalsDefaultSelected && counts.removed > 0) {
                planUpdateSelectionMeta.textContent += ' · các mục bị bỏ đang chờ thầy xác nhận';
            }
        }

        function getPlanRevisionSelectedKeys() {
            return new Set(Array.from(planUpdateCompareBody.querySelectorAll('input[data-plan-revision-key]:checked'))
                .map(input => input.dataset.planRevisionKey));
        }

        function updatePlanRevisionSelectionState() {
            if (!planRevisionReviewContext) return;
            const checkboxes = Array.from(planUpdateCompareBody.querySelectorAll('input[data-plan-revision-key]'));
            const selected = checkboxes.filter(input => input.checked).length;
            planUpdateSelectAll.checked = checkboxes.length > 0 && selected === checkboxes.length;
            planUpdateSelectAll.indeterminate = selected > 0 && selected < checkboxes.length;
            planUpdateSelectionMeta.textContent = `${selected}/${checkboxes.length} thay đổi được chọn`;
            planUpdateApplyBtn.disabled = selected === 0;
            planUpdateApplyBtn.textContent = selected
                ? `✓ Cập nhật ${selected} thay đổi`
                : 'Chọn thay đổi cần cập nhật';
        }

        function settlePlanRevisionReview(result) {
            const context = planRevisionReviewContext;
            if (!context) return;
            planRevisionReviewContext = null;
            closeAppModal(planUpdateCompareModal);
            context.resolve(result);
        }

        function reviewPlanRevision(existingPlan, incomingPlan, options = {}) {
            const diff = buildPlanRevisionDiff(existingPlan, incomingPlan);
            if (!diff.comparable) {
                return Promise.resolve({ action: 'invalid', diff, selectedKeys: new Set(), baseFingerprint: '' });
            }
            if (!diff.items.length) {
                return Promise.resolve({ action: 'no-change', diff, selectedKeys: new Set(), baseFingerprint: diff.baseFingerprint });
            }
            if (planRevisionReviewContext) {
                settlePlanRevisionReview({ action: 'cancel', reason: 'superseded' });
            }
            return new Promise(resolve => {
                planRevisionReviewContext = {
                    resolve,
                    diff,
                    existing: normalizePlanWeek(existingPlan),
                    incoming: normalizePlanWeek(incomingPlan),
                    fileName: cleanText(options.fileName),
                    baseFingerprint: diff.baseFingerprint,
                };
                renderPlanRevisionReview(planRevisionReviewContext);
                openAppModal(planUpdateCompareModal, planUpdateApplyBtn);
            });
        }

        if (typeof planUpdateCompareBody !== 'undefined' && planUpdateCompareBody) {
            planUpdateCompareBody.addEventListener('change', event => {
                if (event.target.matches?.('input[data-plan-revision-key]')) updatePlanRevisionSelectionState();
            });
            planUpdateSelectAll.addEventListener('change', () => {
                Array.from(planUpdateCompareBody.querySelectorAll('input[data-plan-revision-key]')).forEach(input => {
                    input.checked = planUpdateSelectAll.checked;
                });
                updatePlanRevisionSelectionState();
            });
            planUpdateApplyBtn.addEventListener('click', () => {
                if (!planRevisionReviewContext) return;
                const selectedKeys = getPlanRevisionSelectedKeys();
                if (!selectedKeys.size) return;
                settlePlanRevisionReview({
                    action: 'apply',
                    mode: 'selected',
                    diff: planRevisionReviewContext.diff,
                    selectedKeys,
                    baseFingerprint: planRevisionReviewContext.baseFingerprint,
                    fileName: planRevisionReviewContext.fileName,
                });
            });
            planUpdateReplaceAllBtn.addEventListener('click', () => {
                if (!planRevisionReviewContext || planUpdateReplaceAllBtn.disabled) return;
                const incoming = planRevisionReviewContext.incoming;
                const warnings = Array.isArray(incoming?.warnings) ? incoming.warnings.filter(Boolean) : [];
                const sourceMode = cleanText(incoming?.sourceMode);
                if ((warnings.length || !sourceMode.startsWith('gemini'))
                    && !confirm('Ảnh mới còn cảnh báo hoặc đang dùng OCR dự phòng. Dùng toàn bộ ảnh mới có thể làm mất nội dung cũ nếu ảnh đọc thiếu. Thầy vẫn muốn thay toàn bộ tuần?')) return;
                const selectedKeys = new Set(planRevisionReviewContext.diff.items.map(item => item.key));
                settlePlanRevisionReview({
                    action: 'apply',
                    mode: 'replace',
                    diff: planRevisionReviewContext.diff,
                    selectedKeys,
                    baseFingerprint: planRevisionReviewContext.baseFingerprint,
                    fileName: planRevisionReviewContext.fileName,
                });
            });
            [planUpdateCancelBtn, planUpdateCompareCloseBtn].forEach(button => {
                button.addEventListener('click', () => settlePlanRevisionReview({ action: 'cancel' }));
            });
            planUpdateCompareModal.addEventListener('mousedown', event => {
                if (event.target === planUpdateCompareModal) settlePlanRevisionReview({ action: 'cancel' });
            });
            window.addEventListener('keydown', event => {
                if (planUpdateCompareModal.hidden || !planRevisionReviewContext) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    settlePlanRevisionReview({ action: 'cancel' });
                    return;
                }
                if (event.key !== 'Tab') return;
                const focusable = Array.from(planUpdateCompareModal.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(item => !item.hidden && item.offsetParent !== null);
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }, true);
        }
