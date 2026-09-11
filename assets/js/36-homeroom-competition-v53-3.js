// ================================================================
//  HOMEROOM COMPETITION BOARD — v53.3
//  Thi đua tuần · tháng · học kỳ · năm học theo dự thảo nề nếp 2026–2027.
//  Không thay đổi dữ liệu v53.2; chỉ bổ sung book.competition.
// ================================================================
let homeroomCompetitionInitialized = false;
let homeroomCompetitionSelectedWeek = 1;
let homeroomCompetitionSelectedMonth = '';

const HOMEROOM_COMPETITION_MONTHLY_RULE_IDS = new Set([
    'nn26_48', 'nn26_48_class',
    'nn26_reward_performance', 'nn26_reward_bulletin_student', 'nn26_reward_bulletin_idea',
    'nn26_reward_volunteer', 'nn26_reward_national', 'nn26_reward_province',
    'nn26_reward_town', 'nn26_reward_rule77',
]);

function homeroomCompetitionRound(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 2) / 2 : 0;
}

function homeroomCompetitionNullableNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 2) / 2 : null;
}

function homeroomCompetitionISO(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function homeroomCompetitionMonthKeyFromDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function homeroomCompetitionMonthLabel(monthKey) {
    const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
    if (!match) return monthKey || '—';
    return `Tháng ${Number(match[2])}/${match[1]}`;
}

function homeroomCompetitionEnsure(book) {
    if (!book) return null;
    if (typeof normalizeHomeroomCompetition === 'function') book.competition = normalizeHomeroomCompetition(book.competition);
    else if (!book.competition || typeof book.competition !== 'object') book.competition = { version:1, weeks:{}, months:{} };
    book.competition.weeks ||= {};
    book.competition.months ||= {};
    return book.competition;
}

function homeroomCompetitionWeekDateInfo(week) {
    if (typeof getWeekDateInfo !== 'function') return null;
    return getWeekDateInfo(Number(week), state.selectedAcademicYear) || null;
}

function homeroomCompetitionWeekKeyForDate(dateValue) {
    const iso = normalizeHomeroomDate?.(dateValue) || String(dateValue || '');
    if (!iso) return null;
    for (let week = 1; week <= 37; week += 1) {
        const info = homeroomCompetitionWeekDateInfo(week);
        if (!info) continue;
        const start = homeroomCompetitionISO(info.start);
        const end = homeroomCompetitionISO(info.end);
        if (iso >= start && iso <= end) return week;
    }
    return null;
}

function homeroomCompetitionCurrentWeek() {
    const week = homeroomCompetitionWeekKeyForDate(typeof homeroomTodayISO === 'function' ? homeroomTodayISO() : homeroomCompetitionISO(new Date()));
    return week || 1;
}

function homeroomCompetitionWeekMonthKey(week) {
    const info = homeroomCompetitionWeekDateInfo(week);
    // Quy chế: tuần nằm giữa 2 tháng được tính vào tháng sau -> lấy tháng của ngày cuối tuần.
    return info ? homeroomCompetitionMonthKeyFromDate(info.end) : '';
}

function homeroomCompetitionExpectedMonthKeys() {
    const keys = [];
    for (let week = 1; week <= 37; week += 1) {
        const key = homeroomCompetitionWeekMonthKey(week);
        if (key && !keys.includes(key)) keys.push(key);
    }
    return keys;
}

function homeroomCompetitionWeeksForMonth(monthKey) {
    const weeks = [];
    for (let week = 1; week <= 37; week += 1) {
        if (homeroomCompetitionWeekMonthKey(week) === monthKey) weeks.push(week);
    }
    return weeks;
}

function homeroomCompetitionEntriesInWeek(book, week) {
    const info = homeroomCompetitionWeekDateInfo(week);
    if (!book || !info) return [];
    const start = homeroomCompetitionISO(info.start);
    const end = homeroomCompetitionISO(info.end);
    return (book.entries || []).filter(entry => entry.date && entry.date >= start && entry.date <= end);
}

function homeroomCompetitionEntriesInMonth(book, monthKey) {
    if (!book || !monthKey) return [];
    return (book.entries || []).filter(entry => String(entry.date || '').slice(0, 7) === monthKey);
}

function homeroomCompetitionIsRegulationEntry(entry) {
    const rule = typeof homeroomRuleById === 'function' ? homeroomRuleById(entry?.ruleId) : null;
    return typeof homeroomIsSchoolRule === 'function' ? homeroomIsSchoolRule(rule) : Boolean(rule?.id?.startsWith('nn26_'));
}

function homeroomCompetitionWeeklyAutoNet(book, week) {
    const entries = homeroomCompetitionEntriesInWeek(book, week)
        .filter(entry => homeroomCompetitionIsRegulationEntry(entry))
        .filter(entry => !HOMEROOM_COMPETITION_MONTHLY_RULE_IDS.has(entry.ruleId));
    const deductions = entries.filter(entry => Number(entry.points) < 0).reduce((sum, entry) => sum + homeroomCompetitionRound(entry.points), 0);
    const rewards = entries.filter(entry => Number(entry.points) > 0).reduce((sum, entry) => sum + homeroomCompetitionRound(entry.points), 0);
    return {
        entries: entries.length,
        deductions: homeroomCompetitionRound(deductions),
        rewards: homeroomCompetitionRound(rewards),
        net: homeroomCompetitionRound(deductions + rewards),
    };
}

function homeroomCompetitionMonthlyAutoNet(book, monthKey) {
    const entries = homeroomCompetitionEntriesInMonth(book, monthKey)
        .filter(entry => homeroomCompetitionIsRegulationEntry(entry))
        .filter(entry => HOMEROOM_COMPETITION_MONTHLY_RULE_IDS.has(entry.ruleId));
    const deductions = entries.filter(entry => Number(entry.points) < 0).reduce((sum, entry) => sum + homeroomCompetitionRound(entry.points), 0);
    const rewards = entries.filter(entry => Number(entry.points) > 0).reduce((sum, entry) => sum + homeroomCompetitionRound(entry.points), 0);
    return {
        entries: entries.length,
        deductions: homeroomCompetitionRound(deductions),
        rewards: homeroomCompetitionRound(rewards),
        net: homeroomCompetitionRound(deductions + rewards),
    };
}

function homeroomCompetitionWeekRecord(book, week) {
    const competition = homeroomCompetitionEnsure(book);
    return competition?.weeks?.[String(week)] || null;
}

function homeroomCompetitionMonthRecord(book, monthKey) {
    const competition = homeroomCompetitionEnsure(book);
    return competition?.months?.[monthKey] || null;
}

function homeroomCompetitionWeekMetrics(book, week) {
    const record = homeroomCompetitionWeekRecord(book, week);
    const auto = homeroomCompetitionWeeklyAutoNet(book, week);
    const redFlagBase = record?.redFlagBase ?? 0;
    const supervisorAdjustment = record?.supervisorAdjustment ?? 0;
    const sdbScore = record?.sdbScore ?? 0;
    const applyAutoConduct = record?.applyAutoConduct !== false;
    const redFlagFinal = homeroomCompetitionRound(redFlagBase + (applyAutoConduct ? auto.net : 0));
    const total = homeroomCompetitionRound(redFlagFinal + supervisorAdjustment + sdbScore);
    return {
        week: Number(week),
        saved: Boolean(record),
        record,
        auto,
        redFlagBase: homeroomCompetitionRound(redFlagBase),
        applyAutoConduct,
        redFlagFinal,
        supervisorAdjustment: homeroomCompetitionRound(supervisorAdjustment),
        sdbScore: homeroomCompetitionRound(sdbScore),
        total,
        monthKey: homeroomCompetitionWeekMonthKey(week),
        dateInfo: homeroomCompetitionWeekDateInfo(week),
    };
}

function homeroomCompetitionSuggestedFlower(record) {
    if (!record) return null;
    if (record.flowerScore !== null && record.flowerScore !== undefined) return homeroomCompetitionRound(record.flowerScore);
    const values = [record.flowerMid, record.flowerEnd].filter(value => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
    if (!values.length) return 0;
    return homeroomCompetitionRound(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function homeroomCompetitionMonthMetrics(book, monthKey) {
    const record = homeroomCompetitionMonthRecord(book, monthKey);
    const weeks = homeroomCompetitionWeeksForMonth(monthKey);
    const weekMetrics = weeks.map(week => homeroomCompetitionWeekMetrics(book, week));
    const savedWeeks = weekMetrics.filter(item => item.saved);
    const averageWeek = savedWeeks.length
        ? homeroomCompetitionRound(savedWeeks.reduce((sum, item) => sum + item.total, 0) / savedWeeks.length)
        : null;
    const auto = homeroomCompetitionMonthlyAutoNet(book, monthKey);
    const applyAutoMonthly = record?.applyAutoMonthly !== false;
    const manualBonusPenalty = homeroomCompetitionRound(record?.manualBonusPenalty ?? 0);
    const flowerScore = homeroomCompetitionSuggestedFlower(record);
    const facilityAdjustment = homeroomCompetitionRound(record?.facilityAdjustment ?? 0);
    const laborAdjustment = homeroomCompetitionRound(record?.laborAdjustment ?? 0);
    const total = averageWeek === null ? null : homeroomCompetitionRound(averageWeek + (applyAutoMonthly ? auto.net : 0) + manualBonusPenalty + flowerScore);
    return {
        monthKey,
        record,
        weeks,
        savedWeeks,
        complete: weeks.length > 0 && savedWeeks.length === weeks.length,
        averageWeek,
        auto,
        applyAutoMonthly,
        manualBonusPenalty,
        flowerScore,
        facilityAdjustment,
        laborAdjustment,
        total,
    };
}

function homeroomCompetitionSemesterMetrics(book, semester) {
    const startWeek = String(semester) === '2' ? 19 : 1;
    const endWeek = String(semester) === '2' ? 37 : 18;
    const weeks = [];
    for (let week = startWeek; week <= endWeek; week += 1) weeks.push(homeroomCompetitionWeekMetrics(book, week));
    const saved = weeks.filter(item => item.saved);
    const avgWeek = saved.length ? homeroomCompetitionRound(saved.reduce((sum, item) => sum + item.total, 0) / saved.length) : null;
    return { semester:String(semester), startWeek, endWeek, weeks, saved, avgWeek, complete:saved.length === weeks.length };
}

function homeroomCompetitionYearMetrics(book) {
    const monthKeys = homeroomCompetitionExpectedMonthKeys();
    const months = monthKeys.map(key => homeroomCompetitionMonthMetrics(book, key));
    const available = months.filter(item => item.total !== null);
    const averageMonth = available.length ? homeroomCompetitionRound(available.reduce((sum, item) => sum + item.total, 0) / available.length) : null;
    const facilityAdjustment = homeroomCompetitionRound(months.reduce((sum, item) => sum + item.facilityAdjustment, 0));
    const laborAdjustment = homeroomCompetitionRound(months.reduce((sum, item) => sum + item.laborAdjustment, 0));
    const total = averageMonth === null ? null : homeroomCompetitionRound(averageMonth + facilityAdjustment + laborAdjustment);
    return {
        months,
        available,
        averageMonth,
        facilityAdjustment,
        laborAdjustment,
        total,
        complete: months.length > 0 && months.every(item => item.complete && item.total !== null),
    };
}

function homeroomCompetitionFormat(value, empty = '—') {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return empty;
    const n = homeroomCompetitionRound(value);
    return String(n).replace('.', ',');
}

function homeroomCompetitionSigned(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const n = homeroomCompetitionRound(value);
    return `${n > 0 ? '+' : ''}${String(n).replace('.', ',')}`;
}

function homeroomCompetitionBuildWeekOptions() {
    return Array.from({ length:37 }, (_, index) => {
        const week = index + 1;
        const info = homeroomCompetitionWeekDateInfo(week);
        const label = info ? `Tuần ${week} · ${info.rangeText}` : `Tuần ${week}`;
        return `<option value="${week}" ${week === homeroomCompetitionSelectedWeek ? 'selected' : ''}>${homeroomEscapeHtml(label)}</option>`;
    }).join('');
}

function homeroomCompetitionBuildMonthOptions() {
    const keys = homeroomCompetitionExpectedMonthKeys();
    if (!keys.length) return '<option value="">— Cần cấu hình ngày bắt đầu Tuần 1 —</option>';
    if (!keys.includes(homeroomCompetitionSelectedMonth)) homeroomCompetitionSelectedMonth = keys[0];
    return keys.map(key => `<option value="${key}" ${key === homeroomCompetitionSelectedMonth ? 'selected' : ''}>${homeroomEscapeHtml(homeroomCompetitionMonthLabel(key))}</option>`).join('');
}

function homeroomCompetitionFillWeekForm(book) {
    const week = homeroomCompetitionSelectedWeek;
    const metrics = homeroomCompetitionWeekMetrics(book, week);
    const select = homeroomById('homeroomCompetitionWeekSelect');
    if (select) select.innerHTML = homeroomCompetitionBuildWeekOptions();
    const info = metrics.dateInfo;
    const range = homeroomById('homeroomCompetitionWeekRange');
    if (range) range.textContent = info ? `${info.rangeText} · tính vào ${homeroomCompetitionMonthLabel(metrics.monthKey)}` : 'Chưa cấu hình ngày bắt đầu Tuần 1.';
    const base = homeroomById('homeroomCompetitionRedFlagBase');
    const autoToggle = homeroomById('homeroomCompetitionApplyAutoConduct');
    const supervisor = homeroomById('homeroomCompetitionSupervisor');
    const sdb = homeroomById('homeroomCompetitionSdb');
    const note = homeroomById('homeroomCompetitionWeekNote');
    if (base) base.value = metrics.record?.redFlagBase ?? '';
    if (autoToggle) autoToggle.checked = metrics.applyAutoConduct;
    if (supervisor) supervisor.value = metrics.record?.supervisorAdjustment ?? '';
    if (sdb) sdb.value = metrics.record?.sdbScore ?? '';
    if (note) note.value = metrics.record?.note || '';
    const autoEl = homeroomById('homeroomCompetitionWeekAuto');
    const redEl = homeroomById('homeroomCompetitionWeekRedFlagFinal');
    const totalEl = homeroomById('homeroomCompetitionWeekTotal');
    if (autoEl) autoEl.innerHTML = `<strong>${homeroomCompetitionSigned(metrics.auto.net)}</strong><small>${metrics.auto.entries} ghi nhận · trừ ${homeroomCompetitionSigned(metrics.auto.deductions)} · thưởng ${homeroomCompetitionSigned(metrics.auto.rewards)}</small>`;
    if (redEl) redEl.innerHTML = `<strong>${homeroomCompetitionFormat(metrics.redFlagFinal)}</strong><small>Cờ đỏ gốc ${homeroomCompetitionFormat(metrics.redFlagBase)}${metrics.applyAutoConduct ? ` + tự động ${homeroomCompetitionSigned(metrics.auto.net)}` : ' · không cộng tự động'}</small>`;
    if (totalEl) totalEl.innerHTML = `<strong>${homeroomCompetitionFormat(metrics.total)}</strong><small>${metrics.saved ? 'Đã lưu tuần' : 'Chưa lưu tuần'} · Cờ đỏ + giám thị + SĐB</small>`;
}

function homeroomCompetitionRefreshWeekDraft() {
    const book = homeroomActiveBook?.();
    if (!book) return;
    const week = Math.max(1, Math.min(37, Number.parseInt(homeroomById('homeroomCompetitionWeekSelect')?.value, 10) || homeroomCompetitionSelectedWeek || 1));
    const auto = homeroomCompetitionWeeklyAutoNet(book, week);
    const base = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionRedFlagBase')?.value) ?? 0;
    const applyAuto = Boolean(homeroomById('homeroomCompetitionApplyAutoConduct')?.checked);
    const supervisor = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionSupervisor')?.value) ?? 0;
    const sdb = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionSdb')?.value) ?? 0;
    const redFlag = homeroomCompetitionRound(base + (applyAuto ? auto.net : 0));
    const total = homeroomCompetitionRound(redFlag + supervisor + sdb);
    const autoEl = homeroomById('homeroomCompetitionWeekAuto');
    const redEl = homeroomById('homeroomCompetitionWeekRedFlagFinal');
    const totalEl = homeroomById('homeroomCompetitionWeekTotal');
    if (autoEl) autoEl.innerHTML = `<strong>${homeroomCompetitionSigned(auto.net)}</strong><small>${auto.entries} ghi nhận · trừ ${homeroomCompetitionSigned(auto.deductions)} · thưởng ${homeroomCompetitionSigned(auto.rewards)}</small>`;
    if (redEl) redEl.innerHTML = `<strong>${homeroomCompetitionFormat(redFlag)}</strong><small>Cờ đỏ gốc ${homeroomCompetitionFormat(base)}${applyAuto ? ` + tự động ${homeroomCompetitionSigned(auto.net)}` : ' · không cộng tự động'}</small>`;
    if (totalEl) totalEl.innerHTML = `<strong>${homeroomCompetitionFormat(total)}</strong><small>Xem trước · Cờ đỏ + giám thị + SĐB</small>`;
}

function homeroomCompetitionRefreshMonthDraft() {
    const book = homeroomActiveBook?.();
    const monthKey = homeroomById('homeroomCompetitionMonthSelect')?.value || homeroomCompetitionSelectedMonth;
    if (!book || !monthKey) return;
    const metrics = homeroomCompetitionMonthMetrics(book, monthKey);
    const applyAuto = Boolean(homeroomById('homeroomCompetitionApplyAutoMonthly')?.checked);
    const manual = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionMonthManual')?.value) ?? 0;
    const flowerDirect = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerScore')?.value);
    const mid = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerMid')?.value);
    const end = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerEnd')?.value);
    const flowerValues = [mid, end].filter(value => value !== null);
    const flower = flowerDirect !== null ? flowerDirect : (flowerValues.length ? homeroomCompetitionRound(flowerValues.reduce((sum, value) => sum + value, 0) / flowerValues.length) : 0);
    const total = metrics.averageWeek === null ? null : homeroomCompetitionRound(metrics.averageWeek + (applyAuto ? metrics.auto.net : 0) + manual + flower);
    const preview = homeroomById('homeroomCompetitionMonthPreview');
    if (preview) preview.innerHTML = `<div><span>TB tuần đã lưu</span><strong>${homeroomCompetitionFormat(metrics.averageWeek)}</strong><small>${metrics.savedWeeks.length}/${metrics.weeks.length} tuần</small></div><div><span>Thưởng/phạt tháng tự động</span><strong>${applyAuto ? homeroomCompetitionSigned(metrics.auto.net) : 'Tắt'}</strong><small>${metrics.auto.entries} ghi nhận tháng</small></div><div><span>Chăm sóc bồn hoa</span><strong>${homeroomCompetitionFormat(flower)}</strong><small>${flowerDirect === null ? 'TB các lần chấm đang nhập' : 'Điểm tháng nhập trực tiếp'}</small></div><div class="is-total"><span>Điểm tháng</span><strong>${homeroomCompetitionFormat(total)}</strong><small>Xem trước · TB tuần + thưởng/phạt + bồn hoa</small></div>`;
}

function homeroomCompetitionFillMonthForm(book) {
    const select = homeroomById('homeroomCompetitionMonthSelect');
    if (select) select.innerHTML = homeroomCompetitionBuildMonthOptions();
    if (!homeroomCompetitionSelectedMonth) return;
    const metrics = homeroomCompetitionMonthMetrics(book, homeroomCompetitionSelectedMonth);
    const record = metrics.record;
    const map = {
        homeroomCompetitionMonthManual: record?.manualBonusPenalty ?? '',
        homeroomCompetitionFlowerMid: record?.flowerMid ?? '',
        homeroomCompetitionFlowerEnd: record?.flowerEnd ?? '',
        homeroomCompetitionFlowerScore: record?.flowerScore ?? '',
        homeroomCompetitionFacility: record?.facilityAdjustment ?? '',
        homeroomCompetitionLabor: record?.laborAdjustment ?? '',
        homeroomCompetitionMonthNote: record?.note || '',
    };
    Object.entries(map).forEach(([id, value]) => { const el = homeroomById(id); if (el) el.value = value; });
    const autoToggle = homeroomById('homeroomCompetitionApplyAutoMonthly');
    if (autoToggle) autoToggle.checked = metrics.applyAutoMonthly;
    const preview = homeroomById('homeroomCompetitionMonthPreview');
    if (preview) preview.innerHTML = `<div><span>TB tuần đã lưu</span><strong>${homeroomCompetitionFormat(metrics.averageWeek)}</strong><small>${metrics.savedWeeks.length}/${metrics.weeks.length} tuần</small></div><div><span>Thưởng/phạt tháng tự động</span><strong>${homeroomCompetitionSigned(metrics.auto.net)}</strong><small>${metrics.auto.entries} ghi nhận tháng</small></div><div><span>Chăm sóc bồn hoa</span><strong>${homeroomCompetitionFormat(metrics.flowerScore)}</strong><small>${record?.flowerScore == null ? 'Nếu để trống dùng TB các lần chấm đã nhập' : 'Dùng điểm tháng nhập trực tiếp'}</small></div><div class="is-total"><span>Điểm tháng</span><strong>${homeroomCompetitionFormat(metrics.total)}</strong><small>TB tuần + thưởng/phạt + bồn hoa</small></div>`;
}

function homeroomCompetitionRenderMonthTable(book) {
    const host = homeroomById('homeroomCompetitionMonthTable');
    if (!host) return;
    const keys = homeroomCompetitionExpectedMonthKeys();
    if (!keys.length) {
        host.innerHTML = '<div class="homeroom-mini-empty">Cần thiết lập ngày bắt đầu Tuần 1 trong phần Năm học để tự chia tuần theo tháng.</div>';
        return;
    }
    const rows = keys.map(key => homeroomCompetitionMonthMetrics(book, key));
    host.innerHTML = `<table class="homeroom-competition-table"><thead><tr><th>Tháng</th><th>Tuần đã lưu</th><th>TB tuần</th><th>Tự động tháng</th><th>Điều chỉnh tay</th><th>Bồn hoa</th><th>Điểm tháng</th><th>CSVC</th><th>Lao động</th><th>Trạng thái</th></tr></thead><tbody>${rows.map(item => `<tr class="${item.monthKey === homeroomCompetitionSelectedMonth ? 'is-selected' : ''}" data-homeroom-competition-month-row="${item.monthKey}"><td><button type="button" class="homeroom-competition-link" data-homeroom-competition-month="${item.monthKey}">${homeroomEscapeHtml(homeroomCompetitionMonthLabel(item.monthKey))}</button></td><td>${item.savedWeeks.length}/${item.weeks.length}</td><td>${homeroomCompetitionFormat(item.averageWeek)}</td><td>${item.applyAutoMonthly ? homeroomCompetitionSigned(item.auto.net) : 'Tắt'}</td><td>${homeroomCompetitionSigned(item.manualBonusPenalty)}</td><td>${homeroomCompetitionFormat(item.flowerScore)}</td><td><strong>${homeroomCompetitionFormat(item.total)}</strong></td><td>${homeroomCompetitionSigned(item.facilityAdjustment)}</td><td>${homeroomCompetitionSigned(item.laborAdjustment)}</td><td><span class="homeroom-competition-status ${item.complete ? 'done' : 'pending'}">${item.complete ? 'Đủ tuần' : `Thiếu ${Math.max(0, item.weeks.length - item.savedWeeks.length)} tuần`}</span></td></tr>`).join('')}</tbody></table>`;
}

function homeroomCompetitionRenderSummary(book) {
    const host = homeroomById('homeroomCompetitionSummary');
    if (!host) return;
    const hk1 = homeroomCompetitionSemesterMetrics(book, '1');
    const hk2 = homeroomCompetitionSemesterMetrics(book, '2');
    const year = homeroomCompetitionYearMetrics(book);
    host.innerHTML = `<div class="homeroom-competition-summary-card"><span>Học kỳ I</span><strong>${homeroomCompetitionFormat(hk1.avgWeek)}</strong><small>TB ${hk1.saved.length}/18 tuần đã lưu · tổng hợp tham khảo</small></div><div class="homeroom-competition-summary-card"><span>Học kỳ II</span><strong>${homeroomCompetitionFormat(hk2.avgWeek)}</strong><small>TB ${hk2.saved.length}/19 tuần đã lưu · tổng hợp tham khảo</small></div><div class="homeroom-competition-summary-card"><span>TB các tháng</span><strong>${homeroomCompetitionFormat(year.averageMonth)}</strong><small>${year.available.length}/${year.months.length} tháng có dữ liệu</small></div><div class="homeroom-competition-summary-card"><span>CSVC + lao động</span><strong>${homeroomCompetitionSigned(year.facilityAdjustment + year.laborAdjustment)}</strong><small>CSVC ${homeroomCompetitionSigned(year.facilityAdjustment)} · lao động ${homeroomCompetitionSigned(year.laborAdjustment)}</small></div><div class="homeroom-competition-summary-card is-year"><span>Điểm thi đua năm</span><strong>${homeroomCompetitionFormat(year.total)}</strong><small>TB tháng + điểm trừ CSVC + lao động</small></div>`;
}

function homeroomRenderCompetitionBoard(book) {
    const section = homeroomById('homeroomCompetitionSection');
    if (!section) return;
    section.classList.toggle('is-disabled', !book);
    section.querySelectorAll('input,select,textarea,button').forEach(el => {
        if (el.id === 'homeroomCompetitionHelpToggle') return;
        el.disabled = !book;
    });
    if (!book) {
        const empty = homeroomById('homeroomCompetitionSummary');
        if (empty) empty.innerHTML = '<div class="homeroom-mini-empty">Mở hoặc tạo Sổ chủ nhiệm để bắt đầu bảng thi đua.</div>';
        const table = homeroomById('homeroomCompetitionMonthTable');
        if (table) table.innerHTML = '<div class="homeroom-mini-empty">Chưa có lớp đang mở.</div>';
        return;
    }
    homeroomCompetitionEnsure(book);
    if (!homeroomCompetitionSelectedWeek) homeroomCompetitionSelectedWeek = homeroomCompetitionCurrentWeek();
    const keys = homeroomCompetitionExpectedMonthKeys();
    if (keys.length && !keys.includes(homeroomCompetitionSelectedMonth)) {
        homeroomCompetitionSelectedMonth = homeroomCompetitionWeekMonthKey(homeroomCompetitionSelectedWeek) || keys[0];
    }
    homeroomCompetitionFillWeekForm(book);
    homeroomCompetitionFillMonthForm(book);
    homeroomCompetitionRenderMonthTable(book);
    homeroomCompetitionRenderSummary(book);
}

function homeroomCompetitionSaveWeek(event) {
    event?.preventDefault?.();
    const book = typeof homeroomActiveBook === 'function' ? homeroomActiveBook() : null;
    if (!book) return;
    const competition = homeroomCompetitionEnsure(book);
    const week = Number.parseInt(homeroomById('homeroomCompetitionWeekSelect')?.value, 10) || homeroomCompetitionSelectedWeek || 1;
    homeroomCompetitionSelectedWeek = Math.max(1, Math.min(37, week));
    const record = normalizeHomeroomCompetitionWeek({
        week: homeroomCompetitionSelectedWeek,
        redFlagBase: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionRedFlagBase')?.value),
        applyAutoConduct: Boolean(homeroomById('homeroomCompetitionApplyAutoConduct')?.checked),
        supervisorAdjustment: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionSupervisor')?.value),
        sdbScore: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionSdb')?.value),
        note: cleanText(homeroomById('homeroomCompetitionWeekNote')?.value),
        updatedAt: new Date().toISOString(),
    }, homeroomCompetitionSelectedWeek);
    competition.weeks[String(homeroomCompetitionSelectedWeek)] = record;
    const monthKey = homeroomCompetitionWeekMonthKey(homeroomCompetitionSelectedWeek);
    if (monthKey) homeroomCompetitionSelectedMonth = monthKey;
    book.updatedAt = new Date().toISOString();
    homeroomSchedulePersist?.();
    homeroomRenderCompetitionBoard(book);
    showToast?.(`✅ Đã lưu thi đua Tuần ${homeroomCompetitionSelectedWeek}`, 'success');
}

function homeroomCompetitionSaveMonth(event) {
    event?.preventDefault?.();
    const book = typeof homeroomActiveBook === 'function' ? homeroomActiveBook() : null;
    if (!book) return;
    const competition = homeroomCompetitionEnsure(book);
    const monthKey = homeroomById('homeroomCompetitionMonthSelect')?.value || homeroomCompetitionSelectedMonth;
    if (!/^\d{4}-\d{2}$/.test(monthKey || '')) {
        showToast?.('⚠️ Chưa xác định được tháng. Hãy cấu hình ngày bắt đầu Tuần 1.', 'info');
        return;
    }
    homeroomCompetitionSelectedMonth = monthKey;
    competition.months[monthKey] = normalizeHomeroomCompetitionMonth({
        monthKey,
        applyAutoMonthly: Boolean(homeroomById('homeroomCompetitionApplyAutoMonthly')?.checked),
        manualBonusPenalty: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionMonthManual')?.value),
        flowerMid: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerMid')?.value),
        flowerEnd: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerEnd')?.value),
        flowerScore: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerScore')?.value),
        facilityAdjustment: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFacility')?.value),
        laborAdjustment: homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionLabor')?.value),
        note: cleanText(homeroomById('homeroomCompetitionMonthNote')?.value),
        updatedAt: new Date().toISOString(),
    }, monthKey);
    book.updatedAt = new Date().toISOString();
    homeroomSchedulePersist?.();
    homeroomRenderCompetitionBoard(book);
    showToast?.(`✅ Đã lưu thi đua ${homeroomCompetitionMonthLabel(monthKey)}`, 'success');
}

function homeroomCompetitionDeleteWeek() {
    const book = homeroomActiveBook?.();
    if (!book) return;
    const competition = homeroomCompetitionEnsure(book);
    const key = String(homeroomCompetitionSelectedWeek);
    if (!competition.weeks[key]) return showToast?.('ℹ️ Tuần này chưa có bản ghi để xóa', 'info');
    if (!confirm(`Xóa dữ liệu nhập tay của Tuần ${key}? Các ghi nhận nề nếp gốc vẫn được giữ.`)) return;
    delete competition.weeks[key];
    book.updatedAt = new Date().toISOString();
    homeroomSchedulePersist?.();
    homeroomRenderCompetitionBoard(book);
    showToast?.(`✅ Đã xóa bản ghi thi đua Tuần ${key}`, 'success');
}

function homeroomCompetitionDeleteMonth() {
    const book = homeroomActiveBook?.();
    if (!book || !homeroomCompetitionSelectedMonth) return;
    const competition = homeroomCompetitionEnsure(book);
    if (!competition.months[homeroomCompetitionSelectedMonth]) return showToast?.('ℹ️ Tháng này chưa có bản ghi để xóa', 'info');
    if (!confirm(`Xóa dữ liệu nhập tay của ${homeroomCompetitionMonthLabel(homeroomCompetitionSelectedMonth)}? Dữ liệu tuần và nhật ký nề nếp vẫn được giữ.`)) return;
    delete competition.months[homeroomCompetitionSelectedMonth];
    book.updatedAt = new Date().toISOString();
    homeroomSchedulePersist?.();
    homeroomRenderCompetitionBoard(book);
    showToast?.('✅ Đã xóa dữ liệu tháng', 'success');
}

function homeroomCompetitionUseCurrentWeek() {
    homeroomCompetitionSelectedWeek = homeroomCompetitionCurrentWeek();
    homeroomCompetitionSelectedMonth = homeroomCompetitionWeekMonthKey(homeroomCompetitionSelectedWeek) || homeroomCompetitionSelectedMonth;
    homeroomRenderCompetitionBoard(homeroomActiveBook?.());
}

function homeroomCompetitionUseFlowerAverage() {
    const mid = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerMid')?.value);
    const end = homeroomCompetitionNullableNumber(homeroomById('homeroomCompetitionFlowerEnd')?.value);
    const values = [mid, end].filter(value => value !== null);
    if (!values.length) return showToast?.('ℹ️ Hãy nhập ít nhất một lần chấm bồn hoa', 'info');
    const avg = homeroomCompetitionRound(values.reduce((sum, value) => sum + value, 0) / values.length);
    const target = homeroomById('homeroomCompetitionFlowerScore');
    if (target) target.value = String(avg);
    homeroomCompetitionRefreshMonthDraft();
    showToast?.(`✅ Điểm bồn hoa dùng tính tháng: ${homeroomCompetitionFormat(avg)}`, 'success');
}

function homeroomCompetitionExportRows(book) {
    if (!book) return { weekRows:[], monthRows:[], summaryRows:[] };
    const weekRows = Array.from({ length:37 }, (_, index) => homeroomCompetitionWeekMetrics(book, index + 1)).map(item => ({
        'Tuần': item.week,
        'Khoảng ngày': item.dateInfo?.rangeText || '',
        'Tính vào tháng': item.monthKey ? homeroomCompetitionMonthLabel(item.monthKey) : '',
        'Đã lưu': item.saved ? 'Có' : 'Chưa',
        'Cờ đỏ gốc': item.redFlagBase,
        'Tự động từ Sổ CN': item.applyAutoConduct ? item.auto.net : 0,
        'Số ghi nhận tự động': item.auto.entries,
        'Điểm cờ đỏ dùng tính': item.redFlagFinal,
        'Điểm tổ giám thị': item.supervisorAdjustment,
        'Điểm SĐB': item.sdbScore,
        'Điểm thi đua tuần': item.total,
        'Ghi chú': item.record?.note || '',
    }));
    const monthRows = homeroomCompetitionExpectedMonthKeys().map(key => homeroomCompetitionMonthMetrics(book, key)).map(item => ({
        'Tháng': homeroomCompetitionMonthLabel(item.monthKey),
        'Số tuần theo lịch': item.weeks.length,
        'Số tuần đã lưu': item.savedWeeks.length,
        'TB điểm tuần': item.averageWeek ?? '',
        'Thưởng/phạt tháng tự động': item.applyAutoMonthly ? item.auto.net : 0,
        'Điều chỉnh tháng nhập tay': item.manualBonusPenalty,
        'Bồn hoa giữa tháng': item.record?.flowerMid ?? '',
        'Bồn hoa cuối tháng': item.record?.flowerEnd ?? '',
        'Điểm bồn hoa dùng tính': item.flowerScore,
        'Điểm thi đua tháng': item.total ?? '',
        'Điểm trừ CSVC': item.facilityAdjustment,
        'Điểm trừ lao động': item.laborAdjustment,
        'Trạng thái': item.complete ? 'Đủ tuần' : `Thiếu ${Math.max(0, item.weeks.length - item.savedWeeks.length)} tuần`,
        'Ghi chú': item.record?.note || '',
    }));
    const hk1 = homeroomCompetitionSemesterMetrics(book, '1');
    const hk2 = homeroomCompetitionSemesterMetrics(book, '2');
    const year = homeroomCompetitionYearMetrics(book);
    const summaryRows = [
        ['TỔNG HỢP THI ĐUA v53.3'],
        ['Lớp', book.className],
        ['Năm học', state.selectedAcademicYear],
        ['HKI - TB tuần tham khảo', hk1.avgWeek ?? ''],
        ['HKI - tuần đã lưu', `${hk1.saved.length}/18`],
        ['HKII - TB tuần tham khảo', hk2.avgWeek ?? ''],
        ['HKII - tuần đã lưu', `${hk2.saved.length}/19`],
        ['TB các tháng có dữ liệu', year.averageMonth ?? ''],
        ['Tổng điểm trừ CSVC', year.facilityAdjustment],
        ['Tổng điểm trừ lao động', year.laborAdjustment],
        ['Điểm thi đua năm', year.total ?? ''],
        ['Ghi chú', 'Điểm HK là tổng hợp tham khảo; dự thảo chỉ quy định công thức tuần, tháng và năm.'],
    ];
    return { weekRows, monthRows, summaryRows };
}

function initHomeroomCompetitionV533() {
    if (homeroomCompetitionInitialized) return;
    const section = homeroomById('homeroomCompetitionSection');
    if (!section) return;
    homeroomCompetitionInitialized = true;
    homeroomCompetitionSelectedWeek = homeroomCompetitionCurrentWeek();
    homeroomCompetitionSelectedMonth = homeroomCompetitionWeekMonthKey(homeroomCompetitionSelectedWeek) || homeroomCompetitionExpectedMonthKeys()[0] || '';

    homeroomById('homeroomCompetitionWeekForm')?.addEventListener('submit', homeroomCompetitionSaveWeek);
    homeroomById('homeroomCompetitionMonthForm')?.addEventListener('submit', homeroomCompetitionSaveMonth);
    homeroomById('homeroomCompetitionWeekSelect')?.addEventListener('change', event => {
        homeroomCompetitionSelectedWeek = Math.max(1, Math.min(37, Number.parseInt(event.target.value, 10) || 1));
        const monthKey = homeroomCompetitionWeekMonthKey(homeroomCompetitionSelectedWeek);
        if (monthKey) homeroomCompetitionSelectedMonth = monthKey;
        homeroomRenderCompetitionBoard(homeroomActiveBook?.());
    });
    homeroomById('homeroomCompetitionMonthSelect')?.addEventListener('change', event => {
        homeroomCompetitionSelectedMonth = event.target.value || homeroomCompetitionSelectedMonth;
        homeroomRenderCompetitionBoard(homeroomActiveBook?.());
    });
    homeroomById('homeroomCompetitionWeekForm')?.addEventListener('input', homeroomCompetitionRefreshWeekDraft);
    homeroomById('homeroomCompetitionWeekForm')?.addEventListener('change', homeroomCompetitionRefreshWeekDraft);
    homeroomById('homeroomCompetitionMonthForm')?.addEventListener('input', homeroomCompetitionRefreshMonthDraft);
    homeroomById('homeroomCompetitionMonthForm')?.addEventListener('change', homeroomCompetitionRefreshMonthDraft);
    homeroomById('homeroomCompetitionCurrentWeekBtn')?.addEventListener('click', homeroomCompetitionUseCurrentWeek);
    homeroomById('homeroomCompetitionDeleteWeekBtn')?.addEventListener('click', homeroomCompetitionDeleteWeek);
    homeroomById('homeroomCompetitionDeleteMonthBtn')?.addEventListener('click', homeroomCompetitionDeleteMonth);
    homeroomById('homeroomCompetitionFlowerAverageBtn')?.addEventListener('click', homeroomCompetitionUseFlowerAverage);
    homeroomById('homeroomCompetitionMonthTable')?.addEventListener('click', event => {
        const button = event.target.closest('[data-homeroom-competition-month]');
        if (!button) return;
        homeroomCompetitionSelectedMonth = button.dataset.homeroomCompetitionMonth;
        homeroomRenderCompetitionBoard(homeroomActiveBook?.());
        homeroomById('homeroomCompetitionMonthForm')?.scrollIntoView({ behavior:'smooth', block:'center' });
    });
}
