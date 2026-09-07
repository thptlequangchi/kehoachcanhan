        // ================================================================
        //  PERSONAL GRADEBOOK — v51.4
        //  Dữ liệu nằm trong personal year workspace, không thuộc kế hoạch dùng chung.
        // ================================================================
        let gradebookPersistTimer = null;
        let gradebookInitialized = false;
        const gradebookUndoStack = [];

        function gradebookById(id) {
            return document.getElementById(id);
        }

        function gradebookEscapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function gradebookNormalizeKeyText(value) {
            return cleanText(value).toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
        }

        function gradebookCreateId(prefix = 'gb') {
            if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
            return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        function gradebookEnsureState() {
            state.gradebook = normalizeGradebookWorkspace(state.gradebook);
            const workspace = typeof getActiveYearWorkspace === 'function' ? getActiveYearWorkspace() : null;
            if (workspace) workspace.gradebook = state.gradebook;
            return state.gradebook;
        }

        function gradebookActiveBook() {
            const data = gradebookEnsureState();
            return data.selectedBookId && data.books[data.selectedBookId]
                ? data.books[data.selectedBookId]
                : null;
        }

        function gradebookBookLabel(book) {
            if (!book) return '';
            return `${book.className} · ${book.subject} · HK${book.semester}`;
        }

        function gradebookSortBooks(a, b) {
            return String(a?.className || '').localeCompare(String(b?.className || ''), 'vi', { numeric: true, sensitivity: 'base' })
                || String(a?.subject || '').localeCompare(String(b?.subject || ''), 'vi', { sensitivity: 'base' })
                || Number(a?.semester || 0) - Number(b?.semester || 0);
        }

        function gradebookCollectKnownOptions() {
            const classes = new Set();
            const subjects = new Set();
            const add = (set, value) => {
                const text = cleanText(value);
                if (text) set.add(text);
            };

            Object.values(state.timetablesByWeek || {}).forEach(timetable => {
                (timetable?.sessions || []).forEach(session => {
                    (session?.periods || []).forEach(period => {
                        (period?.cells || []).forEach(cell => {
                            add(classes, cell?.className);
                            add(subjects, cell?.subject);
                        });
                    });
                });
            });
            Object.values(state.teachingSchedule || {}).forEach(items => {
                if (!Array.isArray(items)) return;
                items.forEach(item => {
                    add(classes, item?.class);
                    add(subjects, item?.subject);
                });
            });
            Object.values(gradebookEnsureState().books || {}).forEach(book => {
                add(classes, book?.className);
                add(subjects, book?.subject);
            });
            add(subjects, state.teacherProfile?.subject || 'Toán');

            return {
                classes: [...classes].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' })),
                subjects: [...subjects].sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' })),
            };
        }

        function gradebookRenderSuggestions() {
            const { classes, subjects } = gradebookCollectKnownOptions();
            const classList = gradebookById('gradebookClassSuggestions');
            const subjectList = gradebookById('gradebookSubjectSuggestions');
            if (classList) classList.innerHTML = classes.map(value => `<option value="${gradebookEscapeHtml(value)}"></option>`).join('');
            if (subjectList) subjectList.innerHTML = subjects.map(value => `<option value="${gradebookEscapeHtml(value)}"></option>`).join('');
        }

        function gradebookFindBook(className, subject, semester) {
            const classKey = gradebookNormalizeKeyText(className);
            const subjectKey = gradebookNormalizeKeyText(subject);
            const semesterKey = String(semester);
            return Object.values(gradebookEnsureState().books || {}).find(book =>
                gradebookNormalizeKeyText(book.className) === classKey
                && gradebookNormalizeKeyText(book.subject) === subjectKey
                && String(book.semester) === semesterKey
            ) || null;
        }

        function gradebookSchedulePersist() {
            if (gradebookPersistTimer) clearTimeout(gradebookPersistTimer);
            gradebookPersistTimer = setTimeout(() => {
                gradebookPersistTimer = null;
                try {
                    if (typeof persistActiveYearWorkspace === 'function') persistActiveYearWorkspace();
                    if (typeof updateDataSafetySummary === 'function') updateDataSafetySummary();
                } catch (error) {
                    console.error('Không thể tự lưu Sổ điểm:', error);
                    window.teacherNotebookRecordError?.('gradebook-save', error, { source: 'Sổ điểm cá nhân' });
                }
            }, 350);
        }

        function gradebookPersistNow() {
            if (gradebookPersistTimer) {
                clearTimeout(gradebookPersistTimer);
                gradebookPersistTimer = null;
            }
            if (typeof persistActiveYearWorkspace === 'function') persistActiveYearWorkspace();
            if (typeof updateDataSafetySummary === 'function') updateDataSafetySummary();
        }

        function gradebookOpenOrCreateBook(options = {}) {
            const classInput = gradebookById('gradebookClassInput');
            const subjectInput = gradebookById('gradebookSubjectInput');
            const semesterSelect = gradebookById('gradebookSemesterSelect');
            const className = cleanText(classInput?.value);
            const subject = cleanText(subjectInput?.value) || cleanText(state.teacherProfile?.subject) || 'Toán';
            const semester = GRADEBOOK_SEMESTERS.includes(String(semesterSelect?.value)) ? String(semesterSelect.value) : '1';
            if (!className) {
                if (!options.silent) showToast('⚠️ Hãy nhập hoặc chọn lớp trước khi tạo sổ điểm', 'info');
                classInput?.focus();
                return null;
            }

            const data = gradebookEnsureState();
            let book = gradebookFindBook(className, subject, semester);
            let created = false;
            if (!book) {
                book = normalizeGradebookBook({
                    id: gradebookCreateId('gb'),
                    className,
                    subject,
                    semester,
                    regularColumns: GRADEBOOK_DEFAULT_REGULAR_COLUMNS,
                    students: [],
                    updatedAt: new Date().toISOString(),
                });
                data.books[book.id] = book;
                created = true;
            }
            data.selectedBookId = book.id;
            data.selectedClassName = book.className;
            data.selectedSubject = book.subject;
            data.selectedSemester = book.semester;
            state.gradebook = data;
            gradebookPersistNow();
            renderGradebook();
            if (created && !options.silent) showToast(`✅ Đã tạo Sổ điểm ${gradebookBookLabel(book)}`, 'success');
            return book;
        }

        function gradebookSelectBook(bookId) {
            const data = gradebookEnsureState();
            const book = data.books[bookId];
            if (!book) return false;
            data.selectedBookId = book.id;
            data.selectedClassName = book.className;
            data.selectedSubject = book.subject;
            data.selectedSemester = book.semester;
            state.gradebook = data;
            gradebookPersistNow();
            renderGradebook();
            return true;
        }

        function gradebookCalculateStudentAverage(student, book) {
            if (!student || !book) return null;
            const txValues = (student.scores?.tx || []).slice(0, book.regularColumns);
            if (txValues.length !== book.regularColumns || txValues.some(value => value === '' || value === null || typeof value === 'undefined')) return null;
            const midterm = student.scores?.midterm;
            const final = student.scores?.final;
            if (midterm === '' || final === '' || midterm === null || final === null || typeof midterm === 'undefined' || typeof final === 'undefined') return null;
            const txSum = txValues.reduce((sum, value) => sum + Number(value), 0);
            const average = (txSum + Number(midterm) * 2 + Number(final) * 3) / (book.regularColumns + 5);
            return Math.round(average * 10) / 10;
        }

        function gradebookCanEdit(book, quiet = false) {
            if (!book?.locked) return true;
            if (!quiet) showToast('🔒 Sổ điểm đang khóa. Mở khóa trước khi chỉnh sửa.', 'info');
            return false;
        }

        function gradebookScoreFieldLabel(field, txIndex = null) {
            if (field === 'tx') return `TX${Number(txIndex) + 1}`;
            if (field === 'midterm') return 'Giữa kỳ';
            if (field === 'final') return 'Cuối kỳ';
            return field || 'Điểm';
        }

        function gradebookRecordHistory(book, entry) {
            if (!book) return;
            if (!Array.isArray(book.history)) book.history = [];
            book.history.push({
                id: gradebookCreateId('gb-hist'),
                at: new Date().toISOString(),
                kind: entry.kind || 'score',
                studentId: entry.studentId || '',
                studentName: entry.studentName || '',
                field: entry.field || '',
                oldValue: entry.oldValue === '' ? '' : entry.oldValue,
                newValue: entry.newValue === '' ? '' : entry.newValue,
                detail: entry.detail || '',
            });
            if (book.history.length > 300) book.history = book.history.slice(-300);
        }

        function gradebookPushUndo(change) {
            gradebookUndoStack.push(change);
            if (gradebookUndoStack.length > 100) gradebookUndoStack.splice(0, gradebookUndoStack.length - 100);
        }

        function gradebookRenderHistory(book = gradebookActiveBook()) {
            const list = gradebookById('gradebookHistoryList');
            if (!list) return;
            const history = Array.isArray(book?.history) ? [...book.history].reverse().slice(0, 80) : [];
            list.innerHTML = history.length ? history.map(item => {
                const when = item.at ? new Date(item.at).toLocaleString('vi-VN') : '';
                const label = item.detail || `${item.studentName || 'Học sinh'} · ${item.field || 'Điểm'}`;
                const change = item.kind === 'bulk' ? 'Cập nhật hàng loạt' : `${item.oldValue === '' ? '—' : item.oldValue} → ${item.newValue === '' ? '—' : item.newValue}`;
                return `<div class="gradebook-history-item"><div><strong>${gradebookEscapeHtml(label)}</strong><small>${gradebookEscapeHtml(when)}</small></div><span class="change">${gradebookEscapeHtml(change)}</span></div>`;
            }).join('') : '<div class="gradebook-empty">Chưa có lịch sử chỉnh điểm.</div>';
        }

        function gradebookToggleLock() {
            const book = gradebookActiveBook();
            if (!book) return;
            if (book.locked) {
                if (!confirm('Mở khóa sổ điểm để tiếp tục chỉnh sửa?')) return;
                book.locked = false;
                book.lockedAt = '';
                showToast('🔓 Đã mở khóa sổ điểm', 'success');
            } else {
                if (!confirm('Khóa sổ điểm hiện tại? Sau khi khóa, thầy vẫn xem và xuất Excel nhưng không chỉnh sửa cho đến khi mở khóa.')) return;
                book.locked = true;
                book.lockedAt = new Date().toISOString();
                showToast('🔒 Đã khóa sổ điểm', 'success');
            }
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow();
            renderGradebook();
        }

        function gradebookUndoLastEdit() {
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book)) return;
            const change = gradebookUndoStack.pop();
            if (!change || change.bookId !== book.id) { showToast('Không còn thay đổi điểm để hoàn tác trong phiên này.', 'info'); return; }
            const student = gradebookFindStudent(book, change.studentId);
            if (!student) return;
            if (change.field === 'tx') student.scores.tx[change.txIndex] = change.oldValue;
            else if (change.field === 'midterm') student.scores.midterm = change.oldValue;
            else if (change.field === 'final') student.scores.final = change.oldValue;
            gradebookRecordHistory(book, { kind:'undo', studentId:student.id, studentName:student.name, field:gradebookScoreFieldLabel(change.field, change.txIndex), oldValue:change.newValue, newValue:change.oldValue, detail:`Hoàn tác · ${student.name} · ${gradebookScoreFieldLabel(change.field, change.txIndex)}` });
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow();
            renderGradebook();
            showToast('↶ Đã hoàn tác lần sửa điểm gần nhất', 'success');
        }

        function gradebookParseScoreTable(text) {
            const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            if (!lines.length) return [];
            const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
            const header = rows[0].map(value => gradebookNormalizeKeyText(value));
            const looksHeader = header.some(value => /họ.*tên|ho.*ten|tx\s*1|giữa.*kỳ|giu.*ky|cuối.*kỳ|cuoi.*ky/.test(value));
            let map = null;
            if (looksHeader) {
                map = { name:-1, tx:[], midterm:-1, final:-1, note:-1, stt:-1 };
                header.forEach((value, index) => {
                    if (/^(stt|tt)$/.test(value)) map.stt = index;
                    else if (/họ.*tên|ho.*ten|họ tên|ho ten/.test(value)) map.name = index;
                    else if (/^tx\s*[1-5]$/.test(value.replace(/\./g,''))) map.tx[Number(value.match(/[1-5]/)?.[0]) - 1] = index;
                    else if (/giữa.*kỳ|giu.*ky|^gk$/.test(value)) map.midterm = index;
                    else if (/cuối.*kỳ|cuoi.*ky|^ck$/.test(value)) map.final = index;
                    else if (/ghi.*chú|ghi.*chu|note/.test(value)) map.note = index;
                });
            }
            const dataRows = looksHeader ? rows.slice(1) : rows;
            return dataRows.map(cells => {
                let offset = 0;
                if (!map && /^\d+$/.test(cells[0] || '') && cells.length > 1) offset = 1;
                const name = map ? cells[map.name] : cells[offset];
                if (!cleanText(name)) return null;
                const tx = Array(GRADEBOOK_MAX_REGULAR_COLUMNS).fill('');
                let midterm = '', final = '', note = '', inferredTxCount = 0;
                if (map) {
                    map.tx.forEach((column, index) => { if (column >= 0) tx[index] = normalizeGradeScore(cells[column]); });
                    midterm = normalizeGradeScore(cells[map.midterm]);
                    final = normalizeGradeScore(cells[map.final]);
                    note = cleanText(cells[map.note]);
                    inferredTxCount = map.tx.filter(index => Number.isInteger(index) && index >= 0).length;
                } else {
                    const tail = cells.slice(offset + 1);
                    const scoreCells = [];
                    for (const cell of tail) {
                        const normalized = normalizeGradeScore(cell);
                        if (normalized === '' && cleanText(cell)) { note = tail.slice(scoreCells.length).join(' · '); break; }
                        scoreCells.push(normalized);
                    }
                    if (scoreCells.length >= 2) {
                        midterm = scoreCells[scoreCells.length - 2];
                        final = scoreCells[scoreCells.length - 1];
                        inferredTxCount = Math.min(GRADEBOOK_MAX_REGULAR_COLUMNS, Math.max(0, scoreCells.length - 2));
                        for (let index = 0; index < inferredTxCount; index++) tx[index] = scoreCells[index];
                    } else {
                        inferredTxCount = Math.min(GRADEBOOK_MAX_REGULAR_COLUMNS, scoreCells.length);
                        for (let index = 0; index < inferredTxCount; index++) tx[index] = scoreCells[index];
                    }
                }
                return {
                    name: cleanText(name), tx, midterm, final, note,
                    txCount: inferredTxCount,
                };
            }).filter(Boolean);
        }

        function gradebookApplyScoreTable() {
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book)) return;
            const rows = gradebookParseScoreTable(gradebookById('gradebookScoresTextarea')?.value);
            if (!rows.length) { showToast('Chưa nhận được dòng điểm hợp lệ.', 'info'); return; }
            const byName = new Map(book.students.map(student => [gradebookNormalizeKeyText(student.name), student]));
            let added = 0, updated = 0, maxTx = book.regularColumns;
            rows.forEach(row => {
                let student = byName.get(gradebookNormalizeKeyText(row.name));
                if (!student) {
                    student = normalizeGradebookStudent({ id:gradebookCreateId('hs'), name:row.name }, book.students.length);
                    book.students.push(student); byName.set(gradebookNormalizeKeyText(row.name), student); added += 1;
                } else updated += 1;
                row.tx.forEach((value, index) => { if (value !== '') student.scores.tx[index] = value; });
                if (row.midterm !== '') student.scores.midterm = row.midterm;
                if (row.final !== '') student.scores.final = row.final;
                if (row.note) student.note = row.note;
                maxTx = Math.max(maxTx, row.tx.reduce((count, value, index) => value !== '' ? Math.max(count, index + 1) : count, 0));
            });
            book.regularColumns = Math.min(GRADEBOOK_MAX_REGULAR_COLUMNS, Math.max(1, maxTx));
            gradebookRecordHistory(book, { kind:'bulk', detail:`Dán bảng điểm · ${rows.length} học sinh (${updated} cập nhật, ${added} thêm mới)` });
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow(); renderGradebook();
            const panel = gradebookById('gradebookPasteScoresPanel'); if (panel) panel.hidden = true;
            showToast(`✅ Đã áp dụng bảng điểm cho ${rows.length} học sinh`, 'success');
        }

        function gradebookHandleGridKeydown(event) {
            const input = event.target.closest('[data-gradebook-score][data-gradebook-student-id]');
            if (!input || event.key !== 'Enter') return;
            event.preventDefault();
            const inputs = [...gradebookById('gradebookTableWrap').querySelectorAll('[data-gradebook-score][data-gradebook-student-id]')];
            const current = inputs.indexOf(input);
            if (current < 0) return;
            const row = input.closest('tr');
            const rows = [...gradebookById('gradebookTableWrap').querySelectorAll('tbody tr')];
            const rowIndex = rows.indexOf(row);
            const colInputs = [...row.querySelectorAll('[data-gradebook-score]')];
            const colIndex = colInputs.indexOf(input);
            const nextRow = rows[rowIndex + 1];
            const next = nextRow?.querySelectorAll('[data-gradebook-score]')?.[colIndex];
            next?.focus(); next?.select?.();
        }

        function gradebookRenderBookStrip() {
            const strip = gradebookById('gradebookBookStrip');
            if (!strip) return;
            const data = gradebookEnsureState();
            const books = Object.values(data.books || {}).sort(gradebookSortBooks);
            strip.innerHTML = books.length
                ? books.map(book => `<button type="button" class="gradebook-book-chip${book.id === data.selectedBookId ? ' active' : ''}" data-gradebook-book-id="${gradebookEscapeHtml(book.id)}">${gradebookEscapeHtml(gradebookBookLabel(book))}</button>`).join('')
                : '<span class="gradebook-limit-note">Chưa có sổ điểm trong năm học này</span>';
        }

        function gradebookRenderStats(book) {
            const students = Array.isArray(book?.students) ? book.students : [];
            const averages = book ? students.map(student => gradebookCalculateStudentAverage(student, book)).filter(value => value !== null) : [];
            const classAverage = averages.length ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10 : null;
            const set = (id, value) => { const node = gradebookById(id); if (node) node.textContent = value; };
            set('gradebookStudentCount', String(students.length));
            set('gradebookRegularCount', `${book?.regularColumns || GRADEBOOK_DEFAULT_REGULAR_COLUMNS}/${GRADEBOOK_MAX_REGULAR_COLUMNS}`);
            set('gradebookClassAverage', classAverage === null ? '—' : classAverage.toFixed(1));
            set('gradebookIncompleteCount', String(book ? students.length - averages.length : 0));
        }

        function gradebookRenderTable(book) {
            const wrap = gradebookById('gradebookTableWrap');
            if (!wrap) return;
            if (!book) {
                wrap.innerHTML = '<div class="gradebook-empty">Chọn lớp, môn, học kỳ rồi nhấn <strong>“Mở / Tạo sổ”</strong>.</div>';
                return;
            }
            const disabled = book.locked ? 'disabled aria-disabled="true"' : '';
            const txHeaders = Array.from({ length: book.regularColumns }, (_, index) => `<th class="gradebook-score-header">TX${index + 1}</th>`).join('');
            const rows = book.students.length ? book.students.map((student, rowIndex) => {
                const txCells = Array.from({ length: book.regularColumns }, (_, txIndex) => {
                    const value = student.scores?.tx?.[txIndex];
                    return `<td><input class="gradebook-score-input" type="number" min="0" max="10" step="0.1" inputmode="decimal" value="${value === '' ? '' : gradebookEscapeHtml(value)}" aria-label="${gradebookEscapeHtml(student.name || `Học sinh ${rowIndex + 1}`)} TX${txIndex + 1}" data-gradebook-score="tx" data-gradebook-tx-index="${txIndex}" data-gradebook-student-id="${gradebookEscapeHtml(student.id)}" ${disabled} /></td>`;
                }).join('');
                const average = gradebookCalculateStudentAverage(student, book);
                return `<tr data-gradebook-row-id="${gradebookEscapeHtml(student.id)}">
                    <td class="gradebook-stt">${rowIndex + 1}</td>
                    <td><input class="gradebook-name-input" type="text" value="${gradebookEscapeHtml(student.name)}" placeholder="Họ và tên học sinh" autocomplete="off" data-gradebook-field="name" data-gradebook-student-id="${gradebookEscapeHtml(student.id)}" ${disabled} /></td>
                    ${txCells}
                    <td><input class="gradebook-score-input" type="number" min="0" max="10" step="0.1" inputmode="decimal" value="${student.scores?.midterm === '' ? '' : gradebookEscapeHtml(student.scores?.midterm)}" aria-label="Điểm giữa kỳ" data-gradebook-score="midterm" data-gradebook-student-id="${gradebookEscapeHtml(student.id)}" ${disabled} /></td>
                    <td><input class="gradebook-score-input" type="number" min="0" max="10" step="0.1" inputmode="decimal" value="${student.scores?.final === '' ? '' : gradebookEscapeHtml(student.scores?.final)}" aria-label="Điểm cuối kỳ" data-gradebook-score="final" data-gradebook-student-id="${gradebookEscapeHtml(student.id)}" ${disabled} /></td>
                    <td class="gradebook-average${average === null ? ' pending' : ''}" data-gradebook-average-id="${gradebookEscapeHtml(student.id)}">${average === null ? '—' : average.toFixed(1)}</td>
                    <td><input class="gradebook-note-input" type="text" value="${gradebookEscapeHtml(student.note)}" placeholder="Ghi chú" autocomplete="off" data-gradebook-field="note" data-gradebook-student-id="${gradebookEscapeHtml(student.id)}" ${disabled} /></td>
                    <td style="text-align:center"><button class="gradebook-delete-row" type="button" title="Xóa học sinh" aria-label="Xóa ${gradebookEscapeHtml(student.name || `học sinh ${rowIndex + 1}`)}" data-gradebook-delete-student="${gradebookEscapeHtml(student.id)}" ${book.locked ? 'disabled aria-disabled="true"' : ''}>🗑️</button></td>
                </tr>`;
            }).join('') : `<tr><td colspan="${book.regularColumns + 7}"><div class="gradebook-empty">Sổ chưa có học sinh. Chọn <strong>＋ Học sinh</strong> hoặc <strong>📋 Dán danh sách</strong>.</div></td></tr>`;

            wrap.innerHTML = `<table class="gradebook-table">
                <thead><tr>
                    <th style="width:54px">STT</th>
                    <th class="gradebook-name-header">Họ và tên</th>
                    ${txHeaders}
                    <th class="gradebook-score-header">GK</th>
                    <th class="gradebook-score-header">CK</th>
                    <th style="min-width:84px">ĐTB HK</th>
                    <th class="gradebook-note-header">Ghi chú</th>
                    <th class="gradebook-action-header">Xóa</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
        }

        function gradebookUpdateButtons(book) {
            const addRegular = gradebookById('gradebookAddRegularBtn');
            const removeRegular = gradebookById('gradebookRemoveRegularBtn');
            const addStudent = gradebookById('gradebookAddStudentBtn');
            const pasteRoster = gradebookById('gradebookPasteRosterBtn');
            const exportBtn = gradebookById('gradebookExportExcelBtn');
            const clearBtn = gradebookById('gradebookClearBookBtn');
            if (addRegular) {
                addRegular.disabled = !book || book.regularColumns >= GRADEBOOK_MAX_REGULAR_COLUMNS;
                addRegular.title = book?.regularColumns >= GRADEBOOK_MAX_REGULAR_COLUMNS ? 'Đã đạt tối đa 5 cột điểm thường xuyên' : 'Thêm một cột điểm thường xuyên';
            }
            if (removeRegular) removeRegular.disabled = !book || book.regularColumns <= 1;
            [addStudent, pasteRoster, clearBtn].forEach(button => { if (button) button.disabled = !book || Boolean(book?.locked); });
            if (exportBtn) exportBtn.disabled = !book;
            ['gradebookPasteScoresBtn','gradebookAddRegularBtn','gradebookRemoveRegularBtn'].forEach(id => { const button = gradebookById(id); if (button) button.disabled = !book || Boolean(book?.locked); });
            const undoBtn = gradebookById('gradebookUndoBtn'); if (undoBtn) undoBtn.disabled = !book || Boolean(book?.locked) || !gradebookUndoStack.some(item => item.bookId === book?.id);
            const historyBtn = gradebookById('gradebookHistoryBtn'); if (historyBtn) historyBtn.disabled = !book;
            const lockBtn = gradebookById('gradebookLockBtn'); if (lockBtn) lockBtn.disabled = !book;
        }

        function renderGradebook() {
            const data = gradebookEnsureState();
            const year = gradebookById('gradebookYearDisplay');
            if (year) year.value = state.selectedAcademicYear || state.teacherProfile?.academicYear || '';
            gradebookRenderSuggestions();

            let book = gradebookActiveBook();
            if (!book) {
                const books = Object.values(data.books || {}).sort(gradebookSortBooks);
                if (books.length && data.selectedBookId) book = books.find(item => item.id === data.selectedBookId) || null;
            }
            if (book) {
                data.selectedBookId = book.id;
                data.selectedClassName = book.className;
                data.selectedSubject = book.subject;
                data.selectedSemester = book.semester;
            }

            const classInput = gradebookById('gradebookClassInput');
            const subjectInput = gradebookById('gradebookSubjectInput');
            const semesterSelect = gradebookById('gradebookSemesterSelect');
            if (classInput) classInput.value = book?.className || data.selectedClassName || '';
            if (subjectInput) subjectInput.value = book?.subject || data.selectedSubject || state.teacherProfile?.subject || 'Toán';
            if (semesterSelect) semesterSelect.value = book?.semester || data.selectedSemester || '1';

            const subtitle = gradebookById('gradebookSubtitle');
            if (subtitle) subtitle.textContent = book
                ? `${gradebookBookLabel(book)} · lưu riêng theo năm học ${state.selectedAcademicYear}.`
                : 'Dữ liệu riêng của giáo viên, không đưa vào Kế hoạch trường dùng chung.';
            const footnote = gradebookById('gradebookFootnote');
            if (footnote) footnote.textContent = book
                ? `Đang dùng ${book.regularColumns}/5 cột thường xuyên. Điểm hợp lệ 0–10, tối đa 1 chữ số thập phân; tự lưu theo năm học ${state.selectedAcademicYear}.`
                : 'Điểm hợp lệ từ 0 đến 10, hỗ trợ 1 chữ số thập phân. Dữ liệu được lưu tự động theo năm học hiện tại.';

            gradebookRenderBookStrip();
            gradebookRenderStats(book);
            gradebookRenderTable(book);
            gradebookUpdateButtons(book);
            gradebookById('gradebookCard')?.classList.toggle('is-locked', Boolean(book?.locked));
            const lockBtn = gradebookById('gradebookLockBtn');
            if (lockBtn) lockBtn.textContent = book?.locked ? '🔓 Mở khóa' : '🔒 Khóa sổ';
            gradebookRenderHistory(book);
        }

        function gradebookFindStudent(book, studentId) {
            return book?.students?.find(student => student.id === studentId) || null;
        }

        function gradebookRefreshStudentAverage(book, studentId) {
            const node = document.querySelector(`[data-gradebook-average-id="${CSS.escape(studentId)}"]`);
            if (!node) return;
            const student = gradebookFindStudent(book, studentId);
            const average = gradebookCalculateStudentAverage(student, book);
            node.textContent = average === null ? '—' : average.toFixed(1);
            node.classList.toggle('pending', average === null);
            gradebookRenderStats(book);
        }

        function gradebookAddStudent() {
            const book = gradebookActiveBook() || gradebookOpenOrCreateBook();
            if (!book) return;
            const student = normalizeGradebookStudent({
                id: gradebookCreateId('hs'),
                name: '',
                scores: { tx: [], midterm: '', final: '' },
                note: '',
            }, book.students.length);
            book.students.push(student);
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow();
            renderGradebook();
            const input = document.querySelector(`[data-gradebook-field="name"][data-gradebook-student-id="${CSS.escape(student.id)}"]`);
            input?.focus();
        }

        function gradebookParseRoster(text) {
            return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
                let candidate = line;
                const tabParts = line.split(/\t+/).map(part => part.trim()).filter(Boolean);
                if (tabParts.length > 1) {
                    if (/^\d+[.)]?$/.test(tabParts[0])) candidate = tabParts.slice(1).join(' ');
                    else candidate = tabParts[0];
                }
                candidate = candidate.replace(/^\s*\d+\s*[.)-]?\s+/, '').trim();
                return candidate;
            }).filter(Boolean);
        }

        function gradebookApplyRoster() {
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book)) return;
            const textarea = gradebookById('gradebookRosterTextarea');
            const names = gradebookParseRoster(textarea?.value);
            if (!names.length) {
                showToast('⚠️ Chưa có tên học sinh hợp lệ để thêm', 'info');
                textarea?.focus();
                return;
            }
            names.forEach((name, index) => {
                const student = normalizeGradebookStudent({
                    id: gradebookCreateId('hs'),
                    name,
                    scores: { tx: [], midterm: '', final: '' },
                    note: '',
                }, book.students.length + index);
                book.students.push(student);
            });
            book.updatedAt = new Date().toISOString();
            if (textarea) textarea.value = '';
            const panel = gradebookById('gradebookPastePanel');
            if (panel) panel.hidden = true;
            gradebookPersistNow();
            renderGradebook();
            showToast(`✅ Đã thêm ${names.length} học sinh vào ${book.className}`, 'success');
        }

        function gradebookAddRegularColumn() {
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book)) return;
            if (book.regularColumns >= GRADEBOOK_MAX_REGULAR_COLUMNS) {
                showToast('ℹ️ Sổ điểm đã đạt tối đa 5 cột thường xuyên', 'info');
                return;
            }
            book.regularColumns += 1;
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow();
            renderGradebook();
            showToast(`✅ Đã thêm cột TX${book.regularColumns} (${book.regularColumns}/5)`, 'success');
        }

        function gradebookRemoveRegularColumn() {
            const book = gradebookActiveBook();
            if (!book || book.regularColumns <= 1) return;
            const removeIndex = book.regularColumns - 1;
            const hasData = book.students.some(student => student.scores?.tx?.[removeIndex] !== '' && student.scores?.tx?.[removeIndex] !== null && typeof student.scores?.tx?.[removeIndex] !== 'undefined');
            if (hasData && !confirm(`Cột TX${book.regularColumns} đang có điểm. Giảm cột sẽ xóa toàn bộ điểm ở cột này. Tiếp tục?`)) return;
            book.students.forEach(student => {
                if (!Array.isArray(student.scores.tx)) student.scores.tx = Array(GRADEBOOK_MAX_REGULAR_COLUMNS).fill('');
                student.scores.tx[removeIndex] = '';
            });
            book.regularColumns -= 1;
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow();
            renderGradebook();
        }

        function gradebookDeleteStudent(studentId) {
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book)) return;
            const student = gradebookFindStudent(book, studentId);
            if (!student) return;
            if (!confirm(`Xóa ${student.name || 'học sinh này'} khỏi sổ điểm?`)) return;
            book.students = book.students.filter(item => item.id !== studentId);
            book.updatedAt = new Date().toISOString();
            gradebookPersistNow();
            renderGradebook();
        }

        function gradebookDeleteCurrentBook() {
            const data = gradebookEnsureState();
            const book = gradebookActiveBook();
            if (!book) return;
            if (!confirm(`Xóa toàn bộ Sổ điểm ${gradebookBookLabel(book)} gồm ${book.students.length} học sinh?\n\nThao tác này chỉ xóa sổ đang mở.`)) return;
            delete data.books[book.id];
            const remaining = Object.values(data.books).sort(gradebookSortBooks);
            data.selectedBookId = remaining[0]?.id || '';
            if (remaining[0]) {
                data.selectedClassName = remaining[0].className;
                data.selectedSubject = remaining[0].subject;
                data.selectedSemester = remaining[0].semester;
            }
            state.gradebook = data;
            gradebookPersistNow();
            renderGradebook();
            showToast('✅ Đã xóa sổ điểm đã chọn', 'success');
        }

        function gradebookSafeFilePart(value) {
            return cleanText(value).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 60) || 'so-diem';
        }

        async function gradebookExportExcel() {
            const book = gradebookActiveBook();
            try { await ensureVendorLibrary('xlsx'); } catch (error) { showToast('❌ ' + error.message, 'error'); return; }
            if (!book) return;
            try {
                const headers = ['STT', 'Họ và tên', ...Array.from({ length: book.regularColumns }, (_, index) => `TX${index + 1}`), 'Giữa kỳ', 'Cuối kỳ', 'ĐTB HK', 'Ghi chú'];
                const rows = book.students.map((student, index) => [
                    index + 1,
                    student.name,
                    ...student.scores.tx.slice(0, book.regularColumns).map(value => value === '' ? '' : Number(value)),
                    student.scores.midterm === '' ? '' : Number(student.scores.midterm),
                    student.scores.final === '' ? '' : Number(student.scores.final),
                    gradebookCalculateStudentAverage(student, book) ?? '',
                    student.note,
                ]);
                const title = [`SỔ ĐIỂM CÁ NHÂN — ${book.className} — ${book.subject} — HỌC KỲ ${book.semester}`];
                const metadata = [
                    [`Năm học: ${state.selectedAcademicYear}`],
                    [`Giáo viên: ${cleanText(state.teacherProfile?.teacherName) || ''}`],
                    [],
                ];
                const sheet = XLSX.utils.aoa_to_sheet([...title, ...metadata, headers, ...rows]);
                sheet['!cols'] = [
                    { wch: 6 }, { wch: 28 },
                    ...Array.from({ length: book.regularColumns }, () => ({ wch: 8 })),
                    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 24 },
                ];
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, sheet, `HK${book.semester}`);
                const filename = `so-diem-${gradebookSafeFilePart(book.className)}-${gradebookSafeFilePart(book.subject)}-HK${book.semester}-${gradebookSafeFilePart(state.selectedAcademicYear)}.xlsx`;
                XLSX.writeFile(workbook, filename);
                showToast('✅ Đã xuất Sổ điểm ra Excel', 'success');
            } catch (error) {
                console.error('Không thể xuất Sổ điểm Excel:', error);
                showToast('❌ Không thể xuất Excel: ' + error.message, 'error');
            }
        }

        function gradebookHandleTableInput(event) {
            const input = event.target.closest('[data-gradebook-student-id]');
            if (!input) return;
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book, true)) { renderGradebook(); return; }
            const student = gradebookFindStudent(book, input.dataset.gradebookStudentId);
            if (!student) return;
            if (input.dataset.gradebookField === 'name') student.name = cleanText(input.value);
            if (input.dataset.gradebookField === 'note') student.note = cleanText(input.value);
            book.updatedAt = new Date().toISOString();
            gradebookSchedulePersist();
        }

        function gradebookHandleScoreChange(event) {
            const input = event.target.closest('[data-gradebook-score][data-gradebook-student-id]');
            if (!input) return;
            const book = gradebookActiveBook();
            if (!book || !gradebookCanEdit(book, true)) { renderGradebook(); return; }
            const student = gradebookFindStudent(book, input.dataset.gradebookStudentId);
            if (!student) return;
            const raw = String(input.value || '').trim();
            const score = normalizeGradeScore(raw);
            if (raw && score === '') {
                input.value = '';
                showToast('⚠️ Điểm phải nằm trong khoảng 0 đến 10', 'info');
            } else {
                input.value = score === '' ? '' : String(score);
            }
            const field = input.dataset.gradebookScore;
            const txIndex = field === 'tx' ? Number.parseInt(input.dataset.gradebookTxIndex, 10) : null;
            const oldValue = field === 'tx' ? student.scores.tx[txIndex] : field === 'midterm' ? student.scores.midterm : student.scores.final;
            if (field === 'tx') {
                if (txIndex >= 0 && txIndex < GRADEBOOK_MAX_REGULAR_COLUMNS) student.scores.tx[txIndex] = score;
            } else if (field === 'midterm') {
                student.scores.midterm = score;
            } else if (field === 'final') {
                student.scores.final = score;
            }
            if (oldValue !== score) {
                gradebookPushUndo({ bookId:book.id, studentId:student.id, field, txIndex, oldValue, newValue:score });
                gradebookRecordHistory(book, { kind:'score', studentId:student.id, studentName:student.name, field:gradebookScoreFieldLabel(field, txIndex), oldValue, newValue:score, detail:`${student.name} · ${gradebookScoreFieldLabel(field, txIndex)}` });
            }
            book.updatedAt = new Date().toISOString();
            gradebookRefreshStudentAverage(book, student.id);
            gradebookSchedulePersist();
        }

        function gradebookRememberSelectorDraft() {
            const data = gradebookEnsureState();
            data.selectedClassName = cleanText(gradebookById('gradebookClassInput')?.value);
            data.selectedSubject = cleanText(gradebookById('gradebookSubjectInput')?.value) || state.teacherProfile?.subject || 'Toán';
            const semester = String(gradebookById('gradebookSemesterSelect')?.value || '1');
            data.selectedSemester = GRADEBOOK_SEMESTERS.includes(semester) ? semester : '1';
            state.gradebook = data;
            gradebookSchedulePersist();
        }

        function initGradebook() {
            if (gradebookInitialized) return;
            const card = gradebookById('gradebookCard');
            if (!card) return;
            gradebookInitialized = true;

            gradebookById('gradebookOpenBtn')?.addEventListener('click', () => gradebookOpenOrCreateBook());
            gradebookById('gradebookAddStudentBtn')?.addEventListener('click', gradebookAddStudent);
            gradebookById('gradebookAddRegularBtn')?.addEventListener('click', gradebookAddRegularColumn);
            gradebookById('gradebookRemoveRegularBtn')?.addEventListener('click', gradebookRemoveRegularColumn);
            gradebookById('gradebookExportExcelBtn')?.addEventListener('click', gradebookExportExcel);
            gradebookById('gradebookClearBookBtn')?.addEventListener('click', gradebookDeleteCurrentBook);
            gradebookById('gradebookPasteRosterBtn')?.addEventListener('click', () => {
                const panel = gradebookById('gradebookPastePanel');
                if (panel) panel.hidden = false;
                gradebookById('gradebookRosterTextarea')?.focus();
            });
            gradebookById('gradebookClosePasteBtn')?.addEventListener('click', () => {
                const panel = gradebookById('gradebookPastePanel');
                if (panel) panel.hidden = true;
            });
            gradebookById('gradebookApplyRosterBtn')?.addEventListener('click', gradebookApplyRoster);
            gradebookById('gradebookPasteScoresBtn')?.addEventListener('click', () => { const panel = gradebookById('gradebookPasteScoresPanel'); if (panel) panel.hidden = false; gradebookById('gradebookScoresTextarea')?.focus(); });
            gradebookById('gradebookCloseScoresPasteBtn')?.addEventListener('click', () => { const panel = gradebookById('gradebookPasteScoresPanel'); if (panel) panel.hidden = true; });
            gradebookById('gradebookApplyScoresBtn')?.addEventListener('click', gradebookApplyScoreTable);
            gradebookById('gradebookUndoBtn')?.addEventListener('click', gradebookUndoLastEdit);
            gradebookById('gradebookLockBtn')?.addEventListener('click', gradebookToggleLock);
            gradebookById('gradebookHistoryBtn')?.addEventListener('click', () => { gradebookRenderHistory(); const panel = gradebookById('gradebookHistoryPanel'); if (panel) panel.hidden = false; });
            gradebookById('gradebookCloseHistoryBtn')?.addEventListener('click', () => { const panel = gradebookById('gradebookHistoryPanel'); if (panel) panel.hidden = true; });

            ['gradebookClassInput', 'gradebookSubjectInput', 'gradebookSemesterSelect'].forEach(id => {
                gradebookById(id)?.addEventListener('change', gradebookRememberSelectorDraft);
            });
            ['gradebookClassInput', 'gradebookSubjectInput'].forEach(id => {
                gradebookById(id)?.addEventListener('keydown', event => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    gradebookOpenOrCreateBook();
                });
            });

            gradebookById('gradebookBookStrip')?.addEventListener('click', event => {
                const button = event.target.closest('[data-gradebook-book-id]');
                if (button) gradebookSelectBook(button.dataset.gradebookBookId);
            });
            gradebookById('gradebookTableWrap')?.addEventListener('input', gradebookHandleTableInput);
            gradebookById('gradebookTableWrap')?.addEventListener('change', gradebookHandleScoreChange);
            gradebookById('gradebookTableWrap')?.addEventListener('keydown', gradebookHandleGridKeydown);
            gradebookById('gradebookTableWrap')?.addEventListener('click', event => {
                const button = event.target.closest('[data-gradebook-delete-student]');
                if (button) gradebookDeleteStudent(button.dataset.gradebookDeleteStudent);
            });

            renderGradebook();
        }
