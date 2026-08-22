/* ============================================================================
   SỔ TAY GIÁO VIÊN v46 — TÌM KIẾM TOÀN CỤC & THANH LỆNH NHANH
   Ctrl+K · tuần/lớp/môn/PPCT/công việc/liên kết · lệnh gần đây · lệnh ghim
   ============================================================================ */
(() => {
    const RECENT_KEY = 'teacher_global_command_recent_v1';
    const FAVORITE_KEY = 'teacher_global_command_favorites_v1';
    const MAX_RECENT = 8;
    const MAX_FAVORITES = 10;
    const MAX_RESULTS = 14;
    let initialized = false;
    let activeIndex = 0;
    let visibleCommands = [];
    let previousFocus = null;

    const byId = id => document.getElementById(id);
    const safeArray = value => Array.isArray(value) ? value : [];
    const clean = value => typeof cleanText === 'function' ? cleanText(value) : String(value ?? '').trim();
    const fold = value => String(value ?? '').toLocaleLowerCase('vi')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, ' ').trim();
    const esc = value => typeof escapeHTML === 'function' ? escapeHTML(String(value ?? ''))
        : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

    function readList(key, limit) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string').slice(0, limit) : [];
        } catch (_) { return []; }
    }
    function writeList(key, values, limit) {
        try { localStorage.setItem(key, JSON.stringify([...new Set(values)].slice(0, limit))); } catch (_) { /* noop */ }
    }
    const getRecent = () => readList(RECENT_KEY, MAX_RECENT);
    const getFavorites = () => readList(FAVORITE_KEY, MAX_FAVORITES);
    function pushRecent(id) { writeList(RECENT_KEY, [id, ...getRecent().filter(item => item !== id)], MAX_RECENT); }
    function toggleFavorite(id) {
        const current = getFavorites();
        const next = current.includes(id) ? current.filter(item => item !== id) : [id, ...current];
        writeList(FAVORITE_KEY, next, MAX_FAVORITES);
        renderPalette();
    }

    function currentRole() {
        const mode = state?.account?.accessMode === 'group' ? 'group' : 'personal';
        const role = mode === 'group' && state?.account?.profile?.role === 'admin' ? 'admin'
            : mode === 'group' ? 'teacher' : 'personal';
        return { mode, role, active: mode === 'group' && state?.account?.profile?.status === 'active' };
    }
    function roleAllows(command) {
        const ctx = currentRole();
        if (command.adminOnly) return ctx.role === 'admin' && ctx.active;
        if (command.groupOnly && ctx.mode !== 'group') return false;
        if (command.activeGroupOnly && !ctx.active) return false;
        if (command.personalOnly) return ctx.mode === 'personal';
        if (command.hideForTeacher && ctx.role === 'teacher') return false;
        return true;
    }

    function activateTab(tab) {
        if (typeof activateOverviewTab === 'function') activateOverviewTab(tab);
        else document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.click();
    }
    function scrollToId(id) {
        byId(id)?.scrollIntoView?.({ behavior:'smooth', block:'start' });
    }
    function openSettings() {
        const hub = byId('settingsHub');
        if (hub) hub.open = true;
        scrollToId('settingsHub');
    }
    function openWeekTarget(target, week) {
        const normalized = Number.parseInt(week, 10);
        if (!(normalized > 0 && normalized <= (typeof MAX_SCHOOL_WEEKS === 'number' ? MAX_SCHOOL_WEEKS : 37))) return;
        if (typeof openAutomationTarget === 'function') {
            openAutomationTarget(target, normalized);
            return;
        }
        activateTab(target === 'plan' ? 'plan' : target === 'timetable' ? 'timetable' : 'teaching');
    }
    function openProgressForWeek(week) {
        activateTab('teaching');
        setTimeout(() => {
            const select = byId('progressWeekSelect');
            if (select?.querySelector(`option[value="${week}"]`)) select.value = String(week);
            if (typeof renderProgressDashboard === 'function') renderProgressDashboard();
            scrollToId('progressDashboardCard');
        }, 20);
    }
    function openReportWeek(week) {
        activateTab('reports');
        setTimeout(() => {
            const scope = byId('reportScopeSelect');
            if (scope) scope.value = 'custom';
            scope?.dispatchEvent(new Event('change', { bubbles:true }));
            const start = byId('reportStartWeek');
            const end = byId('reportEndWeek');
            if (start?.querySelector(`option[value="${week}"]`)) start.value = String(week);
            if (end?.querySelector(`option[value="${week}"]`)) end.value = String(week);
            start?.dispatchEvent(new Event('change', { bubbles:true }));
            end?.dispatchEvent(new Event('change', { bubbles:true }));
            if (typeof renderReportCenter === 'function') renderReportCenter();
            scrollToId('reportCenterCard');
        }, 30);
    }
    function openAutomationWeek(week) {
        const select = byId('automationWeekSelect');
        if (select?.querySelector(`option[value="${week}"]`)) {
            select.value = String(week);
            select.dispatchEvent(new Event('change', { bubbles:true }));
        }
        scrollToId('automationCenter');
    }
    function openCourseProgress(course) {
        activateTab('teaching');
        setTimeout(() => {
            if (typeof initializeProgressDashboardControls === 'function') initializeProgressDashboardControls();
            if (typeof renderProgressDashboard === 'function') renderProgressDashboard();
            const grade = byId('progressGradeSelect');
            const clazz = byId('progressClassSelect');
            const subject = byId('progressSubjectSelect');
            if (grade && course.grade && grade.querySelector(`option[value="${course.grade}"]`)) {
                grade.value = course.grade;
                if (typeof renderProgressDashboard === 'function') renderProgressDashboard();
            }
            if (clazz && clazz.querySelector(`option[value="${course.classKey}"]`)) {
                clazz.value = course.classKey;
                if (typeof renderProgressDashboard === 'function') renderProgressDashboard();
            }
            if (subject && subject.querySelector(`option[value="${course.subjectKey}"]`)) {
                subject.value = course.subjectKey;
                if (typeof renderProgressDashboard === 'function') renderProgressDashboard();
            }
            scrollToId('progressDashboardCard');
        }, 40);
    }
    function openWorkItem(item) {
        activateTab('workspace');
        setTimeout(() => {
            const input = byId('workSearchInput');
            if (input) input.value = item.title || item.className || '';
            if (typeof renderWorkWorkspace === 'function') renderWorkWorkspace();
            scrollToId('workWorkspaceCard');
        }, 25);
    }
    function safeOpenExternal(url) {
        try {
            const parsed = new URL(url);
            if (!['http:','https:'].includes(parsed.protocol)) return;
            const win = window.open(parsed.href, '_blank', 'noopener,noreferrer');
            if (win) win.opener = null;
        } catch (_) { /* invalid url */ }
    }

    function staticCommands() {
        return [
            {id:'nav:plan',icon:'📋',title:'Kế hoạch trường',subtitle:'Mở danh sách kế hoạch tuần của nhà trường',tag:'Điều hướng',keywords:'ke hoach lich cong tac tuan',action:()=>activateTab('plan')},
            {id:'nav:timetable',icon:'🗓️',title:'Thời khóa biểu',subtitle:'Mở thời khóa biểu cá nhân theo tuần',tag:'Điều hướng',keywords:'tkb thoi khoa bieu lich day',action:()=>activateTab('timetable')},
            {id:'nav:teaching',icon:'📖',title:'Lịch báo giảng & PPCT',subtitle:'Mở lịch báo giảng và bảng tiến độ chương trình',tag:'Điều hướng',keywords:'bao giang ppct tien do phan phoi chuong trinh',action:()=>activateTab('teaching')},
            {id:'nav:reports',icon:'📑',title:'Báo cáo & Hồ sơ',subtitle:'Tổng hợp và xuất hồ sơ theo tuần/tháng/học kỳ',tag:'Điều hướng',keywords:'bao cao ho so excel word pdf',action:()=>activateTab('reports')},
            {id:'action:profile-package',icon:'📦',title:'Tạo gói hồ sơ giáo viên',subtitle:'Word · Excel · In/PDF · ZIP theo phạm vi báo cáo đang chọn',tag:'Hồ sơ',keywords:'tao goi ho so giao vien tu dong zip word excel pdf thang hoc ky',action:()=>{if(typeof window.openProfilePackageCenter==='function')window.openProfilePackageCenter();else activateTab('reports')}},
            {id:'nav:workspace',icon:'✅',title:'Sổ Công Việc Pro',subtitle:'Nhiệm vụ, ghi chú, Kanban và công việc lặp lại',tag:'Điều hướng',keywords:'cong viec task nhiem vu ghi chu kanban',action:()=>activateTab('workspace')},
            {id:'action:smart-reminders',icon:'🔔',title:'Nhắc việc thông minh',subtitle:'Việc đến hạn, quá hạn, cảnh báo hệ thống và nhắc lại',tag:'Công việc',keywords:'nhac viec thong minh reminder qua han sap den han hom nay',action:()=>{activateTab('workspace');setTimeout(()=>window.openSmartReminderCenter?.(),40)}},
            {id:'action:work-calendar',icon:'📅',title:'Lịch công việc',subtitle:'Xem nhiệm vụ và lịch dạy trên lịch tháng',tag:'Công việc',keywords:'lich cong viec calendar lich thang lich day',action:()=>{activateTab('workspace');setTimeout(()=>document.getElementById('workCalendarViewBtn')?.click(),40)}},
            {id:'action:export-ics',icon:'📤',title:'Xuất công việc .ics',subtitle:'Đưa các nhiệm vụ có hạn sang Google Calendar hoặc Outlook',tag:'Công việc',keywords:'ics google calendar outlook xuat lich cong viec',action:()=>{activateTab('workspace');setTimeout(()=>document.getElementById('workExportIcsBtn')?.click(),40)}},
            {id:'nav:links',icon:'🔗',title:'Trung tâm Liên kết',subtitle:'TEMIS, vnEdu, CSDL ngành, TKB trường, VN ERP và liên kết cá nhân',tag:'Điều hướng',keywords:'lien ket website temis vnedu csdl nganh giao duc moet vnerp',action:()=>activateTab('links')},
            {id:'section:year-dashboard',icon:'📊',title:'Dashboard năm học',subtitle:'Xem trạng thái 37 tuần và các tuần cần xử lý',tag:'Dashboard',keywords:'dashboard nam hoc 37 tuan tong quan',action:()=>scrollToId('yearDashboard')},
            {id:'section:assistant',icon:'🎯',title:'Trợ lý tuần',subtitle:'Xem lịch dạy hôm nay và ưu tiên tuần hiện tại',tag:'Dashboard',keywords:'tro ly tuan viec can lam lich day hom nay',action:()=>scrollToId('teacherCommandCenter')},
            {id:'section:automation',icon:'⚙️',title:'Tự động hóa công việc',subtitle:'Đối chiếu kế hoạch, báo giảng, Không học và học bù',tag:'Tự động hóa',keywords:'automation tu dong hoa hoc bu khong hoc dong bo',action:()=>scrollToId('automationCenter')},
            {id:'action:add-work',icon:'＋',title:'Thêm công việc mới',subtitle:'Mở nhanh biểu mẫu tạo nhiệm vụ/ghi chú/bài soạn',tag:'Lệnh nhanh',keywords:'them cong viec nhiem vu task ghi chu',action:()=>{activateTab('workspace');setTimeout(()=>byId('addWorkItemBtn')?.click(),30)}},
            {id:'action:weekly-template',icon:'✨',title:'Chuẩn bị tuần mới',subtitle:'Tạo checklist công việc tuần tiếp theo và chống trùng',tag:'Lệnh nhanh',keywords:'chuan bi tuan moi checklist',action:()=>{activateTab('workspace');setTimeout(()=>byId('workWeeklyTemplateBtn')?.click(),30)}},
            {id:'action:backup',icon:'💾',title:'Sao lưu dữ liệu',subtitle:'Xuất file JSON sao lưu toàn bộ năm học hiện tại',tag:'An toàn',keywords:'sao luu backup du lieu json',action:()=>byId('exportBackupBtn')?.click()},
            {id:'action:health',icon:'🩺',title:'Kiểm tra hệ thống',subtitle:'Chạy Health Check và kiểm tra file triển khai',tag:'An toàn',keywords:'kiem tra he thong health chan doan loi',action:()=>{openSettings();setTimeout(()=>byId('runHealthCheckBtn')?.click(),80)}},
            {id:'action:regression',icon:'🧪',title:'Kiểm thử hồi quy',subtitle:'Chạy bộ kiểm thử tự động để phát hiện chức năng bị hỏng sau nâng cấp',tag:'An toàn',keywords:'kiem thu hoi quy regression test tu dong smoke test',action:()=>{openSettings();setTimeout(()=>byId('runRegressionQuickBtn')?.click(),80)}},
            {id:'action:settings',icon:'⚙️',title:'Cài đặt & an toàn',subtitle:'PWA, Gemini, OCR, sao lưu và chẩn đoán',tag:'Cài đặt',keywords:'cai dat pwa gemini ocr an toan',action:openSettings},
            {id:'action:profile',icon:'👤',title:'Hồ sơ giáo viên',subtitle:'Cập nhật trường, giáo viên, môn dạy và năm học',tag:'Tài khoản',groupOnly:true,activeGroupOnly:true,keywords:'ho so giao vien profile',action:()=>byId('accountProfileBtn')?.click()},
            {id:'action:team-admin',icon:'🛡️',title:'Quản trị nhóm giáo viên',subtitle:'Thành viên, quyền, kiểm tra kết nối và Firestore',tag:'Admin',adminOnly:true,keywords:'quan tri nhom admin thanh vien firestore kiem tra nhom',action:()=>byId('teamAdminBtn')?.click()},
            {id:'action:join-group',icon:'👥',title:'Dùng cùng nhóm giáo viên',subtitle:'Chuyển từ chế độ cá nhân sang nhóm giáo viên',tag:'Tài khoản',personalOnly:true,keywords:'dung cung nhom giao vien dang nhap',action:()=>byId('accountPrimaryBtn')?.click()},
        ];
    }

    function externalLinkCommands() {
        const builtins = safeArray(window.teacherNotebookExternalLinks?.builtins);
        let customs = [];
        try {
            const parsed = JSON.parse(localStorage.getItem('teacher_external_links_v1') || '[]');
            if (Array.isArray(parsed)) customs = parsed;
        } catch (_) { /* noop */ }
        return [...builtins, ...customs].map(link => {
            const url = clean(link.url);
            const name = clean(link.shortName || link.name || 'Liên kết');
            if (!url || !/^https?:\/\//i.test(url)) return null;
            return {
                id:`link:${clean(link.id) || fold(name)}`,
                icon:clean(link.icon) || '🔗',
                title:name,
                subtitle:`${clean(link.category) || 'Liên kết'} · ${clean(link.description) || url}`,
                tag:'Website',
                keywords:`${name} ${clean(link.name)} ${clean(link.category)} ${url}`,
                action:()=>safeOpenExternal(url),
            };
        }).filter(Boolean);
    }

    function weekCommands() {
        const max = typeof MAX_SCHOOL_WEEKS === 'number' ? MAX_SCHOOL_WEEKS : 37;
        const commands = [];
        for (let week=1; week<=max; week++) {
            commands.push(
                {id:`week:${week}:plan`,icon:'📋',title:`Kế hoạch trường · Tuần ${week}`,subtitle:`Mở kế hoạch công tác Tuần ${week}`,tag:`Tuần ${week}`,keywords:`tuan ${week} ke hoach`,action:()=>openWeekTarget('plan',week)},
                {id:`week:${week}:timetable`,icon:'🗓️',title:`Thời khóa biểu · Tuần ${week}`,subtitle:`Mở TKB cá nhân Tuần ${week}`,tag:`Tuần ${week}`,keywords:`tuan ${week} tkb thoi khoa bieu`,action:()=>openWeekTarget('timetable',week)},
                {id:`week:${week}:teaching`,icon:'📖',title:`Lịch báo giảng · Tuần ${week}`,subtitle:`Mở lịch báo giảng Tuần ${week}`,tag:`Tuần ${week}`,keywords:`tuan ${week} lich bao giang`,action:()=>openWeekTarget('teaching',week)},
                {id:`week:${week}:progress`,icon:'📈',title:`Tiến độ PPCT · đến Tuần ${week}`,subtitle:`Đối chiếu tiến độ lớp–môn tính đến Tuần ${week}`,tag:'PPCT',keywords:`tuan ${week} ppct tien do`,action:()=>openProgressForWeek(week)},
                {id:`week:${week}:report`,icon:'📑',title:`Báo cáo riêng · Tuần ${week}`,subtitle:`Đặt phạm vi báo cáo từ Tuần ${week} đến Tuần ${week}`,tag:'Báo cáo',keywords:`tuan ${week} bao cao ho so`,action:()=>openReportWeek(week)},
                {id:`week:${week}:automation`,icon:'⚙️',title:`Tự động hóa · Tuần ${week}`,subtitle:`Quét luồng kế hoạch → TKB → báo giảng của Tuần ${week}`,tag:'Automation',keywords:`tuan ${week} tu dong hoa automation`,action:()=>openAutomationWeek(week)}
            );
        }
        return commands;
    }

    function courseCommands() {
        if (typeof buildProgressCourseCatalog !== 'function') return [];
        let catalog = [];
        try { catalog = buildProgressCourseCatalog(); } catch (_) { return []; }
        return safeArray(catalog).map(course => ({
            id:`course:${course.key}`,
            icon:'🏫',
            title:`${course.className} · ${course.subject}`,
            subtitle:'Mở tiến độ PPCT của lớp–môn này',
            tag:'Lớp–môn',
            keywords:`${course.className} ${course.subject} lop mon ppct tien do`,
            action:()=>openCourseProgress(course),
        }));
    }

    function workCommands() {
        let items = [];
        try {
            const personal = typeof normalizeWorkItems === 'function' ? normalizeWorkItems(state?.workItems || [], 'personal') : safeArray(state?.workItems);
            const shared = currentRole().active && typeof normalizeWorkItems === 'function' ? normalizeWorkItems(state?.sharedWorkItems || [], 'shared') : [];
            items = [...personal, ...shared];
        } catch (_) { items = []; }
        return items.slice(0, 250).map(item => ({
            id:`work:${item.scope || 'personal'}:${item.id}`,
            icon:item.type === 'task' ? (item.status === 'done' ? '✅' : '☐') : item.type === 'lesson' ? '📘' : '📝',
            title:item.title,
            subtitle:[item.status && typeof workStatusInfo === 'function' ? workStatusInfo(item.status).label : '', item.dueDate ? `Hạn ${typeof formatISODateForDisplay === 'function' ? formatISODateForDisplay(item.dueDate) : item.dueDate}` : '', item.className, item.subject].filter(Boolean).join(' · ') || 'Mục trong Sổ Công Việc',
            tag:item.type === 'task' ? 'Công việc' : item.type === 'lesson' ? 'Bài soạn' : 'Ghi chú',
            keywords:`${item.title} ${item.content} ${item.className} ${item.subject} ${item.dueDate} ${item.status} ${item.priority}`,
            action:()=>openWorkItem(item),
        }));
    }

    function ppctCommands() {
        const commands=[];
        const seen=new Set();
        const schedules=state?.teachingSchedule || {};
        Object.entries(schedules).forEach(([weekKey,items])=>{
            const week=Number.parseInt(weekKey,10);
            safeArray(items).forEach(item=>{
                const ppct=Number.parseInt(item?.ppctPeriod,10);
                if (!(ppct>0) || item?.notTeaching) return;
                const className=clean(item.class);
                const subject=clean(item.subject);
                const key=`${week}|${ppct}|${fold(className)}|${fold(subject)}|${fold(item.topic)}`;
                if (seen.has(key)) return;
                seen.add(key);
                commands.push({
                    id:`ppct:${week}:${clean(item.id)||key}`,
                    icon:'📚',
                    title:`PPCT ${ppct} · ${className || 'Chưa rõ lớp'}${subject ? ' · '+subject : ''}`,
                    subtitle:`Tuần ${week}${item.topic ? ' · '+clean(item.topic) : ''}`,
                    tag:'PPCT',
                    keywords:`ppct ${ppct} tiet ${ppct} tuan ${week} ${className} ${subject} ${clean(item.topic)}`,
                    action:()=>openWeekTarget('teaching',week),
                });
            });
        });
        return commands.slice(0,600);
    }

    function buildCatalog() {
        const catalog=[...staticCommands(),...externalLinkCommands(),...weekCommands(),...courseCommands(),...workCommands(),...ppctCommands()];
        const ids=new Set();
        return catalog.filter(command=>{
            if (!command?.id || ids.has(command.id) || !roleAllows(command)) return false;
            ids.add(command.id);
            command.searchText=fold(`${command.title} ${command.subtitle||''} ${command.tag||''} ${command.keywords||''}`);
            return true;
        }).map((command,index)=>{ command._catalogOrder=index; return command; });
    }

    function scoreCommand(command, query) {
        const q=fold(query);
        if (!q) return 0;
        const title=fold(command.title);
        const subtitle=fold(command.subtitle);
        const weekMatch=q.match(/\btuan\s+(\d{1,2})\b/);
        if (command.id.startsWith('week:') && !/\btuan\b/.test(q)) return 0;
        if (weekMatch && command.id.startsWith('week:') && !command.id.startsWith(`week:${Number(weekMatch[1])}:`)) return 0;
        let score=0;
        const phraseMatch=title.includes(q) || command.searchText.includes(q) || subtitle.includes(q);
        if (title === q) score += 120;
        if (title.startsWith(q)) score += 80;
        if (title.includes(q)) score += 55;
        if (command.searchText.includes(q)) score += 35;
        const tokens=q.split(' ').filter(Boolean);
        const words=new Set(command.searchText.split(' ').filter(Boolean));
        const matched=tokens.filter(token=>words.has(token)).length;
        if (!phraseMatch && tokens.length >= 2 && matched < Math.ceil(tokens.length * .6)) return 0;
        if (matched===tokens.length) score += 30 + matched*6;
        else score += matched*4;
        if (subtitle.includes(q)) score += 10;
        if (getFavorites().includes(command.id)) score += 10;
        const recentIndex=getRecent().indexOf(command.id);
        if (recentIndex>=0) score += Math.max(1,8-recentIndex);
        return score;
    }

    function sectionHtml(title, commands, catalog, favorites) {
        if (!commands.length) return '';
        return `<div class="global-command-section-title"><span>${esc(title)}</span><small>${commands.length} mục</small></div>`+
            commands.map(command=>commandHtml(command,catalog,favorites)).join('');
    }
    function commandHtml(command, catalog, favorites) {
        const index=visibleCommands.indexOf(command);
        const favorite=favorites.includes(command.id);
        return `<button class="global-command-item ${index===activeIndex?'active':''}" type="button" role="option" aria-selected="${index===activeIndex?'true':'false'}" data-global-command-id="${esc(command.id)}">
            <span class="global-command-item-icon" aria-hidden="true">${esc(command.icon||'⌘')}</span>
            <span class="global-command-item-main"><span class="global-command-item-title"><strong>${esc(command.title)}</strong>${command.tag?`<span class="global-command-tag">${esc(command.tag)}</span>`:''}</span><span class="global-command-item-subtitle">${esc(command.subtitle||'')}</span></span>
            <span class="global-command-item-actions"><span class="global-command-favorite ${favorite?'is-favorite':''}" role="button" tabindex="-1" data-global-command-favorite="${esc(command.id)}" aria-label="${favorite?'Bỏ ghim':'Ghim'}">${favorite?'★':'☆'}</span><span class="global-command-enter">↵</span></span>
        </button>`;
    }

    function renderPalette() {
        const results=byId('globalCommandResults');
        const input=byId('globalCommandInput');
        const meta=byId('globalCommandMeta');
        const clear=byId('globalCommandClearBtn');
        if (!results || !input) return;
        const catalog=buildCatalog();
        const map=new Map(catalog.map(command=>[command.id,command]));
        const query=input.value.trim();
        const favorites=getFavorites();
        if (clear) clear.hidden=!query;

        if (query) {
            const ranked=catalog.map(command=>({command,score:scoreCommand(command,query)}))
                .filter(item=>item.score>0)
                .sort((a,b)=>b.score-a.score || a.command._catalogOrder-b.command._catalogOrder)
                .slice(0,MAX_RESULTS).map(item=>item.command);
            visibleCommands=ranked;
            activeIndex=Math.min(activeIndex,Math.max(0,visibleCommands.length-1));
            if (meta) meta.textContent=ranked.length ? `${ranked.length} kết quả phù hợp · Enter để mở` : 'Không tìm thấy kết quả phù hợp.';
            results.innerHTML=ranked.length ? sectionHtml('Kết quả',ranked,catalog,favorites) : `<div class="global-command-empty"><strong>Không tìm thấy “${esc(query)}”</strong>Thử “Tuần 6”, tên lớp, “PPCT 35”, “vnEdu” hoặc “sao lưu”.</div>`;
        } else {
            const favoriteCommands=favorites.map(id=>map.get(id)).filter(Boolean);
            const recentCommands=getRecent().map(id=>map.get(id)).filter(Boolean).filter(command=>!favorites.includes(command.id));
            const defaults=['nav:teaching','nav:workspace','week:'+getReferenceWeek()+':teaching','action:weekly-template','action:backup','action:health','nav:links']
                .map(id=>map.get(id)).filter(Boolean)
                .filter(command=>!favoriteCommands.some(item=>item.id===command.id)&&!recentCommands.some(item=>item.id===command.id));
            visibleCommands=[...favoriteCommands,...recentCommands,...defaults].slice(0,MAX_RESULTS);
            activeIndex=Math.min(activeIndex,Math.max(0,visibleCommands.length-1));
            if (meta) meta.textContent='Lệnh ghim, thao tác gần đây và gợi ý theo tuần hiện tại.';
            let html='';
            html+=sectionHtml('⭐ Đã ghim',favoriteCommands,catalog,favorites);
            html+=sectionHtml('🕘 Gần đây',recentCommands,catalog,favorites);
            html+=sectionHtml('✨ Gợi ý nhanh',defaults,catalog,favorites);
            results.innerHTML=html || '<div class="global-command-empty"><strong>Bắt đầu tìm kiếm</strong>Gõ tên chức năng, lớp, tuần, PPCT hoặc công việc.</div>';
        }
        requestAnimationFrame(()=>results.querySelector('.global-command-item.active')?.scrollIntoView({block:'nearest'}));
    }

    function getReferenceWeek() {
        try {
            if (typeof getAutomationReferenceWeek === 'function') return getAutomationReferenceWeek();
            if (typeof getOverviewCurrentWeek === 'function') return getOverviewCurrentWeek(new Date()) || 1;
        } catch (_) { /* noop */ }
        return Number.parseInt(state?.selectedTimetableWeek,10)||1;
    }
    function openPalette(seed='') {
        const palette=byId('globalCommandPalette');
        const input=byId('globalCommandInput');
        if (!palette||!input) return;
        previousFocus=document.activeElement;
        palette.hidden=false;
        document.body.classList.add('global-command-open');
        input.value=seed;
        activeIndex=0;
        renderPalette();
        setTimeout(()=>{input.focus();input.select();},0);
    }
    function closePalette() {
        const palette=byId('globalCommandPalette');
        if (!palette||palette.hidden) return;
        palette.hidden=true;
        document.body.classList.remove('global-command-open');
        if (previousFocus?.focus) previousFocus.focus();
        previousFocus=null;
    }
    function executeCommand(command) {
        if (!command) return;
        pushRecent(command.id);
        closePalette();
        try { command.action?.(); }
        catch (error) {
            window.teacherNotebookRecordError?.('global-command',error,{source:command.id});
            if (typeof showToast==='function') showToast('❌ Không thể thực hiện lệnh: '+(error.message||error),'error');
        }
    }
    function executeById(id) {
        const command=buildCatalog().find(item=>item.id===id);
        if (command) executeCommand(command);
    }
    function moveSelection(delta) {
        if (!visibleCommands.length) return;
        activeIndex=(activeIndex+delta+visibleCommands.length)%visibleCommands.length;
        renderPalette();
    }

    function initGlobalCommandPalette() {
        if (initialized) return;
        initialized=true;
        const palette=byId('globalCommandPalette');
        const input=byId('globalCommandInput');
        byId('globalCommandBtn')?.addEventListener('click',()=>openPalette());
        byId('globalCommandCloseBtn')?.addEventListener('click',closePalette);
        byId('globalCommandClearBtn')?.addEventListener('click',()=>{if(input){input.value='';activeIndex=0;renderPalette();input.focus();}});
        byId('globalCommandClearRecentBtn')?.addEventListener('click',()=>{writeList(RECENT_KEY,[],MAX_RECENT);activeIndex=0;renderPalette();});
        input?.addEventListener('input',()=>{activeIndex=0;renderPalette();});
        input?.addEventListener('keydown',event=>{
            if (event.key==='ArrowDown'){event.preventDefault();moveSelection(1);}
            else if(event.key==='ArrowUp'){event.preventDefault();moveSelection(-1);}
            else if(event.key==='Enter'){event.preventDefault();executeCommand(visibleCommands[activeIndex]);}
            else if(event.key==='Escape'){event.preventDefault();closePalette();}
        });
        palette?.addEventListener('mousedown',event=>{if(event.target===palette)closePalette();});
        byId('globalCommandResults')?.addEventListener('click',event=>{
            const favorite=event.target.closest('[data-global-command-favorite]');
            if(favorite){event.preventDefault();event.stopPropagation();toggleFavorite(favorite.dataset.globalCommandFavorite);return;}
            const item=event.target.closest('[data-global-command-id]');
            if(item)executeById(item.dataset.globalCommandId);
        });
        document.addEventListener('keydown',event=>{
            if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
                event.preventDefault();
                if(!palette?.hidden)closePalette();else openPalette();
                return;
            }
            if(event.key==='Escape'&&palette&&!palette.hidden){event.preventDefault();closePalette();}
        },true);
        window.addEventListener('teacher-data-changed',()=>{if(palette&&!palette.hidden)renderPalette();});
        window.openTeacherCommandPalette=openPalette;
        window.closeTeacherCommandPalette=closePalette;
    }

    window.initGlobalCommandPalette=initGlobalCommandPalette;
    window.renderGlobalCommandPalette=renderPalette;
})();
