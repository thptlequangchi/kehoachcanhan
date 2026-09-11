        // ================================================================
        //  PERSONAL HOMEROOM NOTEBOOK — v53.1
        //  Hồ sơ lớp chủ nhiệm, chuyên cần/nề nếp, liên hệ PHHS và nhật ký lớp.
        //  Dữ liệu nằm trong personal year workspace như Sổ điểm cá nhân.
        // ================================================================
        let homeroomPersistTimer = null;
        let homeroomInitialized = false;
        let homeroomRosterSearch = '';
        let homeroomRosterFilter = 'all';
        let homeroomPrivacyHidden = true;
        let homeroomMonitoringView = 'flagged';
        let homeroomWeekAnchorDate = '';

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

        const HOMEROOM_CLASS_ROLE_META = Object.freeze([
            { id:'classPresident', label:'Lớp trưởng', icon:'⭐' },
            { id:'viceAcademic', label:'Lớp phó học tập', icon:'📚' },
            { id:'viceLabor', label:'Lớp phó lao động', icon:'🧹' },
            { id:'viceArts', label:'Lớp phó văn nghệ', icon:'🎤' },
            { id:'secretary', label:'Bí thư', icon:'🚩' },
            { id:'deputySecretary', label:'Phó Bí thư', icon:'🏷️' },
            { id:'treasurer', label:'Thủ quỹ', icon:'💰' },
            { id:'redFlag', label:'Sao đỏ / Cờ đỏ', icon:'📍' },
            { id:'viceSports', label:'Lớp phó thể thao', icon:'🏃' },
        ]);

        const HOMEROOM_SEVERITY_META = {
            neutral: { label: 'Không xếp mức', short: '—', icon: '•' },
            positive: { label: 'Tích cực', short: 'Tốt', icon: '✨' },
            light: { label: 'Nhẹ', short: 'Nhẹ', icon: '🟢' },
            medium: { label: 'Trung bình', short: 'TB', icon: '🟡' },
            heavy: { label: 'Nặng', short: 'Nặng', icon: '🟠' },
            critical: { label: 'Nghiêm trọng', short: 'Nghiêm trọng', icon: '🔴' },
        };

        const HOMEROOM_CONDUCT_RULES = [
            { group:'Chuyên cần', id:'attendance_full_week', label:'Đi học đầy đủ, đúng giờ cả tuần', type:'commendation', points:2, severity:'positive' },
            { group:'Chuyên cần', id:'late_under_5', label:'Đi muộn dưới 5 phút', type:'late', points:-1, severity:'light' },
            { group:'Chuyên cần', id:'late_5_15', label:'Đi muộn từ 5–15 phút', type:'late', points:-2, severity:'light' },
            { group:'Chuyên cần', id:'late_over_15', label:'Đi muộn trên 15 phút', type:'late', points:-3, severity:'medium' },
            { group:'Chuyên cần', id:'absence_excused', label:'Vắng có phép', type:'absence_excused', points:0, severity:'neutral' },
            { group:'Chuyên cần', id:'absence_unexcused_period', label:'Vắng không phép 1 tiết', type:'absence_unexcused', points:-4, severity:'medium' },
            { group:'Chuyên cần', id:'absence_unexcused_session', label:'Vắng không phép 1 buổi', type:'absence_unexcused', points:-8, severity:'heavy' },
            { group:'Chuyên cần', id:'skip_class', label:'Bỏ tiết / trốn tiết', type:'violation', points:-10, severity:'heavy' },
            { group:'Học tập', id:'teacher_praise', label:'Được giáo viên bộ môn tuyên dương', type:'commendation', points:2, severity:'positive' },
            { group:'Học tập', id:'academic_progress', label:'Có tiến bộ rõ rệt trong học tập', type:'commendation', points:2, severity:'positive' },
            { group:'Học tập', id:'active_participation', label:'Tích cực phát biểu, xây dựng bài', type:'commendation', points:1, severity:'positive' },
            { group:'Học tập', id:'help_study', label:'Giúp đỡ bạn học tập hiệu quả', type:'commendation', points:1, severity:'positive' },
            { group:'Học tập', id:'unprepared', label:'Không học bài / không chuẩn bị bài', type:'violation', points:-2, severity:'light' },
            { group:'Học tập', id:'homework_missing', label:'Không làm bài tập', type:'violation', points:-2, severity:'light' },
            { group:'Học tập', id:'missing_materials', label:'Thiếu sách, vở hoặc đồ dùng học tập', type:'violation', points:-1, severity:'light' },
            { group:'Học tập', id:'off_task', label:'Làm việc riêng trong giờ', type:'violation', points:-2, severity:'light' },
            { group:'Học tập', id:'sleeping', label:'Ngủ trong giờ học', type:'violation', points:-2, severity:'light' },
            { group:'Học tập', id:'cheating_light', label:'Gian lận trong kiểm tra mức nhẹ', type:'violation', points:-8, severity:'heavy' },
            { group:'Học tập', id:'cheating_repeat', label:'Gian lận có tổ chức / tái phạm', type:'violation', points:-15, severity:'heavy' },
            { group:'Nề nếp', id:'rules_good_week', label:'Thực hiện tốt nội quy cả tuần', type:'commendation', points:2, severity:'positive' },
            { group:'Nề nếp', id:'uniform', label:'Không đúng đồng phục', type:'violation', points:-1, severity:'light' },
            { group:'Nề nếp', id:'student_badge', label:'Không đeo thẻ học sinh', type:'violation', points:-1, severity:'light' },
            { group:'Nề nếp', id:'eat_in_class', label:'Ăn quà trong lớp', type:'violation', points:-1, severity:'light' },
            { group:'Nề nếp', id:'phone', label:'Sử dụng điện thoại trái quy định', type:'violation', points:-3, severity:'medium' },
            { group:'Nề nếp', id:'phone_repeat', label:'Tái phạm sử dụng điện thoại', type:'violation', points:-5, severity:'medium' },
            { group:'Nề nếp', id:'leave_class', label:'Tự ý ra khỏi lớp trong giờ', type:'violation', points:-3, severity:'medium' },
            { group:'Nề nếp', id:'banned_item', label:'Mang vật dụng bị cấm đến trường', type:'violation', points:-10, severity:'heavy' },
            { group:'Vệ sinh – tài sản', id:'cleaning_good', label:'Trực nhật tốt, lớp sạch đẹp', type:'commendation', points:1, severity:'positive' },
            { group:'Vệ sinh – tài sản', id:'cleanliness_initiative', label:'Chủ động giữ gìn vệ sinh chung', type:'commendation', points:1, severity:'positive' },
            { group:'Vệ sinh – tài sản', id:'skip_duty', label:'Không trực nhật / trực nhật không đạt', type:'violation', points:-2, severity:'light' },
            { group:'Vệ sinh – tài sản', id:'littering', label:'Xả rác không đúng nơi quy định', type:'violation', points:-2, severity:'light' },
            { group:'Vệ sinh – tài sản', id:'property_damage', label:'Cố ý làm hư hỏng tài sản', type:'violation', points:-12, severity:'heavy' },
            { group:'Ứng xử – đạo đức', id:'good_deed', label:'Có việc tốt được ghi nhận', type:'commendation', points:2, severity:'positive' },
            { group:'Ứng xử – đạo đức', id:'return_lost', label:'Nhặt được của rơi trả lại', type:'commendation', points:3, severity:'positive' },
            { group:'Ứng xử – đạo đức', id:'help_friend', label:'Giúp đỡ bạn gặp khó khăn', type:'commendation', points:2, severity:'positive' },
            { group:'Ứng xử – đạo đức', id:'swearing', label:'Nói tục, chửi bậy', type:'violation', points:-3, severity:'medium' },
            { group:'Ứng xử – đạo đức', id:'insult_peer', label:'Trêu chọc, xúc phạm bạn', type:'violation', points:-5, severity:'medium' },
            { group:'Ứng xử – đạo đức', id:'disunity', label:'Cãi nhau, gây mất đoàn kết', type:'violation', points:-5, severity:'medium' },
            { group:'Ứng xử – đạo đức', id:'disrespect_teacher', label:'Thiếu lễ phép với giáo viên / người lớn', type:'violation', points:-8, severity:'heavy' },
            { group:'Ứng xử – đạo đức', id:'insult_teacher', label:'Xúc phạm giáo viên', type:'violation', points:-20, severity:'critical' },
            { group:'Ứng xử – đạo đức', id:'bullying', label:'Bắt nạt học sinh khác', type:'violation', points:-15, severity:'heavy' },
            { group:'Ứng xử – đạo đức', id:'threat_coerce', label:'Đe dọa, ép buộc bạn', type:'violation', points:-15, severity:'heavy' },
            { group:'Ứng xử – đạo đức', id:'minor_scuffle', label:'Xô xát nhẹ, chưa gây hậu quả', type:'violation', points:-12, severity:'heavy' },
            { group:'Ứng xử – đạo đức', id:'fight', label:'Đánh nhau', type:'violation', points:-25, severity:'critical' },
            { group:'Ứng xử – đạo đức', id:'fight_injury_org', label:'Đánh nhau gây thương tích / có tổ chức', type:'violation', points:-35, severity:'critical' },
            { group:'Ứng xử – đạo đức', id:'violence_record_share', label:'Bạo lực học đường / quay, cổ vũ hoặc phát tán clip bạo lực', type:'violation', points:-25, severity:'critical' },
            { group:'Tập thể', id:'task_good', label:'Hoàn thành tốt nhiệm vụ được giao', type:'commendation', points:2, severity:'positive' },
            { group:'Tập thể', id:'class_activity', label:'Tích cực hoạt động lớp / trường', type:'commendation', points:2, severity:'positive' },
            { group:'Tập thể', id:'school_award', label:'Có thành tích cấp trường', type:'commendation', points:3, severity:'positive' },
            { group:'Tập thể', id:'higher_award', label:'Có thành tích cấp cao hơn', type:'commendation', points:5, severity:'positive' },
            { group:'Tập thể', id:'skip_activity', label:'Không tham gia hoạt động tập thể không lý do', type:'violation', points:-2, severity:'light' },
            { group:'Tập thể', id:'disrupt_collective', label:'Cố tình gây ảnh hưởng hoạt động tập thể', type:'violation', points:-5, severity:'medium' },
            { group:'Ý thức tự quản', id:'admit_fix', label:'Tự giác nhận lỗi và khắc phục tốt', type:'commendation', points:1, severity:'positive' },
            { group:'Ý thức tự quản', id:'clear_improvement', label:'Có tiến bộ rõ sau nhắc nhở', type:'commendation', points:2, severity:'positive' },
            { group:'Ý thức tự quản', id:'help_remind', label:'Nhắc nhở, hỗ trợ bạn thực hiện nội quy đúng cách', type:'commendation', points:1, severity:'positive' },
            { group:'Ý thức tự quản', id:'cover_serious', label:'Che giấu / bao che vi phạm nghiêm trọng', type:'violation', points:-5, severity:'medium' },
        ];

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

        function homeroomRuleById(ruleId) {
            return HOMEROOM_CONDUCT_RULES.find(rule => rule.id === cleanText(ruleId)) || null;
        }

        function homeroomSeverityMeta(severity) {
            return HOMEROOM_SEVERITY_META[severity] || HOMEROOM_SEVERITY_META.neutral;
        }

        function homeroomClampPoints(value) {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(20, Math.max(-50, Math.round(parsed * 2) / 2));
        }

        function homeroomFormatPoints(value) {
            const points = homeroomClampPoints(value);
            return `${points > 0 ? '+' : ''}${Number.isInteger(points) ? points : points.toFixed(1)}`;
        }

        function homeroomWeekRange(anchorValue) {
            const iso = normalizeHomeroomDate(anchorValue) || homeroomTodayISO();
            const [y,m,d] = iso.split('-').map(Number);
            const date = new Date(y, m - 1, d, 12, 0, 0, 0);
            const weekday = date.getDay();
            const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
            const monday = new Date(date); monday.setDate(date.getDate() + diffToMonday);
            const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
            const toIso = item => `${item.getFullYear()}-${String(item.getMonth()+1).padStart(2,'0')}-${String(item.getDate()).padStart(2,'0')}`;
            return { start: toIso(monday), end: toIso(sunday) };
        }

        function homeroomWeekLabel(anchorValue) {
            const range = homeroomWeekRange(anchorValue);
            return `${homeroomFormatDate(range.start)}–${homeroomFormatDate(range.end)}`;
        }

        function homeroomShiftISODate(value, days = 0) {
            const iso = normalizeHomeroomDate(value) || homeroomTodayISO();
            const [y,m,d] = iso.split('-').map(Number);
            const date = new Date(y, m - 1, d, 12, 0, 0, 0);
            date.setDate(date.getDate() + Number(days || 0));
            return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        }

        function homeroomEntryInWeek(entry, anchorValue) {
            const date = normalizeHomeroomDate(entry?.date);
            if (!date) return false;
            const range = homeroomWeekRange(anchorValue);
            return date >= range.start && date <= range.end;
        }

        function homeroomRepeatInfo(book, studentId, ruleId, dateValue) {
            if (!book || !studentId || !ruleId) return { repeatCount:0, multiplier:1 };
            const count = (book.entries || []).filter(entry => entry.studentId === studentId && entry.ruleId === ruleId && homeroomEntryInWeek(entry, dateValue)).length;
            return { repeatCount:count, multiplier: count === 0 ? 1 : (count === 1 ? 1.5 : 2) };
        }

        function homeroomWeekScoreFor(book, studentId, semester, anchorValue) {
            const entries = (book?.entries || []).filter(entry => entry.studentId === studentId && String(entry.semester) === String(semester) && homeroomEntryInWeek(entry, anchorValue));
            const points = Math.round(entries.reduce((sum, entry) => sum + homeroomClampPoints(entry.points), 0) * 2) / 2;
            return { points, score: Math.round((100 + points) * 2) / 2, entryCount: entries.length };
        }

        function homeroomStudentTrend(book, studentId, semester = homeroomGetSelectedSemester()) {
            const anchor = homeroomWeekAnchorDate || homeroomTodayISO();
            const weeks = [-3,-2,-1,0].map(offset => {
                const weekAnchor = homeroomShiftISODate(anchor, offset * 7);
                const score = homeroomWeekScoreFor(book, studentId, semester, weekAnchor);
                return { anchor: weekAnchor, label: homeroomWeekLabel(weekAnchor), ...score };
            });
            const scores = weeks.map(item => item.score);
            let improvingStreak = 0;
            let decliningStreak = 0;
            for (let i = scores.length - 1; i > 0; i -= 1) {
                if (scores[i] > scores[i - 1]) improvingStreak += 1; else break;
            }
            for (let i = scores.length - 1; i > 0; i -= 1) {
                if (scores[i] < scores[i - 1]) decliningStreak += 1; else break;
            }
            const delta = Math.round((scores[scores.length - 1] - scores[0]) * 2) / 2;
            const improving = improvingStreak >= 2 && delta >= 4;
            const declining = decliningStreak >= 2 && delta <= -4;
            const direction = improving ? 'improving' : (declining ? 'declining' : 'stable');
            const label = improving ? `Tăng ${homeroomFormatPoints(Math.abs(delta)).replace('+','')} điểm/4 tuần`
                : (declining ? `Giảm ${homeroomFormatPoints(Math.abs(delta)).replace('+','')} điểm/4 tuần` : 'Ổn định');
            return { direction, label, delta, improvingStreak, decliningStreak, weeks, scores };
        }

        function homeroomScoreBand(score) {
            if (score >= 105) return { label:'Tuyên dương', level:'excellent' };
            if (score >= 100) return { label:'Tốt', level:'good' };
            if (score >= 95) return { label:'Nhắc nhẹ', level:'soft' };
            if (score >= 90) return { label:'Cần chú ý', level:'watch' };
            if (score >= 80) return { label:'Theo dõi', level:'priority' };
            return { label:'Cần can thiệp', level:'critical' };
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

        function homeroomGetMonitoringThresholds(book) {
            if (!book) return normalizeHomeroomMonitoringThresholds(null);
            book.monitoringThresholds = normalizeHomeroomMonitoringThresholds(book.monitoringThresholds);
            return book.monitoringThresholds;
        }

        function homeroomStudentMetrics(book, studentId, semester = homeroomGetSelectedSemester()) {
            const entries = (book?.entries || []).filter(entry => entry.studentId === studentId && String(entry.semester) === String(semester));
            const count = type => entries.filter(entry => entry.type === type).length;
            const absenceExcused = count('absence_excused');
            const absenceUnexcused = count('absence_unexcused');
            const late = count('late');
            const violation = count('violation');
            const unresolved = entries.filter(entry => ['absence_unexcused', 'violation', 'support'].includes(entry.type) && !entry.resolved).length;
            const lastEntry = [...entries].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
            const weekEntries = entries.filter(entry => homeroomEntryInWeek(entry, homeroomWeekAnchorDate || homeroomTodayISO()));
            const weekPoints = Math.round(weekEntries.reduce((sum, entry) => sum + homeroomClampPoints(entry.points), 0) * 2) / 2;
            const weekScore = Math.round((100 + weekPoints) * 2) / 2;
            const seriousEntries = entries.filter(entry => entry.seriousFlag || entry.severity === 'critical');
            const activeSeriousEntries = seriousEntries.filter(entry => !entry.resolved);
            const resolvedSeriousEntries = seriousEntries.filter(entry => entry.resolved);
            const weekSeriousEntries = seriousEntries.filter(entry => homeroomEntryInWeek(entry, homeroomWeekAnchorDate || homeroomTodayISO()));
            const heavyEntries = entries.filter(entry => entry.severity === 'heavy');
            const maxSeverity = seriousEntries.length ? 'critical' : (heavyEntries.length ? 'heavy' : (violation ? 'medium' : 'neutral'));
            const trend = homeroomStudentTrend(book, studentId, semester);
            return {
                absenceExcused,
                absenceUnexcused,
                absenceTotal: absenceExcused + absenceUnexcused,
                late,
                violation,
                unresolved,
                totalEntries: entries.length,
                lastEntryDate: lastEntry?.date || '',
                weekPoints,
                weekScore,
                scoreBand: homeroomScoreBand(weekScore),
                seriousCount: seriousEntries.length,
                seriousHistoryCount: seriousEntries.length,
                activeSeriousCount: activeSeriousEntries.length,
                resolvedSeriousCount: resolvedSeriousEntries.length,
                weekSeriousCount: weekSeriousEntries.length,
                heavyCount: heavyEntries.length,
                maxSeverity,
                trend,
            };
        }

        function homeroomStudentMonitoringStatus(metrics, thresholds) {
            const alerts = [];
            const groups = new Set();
            if (metrics.absenceTotal >= thresholds.totalAbsence) {
                alerts.push(`Tổng vắng ${metrics.absenceTotal}/${thresholds.totalAbsence}`);
                groups.add('absence');
            }
            if (metrics.absenceUnexcused >= thresholds.unexcusedAbsence) {
                alerts.push(`Vắng KP ${metrics.absenceUnexcused}/${thresholds.unexcusedAbsence}`);
                groups.add('absence');
            }
            if (metrics.late >= thresholds.late) {
                alerts.push(`Đi muộn ${metrics.late}/${thresholds.late}`);
                groups.add('late');
            }
            if (metrics.violation >= thresholds.violation) {
                alerts.push(`Vi phạm ${metrics.violation}/${thresholds.violation}`);
                groups.add('violation');
            }
            if (metrics.weekScore < 95) {
                alerts.push(`Điểm tuần ${homeroomFormatPoints(metrics.weekScore).replace('+','')}`);
                groups.add('score');
            }
            if (metrics.trend?.direction === 'declining') {
                alerts.push(`📉 ${metrics.trend.label}`);
                groups.add('trend');
            }
            if (metrics.activeSeriousCount > 0) alerts.unshift(`🚨 ${metrics.activeSeriousCount} vi phạm nghiêm trọng chưa xử lý`);
            const groupCount = groups.size;
            const level = metrics.activeSeriousCount > 0 ? 'critical'
                : (metrics.weekScore < 80 || groupCount >= 2 ? 'priority' : (groupCount === 1 ? 'watch' : 'normal'));
            const label = metrics.activeSeriousCount > 0 ? 'Nghiêm trọng đang xử lý'
                : (metrics.weekScore < 80 ? 'Cần can thiệp' : (groupCount >= 2 ? 'Ưu tiên theo dõi' : (groupCount === 1 ? 'Cần theo dõi' : 'Bình thường')));
            return {
                flagged: alerts.length > 0,
                groupCount,
                alerts,
                level,
                label,
                serious: metrics.activeSeriousCount > 0,
                seriousHistory: metrics.seriousHistoryCount > 0,
            };
        }

        function homeroomBuildMonitoringRows(book, semester = homeroomGetSelectedSemester()) {
            const thresholds = homeroomGetMonitoringThresholds(book);
            return (book?.students || []).map(student => {
                const metrics = homeroomStudentMetrics(book, student.id, semester);
                const status = homeroomStudentMonitoringStatus(metrics, thresholds);
                return { student, metrics, status };
            }).sort((a, b) =>
                Number(b.metrics.activeSeriousCount > 0) - Number(a.metrics.activeSeriousCount > 0)
                || Number(b.metrics.trend?.direction === 'declining') - Number(a.metrics.trend?.direction === 'declining')
                || Number(b.status.flagged) - Number(a.status.flagged)
                || b.status.groupCount - a.status.groupCount
                || a.metrics.weekScore - b.metrics.weekScore
                || (b.metrics.absenceTotal + b.metrics.late + b.metrics.violation) - (a.metrics.absenceTotal + a.metrics.late + a.metrics.violation)
                || String(a.student.name || '').localeCompare(String(b.student.name || ''), 'vi', { numeric: true, sensitivity: 'base' })
            );
        }

        function homeroomSummarizeBook(book, semester = '1') {
            const entries = homeroomEntriesForSemester(book, semester);
            const individual = entries.filter(entry => entry.studentId);
            const monitoringRows = homeroomBuildMonitoringRows(book, semester);
            const unresolvedAttentionIds = new Set(individual
                .filter(entry => ['absence_unexcused', 'violation', 'support'].includes(entry.type) && !entry.resolved)
                .map(entry => entry.studentId));
            const attentionStudentIds = new Set([
                ...unresolvedAttentionIds,
                ...monitoringRows.filter(row => row.status.flagged).map(row => row.student.id),
            ]);
            return {
                students: Array.isArray(book?.students) ? book.students.length : 0,
                absenceExcused: individual.filter(entry => entry.type === 'absence_excused').length,
                absenceUnexcused: individual.filter(entry => entry.type === 'absence_unexcused').length,
                late: individual.filter(entry => entry.type === 'late').length,
                violations: individual.filter(entry => entry.type === 'violation').length,
                commendations: individual.filter(entry => entry.type === 'commendation').length,
                attentionStudents: attentionStudentIds.size,
                thresholdStudents: monitoringRows.filter(row => row.status.flagged).length,
                criticalStudents: monitoringRows.filter(row => row.metrics.activeSeriousCount > 0).length,
                seriousHistoryStudents: monitoringRows.filter(row => row.metrics.seriousHistoryCount > 0).length,
                resolvedSeriousStudents: monitoringRows.filter(row => row.metrics.resolvedSeriousCount > 0 && row.metrics.activeSeriousCount === 0).length,
                improvingStudents: monitoringRows.filter(row => row.metrics.trend?.direction === 'improving').length,
                decliningStudents: monitoringRows.filter(row => row.metrics.trend?.direction === 'declining').length,
                lowWeekScoreStudents: monitoringRows.filter(row => row.metrics.weekScore < 90).length,
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
            set('homeroomLateCount', summary.late);
            set('homeroomViolationCount', summary.violations);
            set('homeroomAttentionCount', summary.attentionStudents);
            set('homeroomCriticalCount', summary.criticalStudents);
            set('homeroomLowWeekScoreCount', summary.lowWeekScoreStudents);
            set('homeroomImprovingCount', summary.improvingStudents);
            set('homeroomDecliningCount', summary.decliningStudents);
            const subtitle = homeroomById('homeroomSubtitle');
            if (subtitle) subtitle.textContent = book
                ? `${book.className} · HK${homeroomGetSelectedSemester()} · ${summary.thresholdStudents} HS cần chú ý · ${summary.criticalStudents} nghiêm trọng đang xử lý · ${summary.decliningStudents} có xu hướng giảm.`
                : 'Hồ sơ lớp, chuyên cần, nề nếp, liên hệ phụ huynh và nhật ký chủ nhiệm — dữ liệu riêng của giáo viên.';
        }

        function homeroomStudentEntryCount(book, studentId, semester = homeroomGetSelectedSemester()) {
            return (book?.entries || []).filter(entry => entry.studentId === studentId && String(entry.semester) === String(semester)).length;
        }

        function homeroomStudentFilterFlags(book, studentId) {
            const semester = homeroomGetSelectedSemester();
            const entries = (book?.entries || []).filter(entry => entry.studentId === studentId && String(entry.semester) === String(semester));
            const unresolvedAttention = entries.some(entry => ['absence_unexcused','violation','support'].includes(entry.type) && !entry.resolved);
            const metrics = homeroomStudentMetrics(book, studentId, semester);
            const status = homeroomStudentMonitoringStatus(metrics, homeroomGetMonitoringThresholds(book));
            return {
                attention: unresolvedAttention || status.flagged,
                frequent: status.flagged,
                absence: metrics.absenceTotal > 0,
                unexcused: metrics.absenceUnexcused > 0,
                late: metrics.late > 0,
                violation: metrics.violation > 0,
                seriousCurrent: metrics.activeSeriousCount > 0,
                seriousHistory: metrics.seriousHistoryCount > 0,
                improving: metrics.trend?.direction === 'improving',
                declining: metrics.trend?.direction === 'declining',
                resolved: entries.some(entry => ['absence_unexcused','violation','support'].includes(entry.type) && entry.resolved),
                metrics,
                status,
            };
        }

        function homeroomApplyRosterFilters() {
            const book = homeroomActiveBook();
            const wrap = homeroomById('homeroomRosterWrap');
            if (!wrap) return;
            const query = homeroomNormalizeKeyText(homeroomRosterSearch);
            let visible = 0;
            wrap.querySelectorAll('[data-homeroom-student-row]').forEach(row => {
                const name = homeroomNormalizeKeyText(row.dataset.homeroomSearch || '');
                const matchesText = !query || name.includes(query);
                const matchesFilter = homeroomRosterFilter === 'all' || row.dataset[`homeroom${homeroomRosterFilter[0].toUpperCase()}${homeroomRosterFilter.slice(1)}`] === '1';
                row.hidden = !(matchesText && matchesFilter);
                if (!row.hidden) visible += 1;
            });
            const count = homeroomById('homeroomFilterCount');
            if (count) count.textContent = `${visible}/${book?.students?.length || 0} học sinh`;
            const card = homeroomById('homeroomCard');
            card?.classList.toggle('is-privacy-on', homeroomPrivacyHidden);
            const privacyBtn = homeroomById('homeroomPrivacyBtn');
            if (privacyBtn) privacyBtn.textContent = homeroomPrivacyHidden ? '👁️ Hiện thông tin riêng' : '🙈 Ẩn thông tin riêng';
        }

        function homeroomTogglePrivacy() {
            homeroomPrivacyHidden = !homeroomPrivacyHidden;
            try { sessionStorage.setItem('teacher_homeroom_privacy_hidden_v1', homeroomPrivacyHidden ? '1' : '0'); } catch (_) { /* noop */ }
            homeroomApplyRosterFilters();
        }

        function homeroomStudentOptionHtml(book, selectedId = '', { groupId = null, includeEmpty = true } = {}) {
            const students = (book?.students || []).filter(student => groupId === null || student.groupId === groupId);
            const empty = includeEmpty ? '<option value="">— Chưa phân công —</option>' : '';
            return empty + students.map(student => `<option value="${homeroomEscapeHtml(student.id)}" ${student.id === selectedId ? 'selected' : ''}>${homeroomEscapeHtml(student.name || 'Chưa nhập tên')}</option>`).join('');
        }

        function homeroomFindGroup(book, groupId) {
            return book?.groups?.find(group => group.id === groupId) || null;
        }

        function homeroomStudentRoleLabels(book, studentId) {
            if (!book || !studentId) return [];
            const labels = [];
            HOMEROOM_CLASS_ROLE_META.forEach(role => {
                if (book.classOfficers?.[role.id] === studentId) labels.push({ label:role.label, kind:'class' });
            });
            (book.customOfficers || []).forEach(role => {
                if (role.studentId === studentId) labels.push({ label:role.label, kind:'class' });
            });
            (book.groups || []).forEach(group => {
                if (group.leaderId === studentId) labels.push({ label:`Tổ trưởng ${group.name}`, kind:'group' });
                if (group.deputyId === studentId) labels.push({ label:`Tổ phó ${group.name}`, kind:'group' });
            });
            return labels;
        }

        function homeroomGroupMetrics(book, group) {
            const members = (book?.students || []).filter(student => student.groupId === group.id);
            const semester = homeroomGetSelectedSemester();
            const metrics = members.map(student => homeroomStudentMetrics(book, student.id, semester));
            const totalAbsence = metrics.reduce((sum, item) => sum + item.absenceTotal, 0);
            const late = metrics.reduce((sum, item) => sum + item.late, 0);
            const violation = metrics.reduce((sum, item) => sum + item.violation, 0);
            const averageWeekScore = metrics.length ? Math.round((metrics.reduce((sum, item) => sum + item.weekScore, 0) / metrics.length) * 10) / 10 : 100;
            return { members, totalAbsence, late, violation, averageWeekScore };
        }

        function homeroomOrganizationStats(book) {
            const groups = book?.groups || [];
            const assigned = (book?.students || []).filter(student => homeroomFindGroup(book, student.groupId)).length;
            const officerAssignments = HOMEROOM_CLASS_ROLE_META.filter(role => book?.classOfficers?.[role.id]).length + (book?.customOfficers || []).filter(role => role.studentId).length;
            return { groups:groups.length, assigned, unassigned:Math.max(0,(book?.students?.length || 0)-assigned), officerAssignments };
        }

        function homeroomRenderOrganization(book) {
            const summary = homeroomById('homeroomOrganizationSummary');
            const officerGrid = homeroomById('homeroomOfficerGrid');
            const customStudent = homeroomById('homeroomCustomOfficerStudent');
            const customList = homeroomById('homeroomCustomOfficerList');
            const groupGrid = homeroomById('homeroomGroupGrid');
            const controls = ['homeroomCreateFourGroupsBtn','homeroomAddGroupBtn','homeroomAutoAssignGroupsBtn','homeroomAddCustomOfficerBtn','homeroomCustomOfficerLabel','homeroomCustomOfficerStudent'];
            controls.forEach(id => { const el=homeroomById(id); if (el) el.disabled=!book; });
            if (!summary || !officerGrid || !customList || !groupGrid) return;
            if (!book) {
                summary.textContent = 'Chưa mở sổ chủ nhiệm.';
                officerGrid.innerHTML = '';
                customList.innerHTML = '';
                groupGrid.innerHTML = '<div class="homeroom-mini-empty">Mở sổ chủ nhiệm để thiết lập cơ cấu lớp.</div>';
                if (customStudent) customStudent.innerHTML = '<option value="">— Chọn học sinh —</option>';
                return;
            }
            book.groups = Array.isArray(book.groups) ? book.groups : [];
            book.classOfficers = book.classOfficers && typeof book.classOfficers === 'object' ? book.classOfficers : {};
            book.customOfficers = Array.isArray(book.customOfficers) ? book.customOfficers : [];
            const stats = homeroomOrganizationStats(book);
            summary.innerHTML = `<strong>${stats.groups}</strong> tổ · <strong>${stats.assigned}/${book.students.length}</strong> học sinh đã xếp tổ${stats.unassigned ? ` · <strong>${stats.unassigned}</strong> chưa xếp` : ''} · <strong>${stats.officerAssignments}</strong> lượt phân công cán bộ lớp.`;
            officerGrid.innerHTML = HOMEROOM_CLASS_ROLE_META.map(role => `<label class="homeroom-officer-item"><span>${role.icon} ${homeroomEscapeHtml(role.label)}</span><select data-homeroom-officer-role="${homeroomEscapeHtml(role.id)}">${homeroomStudentOptionHtml(book, book.classOfficers?.[role.id] || '')}</select></label>`).join('');
            if (customStudent) customStudent.innerHTML = homeroomStudentOptionHtml(book, '');
            customList.innerHTML = book.customOfficers.length ? book.customOfficers.map(role => {
                const student = homeroomFindStudent(book, role.studentId);
                return `<span class="homeroom-custom-officer-chip"><strong>${homeroomEscapeHtml(role.label)}</strong>: ${homeroomEscapeHtml(student?.name || 'Chưa phân công')}<button type="button" title="Xóa chức vụ" data-homeroom-delete-custom-officer="${homeroomEscapeHtml(role.id)}">×</button></span>`;
            }).join('') : '<span class="text-muted" style="font-size:11px">Có thể thêm chức vụ riêng của lớp nếu cần.</span>';

            const cards = book.groups.map((group, index) => {
                const m = homeroomGroupMetrics(book, group);
                const memberChips = m.members.length ? m.members.map(student => {
                    const leader = group.leaderId === student.id;
                    const deputy = group.deputyId === student.id;
                    return `<span class="homeroom-member-chip ${leader ? 'is-leader' : (deputy ? 'is-deputy' : '')}">${leader ? '👑 ' : (deputy ? '🔹 ' : '')}${homeroomEscapeHtml(student.name || 'Chưa nhập tên')}</span>`;
                }).join('') : '<span class="text-muted" style="font-size:10px">Chưa có thành viên.</span>';
                return `<article class="homeroom-group-card" data-homeroom-group-card="${homeroomEscapeHtml(group.id)}">
                    <div class="homeroom-group-card-head"><div class="homeroom-group-card-title"><span>👥</span><input class="homeroom-group-name-input" data-homeroom-group-id="${homeroomEscapeHtml(group.id)}" data-homeroom-group-field="name" value="${homeroomEscapeHtml(group.name || `Tổ ${index+1}`)}" aria-label="Tên tổ" /></div><button class="homeroom-group-delete" type="button" title="Xóa tổ" data-homeroom-delete-group="${homeroomEscapeHtml(group.id)}">×</button></div>
                    <div class="homeroom-group-controls">
                        <label class="homeroom-group-control"><span>Tổ trưởng</span><select data-homeroom-group-id="${homeroomEscapeHtml(group.id)}" data-homeroom-group-field="leaderId">${homeroomStudentOptionHtml(book, group.leaderId || '', {groupId:group.id})}</select></label>
                        <label class="homeroom-group-control"><span>Tổ phó</span><select data-homeroom-group-id="${homeroomEscapeHtml(group.id)}" data-homeroom-group-field="deputyId">${homeroomStudentOptionHtml(book, group.deputyId || '', {groupId:group.id})}</select></label>
                    </div>
                    <div class="homeroom-group-metrics"><span>${m.members.length} HS</span><span>Vắng ${m.totalAbsence}</span><span>Muộn ${m.late}</span><span>VP ${m.violation}</span><span>Điểm tuần TB ${m.averageWeekScore}</span></div>
                    <div class="homeroom-group-members">${memberChips}</div>
                </article>`;
            }).join('');
            const unassigned = book.students.filter(student => !homeroomFindGroup(book, student.groupId));
            const unassignedCard = unassigned.length ? `<article class="homeroom-group-card homeroom-unassigned-card"><div class="homeroom-group-card-head"><strong>📥 Chưa xếp tổ · ${unassigned.length} HS</strong></div><div class="homeroom-group-members">${unassigned.map(student => `<span class="homeroom-member-chip">${homeroomEscapeHtml(student.name || 'Chưa nhập tên')}</span>`).join('')}</div></article>` : '';
            groupGrid.innerHTML = cards || '<div class="homeroom-mini-empty">Chưa có tổ. Nhấn “Tạo nhanh 4 tổ” hoặc “Thêm tổ”.</div>';
            if (unassignedCard) groupGrid.insertAdjacentHTML('beforeend', unassignedCard);
        }

        function homeroomAddGroup() {
            const book = homeroomActiveBook();
            if (!book) return;
            book.groups = Array.isArray(book.groups) ? book.groups : [];
            const used = new Set(book.groups.map(group => homeroomNormalizeKeyText(group.name)));
            let number = 1;
            while (used.has(homeroomNormalizeKeyText(`Tổ ${number}`))) number += 1;
            book.groups.push(normalizeHomeroomGroup({ id:homeroomCreateId('cn-to'), name:`Tổ ${number}` }, book.groups.length, new Set(book.students.map(student => student.id))));
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomCreateFourGroups() {
            const book = homeroomActiveBook();
            if (!book) return;
            book.groups = Array.isArray(book.groups) ? book.groups : [];
            const ids = new Set(book.students.map(student => student.id));
            while (book.groups.length < 4) {
                const n = book.groups.length + 1;
                book.groups.push(normalizeHomeroomGroup({ id:homeroomCreateId('cn-to'), name:`Tổ ${n}` }, n - 1, ids));
            }
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
            showToast(book.groups.length === 4 ? '✅ Đã chuẩn bị 4 tổ cho lớp' : `ℹ️ Lớp đang có ${book.groups.length} tổ; không xóa các tổ đã tạo.`, book.groups.length === 4 ? 'success' : 'info');
        }

        function homeroomAutoAssignGroups() {
            const book = homeroomActiveBook();
            if (!book) return;
            if (!(book.groups || []).length) {
                const ids = new Set(book.students.map(student => student.id));
                book.groups = [1,2,3,4].map((n,index) => normalizeHomeroomGroup({id:homeroomCreateId('cn-to'),name:`Tổ ${n}`},index,ids));
            }
            const counts = new Map(book.groups.map(group => [group.id, book.students.filter(student => student.groupId === group.id).length]));
            const unassigned = book.students.filter(student => !homeroomFindGroup(book, student.groupId));
            unassigned.forEach(student => {
                const target = [...book.groups].sort((a,b) => (counts.get(a.id)||0) - (counts.get(b.id)||0))[0];
                if (!target) return;
                student.groupId = target.id;
                counts.set(target.id, (counts.get(target.id)||0) + 1);
            });
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
            showToast(unassigned.length ? `✅ Đã chia đều ${unassigned.length} học sinh chưa xếp tổ` : 'ℹ️ Tất cả học sinh đã có tổ', unassigned.length ? 'success' : 'info');
        }

        function homeroomDeleteGroup(groupId) {
            const book = homeroomActiveBook();
            const group = homeroomFindGroup(book, groupId);
            if (!book || !group) return;
            const memberCount = book.students.filter(student => student.groupId === groupId).length;
            if (!confirm(`Xóa ${group.name}${memberCount ? ` và đưa ${memberCount} học sinh về trạng thái chưa xếp tổ` : ''}?`)) return;
            book.students.forEach(student => { if (student.groupId === groupId) student.groupId = ''; });
            book.groups = book.groups.filter(item => item.id !== groupId);
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomAssignStudentGroup(book, student, groupId) {
            const nextGroupId = homeroomFindGroup(book, groupId) ? groupId : '';
            const previousGroupId = student.groupId;
            if (previousGroupId && previousGroupId !== nextGroupId) {
                const previous = homeroomFindGroup(book, previousGroupId);
                if (previous?.leaderId === student.id) previous.leaderId = '';
                if (previous?.deputyId === student.id) previous.deputyId = '';
            }
            student.groupId = nextGroupId;
        }

        function homeroomHandleOrganizationChange(event) {
            const book = homeroomActiveBook();
            if (!book) return;
            const officer = event.target.closest('[data-homeroom-officer-role]');
            if (officer) {
                const roleId = cleanText(officer.dataset.homeroomOfficerRole);
                if (HOMEROOM_CLASS_ROLE_META.some(role => role.id === roleId)) book.classOfficers[roleId] = homeroomFindStudent(book, officer.value) ? officer.value : '';
                book.updatedAt = new Date().toISOString(); homeroomSchedulePersist(); renderHomeroom(); return;
            }
            const groupControl = event.target.closest('[data-homeroom-group-id][data-homeroom-group-field]');
            if (!groupControl) return;
            const group = homeroomFindGroup(book, groupControl.dataset.homeroomGroupId);
            if (!group) return;
            const field = groupControl.dataset.homeroomGroupField;
            if (field === 'name') group.name = cleanText(groupControl.value) || group.name;
            if (field === 'leaderId' || field === 'deputyId') {
                const student = homeroomFindStudent(book, groupControl.value);
                group[field] = student && student.groupId === group.id ? student.id : '';
                if (field === 'leaderId' && group.leaderId && group.deputyId === group.leaderId) group.deputyId = '';
                if (field === 'deputyId' && group.deputyId && group.leaderId === group.deputyId) group.leaderId = '';
            }
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomAddCustomOfficer() {
            const book = homeroomActiveBook();
            if (!book) return;
            const labelInput = homeroomById('homeroomCustomOfficerLabel');
            const studentSelect = homeroomById('homeroomCustomOfficerStudent');
            const label = cleanText(labelInput?.value);
            if (!label) { showToast('⚠️ Hãy nhập tên chức vụ', 'info'); labelInput?.focus(); return; }
            book.customOfficers = Array.isArray(book.customOfficers) ? book.customOfficers : [];
            book.customOfficers.push(normalizeHomeroomCustomOfficer({ id:homeroomCreateId('cn-cv'), label, studentId:studentSelect?.value || '' }, book.customOfficers.length, new Set(book.students.map(student=>student.id))));
            if (labelInput) labelInput.value='';
            if (studentSelect) studentSelect.value='';
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
        }

        function homeroomDeleteCustomOfficer(roleId) {
            const book = homeroomActiveBook();
            if (!book) return;
            book.customOfficers = (book.customOfficers || []).filter(role => role.id !== roleId);
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
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
                    <th>STT</th><th class="homeroom-name-col">Họ và tên</th><th>Tổ</th><th>Chức vụ</th><th>Ngày sinh</th><th>Giới tính</th>
                    <th>Phụ huynh</th><th>SĐT PH</th><th>SĐT HS</th><th>Địa chỉ</th><th>Ghi chú</th><th>Theo dõi</th><th></th>
                </tr></thead>
                <tbody>${book.students.map((student, index) => {
                    const selected = homeroomEnsureState().selectedStudentId === student.id;
                    const entryCount = homeroomStudentEntryCount(book, student.id);
                    const flags = homeroomStudentFilterFlags(book, student.id);
                    const m = flags.metrics;
                    const compact = [
                        m.absenceTotal ? `<span title="Tổng lượt vắng">V ${m.absenceTotal}</span>` : '',
                        m.late ? `<span title="Lượt đi muộn">M ${m.late}</span>` : '',
                        m.violation ? `<span title="Lượt vi phạm">VP ${m.violation}</span>` : '',
                        `<span title="Điểm rèn luyện tuần ${homeroomEscapeHtml(homeroomWeekLabel(homeroomWeekAnchorDate || homeroomTodayISO()))}">Đ ${homeroomFormatPoints(m.weekScore).replace('+','')}</span>`,
                        m.activeSeriousCount ? `<span class="critical" title="Vi phạm nghiêm trọng chưa xử lý">🚨 ${m.activeSeriousCount}</span>` : (m.resolvedSeriousCount ? `<span class="history" title="Có lịch sử vi phạm nghiêm trọng đã xử lý">✓🚨 ${m.resolvedSeriousCount}</span>` : ''),
                        m.trend?.direction === 'improving' ? '<span class="trend-up" title="Xu hướng 4 tuần tích cực">↗</span>' : (m.trend?.direction === 'declining' ? '<span class="trend-down" title="Xu hướng điểm 4 tuần giảm">↘</span>' : ''),
                    ].filter(Boolean).join('');
                    return `<tr class="${selected ? 'is-selected ' : ''}${flags.status.flagged ? 'is-monitoring' : ''}" data-homeroom-student-row="${homeroomEscapeHtml(student.id)}" data-homeroom-search="${homeroomEscapeHtml(student.name)}" data-homeroom-attention="${flags.attention ? '1' : '0'}" data-homeroom-frequent="${flags.frequent ? '1' : '0'}" data-homeroom-absence="${flags.absence ? '1' : '0'}" data-homeroom-unexcused="${flags.unexcused ? '1' : '0'}" data-homeroom-late="${flags.late ? '1' : '0'}" data-homeroom-violation="${flags.violation ? '1' : '0'}" data-homeroom-serious-current="${flags.seriousCurrent ? '1' : '0'}" data-homeroom-serious-history="${flags.seriousHistory ? '1' : '0'}" data-homeroom-improving="${flags.improving ? '1' : '0'}" data-homeroom-declining="${flags.declining ? '1' : '0'}" data-homeroom-resolved="${flags.resolved ? '1' : '0'}">
                        <td class="homeroom-stt">${index + 1}</td>
                        <td><input class="homeroom-cell-input homeroom-name-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="name" value="${homeroomEscapeHtml(student.name)}" placeholder="Họ và tên" /></td>
                        <td><select class="homeroom-cell-select homeroom-group-select" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="groupId"><option value="">—</option>${(book.groups || []).map(group => `<option value="${homeroomEscapeHtml(group.id)}" ${student.groupId === group.id ? 'selected' : ''}>${homeroomEscapeHtml(group.name)}</option>`).join('')}</select></td>
                        <td><div class="homeroom-role-tags">${homeroomStudentRoleLabels(book, student.id).map(role => `<span class="homeroom-role-tag ${role.kind === 'group' ? 'group-role' : ''}">${homeroomEscapeHtml(role.label)}</span>`).join('') || '<span class="text-muted">—</span>'}</div></td>
                        <td><input class="homeroom-cell-input" type="date" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="birthDate" value="${homeroomEscapeHtml(student.birthDate)}" /></td>
                        <td><select class="homeroom-cell-select" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="gender">
                            <option value="" ${!student.gender ? 'selected' : ''}>—</option>
                            <option value="Nam" ${student.gender === 'Nam' ? 'selected' : ''}>Nam</option>
                            <option value="Nữ" ${student.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
                            <option value="Khác" ${student.gender === 'Khác' ? 'selected' : ''}>Khác</option>
                        </select></td>
                        <td><input class="homeroom-cell-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="parentName" value="${homeroomEscapeHtml(student.parentName)}" placeholder="Họ tên PH" /></td>
                        <td><input class="homeroom-cell-input homeroom-phone homeroom-sensitive" inputmode="tel" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="parentPhone" value="${homeroomEscapeHtml(student.parentPhone)}" placeholder="SĐT" /></td>
                        <td><input class="homeroom-cell-input homeroom-phone homeroom-sensitive" inputmode="tel" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="studentPhone" value="${homeroomEscapeHtml(student.studentPhone)}" placeholder="SĐT" /></td>
                        <td><input class="homeroom-cell-input homeroom-wide-input homeroom-sensitive" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="address" value="${homeroomEscapeHtml(student.address)}" placeholder="Địa chỉ" /></td>
                        <td><input class="homeroom-cell-input homeroom-wide-input" data-homeroom-student-id="${homeroomEscapeHtml(student.id)}" data-homeroom-field="note" value="${homeroomEscapeHtml(student.note)}" placeholder="Lưu ý" /></td>
                        <td class="homeroom-track-cell"><button class="homeroom-track-btn ${selected ? 'active' : ''}" type="button" data-homeroom-select-student="${homeroomEscapeHtml(student.id)}">📌 ${entryCount}</button>${compact ? `<div class="homeroom-mini-metrics ${flags.status.flagged ? 'flagged' : ''}">${compact}</div>` : ''}</td>
                        <td><button class="homeroom-delete-btn" type="button" title="Xóa học sinh" data-homeroom-delete-student="${homeroomEscapeHtml(student.id)}">×</button></td>
                    </tr>`;
                }).join('')}</tbody>
            </table>`;
            homeroomApplyRosterFilters();
        }

        function homeroomRenderMonitoring(book) {
            const summaryEl = homeroomById('homeroomMonitoringSummary');
            const tableEl = homeroomById('homeroomMonitoringTable');
            const viewSelect = homeroomById('homeroomMonitoringViewSelect');
            const weekInput = homeroomById('homeroomWeekAnchorDate');
            const thresholds = homeroomGetMonitoringThresholds(book);
            const thresholdInputs = {
                totalAbsence: homeroomById('homeroomThresholdTotalAbsence'),
                unexcusedAbsence: homeroomById('homeroomThresholdUnexcused'),
                late: homeroomById('homeroomThresholdLate'),
                violation: homeroomById('homeroomThresholdViolation'),
            };
            Object.entries(thresholdInputs).forEach(([key, input]) => {
                if (!input) return;
                input.value = String(thresholds[key]);
                input.disabled = !book;
            });
            if (viewSelect) {
                viewSelect.value = homeroomMonitoringView;
                viewSelect.disabled = !book;
            }
            if (weekInput) {
                weekInput.value = homeroomWeekAnchorDate || homeroomTodayISO();
                weekInput.disabled = !book;
            }
            if (!summaryEl || !tableEl) return;
            if (!book) {
                summaryEl.textContent = 'Chưa mở sổ chủ nhiệm.';
                tableEl.innerHTML = '<div class="homeroom-mini-empty">Mở sổ để xem thống kê theo dõi.</div>';
                return;
            }
            const semester = homeroomGetSelectedSemester();
            const rows = homeroomBuildMonitoringRows(book, semester);
            const flaggedRows = rows.filter(row => row.status.flagged);
            const priorityRows = flaggedRows.filter(row => ['priority','critical'].includes(row.status.level));
            const criticalRows = rows.filter(row => row.metrics.activeSeriousCount > 0);
            const historyRows = rows.filter(row => row.metrics.seriousHistoryCount > 0 && row.metrics.activeSeriousCount === 0);
            const trendRows = rows.filter(row => ['improving','declining'].includes(row.metrics.trend?.direction));
            const improvingRows = trendRows.filter(row => row.metrics.trend?.direction === 'improving');
            const decliningRows = trendRows.filter(row => row.metrics.trend?.direction === 'declining');
            summaryEl.innerHTML = `Tuần <strong>${homeroomEscapeHtml(homeroomWeekLabel(homeroomWeekAnchorDate || homeroomTodayISO()))}</strong> · <strong>${flaggedRows.length}</strong>/${rows.length} học sinh cần chú ý trong HK${semester}`
                + (priorityRows.length ? ` · <strong>${priorityRows.length}</strong> em ưu tiên` : '')
                + (criticalRows.length ? ` · <strong class="homeroom-critical-text">${criticalRows.length}</strong> em có vi phạm nghiêm trọng <strong>chưa xử lý</strong>` : '')
                + (historyRows.length ? ` · <strong>${historyRows.length}</strong> em có lịch sử nghiêm trọng đã xử lý` : '')
                + (decliningRows.length ? ` · <strong class="homeroom-trend-down-text">${decliningRows.length}</strong> em có xu hướng giảm` : '')
                + (improvingRows.length ? ` · <strong class="homeroom-trend-up-text">${improvingRows.length}</strong> em có xu hướng tích cực` : '') + '.';
            const shownRows = homeroomMonitoringView === 'all' ? rows
                : (homeroomMonitoringView === 'priority' ? priorityRows
                    : (homeroomMonitoringView === 'trends' ? trendRows : flaggedRows));
            if (!shownRows.length) {
                const emptyText = homeroomMonitoringView === 'trends' ? 'Chưa đủ tín hiệu để xác định xu hướng tăng/giảm rõ trong 4 tuần.'
                    : (homeroomMonitoringView === 'priority' ? 'Không có học sinh ở nhóm ưu tiên/can thiệp.' : 'Chưa có học sinh cần xử lý theo các ngưỡng hiện tại.');
                tableEl.innerHTML = `<div class="homeroom-monitoring-good">✅ ${homeroomEscapeHtml(emptyText)}</div>`;
                return;
            }
            tableEl.innerHTML = `<table class="homeroom-monitor-table"><thead><tr>
                <th>Học sinh</th><th>Vắng CP</th><th>Vắng KP</th><th>Tổng vắng</th><th>Đi muộn</th><th>Vi phạm</th><th>Điểm tuần</th><th>Xu hướng 4 tuần</th><th>Nghiêm trọng</th><th>Chưa xử lý</th><th>Lần gần nhất</th><th>Trạng thái</th><th></th>
                </tr></thead><tbody>${shownRows.map(({ student, metrics, status }) => {
                    const alertTitle = status.alerts.length ? status.alerts.join(' · ') : 'Chưa chạm ngưỡng';
                    const trend = metrics.trend || { direction:'stable', label:'Ổn định', scores:[100,100,100,100], weeks:[] };
                    const trendTitle = (trend.weeks || []).map(item => `${item.label}: ${item.score}`).join(' · ');
                    const seriousHtml = metrics.activeSeriousCount
                        ? `<span class="homeroom-serious-state active">🚨 Đang xử lý ${metrics.activeSeriousCount}</span>${metrics.resolvedSeriousCount ? `<small>✓ Đã xử lý ${metrics.resolvedSeriousCount}</small>` : ''}`
                        : (metrics.resolvedSeriousCount ? `<span class="homeroom-serious-state history">✓ Đã xử lý ${metrics.resolvedSeriousCount}</span><small>Lưu trong lịch sử HK</small>` : '<span class="homeroom-muted-dash">—</span>');
                    return `<tr class="monitor-${status.level}">
                        <td><strong>${homeroomEscapeHtml(student.name || 'Chưa nhập tên')}</strong></td>
                        <td>${metrics.absenceExcused}</td><td>${metrics.absenceUnexcused}</td><td><strong>${metrics.absenceTotal}</strong></td>
                        <td>${metrics.late}</td><td>${metrics.violation}</td>
                        <td><strong class="homeroom-week-score score-${metrics.scoreBand.level}">${homeroomEscapeHtml(homeroomFormatPoints(metrics.weekScore).replace('+',''))}</strong><small>${homeroomEscapeHtml(metrics.scoreBand.label)} · ${homeroomEscapeHtml(homeroomFormatPoints(metrics.weekPoints))}</small></td>
                        <td><span class="homeroom-trend-badge trend-${homeroomEscapeHtml(trend.direction)}" title="${homeroomEscapeHtml(trendTitle)}">${trend.direction === 'improving' ? '↗' : (trend.direction === 'declining' ? '↘' : '→')} ${homeroomEscapeHtml(trend.label)}</span><small>${homeroomEscapeHtml((trend.scores || []).join(' → '))}</small></td>
                        <td>${seriousHtml}</td>
                        <td>${metrics.unresolved}</td><td>${homeroomEscapeHtml(homeroomFormatDate(metrics.lastEntryDate) || '—')}</td>
                        <td><span class="homeroom-monitor-status status-${status.level}" title="${homeroomEscapeHtml(alertTitle)}">${homeroomEscapeHtml(status.label)}</span>${status.alerts.length ? `<small>${homeroomEscapeHtml(status.alerts.join(' · '))}</small>` : ''}</td>
                        <td><button type="button" class="btn btn-outline btn-sm" data-homeroom-monitor-student="${homeroomEscapeHtml(student.id)}">Xem</button></td>
                    </tr>`;
                }).join('')}</tbody></table>`;
        }

        function homeroomUpdateMonitoringThreshold(input) {
            const book = homeroomActiveBook();
            if (!book || !input) return;
            const key = cleanText(input.dataset.homeroomThreshold);
            if (!Object.prototype.hasOwnProperty.call(HOMEROOM_MONITORING_DEFAULTS, key)) return;
            const parsed = Number.parseInt(input.value, 10);
            const value = Number.isFinite(parsed) ? Math.min(99, Math.max(1, parsed)) : HOMEROOM_MONITORING_DEFAULTS[key];
            book.monitoringThresholds = homeroomGetMonitoringThresholds(book);
            book.monitoringThresholds[key] = value;
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
            showToast('✅ Đã cập nhật ngưỡng theo dõi', 'success');
        }

        function homeroomRenderRuleCatalog() {
            const select = homeroomById('homeroomConductRuleSelect');
            const table = homeroomById('homeroomRulesTable');
            const groups = [...new Set(HOMEROOM_CONDUCT_RULES.map(rule => rule.group))];
            if (select) {
                select.innerHTML = '<option value="">— Ghi nhận tự do / không tính điểm —</option>' + groups.map(group => {
                    const options = HOMEROOM_CONDUCT_RULES.filter(rule => rule.group === group).map(rule => `<option value="${homeroomEscapeHtml(rule.id)}">${homeroomEscapeHtml(rule.label)} · ${homeroomEscapeHtml(homeroomFormatPoints(rule.points))}</option>`).join('');
                    return `<optgroup label="${homeroomEscapeHtml(group)}">${options}</optgroup>`;
                }).join('');
            }
            if (table) {
                table.innerHTML = `<table class="homeroom-rules-table"><thead><tr><th>Nhóm</th><th>Nội dung</th><th>Điểm</th><th>Mức độ</th></tr></thead><tbody>${HOMEROOM_CONDUCT_RULES.map(rule => `<tr class="${rule.severity === 'critical' ? 'is-critical-rule' : ''}"><td>${homeroomEscapeHtml(rule.group)}</td><td>${homeroomEscapeHtml(rule.label)}</td><td><strong class="${rule.points < 0 ? 'points-negative' : (rule.points > 0 ? 'points-positive' : '')}">${homeroomEscapeHtml(homeroomFormatPoints(rule.points))}</strong></td><td><span class="homeroom-severity-badge severity-${homeroomEscapeHtml(rule.severity)}">${homeroomEscapeHtml(homeroomSeverityMeta(rule.severity).label)}</span></td></tr>`).join('')}</tbody></table>`;
            }
        }

        function homeroomUpdateRulePreview({ forceRuleDefaults = false } = {}) {
            const book = homeroomActiveBook();
            const data = homeroomEnsureState();
            const ruleSelect = homeroomById('homeroomConductRuleSelect');
            const baseInput = homeroomById('homeroomStudentLogBasePoints');
            const severitySelect = homeroomById('homeroomStudentLogSeverity');
            const typeSelect = homeroomById('homeroomStudentLogType');
            const contentInput = homeroomById('homeroomStudentLogContent');
            const preview = homeroomById('homeroomRepeatPreview');
            const rule = homeroomRuleById(ruleSelect?.value);
            if (rule && forceRuleDefaults) {
                if (baseInput) baseInput.value = String(rule.points);
                if (severitySelect) severitySelect.value = rule.severity;
                if (typeSelect) typeSelect.value = rule.type;
                if (contentInput && !cleanText(contentInput.value)) contentInput.value = rule.label;
            }
            const date = normalizeHomeroomDate(homeroomById('homeroomStudentLogDate')?.value) || homeroomTodayISO();
            const info = homeroomRepeatInfo(book, data.selectedStudentId, rule?.id || '', date);
            const basePoints = homeroomClampPoints(baseInput?.value);
            const multiplier = basePoints < 0 && rule ? info.multiplier : 1;
            const applied = homeroomClampPoints(basePoints * multiplier);
            if (preview) preview.value = rule && basePoints < 0
                ? (info.repeatCount === 0 ? `Lần đầu · ${homeroomFormatPoints(applied)}` : `Đã ${info.repeatCount} lần · ×${String(multiplier).replace('.',',')} → ${homeroomFormatPoints(applied)}`)
                : `Không · ${homeroomFormatPoints(applied)}`;
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
                        <div class="homeroom-log-badges"><span class="homeroom-point-badge ${entry.points < 0 ? 'negative' : (entry.points > 0 ? 'positive' : 'neutral')}">${homeroomEscapeHtml(homeroomFormatPoints(entry.points))}</span><span class="homeroom-severity-badge severity-${homeroomEscapeHtml(entry.severity)}">${homeroomEscapeHtml(homeroomSeverityMeta(entry.severity).label)}</span>${entry.repeatMultiplier > 1 ? `<span class="homeroom-repeat-badge">Tái phạm ×${homeroomEscapeHtml(String(entry.repeatMultiplier).replace('.',','))}</span>` : ''}${entry.seriousFlag ? (entry.resolved ? '<span class="homeroom-serious-badge resolved">✓ Lịch sử nghiêm trọng</span>' : '<span class="homeroom-serious-badge">🚨 Nghiêm trọng đang xử lý</span>') : ''}</div>
                        ${entry.content ? `<p>${homeroomEscapeHtml(entry.content)}</p>` : ''}
                        ${entry.followUp ? `<small>↳ Theo dõi: ${homeroomEscapeHtml(entry.followUp)}</small>` : ''}
                        ${entry.resolved && entry.resolvedAt ? `<small>✓ Xử lý lúc: ${homeroomEscapeHtml(new Date(entry.resolvedAt).toLocaleString('vi-VN'))}</small>` : ''}
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
            ['homeroomAddStudentBtn','homeroomPasteRosterBtn','homeroomImportGradebookBtn','homeroomQuickLogBtn','homeroomExportExcelBtn','homeroomClearBookBtn','homeroomCreateFourGroupsBtn','homeroomAddGroupBtn','homeroomAutoAssignGroupsBtn','homeroomAddCustomOfficerBtn'].forEach(id => {
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
            homeroomRenderMonitoring(book);
            homeroomRenderOrganization(book);
            homeroomRenderRoster(book);
            homeroomApplyRosterFilters();
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
            homeroomUpdateRulePreview();
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
            if (!['name','birthDate','gender','parentName','parentPhone','studentPhone','address','note','groupId'].includes(field)) return;
            if (field === 'groupId') homeroomAssignStudentGroup(book, student, cleanText(input.value));
            else student[field] = field === 'birthDate' ? normalizeHomeroomDate(input.value) : cleanText(input.value);
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            if (field === 'groupId') renderHomeroom();
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
            (book.groups || []).forEach(group => {
                if (group.leaderId === studentId) group.leaderId = '';
                if (group.deputyId === studentId) group.deputyId = '';
            });
            Object.keys(book.classOfficers || {}).forEach(roleId => { if (book.classOfficers[roleId] === studentId) book.classOfficers[roleId] = ''; });
            (book.customOfficers || []).forEach(role => { if (role.studentId === studentId) role.studentId = ''; });
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
            const rule = homeroomRuleById(homeroomById('homeroomConductRuleSelect')?.value);
            const type = cleanText(homeroomById('homeroomStudentLogType')?.value);
            const content = cleanText(homeroomById('homeroomStudentLogContent')?.value) || rule?.label || '';
            const followUp = cleanText(homeroomById('homeroomStudentLogFollowUp')?.value);
            const date = normalizeHomeroomDate(homeroomById('homeroomStudentLogDate')?.value) || homeroomTodayISO();
            const severityRaw = cleanText(homeroomById('homeroomStudentLogSeverity')?.value);
            const severity = HOMEROOM_SEVERITIES.includes(severityRaw) ? severityRaw : (rule?.severity || 'neutral');
            const basePoints = homeroomClampPoints(homeroomById('homeroomStudentLogBasePoints')?.value ?? rule?.points ?? 0);
            const repeat = rule && basePoints < 0 ? homeroomRepeatInfo(book, student.id, rule.id, date) : { repeatCount:0, multiplier:1 };
            const points = homeroomClampPoints(basePoints * repeat.multiplier);
            const entry = normalizeHomeroomEntry({
                id: homeroomCreateId('cn-log'),
                studentId: student.id,
                date,
                semester: homeroomGetSelectedSemester(),
                type,
                ruleId: rule?.id || '',
                content,
                followUp,
                basePoints,
                points,
                severity,
                repeatCount: repeat.repeatCount,
                repeatMultiplier: repeat.multiplier,
                seriousFlag: severity === 'critical',
                resolved: false,
                resolvedAt: '',
                createdAt: new Date().toISOString(),
            }, book.entries.length);
            book.entries.push(entry);
            book.updatedAt = new Date().toISOString();
            homeroomById('homeroomStudentLogContent').value = '';
            homeroomById('homeroomStudentLogFollowUp').value = '';
            homeroomById('homeroomConductRuleSelect').value = '';
            homeroomById('homeroomStudentLogBasePoints').value = '0';
            homeroomById('homeroomStudentLogSeverity').value = 'neutral';
            homeroomSchedulePersist();
            renderHomeroom();
            homeroomUpdateRulePreview();
            const seriousMessage = entry.seriousFlag ? ' · 🚨 đã gắn cờ vi phạm nghiêm trọng' : '';
            showToast(`✅ Đã ghi nhận ${homeroomEntryMeta(type).label}: ${homeroomFormatPoints(points)}${seriousMessage}`, entry.seriousFlag ? 'info' : 'success');
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
            entry.resolvedAt = entry.resolved ? new Date().toISOString() : '';
            book.updatedAt = new Date().toISOString();
            homeroomSchedulePersist();
            renderHomeroom();
            if (entry.seriousFlag) showToast(entry.resolved ? '✅ Đã chuyển vi phạm nghiêm trọng sang lịch sử đã xử lý' : '🚨 Đã mở lại vi phạm nghiêm trọng để tiếp tục xử lý', entry.resolved ? 'success' : 'info');
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

        async function homeroomExportExcel() {
            const book = homeroomActiveBook();
            try { await ensureVendorLibrary('xlsx'); } catch (error) { showToast('❌ ' + error.message, 'error'); return; }
            if (!book) return;
            try {
                const semester = homeroomGetSelectedSemester();
                const summary = homeroomSummarizeBook(book, semester);
                const studentMap = new Map(book.students.map(student => [student.id, student.name]));
                const wb = XLSX.utils.book_new();
                const profileRows = book.students.map((student, index) => ({
                    'STT': index + 1,
                    'Họ và tên': student.name,
                    'Tổ': homeroomFindGroup(book, student.groupId)?.name || '',
                    'Chức vụ': homeroomStudentRoleLabels(book, student.id).map(item => item.label).join(' | '),
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
                    'Quy tắc điểm': homeroomRuleById(entry.ruleId)?.label || '',
                    'Điểm gốc': entry.basePoints,
                    'Hệ số tái phạm': entry.repeatMultiplier,
                    'Điểm áp dụng': entry.points,
                    'Mức độ': homeroomSeverityMeta(entry.severity).label,
                    'Cờ nghiêm trọng': entry.seriousFlag ? 'Có' : '',
                    'Nội dung': entry.content,
                    'Theo dõi / biện pháp': entry.followUp,
                    'Trạng thái': ['absence_unexcused','violation','support'].includes(entry.type) ? (entry.resolved ? 'Đã xử lý' : 'Chưa xử lý') : '',
                    'Thời điểm xử lý': entry.resolvedAt ? new Date(entry.resolvedAt).toLocaleString('vi-VN') : '',
                }));
                const classRows = (book.entries || []).filter(entry => !entry.studentId).map(entry => ({
                    'Ngày': homeroomFormatDate(entry.date),
                    'Học kỳ': `HK${entry.semester}`,
                    'Loại': homeroomEntryMeta(entry.type).label,
                    'Nội dung': entry.content,
                }));
                const thresholds = homeroomGetMonitoringThresholds(book);
                const monitoringRows = homeroomBuildMonitoringRows(book, semester).map(({ student, metrics, status }) => ({
                    'Học sinh': student.name,
                    'Vắng có phép': metrics.absenceExcused,
                    'Vắng không phép': metrics.absenceUnexcused,
                    'Tổng vắng': metrics.absenceTotal,
                    'Đi muộn': metrics.late,
                    'Vi phạm': metrics.violation,
                    'Điểm tuần': metrics.weekScore,
                    'Cộng/trừ trong tuần': metrics.weekPoints,
                    'Mức điểm tuần': metrics.scoreBand.label,
                    'Nghiêm trọng đang xử lý': metrics.activeSeriousCount,
                    'Nghiêm trọng đã xử lý': metrics.resolvedSeriousCount,
                    'Lịch sử nghiêm trọng': metrics.seriousHistoryCount,
                    'Nghiêm trọng trong tuần': metrics.weekSeriousCount,
                    'Mức cao nhất trong lịch sử HK': homeroomSeverityMeta(metrics.maxSeverity).label,
                    'Xu hướng 4 tuần': metrics.trend?.label || 'Ổn định',
                    'Chuỗi điểm 4 tuần': (metrics.trend?.scores || []).join(' → '),
                    'Ghi nhận chưa xử lý': metrics.unresolved,
                    'Lần gần nhất': homeroomFormatDate(metrics.lastEntryDate),
                    'Trạng thái theo ngưỡng': status.label,
                    'Ngưỡng đã chạm': status.alerts.join(' | '),
                }));
                const organizationRows = [];
                HOMEROOM_CLASS_ROLE_META.forEach(role => {
                    const student = homeroomFindStudent(book, book.classOfficers?.[role.id]);
                    organizationRows.push({ 'Nhóm':'Ban cán sự lớp', 'Vị trí':role.label, 'Học sinh':student?.name || '' });
                });
                (book.customOfficers || []).forEach(role => {
                    const student = homeroomFindStudent(book, role.studentId);
                    organizationRows.push({ 'Nhóm':'Chức vụ khác', 'Vị trí':role.label, 'Học sinh':student?.name || '' });
                });
                (book.groups || []).forEach(group => {
                    organizationRows.push({ 'Nhóm':group.name, 'Vị trí':'Tổ trưởng', 'Học sinh':homeroomFindStudent(book, group.leaderId)?.name || '' });
                    organizationRows.push({ 'Nhóm':group.name, 'Vị trí':'Tổ phó', 'Học sinh':homeroomFindStudent(book, group.deputyId)?.name || '' });
                });
                const groupStatisticRows = (book.groups || []).map(group => {
                    const metrics = homeroomGroupMetrics(book, group);
                    return {
                        'Tổ': group.name,
                        'Sĩ số': metrics.members.length,
                        'Tổ trưởng': homeroomFindStudent(book, group.leaderId)?.name || '',
                        'Tổ phó': homeroomFindStudent(book, group.deputyId)?.name || '',
                        'Tổng lượt vắng': metrics.totalAbsence,
                        'Đi muộn': metrics.late,
                        'Vi phạm': metrics.violation,
                        'Điểm tuần trung bình': metrics.averageWeekScore,
                    };
                });
                const summaryRows = [
                    ['SỔ CHỦ NHIỆM CÁ NHÂN'],
                    ['Năm học', state.selectedAcademicYear],
                    ['Lớp', book.className],
                    ['Giáo viên chủ nhiệm', book.homeroomTeacher || state.teacherProfile?.teacherName || ''],
                    ['Học kỳ đang xem', `Học kỳ ${semester}`],
                    ['Sĩ số', summary.students],
                    ['Vắng có phép', summary.absenceExcused],
                    ['Vắng không phép', summary.absenceUnexcused],
                    ['Đi muộn', summary.late],
                    ['Vi phạm', summary.violations],
                    ['Học sinh chạm/vượt ngưỡng', summary.thresholdStudents],
                    ['Học sinh cần theo dõi', summary.attentionStudents],
                    ['HS có vi phạm nghiêm trọng đang xử lý', summary.criticalStudents],
                    ['HS có lịch sử vi phạm nghiêm trọng', summary.seriousHistoryStudents],
                    ['HS nghiêm trọng đã xử lý, không còn cảnh báo đỏ', summary.resolvedSeriousStudents],
                    ['HS xu hướng điểm 4 tuần tích cực', summary.improvingStudents],
                    ['HS xu hướng điểm 4 tuần giảm', summary.decliningStudents],
                    ['Học sinh điểm tuần dưới 90', summary.lowWeekScoreStudents],
                    ['Tuần tính điểm', homeroomWeekLabel(homeroomWeekAnchorDate || homeroomTodayISO())],
                    ['Ngưỡng tổng vắng', thresholds.totalAbsence],
                    ['Ngưỡng vắng không phép', thresholds.unexcusedAbsence],
                    ['Ngưỡng đi muộn', thresholds.late],
                    ['Ngưỡng vi phạm', thresholds.violation],
                    ['Trao đổi phụ huynh', summary.parentContacts],
                    ['Khen thưởng', summary.commendations],
                ];
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Tổng quan');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileRows), 'Hồ sơ học sinh');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(organizationRows), 'Cơ cấu lớp');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupStatisticRows), 'Thống kê theo tổ');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(individualRows), 'Theo dõi học sinh');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monitoringRows), 'Tần suất cần chú ý');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classRows), 'Nhật ký lớp');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(HOMEROOM_CONDUCT_RULES.map(rule => ({'Nhóm':rule.group,'Nội dung':rule.label,'Điểm':rule.points,'Mức độ':homeroomSeverityMeta(rule.severity).label}))), 'Quy tắc cộng trừ');
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
            try { homeroomPrivacyHidden = sessionStorage.getItem('teacher_homeroom_privacy_hidden_v1') !== '0'; } catch (_) { homeroomPrivacyHidden = true; }
            const card = homeroomById('homeroomCard');
            if (!card) return;
            homeroomInitialized = true;

            homeroomById('homeroomOpenBtn')?.addEventListener('click', homeroomOpenOrCreateBook);
            homeroomById('homeroomAddStudentBtn')?.addEventListener('click', homeroomAddStudent);
            homeroomById('homeroomImportGradebookBtn')?.addEventListener('click', homeroomImportFromGradebook);
            homeroomById('homeroomExportExcelBtn')?.addEventListener('click', homeroomExportExcel);
            homeroomById('homeroomCreateFourGroupsBtn')?.addEventListener('click', homeroomCreateFourGroups);
            homeroomById('homeroomAddGroupBtn')?.addEventListener('click', homeroomAddGroup);
            homeroomById('homeroomAutoAssignGroupsBtn')?.addEventListener('click', homeroomAutoAssignGroups);
            homeroomById('homeroomAddCustomOfficerBtn')?.addEventListener('click', homeroomAddCustomOfficer);
            homeroomById('homeroomOrganizationSection')?.addEventListener('change', homeroomHandleOrganizationChange);
            homeroomById('homeroomOrganizationSection')?.addEventListener('click', event => {
                const deleteGroup = event.target.closest('[data-homeroom-delete-group]');
                if (deleteGroup) homeroomDeleteGroup(deleteGroup.dataset.homeroomDeleteGroup);
                const deleteCustom = event.target.closest('[data-homeroom-delete-custom-officer]');
                if (deleteCustom) homeroomDeleteCustomOfficer(deleteCustom.dataset.homeroomDeleteCustomOfficer);
            });
            homeroomById('homeroomSearchInput')?.addEventListener('input', event => { homeroomRosterSearch = event.target.value || ''; homeroomApplyRosterFilters(); });
            homeroomById('homeroomFilterSelect')?.addEventListener('change', event => { homeroomRosterFilter = event.target.value || 'all'; homeroomApplyRosterFilters(); });
            homeroomById('homeroomMonitoringViewSelect')?.addEventListener('change', event => {
                const allowed = ['flagged','priority','trends','all'];
                homeroomMonitoringView = allowed.includes(event.target.value) ? event.target.value : 'flagged';
                homeroomRenderMonitoring(homeroomActiveBook());
            });
            homeroomById('homeroomWeekAnchorDate')?.addEventListener('change', event => { homeroomWeekAnchorDate = normalizeHomeroomDate(event.target.value) || homeroomTodayISO(); renderHomeroom(); homeroomUpdateRulePreview(); });
            homeroomById('homeroomConductRuleSelect')?.addEventListener('change', () => homeroomUpdateRulePreview({ forceRuleDefaults:true }));
            homeroomById('homeroomStudentLogBasePoints')?.addEventListener('input', () => homeroomUpdateRulePreview());
            homeroomById('homeroomStudentLogDate')?.addEventListener('change', () => homeroomUpdateRulePreview());
            homeroomById('homeroomThresholds')?.addEventListener('change', event => {
                const input = event.target.closest('[data-homeroom-threshold]');
                if (input) homeroomUpdateMonitoringThreshold(input);
            });
            homeroomById('homeroomMonitoringTable')?.addEventListener('click', event => {
                const button = event.target.closest('[data-homeroom-monitor-student]');
                if (!button) return;
                homeroomSelectStudent(button.dataset.homeroomMonitorStudent);
                homeroomById('homeroomStudentLogPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            homeroomById('homeroomPrivacyBtn')?.addEventListener('click', homeroomTogglePrivacy);
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
            homeroomById('homeroomStudentSelect')?.addEventListener('change', event => { homeroomSelectStudent(event.target.value); homeroomUpdateRulePreview(); });
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
            homeroomWeekAnchorDate = date;
            homeroomRenderRuleCatalog();
            if (homeroomById('homeroomStudentLogDate')) homeroomById('homeroomStudentLogDate').value = date;
            if (homeroomById('homeroomWeekAnchorDate')) homeroomById('homeroomWeekAnchorDate').value = date;
            if (homeroomById('homeroomClassLogDate')) homeroomById('homeroomClassLogDate').value = date;
            renderHomeroom();
        }
