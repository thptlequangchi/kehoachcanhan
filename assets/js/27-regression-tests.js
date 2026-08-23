/* Bước 17 · v50.7 — Bộ kiểm thử hồi quy tự động, không phá dữ liệu thật. */
(() => {
    'use strict';
    const STORAGE_KEY = 'teacher_regression_last_v1';
    const MAX_SAVED_RESULTS = 80;
    let initialized = false;
    let running = false;
    let lastReport = null;

    const $ = id => document.getElementById(id);
    const nowIso = () => new Date().toISOString();
    const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const esc = value => clean(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const result = (id, title, status, message = '', group = 'Lõi') => ({ id, title, status, message: clean(message), group });
    const ok = (id, title, message, group) => result(id,title,'pass',message,group);
    const warn = (id, title, message, group) => result(id,title,'warn',message,group);
    const fail = (id, title, message, group) => result(id,title,'fail',message,group);
    const skip = (id, title, message, group) => result(id,title,'skip',message,group);

    function previousMap() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            const source = data?.baseline && typeof data.baseline === 'object'
                ? Object.entries(data.baseline).map(([id,status]) => ({id,status}))
                : (Array.isArray(data?.results) ? data.results : []);
            return new Map(source.map(item => [item.id, item.status]));
        } catch (_) { return new Map(); }
    }
    function saveReport(report) {
        try {
            let previous = null;
            try { previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { previous = null; }
            const baseline = previous?.baseline && typeof previous.baseline === 'object' ? { ...previous.baseline } : {};
            if (!Object.keys(baseline).length && Array.isArray(previous?.results)) {
                previous.results.forEach(item => { if (item?.id && item?.status) baseline[item.id] = item.status; });
            }
            report.results.forEach(item => { baseline[item.id] = item.status; });
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: report.version,
                mode: report.mode,
                ranAt: report.ranAt,
                summary: report.summary,
                baseline,
                results: report.results.slice(0, MAX_SAVED_RESULTS).map(({id,title,status,message,group}) => ({id,title,status,message,group})),
            }));
        } catch (_) { /* diagnostic cache is optional */ }
    }

    function runSync(id, title, group, fn) {
        try {
            const value = fn();
            if (value && typeof value === 'object' && value.status) return result(id,title,value.status,value.message || '',group);
            if (value === false) return fail(id,title,'Điều kiện kiểm thử không đạt.',group);
            return ok(id,title, typeof value === 'string' ? value : 'Đạt.', group);
        } catch (error) {
            return fail(id,title,error?.message || String(error),group);
        }
    }
    async function runAsync(id, title, group, fn) {
        try {
            const value = await fn();
            if (value && typeof value === 'object' && value.status) return result(id,title,value.status,value.message || '',group);
            if (value === false) return fail(id,title,'Điều kiện kiểm thử không đạt.',group);
            return ok(id,title, typeof value === 'string' ? value : 'Đạt.', group);
        } catch (error) {
            return fail(id,title,error?.message || String(error),group);
        }
    }

    function coreQuickTests() {
        const tests = [];
        tests.push(runSync('app-version','Phiên bản ứng dụng','Khởi động',() => APP_VERSION === '50.7.0' ? `APP_VERSION ${APP_VERSION}.` : {status:'fail',message:`APP_VERSION hiện là ${APP_VERSION}.`}));
        tests.push(runSync('init-complete','Quá trình khởi động','Khởi động',() => window.__teacherNotebookInitCompleted ? 'Init đã hoàn tất.' : {status:'warn',message:'Init chưa phát tín hiệu hoàn tất tại thời điểm kiểm thử.'}));
        tests.push(runSync('init-errors','Lỗi khi khởi động','Khởi động',() => {
            const errors = Array.isArray(window.__teacherNotebookInitErrors) ? window.__teacherNotebookInitErrors : [];
            return errors.length ? {status:'warn',message:`Có ${errors.length} lỗi module đã được cô lập; xem Health Check để biết chi tiết.`} : 'Không ghi nhận lỗi init.';
        }));
        tests.push(runSync('dom-unique','ID giao diện không trùng','Giao diện',() => {
            const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
            const duplicates = ids.filter((id,index) => ids.indexOf(id) !== index);
            return duplicates.length ? {status:'fail',message:`ID trùng: ${[...new Set(duplicates)].slice(0,8).join(', ')}`} : `${ids.length} ID duy nhất.`;
        }));
        tests.push(runSync('critical-dom','Các vùng giao diện lõi tồn tại','Giao diện',() => {
            const ids=['settingsHub','yearDashboard','teacherCommandCenter','automationCenter','workItemList','reportCenterCard','healthCenterCard','storageProCard','globalCommandPalette','regressionCenterCard'];
            const missing=ids.filter(id=>!$(id));
            return missing.length ? {status:'fail',message:`Thiếu: ${missing.join(', ')}`} : `Đủ ${ids.length}/${ids.length} vùng lõi.`;
        }));
        tests.push(runSync('core-globals','Các hàm nghiệp vụ lõi đã nạp','Khởi động',() => {
            const names=['normalizePlanWeek','normalizeTimetable','normalizeScheduleItem','normalizeWorkItems','normalizeBackupPayload','getWeekOperationalStatus','buildSemesterRemainingStatus','getTodayTeachingItems','getPendingWorkTasks','renderPlanTable','renderTimetable','renderTeachingSchedule','renderYearDashboard','renderAutomationCenter','renderReportCenter','initSmartReminderCenter','getSmartReminderManagedSuggestionKeys'];
            const missing=names.filter(name=>typeof globalThis[name] !== 'function');
            return missing.length ? {status:'fail',message:`Thiếu hàm: ${missing.join(', ')}`} : `Đủ ${names.length} hàm lõi.`;
        }));
        tests.push(runSync('school-week-invariant','Quy tắc lịch 39 tuần','Nghiệp vụ',() => MAX_SCHOOL_WEEKS === 37 && MAX_AUXILIARY_WEEKS === 2 && TOTAL_ACADEMIC_CALENDAR_WEEKS === 39 && getAcademicCalendarWeekSequence().length === 39 && SCHOOL_DAYS.length === 6 && PLAN_DAYS.length === 7 ? '39 tuần lịch = 2 tuần phụ + 37 tuần chính · 6 ngày học · 7 ngày kế hoạch.' : {status:'fail',message:'Hằng số năm học/tuần phụ/ngày không còn đúng cấu hình.'}));
        tests.push(runSync('academic-year-normalizer','Chuẩn hóa năm học','Nghiệp vụ',() => normalizeAcademicYear('2026 - 2027') === '2026-2027' ? 'Chuẩn hóa 2026 - 2027 → 2026-2027.' : {status:'fail',message:'normalizeAcademicYear trả kết quả không mong đợi.'}));
        tests.push(runSync('plan-normalizer','Chuẩn hóa Kế hoạch tuần','Nghiệp vụ',() => {
            const data=normalizePlanWeek({week:5,dateRange:'24/08/2026 - 30/08/2026',days:[{day:'Thứ 2',date:'24/08',morning:'Chào cờ'}]});
            return data?.week===5 && data.days?.[0]?.day==='Thứ 2' && data.days?.[0]?.morning==='Chào cờ' ? 'Fixture kế hoạch được chuẩn hóa đúng.' : {status:'fail',message:'Fixture kế hoạch không giữ đúng tuần/ngày/nội dung.'};
        }));
        tests.push(runSync('timetable-normalizer','Chuẩn hóa Thời khóa biểu','Nghiệp vụ',() => {
            const data=normalizeTimetable({week:5,sessions:[{key:'morning',periods:[{period:1,cells:[{day:'Thứ 2',className:'12A1',subject:'Toán'}]}]},{key:'afternoon',periods:[]}]});
            const cell=data?.sessions?.[0]?.periods?.[0]?.cells?.[0];
            return data?.sessions?.length===2 && cell?.className==='12A1' && cell?.subject==='Toán' ? 'Fixture TKB giữ đúng lớp/môn và đủ 2 buổi.' : {status:'fail',message:'normalizeTimetable không đạt fixture chuẩn.'};
        }));
        tests.push(runSync('work-legacy','Tương thích Sổ Công Việc cũ','Nghiệp vụ',() => {
            const item=normalizeWorkItems([{id:'fixture',type:'task',title:'Kiểm thử',completed:true}], 'personal')[0];
            return item?.status==='done' && item?.completed===true ? 'completed:true được hiểu là status:done.' : {status:'fail',message:'Tương thích task phiên bản cũ bị thay đổi.'};
        }));
        tests.push(runSync('schedule-normalizer','Chuẩn hóa tiết báo giảng','Nghiệp vụ',() => {
            const item=normalizeScheduleItem({day:'Thứ 3',session:'Sáng',period:'2',class:'12A1',subject:'Toán',topic:'Đạo hàm'},5,0);
            return item?.id && item.day==='Thứ 3' && item.class==='12A1' ? 'Fixture tiết báo giảng có ID và dữ liệu hợp lệ.' : {status:'fail',message:'normalizeScheduleItem không đạt fixture chuẩn.'};
        }));
        tests.push(runSync('schedule-final-status','Trạng thái chốt dùng chung','Nghiệp vụ',() => {
            const ok=isScheduleFinalized({status:'final'}) && isScheduleFinalized({status:'finalized'}) && !isScheduleFinalized({status:'final',stale:true}) && !isScheduleFinalized({status:'draft'});
            return ok ? 'final/finalized được hiểu thống nhất; lịch stale không tính là đã chốt.' : {status:'fail',message:'Quy tắc trạng thái chốt đang không đồng nhất.'};
        }));
        tests.push(runSync('semester-ppct-targets','Mốc PPCT theo học kỳ do giáo viên xác nhận','Nghiệp vụ',() => {
            const map=new Map([[1,{sourceWeek:1}],[54,{sourceWeek:18}],[55,{sourceWeek:19}],[89,{sourceWeek:37}]]);
            const profile={semesterOneEndPpct:54,weeks:[{week:18,lessons:[{ppctPeriod:'54',topic:'Kiểm tra học kỳ I'}]},{week:37,lessons:[{ppctPeriod:'89',topic:'Ôn tập cuối năm'}]}]};
            const target=getCurriculumSemesterTargets(map,profile);
            const hk1=getSchoolSemesterInfo(18), hk2=getSchoolSemesterInfo(19);
            const ok=target.semesterOneTargetPpct===54 && target.semesterOneBoundaryConfirmed && target.totalPpct===89 && hk1.endWeek===18 && hk2.startWeek===19 && hk2.endWeek===37;
            return ok ? '140/105 được hiểu là tổng cả năm; HKI dùng mốc giáo viên xác nhận, HKII dùng tiết cuối cả năm.' : {status:'fail',message:'Không dùng đúng mốc HKI do giáo viên xác nhận.'};
        }));
        tests.push(runSync('semester-boundary-suggestion','Gợi ý mốc HKI từ Kiểm tra/Trả bài','Nghiệp vụ',() => {
            const profile={weeks:[{week:18,lessons:[{ppctPeriod:'52',topic:'Kiểm tra cuối học kỳ I'},{ppctPeriod:'53',topic:'Trả bài kiểm tra cuối học kỳ I'}]},{week:19,lessons:[{ppctPeriod:'54',topic:'Bài mới'}]}]};
            const suggestion=detectSemesterOneEndSuggestion(profile);
            const map=new Map([[52,{sourceWeek:18}],[53,{sourceWeek:18}],[54,{sourceWeek:19}],[105,{sourceWeek:37}]]);
            const target=getCurriculumSemesterTargets(map,profile);
            const ok=suggestion.ppct===53 && target.semesterOneTargetPpct===0 && !target.semesterOneBoundaryConfirmed && target.semesterOneSuggestedPpct===53 && target.totalPpct===105;
            return ok ? 'Gợi ý Tiết 53 từ tiết Trả bài nhưng chưa tự dùng để dự báo khi giáo viên chưa xác nhận.' : {status:'fail',message:'Gợi ý mốc HKI đang bị tự áp dụng hoặc nhận dạng sai.'};
        }));
        tests.push(runSync('semester-remaining-status','Trạng thái hiển thị số tiết còn lại theo học kỳ','Nghiệp vụ',() => {
            const hk1=buildSemesterRemainingStatus({referenceWeek:10,actualPpct:28,totalPpct:140,semesterOneTargetPpct:54,semesterOneBoundaryConfirmed:true});
            const hk2=buildSemesterRemainingStatus({referenceWeek:25,actualPpct:80,totalPpct:140,semesterOneTargetPpct:54,semesterOneBoundaryConfirmed:true});
            const missing=buildSemesterRemainingStatus({referenceWeek:10,actualPpct:28,totalPpct:140,semesterOneTargetPpct:0,semesterOneBoundaryConfirmed:false});
            const ok=hk1.remainingPeriods===26 && hk1.label==='Còn 26 tiết HKI' && hk2.remainingPeriods===60 && hk2.label==='Còn 60 tiết đến hết năm' && missing.remainingPeriods===null && missing.label==='Chưa xác nhận mốc HKI';
            return ok ? 'HKI = mốc HKI − đã học; HKII = tiết cuối năm − đã học; không dùng “Chậm x tiết” làm Trạng thái.' : {status:'fail',message:'Trạng thái số tiết còn lại theo học kỳ không đúng fixture.'};
        }));
        tests.push(runSync('semester-forecast-shortfall','Dự báo thiếu tiết cuối học kỳ','Nghiệp vụ',() => {
            const safe=buildSemesterForecastMetrics({referenceWeek:10,actualPpct:28,targetPpct:52,semesterStartPpct:0,weeklyRate:3});
            const risk=buildSemesterForecastMetrics({referenceWeek:10,actualPpct:28,targetPpct:54,semesterStartPpct:0,weeklyRate:3});
            const ok=safe.forecastState==='safe' && safe.forecastWeek===18 && risk.forecastState==='risk' && risk.forecastShortfall===2;
            return ok ? 'Dự báo phân biệt đúng hoàn thành HKI và nguy cơ thiếu 2 tiết ở Tuần 18.' : {status:'fail',message:'Công thức dự báo cuối học kỳ không đạt fixture.'};
        }));
        tests.push(runSync('semester2-load-change','HKII có tải tiết khác HKI','Nghiệp vụ',() => {
            const risk=buildSemesterForecastMetrics({referenceWeek:25,actualPpct:65,targetPpct:89,semesterStartPpct:54,weeklyRate:1.5});
            const ok=risk.semester.shortLabel==='HKII' && risk.forecastState==='risk' && risk.forecastShortfall===6 && risk.forecastLabel.includes('tuần 37');
            return ok ? 'HKII được dự báo độc lập theo nhịp HKII và cảnh báo thiếu 6 tiết ở Tuần 37.' : {status:'fail',message:'Dự báo HKII vẫn có dấu hiệu dùng nhịp/tổng của HKI.'};
        }));
        tests.push(runSync('ppct-suggestion-engine','PPCT dùng chung engine gợi ý','Nghiệp vụ',() => {
            const sample=classifyProgressRows([
                {className:'12A1',subject:'Toán',status:'behind',difference:-2,forecastState:'safe'},
                {className:'12A2',subject:'Toán',status:'ontrack',difference:0,forecastState:'safe'},
                {className:'12A3',subject:'Toán',status:'ahead',difference:1,forecastState:'risk'},
                {className:'12A4',subject:'Toán',status:'missing',difference:null,forecastState:'unknown'},
            ]);
            const ok=sample.courseRows.length===4 && sample.onTrackRows.length===2 && sample.attentionRows.length===3 && sample.attentionRows[0].className==='12A1';
            return ok ? 'Dashboard/Sổ Công Việc/Reminder dùng chung quy tắc PPCT cần chú ý.' : {status:'fail',message:'Phân loại PPCT dùng chung không đúng.'};
        }));
        tests.push(runSync('reminder-suggestion-dedupe','Nhắc việc không lặp Hệ thống gợi ý','Nghiệp vụ',() => {
            if (typeof getSmartReminderManagedSuggestionKeys !== 'function' || typeof buildWorkSystemSuggestions !== 'function') return {status:'fail',message:'Thiếu API engine gợi ý/khử trùng lặp.'};
            const original=buildWorkSystemSuggestions;
            try {
                window.buildWorkSystemSuggestions=() => [
                    {key:'fixture:urgent',priority:'urgent'},
                    {key:'fixture:high',priority:'high'},
                    {key:'fixture:normal',priority:'normal'},
                ];
                const keys=getSmartReminderManagedSuggestionKeys();
                const ok=keys instanceof Set && keys.has('fixture:urgent') && keys.has('fixture:high') && !keys.has('fixture:normal');
                return ok ? 'Gợi ý ưu tiên cao/khẩn cấp do Reminder quản lý; gợi ý bình thường chỉ để lại ở Hệ thống gợi ý.' : {status:'fail',message:'Quy tắc khử trùng lặp Reminder/Gợi ý bị thay đổi.'};
            } finally { window.buildWorkSystemSuggestions=original; }
        }));
        tests.push(runSync('state-shape','Cấu trúc state hiện tại','Dữ liệu',() => {
            const issues=[];
            if(!state || typeof state!=='object') issues.push('state');
            if(!Array.isArray(state?.planData)) issues.push('planData');
            if(!state?.timetablesByWeek || typeof state.timetablesByWeek!=='object') issues.push('timetablesByWeek');
            if(!Array.isArray(state?.curriculumProfiles)) issues.push('curriculumProfiles');
            if(!state?.teachingSchedule || typeof state.teachingSchedule!=='object') issues.push('teachingSchedule');
            if(!state?.yearWorkspaces || typeof state.yearWorkspaces!=='object') issues.push('yearWorkspaces');
            return issues.length ? {status:'fail',message:`Sai cấu trúc: ${issues.join(', ')}`} : 'Các nhánh dữ liệu chính đúng kiểu.';
        }));
        tests.push(runSync('active-year','Năm học đang chọn','Dữ liệu',() => normalizeAcademicYear(state?.selectedAcademicYear) ? `Năm học ${state.selectedAcademicYear}.` : {status:'warn',message:'Chưa xác định năm học đang chọn.'}));
        tests.push(runSync('external-links','Liên kết ngoài an toàn','Tích hợp',() => {
            const links=Array.isArray(window.teacherNotebookExternalLinks?.builtins) ? window.teacherNotebookExternalLinks.builtins : [];
            const bad=links.filter(link=>!/^https?:\/\//i.test(clean(link.url)));
            return bad.length ? {status:'fail',message:`Có ${bad.length} liên kết không dùng http/https.`} : `${links.length} liên kết mặc định dùng http/https.`;
        }));
        tests.push(runSync('feature-exports','Các module mới có API mở','Tích hợp',() => {
            const names=['openProfilePackageCenter','openSmartReminderCenter','exportWorkCalendarIcs','runTeacherNotebookHealthCheck'];
            const missing=names.filter(name=>typeof window[name] !== 'function');
            return missing.length ? {status:'fail',message:`Thiếu: ${missing.join(', ')}`} : `Đủ ${names.length} API tích hợp.`;
        }));
        tests.push(runSync('role-ui','Giao diện đúng vai trò hiện tại','Phân quyền',() => {
            const role=document.body.dataset.accountRole || 'personal';
            const adminBtn=$('teamAdminBtn');
            if(role==='teacher' && adminBtn && !adminBtn.hidden) return {status:'fail',message:'Giáo viên thường đang nhìn thấy nút Quản trị nhóm.'};
            if(role==='personal' && adminBtn && !adminBtn.hidden) return {status:'fail',message:'Chế độ cá nhân đang nhìn thấy nút Quản trị nhóm.'};
            return `Vai trò giao diện: ${role}.`;
        }));
        return tests;
    }

    async function testLocalStorage() {
        const key=`__teacher_regression_${Date.now()}`;
        try {
            const value=Math.random().toString(36);
            localStorage.setItem(key,value);
            const read=localStorage.getItem(key);
            localStorage.removeItem(key);
            if(read!==value) throw new Error('Giá trị đọc lại không khớp.');
            return 'Đọc/ghi/xóa key kiểm thử thành công.';
        } finally { try { localStorage.removeItem(key); } catch (_) {} }
    }

    async function testIsolatedIndexedDB() {
        if(!('indexedDB' in window)) return {status:'warn',message:'Trình duyệt không cung cấp IndexedDB; ứng dụng sẽ dùng fallback.'};
        const name=`teacher-notebook-regression-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let db;
        try {
            db=await new Promise((resolve,reject)=>{
                const req=indexedDB.open(name,1);
                req.onupgradeneeded=()=>req.result.createObjectStore('kv');
                req.onsuccess=()=>resolve(req.result);
                req.onerror=()=>reject(req.error || new Error('Không mở được DB test'));
            });
            await new Promise((resolve,reject)=>{
                const tx=db.transaction('kv','readwrite');
                tx.objectStore('kv').put('ok','probe');
                tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error||new Error('Không ghi được DB test'));
            });
            const value=await new Promise((resolve,reject)=>{
                const tx=db.transaction('kv','readonly');
                const req=tx.objectStore('kv').get('probe');
                req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error||new Error('Không đọc được DB test'));
            });
            if(value!=='ok') throw new Error('Dữ liệu IndexedDB test đọc lại không khớp.');
            return 'DB tạm thời đọc/ghi thành công và tách biệt dữ liệu thật.';
        } finally {
            try { db?.close(); } catch (_) {}
            try { indexedDB.deleteDatabase(name); } catch (_) {}
        }
    }

    function syntheticBackupPayload() {
        return {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exportedAt: nowIso(),
            data: {
                selectedAcademicYear:'2026-2027', yearWorkspaces:{}, planData:[], timetablesByWeek:{},
                selectedTimetableWeek:1, curriculumText:'', curriculumProfiles:[], teachingSchedule:{}, scheduleMeta:{},
                teacherProfile:{schoolName:'TEST',teacherName:'TEST',subject:'Toán',academicYear:'2026-2027'},
                selectedTeachingWeek:null, recognitionMode:'auto'
            }
        };
    }

    async function testInternalAssets() {
        const urls=new Set();
        document.querySelectorAll('script[src],link[href]').forEach(node=>{
            const attr=node.getAttribute('src') || node.getAttribute('href');
            if(!attr || /^(https?:)?\/\//i.test(attr) || attr.startsWith('data:')) return;
            try { const url=new URL(attr,location.href); if(url.origin===location.origin) urls.add(url.href); } catch (_) {}
        });
        ['manifest.webmanifest','service-worker.js'].forEach(item=>urls.add(new URL(item,location.href).href));
        const list=[...urls];
        const failures=[];
        for(let i=0;i<list.length;i+=8){
            const chunk=list.slice(i,i+8);
            const responses=await Promise.all(chunk.map(async url=>{
                try {
                    const u=new URL(url); u.searchParams.set('__regression',String(Date.now()));
                    const res=await fetch(u.href,{cache:'no-store'});
                    return {url,ok:res.ok,status:res.status};
                } catch(error){ return {url,ok:false,status:0,error:error?.message}; }
            }));
            failures.push(...responses.filter(item=>!item.ok));
        }
        if(failures.length) return {status:'fail',message:`Thiếu/lỗi ${failures.length}/${list.length} tài nguyên nội bộ: ${failures.slice(0,4).map(item=>new URL(item.url).pathname.split('/').pop()).join(', ')}`} ;
        return `${list.length}/${list.length} tài nguyên nội bộ trả HTTP thành công.`;
    }

    async function fullTests() {
        const out=[];
        out.push(await runAsync('localstorage-roundtrip','LocalStorage tạm thời','Lưu trữ',testLocalStorage));
        out.push(await runAsync('indexeddb-isolated','IndexedDB tạm thời','Lưu trữ',testIsolatedIndexedDB));
        out.push(await runAsync('indexeddb-engine','Storage Pro hiện tại','Lưu trữ',async()=>{
            const engine=window.teacherNotebookIndexedDB;
            if(!engine) return {status:'warn',message:'Không tìm thấy Storage Pro; LocalStorage vẫn có thể hoạt động.'};
            if(!engine.ready) return {status:'warn',message:`Storage Pro chưa ready${engine.error?`: ${engine.error}`:''}.`};
            const stats=await engine.stats();
            return `IndexedDB sẵn sàng · ${Number(stats?.workspaceCount||0)} workspace · ${Number(stats?.recognitionCount||0)} cache.`;
        }));
        out.push(runSync('backup-fixture','Backup/Restore fixture','An toàn dữ liệu',()=>{
            const normalized=normalizeBackupPayload(syntheticBackupPayload());
            return normalized?.data?.selectedAcademicYear==='2026-2027' && normalized?.data?.teacherProfile?.academicYear==='2026-2027' ? 'Backup fixture chuẩn hóa được mà không áp vào state thật.' : {status:'fail',message:'normalizeBackupPayload không đạt fixture.'};
        }));
        out.push(runSync('backup-security','Backup không chứa API key','An toàn dữ liệu',()=>{
            const text=JSON.stringify(syntheticBackupPayload());
            return !/api[_-]?key|AIza[0-9A-Za-z_-]{20,}/i.test(text) ? 'Fixture backup không chứa khóa API.' : {status:'fail',message:'Phát hiện dấu hiệu API key trong fixture.'};
        }));
        out.push(await runAsync('internal-assets','Tài nguyên triển khai trên server','PWA',testInternalAssets));
        out.push(runSync('service-worker','Service Worker/PWA','PWA',()=>{
            if(!('serviceWorker' in navigator)) return {status:'warn',message:'Trình duyệt không hỗ trợ Service Worker.'};
            if(!window.isSecureContext && location.hostname!=='localhost') return {status:'warn',message:'PWA cần HTTPS/localhost để hoạt động đầy đủ.'};
            return navigator.serviceWorker.controller ? 'Service Worker đang điều khiển trang.' : {status:'warn',message:'Service Worker chưa điều khiển trang này; có thể cần tải lại sau lần cài đầu.'};
        }));
        out.push(runSync('notification-api','Notification API','Nhắc việc',()=> 'Notification' in window ? `Notification API có sẵn · quyền: ${Notification.permission}.` : {status:'warn',message:'Trình duyệt không hỗ trợ Notification API.'}));
        out.push(runSync('report-module','Report Center có thể dựng snapshot','Báo cáo',()=> typeof buildReportSnapshot==='function' ? 'buildReportSnapshot sẵn sàng.' : {status:'fail',message:'Thiếu buildReportSnapshot.'}));
        out.push(runSync('profile-package-module','Hồ sơ tự động đã nạp','Báo cáo',()=> typeof window.openProfilePackageCenter==='function' ? 'Hồ sơ tự động đã nạp.' : {status:'fail',message:'Thiếu Profile Package API.'}));
        out.push(runSync('reminder-module','Nhắc việc & lịch đã nạp','Nhắc việc',()=> typeof window.renderSmartReminderCenter==='function' && typeof window.renderWorkCalendar==='function' ? 'Reminder Center và Work Calendar sẵn sàng.' : {status:'fail',message:'Thiếu API nhắc việc/lịch.'}));
        out.push(runSync('health-module','Health Check đã nạp','Chẩn đoán',()=> typeof window.runTeacherNotebookHealthCheck==='function' ? 'Health Check API sẵn sàng.' : {status:'fail',message:'Thiếu Health Check API.'}));
        return out;
    }

    function summarize(results, previous) {
        const summary={pass:0,warn:0,fail:0,skip:0,newFail:0,total:results.length};
        results.forEach(item=>{
            summary[item.status]=(summary[item.status]||0)+1;
            if(item.status==='fail' && previous.get(item.id) && previous.get(item.id)!=='fail') summary.newFail++;
        });
        return summary;
    }

    function render(report) {
        const s=report.summary;
        $('regressionPassCount').textContent=s.pass;
        $('regressionWarnCount').textContent=s.warn;
        $('regressionFailCount').textContent=s.fail;
        $('regressionNewFailCount').textContent=s.newFail;
        const badge=$('regressionOverallStatus');
        badge.className='regression-overall-badge '+(s.fail?'fail':s.warn?'warn':'pass');
        badge.textContent=s.fail ? `Có ${s.fail} lỗi` : s.warn ? `Đạt · ${s.warn} cảnh báo` : 'Tất cả đạt';
        $('regressionRunMeta').textContent=`${report.mode==='full'?'Kiểm thử đầy đủ':'Kiểm thử nhanh'} · ${new Date(report.ranAt).toLocaleString('vi-VN')} · ${s.total} phép kiểm tra · v${report.version}`;
        const summaryBox=$('regressionResults');
        summaryBox.innerHTML=s.fail
            ? `<div class="regression-alert fail"><strong>❌ Phát hiện ${s.fail} lỗi${s.newFail?`, trong đó ${s.newFail} hồi quy mới`:''}.</strong> Mở danh sách bên dưới trước khi tiếp tục nâng cấp.</div>`
            : s.warn
                ? `<div class="regression-alert warn"><strong>⚠️ Không có lỗi bắt buộc.</strong> Có ${s.warn} cảnh báo phụ thuộc trình duyệt/môi trường cần xem lại.</div>`
                : `<div class="regression-alert pass"><strong>✅ Bộ kiểm thử đạt.</strong> Không phát hiện hồi quy trong phạm vi kiểm tra tự động.</div>`;
        $('regressionResultList').innerHTML=report.results.map(item=>{
            const icon=item.status==='pass'?'✅':item.status==='warn'?'⚠️':item.status==='fail'?'❌':'ℹ️';
            const label=item.status==='pass'?'ĐẠT':item.status==='warn'?'CẢNH BÁO':item.status==='fail'?'LỖI':'BỎ QUA';
            const isNew=item.status==='fail' && report.newFailIds.includes(item.id);
            return `<div class="regression-result ${item.status}${isNew?' regression-new-fail':''}"><span class="regression-result-icon">${icon}</span><span class="regression-result-main"><strong>${esc(item.title)}</strong><span>${esc(item.group)} · ${esc(item.message)}</span></span><span class="regression-result-badge">${isNew?'HỒI QUY MỚI':label}</span></div>`;
        }).join('');
        if(s.fail) $('regressionDetails').open=true;
    }

    async function runRegressionTests(options={}) {
        if(running) return lastReport;
        running=true;
        const full=Boolean(options.full);
        const quickBtn=$('runRegressionQuickBtn'), fullBtn=$('runRegressionFullBtn');
        const badge=$('regressionOverallStatus');
        if(quickBtn) quickBtn.disabled=true;
        if(fullBtn) fullBtn.disabled=true;
        if(badge){badge.className='regression-overall-badge running';badge.textContent='Đang chạy…';}
        $('regressionRunMeta').textContent=full?'Đang chạy kiểm thử đầy đủ; sẽ kiểm tra cả tài nguyên trên server và kho lưu tạm…':'Đang chạy kiểm thử nhanh…';
        const previous=previousMap();
        try {
            const results=coreQuickTests();
            if(full) results.push(...await fullTests());
            const summary=summarize(results,previous);
            const newFailIds=results.filter(item=>item.status==='fail' && previous.get(item.id) && previous.get(item.id)!=='fail').map(item=>item.id);
            lastReport={version:typeof APP_VERSION==='string'?APP_VERSION:'unknown',schema:typeof DATA_SCHEMA_VERSION!=='undefined'?DATA_SCHEMA_VERSION:null,mode:full?'full':'quick',ranAt:nowIso(),summary,results,newFailIds};
            saveReport(lastReport);
            render(lastReport);
            window.dispatchEvent(new CustomEvent('teacher-notebook:regression-complete',{detail:{summary,mode:lastReport.mode}}));
            if(summary.fail && options.auto) window.teacherNotebookRecordError?.('regression-auto',new Error(`${summary.fail} regression test(s) failed`),{newFail:summary.newFail});
            return lastReport;
        } finally {
            running=false;
            if(quickBtn) quickBtn.disabled=false;
            if(fullBtn) fullBtn.disabled=false;
        }
    }

    function regressionReportText(report=lastReport) {
        if(!report) return 'Chưa có báo cáo kiểm thử hồi quy.';
        const s=report.summary;
        const lines=[
            'SỔ TAY GIÁO VIÊN — BÁO CÁO KIỂM THỬ HỒI QUY',
            `Phiên bản: ${report.version}`,
            `Schema: ${report.schema ?? '—'}`,
            `Chế độ: ${report.mode==='full'?'Đầy đủ':'Nhanh'}`,
            `Thời điểm: ${new Date(report.ranAt).toLocaleString('vi-VN')}`,
            `Tổng: ${s.total} · Đạt ${s.pass} · Cảnh báo ${s.warn} · Lỗi ${s.fail} · Hồi quy mới ${s.newFail}`,
            '',
            ...report.results.map(item=>`${item.status==='pass'?'✅':item.status==='warn'?'⚠️':item.status==='fail'?'❌':'ℹ️'} [${item.group}] ${item.title}: ${item.message}`)
        ];
        return lines.join('\n');
    }
    async function copyRegressionReport(){
        const text=regressionReportText();
        try{await navigator.clipboard.writeText(text); if(typeof showToast==='function') showToast('✅ Đã sao chép báo cáo kiểm thử','success');}
        catch(_){prompt('Sao chép báo cáo kiểm thử:',text);}
    }
    function downloadRegressionReport(){
        if(!lastReport) return runRegressionTests({full:false}).then(downloadRegressionReport);
        const payload={...lastReport,results:lastReport.results.map(({id,title,status,message,group})=>({id,title,status,message,group}))};
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
        downloadBlobFile(blob, `so-tay-gv-regression-v${lastReport.version}-${new Date().toISOString().slice(0,10)}.json`);
    }

    function restoreLastReportPreview(){
        try{
            const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
            if(!saved?.results) return;
            const previous=new Map();
            const summary=saved.summary || summarize(saved.results,previous);
            lastReport={...saved,summary,newFailIds:[]};
            render(lastReport);
            $('regressionRunMeta').textContent=`Lần gần nhất: ${new Date(saved.ranAt).toLocaleString('vi-VN')} · ${saved.mode==='full'?'đầy đủ':'nhanh'} · v${saved.version}`;
        }catch(_){/* optional */}
    }

    function initRegressionTestCenter(){
        if(initialized) return;
        initialized=true;
        restoreLastReportPreview();
        $('runRegressionQuickBtn')?.addEventListener('click',()=>runRegressionTests({full:false}));
        $('runRegressionFullBtn')?.addEventListener('click',()=>runRegressionTests({full:true}));
        $('copyRegressionReportBtn')?.addEventListener('click',copyRegressionReport);
        $('downloadRegressionReportBtn')?.addEventListener('click',downloadRegressionReport);
        const autoRun=()=>setTimeout(()=>runRegressionTests({full:false,auto:true}),650);
        if(window.__teacherNotebookInitCompleted) autoRun();
        else window.addEventListener('teacher-notebook:init-complete',autoRun,{once:true});
    }

    window.initRegressionTestCenter=initRegressionTestCenter;
    window.runTeacherNotebookRegressionTests=runRegressionTests;
    window.getTeacherNotebookRegressionReport=()=>lastReport;
})();
