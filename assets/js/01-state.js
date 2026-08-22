        // ================================================================
        //  STATE
        // ================================================================
        const storageWarnings = [];

        function readStoredJSON(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch (error) {
                console.warn('Dữ liệu lưu bị hỏng:', key, error);
                storageWarnings.push(key);
                try { window.teacherNotebookQuarantineStorage?.(key, localStorage.getItem(key), error); } catch (_) { /* noop */ }
                window.teacherNotebookRecordError?.('storage-json', error, { source: key });
                localStorage.removeItem(key);
                return fallback;
            }
        }

        function writeStoredJSON(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Không thể lưu dữ liệu:', key, error);
                return false;
            }
        }

        const API_KEY_SESSION_STORAGE = 'gemini_api_key_session';
        const API_KEY_PERSISTENT_STORAGE = 'gemini_api_key_saved';

        // Tương thích với bản cũ từng dùng tên lưu "gemini_api_key".
        const legacyApiKey = localStorage.getItem('gemini_api_key') || '';
        if (legacyApiKey
            && !sessionStorage.getItem(API_KEY_SESSION_STORAGE)
            && !localStorage.getItem(API_KEY_PERSISTENT_STORAGE)) {
            sessionStorage.setItem(API_KEY_SESSION_STORAGE, legacyApiKey);
        }
        localStorage.removeItem('gemini_api_key');
        const savedApiKey = localStorage.getItem(API_KEY_PERSISTENT_STORAGE) || '';
        if (savedApiKey && !sessionStorage.getItem(API_KEY_SESSION_STORAGE)) {
            sessionStorage.setItem(API_KEY_SESSION_STORAGE, savedApiKey);
        }

        // ---------- App & data versions ----------
        // APP_VERSION dùng cho hiển thị/chẩn đoán; DATA_SCHEMA_VERSION kiểm soát migration dữ liệu local.
        const APP_VERSION = '50.0.0';
        const DATA_SCHEMA_VERSION = 1;
        const DATA_SCHEMA_STORAGE_PREFIX = 'teacher_notebook_data_schema';

        const GEMINI_MODEL = 'gemini-3.5-flash';
        const GEMINI_SAFE_REQUESTS_PER_MINUTE = 4;
        const GEMINI_REQUEST_INTERVAL_MS = 15500;
        const GEMINI_RATE_NEXT_STORAGE = 'gemini_next_safe_request_at';
        const GEMINI_429_RETRY_DELAYS = [15000, 30000, 60000];
        const SCHOOL_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const PLAN_DAYS = [...SCHOOL_DAYS, 'Chủ nhật'];
        const MAX_SCHOOL_WEEKS = 37;
        const AUXILIARY_PLAN_WEEKS = [-1, -2];
        const RECOGNITION_CACHE_KEY = 'teacher_recognition_cache_v1';
        const RECOGNITION_ENGINE_VERSION = 4;
        const CURRICULUM_PROFILES_STORAGE = 'teacher_curriculum_profiles_v2';
        const YEAR_WORKSPACES_STORAGE = 'teacher_year_workspaces_v1';
        const SELECTED_ACADEMIC_YEAR_STORAGE = 'teacher_selected_academic_year';
        const RECOGNITION_MODES = ['auto', 'accurate', 'economy', 'offline'];
        const BACKUP_FORMAT = 'teacher-notebook-backup';
        const BACKUP_VERSION = 4;
        const PRE_RESTORE_BACKUP_KEY = 'teacher_pre_restore_backup_v1';
        const PRE_CLOUD_SYNC_BACKUP_KEY = 'teacher_pre_cloud_sync_backup_v1';
        const SHARED_PLAN_HISTORY_STORAGE = 'teacher_shared_plan_history_v1';
        const SHARED_PLAN_HISTORY_LIMIT = 5;
        const WORK_SCOPE_STORAGE = 'teacher_work_scope_v1';
        const WORK_VIEW_STORAGE = 'teacher_work_view_v1';
        const WORK_SMART_FILTER_STORAGE = 'teacher_work_smart_filter_v1';
        const WORK_ITEM_TYPES = ['note', 'lesson', 'task'];
        const WORK_TASK_STATUSES = ['todo', 'doing', 'waiting', 'done'];
        const WORK_PRIORITIES = ['urgent', 'high', 'normal', 'low'];
        const WORK_RECURRENCES = ['none', 'weekly', 'monthly'];
        const WORK_LINK_TARGETS = ['', 'plan', 'timetable', 'teaching', 'reports', 'automation'];
        const FIREBASE_SDK_VERSION = '12.17.1';
        const ACCOUNT_CONFIG_STORAGE = 'teacher_notebook_firebase_config_v1';
        const ACCOUNT_ACCESS_MODE_STORAGE = 'teacher_notebook_access_mode_v1';
        const ACCOUNT_COLLECTION = 'teacherNotebookGroups';
        const ACCOUNT_GROUP_ID = 'main-teacher-group';
        const ACCOUNT_FIREBASE_APP_NAME = 'teacher-notebook-accounts';
        const DEFAULT_TEACHER_PROFILE = {
            schoolName: 'Trường THPT Lê Quảng Chí',
            teacherName: 'Võ Viết Chương',
            subject: 'Toán',
            academicYear: '2025-2026',
        };
        localStorage.removeItem('gemini_model');

        const PLAN_SCHEMA = {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'schoolYear', 'week', 'dateRange', 'duty', 'days', 'warnings'],
            properties: {
                title: { type: 'string' },
                schoolYear: { type: 'string' },
                week: { type: 'integer' },
                dateRange: { type: 'string' },
                duty: { type: 'string' },
                days: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['day', 'date', 'morning', 'afternoon', 'businessTrip'],
                        properties: {
                            day: { type: 'string' },
                            date: { type: 'string' },
                            morning: { type: 'string' },
                            afternoon: { type: 'string' },
                            businessTrip: { type: 'string' },
                        },
                    },
                },
                warnings: { type: 'array', items: { type: 'string' } },
            },
        };

        const TIMETABLE_SCHEMA = {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'days', 'sessions', 'warnings'],
            properties: {
                title: { type: 'string' },
                days: { type: 'array', items: { type: 'string' } },
                sessions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['key', 'label', 'periods'],
                        properties: {
                            key: { type: 'string' },
                            label: { type: 'string' },
                            periods: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: ['period', 'cells'],
                                    properties: {
                                        period: { type: 'integer' },
                                        cells: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                additionalProperties: false,
                                                required: ['day', 'className', 'subject', 'content'],
                                                properties: {
                                                    day: { type: 'string' },
                                                    className: { type: 'string' },
                                                    subject: { type: 'string' },
                                                    content: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                warnings: { type: 'array', items: { type: 'string' } },
            },
        };

        const TEACHING_SCHEDULE_SCHEMA = {
            type: 'object',
            additionalProperties: false,
            required: ['schedule'],
            properties: {
                schedule: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['day', 'session', 'class', 'period', 'ppctPeriod', 'subject', 'topic', 'note'],
                        properties: {
                            day: { type: 'string' },
                            session: { type: 'string' },
                            class: { type: 'string' },
                            period: {
                                type: 'string',
                                description: 'Tiết TKB: vị trí tiết học trong buổi, sao chép từ thời khóa biểu.',
                            },
                            ppctPeriod: {
                                type: 'string',
                                description: 'Tiết PPCT: số thứ tự trong phân phối chương trình, dùng để tra đúng tên bài.',
                            },
                            subject: { type: 'string' },
                            topic: { type: 'string' },
                            note: { type: 'string' },
                        },
                    },
                },
            },
        };

        function cleanText(value) {
            return String(value ?? '').replace(/\r\n?/g, '\n').trim();
        }

        function normalizeDayName(value) {
            const text = cleanText(value).toLowerCase().replace(/\s+/g, ' ');
            if (/^(?:cn|chủ nhật|chu nhat|chủ nh[ậa]t)$/.test(text) || text.includes('chủ nhật')) {
                return 'Chủ nhật';
            }
            const number = text.match(/[2-7]/)?.[0];
            return number ? `Thứ ${number}` : cleanText(value);
        }

        function planDayOrder(value) {
            const index = PLAN_DAYS.indexOf(normalizeDayName(value));
            return index >= 0 ? index : PLAN_DAYS.length;
        }

        function isMainSchoolWeek(week) {
            const normalizedWeek = Number.parseInt(week, 10);
            return normalizedWeek > 0 && normalizedWeek <= MAX_SCHOOL_WEEKS;
        }

        function isAuxiliaryPlanWeek(week) {
            return AUXILIARY_PLAN_WEEKS.includes(Number.parseInt(week, 10));
        }

        function isValidPlanWeek(week) {
            return isMainSchoolWeek(week) || isAuxiliaryPlanWeek(week);
        }

        function getPlanWeekLabel(week) {
            const normalizedWeek = Number.parseInt(week, 10);
            if (normalizedWeek === -1) return 'Tuần phụ 1';
            if (normalizedWeek === -2) return 'Tuần phụ 2';
            return `Tuần ${normalizedWeek}`;
        }

        function normalizePlanCellText(value) {
            return cleanText(value).replace(/\n[\t ]*\n+/g, '\n');
        }

        function normalizeSessionLabel(value) {
            const text = cleanText(value).toLowerCase();
            if (text.includes('sáng') || text === 'morning') return 'Buổi sáng';
            if (text.includes('chiều') || text === 'afternoon') return 'Buổi chiều';
            return cleanText(value);
        }

        function parsePlanDateParts(value) {
            const match = cleanText(value).match(/(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{2,4}))?/);
            if (!match) return null;
            const day = Number.parseInt(match[1], 10);
            const month = Number.parseInt(match[2], 10);
            let year = Number.parseInt(match[3], 10);
            if (Number.isFinite(year) && year < 100) year += 2000;
            if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) return null;
            return { day, month, year: Number.isFinite(year) ? year : null };
        }

        function parsePlanDateRange(value) {
            const text = cleanText(value);
            const match = text.match(/(?:Từ\s*ngày\s*)?(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{2,4}))?\s*(?:đến|[-–])\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{2,4}))?/i);
            if (!match) return null;
            let startYear = Number.parseInt(match[3], 10);
            let endYear = Number.parseInt(match[6], 10);
            if (Number.isFinite(startYear) && startYear < 100) startYear += 2000;
            if (Number.isFinite(endYear) && endYear < 100) endYear += 2000;
            if (!Number.isFinite(startYear) && Number.isFinite(endYear)) startYear = endYear;
            if (!Number.isFinite(endYear) && Number.isFinite(startYear)) endYear = startYear;
            if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
            const start = new Date(startYear, Number(match[2]) - 1, Number(match[1]));
            const end = new Date(endYear, Number(match[5]) - 1, Number(match[4]));
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
            return { start, end };
        }

        function planDateToTimestamp(value, fallbackYear = null) {
            const parts = parsePlanDateParts(value);
            if (!parts) return null;
            const year = parts.year || fallbackYear;
            if (!Number.isFinite(year)) return null;
            const date = new Date(year, parts.month - 1, parts.day);
            return Number.isNaN(date.getTime()) ? null : date.getTime();
        }

        function canonicalizePlanDays(days, dateRange = '') {
            const source = Array.isArray(days) ? days.filter(Boolean) : [];
            const range = parsePlanDateRange(dateRange);
            let filtered = source;
            if (range) {
                const startTime = range.start.getTime();
                const endTime = range.end.getTime();
                filtered = source.filter(item => {
                    const time = planDateToTimestamp(item?.date, range.end.getFullYear());
                    return time == null || (time >= startTime && time <= endTime);
                });
            }

            const byDay = new Map();
            filtered.forEach(item => {
                const day = normalizeDayName(item?.day);
                if (!PLAN_DAYS.includes(day)) return;
                const candidate = { ...item, day };
                const previous = byDay.get(day);
                if (!previous) {
                    byDay.set(day, candidate);
                    return;
                }
                // Nếu ảnh có cùng một thứ xuất hiện hai lần (ví dụ CN 16/8 và CN 23/8),
                // ưu tiên hàng nằm trong khoảng ngày của tuần; sau đó ưu tiên hàng có nội dung đầy đủ hơn.
                const score = value => [value?.morning, value?.afternoon, value?.businessTrip, value?.date]
                    .map(cleanText).join(' ').length;
                if (score(candidate) > score(previous)) byDay.set(day, candidate);
            });
            return PLAN_DAYS.map(day => byDay.get(day)).filter(Boolean);
        }

        function normalizePlanWeek(item) {
            if (!item || typeof item !== 'object') return null;
            const normalizedDays = Array.isArray(item.days) ? item.days.map(day => ({
                day: normalizeDayName(day?.day),
                date: cleanText(day?.date),
                morning: normalizePlanCellText(day?.morning),
                afternoon: normalizePlanCellText(day?.afternoon),
                businessTrip: normalizePlanCellText(day?.businessTrip),
            })).filter(day => day.day || day.date || day.morning || day.afternoon || day.businessTrip) : [];
            const days = canonicalizePlanDays(normalizedDays, cleanText(item.dateRange));
            const week = Number.parseInt(item.week, 10);
            if (!isValidPlanWeek(week)) return null;
            return {
                title: cleanText(item.title) || 'LỊCH CÔNG TÁC',
                schoolYear: cleanText(item.schoolYear),
                week,
                dateRange: cleanText(item.dateRange),
                duty: cleanText(item.duty),
                days,
                warnings: Array.isArray(item.warnings) ? item.warnings.map(cleanText).filter(Boolean) : [],
                legacyContent: cleanText(item.legacyContent || item.content),
                sourceMode: cleanText(item.sourceMode) || 'legacy',
                offlineOcrText: cleanText(item.offlineOcrText),
                cacheHash: cleanText(item.cacheHash),
                cacheHit: Boolean(item.cacheHit),
                fallbackReason: cleanText(item.fallbackReason),
                ocrLayoutConfidence: Number.isFinite(Number(item.ocrLayoutConfidence))
                    ? Number(item.ocrLayoutConfidence) : null,
                updatedAt: cleanText(item.updatedAt || item.createdAt),
                status: days.length > 0 || item.status === 'done' ? 'done' : 'pending',
            };
        }

        function normalizeTimetable(data) {
            if (!data || typeof data !== 'object' || !Array.isArray(data.sessions)) return null;
            const warnings = Array.isArray(data.warnings) ? data.warnings.map(cleanText).filter(Boolean) : [];
            const sessions = ['morning', 'afternoon'].map((key, index) => {
                const source = data.sessions.find(session => cleanText(session?.key).toLowerCase() === key)
                    || data.sessions[index]
                    || {};
                const sourcePeriods = Array.isArray(source.periods) ? source.periods : [];
                const periods = [1, 2, 3, 4, 5].map(period => {
                    const row = sourcePeriods.find(item => Number.parseInt(item?.period, 10) === period) || {};
                    const normalizedCells = Array.isArray(row.cells) ? row.cells.map(cell => {
                        const day = normalizeDayName(cell?.day);
                        if (!SCHOOL_DAYS.includes(day)) return null;
                        const className = cleanText(cell?.className);
                        const subject = cleanText(cell?.subject);
                        return {
                            day,
                            className,
                            subject,
                            content: cleanText(cell?.content) || [className, subject].filter(Boolean).join(' - '),
                        };
                    }).filter(cell => cell && cell.content) : [];
                    const cellsByDay = new Map();
                    normalizedCells.forEach(cell => {
                        const previous = cellsByDay.get(cell.day);
                        if (!previous || cell.content.length > previous.content.length) cellsByDay.set(cell.day, cell);
                        if (previous && previous.content !== cell.content) {
                            warnings.push(`${key === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}, tiết ${period}, ${cell.day}: Gemini trả nhiều hơn một nội dung; đã giữ nội dung đầy đủ hơn.`);
                        }
                    });
                    const cells = SCHOOL_DAYS.map(day => cellsByDay.get(day)).filter(Boolean);
                    return { period, cells };
                });
                return {
                    key,
                    label: key === 'morning' ? 'BUỔI SÁNG' : 'BUỔI CHIỀU',
                    periods,
                };
            });
            return {
                title: cleanText(data.title) || 'THỜI KHÓA BIỂU TUẦN',
                week: Number.parseInt(data.week, 10) > 0 ? Number.parseInt(data.week, 10) : null,
                copiedFromWeek: Number.parseInt(data.copiedFromWeek, 10) > 0 ? Number.parseInt(data.copiedFromWeek, 10) : null,
                days: [...SCHOOL_DAYS],
                sessions,
                warnings: [...new Set(warnings)],
                sourceMode: cleanText(data.sourceMode) || 'legacy',
                offlineOcrText: cleanText(data.offlineOcrText),
                cacheHash: cleanText(data.cacheHash),
                cacheHit: Boolean(data.cacheHit),
            };
        }

        function scheduleSlotKey(item) {
            return [
                normalizeDayName(item?.day),
                normalizeSessionLabel(item?.session),
                cleanText(item?.period),
            ].join('|');
        }

        function hashText(value) {
            let hash = 2166136261;
            for (const char of String(value || '')) {
                hash ^= char.charCodeAt(0);
                hash = Math.imul(hash, 16777619);
            }
            return (hash >>> 0).toString(36);
        }

        function createScheduleItemId(item, week, index = 0) {
            const base = cleanText(item?.sourceSlotKey) || scheduleSlotKey(item) || `row-${index}`;
            return `schedule-${week}-${hashText(base)}-${index}`;
        }

        function normalizeScheduleItem(item, week, index = 0) {
            if (!item || typeof item !== 'object') return null;
            const normalized = {
                day: normalizeDayName(item.day),
                session: normalizeSessionLabel(item.session),
                class: cleanText(item.class),
                period: cleanText(item.period),
                ppctPeriod: cleanText(item.ppctPeriod || item.curriculumPeriod || item.lessonNumber),
                subject: cleanText(item.subject),
                topic: cleanText(item.topic),
                note: cleanText(item.note),
                id: cleanText(item.id),
                sourceSlotKey: cleanText(item.sourceSlotKey),
                manualEdited: Boolean(item.manualEdited),
                manualAdded: Boolean(item.manualAdded),
                makeupLesson: Boolean(item.makeupLesson),
                notTeaching: Boolean(item.notTeaching),
                notTeachingReason: cleanText(item.notTeachingReason),
                manualPpct: Boolean(item.manualPpct),
                manualTopic: typeof item.manualTopic === 'boolean' ? item.manualTopic : null,
                curriculumSource: cleanText(item.curriculumSource),
                curriculumProfileId: cleanText(item.curriculumProfileId),
                updatedAt: cleanText(item.updatedAt),
            };
            normalized.id = normalized.id || createScheduleItemId(normalized, week, index);
            normalized.sourceSlotKey = normalized.sourceSlotKey
                || (normalized.manualAdded ? `manual:${normalized.id}` : scheduleSlotKey(normalized));
            return normalized.day || normalized.class || normalized.subject || normalized.topic ? normalized : null;
        }

        function normalizeTeacherProfile(value) {
            const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            return {
                schoolName: cleanText(source.schoolName) || DEFAULT_TEACHER_PROFILE.schoolName,
                teacherName: cleanText(source.teacherName) || DEFAULT_TEACHER_PROFILE.teacherName,
                subject: cleanText(source.subject) || DEFAULT_TEACHER_PROFILE.subject,
                academicYear: normalizeAcademicYear(source.academicYear) || DEFAULT_TEACHER_PROFILE.academicYear,
            };
        }

        function normalizeAcademicYear(value) {
            const match = cleanText(value).match(/^(20\d{2})\s*[-–]\s*(20\d{2})$/);
            if (!match) return '';
            const start = Number.parseInt(match[1], 10);
            const end = Number.parseInt(match[2], 10);
            return end === start + 1 ? `${start}-${end}` : '';
        }

        function normalizeLookupText(value) {
            return cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        function normalizeClassKey(value) {
            return cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        }

        function inferGradeFromClass(value) {
            const match = normalizeClassKey(value).match(/^(10|11|12)/);
            return match?.[1] || '';
        }

        function expandPpctPeriodValues(value) {
            const text = cleanText(value).replace(/\b(?:ti[ếe]t|ppct)\b/gi, ' ').trim();
            if (!text) return [];
            const periods = [];
            const tokenPattern = /(\d{1,3})\s*(?:[-–—]|đ[ếe]n|t[ớo]i|to)\s*(\d{1,3})|(\d{1,3})/gi;
            for (const match of text.matchAll(tokenPattern)) {
                if (match[1] && match[2]) {
                    const start = Number.parseInt(match[1], 10);
                    const end = Number.parseInt(match[2], 10);
                    if (start > 0 && end >= start && end - start <= 200) {
                        for (let ppct = start; ppct <= end; ppct++) periods.push(String(ppct));
                    }
                } else {
                    const ppct = Number.parseInt(match[3], 10);
                    if (ppct > 0) periods.push(String(ppct));
                }
            }
            return [...new Set(periods)];
        }

        function normalizeCurriculumLessons(value) {
            const source = Array.isArray(value) ? value
                : value && typeof value === 'object'
                    ? Object.entries(value).map(([ppctPeriod, topic]) => ({ ppctPeriod, topic }))
                    : [];
            return source.flatMap(item => {
                if (typeof item === 'string') return [{ ppctPeriod: '', topic: cleanText(item) }];
                if (!item || typeof item !== 'object') return [];
                const rawPpct = cleanText(
                    item.ppctPeriod || item.ppctPeriods || item.ppct || item.periodRange
                    || item.periods || item.period || item.lessonNumber || item.tietPPCT || item.tiet
                );
                const topic = cleanText(
                    item.topic || item.topics || item.content || item.lesson
                    || item.lessonName || item.name || item.title
                );
                const periods = expandPpctPeriodValues(rawPpct);
                if (periods.length === 0) return [{ ppctPeriod: rawPpct, topic }];
                return periods.map(ppctPeriod => ({ ppctPeriod, topic }));
            }).filter(item => item && (item.ppctPeriod || item.topic));
        }

        function parseCurriculumTopicMappings(value) {
            const text = cleanText(value)
                .replace(/;\s*(?=(?:ti[ếe]t\s*(?:ppct)?|ppct)\s*\d)/gi, '\n');
            if (!text) return [];
            const entries = text.split('\n').map(cleanText).filter(Boolean).map(line => {
                const match = line.match(/^\s*(?:(?:ti[ếe]t\s*(?:ppct)?|ppct)\s*)?(\d{1,3}(?:\s*(?:[-–—]|đ[ếe]n|t[ớo]i|to)\s*\d{1,3})?)\s*(?::|\.|\)|-)?\s+(.+)$/i);
                return match ? { ppctPeriod: match[1], topic: cleanText(match[2]) } : null;
            }).filter(Boolean);
            return normalizeCurriculumLessons(entries);
        }

        function normalizeCurriculumWeeks(value) {
            if (!Array.isArray(value)) return [];
            const byWeek = new Map();
            value.forEach(item => {
                const week = Number.parseInt(item?.week, 10);
                const lessons = normalizeCurriculumLessons(item?.lessons || item?.periods);
                const lessonTopics = [...new Set(lessons.map(lesson => lesson.topic).filter(Boolean))];
                const topics = cleanText(item?.topics || item?.content) || lessonTopics.join('; ');
                if (!(week > 0 && week <= MAX_SCHOOL_WEEKS) || (!topics && lessons.length === 0)) return;
                const previous = byWeek.get(week);
                const combinedLessons = [...(previous?.lessons || []), ...lessons];
                const uniqueLessons = Array.from(new Map(combinedLessons.map(lesson => [
                    `${cleanText(lesson.ppctPeriod)}|${cleanText(lesson.topic)}`,
                    lesson,
                ])).values());
                const combinedTopics = [previous?.topics, topics].map(cleanText).filter(Boolean);
                byWeek.set(week, {
                    week,
                    topics: [...new Set(combinedTopics)].join('\n'),
                    lessons: uniqueLessons,
                });
            });
            return Array.from(byWeek.values()).sort((a, b) => a.week - b.week);
        }

        function countMappedCurriculumPeriods(weeks) {
            return new Set((weeks || []).flatMap(item =>
                (item.lessons || []).flatMap(lesson => expandPpctPeriodValues(lesson.ppctPeriod))
            )).size;
        }


        function parseCurriculumWeeksLocally(content) {
            const lines = cleanText(content).split('\n').map(cleanText).filter(Boolean);
            const byWeek = new Map();
            let currentWeek = null;
            let tableHeader = null;
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                if (/^===\s*SHEET:/i.test(line)) {
                    tableHeader = null;
                    continue;
                }
                const separator = line.includes('\t') ? /\t/ : line.includes('|') ? /\|/ : /[,;]/;
                const cells = line.split(separator).map(cell => cleanText(cell).replace(/^"|"$/g, ''));
                const lookupCells = cells.map(normalizeLookupText);
                const headerWeekIndex = lookupCells.findIndex(cell =>
                    cell === 'tuan' || cell.includes('tuanthu') || cell.includes('tuanppct')
                );
                const explicitPpctIndex = lookupCells.findIndex(cell =>
                    cell.includes('tietppct') || cell === 'ppct' || cell.includes('sotietppct')
                );
                const plainPpctIndex = lookupCells.findIndex(cell => cell === 'tiet' || cell === 'sotiet');
                // Trong file phân phối chương trình, cột "Tiết" luôn là Tiết PPCT, không phải Tiết TKB.
                const headerPpctIndex = explicitPpctIndex >= 0 ? explicitPpctIndex : plainPpctIndex;
                const headerTopicIndex = lookupCells.findIndex(cell =>
                    cell.includes('tenbai') || cell.includes('baiday') || cell.includes('chude') || cell.includes('noidung')
                );
                if (headerPpctIndex >= 0 && headerTopicIndex >= 0) {
                    tableHeader = {
                        weekIndex: headerWeekIndex,
                        ppctIndex: headerPpctIndex,
                        topicIndex: headerTopicIndex,
                    };
                    continue;
                }
                if (tableHeader && cells.length > Math.max(tableHeader.ppctIndex, tableHeader.topicIndex)) {
                    let week = tableHeader.weekIndex >= 0
                        ? Number.parseInt(cells[tableHeader.weekIndex], 10)
                        : (currentWeek || 1);
                    if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) week = currentWeek || 1;
                    currentWeek = week;
                    const ppctPeriod = cleanText(cells[tableHeader.ppctIndex]);
                    const topics = cleanText(cells[tableHeader.topicIndex]);
                    if (ppctPeriod || topics) {
                        const previous = byWeek.get(week) || { week, topics: '', lessons: [] };
                        if (topics) previous.topics = [...new Set([previous.topics, topics].filter(Boolean))].join('\n');
                        previous.lessons.push({ ppctPeriod, topic: topics });
                        byWeek.set(week, previous);
                    }
                    continue;
                }
                const weekMatch = line.match(/(?:tu[ầa]n|week)\s*[:.\-]?\s*(\d{1,2})\b/i);
                let week = Number.parseInt(weekMatch?.[1], 10);
                let weekCellIndex = cells.findIndex(cell => /(?:tu[ầa]n|week)\s*[:.\-]?\s*\d{1,2}/i.test(cell));
                if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) {
                    const firstNumber = Number.parseInt(cells[0], 10);
                    if (/^\d{1,2}$/.test(cells[0]) && firstNumber > 0 && firstNumber <= MAX_SCHOOL_WEEKS) {
                        week = firstNumber;
                        weekCellIndex = 0;
                    } else if (currentWeek) {
                        // Các dòng kiểu “Tiết 12: ...” thường nằm ngay sau dòng “Tuần N”.
                        // Giữ ngữ cảnh tuần hiện tại thay vì bỏ qua dòng PPCT hợp lệ.
                        week = currentWeek;
                    }
                }
                if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) continue;
                currentWeek = week;

                const ppctMatch = line.match(/(?:ti[ếe]t\s*(?:ppct)?|ppct)\s*[:.\-]?\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/i);
                let ppctPeriod = cleanText(ppctMatch?.[1]);
                let periodCellIndex = cells.findIndex(cell => /(?:ti[ếe]t\s*(?:ppct)?|ppct)\s*[:.\-]?\s*\d/i.test(cell));
                if (!ppctPeriod) {
                    const candidateIndex = cells.findIndex((cell, cellIndex) =>
                        cellIndex !== weekCellIndex && /^\d{1,3}(?:\s*[-–]\s*\d{1,3})?$/.test(cell)
                    );
                    if (candidateIndex >= 0) {
                        ppctPeriod = cells[candidateIndex];
                        periodCellIndex = candidateIndex;
                    }
                }

                let topics = cells.filter((cell, cellIndex) => {
                    if (!cell || cellIndex === weekCellIndex || cellIndex === periodCellIndex) return false;
                    if (/^(?:tu[ầa]n|week|ti[ếe]t(?:\s*ppct)?|ppct)$/i.test(cell)) return false;
                    return true;
                }).join(' - ');
                if (cells.length === 1) {
                    // Một dòng có thể chỉ là “Tiết 12: Tên bài” và kế thừa tuần ở dòng trước.
                    topics = cleanText(line
                        .replace(weekMatch?.[0] || '', '')
                        .replace(ppctMatch?.[0] || '', '')
                        .replace(/^[\s,:;|\-]+/, ''));
                }
                if (!topics && !ppctPeriod && !weekMatch && lines[index + 1] && !/(?:tu[ầa]n|week)\s*\d/i.test(lines[index + 1])) {
                    topics = lines[index + 1];
                }
                if (!topics && !ppctPeriod) continue;
                const previous = byWeek.get(week) || { week, topics: '', lessons: [] };
                if (topics) previous.topics = [...new Set([previous.topics, topics].filter(Boolean))].join('\n');
                if (ppctPeriod || topics) previous.lessons.push({ ppctPeriod, topic: topics });
                byWeek.set(week, previous);
            }
            return normalizeCurriculumWeeks(Array.from(byWeek.values()));
        }


        function parseLegacyCurriculumWeeks(value) {
            const text = typeof value === 'string' ? value : '';
            if (!text) return [];
            try {
                return normalizeCurriculumWeeks(JSON.parse(text));
            } catch (error) {
                return parseCurriculumWeeksLocally(text);
            }
        }

        function curriculumTargetId(source) {
            const scope = ['all', 'grade', 'class'].includes(source?.scope) ? source.scope : 'all';
            const grade = cleanText(source?.grade);
            const className = normalizeClassKey(source?.className);
            const subject = normalizeLookupText(source?.subject || DEFAULT_TEACHER_PROFILE.subject);
            return `curriculum-${hashText([scope, grade, className, subject].join('|'))}`;
        }

        function normalizeCurriculumProfiles(value, legacyText = '') {
            const source = Array.isArray(value) ? value
                : value && typeof value === 'object' && Array.isArray(value.profiles) ? value.profiles : [];
            const profiles = source.map(item => {
                if (!item || typeof item !== 'object') return null;
                const scope = ['all', 'grade', 'class'].includes(item.scope) ? item.scope : 'all';
                const className = scope === 'class' ? cleanText(item.className).toUpperCase() : '';
                const grade = scope === 'all' ? '' : cleanText(item.grade) || inferGradeFromClass(className);
                const weeks = normalizeCurriculumWeeks(item.weeks);
                if (scope === 'class' && !normalizeClassKey(className)) return null;
                if (scope === 'grade' && !['10', '11', '12'].includes(grade)) return null;
                if (weeks.length === 0) return null;
                const normalized = {
                    id: cleanText(item.id),
                    scope,
                    grade,
                    className,
                    subject: cleanText(item.subject) || DEFAULT_TEACHER_PROFILE.subject,
                    fileName: cleanText(item.fileName) || 'Phân phối chương trình',
                    weeks,
                    updatedAt: cleanText(item.updatedAt),
                    migrated: Boolean(item.migrated),
                };
                normalized.id = normalized.id || curriculumTargetId(normalized);
                return normalized;
            }).filter(Boolean);

            if (profiles.length === 0 && legacyText) {
                const weeks = parseLegacyCurriculumWeeks(legacyText);
                if (weeks.length) {
                    const legacy = {
                        scope: 'all', grade: '', className: '',
                        subject: DEFAULT_TEACHER_PROFILE.subject,
                        fileName: 'Phân phối chương trình đã lưu từ bản cũ',
                        weeks, updatedAt: '', migrated: true,
                    };
                    legacy.id = curriculumTargetId(legacy);
                    profiles.push(legacy);
                }
            }
            const unique = new Map();
            profiles.forEach(profile => unique.set(profile.id, profile));
            return Array.from(unique.values());
        }

        function recoverCurriculumMappingsFromLegacyText(profiles, legacyText) {
            if (!cleanText(legacyText) || profiles.length !== 1) return false;
            const profile = profiles[0];
            if (countMappedCurriculumPeriods(profile.weeks) > 0) return false;
            const recoveredWeeks = parseLegacyCurriculumWeeks(legacyText);
            if (countMappedCurriculumPeriods(recoveredWeeks) === 0) return false;
            profile.weeks = recoveredWeeks;
            profile.migrated = true;
            profile.mappingRecovered = true;
            return true;
        }

        function normalizeISODate(value) {
            const text = cleanText(value);
            const isoMatch = text.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
            const localMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})$/);
            if (!isoMatch && !localMatch) return '';
            const year = Number(isoMatch?.[1] || localMatch?.[3]);
            const month = Number(isoMatch?.[2] || localMatch?.[2]);
            const day = Number(isoMatch?.[3] || localMatch?.[1]);
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        function formatISODateForDisplay(value) {
            const normalized = normalizeISODate(value);
            if (!normalized) return '';
            const [year, month, day] = normalized.split('-');
            return `${day}/${month}/${year}`;
        }

        function isMondayISODate(value) {
            const normalized = normalizeISODate(value);
            if (!normalized) return false;
            const [year, month, day] = normalized.split('-').map(Number);
            return new Date(year, month - 1, day).getDay() === 1;
        }

        function alignISODateToMonday(value) {
            const normalized = normalizeISODate(value);
            if (!normalized) return '';
            const [year, month, day] = normalized.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const daysSinceMonday = (date.getDay() + 6) % 7;
            date.setDate(date.getDate() - daysSinceMonday);
            return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
            ].join('-');
        }

        function normalizeTimetablesByWeek(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
            return Object.fromEntries(
                Object.entries(value)
                    .map(([week, timetable]) => [Number.parseInt(week, 10), normalizeTimetable(timetable)])
                    .filter(([week, timetable]) => week > 0 && week <= MAX_SCHOOL_WEEKS && timetable)
                    .map(([week, timetable]) => [String(week), { ...timetable, week }])
            );
        }

        function normalizeWorkTimestamp(value) {
            if (!value) return '';
            const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
            return Number.isNaN(date?.getTime?.()) ? '' : date.toISOString();
        }

        function normalizeWorkItem(value, fallbackScope = 'personal') {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            const type = WORK_ITEM_TYPES.includes(value.type) ? value.type : 'note';
            const scope = value.scope === 'shared' ? 'shared' : fallbackScope === 'shared' ? 'shared' : 'personal';
            const title = cleanText(value.title).slice(0, 160);
            const content = typeof value.content === 'string' ? value.content.trim().slice(0, 12000) : '';
            if (!title && !content) return null;
            const rawStatus = WORK_TASK_STATUSES.includes(value.status) ? value.status : '';
            const completed = type === 'task' && (rawStatus === 'done' || (!rawStatus && Boolean(value.completed)));
            const status = type === 'task' ? (completed ? 'done' : rawStatus || 'todo') : '';
            const priority = type === 'task' && WORK_PRIORITIES.includes(value.priority) ? value.priority : (type === 'task' ? 'normal' : '');
            const dueTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.dueTime || '')) ? String(value.dueTime) : '';
            const linkedWeek = Number.parseInt(value.linkedWeek, 10);
            const recurrence = type === 'task' && WORK_RECURRENCES.includes(value.recurrence) ? value.recurrence : 'none';
            const linkTarget = WORK_LINK_TARGETS.includes(value.linkTarget) ? value.linkTarget : '';
            return {
                id: cleanText(value.id),
                academicYear: normalizeAcademicYear(value.academicYear) || '',
                scope,
                type,
                title: title || (type === 'lesson' ? 'Bài soạn chưa đặt tên' : type === 'task' ? 'Nhiệm vụ chưa đặt tên' : 'Ghi chú chưa đặt tên'),
                content,
                dueDate: type === 'task' ? normalizeISODate(value.dueDate) : '',
                dueTime: type === 'task' ? dueTime : '',
                status,
                priority,
                completed,
                recurrence,
                recurrenceSpawnedAt: type === 'task' ? normalizeWorkTimestamp(value.recurrenceSpawnedAt) : '',
                pinned: Boolean(value.pinned),
                linkedWeek: linkedWeek > 0 && linkedWeek <= MAX_SCHOOL_WEEKS ? linkedWeek : null,
                className: cleanText(value.className).slice(0, 40),
                subject: cleanText(value.subject).slice(0, 80),
                linkTarget,
                sourceKey: cleanText(value.sourceKey).slice(0, 220),
                createdAt: normalizeWorkTimestamp(value.createdAt),
                updatedAt: normalizeWorkTimestamp(value.updatedAt),
                createdBy: cleanText(value.createdBy),
                createdByName: cleanText(value.createdByName),
            };
        }

        function normalizeWorkItems(items, fallbackScope = 'personal') {
            return Array.isArray(items)
                ? items.map(item => normalizeWorkItem(item, fallbackScope)).filter(Boolean)
                : [];
        }

        function normalizeTeachingScheduleBackup(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
            return Object.fromEntries(
                Object.entries(value)
                    .map(([week, items]) => [Number.parseInt(week, 10), items])
                    .filter(([week, items]) => week > 0 && week <= MAX_SCHOOL_WEEKS && Array.isArray(items))
                    .map(([week, items]) => [String(week), items
                        .map((item, index) => normalizeScheduleItem(item, week, index))
                        .filter(Boolean)])
            );
        }



        function normalizeScheduleMetaBackup(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
            return Object.fromEntries(
                Object.entries(value)
                    .map(([week, meta]) => [Number.parseInt(week, 10), meta])
                    .filter(([week, meta]) => week > 0 && week <= MAX_SCHOOL_WEEKS && meta && typeof meta === 'object' && !Array.isArray(meta))
                    .map(([week, meta]) => [String(week), {
                        stale: Boolean(meta.stale),
                        staleReason: cleanText(meta.staleReason),
                        generatedAt: cleanText(meta.generatedAt),
                        sourceMode: cleanText(meta.sourceMode),
                        status: meta.status === 'final' ? 'final' : 'draft',
                        finalizedAt: cleanText(meta.finalizedAt),
                        removedSourceSlots: Array.isArray(meta.removedSourceSlots)
                            ? [...new Set(meta.removedSourceSlots.map(cleanText).filter(Boolean))]
                            : [],
                        affectedScope: meta.affectedScope === 'slots' ? 'slots' : 'all',
                        affectedSourceSlots: Array.isArray(meta.affectedSourceSlots)
                            ? [...new Set(meta.affectedSourceSlots.map(cleanText).filter(Boolean))]
                            : [],
                    }])
            );
        }


        function normalizeYearWorkspace(value) {
            const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            const planData = Array.isArray(source.planData)
                ? source.planData.map(normalizePlanWeek).filter(Boolean).sort((a, b) => a.week - b.week)
                : [];
            const timetablesByWeek = normalizeTimetablesByWeek(source.timetablesByWeek);
            const selectedTimetableWeek = Number.parseInt(source.selectedTimetableWeek, 10);
            const selectedTeachingWeek = Number.parseInt(source.selectedTeachingWeek, 10);
            const curriculumText = typeof source.curriculumText === 'string' ? source.curriculumText : '';
            return {
                week1Start: alignISODateToMonday(source.week1Start),
                planData,
                timetablesByWeek,
                curriculumText,
                curriculumProfiles: normalizeCurriculumProfiles(source.curriculumProfiles, curriculumText),
                teachingSchedule: normalizeTeachingScheduleBackup(source.teachingSchedule),
                scheduleMeta: normalizeScheduleMetaBackup(source.scheduleMeta),
                workItems: normalizeWorkItems(source.workItems, 'personal'),
                selectedTimetableWeek: selectedTimetableWeek > 0 && selectedTimetableWeek <= MAX_SCHOOL_WEEKS
                    ? selectedTimetableWeek : 1,
                selectedTeachingWeek: selectedTeachingWeek > 0 && selectedTeachingWeek <= MAX_SCHOOL_WEEKS
                    ? selectedTeachingWeek : null,
            };
        }

        const storedTimetablesByWeek = readStoredJSON('teacher_timetables_by_week', {});
        const legacyStoredTimetable = readStoredJSON('teacher_timetable_data', null);
        const legacyCurriculumText = localStorage.getItem('teacher_curriculum_text') || '';
        const storedCurriculumProfiles = readStoredJSON(CURRICULUM_PROFILES_STORAGE, null);
        const storedYearWorkspaces = readStoredJSON(YEAR_WORKSPACES_STORAGE, null);

        const state = {
            apiKey: sessionStorage.getItem(API_KEY_SESSION_STORAGE) || savedApiKey,
            apiValidated: false,
            // Kế hoạch tuần: Thứ/ngày, sáng, chiều, đi công tác.
            planData: readStoredJSON('teacher_plan_data', []),
            // TKB được lưu riêng theo từng tuần; timetableData là tuần đang xem.
            timetablesByWeek: storedTimetablesByWeek,
            timetableData: null,
            selectedTimetableWeek: Number.parseInt(localStorage.getItem('teacher_timetable_selected_week'), 10),
            // Curriculum: raw text extracted
            curriculumText: legacyCurriculumText,
            curriculumProfiles: normalizeCurriculumProfiles(
                storedCurriculumProfiles,
                storedCurriculumProfiles === null ? legacyCurriculumText : ''
            ),
            // Teaching schedule: generated per week
            teachingSchedule: readStoredJSON('teacher_teaching_schedule', {}),
            scheduleMeta: readStoredJSON('teacher_schedule_meta', {}),
            workItems: [],
            sharedWorkItems: [],
            workScope: localStorage.getItem(WORK_SCOPE_STORAGE) === 'shared' ? 'shared' : 'personal',
            workView: ['kanban','calendar'].includes(localStorage.getItem(WORK_VIEW_STORAGE)) ? localStorage.getItem(WORK_VIEW_STORAGE) : 'list',
            workSmartFilter: ['today','overdue','week','urgent','doing','done'].includes(localStorage.getItem(WORK_SMART_FILTER_STORAGE)) ? localStorage.getItem(WORK_SMART_FILTER_STORAGE) : 'all',
            workSyncError: '',
            teacherProfile: normalizeTeacherProfile(readStoredJSON('teacher_profile', DEFAULT_TEACHER_PROFILE)),
            recognitionMode: localStorage.getItem('teacher_recognition_mode') || 'auto',
            recognitionCache: readStoredJSON(RECOGNITION_CACHE_KEY, {}),
            recentRecognitionFiles: {},
            recentRecognitionPreviews: {},
            dailyQuotaBlocked: sessionStorage.getItem('gemini_daily_quota_blocked') === '1',
            busy: { plan: false, timetable: false, curriculum: false, schedule: false },
            account: {
                accessMode: localStorage.getItem(ACCOUNT_ACCESS_MODE_STORAGE) === 'group' ? 'group' : 'personal',
                status: 'personal',
                config: null,
                firebaseReady: false,
                modules: null,
                app: null,
                auth: null,
                db: null,
                user: null,
                profile: null,
                group: null,
                members: [],
                authView: 'signin',
                modalView: '',
                busy: false,
                profileUnsubscribe: null,
                groupUnsubscribe: null,
                membersUnsubscribe: null,
                sharedYearUnsubscribe: null,
                personalYearUnsubscribe: null,
                sharedWorkItemsUnsubscribe: null,
                syncYear: '',
                syncApplyingRemote: false,
                syncTimer: null,
                sharedYearLoaded: false,
                personalYearLoaded: false,
                sharedYearExists: false,
                personalYearExists: false,
                sharedWorkItemsLoaded: false,
                lastSharedHash: '',
                lastPersonalHash: '',
                sharedRevision: 0,
                sharedBasePayload: null,
                sharedUpdatedAt: null,
                sharedUpdatedBy: '',
                sharedUpdatedByName: '',
                sharedConflict: null,
                sharedWriteBusy: false,
                sharedPendingWriteHash: '',
                cloudStatus: 'idle',
                cloudStatusMessage: 'Chưa đồng bộ',
                setupCheckBusy: false,
                setupCheckMessage: '',
                initialized: false,
            },
        };

        recoverCurriculumMappingsFromLegacyText(state.curriculumProfiles, legacyCurriculumText);

        if (!Array.isArray(state.planData)) state.planData = [];
        state.planData = state.planData.map(normalizePlanWeek).filter(Boolean);
        if (!state.timetablesByWeek || typeof state.timetablesByWeek !== 'object' || Array.isArray(state.timetablesByWeek)) {
            state.timetablesByWeek = {};
        }
        state.timetablesByWeek = Object.fromEntries(
            Object.entries(state.timetablesByWeek)
                .map(([week, timetable]) => [Number.parseInt(week, 10), normalizeTimetable(timetable)])
                .filter(([week, timetable]) => week > 0 && week <= MAX_SCHOOL_WEEKS && timetable)
                .map(([week, timetable]) => [String(week), { ...timetable, week }])
        );
        if (!(state.selectedTimetableWeek > 0 && state.selectedTimetableWeek <= MAX_SCHOOL_WEEKS)) {
            const selectedScheduleWeek = Number.parseInt(localStorage.getItem('teacher_selected_week'), 10);
            const savedWeeks = Object.keys(state.timetablesByWeek).map(Number).filter(Boolean).sort((a, b) => b - a);
            const planWeeks = state.planData.map(item => item.week).filter(isMainSchoolWeek).sort((a, b) => b - a);
            state.selectedTimetableWeek = selectedScheduleWeek || savedWeeks[0] || planWeeks[0] || 1;
        }
        if (Object.keys(state.timetablesByWeek).length === 0) {
            const normalizedLegacyTimetable = normalizeTimetable(legacyStoredTimetable);
            if (normalizedLegacyTimetable) {
                normalizedLegacyTimetable.week = state.selectedTimetableWeek;
                state.timetablesByWeek[state.selectedTimetableWeek] = normalizedLegacyTimetable;
                writeStoredJSON('teacher_timetables_by_week', state.timetablesByWeek);
            }
        }
        state.timetableData = state.timetablesByWeek[state.selectedTimetableWeek] || null;
        localStorage.setItem('teacher_timetable_selected_week', String(state.selectedTimetableWeek));
        if (!RECOGNITION_MODES.includes(state.recognitionMode)) state.recognitionMode = 'auto';
        if (!state.recognitionCache || typeof state.recognitionCache !== 'object' || Array.isArray(state.recognitionCache)) state.recognitionCache = {};
        if (!state.teachingSchedule || typeof state.teachingSchedule !== 'object' || Array.isArray(state.teachingSchedule)) state.teachingSchedule = {};
        state.teachingSchedule = Object.fromEntries(
            Object.entries(state.teachingSchedule)
                .filter(([, items]) => Array.isArray(items))
                .map(([week, items]) => [week, items
                    .map((item, index) => normalizeScheduleItem(item, week, index))
                    .filter(Boolean)])
        );
        state.scheduleMeta = normalizeScheduleMetaBackup(state.scheduleMeta);
        const selectedAcademicYear = normalizeAcademicYear(localStorage.getItem(SELECTED_ACADEMIC_YEAR_STORAGE))
            || state.teacherProfile.academicYear;
        state.selectedAcademicYear = selectedAcademicYear;
        state.yearWorkspaces = {};
        if (storedYearWorkspaces && typeof storedYearWorkspaces === 'object' && !Array.isArray(storedYearWorkspaces)) {
            Object.entries(storedYearWorkspaces).forEach(([academicYear, workspace]) => {
                const normalizedYear = normalizeAcademicYear(academicYear);
                if (normalizedYear) state.yearWorkspaces[normalizedYear] = normalizeYearWorkspace(workspace);
            });
        }
        if (!state.yearWorkspaces[selectedAcademicYear]) {
            state.yearWorkspaces[selectedAcademicYear] = normalizeYearWorkspace({
                planData: state.planData,
                timetablesByWeek: state.timetablesByWeek,
                curriculumText: state.curriculumText,
                curriculumProfiles: state.curriculumProfiles,
                teachingSchedule: state.teachingSchedule,
                scheduleMeta: state.scheduleMeta,
                selectedTimetableWeek: state.selectedTimetableWeek,
                selectedTeachingWeek: Number.parseInt(localStorage.getItem('teacher_selected_week'), 10),
            });
        }
        const activeYearWorkspace = state.yearWorkspaces[selectedAcademicYear];
        state.planData = activeYearWorkspace.planData;
        state.timetablesByWeek = activeYearWorkspace.timetablesByWeek;
        state.curriculumText = activeYearWorkspace.curriculumText;
        state.curriculumProfiles = activeYearWorkspace.curriculumProfiles;
        state.teachingSchedule = activeYearWorkspace.teachingSchedule;
        state.scheduleMeta = activeYearWorkspace.scheduleMeta;
        state.workItems = activeYearWorkspace.workItems;
        state.selectedTimetableWeek = activeYearWorkspace.selectedTimetableWeek;
        state.timetableData = state.timetablesByWeek[state.selectedTimetableWeek] || null;
        state.teacherProfile.academicYear = selectedAcademicYear;
        localStorage.setItem(SELECTED_ACADEMIC_YEAR_STORAGE, selectedAcademicYear);
        writeStoredJSON(CURRICULUM_PROFILES_STORAGE, { version: 2, profiles: state.curriculumProfiles });
