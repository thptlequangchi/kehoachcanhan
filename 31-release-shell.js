// ================================================================
//  RELEASE SHELL — v52.5
//  Chế độ tập trung chỉ thay đổi cách hiển thị, không thay đổi dữ liệu.
// ================================================================
(() => {
    const STORAGE_KEY = 'teacher_focus_mode_v52';

    function releaseV52ApplyFocusMode(enabled) {
        document.body.classList.toggle('teacher-focus-mode', Boolean(enabled));
        const button = document.getElementById('focusModeToggle');
        if (button) {
            button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
            button.title = enabled ? 'Hiện lại Dashboard năm học và Tự động hóa' : 'Ẩn Dashboard năm học và Tự động hóa, vẫn giữ Bảng điều hành Hôm nay';
            const label = button.querySelector('span');
            if (label) label.textContent = enabled ? 'Đầy đủ' : 'Tập trung';
        }
    }

    function releaseV52ToggleFocusMode() {
        const enabled = !document.body.classList.contains('teacher-focus-mode');
        releaseV52ApplyFocusMode(enabled);
        try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (_) { /* noop */ }
        if (typeof showToast === 'function') showToast(enabled ? '🧘 Đã bật chế độ tập trung' : '🧭 Đã trở lại giao diện đầy đủ', 'info');
    }

    function releaseV52Init() {
        let enabled = false;
        try { enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { enabled = false; }
        releaseV52ApplyFocusMode(enabled);
        document.getElementById('focusModeToggle')?.addEventListener('click', releaseV52ToggleFocusMode);
        document.documentElement.dataset.teacherNotebookRelease = '52.5';
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', releaseV52Init, { once:true });
    else releaseV52Init();
})();
