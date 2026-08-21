        // ================================================================
        //  TIMETABLE (Thời khóa biểu)
        // ================================================================
        function getCurriculumWeeks() {
            return [...new Set((state.curriculumProfiles || [])
                .flatMap(profile => profile.weeks || [])
                .map(item => Number.parseInt(item.week, 10))
                .filter(week => week > 0 && week <= MAX_SCHOOL_WEEKS))];
        }

        function curriculumProfileLabel(profile) {
            if (!profile) return 'Chưa có phân phối';
            if (profile.scope === 'class') return `Lớp ${profile.className}`;
            if (profile.scope === 'grade') return `Khối ${profile.grade}`;
            return 'Dùng chung (dữ liệu cũ)';
        }

        function curriculumSubjectMatches(profileSubject, lessonSubject) {
            const profileKey = normalizeLookupText(profileSubject);
            const lessonKey = normalizeLookupText(lessonSubject);
            return !profileKey || !lessonKey || profileKey.includes(lessonKey) || lessonKey.includes(profileKey);
        }

        function canonicalScheduleSubjectKey(value) {
            const subjectKey = normalizeLookupText(value);
            if (!subjectKey) return '';
            const knownKeys = [
                state.teacherProfile?.subject,
                ...(state.curriculumProfiles || []).map(profile => profile.subject),
            ].map(normalizeLookupText).filter(Boolean);
            const equivalentKeys = [subjectKey, ...knownKeys.filter(key =>
                key.includes(subjectKey) || subjectKey.includes(key)
            )];
            let canonicalKey = equivalentKeys.sort((a, b) => a.length - b.length)[0] || subjectKey;
            // Các cách ghi phổ biến như “Toán”/“Toán học”, “Hóa”/“Hóa học”
            // phải thuộc cùng một chuỗi PPCT.
            if (canonicalKey.endsWith('hoc') && canonicalKey.length > 3) {
                canonicalKey = canonicalKey.slice(0, -3);
            }
            return canonicalKey;
        }

        function getPreferredScheduleSubjectLabel(week, className, subject) {
            const requestedSubject = cleanText(subject) || state.teacherProfile.subject;
            const classKey = normalizeClassKey(className);
            const timetable = state.timetablesByWeek?.[week];
            for (const session of timetable?.sessions || []) {
                for (const period of session.periods || []) {
                    const matchedCell = (period.cells || []).find(cell =>
                        normalizeClassKey(cell.className) === classKey
                        && curriculumSubjectMatches(requestedSubject, cell.subject || cell.content)
                    );
                    if (cleanText(matchedCell?.subject)) return cleanText(matchedCell.subject);
                }
            }
            const matchedScheduleItem = (state.teachingSchedule?.[week] || []).find(item =>
                !item.makeupLesson
                && normalizeClassKey(item.class) === classKey
                && curriculumSubjectMatches(requestedSubject, item.subject)
            );
            if (cleanText(matchedScheduleItem?.subject)) return cleanText(matchedScheduleItem.subject);
            const matchedProfile = (state.curriculumProfiles || []).find(profile =>
                curriculumSubjectMatches(requestedSubject, profile.subject)
            );
            return cleanText(matchedProfile?.subject) || requestedSubject;
        }

        function getCurriculumForClass(week, className, subject = '') {
            const classKey = normalizeClassKey(className);
            const grade = inferGradeFromClass(className);
            const candidates = (state.curriculumProfiles || []).map(profile => {
                const weekData = profile.weeks?.find(item => Number.parseInt(item.week, 10) === Number.parseInt(week, 10));
                if (!weekData || !curriculumSubjectMatches(profile.subject, subject)) return null;
                let priority = 0;
                if (profile.scope === 'class' && normalizeClassKey(profile.className) === classKey) priority = 300;
                else if (profile.scope === 'grade' && cleanText(profile.grade) === grade) priority = 200;
                else if (profile.scope === 'all') priority = 100;
                if (!priority) return null;
                if (normalizeLookupText(profile.subject) === normalizeLookupText(subject)) priority += 10;
                return { profile, weekData, priority };
            }).filter(Boolean).sort((a, b) => b.priority - a.priority);
            const selected = candidates[0];
            return selected ? {
                topics: selected.weekData.topics,
                lessons: normalizeCurriculumLessons(selected.weekData.lessons),
                profileId: selected.profile.id,
                sourceLabel: curriculumProfileLabel(selected.profile),
                scope: selected.profile.scope,
            } : { topics: '', lessons: [], profileId: '', sourceLabel: 'Chưa có phân phối', scope: '' };
        }

        function countTimetableLessonsForClass(timetable, className, subject) {
            const classKey = normalizeClassKey(className);
            const subjectKey = normalizeLookupText(subject);
            let count = 0;
            for (const session of timetable?.sessions || []) {
                for (const period of session.periods || []) {
                    for (const cell of period.cells || []) {
                        if (normalizeClassKey(cell.className) !== classKey) continue;
                        const cellSubjectKey = normalizeLookupText(cell.subject || cell.content);
                        if (subjectKey && cellSubjectKey && !curriculumSubjectMatches(subject, cell.subject || cell.content)) continue;
                        count++;
                    }
                }
            }
            return count;
        }

        function getAutomaticPpctStart(week, className, subject) {
            const classKey = normalizeClassKey(className);
            let previousActualCount = 0;
            let previousScheduleMax = 0;
            for (let previousWeek = 1; previousWeek < week; previousWeek++) {
                const hasSavedSchedule = Object.prototype.hasOwnProperty.call(
                    state.teachingSchedule || {}, String(previousWeek)
                );
                if (hasSavedSchedule) {
                    const actualItems = (state.teachingSchedule[previousWeek] || []).filter(item =>
                        !item.notTeaching
                        &&
                        normalizeClassKey(item.class) === classKey
                        && curriculumSubjectMatches(subject, item.subject)
                    );
                    previousActualCount += actualItems.length;
                    actualItems.forEach(item => {
                        const value = Number.parseInt(item.ppctPeriod, 10);
                        if (value > previousScheduleMax) previousScheduleMax = value;
                    });
                } else {
                    const timetableCount = countTimetableLessonsForClass(
                        state.timetablesByWeek?.[previousWeek], className, subject
                    );
                    if (timetableCount > 0) previousActualCount += timetableCount;
                    else previousActualCount += getCurriculumForClass(previousWeek, className, subject).lessons?.length || 0;
                }
            }
            return Math.max(previousActualCount + 1, previousScheduleMax + 1, 1);
        }

        function scheduleClassSubjectKey(item) {
            return `${normalizeClassKey(item?.class)}|${canonicalScheduleSubjectKey(item?.subject)}`;
        }

        function scheduleItemsShareCourse(item, className, subject) {
            return normalizeClassKey(item?.class) === normalizeClassKey(className)
                && canonicalScheduleSubjectKey(item?.subject) === canonicalScheduleSubjectKey(subject);
        }

        function unlockPpctSequenceAfterMakeup(week, makeupItem) {
            let changed = false;
            let reachedMakeup = false;
            getSortedScheduleItems(state.teachingSchedule[week] || []).forEach(item => {
                if (item.id === makeupItem.id) {
                    reachedMakeup = true;
                    if (item.manualPpct) {
                        item.manualPpct = false;
                        changed = true;
                    }
                    return;
                }
                if (!reachedMakeup || !scheduleItemsShareCourse(item, makeupItem.class, makeupItem.subject)) return;
                if (item.manualPpct) {
                    item.manualPpct = false;
                    changed = true;
                }
            });
            Object.keys(state.teachingSchedule || {})
                .map(Number)
                .filter(futureWeek => futureWeek > Number.parseInt(week, 10))
                .sort((a, b) => a - b)
                .forEach(futureWeek => {
                    (state.teachingSchedule[futureWeek] || []).forEach(item => {
                        if (!scheduleItemsShareCourse(item, makeupItem.class, makeupItem.subject) || !item.manualPpct) return;
                        item.manualPpct = false;
                        changed = true;
                    });
                });
            return changed;
        }

        function repairExistingMakeupLessonSequences() {
            let changed = false;
            Object.keys(state.teachingSchedule || {})
                .map(Number)
                .sort((a, b) => a - b)
                .forEach(week => {
                    getSortedScheduleItems(state.teachingSchedule[week] || [])
                        .filter(item => item.makeupLesson)
                        .forEach(item => {
                            const preferredSubject = getPreferredScheduleSubjectLabel(
                                week, item.class, item.subject
                            );
                            if (preferredSubject && item.subject !== preferredSubject) {
                                item.subject = preferredSubject;
                                changed = true;
                            }
                            if (item.manualPpct) {
                                item.manualPpct = false;
                                changed = true;
                            }
                            if (unlockPpctSequenceAfterMakeup(week, item)) changed = true;
                        });
                });
            return changed;
        }

        function buildCurriculumLessonMap(className, subject) {
            const lessonsByPpct = new Map();
            let nextPpct = 1;
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                const curriculum = getCurriculumForClass(week, className, subject);
                const lessons = curriculum.lessons?.length
                    ? curriculum.lessons
                    : parseCurriculumTopicMappings(curriculum.topics);
                const hasExplicitPpct = lessons.some(lesson => Number.parseInt(lesson.ppctPeriod, 10) > 0);
                lessons.forEach(lesson => {
                    const explicitPpct = Number.parseInt(lesson.ppctPeriod, 10);
                    if (hasExplicitPpct && !(explicitPpct > 0)) return;
                    let ppct = explicitPpct > 0 ? explicitPpct : nextPpct;
                    if (!(explicitPpct > 0)) {
                        while (lessonsByPpct.has(ppct)) ppct++;
                    }
                    const topic = cleanText(lesson.topic);
                    if (topic && !lessonsByPpct.has(ppct)) {
                        lessonsByPpct.set(ppct, {
                            topic,
                            sourceLabel: curriculum.sourceLabel,
                            profileId: curriculum.profileId,
                            sourceWeek: week,
                        });
                    }
                    nextPpct = Math.max(nextPpct, ppct + 1);
                });
            }
            return lessonsByPpct;
        }

        function getCurriculumLessonByPpct(className, subject, ppctPeriod, cache = new Map()) {
            const ppct = Number.parseInt(ppctPeriod, 10);
            if (!(ppct > 0)) return null;
            const key = `${normalizeClassKey(className)}|${canonicalScheduleSubjectKey(subject)}`;
            if (!cache.has(key)) cache.set(key, buildCurriculumLessonMap(className, subject));
            return cache.get(key).get(ppct) || null;
        }

        function renumberSchedulePpct(week) {
            const items = state.teachingSchedule[week] || [];
            const nextByClass = new Map();
            const curriculumCache = new Map();
            let changed = false;
            getSortedScheduleItems(items).forEach(item => {
                if (item.notTeaching) {
                    if (cleanText(item.ppctPeriod)) {
                        item.ppctPeriod = '';
                        changed = true;
                    }
                    if (item.manualPpct) {
                        item.manualPpct = false;
                        changed = true;
                    }
                    return;
                }
                const key = scheduleClassSubjectKey(item);
                let next = nextByClass.get(key);
                if (!next) next = getAutomaticPpctStart(week, item.class, item.subject);
                const manualValue = item.manualPpct ? Number.parseInt(item.ppctPeriod, 10) : 0;
                const assigned = manualValue > 0 ? manualValue : next;
                const previousPpct = Number.parseInt(item.ppctPeriod, 10);
                if (item.manualTopic === null) {
                    const previousLesson = getCurriculumLessonByPpct(
                        item.class, item.subject, previousPpct, curriculumCache
                    );
                    item.manualTopic = Boolean(
                        item.manualEdited
                        && cleanText(item.topic)
                        && (!previousLesson
                            || normalizeLookupText(item.topic) !== normalizeLookupText(previousLesson.topic))
                    );
                    changed = true;
                }
                if (cleanText(item.ppctPeriod) !== String(assigned)) {
                    item.ppctPeriod = String(assigned);
                    changed = true;
                }
                const lesson = getCurriculumLessonByPpct(
                    item.class, item.subject, assigned, curriculumCache
                );
                if (item.manualTopic && lesson?.topic && /[;\n]/.test(cleanText(item.topic))
                    && normalizeLookupText(item.topic).includes(normalizeLookupText(lesson.topic))) {
                    // Dữ liệu từ bản cũ có thể đã coi chuỗi tóm tắt nhiều bài là nội dung nhập tay.
                    item.manualTopic = false;
                    changed = true;
                }
                if (!item.manualTopic) {
                    if (lesson?.topic && cleanText(item.topic) !== lesson.topic) {
                        item.topic = lesson.topic;
                        changed = true;
                    }
                    if (!lesson && !item.manualTopic) {
                        const missingTopic = `⚠️ Chưa có ánh xạ Tiết PPCT ${assigned} → Tên bài trong bộ phân phối`;
                        if (cleanText(item.topic) !== missingTopic) {
                            item.topic = missingTopic;
                            changed = true;
                        }
                    }
                    if (lesson && (item.curriculumSource !== lesson.sourceLabel
                        || item.curriculumProfileId !== lesson.profileId)) {
                        item.curriculumSource = lesson.sourceLabel;
                        item.curriculumProfileId = lesson.profileId;
                        changed = true;
                    }
                }
                nextByClass.set(key, assigned + 1);
            });
            return changed;
        }

        function renumberStoredSchedulesFrom(startWeek) {
            const changedWeeks = [];
            Object.keys(state.teachingSchedule || {})
                .map(Number)
                .filter(week => week >= Number.parseInt(startWeek, 10) && week <= MAX_SCHOOL_WEEKS)
                .sort((a, b) => a - b)
                .forEach(week => {
                    if (!renumberSchedulePpct(week)) return;
                    changedWeeks.push(week);
                    if (week > Number.parseInt(startWeek, 10)) {
                        const meta = getScheduleMeta(week);
                        meta.status = 'draft';
                        meta.finalizedAt = '';
                    }
                });
            return changedWeeks;
        }

        function buildCurriculumMapForTimetable(week, timetable) {
            const unique = new Map();
            for (const session of timetable?.sessions || []) {
                for (const period of session.periods || []) {
                    for (const cell of period.cells || []) {
                        const className = cleanText(cell.className) || 'Chưa xác định';
                        const subject = cleanText(cell.subject) || state.teacherProfile.subject;
                        const key = `${normalizeClassKey(className)}|${normalizeLookupText(subject)}`;
                        if (unique.has(key)) continue;
                        const match = getCurriculumForClass(week, className, subject);
                        unique.set(key, {
                            className,
                            grade: inferGradeFromClass(className),
                            subject,
                            topics: match.topics,
                            lessons: match.lessons,
                            ppctStart: getAutomaticPpctStart(week, className, subject),
                            sourceLabel: match.sourceLabel,
                            profileId: match.profileId,
                            scope: match.scope,
                        });
                    }
                }
            }
            return Array.from(unique.values());
        }

        function renderCurriculumMatchSummary(week) {
            if (!curriculumMatchSummary) return;
            const timetable = week ? state.timetablesByWeek[week] : null;
            if (!week) {
                curriculumMatchSummary.className = 'curriculum-match-summary';
                curriculumMatchSummary.textContent = 'Chọn tuần để kiểm tra phân phối phù hợp cho từng lớp trong thời khóa biểu.';
                return;
            }
            if (!timetable || getTimetableLessonCount(timetable) === 0) {
                curriculumMatchSummary.className = 'curriculum-match-summary warn';
                curriculumMatchSummary.textContent = `Tuần ${week} chưa có thời khóa biểu để đối chiếu phân phối.`;
                return;
            }
            const mappings = buildCurriculumMapForTimetable(week, timetable);
            const matched = mappings.filter(item => item.topics);
            const missing = mappings.filter(item => !item.topics);
            if (missing.length === 0) {
                curriculumMatchSummary.className = 'curriculum-match-summary ok';
                curriculumMatchSummary.innerHTML = `✅ Đã khớp phân phối tuần ${week} cho <strong>${matched.length} lớp/môn</strong>: ${matched.map(item => `${escapeHTML(item.className)} ← ${escapeHTML(item.sourceLabel)} · PPCT từ tiết ${item.ppctStart}`).join(' · ')}`;
            } else {
                curriculumMatchSummary.className = 'curriculum-match-summary warn';
                const missingText = missing.length
                    ? ` Chưa có phân phối tuần ${week} cho: <strong>${missing.map(item => escapeHTML(item.className)).join(', ')}</strong>.`
                    : '';
                curriculumMatchSummary.innerHTML = `⚠️ Đã khớp <strong>${matched.length}/${mappings.length}</strong> lớp/môn.${missingText} Tiết PPCT vẫn được tự đánh liên tục riêng cho từng lớp.`;
            }
        }

        function getDefaultProgressWeek() {
            const storedWeeks = Object.keys(state.teachingSchedule || {})
                .map(Number)
                .filter(week => week > 0 && week <= MAX_SCHOOL_WEEKS);
            const selectedWeek = getSelectedScheduleWeek();
            return Math.max(...storedWeeks, selectedWeek || 0, state.selectedTimetableWeek || 0, 1);
        }

        function initializeProgressDashboardControls() {
            if (!progressWeekSelect.querySelector('option[value="1"]')) {
                progressWeekSelect.innerHTML = '';
                for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                    const option = document.createElement('option');
                    option.value = String(week);
                    option.textContent = `Tuần ${week}`;
                    progressWeekSelect.appendChild(option);
                }
            }
            const selected = Number.parseInt(progressWeekSelect.value, 10);
            if (!(selected > 0 && selected <= MAX_SCHOOL_WEEKS)) {
                progressWeekSelect.value = String(getDefaultProgressWeek());
            }
            progressAcademicYearSelect.value = state.selectedAcademicYear;
        }

        function buildProgressCourseCatalog() {
            const courses = new Map();
            const addCourse = (className, subject) => {
                const normalizedClass = normalizeClassKey(className);
                const cleanSubject = cleanText(subject) || state.teacherProfile.subject;
                const subjectKey = canonicalScheduleSubjectKey(cleanSubject);
                if (!normalizedClass || !subjectKey) return;
                const key = `${normalizedClass}|${subjectKey}`;
                const current = courses.get(key);
                courses.set(key, {
                    key,
                    classKey: normalizedClass,
                    className: current?.className || cleanText(className).toUpperCase(),
                    grade: inferGradeFromClass(className),
                    subjectKey,
                    subject: current?.subject && current.subject.length >= cleanSubject.length
                        ? current.subject : cleanSubject,
                });
            };
            Object.values(state.teachingSchedule || {}).forEach(items => {
                (items || []).forEach(item => addCourse(item.class, item.subject));
            });
            Object.values(state.timetablesByWeek || {}).forEach(timetable => {
                for (const session of timetable?.sessions || []) {
                    for (const period of session.periods || []) {
                        for (const cell of period.cells || []) {
                            addCourse(cell.className, cell.subject || state.teacherProfile.subject);
                        }
                    }
                }
            });
            (state.curriculumProfiles || [])
                .filter(profile => profile.scope === 'class')
                .forEach(profile => addCourse(profile.className, profile.subject));
            return Array.from(courses.values()).sort((a, b) => {
                const gradeDiff = (Number.parseInt(a.grade, 10) || 99) - (Number.parseInt(b.grade, 10) || 99);
                if (gradeDiff) return gradeDiff;
                const classDiff = a.className.localeCompare(b.className, 'vi', { numeric: true });
                return classDiff || a.subject.localeCompare(b.subject, 'vi');
            });
        }

        function replaceProgressFilterOptions(select, options, allLabel, preferredValue = select.value) {
            select.innerHTML = '';
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = allLabel;
            select.appendChild(allOption);
            options.forEach(item => {
                const option = document.createElement('option');
                option.value = item.value;
                option.textContent = item.label;
                select.appendChild(option);
            });
            select.value = options.some(item => item.value === preferredValue) ? preferredValue : '';
        }

        function updateProgressFilterOptions(catalog) {
            const previousGrade = progressGradeSelect.value;
            const grades = [...new Set(catalog.map(course => course.grade).filter(Boolean))]
                .sort((a, b) => Number(a) - Number(b))
                .map(grade => ({ value: grade, label: `Khối ${grade}` }));
            replaceProgressFilterOptions(progressGradeSelect, grades, 'Tất cả khối', previousGrade);

            const grade = progressGradeSelect.value;
            const previousClass = progressClassSelect.value;
            const classMap = new Map();
            catalog.filter(course => !grade || course.grade === grade)
                .forEach(course => classMap.set(course.classKey, course.className));
            const classes = Array.from(classMap, ([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, 'vi', { numeric: true }));
            replaceProgressFilterOptions(progressClassSelect, classes, 'Tất cả lớp', previousClass);

            const classKey = progressClassSelect.value;
            const previousSubject = progressSubjectSelect.value;
            const subjectMap = new Map();
            catalog.filter(course => (!grade || course.grade === grade) && (!classKey || course.classKey === classKey))
                .forEach(course => subjectMap.set(course.subjectKey, course.subject));
            const subjects = Array.from(subjectMap, ([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
            replaceProgressFilterOptions(progressSubjectSelect, subjects, 'Tất cả môn', previousSubject);
        }

        function buildCourseProgressRow(course, referenceWeek) {
            const records = [];
            for (let week = 1; week <= referenceWeek; week++) {
                getSortedScheduleItems(state.teachingSchedule[week] || []).forEach(item => {
                    if (!scheduleItemsShareCourse(item, course.className, course.subject)) return;
                    records.push({ week, item });
                });
            }
            const activeRecords = records.filter(record => !record.item.notTeaching);
            const canceledRecords = records.filter(record => record.item.notTeaching);
            const makeupRecords = activeRecords.filter(record => record.item.makeupLesson);
            const actualPpct = activeRecords.reduce((maximum, record) => {
                const value = Number.parseInt(record.item.ppctPeriod, 10);
                return value > maximum ? value : maximum;
            }, 0);
            const curriculumMap = buildCurriculumLessonMap(course.className, course.subject);
            let plannedPpct = 0;
            let totalPpct = 0;
            curriculumMap.forEach((lesson, ppct) => {
                const value = Number.parseInt(ppct, 10);
                if (value > totalPpct) totalPpct = value;
                if (Number.parseInt(lesson.sourceWeek, 10) <= referenceWeek && value > plannedPpct) plannedPpct = value;
            });
            const lastActive = activeRecords[activeRecords.length - 1] || null;
            const currentLesson = actualPpct > 0
                ? getCurriculumLessonByPpct(course.className, course.subject, actualPpct)
                : null;
            const currentTopic = currentLesson?.topic || cleanText(lastActive?.item?.topic);
            const difference = totalPpct > 0 ? actualPpct - plannedPpct : null;
            let status = 'ontrack';
            let statusLabel = 'Đúng tiến độ';
            if (!(totalPpct > 0)) {
                status = 'missing';
                statusLabel = 'Thiếu PPCT';
            } else if (actualPpct >= totalPpct) {
                status = 'completed';
                statusLabel = 'Đã hoàn thành';
            } else if (difference < 0) {
                status = 'behind';
                statusLabel = `Chậm ${Math.abs(difference)} tiết`;
            } else if (difference > 0) {
                status = 'ahead';
                statusLabel = `Nhanh ${difference} tiết`;
            }

            const recentStartWeek = Math.max(1, referenceWeek - 3);
            const recentTaught = activeRecords.filter(record => record.week >= recentStartWeek).length;
            const recentWindow = referenceWeek - recentStartWeek + 1;
            let weeklyRate = recentWindow > 0 ? recentTaught / recentWindow : 0;
            if (!(weeklyRate > 0) && activeRecords.length) weeklyRate = activeRecords.length / referenceWeek;
            const remainingPeriods = Math.max(0, totalPpct - actualPpct);
            let forecastWeek = null;
            let forecastLabel = 'Chưa đủ dữ liệu';
            let forecastState = 'unknown';
            if (!(totalPpct > 0)) {
                forecastLabel = 'Chưa có tổng PPCT';
            } else if (remainingPeriods === 0) {
                forecastWeek = lastActive?.week || referenceWeek;
                forecastLabel = 'Đã hoàn thành';
                forecastState = 'safe';
            } else if (weeklyRate > 0) {
                forecastWeek = referenceWeek + Math.ceil(remainingPeriods / weeklyRate);
                if (forecastWeek <= MAX_SCHOOL_WEEKS) {
                    forecastLabel = `Dự kiến tuần ${forecastWeek}`;
                    forecastState = 'safe';
                } else {
                    forecastLabel = `Nguy cơ đến tuần ${forecastWeek}`;
                    forecastState = 'risk';
                }
            }
            return {
                ...course,
                referenceWeek,
                plannedPpct,
                actualPpct,
                totalPpct,
                difference,
                currentTopic,
                taughtCount: activeRecords.length,
                canceledCount: canceledRecords.length,
                makeupCount: makeupRecords.length,
                status,
                statusLabel,
                weeklyRate,
                forecastWeek,
                forecastLabel,
                forecastState,
                progressPercent: totalPpct > 0 ? Math.min(100, Math.round(actualPpct * 100 / totalPpct)) : 0,
            };
        }

        function buildProgressDashboardSnapshot() {
            initializeProgressDashboardControls();
            const referenceWeek = Number.parseInt(progressWeekSelect.value, 10) || 1;
            const catalog = buildProgressCourseCatalog();
            updateProgressFilterOptions(catalog);
            const grade = progressGradeSelect.value;
            const classKey = progressClassSelect.value;
            const subjectKey = progressSubjectSelect.value;
            const filteredCourses = catalog.filter(course =>
                (!grade || course.grade === grade)
                && (!classKey || course.classKey === classKey)
                && (!subjectKey || course.subjectKey === subjectKey)
            );
            const rows = filteredCourses.map(course => buildCourseProgressRow(course, referenceWeek));
            let finalizedWeeks = 0;
            let draftWeeks = 0;
            for (let week = 1; week <= referenceWeek; week++) {
                if (!state.teachingSchedule[week]?.length) continue;
                if (getScheduleMeta(week).status === 'final') finalizedWeeks++;
                else draftWeeks++;
            }
            return {
                academicYear: state.selectedAcademicYear,
                referenceWeek,
                rows,
                courseCount: rows.length,
                classCount: new Set(rows.map(row => row.classKey)).size,
                onTrackCount: rows.filter(row => ['ontrack', 'completed'].includes(row.status)).length,
                behindCount: rows.filter(row => row.status === 'behind').length,
                aheadCount: rows.filter(row => row.status === 'ahead').length,
                missingCurriculumCount: rows.filter(row => row.status === 'missing').length,
                riskCount: rows.filter(row => row.forecastState === 'risk').length,
                finalizedWeeks,
                draftWeeks,
                missingWeeks: Math.max(0, referenceWeek - finalizedWeeks - draftWeeks),
            };
        }

        function renderProgressDashboard() {
            const snapshot = buildProgressDashboardSnapshot();
            progressDashboardStats.innerHTML = `
                <div class="progress-stat-card"><span class="stat-icon">🏫</span><strong>${snapshot.classCount}</strong><span>Lớp đang theo dõi</span></div>
                <div class="progress-stat-card good"><span class="stat-icon">✅</span><strong>${snapshot.onTrackCount}</strong><span>Đúng tiến độ / Hoàn thành</span></div>
                <div class="progress-stat-card ${snapshot.behindCount ? 'danger' : 'good'}"><span class="stat-icon">⏳</span><strong>${snapshot.behindCount}</strong><span>Lớp–môn đang chậm</span></div>
                <div class="progress-stat-card good"><span class="stat-icon">🔒</span><strong>${snapshot.finalizedWeeks}/${snapshot.referenceWeek}</strong><span>Tuần đã chốt</span></div>
                <div class="progress-stat-card ${snapshot.missingWeeks ? 'warn' : 'good'}"><span class="stat-icon">📭</span><strong>${snapshot.missingWeeks}</strong><span>Tuần chưa có lịch</span></div>`;
            const notices = [];
            if (snapshot.behindCount) notices.push(`${snapshot.behindCount} lớp–môn chậm tiến độ`);
            if (snapshot.riskCount) notices.push(`${snapshot.riskCount} lớp–môn có nguy cơ chưa hoàn thành trước tuần ${MAX_SCHOOL_WEEKS}`);
            if (snapshot.missingCurriculumCount) notices.push(`${snapshot.missingCurriculumCount} lớp–môn chưa có đủ phân phối chương trình`);
            if (snapshot.missingWeeks) notices.push(`${snapshot.missingWeeks} tuần chưa có lịch báo giảng`);
            progressDashboardNotice.className = `progress-dashboard-notice${notices.length ? ' warn' : ''}`;
            progressDashboardNotice.textContent = notices.length
                ? `⚠️ Tính đến tuần ${snapshot.referenceWeek}: ${notices.join(' · ')}.`
                : `✅ Tính đến tuần ${snapshot.referenceWeek}, dữ liệu tiến độ đang đầy đủ và không có lớp–môn bị chậm.`;
            exportProgressDashboardBtn.disabled = snapshot.rows.length === 0;
            if (!snapshot.rows.length) {
                progressDashboardTable.innerHTML = '<div class="progress-empty"><strong>Chưa có lớp để tổng hợp.</strong><br>Hãy tải Thời khóa biểu hoặc phân phối chương trình theo lớp, sau đó tạo Lịch báo giảng.</div>';
                return snapshot;
            }
            progressDashboardTable.innerHTML = `<div class="table-wrap"><table class="progress-table">
                <thead><tr>
                    <th>Lớp</th><th>Môn</th><th>PPCT dự kiến</th><th>PPCT thực tế</th><th>Chênh lệch</th>
                    <th>Bài đang dạy</th><th>Đã dạy</th><th>Không học</th><th>Học bù</th>
                    <th>Trạng thái</th><th>Dự báo hoàn thành</th><th>Mở lịch</th>
                </tr></thead><tbody>${snapshot.rows.map(row => {
                    const rowClass = row.status === 'behind' ? 'progress-behind'
                        : row.status === 'ahead' || row.status === 'completed' ? 'progress-ahead'
                        : row.status === 'missing' ? 'progress-missing' : '';
                    const differenceText = row.difference === null ? '—'
                        : row.difference > 0 ? `+${row.difference}` : String(row.difference);
                    return `<tr class="${rowClass}">
                        <td class="progress-course-name">${escapeHTML(row.className)}</td>
                        <td>${escapeHTML(row.subject)}</td>
                        <td class="progress-number">${row.plannedPpct || '—'}</td>
                        <td class="progress-number">${row.actualPpct || '—'}${row.totalPpct ? `<div style="font-size:9px;color:#64748b;margin-top:3px;">${row.progressPercent}% của ${row.totalPpct} tiết</div>` : ''}</td>
                        <td class="progress-number">${escapeHTML(differenceText)}</td>
                        <td class="progress-topic">${escapeHTML(row.currentTopic || 'Chưa có tiết đã dạy')}</td>
                        <td class="progress-number">${row.taughtCount}</td>
                        <td class="progress-number">${row.canceledCount}</td>
                        <td class="progress-number">${row.makeupCount}</td>
                        <td class="text-center"><span class="progress-status-chip ${row.status}">${escapeHTML(row.statusLabel)}</span></td>
                        <td class="text-center"><span class="progress-forecast-chip ${row.forecastState}">${escapeHTML(row.forecastLabel)}</span></td>
                        <td class="text-center"><button class="btn btn-outline btn-sm" type="button" data-progress-open-week="${snapshot.referenceWeek}">Tuần ${snapshot.referenceWeek}</button></td>
                    </tr>`;
                }).join('')}</tbody></table></div>`;
            return snapshot;
        }

        function openProgressDashboardWeek(week) {
            const normalizedWeek = Number.parseInt(week, 10);
            if (!(normalizedWeek > 0 && normalizedWeek <= MAX_SCHOOL_WEEKS)) return;
            scheduleWeekSelect.value = String(normalizedWeek);
            localStorage.setItem('teacher_selected_week', String(normalizedWeek));
            const workspace = getActiveYearWorkspace();
            if (workspace) workspace.selectedTeachingWeek = normalizedWeek;
            persistActiveYearWorkspace();
            if (state.teachingSchedule[normalizedWeek]?.length) {
                renderTeachingSchedule(normalizedWeek);
            } else {
                scheduleDisplay.innerHTML = `<p class="text-muted text-center" style="padding:32px 0;">Tuần ${normalizedWeek} chưa có lịch báo giảng. Nhấn “Tạo lịch báo giảng” để bắt đầu.</p>`;
                scheduleInfo.textContent = '';
                updateScheduleToolbar(normalizedWeek);
            }
            document.getElementById('teachingScheduleCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function exportProgressDashboardExcel() {
            if (!window.XLSX?.utils) {
                showToast('❌ Thư viện xuất Excel chưa tải được', 'error');
                return;
            }
            const snapshot = buildProgressDashboardSnapshot();
            if (!snapshot.rows.length) {
                showToast('Chưa có dữ liệu tiến độ để xuất', 'info');
                return;
            }
            const rows = [
                [`TIẾN ĐỘ GIẢNG DẠY NĂM HỌC ${snapshot.academicYear}`],
                [`Tính đến tuần ${snapshot.referenceWeek}`],
                [`Số lớp: ${snapshot.classCount}`, `Đúng tiến độ: ${snapshot.onTrackCount}`, `Chậm: ${snapshot.behindCount}`, `Tuần đã chốt: ${snapshot.finalizedWeeks}`, `Tuần chưa có lịch: ${snapshot.missingWeeks}`],
                [],
                ['Lớp', 'Môn', 'PPCT dự kiến', 'PPCT thực tế', 'Chênh lệch', 'Bài đang dạy', 'Số tiết đã dạy', 'Không học', 'Học bù', 'Trạng thái', 'Dự báo hoàn thành'],
                ...snapshot.rows.map(row => [
                    row.className, row.subject, row.plannedPpct || '', row.actualPpct || '', row.difference ?? '',
                    row.currentTopic || '', row.taughtCount, row.canceledCount, row.makeupCount, row.statusLabel, row.forecastLabel,
                ]),
            ];
            const sheet = XLSX.utils.aoa_to_sheet(rows);
            sheet['!cols'] = [{ wch: 11 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 11 }, { wch: 46 }, { wch: 14 }, { wch: 11 }, { wch: 9 }, { wch: 19 }, { wch: 22 }];
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, `Tien do tuan ${snapshot.referenceWeek}`);
            XLSX.writeFile(workbook, `tien-do-giang-day-${snapshot.academicYear}-tuan-${snapshot.referenceWeek}.xlsx`);
            showToast(`✅ Đã xuất Excel tiến độ đến tuần ${snapshot.referenceWeek}`, 'success');
        }

        function collectKnownWeeks() {
            const weeks = new Set();
            // Một năm học có tối đa 37 tuần chính để lập kế hoạch, thời khóa biểu và lịch báo giảng.
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) weeks.add(week);
            if (state.selectedTimetableWeek > 0 && state.selectedTimetableWeek <= MAX_SCHOOL_WEEKS) {
                weeks.add(state.selectedTimetableWeek);
            }
            state.planData.forEach(item => weeks.add(Number.parseInt(item.week, 10)));
            getCurriculumWeeks().forEach(week => weeks.add(week));
            Object.keys(state.timetablesByWeek).forEach(week => weeks.add(Number.parseInt(week, 10)));
            Object.keys(state.teachingSchedule).forEach(week => weeks.add(Number.parseInt(week, 10)));
            return Array.from(weeks)
                .filter(week => week > 0 && week <= MAX_SCHOOL_WEEKS)
                .sort((a, b) => a - b);
        }

        function getTimetableLessonCount(timetable) {
            return timetable?.sessions
                ?.flatMap(session => session.periods || [])
                .reduce((total, period) => total + (period.cells?.length || 0), 0) || 0;
        }

        function getTimetableCellAt(timetable, sessionKey, periodNumber, dayName) {
            const session = timetable?.sessions?.find(item => item.key === sessionKey);
            const period = session?.periods?.find(item => item.period === Number.parseInt(periodNumber, 10));
            return period?.cells?.find(item => item.day === dayName) || null;
        }

        function timetableCellText(cell) {
            if (!cell) return '—';
            return cleanText(cell.content)
                || [cleanText(cell.className), cleanText(cell.subject)].filter(Boolean).join(' - ')
                || '—';
        }

        function timetableCellSignature(cell) {
            if (!cell) return '';
            return [cell.className, cell.subject, cell.content].map(cleanText).join('\u241f');
        }

        function compareTimetableWeeks(week) {
            const currentWeek = Number.parseInt(week, 10);
            const previousWeek = currentWeek - 1;
            const current = state.timetablesByWeek[currentWeek] || null;
            const previous = state.timetablesByWeek[previousWeek] || null;
            const items = [];
            const changeMap = new Map();
            const counts = { added: 0, changed: 0, removed: 0, unchanged: 0 };
            const sessions = [
                { key: 'morning', label: 'Buổi sáng' },
                { key: 'afternoon', label: 'Buổi chiều' },
            ];

            if (!current || !previous) {
                return { currentWeek, previousWeek, current, previous, items, changeMap, counts };
            }

            sessions.forEach(session => {
                for (let period = 1; period <= 5; period++) {
                    SCHOOL_DAYS.forEach(day => {
                        const before = getTimetableCellAt(previous, session.key, period, day);
                        const after = getTimetableCellAt(current, session.key, period, day);
                        let type = '';
                        if (!before && after) type = 'added';
                        else if (before && !after) type = 'removed';
                        else if (before && after && timetableCellSignature(before) !== timetableCellSignature(after)) type = 'changed';
                        else if (before && after) counts.unchanged++;
                        if (!type) return;

                        counts[type]++;
                        const key = `${session.key}|${period}|${day}`;
                        const item = { key, type, sessionKey: session.key, sessionLabel: session.label, period, day, before, after };
                        items.push(item);
                        changeMap.set(key, item);
                    });
                }
            });
            return { currentWeek, previousWeek, current, previous, items, changeMap, counts };
        }

        function renderTimetableDiff() {
            timetableDiffDisplay.hidden = !timetableDiffOpen;
            if (!timetableDiffOpen) {
                timetableDiffDisplay.innerHTML = '';
                return;
            }

            const comparison = compareTimetableWeeks(state.selectedTimetableWeek);
            if (!comparison.previous || !comparison.current) {
                timetableDiffDisplay.innerHTML = `<p class="text-muted">Cần có thời khóa biểu của cả tuần ${comparison.previousWeek} và tuần ${comparison.currentWeek} để so sánh.</p>`;
                return;
            }

            const { counts, items } = comparison;
            const summary = `
                <div class="diff-summary">
                    <strong>So sánh tuần ${comparison.previousWeek} → tuần ${comparison.currentWeek}:</strong>
                    <span class="diff-badge added">＋ ${counts.added} tiết thêm</span>
                    <span class="diff-badge changed">↻ ${counts.changed} tiết đổi</span>
                    <span class="diff-badge removed">－ ${counts.removed} tiết bỏ</span>
                    <span class="diff-badge unchanged">＝ ${counts.unchanged} tiết giữ nguyên</span>
                </div>`;

            if (items.length === 0) {
                timetableDiffDisplay.innerHTML = summary
                    + `<div class="recognition-note" style="margin-bottom:0;"><span>✅</span><div><strong>Hai tuần hoàn toàn giống nhau.</strong> Không có tiết học nào cần điều chỉnh.</div></div>`;
                return;
            }

            const labels = {
                added: ['Thêm', 'added'],
                changed: ['Thay đổi', 'changed'],
                removed: ['Bỏ', 'removed'],
            };
            const rows = items.map(item => {
                const [label, className] = labels[item.type];
                return `<tr>
                    <td><strong>${escapeHTML(item.day)}</strong><br>${escapeHTML(item.sessionLabel)}, tiết ${item.period}</td>
                    <td><span class="diff-type ${className}">${label}</span></td>
                    <td>${escapeHTML(timetableCellText(item.before))}</td>
                    <td>${escapeHTML(timetableCellText(item.after))}</td>
                </tr>`;
            }).join('');
            timetableDiffDisplay.innerHTML = summary + `
                <div class="table-wrap">
                    <table class="diff-table">
                        <thead><tr><th>Vị trí</th><th>Loại</th><th>Tuần ${comparison.previousWeek}</th><th>Tuần ${comparison.currentWeek}</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        }

        function weekOptionLabel(week, includeTimetableStatus = false) {
            const plan = state.planData.find(item => item.week === week);
            const calculatedRange = getWeekDateInfo(week)?.rangeText || '';
            const dateRange = calculatedRange || plan?.dateRange || '';
            let label = `Tuần ${week}` + (dateRange ? ` — ${dateRange}` : '');
            if (includeTimetableStatus && state.timetablesByWeek[week]) label += ' · đã có TKB';
            return label;
        }

        function persistTimetablesByWeek() {
            writeStoredJSON('teacher_timetables_by_week', state.timetablesByWeek);
            // Giữ một bản tương thích với dữ liệu của phiên bản cũ.
            if (state.timetableData) writeStoredJSON('teacher_timetable_data', state.timetableData);
            else localStorage.removeItem('teacher_timetable_data');
            persistActiveYearWorkspace();
            updateDataSafetySummary();
        }

        function updateTimetableWeekControls() {
            const week = state.selectedTimetableWeek;
            const previousWeek = week - 1;
            const previousExists = previousWeek > 0 && Boolean(state.timetablesByWeek[previousWeek]);
            const currentExists = Boolean(state.timetablesByWeek[week]);
            copyPreviousTtBtn.disabled = !previousExists;
            copyPreviousTtBtn.title = previousExists
                ? `Sao chép toàn bộ thời khóa biểu tuần ${previousWeek} sang tuần ${week}`
                : `Chưa có thời khóa biểu tuần ${previousWeek} để sao chép`;
            comparePreviousTtBtn.disabled = !(previousExists && currentExists);
            comparePreviousTtBtn.textContent = timetableDiffOpen ? '✖ Đóng so sánh' : '🔎 So sánh tuần trước';
            comparePreviousTtBtn.title = previousExists && currentExists
                ? `Xem các tiết thêm, bỏ hoặc thay đổi giữa tuần ${previousWeek} và tuần ${week}`
                : `Cần có thời khóa biểu tuần ${previousWeek} và tuần ${week}`;
            if (comparePreviousTtBtn.disabled && timetableDiffOpen) timetableDiffOpen = false;

            const data = state.timetablesByWeek[week];
            if (data) {
                const copiedText = data.sourceMode === 'copied-week' && data.copiedFromWeek
                    ? ` · giữ nguyên từ tuần ${data.copiedFromWeek}`
                    : '';
                timetableWeekInfo.textContent = `Tuần ${week} đã có ${getTimetableLessonCount(data)} tiết${copiedText}. Nhấp từng ô để sửa.`;
            } else {
                timetableWeekInfo.textContent = previousExists
                    ? `Tuần ${week} chưa có dữ liệu. Có thể giữ nguyên tuần ${previousWeek} rồi sửa các tiết thay đổi.`
                    : `Tuần ${week} chưa có dữ liệu. Hãy tải ảnh thời khóa biểu.`;
            }
        }

        function activateTimetableWeek(week, saveSelection = true) {
            const normalizedWeek = Number.parseInt(week, 10);
            if (!(normalizedWeek > 0 && normalizedWeek <= MAX_SCHOOL_WEEKS)) return;
            timetableDiffOpen = false;
            state.selectedTimetableWeek = normalizedWeek;
            state.timetableData = state.timetablesByWeek[normalizedWeek] || null;
            timetableWeekSelect.value = String(normalizedWeek);
            if (saveSelection) localStorage.setItem('teacher_timetable_selected_week', String(normalizedWeek));
            updateTimetableWeekControls();
            renderTimetable();
        }

        function populateTimetableWeekSelect() {
            const selectedWeek = state.selectedTimetableWeek;
            timetableWeekSelect.innerHTML = '<option value="">-- Chọn tuần --</option>';
            collectKnownWeeks().forEach(week => {
                const option = document.createElement('option');
                option.value = String(week);
                option.textContent = weekOptionLabel(week, true);
                timetableWeekSelect.appendChild(option);
            });
            if (selectedWeek && timetableWeekSelect.querySelector(`option[value="${selectedWeek}"]`)) {
                timetableWeekSelect.value = String(selectedWeek);
            }
            updateTimetableWeekControls();
        }

        timetableWeekSelect.addEventListener('change', () => {
            activateTimetableWeek(timetableWeekSelect.value);
        });

        comparePreviousTtBtn.addEventListener('click', () => {
            if (comparePreviousTtBtn.disabled) return;
            timetableDiffOpen = !timetableDiffOpen;
            updateTimetableWeekControls();
            renderTimetableDiff();
            renderTimetable();
        });

        copyPreviousTtBtn.addEventListener('click', () => {
            const week = state.selectedTimetableWeek;
            const previousWeek = week - 1;
            const previousTimetable = state.timetablesByWeek[previousWeek];
            if (!previousTimetable) {
                showToast(`⚠️ Chưa có thời khóa biểu tuần ${previousWeek}`, 'error');
                return;
            }
            if (state.timetablesByWeek[week]
                && !confirm(`Tuần ${week} đã có thời khóa biểu. Ghi đè bằng tuần ${previousWeek}?`)) return;

            const copied = cloneRecognitionData(previousTimetable);
            copied.week = week;
            copied.copiedFromWeek = previousWeek;
            copied.sourceMode = 'copied-week';
            copied.cacheHash = '';
            copied.cacheHit = false;
            state.timetablesByWeek[week] = normalizeTimetable(copied);
            state.timetableData = state.timetablesByWeek[week];
            timetableDiffOpen = true;
            persistTimetablesByWeek();
            invalidateTeachingSchedules(`Thời khóa biểu tuần ${week} đã sao chép từ tuần ${previousWeek}`, week);
            populateTimetableWeekSelect();
            populateWeekSelect();
            renderTimetable();
            showToast(`✅ Đã giữ nguyên thời khóa biểu tuần ${previousWeek} cho tuần ${week}`, 'success');
        });

        async function handleTimetableFile(file) {
            if (!file) return;
            const selectedWeek = state.selectedTimetableWeek;
            if (!(selectedWeek > 0 && selectedWeek <= MAX_SCHOOL_WEEKS)) {
                showToast('⚠️ Vui lòng chọn tuần trước khi tải thời khóa biểu', 'error');
                return;
            }
            if (state.busy.timetable) {
                showToast('Thời khóa biểu đang được xử lý, vui lòng chờ', 'info');
                return;
            }
            state.busy.timetable = true;
            ttFileInput.disabled = true;
            ttStatus.innerHTML = '<span class="loading-spinner"></span> Đang xử lý ảnh TKB...';
            ttStatus.className = 'mt-12';

            try {
                validateUpload(file, 'image');
                const prompt = `
Bạn là chuyên gia OCR thời khóa biểu giáo viên Việt Nam. Ảnh là THỜI KHÓA BIỂU CẢ TUẦN theo mẫu:
- Hai phần độc lập: BUỔI SÁNG và BUỔI CHIỀU.
- Mỗi phần có sáu cột Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7.
- Mỗi phần có năm hàng, tương ứng tiết 1 đến tiết 5.

YÊU CẦU NHẬN DẠNG CHÍNH XÁC:
1. Xác định đúng giao điểm của buổi, tiết và thứ trước khi chép nội dung.
2. Với mỗi ô có tiết học, tách className (ví dụ "12A1"), subject (ví dụ "Toán học") và content là nguyên văn toàn ô.
3. Giữ đúng mã lớp, tên môn, chữ hoa/thường, dấu tiếng Việt và ký hiệu trong ảnh.
4. Ô trống không tạo cell. Không tự suy luận môn, lớp hoặc lặp dữ liệu sang ô liền kề.
5. Luôn trả đủ hai session với key lần lượt là "morning" và "afternoon", đủ các period 1–5; cells có thể là mảng rỗng.
6. Mỗi cell.day phải là một trong: Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7.
7. Nếu chữ mờ hoặc cấu trúc ảnh không rõ, ghi mô tả ngắn vào warnings thay vì đoán.
8. Chỉ trả JSON đúng lược đồ.
                `;
                const timetable = await recognizeStructuredImage({
                    file,
                    kind: 'timetable',
                    prompt,
                    schema: TIMETABLE_SCHEMA,
                    normalize: normalizeTimetable,
                    validateGemini: data => data.sessions
                        .flatMap(session => session.periods)
                        .some(period => period.cells.length > 0),
                    onStage: stage => {
                        ttStatus.innerHTML = `<span class="loading-spinner"></span> ${escapeHTML(stage)}`;
                    },
                });
                const lessonCount = timetable?.sessions
                    ?.flatMap(session => session.periods)
                    .reduce((total, period) => total + period.cells.length, 0) || 0;
                if (!timetable) throw new Error('Không thể tạo thời khóa biểu');
                timetable.week = selectedWeek;
                timetable.copiedFromWeek = null;
                state.timetableData = timetable;
                state.timetablesByWeek[selectedWeek] = timetable;
                persistTimetablesByWeek();
                invalidateTeachingSchedules(`Thời khóa biểu tuần ${selectedWeek} đã thay đổi`, selectedWeek);
                populateTimetableWeekSelect();
                populateWeekSelect();
                renderTimetable();
                const resultText = timetable.cacheHit
                    ? 'Đã dùng kết quả ảnh đã lưu, không gọi API'
                    : timetable.sourceMode === 'gemini-verified'
                        ? `Đã đọc và đối chiếu ${lessonCount} ô thời khóa biểu`
                        : timetable.sourceMode === 'gemini-economy'
                            ? `Đã đọc ${lessonCount} ô bằng chế độ tiết kiệm API`
                            : 'Đã tạo mẫu dự phòng; hãy đối chiếu và sửa các ô';
                showToast('✅ ' + resultText, 'success');
            } catch (err) {
                console.error(err);
                showToast('❌ Lỗi: ' + err.message, 'error');
            } finally {
                state.busy.timetable = false;
                ttFileInput.disabled = false;
                ttStatus.innerHTML = '';
            }
        }

        ttFileInput.addEventListener('change', (e) => {
            handleTimetableFile(e.target.files[0]);
            e.target.value = '';
        });

        ttUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            ttUploadZone.classList.add('dragover');
        });
        ttUploadZone.addEventListener('dragleave', () => {
            ttUploadZone.classList.remove('dragover');
        });
        ttUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            ttUploadZone.classList.remove('dragover');
            handleTimetableFile(e.dataTransfer.files[0]);
        });

        function renderTimetable() {
            const data = state.timetableData;
            if (!data || !Array.isArray(data.sessions)) {
                timetableDisplay.innerHTML = `
              <p class="text-muted text-center" style="padding:32px 0;">
                Tuần ${state.selectedTimetableWeek} chưa có dữ liệu. Hãy tải ảnh hoặc dùng “Giữ nguyên tuần trước”.
              </p>
                `;
                updateTimetableWeekControls();
                renderTimetableDiff();
                return;
            }
            const comparison = timetableDiffOpen ? compareTimetableWeeks(state.selectedTimetableWeek) : null;
            const sourceInfo = getRecognitionSourceInfo(data);
            let html = `<div class="recognition-note"><span>${sourceInfo.icon}</span><div><strong>${escapeHTML(sourceInfo.title)}</strong> ${escapeHTML(sourceInfo.text)} Có thể nhấp vào bất kỳ ô nào để sửa hoặc bổ sung thủ công.</div></div>`;
            html += `<div class="weekly-timetable">`;
            for (const session of data.sessions) {
                html += `<section class="timetable-session"><h3 class="session-title">${escapeHTML(session.label)}</h3>`;
                html += `<div class="table-wrap"><table class="weekly-table"><thead><tr><th class="period-head">Tiết TKB</th>`;
                html += SCHOOL_DAYS.map(day => `<th>${escapeHTML(day)}</th>`).join('');
                html += `</tr></thead><tbody>`;
                for (const period of session.periods) {
                    html += `<tr><td class="period-cell">${period.period}</td>`;
                    for (const day of SCHOOL_DAYS) {
                        const cell = period.cells.find(item => item.day === day);
                        const diffItem = comparison?.changeMap.get(`${session.key}|${period.period}|${day}`);
                        const diffClass = diffItem ? ` tt-change-${diffItem.type === 'changed' ? 'modified' : diffItem.type}` : '';
                        const cellHtml = diffItem?.type === 'removed' && !cell
                            ? `<span class="removed-lesson-hint">Đã bỏ: ${escapeHTML(timetableCellText(diffItem.before))}</span>`
                            : formatTimetableCell(cell);
                        html += `<td class="tt-editable${diffClass}" tabindex="0" role="button"
                                     data-tt-session="${escapeHTML(session.key)}" data-tt-period="${period.period}" data-tt-day="${escapeHTML(day)}"
                                     aria-label="Sửa ${escapeHTML(session.label)}, tiết ${period.period}, ${escapeHTML(day)}">${cellHtml}</td>`;
                    }
                    html += `</tr>`;
                }
                html += `</tbody></table></div></section>`;
            }
            html += `</div>`;
            if (data.warnings?.length) {
                html += `<div class="warning-list"><strong>⚠️ Vị trí cần kiểm tra:</strong><ul>${data.warnings.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul></div>`;
            }
            html += renderOcrTranscript(data.offlineOcrText, 'data-tt-action="copy-ocr"');
            timetableDisplay.innerHTML = html;
            updateTimetableWeekControls();
            renderTimetableDiff();
        }

        function formatTimetableCell(cell) {
            if (!cell) return '';
            const className = cleanText(cell.className);
            const subject = cleanText(cell.subject);
            const content = cleanText(cell.content);
            if (content) {
                if (className && content.startsWith(className)) {
                    return `<span class="lesson-text"><span class="class-code">${escapeHTML(className)}</span>${escapeHTML(content.slice(className.length))}</span>`;
                }
                return `<span class="lesson-text">${escapeHTML(content)}</span>`;
            }
            if (className || subject) {
                const classHtml = className ? `<span class="class-code">${escapeHTML(className)}</span>` : '';
                const separator = className && subject ? ' - ' : '';
                return `<span class="lesson-text">${classHtml}${separator}${escapeHTML(subject)}</span>`;
            }
            return '';
        }

        function editTimetableCell(sessionKey, periodNumber, dayName) {
            const session = state.timetableData?.sessions?.find(item => item.key === sessionKey);
            const period = session?.periods?.find(item => item.period === Number.parseInt(periodNumber, 10));
            if (!period || !SCHOOL_DAYS.includes(dayName)) return;
            const existing = period.cells.find(item => item.day === dayName);
            const className = prompt(`${session.label}, tiết ${period.period}, ${dayName} — Lớp:`, existing?.className || '');
            if (className === null) return;
            const subject = prompt(`${session.label}, tiết ${period.period}, ${dayName} — Môn:`, existing?.subject || '');
            if (subject === null) return;
            const suggestedContent = existing?.content || [cleanText(className), cleanText(subject)].filter(Boolean).join(' - ');
            const content = prompt(`${session.label}, tiết ${period.period}, ${dayName} — Nội dung hiển thị:`, suggestedContent);
            if (content === null) return;

            period.cells = period.cells.filter(item => item.day !== dayName);
            if (cleanText(className) || cleanText(subject) || cleanText(content)) {
                period.cells.push({
                    day: dayName,
                    className: cleanText(className),
                    subject: cleanText(subject),
                    content: cleanText(content) || [cleanText(className), cleanText(subject)].filter(Boolean).join(' - '),
                });
                period.cells.sort((a, b) => SCHOOL_DAYS.indexOf(a.day) - SCHOOL_DAYS.indexOf(b.day));
            }
            state.timetablesByWeek[state.selectedTimetableWeek] = state.timetableData;
            persistTimetablesByWeek();
            refreshRecognitionCache('timetable', state.timetableData);
            const affectedSourceSlot = [dayName, normalizeSessionLabel(session.label), String(period.period)].join('|');
            invalidateTeachingSchedules(
                `Thời khóa biểu tuần ${state.selectedTimetableWeek} đã được chỉnh sửa`,
                state.selectedTimetableWeek,
                [affectedSourceSlot]
            );
            populateTimetableWeekSelect();
            renderTimetable();
            showToast('✅ Đã cập nhật ô thời khóa biểu', 'success');
        }

        timetableDisplay.addEventListener('click', event => {
            const copyButton = event.target.closest('button[data-tt-action="copy-ocr"]');
            if (copyButton) {
                copyRecognitionText(state.timetableData?.offlineOcrText || '');
                return;
            }
            const cell = event.target.closest('td[data-tt-session][data-tt-period][data-tt-day]');
            if (!cell) return;
            editTimetableCell(cell.dataset.ttSession, cell.dataset.ttPeriod, cell.dataset.ttDay);
        });

        timetableDisplay.addEventListener('keydown', event => {
            if (!['Enter', ' '].includes(event.key)) return;
            const cell = event.target.closest('td[data-tt-session][data-tt-period][data-tt-day]');
            if (!cell) return;
            event.preventDefault();
            editTimetableCell(cell.dataset.ttSession, cell.dataset.ttPeriod, cell.dataset.ttDay);
        });

        clearTtBtn.addEventListener('click', () => {
            const week = state.selectedTimetableWeek;
            if (!state.timetablesByWeek[week]) {
                showToast(`Tuần ${week} chưa có thời khóa biểu`, 'info');
                return;
            }
            if (!confirm(`Xóa thời khóa biểu tuần ${week}?`)) return;
            delete state.timetablesByWeek[week];
            state.timetableData = null;
            persistTimetablesByWeek();
            invalidateTeachingSchedules(`Thời khóa biểu tuần ${week} đã bị xóa`, week);
            populateTimetableWeekSelect();
            populateWeekSelect();
            renderTimetable();
            showToast(`Đã xóa TKB tuần ${week}`, 'info');
        });
