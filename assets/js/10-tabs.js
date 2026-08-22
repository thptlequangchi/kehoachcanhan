        // ================================================================
        //  TAB SWITCHING
        // ================================================================
        $$('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                const tabId = btn.dataset.tab;
                $$('.tab-content').forEach(c => c.classList.remove('active'));
                const target = document.getElementById('tab-' + tabId);
                if (target) target.classList.add('active');
                // Refresh display
                if (tabId === 'plan') renderPlanTable();
                if (tabId === 'timetable') renderTimetable();
                if (tabId === 'teaching') {
                    populateWeekSelect();
                    renderProgressDashboard();
                }
                if (tabId === 'reports' && typeof renderReportCenter === 'function') renderReportCenter();
                if (tabId === 'workspace') renderWorkWorkspace();
            });
        });

        $('#tabNav').addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = Array.from($$('.tab-btn'));
            const current = tabs.indexOf(document.activeElement);
            if (current < 0) return;
            event.preventDefault();
            let next = current;
            if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
            if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            tabs[next].focus();
            tabs[next].click();
        });

        personalWorkScopeBtn.addEventListener('click', () => setWorkScope('personal'));
        sharedWorkScopeBtn.addEventListener('click', () => setWorkScope('shared', true));
        [workTypeFilter, workStatusFilter].forEach(element => {
            element.addEventListener('change', renderWorkWorkspace);
        });
        workSearchInput.addEventListener('input', renderWorkWorkspace);
        addWorkItemBtn.addEventListener('click', () => openWorkItemEditor());
        workItemType.addEventListener('change', updateWorkItemFormByType);
        workItemScope.addEventListener('change', updateWorkItemFormByType);
        workItemForm.addEventListener('submit', saveWorkItemFromForm);
        workItemList.addEventListener('click', event => {
            const button = event.target.closest('[data-work-action][data-work-id]');
            if (button) handleWorkItemAction(button.dataset.workAction, button.dataset.workId);
        });
        workWorkspaceNotice.addEventListener('click', event => {
            if (!event.target.closest('[data-work-action="copy-rules"]')) return;
            copyTextForAccount(FIRESTORE_RULES_TEMPLATE, '✅ Đã sao chép Firestore Rules mới');
        });
