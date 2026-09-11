/* ============================================================================
   SỔ TAY GIÁO VIÊN v52.7 — BROWSER SMOKE SUITE
   Chỉ tải khi URL có ?smoke=1. Không thay đổi dữ liệu nghiệp vụ.
   ============================================================================ */
(() => {
    const results = [];
    function smokeAdd(name, pass, detail='') { results.push({ name, pass:Boolean(pass), detail:String(detail||'') }); }
    function waitForInit(timeout=10000) {
        if (window.__teacherNotebookInitCompleted) return Promise.resolve();
        return new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(new Error('Ứng dụng chưa init sau 10 giây')),timeout);
            window.addEventListener('teacher-notebook:init-complete',()=>{clearTimeout(timer);resolve();},{once:true});
        });
    }
    async function clickTab(name) {
        const button=document.querySelector(`.tab-btn[data-tab="${name}"]`);
        if(!button) throw new Error(`Không thấy tab ${name}`);
        button.click();
        await new Promise(r=>setTimeout(r,80));
        const panel=document.getElementById(`tab-${name}`);
        return Boolean(button.classList.contains('active') && panel?.classList.contains('active'));
    }
    function show(report) {
        let box=document.querySelector('#browserSmokeOverlay');
        if(!box){
            box=document.createElement('section'); box.id='browserSmokeOverlay';
            box.style.cssText='position:fixed;z-index:99999;right:16px;bottom:16px;max-width:min(560px,calc(100vw - 32px));max-height:80vh;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:16px;box-shadow:0 20px 60px #0f172a33;padding:16px;font:14px/1.45 system-ui;color:#0f172a';
            document.body.appendChild(box);
        }
        const pass=report.results.filter(x=>x.pass).length, total=report.results.length;
        box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong>🌐 Browser smoke v${report.version}</strong><button type="button" id="closeBrowserSmoke" style="border:0;background:#f1f5f9;border-radius:8px;padding:6px 10px;cursor:pointer">Đóng</button></div><p style="margin:8px 0"><b>${pass}/${total}</b> kiểm tra đạt · ${report.durationMs} ms</p>${report.results.map(r=>`<div style="padding:6px 0;border-top:1px solid #f1f5f9">${r.pass?'✅':'❌'} <b>${r.name}</b>${r.detail?`<div style="color:#64748b">${r.detail}</div>`:''}</div>`).join('')}`;
        box.querySelector('#closeBrowserSmoke')?.addEventListener('click',()=>box.remove());
    }
    async function run() {
        const started=performance.now();
        try { await waitForInit(); smokeAdd('Khởi động ứng dụng', true, `APP_VERSION ${window.APP_VERSION || (typeof APP_VERSION!=='undefined'?APP_VERSION:'?')}`); }
        catch(e){ smokeAdd('Khởi động ứng dụng',false,e.message); }
        smokeAdd('Không có lỗi init nghiêm trọng', !(window.__teacherNotebookInitErrors||[]).length, (window.__teacherNotebookInitErrors||[]).map(x=>x.name).join(', '));
        for(const tab of ['plan','timetable','teaching','gradebook','homeroom']){
            try { smokeAdd(`Mở tab ${tab}`, await clickTab(tab)); } catch(e){ smokeAdd(`Mở tab ${tab}`,false,e.message); }
        }
        try {
            const key='teacher_smoke_roundtrip_v1', value={at:Date.now(),ok:true};
            localStorage.setItem(key,JSON.stringify(value)); const read=JSON.parse(localStorage.getItem(key)||'null'); localStorage.removeItem(key);
            smokeAdd('LocalStorage round-trip',read?.ok===true);
        } catch(e){ smokeAdd('LocalStorage round-trip',false,e.message); }
        smokeAdd('Sổ điểm sẵn sàng',typeof window.renderGradebook==='function'||typeof renderGradebook==='function');
        smokeAdd('Sổ chủ nhiệm sẵn sàng',typeof window.renderHomeroom==='function'||typeof renderHomeroom==='function');
        try { await window.teacherNotebookModules?.ensureGroup('reports'); smokeAdd('Lazy-load Báo cáo/Hồ sơ',typeof window.renderReportCenter==='function'); }
        catch(e){ smokeAdd('Lazy-load Báo cáo/Hồ sơ',false,e.message); }
        try { await window.teacherNotebookModules?.ensureGroup('links'); smokeAdd('Lazy-load Liên kết',typeof window.renderLinkCenter==='function'); }
        catch(e){ smokeAdd('Lazy-load Liên kết',false,e.message); }
        const report={version:(typeof APP_VERSION!=='undefined'?APP_VERSION:'unknown'),ranAt:new Date().toISOString(),durationMs:Math.round(performance.now()-started),results};
        window.__teacherNotebookSmokeReport=report; show(report);
        console.table(results);
        return report;
    }
    window.runTeacherNotebookBrowserSmoke=run;
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();
