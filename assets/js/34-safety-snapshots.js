/* ============================================================================
   SỔ TAY GIÁO VIÊN v52.8 — SAFETY SNAPSHOTS
   Tự tạo tối đa 5 điểm an toàn cục bộ, mỗi 12 giờ; cho phép phục hồi nhanh.
   API key/recognition cache không nằm trong createBackupPayload nên không bị sao chép.
   ============================================================================ */
(() => {
    const SAFETY_INDEX_KEY = 'teacher_safety_snapshot_index_v1';
    const SAFETY_PREFIX = 'teacher_safety_snapshot_v1_';
    const SAFETY_LIMIT = 5;
    const SAFETY_INTERVAL_MS = 12 * 60 * 60 * 1000;
    let busy = false;

    function safetyReadIndex() {
        const list = readStoredJSON(SAFETY_INDEX_KEY, []);
        return Array.isArray(list) ? list.filter(item => item?.key && item?.createdAt).slice(0, SAFETY_LIMIT) : [];
    }
    function safetyWriteIndex(list) { return writeStoredJSON(SAFETY_INDEX_KEY, list.slice(0, SAFETY_LIMIT)); }
    function safetyFormatTime(value) {
        const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });
    }
    async function safetyRemoveBackup(key) {
        if (window.teacherNotebookIndexedDB) return window.teacherNotebookIndexedDB.removeBackup(key);
        localStorage.removeItem(key); return true;
    }
    async function safetySetBackup(key, payload) {
        if (window.teacherNotebookIndexedDB) return window.teacherNotebookIndexedDB.setBackup(key, payload);
        return writeStoredJSON(key, payload);
    }
    async function safetyGetBackup(key) {
        if (window.teacherNotebookIndexedDB) return window.teacherNotebookIndexedDB.getBackup(key);
        return readStoredJSON(key, null);
    }
    async function safetyPrune(index) {
        const keep=index.slice(0,SAFETY_LIMIT), stale=index.slice(SAFETY_LIMIT);
        for(const item of stale) await safetyRemoveBackup(item.key);
        safetyWriteIndex(keep); return keep;
    }
    function safetyRenderSummary() {
        const index=safetyReadIndex(); const latest=index[0];
        const summary=document.querySelector('#safetySnapshotSummary');
        const restore=document.querySelector('#restoreSafetySnapshotBtn');
        if(summary) summary.textContent=latest ? `Điểm an toàn: ${safetyFormatTime(latest.createdAt)} · ${index.length}/${SAFETY_LIMIT}` : 'Chưa có điểm an toàn';
        if(restore) restore.hidden=!latest;
    }
    async function safetyCreateSnapshot(reason='manual', options={}) {
        if(busy || typeof createBackupPayload!=='function') return null;
        busy=true;
        try {
            const payload=createBackupPayload();
            const createdAt=new Date().toISOString();
            const key=`${SAFETY_PREFIX}${Date.now()}`;
            const saved=await safetySetBackup(key,payload);
            if(!saved) throw new Error('Không đủ bộ nhớ để tạo điểm an toàn');
            const item={key,createdAt,reason,academicYear:state?.selectedAcademicYear||'',appVersion:typeof APP_VERSION!=='undefined'?APP_VERSION:''};
            const index=await safetyPrune([item,...safetyReadIndex().filter(x=>x.key!==key)]);
            safetyRenderSummary();
            if(!options.silent) showToast?.('✅ Đã tạo điểm an toàn dữ liệu trên thiết bị','success');
            return item;
        } catch(error) {
            window.teacherNotebookRecordError?.('safety-snapshot',error,{source:reason});
            if(!options.silent) showToast?.('❌ Không thể tạo điểm an toàn: '+error.message,'error');
            return null;
        } finally { busy=false; }
    }
    async function safetyRestoreLatest() {
        const latest=safetyReadIndex()[0]; if(!latest) return false;
        const snapshot=await safetyGetBackup(latest.key); if(!snapshot) throw new Error('Điểm an toàn gần nhất không còn trong bộ nhớ');
        const normalized=normalizeBackupPayload(snapshot);
        const when=safetyFormatTime(latest.createdAt);
        if(!confirm(`Phục hồi dữ liệu về điểm an toàn ${when}?\n\nHệ thống sẽ tự tạo thêm một điểm an toàn của trạng thái hiện tại trước khi phục hồi.`)) return false;
        await safetyCreateSnapshot('before-safety-restore',{silent:true});
        applyBackupPayload(normalized);
        updateDataSafetySummary?.(); safetyRenderSummary();
        showToast?.(`✅ Đã phục hồi về điểm an toàn ${when}`,'success');
        return true;
    }
    async function safetyMaybeAuto() {
        const latest=safetyReadIndex()[0];
        const age=latest ? Date.now()-new Date(latest.createdAt).getTime() : Infinity;
        if(!Number.isFinite(age) || age>=SAFETY_INTERVAL_MS) await safetyCreateSnapshot('auto-12h',{silent:true});
        safetyRenderSummary();
    }
    function safetyInit() {
        safetyRenderSummary();
        document.querySelector('#createSafetySnapshotBtn')?.addEventListener('click',()=>safetyCreateSnapshot('manual'));
        document.querySelector('#restoreSafetySnapshotBtn')?.addEventListener('click',()=>safetyRestoreLatest().catch(error=>showToast?.('❌ '+error.message,'error')));
        setTimeout(()=>safetyMaybeAuto().catch(()=>{}),1200);
        setInterval(()=>safetyMaybeAuto().catch(()=>{}),30*60*1000);
    }
    window.teacherNotebookSafety={createSnapshot:safetyCreateSnapshot,restoreLatest:safetyRestoreLatest,readIndex:safetyReadIndex,render:safetyRenderSummary};
    window.addEventListener('teacher-notebook:init-complete',safetyInit,{once:true});
})();
