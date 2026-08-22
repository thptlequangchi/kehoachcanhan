/* ============================================================================
   SỔ TAY GIÁO VIÊN v45 — TRUNG TÂM LIÊN KẾT & TÍCH HỢP
   Liên kết mặc định + liên kết tùy chỉnh lưu cục bộ. Không lưu mật khẩu.
   ============================================================================ */
(() => {
    const STORAGE_KEY = 'teacher_external_links_v1';
    const PREFS_KEY = 'teacher_external_link_prefs_v1';
    const BUILTIN_LINKS = Object.freeze([
        {
            id: 'builtin-temis',
            name: 'Hệ thống quản lý thông tin GV và CBQLCSGD',
            shortName: 'TEMIS',
            url: 'https://temis.csdl.edu.vn/user/login',
            category: 'Chuyên môn',
            icon: '👩‍🏫',
            description: 'Hồ sơ và thông tin giáo viên, cán bộ quản lý cơ sở giáo dục.',
            builtIn: true,
            defaultPinned: true,
        },
        {
            id: 'builtin-school-timetable',
            name: 'Thời khoá biểu',
            shortName: 'TKB Trường',
            url: 'https://thptlequangchi.hatinh.edu.vn/thoi-khoa-bieu',
            category: 'Nhà trường',
            icon: '🗓️',
            description: 'Trang thời khoá biểu của THPT Lê Quảng Chí.',
            builtIn: true,
            defaultPinned: true,
        },
        {
            id: 'builtin-hatinh-vnerp',
            name: 'UBND tỉnh Hà Tĩnh',
            shortName: 'Hà Tĩnh VN ERP',
            url: 'https://hatinh.vnerp.vn/web/login',
            category: 'Hành chính',
            icon: '🏛️',
            description: 'Hệ thống điều hành và xử lý công việc VN ERP của tỉnh Hà Tĩnh.',
            builtIn: true,
            defaultPinned: true,
        },
    ]);

    const byId = id => document.getElementById(id);
    const esc = value => typeof escapeHTML === 'function'
        ? escapeHTML(String(value ?? ''))
        : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    let initialized = false;
    let editingId = '';
    let pinnedOnly = false;

    function notify(message, type = 'info') {
        if (typeof showToast === 'function') showToast(message, type);
        else console.log(message);
    }

    function safeHttpUrl(value) {
        try {
            const url = new URL(String(value || '').trim());
            if (!['http:', 'https:'].includes(url.protocol)) return '';
            return url.href;
        } catch (_) {
            return '';
        }
    }

    function normalizeCategory(value) {
        const allowed = ['Nhà trường', 'Chuyên môn', 'Hành chính', 'Tài liệu', 'AI', 'Khác'];
        return allowed.includes(value) ? value : 'Khác';
    }

    function normalizeCustomLink(raw) {
        const url = safeHttpUrl(raw?.url);
        const name = String(raw?.name || '').trim().slice(0, 100);
        if (!url || !name) return null;
        return {
            id: String(raw?.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            name,
            shortName: String(raw?.shortName || name).trim().slice(0, 60),
            url,
            category: normalizeCategory(raw?.category),
            icon: String(raw?.icon || '🔗').trim().slice(0, 4) || '🔗',
            description: String(raw?.description || 'Liên kết tùy chỉnh của tôi.').trim().slice(0, 180),
            builtIn: false,
            pinned: Boolean(raw?.pinned),
            createdAt: String(raw?.createdAt || new Date().toISOString()),
            updatedAt: String(raw?.updatedAt || new Date().toISOString()),
        };
    }

    function readCustomLinks() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed.map(normalizeCustomLink).filter(Boolean) : [];
        } catch (error) {
            window.teacherNotebookRecordError?.('links-storage-read', error, { source: STORAGE_KEY });
            return [];
        }
    }

    function writeCustomLinks(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeCustomLink).filter(Boolean)));
            return true;
        } catch (error) {
            window.teacherNotebookRecordError?.('links-storage-write', error, { source: STORAGE_KEY });
            notify('❌ Không thể lưu liên kết trên thiết bị: ' + (error.message || error), 'error');
            return false;
        }
    }

    function readPrefs() {
        try {
            const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function writePrefs(prefs) {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) { /* noop */ }
    }

    function allLinks() {
        const prefs = readPrefs();
        const builtins = BUILTIN_LINKS.map(link => ({
            ...link,
            pinned: typeof prefs[link.id]?.pinned === 'boolean' ? prefs[link.id].pinned : link.defaultPinned,
        }));
        return [...builtins, ...readCustomLinks()];
    }

    function linkHost(url) {
        try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
    }

    function categoryClass(category) {
        return {
            'Nhà trường': 'school',
            'Chuyên môn': 'professional',
            'Hành chính': 'admin',
            'Tài liệu': 'docs',
            'AI': 'ai',
            'Khác': 'other',
        }[category] || 'other';
    }

    function openExternal(url) {
        const safe = safeHttpUrl(url);
        if (!safe) return notify('⚠️ Liên kết không hợp lệ', 'error');
        const win = window.open(safe, '_blank', 'noopener,noreferrer');
        if (win) win.opener = null;
    }

    async function copyExternal(url) {
        const safe = safeHttpUrl(url);
        if (!safe) return;
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(safe);
            else prompt('Sao chép liên kết:', safe);
            notify('✅ Đã sao chép liên kết', 'success');
        } catch (_) {
            prompt('Sao chép liên kết:', safe);
        }
    }

    function togglePinned(id) {
        const builtin = BUILTIN_LINKS.find(item => item.id === id);
        if (builtin) {
            const prefs = readPrefs();
            const current = typeof prefs[id]?.pinned === 'boolean' ? prefs[id].pinned : builtin.defaultPinned;
            prefs[id] = { ...(prefs[id] || {}), pinned: !current };
            writePrefs(prefs);
            renderLinkCenter();
            return;
        }
        const items = readCustomLinks();
        const index = items.findIndex(item => item.id === id);
        if (index < 0) return;
        items[index].pinned = !items[index].pinned;
        items[index].updatedAt = new Date().toISOString();
        if (writeCustomLinks(items)) renderLinkCenter();
    }

    function deleteCustomLink(id) {
        const items = readCustomLinks();
        const item = items.find(link => link.id === id);
        if (!item) return;
        if (!confirm(`Xóa liên kết “${item.name}”?`)) return;
        if (writeCustomLinks(items.filter(link => link.id !== id))) {
            if (editingId === id) resetForm();
            notify('Đã xóa liên kết', 'info');
            renderLinkCenter();
        }
    }

    function setFormError(message = '') {
        const el = byId('externalLinkFormError');
        if (!el) return;
        el.hidden = !message;
        el.textContent = message;
    }

    function showAddPanel(show = true) {
        const panel = byId('linksAddPanel');
        if (!panel) return;
        panel.hidden = !show;
        if (show) setTimeout(() => byId('externalLinkName')?.focus(), 0);
    }

    function resetForm() {
        editingId = '';
        byId('externalLinkForm')?.reset();
        if (byId('externalLinkCategory')) byId('externalLinkCategory').value = 'Khác';
        setFormError('');
        const button = byId('externalLinkForm')?.querySelector('button[type="submit"]');
        if (button) button.textContent = '💾 Lưu liên kết';
    }

    function editCustomLink(id) {
        const item = readCustomLinks().find(link => link.id === id);
        if (!item) return;
        editingId = id;
        showAddPanel(true);
        byId('externalLinkName').value = item.name;
        byId('externalLinkUrl').value = item.url;
        byId('externalLinkCategory').value = item.category;
        byId('externalLinkIcon').value = item.icon;
        byId('externalLinkPinned').checked = Boolean(item.pinned);
        const button = byId('externalLinkForm')?.querySelector('button[type="submit"]');
        if (button) button.textContent = '💾 Cập nhật liên kết';
        byId('linksAddPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function submitCustomLink(event) {
        event.preventDefault();
        setFormError('');
        const name = String(byId('externalLinkName')?.value || '').trim();
        const url = safeHttpUrl(byId('externalLinkUrl')?.value);
        const category = normalizeCategory(byId('externalLinkCategory')?.value);
        const icon = String(byId('externalLinkIcon')?.value || '🔗').trim().slice(0, 4) || '🔗';
        const pinned = Boolean(byId('externalLinkPinned')?.checked);
        if (!name) return setFormError('Vui lòng nhập tên liên kết.');
        if (!url) return setFormError('Địa chỉ phải là URL hợp lệ bắt đầu bằng http:// hoặc https://.');

        const items = readCustomLinks();
        const duplicate = allLinks().find(item => item.url === url && item.id !== editingId);
        if (duplicate) return setFormError(`Liên kết này đã có trong danh mục: ${duplicate.name}.`);

        if (editingId) {
            const index = items.findIndex(item => item.id === editingId);
            if (index < 0) return setFormError('Không tìm thấy liên kết cần sửa.');
            items[index] = normalizeCustomLink({ ...items[index], name, url, category, icon, pinned, updatedAt: new Date().toISOString() });
        } else {
            items.unshift(normalizeCustomLink({ name, url, category, icon, pinned }));
        }
        if (!writeCustomLinks(items)) return;
        notify(editingId ? '✅ Đã cập nhật liên kết' : '✅ Đã thêm liên kết', 'success');
        resetForm();
        showAddPanel(false);
        renderLinkCenter();
    }

    function cardHtml(link, quick = false) {
        const host = linkHost(link.url);
        const actions = quick
            ? `<button class="links-open-btn" type="button" data-link-action="open" data-link-id="${esc(link.id)}">Mở trang ↗</button>`
            : `<div class="link-card-actions">
                    <button class="btn btn-primary btn-sm" type="button" data-link-action="open" data-link-id="${esc(link.id)}">Mở ↗</button>
                    <button class="btn btn-outline btn-sm" type="button" data-link-action="copy" data-link-id="${esc(link.id)}">📋 Sao chép</button>
                    <button class="link-icon-btn ${link.pinned ? 'active' : ''}" type="button" data-link-action="pin" data-link-id="${esc(link.id)}" title="${link.pinned ? 'Bỏ ghim' : 'Ghim nhanh'}" aria-label="${link.pinned ? 'Bỏ ghim' : 'Ghim nhanh'}">⭐</button>
                    ${link.builtIn ? '' : `<button class="link-icon-btn" type="button" data-link-action="edit" data-link-id="${esc(link.id)}" title="Sửa" aria-label="Sửa">✏️</button><button class="link-icon-btn danger" type="button" data-link-action="delete" data-link-id="${esc(link.id)}" title="Xóa" aria-label="Xóa">🗑️</button>`}
               </div>`;
        return `<article class="${quick ? 'quick-link-card' : 'link-card'} category-${categoryClass(link.category)}">
                    <div class="link-card-icon" aria-hidden="true">${esc(link.icon || '🔗')}</div>
                    <div class="link-card-copy">
                        <div class="link-card-topline"><span class="link-category-badge">${esc(link.category)}</span>${link.builtIn ? '<span class="link-official-badge">Mặc định</span>' : ''}</div>
                        <strong>${esc(quick ? (link.shortName || link.name) : link.name)}</strong>
                        ${quick ? `<small>${esc(host)}</small>` : `<p>${esc(link.description || '')}</p><small class="link-host">${esc(host)}</small>`}
                    </div>
                    ${actions}
                </article>`;
    }

    function filteredLinks() {
        const query = String(byId('linksSearchInput')?.value || '').trim().toLocaleLowerCase('vi-VN');
        const category = byId('linksCategoryFilter')?.value || '';
        return allLinks().filter(link => {
            if (pinnedOnly && !link.pinned) return false;
            if (category && link.category !== category) return false;
            if (!query) return true;
            const haystack = [link.name, link.shortName, link.category, link.description, link.url, linkHost(link.url)].join(' ').toLocaleLowerCase('vi-VN');
            return haystack.includes(query);
        });
    }

    function renderLinkCenter() {
        const links = allLinks();
        const visible = filteredLinks();
        const pinned = links.filter(link => link.pinned);
        const builtins = links.filter(link => link.builtIn);
        const custom = links.filter(link => !link.builtIn);

        if (byId('linksPinnedCount')) byId('linksPinnedCount').textContent = String(pinned.length);
        if (byId('linksOfficialCount')) byId('linksOfficialCount').textContent = String(builtins.length);
        if (byId('linksCustomCount')) byId('linksCustomCount').textContent = String(custom.length);
        if (byId('linksVisibleCount')) byId('linksVisibleCount').textContent = String(visible.length);
        if (byId('linksLibraryMeta')) byId('linksLibraryMeta').textContent = `${visible.length}/${links.length} liên kết · mở trong tab mới`;

        const quickGrid = byId('linksQuickGrid');
        if (quickGrid) {
            const quickItems = pinned.slice(0, 6);
            quickGrid.innerHTML = quickItems.length
                ? quickItems.map(item => cardHtml(item, true)).join('')
                : '<div class="links-empty-inline">Chưa có liên kết được ghim. Nhấn ⭐ trên một liên kết để đưa vào đây.</div>';
        }

        const grid = byId('linksGrid');
        const empty = byId('linksEmpty');
        if (grid) grid.innerHTML = visible.map(item => cardHtml(item, false)).join('');
        if (empty) empty.hidden = visible.length > 0;
        const pinnedBtn = byId('linksShowPinnedBtn');
        if (pinnedBtn) {
            pinnedBtn.classList.toggle('active', pinnedOnly);
            pinnedBtn.textContent = pinnedOnly ? '⭐ Đang xem đã ghim' : '⭐ Chỉ xem đã ghim';
        }
    }

    function handleAction(event) {
        const button = event.target.closest('[data-link-action][data-link-id]');
        if (!button) return;
        const id = button.dataset.linkId;
        const link = allLinks().find(item => item.id === id);
        if (!link) return;
        const action = button.dataset.linkAction;
        if (action === 'open') openExternal(link.url);
        else if (action === 'copy') copyExternal(link.url);
        else if (action === 'pin') togglePinned(id);
        else if (action === 'edit' && !link.builtIn) editCustomLink(id);
        else if (action === 'delete' && !link.builtIn) deleteCustomLink(id);
    }

    function initLinkCenter() {
        if (initialized) return;
        initialized = true;
        byId('linksFocusSearchBtn')?.addEventListener('click', () => {
            byId('linksSearchInput')?.focus();
            byId('linksSearchInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        byId('linksToggleAddBtn')?.addEventListener('click', () => {
            const panel = byId('linksAddPanel');
            if (!panel) return;
            if (!panel.hidden && !editingId) showAddPanel(false);
            else { if (!editingId) resetForm(); showAddPanel(true); }
        });
        byId('linksSearchInput')?.addEventListener('input', renderLinkCenter);
        byId('linksCategoryFilter')?.addEventListener('change', renderLinkCenter);
        byId('linksShowPinnedBtn')?.addEventListener('click', () => { pinnedOnly = !pinnedOnly; renderLinkCenter(); });
        byId('externalLinkForm')?.addEventListener('submit', submitCustomLink);
        byId('linksQuickGrid')?.addEventListener('click', handleAction);
        byId('linksGrid')?.addEventListener('click', handleAction);
        document.querySelector('.tab-btn[data-tab="links"]')?.addEventListener('click', () => setTimeout(renderLinkCenter, 0));
        renderLinkCenter();
    }

    window.initLinkCenter = initLinkCenter;
    window.renderLinkCenter = renderLinkCenter;
    window.teacherNotebookExternalLinks = Object.freeze({ builtins: BUILTIN_LINKS.map(item => ({ ...item })) });
})();
