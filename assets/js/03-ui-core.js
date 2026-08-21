        // ================================================================
        //  TOAST
        // ================================================================
        function showToast(msg, type = 'info') {
            if (toastTimer) clearTimeout(toastTimer);
            toast.textContent = msg;
            toast.className = 'toast ' + type + ' show';
            toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 4000);
        }

        function setFormFeedback(element, message = '') {
            element.textContent = cleanText(message);
            element.hidden = !cleanText(message);
        }

        function openAppModal(modal, focusElement = null) {
            if (!modal) return;
            modalReturnFocus.set(modal.id, document.activeElement || null);
            modal.hidden = false;
            document.body?.classList.add('modal-open');
            setTimeout(() => (focusElement || null)?.focus?.(), 30);
        }

        function closeAppModal(modal) {
            if (!modal || modal.hidden) return;
            modal.hidden = true;
            if (modal === scheduleEditorModal) scheduleEditorContext = null;
            if (modal === notTeachingModal) notTeachingEditorContext = null;
            if (modal === workItemModal) workItemEditorContext = null;
            const stillOpen = [accountModal, teamAdminModal, scheduleEditorModal, notTeachingModal, workItemModal, teacherProfileModal]
                .some(item => item && !item.hidden);
            if (!stillOpen) document.body?.classList.remove('modal-open');
            const returnFocus = modalReturnFocus.get(modal.id);
            modalReturnFocus.delete(modal.id);
            returnFocus?.focus?.();
        }

        function resetScheduleConflictConfirmation() {
            scheduleEditorConflict.hidden = true;
            scheduleEditorConflictList.innerHTML = '';
            scheduleEditorConflictConfirm.checked = false;
        }

        function updateScheduleEditorMappingHint() {
            const context = scheduleEditorContext;
            if (!context) return;
            const className = cleanText(scheduleEditorClass.value);
            const subject = cleanText(scheduleEditorSubject.value);
            const item = context.itemId
                ? state.teachingSchedule[context.week]?.find(row => row.id === context.itemId)
                : null;
            const ppct = Number.parseInt(scheduleEditorPpct.value || item?.ppctPeriod, 10);
            if (!className || !subject) {
                scheduleEditorMappingHint.textContent = 'Nhập lớp và môn để đối chiếu tên bài trong phân phối chương trình.';
                return;
            }
            if (!(ppct > 0) || context.mode === 'add' || item?.makeupLesson) {
                scheduleEditorMappingHint.textContent = 'Tiết PPCT và tên bài sẽ được tính theo vị trí của tiết học sau khi lưu.';
                return;
            }
            const lesson = getCurriculumLessonByPpct(className, subject, ppct);
            scheduleEditorMappingHint.textContent = lesson?.topic
                ? `Đối chiếu PPCT ${ppct}: ${lesson.topic}`
                : `Chưa tìm thấy tên bài tương ứng với Tiết PPCT ${ppct} của lớp ${className}.`;
        }
