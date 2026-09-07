        // ================================================================
        //  PERSONAL HOMEROOM NOTEBOOK — v51.5
        //  Hồ sơ lớp chủ nhiệm, chuyên cần/nề nếp, liên hệ PHHS và nhật ký lớp.
        //  Dữ liệu nằm trong personal year workspace như Sổ điểm cá nhân.
        // ================================================================
        let homeroomPersistTimer = null;
        let homeroomInitialized = false;

        const HOMEROOM_TYPE_META = {
            absence_excused: { label: 'Vắng có phép', icon: '🟡', tone: 'warning' },
            absence_unexcused: { label: 'Vắng không phép', icon: '🔴', tone: 'danger' },
            late: { label: 'Đi muộn', icon: '⏰', tone: 'warning' },
            violation: { label: 'Vi phạm', icon: '⚠️', tone: 'danger' },
            commendation: { label: 'Khen thưởng', icon: '🏅', tone: 'success' },
            parent_contact: { label: 'Trao đổi phụ huynh', icon: '☎️', tone: 'info' },
            support: { label: 'Hỗ trợ học sinh', icon: '🤝', tone: 'info' },
            note: { label: 'Ghi chú', icon: '📝', tone: 'neutral' },
            class_meeting: { label: 'Sinh hoạt lớp', icon: '👥', tone: 'info' },
            parent_meeting: { label: 'Họp phụ huynh', icon: '🏫', tone: 'info' },
            class_activity: { label: 'Hoạt động lớp', icon: '🎯', tone: 'success' },
        };

        function homeroomById(id) {
            return document.getElementById(id);
        }

        function homeroomEscapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function homeroomCreateId(prefix = 'cn') {
            if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
            return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        function homeroomNormalizeKeyText(value) {
            return cleanText(value).toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
        }

        function homeroomTodayISO() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function homeroomFormatDate(value) {
            const iso = normalizeHomeroomDate(value);
            if (!iso) return '';
            const [year, month, day] = iso.split('-');
            return `${day}/${month}/${year}`;
        }

        function homeroomEnsureState() {
            state.homeroom = normalizeHomeroomWorkspace(state.homeroom);
            const workspace = typeof getActiveYearWorkspace === 'function' ? getActiveYearWorkspace() : null;
            if (workspace) workspace.homeroom = state.homeroom;
            return state.homeroom;
        }

        function homeroomActiveBook() {
            const data = homeroomEnsureState();
            return data.selectedBookId && data.books[data.selectedBookId]
                ? data.books[data.selectedBookId]
                : null;
        }

        function homeroomFindBook(className) {
            const key = homeroomNormalizeKeyText(className);
            return Object.values(homeroomEnsureState().books || {}).find(book => homeroomNormalizeKeyText(book.className) === key) || null;
        }

        function homeroomFindStudent(book, studentId) {
            return book?.students?.find(student => student.id === studentId) || null;
        }

        function homeroomSchedulePersist() {
            if (homeroomPersistTimer) clearTimeout(homeroomPersistTimer);
            homeroomPersistTimer = setTimeout(() => {
                homeroomPersistTimer = null;
                try {
                    if (typeof persistActiveYearWorkspace === 'function') persistActiveYearWorkspace();
                    if (typeof updateDataSafetySummary === 'function') updateDataSafetySummary();
                } catch (error) {
                    console.error('Không thể tự lưu Sổ chủ nhiệm:', error);
                    window.teacherNotebookRecordError?.('homeroom-save', error, { source: 'Sổ chủ nhiệm' });
                }
            }, 220);
        }

        function homeroomCollectKnownClasses() {
            const classes = new Set();
            const add = value => {
                const text = cleanText(value);
                if (text) classes.add(text);
            };
            Object.values(state.timetablesByWeek || {}).forEach(timetable => {
                (timetable?.sessions || []).forEach(session => (session?.periods || []).forEach(period =>
                    (period?.cells || []).forEach(cell => add(cell?.className))
                ));
            });
            Object.values(state.teachingSchedule || {}).forEach(items => {
                if (Array.isArray(items)) items.forEach(item => add(item?.class));
            });
            Object.values(state.gradebook?.books || {}).forEach(book => add(book?.className));
            Object.values(homeroomEnsureState().books || {}).forEach(book => add(book?.className));
            return [...classes].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' }));
        }

        function homeroomRenderClassSuggestions() {
            const list = homeroomById('homeroomClassSuggestions');
            if (!list) return;
            list.innerHTML = homeroomCollectKnownClasses().map(value => `<option value="${homeroomEscapeHtml(value)}"></option>`).join('');
        }

        function homeroomSortedBooks() {
            return Object.values(homeroomEnsureState().books || {}).sort((a, b) =>
                String(a.className || '').localeCompare(String(b.className || ''), 'vi', { numeric: true, sensitivity: 'base' })
            );
        }

        function homeroomRenderBookStrip() {
            const strip = homeroomById('homeroomBookStrip');
            if (!strip) return;
            const data = homeroomEnsureState();
            const books = homeroomSortedBooks();
            strip.innerHTML = books.length ? books.map(book => `
                <button class="homeroom-book-chip ${book.id === data.selectedBookId ? 'active' : ''}" type="button" data-homeroom-book-id="${homeroomEscapeHtml(book.id)}">
                    <span>🏫</span><strong>${homeroomEscapeHtml(book.className)}</strong><small>${book.students.length} HS</small>
                </button>`).join('') : '<span class="homeroom-book-empty">Chưa có sổ chủ nhiệm trong năm học này.</span>';
        }

        function homeroomGetSelectedSemester() {
            const data = homeroomEnsureState();
            const value = String(homeroomById('homeroomSemesterSelect')?.value || data.selectedSemester || '1');
            return HOMEROOM_SEMESTERS.includes(value) ? value : '1';
        }

        function homeroomEntriesForSemester(book, semester = homeroomGetSelectedSemester()) {
            return (book?.entries || []).filter(entry => String(entry.semester) === String(semester));
        }

        function homeroomSummarizeBook(book, semester = '1') {
            const entries = homeroomEntriesForSemester(book, semester);
            const individual = entries.filter(entry => entry.studentId);
            const attentionTypes = new Set(['absence_unexcused', 'violation', 'support']);
            const attentionStudentIds = new Set(individual.filter(entry => attentionTypes.has(entry.type) && !entry.resolved).map(entry => entry.studentId));
            return {
                students: Array.isArray(book?.students) ? book.students.length : 0,
                absenceExcused: individual.filter(entry => entry.type === 'absence_excused').length,
                absenceUnexcused: individual.filter(entry => entry.type === 'absence_unexcused').length,
                commendations: individual.filter(entry => entry.type === 'commendation').length,
                attentionStudents: attentionStudentIds.size,
                parentContacts: individual.filter(entry => entry.type === 'parent_contact').length,
                entries: entries.length,
            };
        }

        function homeroomRenderStats(book) {
            const summary = homeroomSummarizeBook(book, homeroomGetSelectedSemester());
            const set = (id, value) => { const el = homeroomById(id); if (el) el.textContent = String(value); };
            set('homeroomStudentCount', summary.students);
            set('homeroomExcusedCount', summary.absenceExcused);
            set('homeroomUnexcusedCount', summary.absenceUnexcused);
            set('homeroomAttentionCount', summary.attentionStudents);
            const subtitle = homeroomById('homeroomSubtitle');
            if (subtitle) subtitle.textContent = book
                ? `${book.className} · Học kỳ ${homeroomGetSelectedSemester()} · ${summary.parentContacts} lượt trao đổi PHHS · ${summary.commendations} lượt khen thưởng.`
                : 'Hồ sơ lớp, chuyên cần, nề nếp, liên hệ phụ huynh và nhật ký chủ nhiệm — dữ liệu riêng của giáo viên.';
        }

        function homeroomStudentEntryCount(book, studentId, semester = homeroomGetSelectedSemester()) {
            return (book?.entries || []).filter(entry => entry.studentId === studentId && String(entry.semester) === String(semester)).length;
        }

        function homeroomRenderRoster(book) {
            const wrap = homeroomById('homeroomRosterWrap');
            if (!wrap) return;
            if (!book) {
                wrap.innerHTML = '<div class="homeroom-empty">Chọn lớp rồi nhấn <strong>“Mở / Tạo sổ”</strong>.</div>';
                return;
            }
            if (!book.students.length) {
                wrap.innerHTML = '<div class="homeroom-empty">Sổ chưa có học sinh. Có thể <strong>Dán danh sách</strong> hoặc <strong>Lấy DS từ Sổ điểm</strong>.</div>';
                return;
            }
            wrap.innerHTML = `<table class="homeroom-table">
                <thead><tr>
                    <th>STT</th><th class="homeroom-name-col">Họ và tên</th><th>Ngày sinh</th><th>Giới tính</th>
                    <th>Phụ huynh</th><th>SĐT PH</th><th>SĐT HS</th><th>Địa chỉ</th><th>Ghi chú</th><th>Theo dõi</th><th></th>
                </tr></thead>
                <tbody>${book.students.map((student, index) => {
                    const selected = homeroomEnsureState().selectedStudentId === student.id;
                    const entryCount = homeroomStudentEntryCount(book, student.id);
                    return `<tr class="${selected ? 'is-selected' : ''}" data-homeroom-student-row="${homeroomEscapeHtml(student.id)}">
                        <td class="homeroom-stt">${index + 1}</td>
                        <td><input class="homeroom-cell-input homeroom-name-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="name" value="${homeroomEscapeHtml(student.name)}" placeholder="Họ và tên" /></td>
                        <td><input class="homeroom-cell-input" type="date" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="birthDate" value="${homeroomEscapeHtml(student.birthDate)}" /></td>
                        <td><select class="homeroom-cell-select" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="gender">
                            <option value="" ${!student.gender ? 'selected' : ''}>—</option>
                            <option value="Nam" ${student.gender === 'Nam' ? 'selected' : ''}>Nam</option>
                            <option value="Nữ" ${student.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
                            <option value="Khác" ${student.gender === 'Khác' ? 'selected' : ''}>Khác</option>
                        </select></td>
                        <td><input class="homeroom-cell-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="parentName" value="${homeroomEscapeHtml(student.parentName)}" placeholder="Họ tên PH" /></td>
                        <td><input class="homeroom-cell-input homeroom-phone" inputmode="tel" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="parentPhone" value="${homeroomEscapeHtml(student.parentPhone)}" placeholder="SĐT" /></td>
                        <td><input class="homeroom-cell-input homeroom-phone" inputmode="tel" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="studentPhone" value="${homeroomEscapeHtml(student.studentPhone)}" placeholder="SĐT" /></td>
                        <td><input class="homeroom-cell-input homeroom-wide-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="address" value="${homeroomEscapeHtml(student.address)}" placeholder="Địa chỉ" /></td>
                        <td><input class="homeroom-cell-input homeroom-wide-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="note" value="${homeroomEscapeHtml(student.note)}" placeholder="Lưu ý" /></td>
                        <td><button class="homeroom-track-btn ${selected ? 'active' : ''}" type="button" data-homeroom-select-student="${homeroomEscapeHtml(student.id)}">📌 ${entryCount}</button></td>
                        <td><button class="homeroom-delete-btn" type="button" title="Xóa học sinh" data-homeroom-delete-student="${homeroomEscapeHtml(student.id)}">×</button></td>
                    </tr>`;
                }).join('')}</tbody>
            </table>`;
        }

        function homeroomEntryMeta(type) {
            return HOMEROOM_TYPE_META[type] || HOMEROOM_TYPE_META.note;
        }

        function homeroomRenderStudentSelector(book) {
            const select = homeroomById('homeroomStudentSelect');
            if (!select) return;
            const data = homeroomEnsureState();
            select.innerHTML = '<option value="">— Chọn học sinh —</option>' + (book?.students || []).map(student =>
                `<option value="${homeroomEscapeHtml(student.id)}" ${student.id === data.selectedStudentId ? 'selected' : ''}>${homeroomEscapeHtml(student.name || 'Chưa nhập tên')}</option>`
            ).join('');
        }

        function homeroomRenderStudentLog(book) {
            const list = homeroomById('homeroomStudentLogList');
            const data = homeroomEnsureState();
            if (!list) return;
            const student = homeroomFindStudent(book, data.selectedStudentId);
            const title = homeroomById('homeroomStudentLogTitle');
            if (title) title.textContent = student ? `Theo dõi: ${student.name || 'Học sinh chưa nhập tên'}` : 'Theo dõi học sinh';
            if (!book || !student) {
                list.innerHTML = '<div class="homeroom-mini-empty">Chọn một học sinh trong danh sách để ghi nhận chuyên cần, nề nếp hoặc trao đổi phụ huynh.</div>';
                return;
            }
            const semester = homeroomGetSelectedSemester();
            const entries = (book.entries || []).filter(entry => entry.studentId === student.id && String(entry.semester) === semester)
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            list.innerHTML = entries.length ? entries.map(entry => {
                const meta = homeroomEntryMeta(entry.type);
                return `<article class="homeroom-log-item tone-${meta.tone}">
                    <div class="homeroom-log-icon">${meta.icon}</div>
                    <div class="homeroom-log-main">
                        <div class="homeroom-log-head"><strong>${homeroomEscapeHtml(meta.label)}</strong><span>${homeroomEscapeHtml(homeroomFormatDate(entry.date) || 'Chưa ngày')}</span></div>
                        ${entry.content ? `<p>${homeroomEscapeHtml(entry.content)}</p>` : ''}
                        ${entry.followUp ? `<small>↳ Theo dõi: ${homeroomEscapeHtml(entry.followUp)}</small>` : ''}
                        <div class="homeroom-log-actions">
                            ${['absence_unexcused','violation','support'].includes(entry.type) ? `<button type="button" class="homeroom-resolve-btn ${entry.resolved ? 'done' : ''}" data-homeroom-toggle-resolved="${homeroomEscapeHtml(entry.id)}">${entry.resolved ? '✓ Đã xử lý' : '○ Chưa xử lý'}</button>` : ''}
                            <button type="button" class="homeroom-remove-log" data-homeroom-delete-entry="${homeroomEscapeHtml(entry.id)}">Xóa</button>
                        </div>
                    </div>
                </article>`;
            }).join('') : '<div class="homeroom-mini-empty">Học sinh này chưa có ghi nhận trong học kỳ đang chọn.</div>';
        }

        function homeroomRenderClassJournal(book) {
            const list = homeroomById('homeroomClassJournalList');
            if (!list) return;
            if (!book) {
                list.innerHTML = '<div class="homeroom-mini-empty">Chưa mở sổ chủ nhiệm.</div>';
                return;
            }
            const semester = homeroomGetSelectedSemester();
            const entries = (book.entries || []).filter(entry => !entry.studentId && String(entry.semester) === semester)
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            list.innerHTML = entries.length ? entries.map(entry => {
                const meta = homeroomEntryMeta(entry.type);
                return `<article class="homeroom-class-log">
                    <span class="homeroom-class-log-date">${homeroomEscapeHtml(homeroomFormatDate(entry.date) || '—')}</span>
                    <div><strong>${meta.icon} ${homeroomEscapeHtml(meta.label)}</strong><p>${homeroomEscapeHtml(entry.content || 'Không có nội dung')}</p></div>
                    <button type="button" class="homeroom-remove-log" data-homeroom-delete-entry="${homeroomEscapeHtml(entry.id)}">Xóa</button>
                </article>`;
            }).join('') : '<div class="homeroom-mini-empty">Chưa có nhật ký lớp trong học kỳ đang chọn.</div>';
        }

        function homeroomRenderControls(book) {
            const disabled = !book;
            ['homeroomAddStudentBtn','homeroomPasteRosterBtn','homeroomImportGradebookBtn','homeroomQuickLogBtn','homeroomExportExcelBtn','homeroomClearBookBtn'].forEach(id => {
                const button = homeroomById(id);
                if (button) button.disabled = disabled;
            });
            const studentForm = homeroomById('homeroomStudentLogForm');
            const classForm = homeroomById('homeroomClassLogForm');
            if (studentForm) [...studentForm.elements].forEach(el => el.disabled = disabled || (el.id !== 'homeroomStudentSelect' && !homeroomEnsureState().selectedStudentId));
            if (classForm) [...classForm.elements].forEach(el => el.disabled = disabled);
        }

        function renderHomeroom() {
            const card = homeroomById('homeroomCard');
            if (!card) return;
            const data = homeroomEnsureState();
            const book = homeroomActiveBook();
            const year = homeroomById('homeroomYearDisplay');
            if (year) year.value = state.selectedAcademicYear || '';
            const classInput = homeroomById('homeroomClassInput');
            const teacherInput = homeroomById('homeroomTeacherInput');
            const semesterSelect = homeroomById('homeroomSemesterSelect');
            if (classInput && document.activeElement !== classInput) classInput.value = book?.className || data.selectedClassName || '';
            if (teacherInput && document.activeElement !== teacherInput) teacherInput.value = book?.homeroomTeacher || state.teacherProfile?.teacherName || '';
            if (semesterSelect) semesterSelect.value = data.selectedSemester || '1';
            homeroomRenderClassSuggestions();
            homeroomRenderBookStrip();
            homeroomRenderStats(book);
            homeroomRenderRoster(book);
            homeroomRenderStudentSelector(book);
            homeroomRenderStudentLog(book);
            homeroomRenderClassJournal(book);
            homeroomRenderControls(book);
        }

        function homeroomOpenOrCreateBook() {
            const className = cleanText(homeroomById('homeroomClassInput')?.value);
            if (!className) {
                showToast('⚠️ Hãy nhập lớp chủ nhiệm', 'info');
                homeroomById('homeroomClassInput')?.focus();
                return;
            }
            const data = homeroomEnsureState();
            let book = homeroomFindBook(className);
            if (!book) {
                book = normalizeHomeroomBook({
                    id: homeroomCreateId('cn'),
                    className,
                    homeroomTeacher: cleanText(homeroomById('homeroomTeacherInput')?.value) || state.teacherProfile?.teacherName || '',
                    students: [],
                    entries: [],
                    updatedAt: new Date().toISOString(),
                });
                data.books[book.id] = book;
                showToast(`✅ Đã tạo Sổ chủ nhiệm lớp ${className}`, 'success');
            }
            data.selectedBookId = book.id;
            data.selectedClassName = book.className;
            data.selectedStudentId = book.students[0]?.id || '';
            book.homeroomTeacher = cleanText(homeroomById('homeroomTeacherInput')?.value) || book.homeroomTeacher || state.teacherProfile?.teacherName || '';
            state.homeroom = data;
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomSelectBook(bookId) {
            const data = homeroomEnsureState();
            const book = data.books[bookId];
            if (!book) return;
            data.selectedBookId = bookId;
            data.selectedClassName = book.className;
            data.selectedStudentId = book.students.some(student => student.id === data.selectedStudentId) ? data.selectedStudentId : (book.students[0]?.id || '');
            state.homeroom = data;
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomAddStudent() {
            const book = homeroomActiveBook();
            if (!book) return;
            const student = normalizeHomeroomStudent({ id: homeroomCreateId('cn-hs'), name: '' }, book.students.length);
            book.students.push(student);
            book.updatedAt = new Date().toISOString();
            homeroomEnsureState().selectedStudentId = student.id;
            homeroomSchedulePersist();
            renderHomeroom();
            requestAnimationFrame(() => {
                const target = [...(homeroomById('homeroomRosterWrap')?.querySelectorAll('[data-homeroom-student-id][data-homeroom-field="name"]') || [])]
                    .find(input => input.dataset.homeroomStudentId === student.id);
                target?.focus();
            });
        }

        function homeroomParseRoster(text) {
            const rows = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            return rows.map((line, index) => {
                const cols = line.includes('\t') ? line.split('\t').map(cleanText) : [cleanText(line)];
                if (cols.length === 1) {
                    const name = cols[0].replace(/^\s*\d+[.)\-:]?\s+/, '').trim();
                    return normalizeHomeroomStudent({ id: homeroomCreateId('cn-hs'), name }, index);
                }
                let offset = /^\d+[.)\-:]?$/.test(cols[0]) ? 1 : 0;
                const name = cols[offset] || '';
                return normalizeHomeroomStudent({
                    id: homeroomCreateId('cn-hs'),
                    name,
                    birthDate: cols[offset + 1] || '',
                    gender: cols[offset + 2] || '',
                    parentName: cols[offset + 3] || '',
                    parentPhone: cols[offset + 4] || '',
                    studentPhone: cols[offset + 5] || '',
                    address: cols[offset + 6] || '',
                }, index);
            }).filter(student => cleanText(student?.name));
        }

        function homeroomAppendUniqueStudents(book, students) {
            const existing = new Set((book.students || []).map(student => homeroomNormalizeKeyText(student.name)).filter(Boolean));
            let added = 0;
            students.forEach(student => {
                const key = homeroomNormalizeKeyText(student.name);
                if (!key || existing.has(key)) return;
                existing.add(key);
                book.students.push(student);
                added += 1;
            });
            if (added) {
                book.updatedAt = new Date().toISOString();
                if (!homeroomEnsureState().selectedStudentId) homeroomEnsureState().selectedStudentId = book.students[0]?.id || '';
                homeroomSchedulePersist();
            }
            return added;
        }

        function homeroomApplyRoster() {
            const book = homeroomActiveBook();
            if (!book) return;
            const textarea = homeroomById('homeroomRosterTextarea');
            const students = homeroomParseRoster(textarea?.value || '');
            if (!students.length) {
                showToast('⚠️ Chưa nhận được tên học sinh hợp lệ', 'info');
                return;
            }
            const added = homeroomAppendUniqueStudents(book, students);
            if (textarea) textarea.value = '';
            const panel = homeroomById('homeroomPastePanel');
            if (panel) panel.hidden = true;
            renderHomeroom();
            showToast(added ? `✅ Đã thêm ${added} học sinh vào Sổ chủ nhiệm` : 'ℹ️ Danh sách đã có đủ, không thêm trùng học sinh', added ? 'success' : 'info');
        }

        function homeroomImportFromGradebook() {
            const book = homeroomActiveBook();
            if (!book) return;
            const classKey = homeroomNormalizeKeyText(book.className);
            const names = [];
            Object.values(state.gradebook?.books || {}).forEach(gradebook => {
                if (homeroomNormalizeKeyText(gradebook?.className) !== classKey) return;
                (gradebook.students || []).forEach(student => {
                    if (cleanText(student?.name)) names.push(student.name);
                });
            });
            if (!names.length) {
                showToast(`ℹ️ Chưa có danh sách lớp ${book.className} trong Sổ điểm cá nhân`, 'info');
                return;
            }
            const students = names.map((name, index) => normalizeHomeroomStudent({ id: homeroomCreateId('cn-hs'), name }, index));
            const added = homeroomAppendUniqueStudents(book, students);
            renderHomeroom();
            showToast(added ? `✅ Đã lấy thêm ${added} học sinh từ Sổ điểm` : 'ℹ️ Danh sách Sổ chủ nhiệm đã trùng khớp Sổ điểm', added ? 'success' : 'info');
        }

        function homeroomHandleRosterInput(event) {
            const input = event.target.closest('[data-homeroom-student-id][data-homeroom-field]');
            if (!input) return;
            const book = homeroomActiveBook();
            const student = homeroomFindStudent(book, input.dataset.homeroomStudentId);
            if (!student) return;
            const field = input.dataset.homeroomField;
            if (!['name','birthDate','gender','parentName','parentPhone','studentPhone','address','note'].includes(field)) return;
            student[field] = field === 'birthDate' ? normalizeHomeroomDate(input.value) : cleanText(input.value);
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
        }

        function homeroomSelectStudent(studentId) {
            const data = homeroomEnsureState();
            const book = homeroomActiveBook();
            if (!homeroomFindStudent(book, studentId)) return;
            data.selectedStudentId = studentId;
            state.homeroom = data;
            homeroomSchedulePersist();
            renderHomeroom();
            requestAnimationFrame(() => homeroomById('homeroomStudentLogType')?.focus());
        }

        function homeroomDeleteStudent(studentId) {
            const book = homeroomActiveBook();
            const student = homeroomFindStudent(book, studentId);
            if (!book || !student) return;
            const related = (book.entries || []).filter(entry => entry.studentId === studentId).length;
            const message = related
                ? `Xóa ${student.name || 'học sinh này'} và ${related} ghi nhận theo dõi liên quan?`
                : `Xóa ${student.name || 'học sinh này'} khỏi Sổ chủ nhiệm?`;
            if (!confirm(message)) return;
            book.students = book.students.filter(item => item.id !== studentId);
            book.entries = book.entries.filter(entry => entry.studentId !== studentId);
            const data = homeroomEnsureState();
            if (data.selectedStudentId === studentId) data.selectedStudentId = book.students[0]?.id || '';
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomAddStudentEntry(event) {
            event.preventDefault();
            const book = homeroomActiveBook();
            const data = homeroomEnsureState();
            const student = homeroomFindStudent(book, data.selectedStudentId);
            if (!book || !student) {
                showToast('⚠️ Hãy chọn học sinh cần ghi nhận', 'info');
                return;
            }
            const type = cleanText(homeroomById('homeroomStudentLogType')?.value);
            const content = cleanText(homeroomById('homeroomStudentLogContent')?.value);
            const followUp = cleanText(homeroomById('homeroomStudentLogFollowUp')?.value);
            const date = normalizeHomeroomDate(homeroomById('homeroomStudentLogDate')?.value) || homeroomTodayISO();
            const entry = normalizeHomeroomEntry({
                id: homeroomCreateId('cn-log'),
                studentId: student.id,
                date,
                semester: homeroomGetSelectedSemester(),
                type,
                content,
                followUp,
                resolved: false,
                createdAt: new Date().toISOString(),
            }, book.entries.length);
            book.entries.push(entry);
            book.updatedAt = new Date().toISOString();
            homeroomById('homeroomStudentLogContent').value = '';
            homeroomById('homeroomStudentLogFollowUp').value = '';
            homeroomSchedulePersist();
            renderHomeroom();
            showToast(`✅ Đã ghi nhận ${homeroomEntryMeta(type).label} cho ${student.name || 'học sinh'}`, 'success');
        }

        function homeroomAddClassEntry(event) {
            event.preventDefault();
            const book = homeroomActiveBook();
            if (!book) return;
            const content = cleanText(homeroomById('homeroomClassLogContent')?.value);
            if (!content) {
                showToast('⚠️ Hãy nhập nội dung nhật ký lớp', 'info');
                return;
            }
            const entry = normalizeHomeroomEntry({
                id: homeroomCreateId('cn-log'),
                studentId: '',
                date: normalizeHomeroomDate(homeroomById('homeroomClassLogDate')?.value) || homeroomTodayISO(),
                semester: homeroomGetSelectedSemester(),
                type: cleanText(homeroomById('homeroomClassLogType')?.value) || 'class_meeting',
                content,
                createdAt: new Date().toISOString(),
            }, book.entries.length);
            book.entries.push(entry);
            book.updatedAt = new Date().toISOString();
            homeroomById('homeroomClassLogContent').value = '';
            homeroomSchedulePersist();
            renderHomeroom();
            showToast('✅ Đã thêm nhật ký lớp', 'success');
        }

        function homeroomToggleResolved(entryId) {
            const book = homeroomActiveBook();
            const entry = book?.entries?.find(item => item.id === entryId);
            if (!entry) return;
            entry.resolved = !entry.resolved;
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomDeleteEntry(entryId) {
            const book = homeroomActiveBook();
            const entry = book?.entries?.find(item => item.id === entryId);
            if (!book || !entry) return;
            if (!confirm('Xóa ghi nhận này khỏi Sổ chủ nhiệm?')) return;
            book.entries = book.entries.filter(item => item.id !== entryId);
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomDeleteCurrentBook() {
            const data = homeroomEnsureState();
            const book = homeroomActiveBook();
            if (!book) return;
            if (!confirm(`Xóa toàn bộ Sổ chủ nhiệm lớp ${book.className}? Hành động này xóa hồ sơ học sinh và toàn bộ nhật ký của lớp trong năm học ${state.selectedAcademicYear}.`)) return;
            delete data.books[book.id];
            data.selectedBookId = '';
            data.selectedClassName = '';
            data.selectedStudentId = '';
            state.homeroom = data;
            homeroomSchedulePersist();
            renderHomeroom();
            showToast('✅ Đã xóa Sổ chủ nhiệm', 'success');
        }

        function homeroomSafeFilePart(value) {
            return cleanText(value).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 60) || 'lop';
        }

        function homeroomExportExcel() {
            const book = homeroomActiveBook();
            if (!book) return;
            if (!globalThis.XLSX) {
                showToast('❌ Chưa nạp thư viện Excel. Hãy kết nối mạng rồi tải lại trang.', 'error');
                return;
            }
            try {
                const semester = homeroomGetSelectedSemester();
                const summary = homeroomSummarizeBook(book, semester);
                const studentMap = new Map(book.students.map(student => [student.id, student.name]));
                const wb = XLSX.utils.book_new();
                const profileRows = book.students.map((student, index) => ({
                    'STT': index + 1,
                    'Họ và tên': student.name,
                    'Ngày sinh': homeroomFormatDate(student.birthDate),
                    'Giới tính': student.gender,
                    'Phụ huynh': student.parentName,
                    'SĐT phụ huynh': student.parentPhone,
                    'SĐT học sinh': student.studentPhone,
                    'Địa chỉ': student.address,
                    'Ghi chú': student.note,
                }));
                const individualRows = (book.entries || []).filter(entry => entry.studentId).map(entry => ({
                    'Ngày': homeroomFormatDate(entry.date),
                    'Học kỳ': `HK${entry.semester}`,
                    'Học sinh': studentMap.get(entry.studentId) || '',
                    'Loại ghi nhận': homeroomEntryMeta(entry.type).label,
                    'Nội dung': entry.content,
                    'Theo dõi / biện pháp': entry.followUp,
                    'Trạng thái': ['absence_unexcused','violation','support'].includes(entry.type) ? (entry.resolved ? 'Đã xử lý' : 'Chưa xử lý') : '',
                }));
                const classRows = (book.entries || []).filter(entry => !entry.studentId).map(entry => ({
                    'Ngày': homeroomFormatDate(entry.date),
                    'Học kỳ': `HK${entry.semester}`,
                    'Loại': homeroomEntryMeta(entry.type).label,
                    'Nội dung': entry.content,
                }));
                const summaryRows = [
                    ['SỔ CHỦ NHIỆM CÁ NHÂN'],
                    ['Năm học', state.selectedAcademicYear],
                    ['Lớp', book.className],
                    ['Giáo viên chủ nhiệm', book.homeroomTeacher || state.teacherProfile?.teacherName || ''],
                    ['Học kỳ đang xem', `Học kỳ ${semester}`],
                    ['Sĩ số', summary.students],
                    ['Vắng có phép', summary.absenceExcused],
                    ['Vắng không phép', summary.absenceUnexcused],
                    ['Học sinh cần theo dõi', summary.attentionStudents],
                    ['Trao đổi phụ huynh', summary.parentContacts],
                    ['Khen thưởng', summary.commendations],
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Tổng quan');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileRows), 'Hồ sơ học sinh');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(individualRows), 'Theo dõi học sinh');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classRows), 'Nhật ký lớp');
                XLSX.writeFile(wb, `so-chu-nhiem-${homeroomSafeFilePart(book.className)}-${homeroomSafeFilePart(state.selectedAcademicYear)}.xlsx`);
                showToast('✅ Đã xuất Sổ chủ nhiệm ra Excel', 'success');
            } catch (error) {
                console.error('Không thể xuất Sổ chủ nhiệm:', error);
                showToast('❌ Không thể xuất Excel: ' + error.message, 'error');
            }
        }

        function homeroomRememberSelectorDraft() {
            const data = homeroomEnsureState();
            data.selectedClassName = cleanText(homeroomById('homeroomClassInput')?.value);
            data.selectedSemester = HOMEROOM_SEMESTERS.includes(String(homeroomById('homeroomSemesterSelect')?.value))
                ? String(homeroomById('homeroomSemesterSelect')?.value) : '1';
            const book = homeroomActiveBook();
            if (book) {
                book.homeroomTeacher = cleanText(homeroomById('homeroomTeacherInput')?.value) || book.homeroomTeacher;
                book.updatedAt = new Date().toISOString();
            }
            state.homeroom = data;
            homeroomSchedulePersist();
        }

        function initHomeroom() {
            if (homeroomInitialized) return;
            const card = homeroomById('homeroomCard');
            if (!card) return;
            homeroomInitialized = true;

            homeroomById('homeroomOpenBtn')?.addEventListener('click', homeroomOpenOrCreateBook);
            homeroomById('homeroomAddStudentBtn')?.addEventListener('click', homeroomAddStudent);
            homeroomById('homeroomImportGradebookBtn')?.addEventListener('click', homeroomImportFromGradebook);
            homeroomById('homeroomExportExcelBtn')?.addEventListener('click', homeroomExportExcel);
            homeroomById('homeroomClearBookBtn')?.addEventListener('click', homeroomDeleteCurrentBook);
            homeroomById('homeroomQuickLogBtn')?.addEventListener('click', () => {
                homeroomById('homeroomStudentLogPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                homeroomById('homeroomStudentSelect')?.focus();
            });
            homeroomById('homeroomPasteRosterBtn')?.addEventListener('click', () => {
                const panel = homeroomById('homeroomPastePanel');
                if (panel) panel.hidden = false;
                homeroomById('homeroomRosterTextarea')?.focus();
            });
            homeroomById('homeroomClosePasteBtn')?.addEventListener('click', () => {
                const panel = homeroomById('homeroomPastePanel');
                if (panel) panel.hidden = true;
            });
            homeroomById('homeroomApplyRosterBtn')?.addEventListener('click', homeroomApplyRoster);
            homeroomById('homeroomStudentLogForm')?.addEventListener('submit', homeroomAddStudentEntry);
            homeroomById('homeroomClassLogForm')?.addEventListener('submit', homeroomAddClassEntry);

            ['homeroomClassInput','homeroomTeacherInput','homeroomSemesterSelect'].forEach(id => {
                homeroomById(id)?.addEventListener('change', () => {
                    homeroomRememberSelectorDraft();
                    if (id === 'homeroomSemesterSelect') renderHomeroom();
                });
            });
            homeroomById('homeroomClassInput')?.addEventListener('keydown', event => {
                if (event.key === 'Enter') { event.preventDefault(); homeroomOpenOrCreateBook(); }
            });
            homeroomById('homeroomBookStrip')?.addEventListener('click', event => {
                const button = event.target.closest('[data-homeroom-book-id]');
                if (button) homeroomSelectBook(button.dataset.homeroomBookId);
            });
            homeroomById('homeroomRosterWrap')?.addEventListener('input', homeroomHandleRosterInput);
            homeroomById('homeroomRosterWrap')?.addEventListener('change', homeroomHandleRosterInput);
            homeroomById('homeroomRosterWrap')?.addEventListener('click', event => {
                const selectButton = event.target.closest('[data-homeroom-select-student]');
                if (selectButton) homeroomSelectStudent(selectButton.dataset.homeroomSelectStudent);
                const deleteButton = event.target.closest('[data-homeroom-delete-student]');
                if (deleteButton) homeroomDeleteStudent(deleteButton.dataset.homeroomDeleteStudent);
            });
            homeroomById('homeroomStudentSelect')?.addEventListener('change', event => homeroomSelectStudent(event.target.value));
            homeroomById('homeroomStudentLogList')?.addEventListener('click', event => {
                const toggle = event.target.closest('[data-homeroom-toggle-resolved]');
                if (toggle) homeroomToggleResolved(toggle.dataset.homeroomToggleResolved);
                const remove = event.target.closest('[data-homeroom-delete-entry]');
                if (remove) homeroomDeleteEntry(remove.dataset.homeroomDeleteEntry);
            });
            homeroomById('homeroomClassJournalList')?.addEventListener('click', event => {
                const remove = event.target.closest('[data-homeroom-delete-entry]');
                if (remove) homeroomDeleteEntry(remove.dataset.homeroomDeleteEntry);
            });

            const date = homeroomTodayISO();
            if (homeroomById('homeroomStudentLogDate')) homeroomById('homeroomStudentLogDate').value = date;
            if (homeroomById('homeroomClassLogDate')) homeroomById('homeroomClassLogDate').value = date;
            renderHomeroom();
        }
