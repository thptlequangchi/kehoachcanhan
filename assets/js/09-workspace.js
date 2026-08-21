        // ================================================================
        //  PERSONAL & SHARED WORKSPACE
        // ================================================================
        function workTypeInfo(type) {
            if (type === 'lesson') return { icon: '📘', label: 'Bài soạn' };
            if (type === 'task') return { icon: '✅', label: 'Nhiệm vụ' };
            return { icon: '📝', label: 'Ghi chú' };
        }

        function createWorkItemId() {
            if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
            return `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }

        function sharedWorkScopeAvailable() {
            return Boolean(state.account.accessMode === 'group'
                && state.account.firebaseReady
                && state.account.user
                && state.account.profile?.status === 'active');
        }

        function canManageWorkItem(item) {
            if (item?.scope !== 'shared') return true;
            return Boolean(sharedWorkScopeAvailable()
                && (item.createdBy === state.account.user?.uid || state.account.profile?.role === 'admin'));
        }

        function currentWorkItems() {
            return state.workScope === 'shared' ? state.sharedWorkItems : state.workItems;
        }

        function setWorkScope(scope, notify = false) {
            const nextScope = scope === 'shared' && sharedWorkScopeAvailable() ? 'shared' : 'personal';
            state.workScope = nextScope;
            localStorage.setItem(WORK_SCOPE_STORAGE, nextScope);
            renderWorkWorkspace();
            if (notify && scope === 'shared' && nextScope !== 'shared') {
                showToast('🔒 Hãy đăng nhập nhóm giáo viên để mở sổ công việc chung', 'info');
            }
        }

        function formatWorkTimestamp(value) {
            const normalized = normalizeWorkTimestamp(value);
            if (!normalized) return '';
            return new Date(normalized).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        }

        function renderWorkWorkspace() {
            if (!workItemList) return;
            const groupAvailable = sharedWorkScopeAvailable();
            sharedWorkScopeBtn.hidden = !groupAvailable;
            if (state.workScope === 'shared'
                && !groupAvailable
                && state.account.accessMode !== 'group') {
                state.workScope = 'personal';
                localStorage.setItem(WORK_SCOPE_STORAGE, 'personal');
            }
            personalWorkScopeBtn.classList.toggle('active', state.workScope === 'personal');
            sharedWorkScopeBtn.classList.toggle('active', state.workScope === 'shared');
            const allItems = normalizeWorkItems(currentWorkItems(), state.workScope);

            const counts = {
                note: allItems.filter(item => item.type === 'note').length,
                lesson: allItems.filter(item => item.type === 'lesson').length,
                task: allItems.filter(item => item.type === 'task' && !item.completed).length,
            };
            workStatGrid.innerHTML = `
                <div class="work-stat-card"><strong>${counts.note}</strong><span>Ghi chú</span></div>
                <div class="work-stat-card"><strong>${counts.lesson}</strong><span>Bài soạn</span></div>
                <div class="work-stat-card"><strong>${counts.task}</strong><span>Nhiệm vụ chưa xong</span></div>`;

            workWorkspaceNotice.hidden = true;
            workWorkspaceNotice.className = 'work-workspace-notice';
            workWorkspaceNotice.textContent = '';
            if (state.workScope === 'shared') {
                if (state.workSyncError) {
                    workWorkspaceNotice.hidden = false;
                    workWorkspaceNotice.classList.add('error');
                    workWorkspaceNotice.innerHTML = `<b>Chưa mở được sổ công việc nhóm.</b> ${escapeHTML(state.workSyncError)}
                        <button class="btn btn-outline btn-sm" type="button" data-work-action="copy-rules"
                                style="margin-left:8px;color:#991b1b;border-color:#fca5a5;">📋 Sao chép quyền Firestore mới</button>`;
                } else if (!state.account.sharedWorkItemsLoaded) {
                    workWorkspaceNotice.hidden = false;
                    workWorkspaceNotice.classList.add('warning');
                    workWorkspaceNotice.textContent = 'Đang tải ghi chú, bài soạn và nhiệm vụ của nhóm…';
                }
                workLiveState.innerHTML = state.account.sharedWorkItemsLoaded
                    ? '<strong>● Đồng bộ thời gian thực</strong> · mọi thành viên đang hoạt động cùng nhìn thấy'
                    : 'Đang kết nối dữ liệu nhóm…';
            } else {
                workLiveState.innerHTML = accountCloudSyncEnabled() && state.account.personalYearLoaded
                    ? '<strong>● Đã đồng bộ</strong> · chỉ tài khoản của thầy nhìn thấy'
                    : 'Dữ liệu cá nhân đang lưu an toàn trên thiết bị này.';
            }

            const typeFilter = workTypeFilter.value;
            const statusFilter = workStatusFilter.value;
            const search = normalizeLookupText(workSearchInput.value);
            const items = allItems
                .filter(item => !typeFilter || item.type === typeFilter)
                .filter(item => statusFilter !== 'open' || (item.type === 'task' && !item.completed))
                .filter(item => statusFilter !== 'completed' || (item.type === 'task' && item.completed))
                .filter(item => statusFilter !== 'pinned' || item.pinned)
                .filter(item => !search || normalizeLookupText(`${item.title} ${item.content} ${item.createdByName}`).includes(search))
                .sort((a, b) => Number(b.pinned) - Number(a.pinned)
                    || Number(a.completed) - Number(b.completed)
                    || Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));

            if (items.length === 0) {
                const filtered = Boolean(typeFilter || statusFilter || search);
                workItemList.innerHTML = `<div class="work-empty-state"><strong>${filtered ? 'Không có kết quả phù hợp' : 'Sổ công việc đang trống'}</strong>
                    ${filtered ? 'Thử thay đổi bộ lọc hoặc từ khóa.' : 'Nhấn “Thêm mới” để tạo ghi chú, bài soạn hoặc nhiệm vụ đầu tiên.'}</div>`;
                return;
            }

            workItemList.innerHTML = items.map(item => {
                const info = workTypeInfo(item.type);
                const manageable = canManageWorkItem(item);
                const updated = formatWorkTimestamp(item.updatedAt || item.createdAt);
                const due = item.dueDate ? formatISODateForDisplay(item.dueDate) : '';
                const owner = item.scope === 'shared'
                    ? cleanText(item.createdByName) || resolveSharedEditorName(item.createdBy)
                    : 'Của tôi';
                return `<article class="work-item-card ${item.pinned ? 'pinned' : ''} ${item.completed ? 'completed' : ''}">
                    <div class="work-item-top">
                        <span class="work-type-badge ${item.type}">${info.icon} ${escapeHTML(info.label)}</span>
                        <span>${item.pinned ? '📌' : ''}${item.completed ? '<span class="work-state-badge">Đã xong</span>' : ''}</span>
                    </div>
                    <h3>${escapeHTML(item.title)}</h3>
                    <p class="work-item-content">${escapeHTML(item.content || 'Chưa có nội dung chi tiết.')}</p>
                    <div class="work-item-meta">
                        <span>👤 ${escapeHTML(owner)}</span>
                        ${due ? `<span>📅 Hạn ${escapeHTML(due)}</span>` : ''}
                        ${updated ? `<span>· Cập nhật ${escapeHTML(updated)}</span>` : ''}
                    </div>
                    ${manageable ? `<div class="work-item-actions">
                        ${item.type === 'task' ? `<button class="btn btn-outline btn-sm" type="button" data-work-action="toggle" data-work-id="${escapeHTML(item.id)}">${item.completed ? '↩ Mở lại' : '✓ Hoàn thành'}</button>` : ''}
                        <button class="btn btn-outline btn-sm" type="button" data-work-action="edit" data-work-id="${escapeHTML(item.id)}">✏️ Sửa</button>
                        <button class="btn btn-outline btn-sm" type="button" data-work-action="delete" data-work-id="${escapeHTML(item.id)}" style="color:#b91c1c;border-color:#fca5a5;">🗑️ Xóa</button>
                    </div>` : ''}
                </article>`;
            }).join('');
        }

        function updateWorkItemFormByType() {
            const task = workItemType.value === 'task';
            workItemDueDateField.hidden = !task;
            workItemCompletedLabel.hidden = !task;
            if (!task) {
                workItemDueDate.value = '';
                workItemCompleted.checked = false;
            }
            workItemScopeHelp.textContent = workItemScope.value === 'shared'
                ? 'Mọi thành viên đang hoạt động đều xem được; chủ sở hữu hoặc admin được sửa.'
                : 'Mục cá nhân chỉ tài khoản của thầy nhìn thấy.';
        }

        function openWorkItemEditor(item = null) {
            const editing = Boolean(item?.id);
            workItemEditorContext = item ? { id: item.id, scope: item.scope } : { id: '', scope: state.workScope };
            workItemForm.reset();
            setFormFeedback(workItemFormError, '');
            workItemModalTitle.textContent = editing ? 'Sửa mục công việc' : 'Thêm mục công việc';
            workItemModalSubtitle.textContent = editing
                ? 'Thay đổi sẽ được đồng bộ ngay sau khi lưu.'
                : `Năm học ${state.selectedAcademicYear} · chọn đúng phạm vi trước khi lưu.`;
            const sharedOption = workItemScope.querySelector('option[value="shared"]');
            sharedOption.disabled = !sharedWorkScopeAvailable();
            workItemScope.value = item?.scope === 'shared' || (!item && state.workScope === 'shared') ? 'shared' : 'personal';
            workItemScope.disabled = editing;
            workItemType.value = item?.type || 'note';
            workItemTitle.value = item?.title || '';
            workItemContent.value = item?.content || '';
            workItemDueDate.value = item?.dueDate || '';
            workItemPinned.checked = Boolean(item?.pinned);
            workItemCompleted.checked = Boolean(item?.completed);
            updateWorkItemFormByType();
            openAppModal(workItemModal, workItemTitle);
        }

        async function saveSharedWorkItem(item, existing = null) {
            if (!sharedWorkScopeAvailable()) throw new Error('Chưa kết nối tài khoản nhóm');
            const { firestoreModule } = state.account.modules;
            const collectionRef = getSharedWorkItemsRef(state.selectedAcademicYear);
            const itemRef = existing?.id
                ? firestoreModule.doc(collectionRef, existing.id)
                : firestoreModule.doc(collectionRef);
            const ownerUid = existing?.createdBy || state.account.user.uid;
            const ownerName = existing?.createdByName || cleanText(
                state.account.profile?.displayName || state.account.user.displayName || state.account.user.email
            ) || 'Giáo viên';
            const payload = {
                schemaVersion: 1,
                academicYear: state.selectedAcademicYear,
                scope: 'shared',
                type: item.type,
                title: item.title,
                content: item.content,
                dueDate: item.dueDate,
                completed: item.completed,
                pinned: item.pinned,
                createdBy: ownerUid,
                createdByName: ownerName,
                updatedAt: firestoreModule.serverTimestamp(),
            };
            if (!existing) payload.createdAt = firestoreModule.serverTimestamp();
            await firestoreModule.setDoc(itemRef, payload, { merge: Boolean(existing) });
        }

        async function saveWorkItemFromForm(event) {
            event.preventDefault();
            if (saveWorkItemBtn.disabled) return;
            setFormFeedback(workItemFormError, '');
            const title = cleanText(workItemTitle.value).slice(0, 160);
            const content = workItemContent.value.trim().slice(0, 12000);
            if (!title) {
                setFormFeedback(workItemFormError, 'Vui lòng nhập tiêu đề.');
                workItemTitle.focus();
                return;
            }
            const scope = workItemEditorContext?.id ? workItemEditorContext.scope : workItemScope.value;
            const source = scope === 'shared' ? state.sharedWorkItems : state.workItems;
            const existing = workItemEditorContext?.id
                ? source.find(item => item.id === workItemEditorContext.id) : null;
            if (existing && !canManageWorkItem(existing)) {
                setFormFeedback(workItemFormError, 'Thầy không có quyền sửa mục này.');
                return;
            }
            const type = WORK_ITEM_TYPES.includes(workItemType.value) ? workItemType.value : 'note';
            const now = new Date().toISOString();
            const item = normalizeWorkItem({
                ...(existing || {}),
                id: existing?.id || createWorkItemId(),
                academicYear: state.selectedAcademicYear,
                scope,
                type,
                title,
                content,
                dueDate: type === 'task' ? workItemDueDate.value : '',
                completed: type === 'task' && workItemCompleted.checked,
                pinned: workItemPinned.checked,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
                createdBy: existing?.createdBy || state.account.user?.uid || 'local',
                createdByName: existing?.createdByName || state.account.profile?.displayName || state.teacherProfile.teacherName,
            }, scope);

            saveWorkItemBtn.disabled = true;
            saveWorkItemBtn.textContent = 'Đang lưu…';
            try {
                if (scope === 'shared') {
                    await saveSharedWorkItem(item, existing);
                } else {
                    const index = state.workItems.findIndex(entry => entry.id === item.id);
                    if (index >= 0) state.workItems[index] = item;
                    else state.workItems.push(item);
                    persistActiveYearWorkspace();
                    renderWorkWorkspace();
                }
                closeAppModal(workItemModal);
                showToast(`✅ Đã lưu ${workTypeInfo(type).label.toLowerCase()}`, 'success');
            } catch (error) {
                console.error('Không thể lưu mục công việc:', error);
                state.workSyncError = translateAccountError(error);
                setFormFeedback(workItemFormError, state.workSyncError);
                renderWorkWorkspace();
            } finally {
                saveWorkItemBtn.disabled = false;
                saveWorkItemBtn.textContent = '💾 Lưu';
            }
        }

        async function updateSharedWorkItemFields(item, changes) {
            const { firestoreModule } = state.account.modules;
            const itemRef = firestoreModule.doc(getSharedWorkItemsRef(state.selectedAcademicYear), item.id);
            await firestoreModule.setDoc(itemRef, {
                ...changes,
                updatedAt: firestoreModule.serverTimestamp(),
            }, { merge: true });
        }

        async function handleWorkItemAction(action, itemId) {
            const items = currentWorkItems();
            const item = items.find(entry => entry.id === itemId);
            if (!item || !canManageWorkItem(item)) return;
            if (action === 'edit') {
                openWorkItemEditor(item);
                return;
            }
            try {
                if (action === 'toggle' && item.type === 'task') {
                    if (item.scope === 'shared') await updateSharedWorkItemFields(item, { completed: !item.completed });
                    else {
                        item.completed = !item.completed;
                        item.updatedAt = new Date().toISOString();
                        persistActiveYearWorkspace();
                        renderWorkWorkspace();
                    }
                    showToast(item.completed ? 'Đã mở lại nhiệm vụ' : '✅ Đã cập nhật nhiệm vụ', 'success');
                    return;
                }
                if (action === 'delete') {
                    if (!confirm(`Xóa “${item.title}”?`)) return;
                    if (item.scope === 'shared') {
                        const { firestoreModule } = state.account.modules;
                        await firestoreModule.deleteDoc(
                            firestoreModule.doc(getSharedWorkItemsRef(state.selectedAcademicYear), item.id)
                        );
                    } else {
                        state.workItems = state.workItems.filter(entry => entry.id !== item.id);
                        persistActiveYearWorkspace();
                        renderWorkWorkspace();
                    }
                    showToast('Đã xóa mục công việc', 'info');
                }
            } catch (error) {
                console.error('Không thể cập nhật sổ công việc:', error);
                state.workSyncError = translateAccountError(error);
                renderWorkWorkspace();
                showToast('❌ ' + state.workSyncError, 'error');
            }
        }
