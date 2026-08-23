/* ============================================================================
   SỔ TAY GIÁO VIÊN v48 — BƯỚC 15: HỒ SƠ GIÁO VIÊN TỰ ĐỘNG
   Gói hồ sơ theo phạm vi Report Center · Word · Excel · In/PDF · ZIP
   ============================================================================ */
(() => {
    let initialized = false;
    let busy = false;
    const LAST_EXPORT_KEY = 'teacher_profile_package_last_export_v1';
    const byId = id => document.getElementById(id);
    const clean = value => typeof reportClean === 'function' ? reportClean(value) : String(value ?? '').trim();
    const esc = value => typeof reportEscape === 'function'
        ? reportEscape(value)
        : String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
    const safeArray = value => Array.isArray(value) ? value : [];

    function profileSemesterMilestone(row) {
        if (row?.semesterBoundaryMissing) return `Chưa xác nhận mốc HKI${row.semesterOneSuggestedPpct ? ` · gợi ý tiết ${row.semesterOneSuggestedPpct}` : ''}`;
        const base = `${row?.semesterShortLabel || 'HK'} · Tiết ${row?.semesterTargetPpct || '—'} · Tuần ${row?.semesterEndWeek || '—'}`;
        return row?.semesterNumber === 2 && row?.semesterOneEndPpct ? `${base} · HKI hết tiết ${row.semesterOneEndPpct}` : base;
    }

    function collectTimetableRows(range, filters) {
        const rows = [];
        const dayOrder = Array.isArray(globalThis.SCHOOL_DAYS)
            ? SCHOOL_DAYS
            : ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
        safeArray(range?.weeks).forEach(week => {
            const timetable = state?.timetablesByWeek?.[week];
            safeArray(timetable?.sessions).forEach(session => {
                safeArray(session?.periods).forEach(period => {
                    safeArray(period?.cells).forEach(cell => {
                        const className = clean(cell?.className);
                        const subject = clean(cell?.subject);
                        if (typeof reportMatchesFilters === 'function' && !reportMatchesFilters(className, subject, filters || {})) return;
                        rows.push({
                            week,
                            date: typeof reportDateForScheduleItem === 'function' ? reportDateForScheduleItem(week, cell?.day) : '',
                            day: clean(cell?.day),
                            dayIndex: dayOrder.indexOf(clean(cell?.day)),
                            session: clean(session?.label) || (session?.key === 'morning' ? 'Buổi sáng' : session?.key === 'afternoon' ? 'Buổi chiều' : clean(session?.key)),
                            sessionKey: clean(session?.key),
                            period: Number.parseInt(period?.period, 10) || clean(period?.period),
                            className,
                            subject,
                            content: clean(cell?.content) || [className, subject].filter(Boolean).join(' - '),
                        });
                    });
                });
            });
        });
        return rows.sort((a, b) => a.week - b.week
            || (a.dayIndex < 0 ? 99 : a.dayIndex) - (b.dayIndex < 0 ? 99 : b.dayIndex)
            || String(a.sessionKey).localeCompare(String(b.sessionKey))
            || Number(a.period) - Number(b.period));
    }

    function packageSnapshot() {
        if (typeof buildReportSnapshot !== 'function') throw new Error('Report Center chưa sẵn sàng');
        const snapshot = buildReportSnapshot();
        snapshot.timetableRows = collectTimetableRows(snapshot.range, snapshot.filters);
        snapshot.exceptionRows = snapshot.scheduleRows.filter(row => row.notTeaching || row.makeupLesson);
        snapshot.packageCreatedAt = new Date().toISOString();
        return snapshot;
    }

    function readiness(snapshot) {
        const percent = Number(snapshot?.stats?.completionPercent || 0);
        return {
            percent,
            stateName: percent >= 90 ? 'good' : percent >= 65 ? 'warning' : 'danger',
            label: percent >= 90 ? 'Sẵn sàng' : percent >= 65 ? 'Khá đầy đủ' : 'Cần bổ sung',
        };
    }

    function renderProfilePackageCenter() {
        const card = byId('profilePackageCard');
        if (!card) return;
        let snapshot;
        try {
            snapshot = packageSnapshot();
        } catch (error) {
            const ready = byId('profilePackageReadiness');
            if (ready) {
                ready.dataset.state = 'danger';
                ready.innerHTML = '<strong>Chưa sẵn sàng</strong><span>Report Center lỗi</span>';
            }
            return;
        }
        const r = readiness(snapshot);
        const ready = byId('profilePackageReadiness');
        if (ready) {
            ready.dataset.state = r.stateName;
            ready.innerHTML = `<strong>${r.percent}%</strong><span>${esc(r.label)}</span>`;
        }
        const components = [
            ['📋','Kế hoạch',snapshot.planRows.length,`${snapshot.stats.planCoverage}/${snapshot.stats.weekCount} tuần`,snapshot.stats.planCoverage ? (snapshot.stats.planCoverage === snapshot.stats.weekCount ? 'ok' : 'partial') : 'missing'],
            ['🗓️','Thời khóa biểu',snapshot.timetableRows.length,`${snapshot.stats.timetableCoverage}/${snapshot.stats.weekCount} tuần`,snapshot.stats.timetableCoverage ? (snapshot.stats.timetableCoverage === snapshot.stats.weekCount ? 'ok' : 'partial') : 'missing'],
            ['📖','Lịch báo giảng',snapshot.scheduleRows.length,`${snapshot.stats.scheduleCoverage}/${snapshot.stats.weekCount} tuần`,snapshot.stats.scheduleCoverage ? (snapshot.stats.scheduleCoverage === snapshot.stats.weekCount ? 'ok' : 'partial') : 'missing'],
            ['📈','Tiến độ PPCT',snapshot.progressRows.length,'lớp–môn',snapshot.progressRows.length ? 'ok' : 'missing'],
            ['🔁','Không học / Bù',snapshot.exceptionRows.length,`${snapshot.stats.canceledLessons} nghỉ · ${snapshot.stats.makeupLessons} bù`,'ok'],
            ['🗂️','Công việc',snapshot.workRows.length,'mục trong kỳ',snapshot.workRows.length ? 'ok' : 'partial'],
            ['📑','Tổng hợp',snapshot.weekRows.length,snapshot.range.label,'ok'],
        ];
        const box = byId('profilePackageComponents');
        if (box) {
            box.innerHTML = components.map(([icon,title,count,detail,stateName]) =>
                `<div class="profile-package-component" data-state="${stateName}"><span>${icon}</span><strong>${esc(title)} · ${count}</strong><small title="${esc(detail)}">${esc(detail)}</small></div>`
            ).join('');
        }
        const note = byId('profilePackageNote');
        if (note) {
            const filterText = [
                snapshot.filters.classKey ? byId('reportClassSelect')?.selectedOptions?.[0]?.textContent : '',
                snapshot.filters.subjectKey ? byId('reportSubjectSelect')?.selectedOptions?.[0]?.textContent : '',
            ].filter(Boolean).join(' · ');
            note.textContent = `Gói hiện tại: ${snapshot.range.label}${filterText ? ` · ${filterText}` : ''}. ZIP gồm Word, Excel, bản in để lưu PDF, JSON và 7 mục HTML riêng.`;
        }
    }

    function filenamePart(value) {
        return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
            .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
    }

    function filenameBase(snapshot) {
        const teacher = filenamePart(snapshot.profile?.teacherName || 'giao-vien');
        const year = filenamePart(snapshot.academicYear || 'nam-hoc');
        const scope = filenamePart(snapshot.range?.label || 'ho-so');
        return `ho-so-gv-${teacher}-${year}-${scope}`;
    }

    function downloadBlob(blob, name) {
        return downloadBlobFile(blob, name);
    }

    function table(headers, rows, mapper) {
        if (!rows.length) return '<p><i>Chưa có dữ liệu trong phạm vi đã chọn.</i></p>';
        return `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(mapper).join('')}</tbody></table>`;
    }

    function packageSections(snapshot) {
        const plan = table(['Tuần','Ngày','Thứ','Buổi sáng','Buổi chiều','Đi công tác'], snapshot.planRows,
            r => `<tr><td>${r.week}</td><td>${esc(r.date || '—')}</td><td>${esc(r.day)}</td><td>${esc(r.morning)}</td><td>${esc(r.afternoon)}</td><td>${esc(r.businessTrip)}</td></tr>`);
        const timetable = table(['Tuần','Ngày','Thứ','Buổi','Tiết','Lớp','Môn','Nội dung'], snapshot.timetableRows,
            r => `<tr><td>${r.week}</td><td>${esc(r.date || '—')}</td><td>${esc(r.day)}</td><td>${esc(r.session)}</td><td>${esc(r.period)}</td><td>${esc(r.className)}</td><td>${esc(r.subject)}</td><td>${esc(r.content)}</td></tr>`);
        const teaching = table(['Tuần','Ngày','Thứ','Buổi','TKB','PPCT','Lớp','Môn','Bài dạy / Chủ đề','Ghi chú'], snapshot.scheduleRows,
            r => `<tr><td>${r.week}</td><td>${esc(r.date || '—')}</td><td>${esc(r.day)}</td><td>${esc(r.session)}</td><td>${esc(r.period)}</td><td>${esc(r.ppctPeriod || '—')}</td><td>${esc(r.className)}</td><td>${esc(r.subject)}</td><td>${esc(r.topic)}</td><td>${esc(r.note)}</td></tr>`);
        const progress = table(['Lớp','Môn','PPCT KH','PPCT TT','Chênh lệch','Bài đang dạy','Không học','Học bù','Trạng thái','Mốc cuối HK','Dự báo cuối HK'], snapshot.progressRows,
            r => `<tr><td>${esc(r.className)}</td><td>${esc(r.subject)}</td><td>${esc(r.plannedPpct || '—')}</td><td>${esc(r.actualPpct || '—')}</td><td>${esc(r.difference ?? '—')}</td><td>${esc(r.currentTopic || '—')}</td><td>${esc(r.canceledCount)}</td><td>${esc(r.makeupCount)}</td><td>${esc(r.statusLabel)}</td><td>${esc(profileSemesterMilestone(r))}</td><td>${esc(r.forecastLabel)}</td></tr>`);
        const exceptions = table(['Tuần','Ngày','Thứ','Lớp','Môn','Loại','Nội dung / Lý do','Ghi chú'], snapshot.exceptionRows,
            r => `<tr><td>${r.week}</td><td>${esc(r.date || '—')}</td><td>${esc(r.day)}</td><td>${esc(r.className)}</td><td>${esc(r.subject)}</td><td>${r.notTeaching ? 'Không học' : 'Học bù'}</td><td>${esc(r.topic)}</td><td>${esc(r.note)}</td></tr>`);
        const work = table(['Loại','Tiêu đề','Hạn','Phạm vi','Trạng thái','Nội dung'], snapshot.workRows,
            r => `<tr><td>${esc(r.type)}</td><td>${esc(r.title)}</td><td>${esc(r.dueDate || '—')}</td><td>${r.scope === 'shared' ? 'Nhóm' : 'Cá nhân'}</td><td>${r.type === 'task' ? (r.completed ? 'Đã xong' : 'Chưa xong') : '—'}</td><td>${esc(r.content)}</td></tr>`);
        const summary = table(['Tuần','Khoảng ngày','Kế hoạch','Số tiết TKB','Báo giảng','Trạng thái'], snapshot.weekRows,
            r => `<tr><td>${r.week}</td><td>${esc(r.dateRange || '—')}</td><td>${r.hasPlan ? 'Có' : 'Chưa'}</td><td>${r.timetableCount || '—'}</td><td>${r.scheduleCount || '—'}</td><td>${esc(r.status)}</td></tr>`);
        return { plan, timetable, teaching, progress, exceptions, work, summary };
    }

    function packageHeader(snapshot, title) {
        return `<div class="profile-doc-header"><h3>${esc(snapshot.profile?.schoolName || '')}</h3><h1>${esc(title)}</h1><h2>${esc(snapshot.range.label)}</h2><p>${snapshot.range.text ? `Thời gian: <b>${esc(snapshot.range.text)}</b> · ` : ''}Giáo viên: <b>${esc(snapshot.profile?.teacherName || '')}</b> · Môn: <b>${esc(snapshot.profile?.subject || '')}</b> · Năm học: <b>${esc(snapshot.academicYear)}</b></p></div>`;
    }

    function profileBuildDocumentBody(snapshot) {
        const s = packageSections(snapshot);
        return `${packageHeader(snapshot, 'HỒ SƠ GIẢNG DẠY TỰ ĐỘNG')}
            <div class="profile-doc-summary"><p><b>${snapshot.stats.activeLessons}</b> tiết học · <b>${snapshot.stats.canceledLessons}</b> tiết không học · <b>${snapshot.stats.makeupLessons}</b> tiết học bù · <b>${snapshot.stats.finalizedWeeks}/${snapshot.stats.weekCount}</b> tuần đã chốt · Mức hoàn thiện <b>${snapshot.stats.completionPercent}%</b>.</p></div>
            <h2>I. TỔNG HỢP HỒ SƠ</h2>${s.summary}
            <h2>II. KẾ HOẠCH NHÀ TRƯỜNG</h2>${s.plan}
            <h2>III. THỜI KHÓA BIỂU</h2>${s.timetable}
            <h2>IV. LỊCH BÁO GIẢNG</h2>${s.teaching}
            <h2>V. TIẾN ĐỘ PPCT</h2>${s.progress}
            <h2>VI. KHÔNG HỌC – HỌC BÙ</h2>${s.exceptions}
            <h2>VII. SỔ CÔNG VIỆC</h2>${s.work}
            <div class="profile-doc-sign"><p>Xuất từ Sổ Tay Giáo Viên Pro · ${new Date().toLocaleString('vi-VN')}</p><p><b>Người lập hồ sơ</b><br><br><br>${esc(snapshot.profile?.teacherName || '')}</p></div>`;
    }

    function fullHtml(snapshot, title, body) {
        return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
            @page{size:A4 landscape;margin:11mm}body{font-family:"Times New Roman",serif;color:#000;font-size:10.5pt}h1,h2,h3,p{text-align:center;margin:5px 0}h1{font-size:16pt}h2{font-size:12.5pt;margin-top:15px}table{width:100%;border-collapse:collapse;margin:7px 0 13px;font-size:9pt}th,td{border:1px solid #000;padding:3px 4px;vertical-align:top}th{text-align:center}.profile-doc-sign{display:flex;justify-content:space-between;align-items:flex-start;margin-top:20px}.profile-doc-sign>p:last-child{min-width:220px}
            </style></head><body>${body}</body></html>`;
    }

    function workbookFromSnapshot(snapshot) {
        if (!window.XLSX?.utils) return null;
        const workbook = XLSX.utils.book_new();
        const add = (name, rows, widths) => {
            const sheet = XLSX.utils.aoa_to_sheet(rows);
            if (widths) sheet['!cols'] = widths.map(wch => ({ wch }));
            XLSX.utils.book_append_sheet(workbook, sheet, name);
        };
        add('Tong hop', [
            ['HỒ SƠ GIẢNG DẠY TỰ ĐỘNG'],
            [`Giáo viên: ${snapshot.profile?.teacherName || ''}`, `Môn: ${snapshot.profile?.subject || ''}`, `Năm học: ${snapshot.academicYear}`],
            [`Phạm vi: ${snapshot.range.label}`, snapshot.range.text || ''], [],
            ['Tuần','Khoảng ngày','Kế hoạch','Số tiết TKB','Báo giảng','Trạng thái'],
            ...snapshot.weekRows.map(r => [r.week,r.dateRange,r.hasPlan ? 'Có' : 'Chưa',r.timetableCount,r.scheduleCount,r.status]),
        ], [12,25,14,14,14,18]);
        add('Ke hoach', [['Tuần','Ngày','Thứ','Buổi sáng','Buổi chiều','Đi công tác'], ...snapshot.planRows.map(r => [r.week,r.date,r.day,r.morning,r.afternoon,r.businessTrip])], [8,12,10,42,42,30]);
        add('Thoi khoa bieu', [['Tuần','Ngày','Thứ','Buổi','Tiết','Lớp','Môn','Nội dung'], ...snapshot.timetableRows.map(r => [r.week,r.date,r.day,r.session,r.period,r.className,r.subject,r.content])], [8,12,10,14,8,10,14,38]);
        add('Lich bao giang', [['Tuần','Ngày','Thứ','Buổi','TKB','PPCT','Lớp','Môn','Bài dạy / Chủ đề','Ghi chú'], ...snapshot.scheduleRows.map(r => [r.week,r.date,r.day,r.session,r.period,r.ppctPeriod || '',r.className,r.subject,r.topic,r.note])], [8,12,10,14,8,9,10,14,42,28]);
        add('Tien do PPCT', [['Lớp','Môn','PPCT KH','PPCT TT','Chênh lệch','Bài đang dạy','Số tiết đã dạy','Không học','Học bù','Trạng thái','Học kỳ','Mốc HKI xác nhận','Gợi ý mốc HKI','Mốc cuối HK','Dự báo cuối HK','Thiếu dự kiến'], ...snapshot.progressRows.map(r => [r.className,r.subject,r.plannedPpct || '',r.actualPpct || '',r.difference ?? '',r.currentTopic || '',r.taughtCount,r.canceledCount,r.makeupCount,r.statusLabel,r.semesterLabel || '',r.semesterOneEndPpct || '',r.semesterOneSuggestedPpct || '',r.semesterTargetPpct || '',r.forecastLabel,r.forecastShortfall || 0])], [10,14,10,10,10,40,13,10,10,18,12,15,14,13,34,13]);
        add('Khong hoc - Hoc bu', [['Tuần','Ngày','Thứ','Lớp','Môn','Loại','Nội dung / Lý do','Ghi chú'], ...snapshot.exceptionRows.map(r => [r.week,r.date,r.day,r.className,r.subject,r.notTeaching ? 'Không học' : 'Học bù',r.topic,r.note])], [8,12,10,10,14,12,42,28]);
        add('Cong viec', [['Loại','Tiêu đề','Hạn','Phạm vi','Trạng thái','Nội dung'], ...snapshot.workRows.map(r => [r.type,r.title,r.dueDate,r.scope,r.type === 'task' ? (r.completed ? 'Đã xong' : 'Chưa xong') : '',r.content])], [12,30,12,12,14,55]);
        return workbook;
    }

    function markExport(snapshot, type) {
        try {
            localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify({ at:new Date().toISOString(), type, academicYear:snapshot.academicYear, range:snapshot.range.label }));
        } catch (_) { /* noop */ }
    }

    function exportWord() {
        const snapshot = packageSnapshot();
        const body = profileBuildDocumentBody(snapshot);
        downloadBlob(new Blob(['\ufeff', fullHtml(snapshot, 'Hồ sơ giảng dạy tự động', body)], { type:'application/msword;charset=utf-8' }), `${filenameBase(snapshot)}.doc`);
        markExport(snapshot, 'word');
        showToast('✅ Đã xuất Word hồ sơ tự động', 'success');
    }

    function exportExcel() {
        const snapshot = packageSnapshot();
        const workbook = workbookFromSnapshot(snapshot);
        if (!workbook) {
            showToast('❌ Thư viện Excel chưa tải được', 'error');
            return;
        }
        XLSX.writeFile(workbook, `${filenameBase(snapshot)}.xlsx`);
        markExport(snapshot, 'excel');
        showToast('✅ Đã xuất Excel 7 bảng hồ sơ', 'success');
    }

    function printPdf() {
        const snapshot = packageSnapshot();
        const area = byId('reportPrintArea');
        if (!area) return;
        area.innerHTML = profileBuildDocumentBody(snapshot);
        triggerPrintMode('print-report-mode', 1800);
        markExport(snapshot, 'pdf-print');
    }

    // ZIP Store (không nén) thuần JS: không thêm CDN và vẫn hoạt động khi app-shell offline.
    const crcTable = (() => {
        const out = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            out[n] = c >>> 0;
        }
        return out;
    })();
    function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
    const le16 = v => new Uint8Array([v & 255, (v >>> 8) & 255]);
    const le32 = v => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
    function joinBytes(parts) { const total = parts.reduce((sum, part) => sum + part.length, 0); const out = new Uint8Array(total); let offset = 0; parts.forEach(part => { out.set(part, offset); offset += part.length; }); return out; }
    function dosDateTime(date = new Date()) { const year = Math.max(1980, date.getFullYear()); return { time:(date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1), date:((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() }; }
    function makeZip(entries) {
        const encoder = new TextEncoder();
        const locals = [], centrals = [];
        let offset = 0;
        const dt = dosDateTime();
        entries.forEach(entry => {
            const name = encoder.encode(entry.name);
            const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(String(entry.data ?? ''));
            const crc = crc32(data), flag = 0x0800;
            const local = joinBytes([le32(0x04034b50),le16(20),le16(flag),le16(0),le16(dt.time),le16(dt.date),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data]);
            locals.push(local);
            centrals.push(joinBytes([le32(0x02014b50),le16(20),le16(20),le16(flag),le16(0),le16(dt.time),le16(dt.date),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]));
            offset += local.length;
        });
        const local = joinBytes(locals), central = joinBytes(centrals);
        const end = joinBytes([le32(0x06054b50),le16(0),le16(0),le16(entries.length),le16(entries.length),le32(central.length),le32(local.length),le16(0)]);
        return joinBytes([local, central, end]);
    }
    async function blobBytes(blob) { return new Uint8Array(await blob.arrayBuffer()); }
    function profileSectionHtml(snapshot, title, body) { return fullHtml(snapshot, title, `${packageHeader(snapshot, title)}${body}`); }

    async function exportZip() {
        if (busy) return;
        busy = true;
        const card = byId('profilePackageCard');
        const button = byId('profilePackageZipBtn');
        const oldText = button?.textContent;
        card?.classList.add('is-busy');
        if (button) button.textContent = '⏳ Đang đóng gói…';
        try {
            const snapshot = packageSnapshot();
            const sections = packageSections(snapshot);
            const base = filenameBase(snapshot);
            const body = profileBuildDocumentBody(snapshot);
            const docBlob = new Blob(['\ufeff', fullHtml(snapshot, 'Hồ sơ giảng dạy tự động', body)], { type:'application/msword;charset=utf-8' });
            const workbook = workbookFromSnapshot(snapshot);
            let xlsxBytes = null;
            if (workbook) xlsxBytes = new Uint8Array(XLSX.write(workbook, { bookType:'xlsx', type:'array' }));
            const manifest = {
                application:'Sổ Tay Giáo Viên Pro', version:typeof APP_VERSION !== 'undefined' ? APP_VERSION : '50.7.0', createdAt:snapshot.packageCreatedAt,
                academicYear:snapshot.academicYear,
                range:{ label:snapshot.range.label, startWeek:snapshot.range.startWeek, endWeek:snapshot.range.endWeek, dateRange:snapshot.range.text },
                teacher:{ school:snapshot.profile?.schoolName || '', name:snapshot.profile?.teacherName || '', subject:snapshot.profile?.subject || '' },
                filters:snapshot.filters, stats:snapshot.stats,
                counts:{ plan:snapshot.planRows.length, timetable:snapshot.timetableRows.length, teachingSchedule:snapshot.scheduleRows.length, progress:snapshot.progressRows.length, exceptions:snapshot.exceptionRows.length, work:snapshot.workRows.length },
            };
            const guideLines = [
                'HỒ SƠ GIÁO VIÊN TỰ ĐỘNG', '=============================',
                `Phạm vi: ${snapshot.range.label}${snapshot.range.text ? ` (${snapshot.range.text})` : ''}`,
                `Năm học: ${snapshot.academicYear}`, `Giáo viên: ${snapshot.profile?.teacherName || ''}`, '', 'Danh mục:',
                '01_Ke_hoach_truong.html','02_Thoi_khoa_bieu.html','03_Lich_bao_giang.html','04_Tien_do_PPCT.html','05_Khong_hoc_Hoc_bu.html','06_So_cong_viec.html','07_Bao_cao_tong_hop.html',
                `${base}.doc`, ...(xlsxBytes ? [`${base}.xlsx`] : []),
                'Ban_in_PDF.html (mở bằng trình duyệt → In → Lưu dưới dạng PDF)', 'Du_lieu_ho_so.json', '',
                'Gói được tạo từ dữ liệu hiện có, không chỉnh sửa dữ liệu nguồn.',
            ];
            const entries = [
                { name:'00_DANH_MUC_HO_SO.txt', data:guideLines.join('\r\n') },
                { name:'01_Ke_hoach_truong.html', data:profileSectionHtml(snapshot, 'KẾ HOẠCH NHÀ TRƯỜNG', sections.plan) },
                { name:'02_Thoi_khoa_bieu.html', data:profileSectionHtml(snapshot, 'THỜI KHÓA BIỂU', sections.timetable) },
                { name:'03_Lich_bao_giang.html', data:profileSectionHtml(snapshot, 'LỊCH BÁO GIẢNG', sections.teaching) },
                { name:'04_Tien_do_PPCT.html', data:profileSectionHtml(snapshot, 'TIẾN ĐỘ PPCT', sections.progress) },
                { name:'05_Khong_hoc_Hoc_bu.html', data:profileSectionHtml(snapshot, 'KHÔNG HỌC – HỌC BÙ', sections.exceptions) },
                { name:'06_So_cong_viec.html', data:profileSectionHtml(snapshot, 'SỔ CÔNG VIỆC', sections.work) },
                { name:'07_Bao_cao_tong_hop.html', data:profileSectionHtml(snapshot, 'BÁO CÁO TỔNG HỢP', sections.summary) },
                { name:`${base}.doc`, data:await blobBytes(docBlob) },
                { name:'Ban_in_PDF.html', data:fullHtml(snapshot, 'Bản in hồ sơ - lưu PDF', body) },
                { name:'Du_lieu_ho_so.json', data:JSON.stringify(manifest, null, 2) },
            ];
            if (xlsxBytes) entries.splice(9, 0, { name:`${base}.xlsx`, data:xlsxBytes });
            downloadBlob(new Blob([makeZip(entries)], { type:'application/zip' }), `${base}.zip`);
            markExport(snapshot, 'zip');
            showToast(`✅ Đã tạo gói hồ sơ ${snapshot.range.label} · ${entries.length} tệp`, 'success');
        } catch (error) {
            console.error('[PROFILE PACKAGE]', error);
            showToast('❌ Không thể tạo gói hồ sơ: ' + (error?.message || error), 'error');
            window.teacherNotebookRecordError?.('profile-package', error);
        } finally {
            busy = false;
            card?.classList.remove('is-busy');
            if (button) button.textContent = oldText || '📦 Tạo gói hồ sơ ZIP';
            renderProfilePackageCenter();
        }
    }

    function initProfilePackageCenter() {
        if (initialized || !byId('profilePackageCard')) return;
        initialized = true;
        byId('profilePackageZipBtn')?.addEventListener('click', exportZip);
        byId('profilePackageWordBtn')?.addEventListener('click', exportWord);
        byId('profilePackageExcelBtn')?.addEventListener('click', exportExcel);
        byId('profilePackagePrintBtn')?.addEventListener('click', printPdf);
        ['reportScopeSelect','reportMonthSelect','reportStartWeek','reportEndWeek','reportClassSelect','reportSubjectSelect'].forEach(id => byId(id)?.addEventListener('change', () => setTimeout(renderProfilePackageCenter, 0)));
        registerAppDataRefresh('profile-package', renderProfilePackageCenter, { delay:120 });
        ['schoolYearSelect','academicYearSelect','progressAcademicYearSelect'].forEach(id => byId(id)?.addEventListener('change', () => setTimeout(renderProfilePackageCenter, 80)));
        renderProfilePackageCenter();
    }

    window.initProfilePackageCenter = initProfilePackageCenter;
    window.renderProfilePackageCenter = renderProfilePackageCenter;
    window.openProfilePackageCenter = () => {
        if (typeof activateOverviewTab === 'function') activateOverviewTab('reports');
        else document.querySelector('.tab-btn[data-tab="reports"]')?.click();
        setTimeout(() => {
            if (typeof renderReportCenter === 'function') renderReportCenter();
            renderProfilePackageCenter();
            byId('profilePackageCard')?.scrollIntoView({ behavior:'smooth', block:'center' });
        }, 40);
    };
})();
