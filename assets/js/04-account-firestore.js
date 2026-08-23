        // ================================================================
        //  ACCOUNTS, TEACHER GROUP & FIRESTORE SYNC — PHASE 2
        // ================================================================
        const FIRESTORE_RULES_TEMPLATE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }
    function groupPath(groupId) {
      return /databases/$(database)/documents/teacherNotebookGroups/$(groupId);
    }
    function memberPath(groupId, uid) {
      return /databases/$(database)/documents/teacherNotebookGroups/$(groupId)/members/$(uid);
    }
    function isAdmin(groupId) {
      return signedIn()
        && exists(memberPath(groupId, request.auth.uid))
        && get(memberPath(groupId, request.auth.uid)).data.role == 'admin'
        && get(memberPath(groupId, request.auth.uid)).data.status == 'active';
    }
    function isActiveMember(groupId) {
      return signedIn()
        && exists(memberPath(groupId, request.auth.uid))
        && get(memberPath(groupId, request.auth.uid)).data.status == 'active';
    }
    function validSharedWorkItem(academicYear) {
      return request.resource.data.keys().hasOnly([
          'schemaVersion', 'academicYear', 'scope', 'type', 'title', 'content',
          'dueDate', 'dueTime', 'status', 'priority', 'completed', 'recurrence',
          'recurrenceSpawnedAt', 'pinned', 'linkedWeek', 'className', 'subject',
          'linkTarget', 'sourceKey', 'createdBy', 'createdByName', 'createdAt', 'updatedAt'
        ])
        && request.resource.data.academicYear == academicYear
        && request.resource.data.scope == 'shared'
        && request.resource.data.type in ['note', 'lesson', 'task']
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 160
        && request.resource.data.content is string
        && request.resource.data.content.size() <= 12000
        && request.resource.data.createdBy is string;
    }

    match /teacherNotebookGroups/{groupId} {
      allow read: if signedIn();
      allow create: if signedIn()
        && !exists(groupPath(groupId))
        && request.resource.data.ownerUid == request.auth.uid;
      allow update: if isAdmin(groupId);
      allow delete: if false;

      // Kế hoạch tuần và mốc Tuần 1 dùng chung; chỉ admin được chỉnh sửa.
      match /sharedYears/{academicYear} {
        allow read: if isActiveMember(groupId);
        allow create, update: if isAdmin(groupId)
          && request.resource.data.academicYear == academicYear;
        allow delete: if false;

        // Ghi chú, bài soạn và nhiệm vụ nhóm: thành viên được tạo,
        // chủ sở hữu hoặc admin được sửa/xóa; không thể đổi chủ sở hữu.
        match /workItems/{itemId} {
          allow read: if isActiveMember(groupId);
          allow create: if isActiveMember(groupId)
            && validSharedWorkItem(academicYear)
            && request.resource.data.createdBy == request.auth.uid;
          allow update: if isActiveMember(groupId)
            && (resource.data.createdBy == request.auth.uid || isAdmin(groupId))
            && validSharedWorkItem(academicYear)
            && request.resource.data.createdBy == resource.data.createdBy;
          allow delete: if isActiveMember(groupId)
            && (resource.data.createdBy == request.auth.uid || isAdmin(groupId));
        }
      }

      match /members/{uid} {
        allow read: if signedIn() && (request.auth.uid == uid || isAdmin(groupId));
        allow create: if signedIn()
          && request.auth.uid == uid
          && request.resource.data.uid == uid
          && (
            (
              !exists(groupPath(groupId))
              && existsAfter(groupPath(groupId))
              && getAfter(groupPath(groupId)).data.ownerUid == uid
              && request.resource.data.role == 'admin'
              && request.resource.data.status == 'active'
            )
            ||
            (
              exists(groupPath(groupId))
              && request.resource.data.role == 'teacher'
              && request.resource.data.status == 'pending'
            )
          );
        allow update: if isAdmin(groupId)
          || (
            signedIn()
            && request.auth.uid == uid
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
              'displayName', 'schoolName', 'subject', 'phone', 'updatedAt'
            ])
          );
        allow delete: if false;

        // TKB, phân phối chương trình và lịch báo giảng thuộc riêng từng giáo viên.
        match /yearWorkspaces/{academicYear} {
          allow read: if signedIn()
            && request.auth.uid == uid
            && isActiveMember(groupId);
          allow create, update: if signedIn()
            && request.auth.uid == uid
            && isActiveMember(groupId)
            && request.resource.data.academicYear == academicYear;
          allow delete: if false;
        }
      }
    }
  }
}`;

        function isValidFirebaseConfig(value) {
            return Boolean(value && typeof value === 'object'
                && cleanText(value.apiKey)
                && cleanText(value.authDomain)
                && cleanText(value.projectId)
                && cleanText(value.appId));
        }

        function normalizeFirebaseConfig(value) {
            if (!value || typeof value !== 'object') return null;
            const normalized = {
                apiKey: cleanText(value.apiKey),
                authDomain: cleanText(value.authDomain),
                projectId: cleanText(value.projectId),
                storageBucket: cleanText(value.storageBucket),
                messagingSenderId: cleanText(value.messagingSenderId),
                appId: cleanText(value.appId),
                measurementId: cleanText(value.measurementId),
            };
            return isValidFirebaseConfig(normalized) ? normalized : null;
        }

        function parseFirebaseConfigText(value) {
            const text = cleanText(value);
            if (!text) return null;
            const objectMatch = text.match(/\{[\s\S]*\}/);
            const candidate = objectMatch?.[0] || text;
            try {
                return normalizeFirebaseConfig(JSON.parse(candidate));
            } catch (error) {
                try {
                    const jsonLike = candidate
                        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
                        .replace(/'/g, '"')
                        .replace(/,\s*}/g, '}');
                    return normalizeFirebaseConfig(JSON.parse(jsonLike));
                } catch (ignored) {
                    return null;
                }
            }
        }

        function getAccountInitials(value) {
            const words = cleanText(value).split(/\s+/).filter(Boolean);
            if (!words.length) return 'GV';
            return words.slice(-2).map(word => word[0]).join('').toUpperCase();
        }

        function accountRoleLabel(role) {
            return role === 'admin' ? 'Quản trị viên' : role === 'teacher' ? 'Giáo viên' : 'Cá nhân';
        }

        function accountStatusLabel(status) {
            return status === 'active' ? 'Đang hoạt động'
                : status === 'pending' ? 'Chờ duyệt'
                    : status === 'disabled' ? 'Đã khóa' : 'Chưa xác định';
        }

        function translateAccountError(error) {
            const code = cleanText(error?.code).toLowerCase();
            const messages = {
                'auth/invalid-credential': 'Email hoặc mật khẩu chưa đúng.',
                'auth/invalid-login-credentials': 'Email hoặc mật khẩu chưa đúng.',
                'auth/email-already-in-use': 'Email này đã có tài khoản.',
                'auth/invalid-email': 'Địa chỉ email chưa hợp lệ.',
                'auth/weak-password': 'Mật khẩu cần có ít nhất 6 ký tự.',
                'auth/too-many-requests': 'Có quá nhiều lần thử. Vui lòng chờ ít phút rồi thử lại.',
                'auth/network-request-failed': 'Không thể kết nối máy chủ tài khoản. Hãy kiểm tra mạng.',
                'permission-denied': 'Firestore Rules chưa đúng hoặc tài khoản chưa có quyền thực hiện thao tác này.',
                'firestore/permission-denied': 'Firestore Rules chưa đúng hoặc tài khoản chưa có quyền thực hiện thao tác này.',
            };
            return messages[code] || cleanText(error?.message) || 'Không thể hoàn thành thao tác tài khoản.';
        }

        function setAccountAccessMode(mode, notify = true) {
            state.account.accessMode = mode === 'group' ? 'group' : 'personal';
            localStorage.setItem(ACCOUNT_ACCESS_MODE_STORAGE, state.account.accessMode);
            if (state.account.accessMode === 'group' && accountCanUseGroup()) {
                activateCloudDataSync();
            } else {
                stopCloudWorkspaceSync();
            }
            updateAccountPresentation();
            if (notify) showToast(state.account.accessMode === 'group'
                ? 'Đã chuyển sang chế độ nhóm giáo viên'
                : 'Đã chuyển sang chế độ cá nhân trên máy này', 'info');
        }

        function stopAccountSubscription(key) {
            try { state.account[key]?.(); } catch (error) { console.warn('Không thể dừng đồng bộ tài khoản:', error); }
            state.account[key] = null;
        }

        function stopAllAccountSubscriptions() {
            stopCloudWorkspaceSync();
            ['profileUnsubscribe', 'groupUnsubscribe', 'membersUnsubscribe'].forEach(stopAccountSubscription);
        }

        function accountCanUseGroup() {
            return Boolean(state.account.user
                && state.account.profile?.status === 'active');
        }

        function accountCanManageGroup() {
            return Boolean(state.account.accessMode === 'group'
                && state.account.user
                && state.account.profile?.status === 'active'
                && state.account.profile?.role === 'admin');
        }

        function updateAccountPresentation() {
            const account = state.account;
            const configured = isValidFirebaseConfig(account.config);
            const personal = account.accessMode !== 'group';
            const profile = account.profile;
            const displayName = cleanText(profile?.displayName || account.user?.displayName || account.user?.email);
            const role = profile?.role === 'admin' ? 'admin' : 'teacher';
            const status = cleanText(profile?.status);

            accountBar.className = 'account-bar';
            accountGate.hidden = true;
            accountProfileBtn.hidden = true;
            teamAdminBtn.hidden = true;
            accountPersonalModeBtn.hidden = true;
            accountSignOutBtn.hidden = true;
            // v45.3: nút thiết lập/kiểm tra nhóm không chiếm chỗ trên thanh công cụ.
            // Khi cần thiết lập, nút chính sẽ mở đúng màn hình; admin kiểm tra nhóm từ Quản trị nhóm.
            accountSetupBtn.hidden = true;
            accountSetupBtn.textContent = configured ? '🩺 Kiểm tra nhóm' : '⚙️ Thiết lập';
            accountPrimaryBtn.hidden = false;
            cloudSyncBadge.hidden = true;
            updateSharedPlanEditingControls();
            renderWorkWorkspace();

            if (personal) {
                account.status = 'personal';
                accountAvatar.textContent = 'CN';
                accountDisplayName.textContent = 'Chế độ cá nhân';
                accountStatusText.textContent = configured && account.user
                    ? `Tài khoản ${account.user.email} vẫn được ghi nhớ; dữ liệu hiện dùng riêng trên máy này.`
                    : 'Dữ liệu đang được lưu riêng trên máy tính này.';
                accountRoleBadge.textContent = 'Cá nhân';
                accountRoleBadge.className = 'account-role-badge personal';
                accountPrimaryBtn.textContent = account.user ? '👥 Vào nhóm giáo viên' : '👥 Dùng cùng nhóm';
                accountSetupBtn.hidden = true;
                document.body.dataset.accountMode = 'personal';
                document.body.dataset.accountRole = 'personal';
                return;
            }

            accountPersonalModeBtn.hidden = false;
            document.body.dataset.accountMode = 'group';

            if (!configured) {
                account.status = 'config-missing';
                accountAvatar.textContent = '⚙';
                accountDisplayName.textContent = 'Chưa kết nối Firebase';
                accountStatusText.textContent = 'Thiết lập Firebase để tạo tài khoản cho nhóm giáo viên.';
                accountRoleBadge.textContent = 'Chưa thiết lập';
                accountRoleBadge.className = 'account-role-badge personal';
                accountPrimaryBtn.textContent = 'Thiết lập ngay';
                accountSetupBtn.hidden = true;
                accountGate.hidden = false;
                accountGateIcon.textContent = '⚙️';
                accountGateTitle.textContent = 'Thiết lập nhóm giáo viên';
                accountGateMessage.textContent = 'Cần kết nối Firebase Authentication và Firestore trước khi các giáo viên có thể đăng nhập.';
                accountGatePrimaryBtn.textContent = 'Bắt đầu thiết lập';
                document.body.dataset.accountRole = 'guest';
                return;
            }

            if (!account.firebaseReady && account.status !== 'error') {
                account.status = 'connecting';
                accountAvatar.textContent = '…';
                accountDisplayName.textContent = 'Đang kết nối nhóm giáo viên';
                accountStatusText.textContent = `Dự án ${account.config.projectId}`;
                accountRoleBadge.textContent = 'Đang kết nối';
                accountRoleBadge.className = 'account-role-badge teacher';
                accountPrimaryBtn.hidden = true;
                accountGate.hidden = false;
                accountGateIcon.textContent = '⏳';
                accountGateTitle.textContent = 'Đang kết nối';
                accountGateMessage.textContent = 'Ứng dụng đang kiểm tra phiên đăng nhập và quyền thành viên.';
                accountGatePrimaryBtn.textContent = 'Vui lòng chờ';
                accountGatePrimaryBtn.disabled = true;
                document.body.dataset.accountRole = 'guest';
                return;
            }
            accountGatePrimaryBtn.disabled = false;

            if (account.status === 'error') {
                accountBar.classList.add('disabled');
                accountAvatar.textContent = '!';
                accountDisplayName.textContent = 'Không kết nối được tài khoản';
                accountStatusText.textContent = cleanText(account.errorMessage) || 'Kiểm tra lại cấu hình Firebase.';
                accountRoleBadge.textContent = 'Lỗi kết nối';
                accountRoleBadge.className = 'account-role-badge personal';
                accountPrimaryBtn.textContent = 'Kiểm tra thiết lập';
                accountGate.hidden = false;
                accountGateIcon.textContent = '⚠️';
                accountGateTitle.textContent = 'Không thể kết nối nhóm';
                accountGateMessage.textContent = accountStatusText.textContent;
                accountGatePrimaryBtn.textContent = 'Mở thiết lập';
                document.body.dataset.accountRole = 'guest';
                return;
            }

            if (!account.user) {
                account.status = 'signed-out';
                accountAvatar.textContent = 'GV';
                accountDisplayName.textContent = account.group?.name || 'Nhóm giáo viên';
                accountStatusText.textContent = 'Chưa đăng nhập tài khoản.';
                accountRoleBadge.textContent = 'Khách';
                accountRoleBadge.className = 'account-role-badge personal';
                accountPrimaryBtn.textContent = '🔐 Đăng nhập';
                accountGate.hidden = false;
                accountGateIcon.textContent = '🔐';
                accountGateTitle.textContent = 'Đăng nhập nhóm giáo viên';
                accountGateMessage.textContent = 'Mỗi giáo viên sử dụng một tài khoản riêng để nhận đúng vai trò và quyền truy cập.';
                accountGatePrimaryBtn.textContent = 'Đăng nhập';
                document.body.dataset.accountRole = 'guest';
                return;
            }

            accountSignOutBtn.hidden = false;
            accountPrimaryBtn.hidden = true;
            accountAvatar.textContent = getAccountInitials(displayName);
            accountDisplayName.textContent = displayName || 'Tài khoản giáo viên';

            if (!profile) {
                accountBar.classList.add('pending');
                accountStatusText.textContent = 'Đang tạo hồ sơ thành viên...';
                accountRoleBadge.textContent = 'Đang xử lý';
                accountRoleBadge.className = 'account-role-badge teacher';
                accountGate.hidden = false;
                accountGateIcon.textContent = '⏳';
                accountGateTitle.textContent = 'Đang tạo hồ sơ';
                accountGateMessage.textContent = 'Vui lòng chờ hệ thống hoàn tất hồ sơ thành viên.';
                accountGatePrimaryBtn.textContent = 'Vui lòng chờ';
                accountGatePrimaryBtn.disabled = true;
                document.body.dataset.accountRole = 'guest';
                return;
            }

            accountProfileBtn.hidden = false;
            // Giáo viên không thấy chức năng kỹ thuật/quản trị nhóm. Admin cũng dùng một điểm vào duy nhất là “Quản trị nhóm”.
            accountSetupBtn.hidden = true;
            accountRoleBadge.textContent = accountRoleLabel(role);
            accountRoleBadge.className = `account-role-badge ${role}`;
            document.body.dataset.accountRole = role;

            if (status === 'pending') {
                accountBar.classList.add('pending');
                accountStatusText.textContent = `${account.group?.name || 'Nhóm giáo viên'} · Tài khoản đang chờ admin duyệt`;
                accountGate.hidden = false;
                accountGateIcon.textContent = '⏳';
                accountGateTitle.textContent = 'Tài khoản đang chờ duyệt';
                accountGateMessage.textContent = 'Admin đã nhận được tài khoản của thầy/cô. Sau khi được duyệt, trang sẽ tự mở quyền sử dụng nhóm.';
                accountGatePrimaryBtn.textContent = 'Xem hồ sơ';
            } else if (status === 'disabled') {
                accountBar.classList.add('disabled');
                accountStatusText.textContent = `${account.group?.name || 'Nhóm giáo viên'} · Tài khoản đã bị khóa`;
                accountGate.hidden = false;
                accountGateIcon.textContent = '🔒';
                accountGateTitle.textContent = 'Tài khoản đã bị khóa';
                accountGateMessage.textContent = 'Vui lòng liên hệ admin của nhóm để được mở lại tài khoản.';
                accountGatePrimaryBtn.textContent = 'Xem hồ sơ';
            } else {
                accountBar.classList.add('group-active');
                accountStatusText.textContent = `${account.group?.name || 'Nhóm giáo viên'} · ${account.user.email}`;
                teamAdminBtn.hidden = !accountCanManageGroup();
                if (!accountCanManageGroup() && !teamAdminModal.hidden) closeAppModal(teamAdminModal);
                cloudSyncBadge.hidden = false;
                setCloudSyncStatus(account.cloudStatus || 'syncing', account.cloudStatusMessage || 'Đang kết nối dữ liệu');
            }
        }

        function getAccountSetupHealth() {
            const account = state.account;
            const configured = isValidFirebaseConfig(account.config);
            const connected = Boolean(account.firebaseReady);
            const signedIn = Boolean(account.user);
            const profileStatus = cleanText(account.profile?.status);
            const activeMember = signedIn && profileStatus === 'active';
            const groupMode = account.accessMode === 'group';
            const syncDone = groupMode && activeMember && account.cloudStatus === 'synced'
                && account.sharedWorkItemsLoaded;
            const connectionError = account.status === 'error';
            const syncError = groupMode && (account.cloudStatus === 'error' || Boolean(state.workSyncError));
            const steps = [
                {
                    title: '1. Dự án Firebase',
                    description: configured ? `Đã nhận cấu hình ${account.config.projectId}` : 'Chưa có cấu hình dự án',
                    state: configured ? 'done' : 'active',
                    icon: configured ? '✓' : '1',
                },
                {
                    title: '2. Kết nối',
                    description: connectionError ? (account.errorMessage || 'Kết nối đang gặp lỗi')
                        : connected ? 'Firebase đã sẵn sàng' : configured ? 'Đang chờ kiểm tra kết nối' : 'Chờ bước 1',
                    state: connectionError ? 'error' : connected ? 'done' : configured ? 'active' : 'warning',
                    icon: connectionError ? '!' : connected ? '✓' : '2',
                },
                {
                    title: '3. Tài khoản',
                    description: activeMember ? `${account.user.email} · đang hoạt động`
                        : profileStatus === 'pending' ? 'Đã đăng ký · chờ admin duyệt'
                            : profileStatus === 'disabled' ? 'Tài khoản đang bị khóa'
                                : signedIn ? 'Đang tải hồ sơ thành viên' : connected ? 'Sẵn sàng đăng nhập hoặc đăng ký' : 'Chờ kết nối',
                    state: activeMember ? 'done'
                        : profileStatus === 'disabled' ? 'error'
                            : (signedIn || connected) ? 'active' : 'warning',
                    icon: activeMember ? '✓' : profileStatus === 'disabled' ? '!' : '3',
                },
                {
                    title: '4. Đồng bộ dữ liệu',
                    description: syncError ? (state.workSyncError || account.cloudStatusMessage || 'Đồng bộ đang gặp lỗi')
                        : syncDone ? 'Kế hoạch, sổ công việc và dữ liệu riêng đã đồng bộ'
                            : activeMember && !groupMode ? 'Tài khoản sẵn sàng · đang ở chế độ cá nhân'
                                : activeMember ? (account.cloudStatusMessage || 'Đang chuẩn bị đồng bộ') : 'Chờ tài khoản hoạt động',
                    state: syncError ? 'error' : syncDone ? 'done' : activeMember ? 'active' : 'warning',
                    icon: syncError ? '!' : syncDone ? '✓' : '4',
                },
            ];

            let recommendation;
            if (!configured) {
                recommendation = { action: 'save-config', label: 'Lưu cấu hình Firebase', text: 'Dán cấu hình dự án ở phần nâng cao rồi nhấn Lưu.', tone: 'warning' };
            } else if (connectionError || !connected) {
                recommendation = { action: 'retry-connection', label: 'Kiểm tra lại kết nối', text: 'Trang sẽ tự kiểm tra cấu hình và kết nối lại, không làm mất dữ liệu.', tone: connectionError ? 'error' : '' };
            } else if (!signedIn) {
                recommendation = { action: 'show-signin', label: 'Đăng nhập / Tạo tài khoản', text: 'Firebase đã kết nối. Bước tiếp theo chỉ cần đăng nhập hoặc tạo tài khoản giáo viên.', tone: '' };
            } else if (!account.profile) {
                recommendation = { action: 'retry-connection', label: 'Tải lại hồ sơ', text: 'Tài khoản đã đăng nhập; hệ thống đang hoàn tất hồ sơ thành viên.', tone: 'warning' };
            } else if (profileStatus === 'pending') {
                recommendation = { action: 'show-profile', label: 'Xem hồ sơ', text: 'Tài khoản đã tạo thành công và đang chờ admin duyệt.', tone: 'warning' };
            } else if (profileStatus === 'disabled') {
                recommendation = { action: 'show-profile', label: 'Xem hồ sơ', text: 'Tài khoản đang bị khóa; cần liên hệ admin để mở lại.', tone: 'error' };
            } else if (!groupMode) {
                recommendation = { action: 'activate-group', label: 'Bật chế độ nhóm', text: 'Tài khoản đã sẵn sàng. Bật chế độ nhóm để nhận kế hoạch tuần dùng chung.', tone: '' };
            } else if (state.workSyncError) {
                recommendation = { action: 'copy-rules', label: 'Sao chép quyền mới', text: 'Cập nhật Firestore Rules một lần để mở Sổ công việc nhóm.', tone: 'warning' };
            } else if (!syncDone) {
                recommendation = { action: 'retry-sync', label: 'Đồng bộ lại', text: syncError ? 'Hệ thống sẽ kết nối lại dữ liệu nhóm.' : 'Dữ liệu đang được tải; có thể nhấn đồng bộ lại nếu chờ lâu.', tone: syncError ? 'error' : '' };
            } else {
                recommendation = { action: 'close-account', label: 'Hoàn tất', text: 'Nhóm giáo viên và Sổ công việc đã sẵn sàng. Không cần cài thêm Firebase Functions.', tone: '' };
            }
            return { configured, steps, recommendation };
        }

        function renderAccountHealthItem(item) {
            return `<div class="account-health-item ${escapeHTML(item.state)}">
                <span class="account-health-icon" aria-hidden="true">${escapeHTML(item.icon)}</span>
                <div class="account-health-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.description)}</span></div>
            </div>`;
        }

        function renderAccountSetupView() {
            state.account.modalView = 'setup';
            const config = state.account.config;
            const health = getAccountSetupHealth();
            const recommendation = health.recommendation;
            accountModalTitle.textContent = 'Kiểm tra nhóm giáo viên';
            accountModalSubtitle.textContent = config?.projectId
                ? `Dự án ${config.projectId} · trang tự chỉ ra bước cần làm tiếp theo.`
                : 'Thiết lập Firebase Authentication và Firestore theo từng bước.';
            const configText = config ? JSON.stringify(config, null, 2) : '';
            accountModalBody.innerHTML = `
                <div class="account-health-grid">
                    ${health.steps.map(renderAccountHealthItem).join('')}
                </div>
                <div class="account-modal-alert ${escapeHTML(recommendation.tone)}">
                    <b>Việc cần làm tiếp:</b> ${escapeHTML(recommendation.text)}
                    ${state.account.setupCheckMessage ? `<div style="margin-top:5px;">${escapeHTML(state.account.setupCheckMessage)}</div>` : ''}
                </div>
                <div class="account-setup-actions">
                    <button class="btn btn-outline" type="button" data-account-action="open-firebase"
                            style="color:#1d4ed8;border-color:#93c5fd;">Mở Firebase Console</button>
                    <button class="btn btn-outline" type="button" data-account-action="copy-rules"
                            style="color:#1d4ed8;border-color:#93c5fd;">📋 Sao chép Firestore Rules</button>
                    <button class="btn btn-success" type="button" data-account-action="${escapeHTML(recommendation.action)}"
                            ${state.account.setupCheckBusy ? 'disabled' : ''}>${state.account.setupCheckBusy ? 'Đang kiểm tra…' : escapeHTML(recommendation.label)}</button>
                </div>
                <div class="account-simple-guide">
                    <strong>Thiết lập lần đầu chỉ gồm 3 việc:</strong><br>
                    1) Trong Firebase, bật đăng nhập <b>Email/Password</b> và tạo <b>Cloud Firestore</b>.<br>
                    2) Nhấn “Sao chép Firestore Rules”, dán vào mục Rules rồi Publish; bản quyền này bao gồm cả Sổ công việc nhóm.<br>
                    3) Quay lại trang, nhấn “Kiểm tra lại kết nối”, sau đó tạo tài khoản admin đầu tiên.<br>
                    Gemini API là key riêng của từng giáo viên; không cần cài kho API hay Firebase Functions.
                </div>
                <details class="account-advanced-config" ${health.configured ? '' : 'open'}>
                    <summary>Cấu hình nâng cao ${health.configured ? '· đã gắn sẵn, thường không cần sửa' : '· cần nhập cấu hình'}</summary>
                    <div class="account-advanced-config-body account-form-stack">
                        <div>
                            <label for="accountFirebaseConfigInput">Firebase Web Config</label>
                            <textarea id="accountFirebaseConfigInput" spellcheck="false"
                                placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }'>${escapeHTML(configText)}</textarea>
                        </div>
                        <div class="account-modal-alert">Đây là cấu hình nhận diện dự án, không phải Gemini API key.</div>
                        <div class="account-form-actions">
                            ${localStorage.getItem(ACCOUNT_CONFIG_STORAGE) ? `<button class="btn btn-outline" type="button" data-account-action="clear-config"
                                    style="color:#b91c1c;border-color:#fca5a5;">Bỏ cấu hình tùy chỉnh</button>` : ''}
                            <button class="btn btn-success" type="button" data-account-action="save-config">✓ Lưu cấu hình và kết nối</button>
                        </div>
                    </div>
                </details>`;
        }

        async function retryAccountSetupConnection() {
            if (state.account.setupCheckBusy) return;
            state.account.setupCheckBusy = true;
            state.account.setupCheckMessage = '';
            renderAccountSetupView();
            try {
                if (!isValidFirebaseConfig(state.account.config)) throw new Error('Chưa có cấu hình Firebase hợp lệ');
                if (!state.account.firebaseReady) {
                    state.account.initialized = false;
                    state.account.status = 'connecting';
                    state.account.errorMessage = '';
                    await initializeAccountSystem();
                } else if (state.account.user && state.account.modules?.firestoreModule) {
                    const snapshot = await state.account.modules.firestoreModule.getDoc(getAccountMemberRef(state.account.user.uid));
                    if (!snapshot.exists()) throw new Error('Chưa tìm thấy hồ sơ thành viên trong Firestore');
                    state.account.profile = { id: snapshot.id, ...snapshot.data() };
                    state.account.status = 'ready';
                }
                state.account.setupCheckMessage = state.account.firebaseReady
                    ? '✅ Kết nối Firebase hoạt động bình thường.'
                    : 'Đang hoàn tất kết nối; vui lòng chờ vài giây.';
                updateAccountPresentation();
            } catch (error) {
                state.account.status = 'error';
                state.account.errorMessage = translateAccountError(error);
                state.account.setupCheckMessage = '❌ ' + state.account.errorMessage;
                updateAccountPresentation();
            } finally {
                state.account.setupCheckBusy = false;
                if (!accountModal.hidden) renderAccountSetupView();
            }
        }

        function retryAccountCloudSync() {
            if (!accountCanUseGroup()) {
                showToast('Cần tài khoản đã được duyệt trước khi đồng bộ', 'info');
                renderAccountSetupView();
                return;
            }
            state.account.setupCheckMessage = '↻ Đang kết nối lại kế hoạch chung và dữ liệu riêng…';
            setAccountAccessMode('group', false);
            activateCloudDataSync();
            queueCloudWorkspaceSync();
            renderAccountSetupView();
            showToast('Đang đồng bộ lại dữ liệu nhóm', 'info');
        }

        function renderAccountAuthView(view = 'signin') {
            state.account.modalView = 'auth';
            state.account.authView = view === 'register' ? 'register' : 'signin';
            const register = state.account.authView === 'register';
            accountModalTitle.textContent = register ? 'Tạo tài khoản giáo viên' : 'Đăng nhập nhóm giáo viên';
            accountModalSubtitle.textContent = register
                ? 'Tài khoản đầu tiên là admin; tài khoản tiếp theo cần admin duyệt.'
                : `Kết nối với dự án ${state.account.config?.projectId || 'Firebase'}.`;
            accountModalBody.innerHTML = `
                <div class="account-mode-switch" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
                    <button type="button" class="${register ? '' : 'active'}" data-account-action="show-signin">Đăng nhập</button>
                    <button type="button" class="${register ? 'active' : ''}" data-account-action="show-register">Tạo tài khoản</button>
                </div>
                ${register ? '<div class="account-modal-alert warning">Nếu nhóm đã có admin, tài khoản mới sẽ ở trạng thái chờ duyệt.</div>' : ''}
                <form class="account-form-stack" id="accountAuthForm" data-account-form="${register ? 'register' : 'signin'}" novalidate>
                    ${register ? `<div><label for="accountAuthName">Họ và tên giáo viên</label>
                        <input id="accountAuthName" name="displayName" type="text" autocomplete="name" required placeholder="Ví dụ: Võ Viết Chương" /></div>` : ''}
                    <div><label for="accountAuthEmail">Email</label>
                        <input id="accountAuthEmail" name="email" type="email" autocomplete="email" required placeholder="giaovien@example.com" /></div>
                    <div><label for="accountAuthPassword">Mật khẩu</label>
                        <input id="accountAuthPassword" name="password" type="password" minlength="6"
                               autocomplete="${register ? 'new-password' : 'current-password'}" required placeholder="Ít nhất 6 ký tự" /></div>
                    ${register ? `<div><label for="accountAuthPasswordConfirm">Nhập lại mật khẩu</label>
                        <input id="accountAuthPasswordConfirm" name="passwordConfirm" type="password" minlength="6"
                               autocomplete="new-password" required /></div>` : ''}
                    <div class="account-form-actions">
                        ${register ? '' : '<button class="btn btn-outline" type="button" data-account-action="reset-password" style="color:#475569;border-color:#cbd5e1;">Quên mật khẩu</button>'}
                        <button class="btn btn-primary" type="submit">${register ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
                    </div>
                </form>`;
            setTimeout(() => $('#accountAuthEmail')?.focus(), 30);
        }

        function renderAccountProfileView() {
            state.account.modalView = 'profile';
            const profile = state.account.profile || {};
            const user = state.account.user;
            accountModalTitle.textContent = 'Hồ sơ tài khoản';
            accountModalSubtitle.textContent = user?.email || 'Thông tin thành viên nhóm giáo viên.';
            accountModalBody.innerHTML = `
                <div class="account-modal-alert ${profile.status === 'active' ? '' : 'warning'}">
                    Vai trò: <b>${escapeHTML(accountRoleLabel(profile.role))}</b> · Trạng thái: <b>${escapeHTML(accountStatusLabel(profile.status))}</b>
                </div>
                <form class="account-form-stack" id="accountProfileForm" data-account-form="profile" novalidate>
                    <div><label for="accountProfileName">Họ và tên</label>
                        <input id="accountProfileName" name="displayName" type="text" required value="${escapeHTML(profile.displayName || user?.displayName || '')}" /></div>
                    <div><label for="accountProfileSchool">Trường / đơn vị</label>
                        <input id="accountProfileSchool" name="schoolName" type="text" required value="${escapeHTML(profile.schoolName || state.teacherProfile.schoolName)}" /></div>
                    <div><label for="accountProfileSubject">Môn giảng dạy</label>
                        <input id="accountProfileSubject" name="subject" type="text" required value="${escapeHTML(profile.subject || state.teacherProfile.subject)}" /></div>
                    <div><label for="accountProfilePhone">Số điện thoại <small>(không bắt buộc)</small></label>
                        <input id="accountProfilePhone" name="phone" type="tel" autocomplete="tel" value="${escapeHTML(profile.phone || '')}" /></div>
                    <div class="account-form-actions">
                        <button class="btn btn-outline" type="button" data-account-action="signout-account" style="color:#b91c1c;border-color:#fca5a5;">Đăng xuất</button>
                        <button class="btn btn-outline" type="button" data-account-action="close-account" style="color:#475569;border-color:#cbd5e1;">Đóng</button>
                        <button class="btn btn-success" type="submit">💾 Lưu hồ sơ</button>
                    </div>
                </form>`;
        }

        function openAccountModal(view = '') {
            let requested = view || (!isValidFirebaseConfig(state.account.config)
                ? 'setup' : state.account.user ? 'profile' : 'signin');
            const activeTeacher = state.account.accessMode === 'group'
                && state.account.profile?.status === 'active'
                && state.account.profile?.role !== 'admin';
            if (requested === 'setup' && activeTeacher && isValidFirebaseConfig(state.account.config)) {
                requested = 'profile';
                showToast('Thiết lập và kiểm tra nhóm chỉ dành cho quản trị viên', 'info');
            }
            if (requested === 'setup') renderAccountSetupView();
            else if (requested === 'profile') renderAccountProfileView();
            else renderAccountAuthView(requested);
            openAppModal(accountModal, accountModalBody.querySelector('input,textarea,button'));
        }

        function renderTeamAdminView() {
            if (!accountCanManageGroup()) {
                closeAppModal(teamAdminModal);
                showToast('Chỉ admin đang hoạt động mới được quản trị thành viên', 'error');
                return;
            }
            const members = [...state.account.members].sort((a, b) => {
                const statusOrder = { pending: 0, active: 1, disabled: 2 };
                const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
                return statusDiff || cleanText(a.displayName).localeCompare(cleanText(b.displayName), 'vi');
            });
            const counts = {
                active: members.filter(item => item.status === 'active').length,
                pending: members.filter(item => item.status === 'pending').length,
                admin: members.filter(item => item.role === 'admin' && item.status === 'active').length,
            };
            teamAdminModalSubtitle.textContent = state.account.group?.name || 'Duyệt tài khoản và phân quyền thành viên.';
            const rows = members.map(member => {
                const isSelf = member.uid === state.account.user?.uid;
                const status = ['active', 'pending', 'disabled'].includes(member.status) ? member.status : 'pending';
                return `<tr>
                    <td><div class="team-member-name"><strong>${escapeHTML(member.displayName || 'Chưa cập nhật tên')}</strong>
                        <span>${escapeHTML(member.email || member.uid)}</span></div></td>
                    <td><span class="member-status-badge ${status}">${escapeHTML(accountStatusLabel(status))}</span></td>
                    <td><select class="member-role-select" data-member-role data-member-uid="${escapeHTML(member.uid)}" ${isSelf ? 'disabled title="Không thể tự hạ quyền"' : ''}>
                        <option value="teacher" ${member.role === 'teacher' ? 'selected' : ''}>Giáo viên</option>
                        <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select></td>
                    <td><div class="member-action-group">
                        ${status === 'pending' ? `<button class="btn btn-success btn-sm" type="button" data-member-action="approve" data-member-uid="${escapeHTML(member.uid)}">✓ Duyệt</button>` : ''}
                        ${status === 'active' && !isSelf ? `<button class="btn btn-danger btn-sm" type="button" data-member-action="disable" data-member-uid="${escapeHTML(member.uid)}">Khóa</button>` : ''}
                        ${status === 'disabled' ? `<button class="btn btn-outline btn-sm" type="button" data-member-action="enable" data-member-uid="${escapeHTML(member.uid)}" style="color:#166534;border-color:#86efac;">Mở lại</button>` : ''}
                        ${isSelf ? '<span class="text-muted" style="font-size:11px;">Tài khoản hiện tại</span>' : ''}
                    </div></td>
                </tr>`;
            }).join('');
            teamAdminModalBody.innerHTML = `
                <div class="team-summary-grid">
                    <div class="team-summary-item"><strong>${counts.active}</strong><span>Đang hoạt động</span></div>
                    <div class="team-summary-item"><strong>${counts.pending}</strong><span>Chờ duyệt</span></div>
                    <div class="team-summary-item"><strong>${counts.admin}</strong><span>Quản trị viên</span></div>
                </div>
                <div class="account-setup-actions role-admin-tools" style="margin:0 0 14px;">
                    <button class="btn btn-outline btn-sm" type="button" data-team-action="check-group"
                            style="color:#1d4ed8;border-color:#93c5fd;">🩺 Kiểm tra kết nối nhóm</button>
                    <span class="text-muted" style="font-size:12px;">Công cụ kỹ thuật chỉ hiển thị với quản trị viên.</span>
                </div>
                <div class="account-form-stack" style="margin-bottom:14px;">
                    <div><label for="teamNameInput">Tên nhóm giáo viên</label>
                        <div class="flex-center" style="justify-content:flex-start;">
                            <input id="teamNameInput" type="text" value="${escapeHTML(state.account.group?.name || 'Nhóm giáo viên')}" style="flex:1 1 260px;" />
                            <button class="btn btn-primary btn-sm" type="button" data-team-action="save-name">Lưu tên nhóm</button>
                        </div>
                    </div>
                </div>
                <div class="table-wrap"><table class="team-member-table">
                    <thead><tr><th>Thành viên</th><th>Trạng thái</th><th>Vai trò</th><th>Thao tác</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="4" class="text-center text-muted">Đang tải danh sách thành viên...</td></tr>'}</tbody>
                </table></div>`;
        }

        function openTeamAdminModal() {
            renderTeamAdminView();
            if (accountCanManageGroup()) {
                openAppModal(teamAdminModal, teamAdminModalBody.querySelector('button,input,select'));
            }
        }

        async function discoverFirebaseConfig() {
            const injected = normalizeFirebaseConfig(window.TEACHER_NOTEBOOK_FIREBASE_CONFIG);
            if (injected) return injected;
            const stored = normalizeFirebaseConfig(readStoredJSON(ACCOUNT_CONFIG_STORAGE, null));
            if (stored) return stored;
            if (!/^https?:$/i.test(location.protocol)) return null;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);
            try {
                const response = await fetch('/__/firebase/init.json', {
                    cache: 'no-store',
                    credentials: 'same-origin',
                    signal: controller.signal,
                });
                if (!response.ok) return null;
                return normalizeFirebaseConfig(await response.json());
            } catch (error) {
                return null;
            } finally {
                clearTimeout(timeout);
            }
        }

        async function loadFirebaseAccountModules() {
            if (state.account.modules) return state.account.modules;
            const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
            const [appModule, authModule, firestoreModule] = await Promise.all([
                import(`${base}/firebase-app.js`),
                import(`${base}/firebase-auth.js`),
                import(`${base}/firebase-firestore.js`),
            ]);
            state.account.modules = { appModule, authModule, firestoreModule };
            return state.account.modules;
        }

        function getAccountGroupRef() {
            const { firestoreModule } = state.account.modules || {};
            return firestoreModule?.doc?.(state.account.db, ACCOUNT_COLLECTION, ACCOUNT_GROUP_ID) || null;
        }

        function getAccountMemberRef(uid) {
            const { firestoreModule } = state.account.modules || {};
            const groupRef = getAccountGroupRef();
            return groupRef && uid ? firestoreModule.doc(groupRef, 'members', uid) : null;
        }

        function getSharedYearRef(academicYear = state.selectedAcademicYear) {
            const { firestoreModule } = state.account.modules || {};
            const groupRef = getAccountGroupRef();
            const normalizedYear = normalizeAcademicYear(academicYear);
            return groupRef && normalizedYear ? firestoreModule.doc(groupRef, 'sharedYears', normalizedYear) : null;
        }

        function getSharedWorkItemsRef(academicYear = state.selectedAcademicYear) {
            const { firestoreModule } = state.account.modules || {};
            const sharedYearRef = getSharedYearRef(academicYear);
            return sharedYearRef ? firestoreModule.collection(sharedYearRef, 'workItems') : null;
        }

        function getPersonalYearRef(uid = state.account.user?.uid, academicYear = state.selectedAcademicYear) {
            const { firestoreModule } = state.account.modules || {};
            const memberRef = getAccountMemberRef(uid);
            const normalizedYear = normalizeAcademicYear(academicYear);
            return memberRef && normalizedYear ? firestoreModule.doc(memberRef, 'yearWorkspaces', normalizedYear) : null;
        }

        function cloudPayloadHash(value) {
            try { return JSON.stringify(value); } catch (error) { return ''; }
        }

        function normalizeSharedYearPayload(data, academicYear = state.selectedAcademicYear) {
            const normalizedYear = normalizeAcademicYear(academicYear) || state.selectedAcademicYear;
            return {
                schemaVersion: 3,
                academicYear: normalizedYear,
                week1Start: alignISODateToMonday(data?.week1Start),
                planData: Array.isArray(data?.planData)
                    ? data.planData.map(normalizePlanWeek).filter(Boolean).sort((a, b) => a.week - b.week)
                    : [],
            };
        }

        function cloneSharedYearPayload(payload) {
            return JSON.parse(JSON.stringify(normalizeSharedYearPayload(payload, payload?.academicYear)));
        }

        function hasSharedPlanContent(payload) {
            return Boolean(payload?.week1Start || payload?.planData?.length);
        }

        function buildSharedYearPayload(academicYear = state.selectedAcademicYear) {
            const workspace = state.yearWorkspaces[academicYear] || getActiveYearWorkspace();
            return normalizeSharedYearPayload({
                week1Start: alignISODateToMonday(workspace?.week1Start),
                planData: Array.isArray(workspace?.planData)
                    ? workspace.planData.map(normalizePlanWeek).filter(Boolean).sort((a, b) => a.week - b.week)
                    : [],
            }, academicYear);
        }

        function readSharedPlanHistoryStore() {
            const stored = readStoredJSON(SHARED_PLAN_HISTORY_STORAGE, {});
            return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
        }

        function getSharedPlanHistory(academicYear = state.selectedAcademicYear) {
            const history = readSharedPlanHistoryStore()[academicYear];
            return Array.isArray(history) ? history.filter(entry => entry?.payload) : [];
        }

        function saveSharedPlanHistorySnapshot(payload, reason, metadata = {}) {
            const normalized = normalizeSharedYearPayload(payload, payload?.academicYear || state.selectedAcademicYear);
            if (!hasSharedPlanContent(normalized)) return false;
            const academicYear = normalized.academicYear;
            const store = readSharedPlanHistoryStore();
            const entries = Array.isArray(store[academicYear]) ? store[academicYear] : [];
            const payloadHash = cloudPayloadHash(normalized);
            if (entries[0]?.payloadHash === payloadHash) return true;
            const entry = {
                id: `${Date.now()}-${Number(metadata.revision) || 0}`,
                academicYear,
                savedAt: new Date().toISOString(),
                reason: cleanText(reason) || 'Bản sao trước đồng bộ',
                revision: Number(metadata.revision) || 0,
                updatedByName: cleanText(metadata.updatedByName),
                payloadHash,
                payload: cloneSharedYearPayload(normalized),
            };
            store[academicYear] = [entry, ...entries].slice(0, SHARED_PLAN_HISTORY_LIMIT);
            if (!writeStoredJSON(SHARED_PLAN_HISTORY_STORAGE, store)) {
                store[academicYear] = store[academicYear].slice(0, 2);
                if (!writeStoredJSON(SHARED_PLAN_HISTORY_STORAGE, store)) return false;
            }
            updateSharedSyncProtectionPanel();
            return true;
        }

        function removeSharedPlanHistoryEntry(academicYear, entryId) {
            const store = readSharedPlanHistoryStore();
            const entries = Array.isArray(store[academicYear]) ? store[academicYear] : [];
            store[academicYear] = entries.filter(entry => entry?.id !== entryId);
            writeStoredJSON(SHARED_PLAN_HISTORY_STORAGE, store);
        }

        function cloudTimestampToDate(value) {
            if (!value) return null;
            const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
            return Number.isNaN(date?.getTime?.()) ? null : date;
        }

        function resolveSharedEditorName(uid, explicitName = '') {
            if (cleanText(explicitName)) return cleanText(explicitName);
            if (uid && uid === state.account.user?.uid) {
                return cleanText(state.account.profile?.displayName || state.account.user?.displayName || 'Tài khoản hiện tại');
            }
            const member = state.account.members.find(item => item.uid === uid || item.id === uid);
            return cleanText(member?.displayName) || (uid ? 'Quản trị viên khác' : 'Chưa xác định');
        }

        function updateSharedSyncProtectionPanel() {
            if (!sharedSyncProtectionPanel) return;
            const activeGroup = state.account.accessMode === 'group'
                && state.account.profile?.status === 'active';
            sharedSyncProtectionPanel.hidden = !activeGroup;
            if (!activeGroup) return;
            const conflict = state.account.sharedConflict;
            const admin = state.account.profile?.role === 'admin';
            const history = getSharedPlanHistory(state.selectedAcademicYear);
            acceptSharedServerBtn.hidden = !conflict;
            keepSharedLocalBtn.hidden = !conflict || !admin;
            restoreSharedPlanBtn.hidden = Boolean(conflict) || !admin || history.length === 0;
            restoreSharedPlanBtn.disabled = state.account.sharedWriteBusy;
            keepSharedLocalBtn.disabled = state.account.sharedWriteBusy;
            acceptSharedServerBtn.disabled = state.account.sharedWriteBusy;

            if (conflict) {
                const editor = resolveSharedEditorName(conflict.serverUpdatedBy, conflict.serverUpdatedByName);
                const updated = cloudTimestampToDate(conflict.serverUpdatedAt);
                sharedSyncProtectionPanel.className = 'shared-sync-protection conflict';
                sharedSyncProtectionIcon.textContent = '⚠️';
                sharedSyncProtectionTitle.textContent = 'Phát hiện thay đổi từ quản trị viên khác';
                sharedSyncProtectionMeta.textContent = `Bản trên đám mây là phiên bản ${conflict.serverRevision || 1}, do ${editor} cập nhật${updated ? ` lúc ${updated.toLocaleString('vi-VN')}` : ''}. Thay đổi trên máy này đang được giữ an toàn và chưa ghi đè.`;
                return;
            }

            const revision = Number(state.account.sharedRevision) || 0;
            const editor = resolveSharedEditorName(state.account.sharedUpdatedBy, state.account.sharedUpdatedByName);
            const updated = cloudTimestampToDate(state.account.sharedUpdatedAt);
            sharedSyncProtectionPanel.className = 'shared-sync-protection';
            sharedSyncProtectionIcon.textContent = '🛡️';
            sharedSyncProtectionTitle.textContent = revision
                ? `Đồng bộ an toàn · phiên bản ${revision}`
                : 'Đồng bộ an toàn · chưa có phiên bản trên đám mây';
            sharedSyncProtectionMeta.textContent = revision
                ? `Cập nhật gần nhất bởi ${editor}${updated ? ` lúc ${updated.toLocaleString('vi-VN')}` : ''}. ${history.length ? `Thiết bị đang giữ ${history.length} bản có thể hoàn tác.` : 'Chưa có bản hoàn tác trên thiết bị này.'}`
                : admin ? 'Kế hoạch đầu tiên sẽ được tạo bằng giao dịch an toàn.' : 'Đang chờ quản trị viên tạo kế hoạch dùng chung.';
        }

        function buildPersonalYearPayload(academicYear = state.selectedAcademicYear) {
            const workspace = state.yearWorkspaces[academicYear] || getActiveYearWorkspace();
            const normalized = normalizeYearWorkspace(workspace);
            return {
                schemaVersion: 3,
                academicYear,
                timetablesByWeek: normalized.timetablesByWeek,
                curriculumText: normalized.curriculumText,
                curriculumProfiles: normalized.curriculumProfiles,
                teachingSchedule: normalized.teachingSchedule,
                scheduleMeta: normalized.scheduleMeta,
                workItems: normalized.workItems,
                selectedTimetableWeek: normalized.selectedTimetableWeek,
                selectedTeachingWeek: normalized.selectedTeachingWeek,
            };
        }

        function accountCloudSyncEnabled() {
            return Boolean(state.account.accessMode === 'group'
                && state.account.firebaseReady
                && state.account.db
                && state.account.user
                && state.account.profile?.status === 'active');
        }

        function canEditSharedPlan() {
            if (state.account.accessMode !== 'group') return true;
            return Boolean(state.account.profile?.status === 'active'
                && state.account.profile?.role === 'admin'
                && !state.account.sharedConflict
                && !state.account.sharedWriteBusy);
        }

        function showSharedPlanReadOnlyNotice() {
            if (state.account.sharedConflict) {
                showToast('⚠️ Hãy chọn cách xử lý thay đổi trên bảng “Đồng bộ an toàn” trước khi sửa tiếp', 'info');
                return;
            }
            if (state.account.sharedWriteBusy) {
                showToast('⌛ Kế hoạch đang được lưu an toàn, vui lòng chờ trong giây lát', 'info');
                return;
            }
            showToast('🔒 Kế hoạch tuần dùng chung chỉ quản trị viên được chỉnh sửa', 'info');
        }

        function updateSharedPlanEditingControls() {
            const editable = canEditSharedPlan();
            if (planFileInput) planFileInput.disabled = !editable || state.busy.plan;
            if (planUploadZone) {
                planUploadZone.classList.toggle('read-only', !editable);
                planUploadZone.setAttribute('aria-disabled', String(!editable));
                planUploadZone.title = editable
                    ? 'Tải ảnh kế hoạch tuần'
                    : 'Kế hoạch dùng chung chỉ admin được chỉnh sửa';
            }
            if (clearPlanBtn) clearPlanBtn.disabled = !editable;
            if (week1StartDateInput) week1StartDateInput.disabled = !editable;
            if (saveWeek1StartBtn) saveWeek1StartBtn.disabled = !editable;
            if (sharedPlanModeNote) {
                sharedPlanModeNote.textContent = state.account.accessMode === 'group'
                    ? state.account.sharedConflict
                        ? 'Kế hoạch dùng chung · tạm khóa chỉnh sửa để xử lý xung đột'
                        : editable
                        ? 'Kế hoạch dùng chung · admin đang có quyền cập nhật'
                        : 'Kế hoạch dùng chung · giáo viên chỉ xem'
                    : 'Dữ liệu cá nhân đang lưu trên máy này';
            }
            updateSharedSyncProtectionPanel();
        }

        function setCloudSyncStatus(status, message) {
            state.account.cloudStatus = status;
            state.account.cloudStatusMessage = message;
            if (!cloudSyncBadge) return;
            cloudSyncBadge.className = `cloud-sync-badge ${status}`;
            cloudSyncBadge.textContent = status === 'syncing' ? `↻ ${message}`
                : status === 'error' || status === 'conflict' ? `⚠ ${message}` : `☁️ ${message}`;
            cloudSyncBadge.title = message;
            if (!accountModal.hidden && state.account.modalView === 'setup' && !state.account.setupCheckBusy) {
                renderAccountSetupView();
            }
        }

        let preCloudBackupPromise = null;
        async function savePreCloudSyncBackupOnce() {
            const storageApi = window.teacherNotebookIndexedDB;
            try {
                if (storageApi && await storageApi.hasBackup(PRE_CLOUD_SYNC_BACKUP_KEY)) return true;
                if (!storageApi && localStorage.getItem(PRE_CLOUD_SYNC_BACKUP_KEY)) return true;
                if (!preCloudBackupPromise) {
                    const payload = createBackupPayload();
                    preCloudBackupPromise = storageApi
                        ? storageApi.setBackup(PRE_CLOUD_SYNC_BACKUP_KEY, payload)
                        : Promise.resolve(writeStoredJSON(PRE_CLOUD_SYNC_BACKUP_KEY, payload));
                }
                const saved = await preCloudBackupPromise;
                if (saved && exportPreCloudBackupBtn) exportPreCloudBackupBtn.hidden = false;
                if (!saved) showToast('⚠️ Chưa thể đồng bộ vì trình duyệt không tạo được bản sao dữ liệu an toàn', 'error');
                return Boolean(saved);
            } catch (error) {
                preCloudBackupPromise = null;
                window.teacherNotebookRecordError?.('pre-cloud-backup', error);
                showToast('⚠️ Chưa thể đồng bộ vì không tạo được bản sao dữ liệu an toàn', 'error');
                return false;
            }
        }

        function stopCloudWorkspaceSync() {
            if (state.account.syncTimer) clearTimeout(state.account.syncTimer);
            state.account.syncTimer = null;
            stopAccountSubscription('sharedYearUnsubscribe');
            stopAccountSubscription('personalYearUnsubscribe');
            stopAccountSubscription('sharedWorkItemsUnsubscribe');
            state.account.syncYear = '';
            state.account.syncApplyingRemote = false;
            state.account.sharedYearLoaded = false;
            state.account.personalYearLoaded = false;
            state.account.sharedWorkItemsLoaded = false;
            state.account.sharedYearExists = false;
            state.account.personalYearExists = false;
            state.account.lastSharedHash = '';
            state.account.lastPersonalHash = '';
            state.account.sharedRevision = 0;
            state.account.sharedBasePayload = null;
            state.account.sharedUpdatedAt = null;
            state.account.sharedUpdatedBy = '';
            state.account.sharedUpdatedByName = '';
            state.account.sharedConflict = null;
            state.account.sharedWriteBusy = false;
            state.account.sharedPendingWriteHash = '';
            state.sharedWorkItems = [];
            state.workSyncError = '';
            updateSharedPlanEditingControls();
            renderWorkWorkspace();
        }

        function refreshViewsAfterCloudWorkspace(sharedChanged = false, personalChanged = false) {
            if (sharedChanged) {
                updateSchoolYearWeekInfo();
                renderPlanTable();
            }
            if (personalChanged) {
                populateTimetableWeekSelect();
                activateTimetableWeek(state.selectedTimetableWeek || 1, false);
                renderCurriculumProfiles();
                populateWeekSelect();
                const workspace = getActiveYearWorkspace();
                const selectedTeachingWeek = workspace?.selectedTeachingWeek;
                if (selectedTeachingWeek
                    && scheduleWeekSelect.querySelector(`option[value="${selectedTeachingWeek}"]`)) {
                    scheduleWeekSelect.value = String(selectedTeachingWeek);
                    localStorage.setItem('teacher_selected_week', String(selectedTeachingWeek));
                    if (state.teachingSchedule[selectedTeachingWeek]?.length) {
                        renderTeachingSchedule(selectedTeachingWeek);
                    } else {
                        updateScheduleToolbar(selectedTeachingWeek);
                    }
                } else {
                    scheduleWeekSelect.value = '';
                    localStorage.removeItem('teacher_selected_week');
                    scheduleDisplay.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">Chọn tuần và nhấn “Tạo lịch báo giảng”</p>';
                    updateScheduleToolbar(null);
                }
                initializeProgressDashboardControls();
                renderProgressDashboard();
            }
            updateDataSafetySummary();
            if (typeof renderYearDashboard === 'function') renderYearDashboard();
        }

        async function applySharedYearSnapshot(data, academicYear, options = {}) {
            try {

                if (state.account.syncYear !== academicYear || state.selectedAcademicYear !== academicYear) return;
                const previousPayload = buildSharedYearPayload(academicYear);
                const workspace = ensureYearWorkspace(academicYear);
                const nextPayload = normalizeSharedYearPayload(data, academicYear);
                const changed = cloudPayloadHash(previousPayload) !== cloudPayloadHash(nextPayload);
                if (!await savePreCloudSyncBackupOnce()) return;
                if (changed && !options.skipHistory && state.account.profile?.role === 'admin') {
                    saveSharedPlanHistorySnapshot(previousPayload, 'Trước khi nhận phiên bản mới', {
                        revision: state.account.sharedRevision,
                        updatedByName: state.account.sharedUpdatedByName,
                    });
                }
                state.account.syncApplyingRemote = true;
                workspace.week1Start = nextPayload.week1Start;
                workspace.planData = nextPayload.planData;
                state.planData = workspace.planData;
                syncPlanDatesForActiveYear();
                persistActiveYearWorkspace();
                persistLegacyActiveYear();
                refreshViewsAfterCloudWorkspace(true, false);
                state.account.syncApplyingRemote = false;
                state.account.lastSharedHash = cloudPayloadHash(nextPayload);
                state.account.sharedRevision = Number(data?.revision) || 0;
                state.account.sharedBasePayload = cloneSharedYearPayload(nextPayload);
                state.account.sharedUpdatedAt = data?.updatedAt || null;
                state.account.sharedUpdatedBy = cleanText(data?.updatedBy);
                state.account.sharedUpdatedByName = cleanText(data?.updatedByName);
                updateSharedPlanEditingControls();
                if (changed && Object.keys(state.teachingSchedule || {}).length > 0) {
                    invalidateTeachingSchedules('Kế hoạch tuần dùng chung đã được cập nhật');
                }
            } catch (error) {
                state.account.syncApplyingRemote = false;
                console.error('Không thể áp dụng kế hoạch dùng chung:', error);
                window.teacherNotebookRecordError?.('cloud-sync', error, { source: 'Không thể áp dụng kế hoạch dùng chung' });
                setCloudSyncStatus('error', translateAccountError(error));
            }
        }

        async function applyPersonalYearSnapshot(data, academicYear) {
            try {

                if (state.account.syncYear !== academicYear || state.selectedAcademicYear !== academicYear) return;
                if (!await savePreCloudSyncBackupOnce()) return;
                const workspace = ensureYearWorkspace(academicYear);
                const normalized = normalizeYearWorkspace({
                    ...data,
                    week1Start: workspace.week1Start,
                    planData: workspace.planData,
                });
                state.account.syncApplyingRemote = true;
                workspace.timetablesByWeek = normalized.timetablesByWeek;
                workspace.curriculumText = normalized.curriculumText;
                workspace.curriculumProfiles = normalized.curriculumProfiles;
                workspace.teachingSchedule = normalized.teachingSchedule;
                workspace.scheduleMeta = normalized.scheduleMeta;
                workspace.workItems = normalized.workItems;
                workspace.selectedTimetableWeek = normalized.selectedTimetableWeek;
                workspace.selectedTeachingWeek = normalized.selectedTeachingWeek;
                applyYearWorkspaceToRuntime(workspace, { includePlan:false });
                persistActiveYearWorkspace();
                persistLegacyActiveYear();
                refreshViewsAfterCloudWorkspace(false, true);
                state.account.syncApplyingRemote = false;
                state.account.lastPersonalHash = cloudPayloadHash(buildPersonalYearPayload(academicYear));
                renderWorkWorkspace();
            } catch (error) {
                state.account.syncApplyingRemote = false;
                console.error('Không thể áp dụng dữ liệu cá nhân:', error);
                window.teacherNotebookRecordError?.('cloud-sync', error, { source: 'Không thể áp dụng dữ liệu cá nhân' });
                setCloudSyncStatus('error', translateAccountError(error));
            }
        }

        function registerSharedPlanConflict(serverData, localPayload, academicYear) {
            const serverPayload = normalizeSharedYearPayload(serverData, academicYear);
            const serverHash = cloudPayloadHash(serverPayload);
            const previousConflictHash = state.account.sharedConflict?.serverHash;
            state.account.sharedConflict = {
                academicYear,
                detectedAt: new Date().toISOString(),
                baseRevision: Number(state.account.sharedRevision) || 0,
                serverRevision: Number(serverData?.revision) || 0,
                serverUpdatedAt: serverData?.updatedAt || null,
                serverUpdatedBy: cleanText(serverData?.updatedBy),
                serverUpdatedByName: cleanText(serverData?.updatedByName),
                serverHash,
                serverPayload: cloneSharedYearPayload(serverPayload),
                localPayload: cloneSharedYearPayload(localPayload),
            };
            setCloudSyncStatus('conflict', 'Có thay đổi cần xử lý');
            updateSharedPlanEditingControls();
            if (previousConflictHash !== serverHash) {
                showToast('⚠️ Có quản trị viên khác vừa cập nhật kế hoạch. Thay đổi của thầy đang được giữ an toàn.', 'info');
            }
        }

        function handleSharedYearSnapshot(data, academicYear) {
            const incomingPayload = normalizeSharedYearPayload(data, academicYear);
            const incomingHash = cloudPayloadHash(incomingPayload);
            const localPayload = buildSharedYearPayload(academicYear);
            const localHash = cloudPayloadHash(localPayload);
            const baseHash = state.account.lastSharedHash;
            const admin = state.account.profile?.role === 'admin';

            if (state.account.sharedPendingWriteHash && incomingHash === state.account.sharedPendingWriteHash) {
                state.account.sharedConflict = null;
                applySharedYearSnapshot(data, academicYear, { skipHistory: true });
                return;
            }

            if (state.account.sharedConflict) {
                registerSharedPlanConflict(data, state.account.sharedConflict.localPayload, academicYear);
                return;
            }

            const serverDiffersFromBase = baseHash ? incomingHash !== baseHash : incomingHash !== localHash;
            const localDiffersFromBase = baseHash
                ? localHash !== baseHash
                : hasSharedPlanContent(localPayload) && localHash !== incomingHash;
            if (admin && serverDiffersFromBase && localDiffersFromBase) {
                registerSharedPlanConflict(data, localPayload, academicYear);
                return;
            }
            applySharedYearSnapshot(data, academicYear);
        }

        async function writeSharedPlanSafely(sharedRef, payload, academicYear, options = {}) {
            const { firestoreModule } = state.account.modules;
            const normalizedPayload = normalizeSharedYearPayload(payload, academicYear);
            const localHash = cloudPayloadHash(normalizedPayload);
            const baseHash = state.account.lastSharedHash;
            const baseRevision = Number(state.account.sharedRevision) || 0;
            const editorName = cleanText(
                state.account.profile?.displayName
                || state.account.user?.displayName
                || state.account.user?.email
            ) || 'Quản trị viên';
            if (state.account.sharedBasePayload) {
                saveSharedPlanHistorySnapshot(state.account.sharedBasePayload, 'Trước khi ghi kế hoạch lên đám mây', {
                    revision: baseRevision,
                    updatedByName: state.account.sharedUpdatedByName,
                });
            }
            state.account.sharedWriteBusy = true;
            state.account.sharedPendingWriteHash = localHash;
            updateSharedPlanEditingControls();
            let detectedConflict = null;
            try {
                const result = await firestoreModule.runTransaction(state.account.db, async transaction => {
                    const snapshot = await transaction.get(sharedRef);
                    const serverData = snapshot.exists() ? snapshot.data() : null;
                    const serverPayload = normalizeSharedYearPayload(serverData || {}, academicYear);
                    const serverHash = snapshot.exists() ? cloudPayloadHash(serverPayload) : '';
                    const serverRevision = Number(serverData?.revision) || 0;
                    const serverChanged = snapshot.exists()
                        && serverHash !== baseHash
                        && serverHash !== localHash;
                    if (!options.force && serverChanged) {
                        detectedConflict = { serverData, serverPayload };
                        const conflictError = new Error('Kế hoạch trên đám mây đã có phiên bản mới hơn');
                        conflictError.name = 'SharedPlanConflictError';
                        throw conflictError;
                    }
                    const nextRevision = Math.max(baseRevision, serverRevision) + 1;
                    transaction.set(sharedRef, {
                        ...normalizedPayload,
                        revision: nextRevision,
                        updatedAt: firestoreModule.serverTimestamp(),
                        updatedBy: state.account.user.uid,
                        updatedByName: editorName,
                    }, { merge: true });
                    return { nextRevision, serverPayload, serverData };
                });

                if (options.force && result.serverData) {
                    saveSharedPlanHistorySnapshot(result.serverPayload, 'Bản trên đám mây trước khi xác nhận ghi đè', {
                        revision: Number(result.serverData.revision) || 0,
                        updatedByName: cleanText(result.serverData.updatedByName),
                    });
                }
                state.account.lastSharedHash = localHash;
                state.account.sharedRevision = result.nextRevision;
                state.account.sharedBasePayload = cloneSharedYearPayload(normalizedPayload);
                state.account.sharedUpdatedAt = new Date();
                state.account.sharedUpdatedBy = state.account.user.uid;
                state.account.sharedUpdatedByName = editorName;
                state.account.sharedYearExists = true;
                state.account.sharedConflict = null;
                return true;
            } catch (error) {
                if (detectedConflict) {
                    registerSharedPlanConflict(detectedConflict.serverData, normalizedPayload, academicYear);
                    return false;
                }
                throw error;
            } finally {
                state.account.sharedWriteBusy = false;
                state.account.sharedPendingWriteHash = '';
                updateSharedPlanEditingControls();
            }
        }

        function acceptSharedServerVersion() {
            const conflict = state.account.sharedConflict;
            if (!conflict || conflict.academicYear !== state.selectedAcademicYear) return;
            saveSharedPlanHistorySnapshot(conflict.localPayload, 'Thay đổi trên máy trước khi tải bản đám mây', {
                revision: conflict.baseRevision,
                updatedByName: state.account.profile?.displayName,
            });
            state.account.sharedConflict = null;
            applySharedYearSnapshot({
                ...conflict.serverPayload,
                revision: conflict.serverRevision,
                updatedAt: conflict.serverUpdatedAt,
                updatedBy: conflict.serverUpdatedBy,
                updatedByName: conflict.serverUpdatedByName,
            }, conflict.academicYear, { skipHistory: true });
            setCloudSyncStatus('synced', 'Đã tải phiên bản mới trên đám mây');
            showToast('✅ Đã tải bản kế hoạch mới; thay đổi trên máy đã được lưu vào lịch sử hoàn tác', 'success');
        }

        async function keepSharedLocalVersion() {
            const conflict = state.account.sharedConflict;
            if (!conflict || state.account.profile?.role !== 'admin' || state.account.sharedWriteBusy) return;
            if (!confirm('Giữ thay đổi trên máy và tạo phiên bản mới hơn trên đám mây? Bản hiện tại trên đám mây sẽ được lưu vào lịch sử hoàn tác.')) return;
            setCloudSyncStatus('syncing', 'Đang tạo phiên bản mới an toàn');
            try {
                const sharedRef = getSharedYearRef(conflict.academicYear);
                const saved = await writeSharedPlanSafely(sharedRef, conflict.localPayload, conflict.academicYear, { force: true });
                if (saved) {
                    setCloudSyncStatus('synced', 'Đã giữ thay đổi và tạo phiên bản mới');
                    showToast('✅ Đã tạo phiên bản kế hoạch mới; không làm mất bản cũ', 'success');
                }
            } catch (error) {
                console.error('Không thể giữ thay đổi cục bộ:', error);
                setCloudSyncStatus('error', translateAccountError(error));
                showToast('❌ ' + translateAccountError(error), 'error');
            }
        }

        function restoreLatestSharedPlanVersion() {
            if (state.account.profile?.role !== 'admin' || state.account.sharedConflict || state.account.sharedWriteBusy) return;
            const history = getSharedPlanHistory(state.selectedAcademicYear);
            const entry = history[0];
            if (!entry?.payload) {
                showToast('Chưa có bản kế hoạch nào để hoàn tác', 'info');
                return;
            }
            const savedAt = cloudTimestampToDate(entry.savedAt);
            if (!confirm(`Khôi phục bản kế hoạch ${savedAt ? `lưu lúc ${savedAt.toLocaleString('vi-VN')}` : 'gần nhất'}? Phiên bản hiện tại vẫn sẽ được sao lưu.`)) return;
            const academicYear = state.selectedAcademicYear;
            const payload = normalizeSharedYearPayload(entry.payload, academicYear);
            const workspace = ensureYearWorkspace(academicYear);
            removeSharedPlanHistoryEntry(academicYear, entry.id);
            state.account.syncApplyingRemote = true;
            workspace.week1Start = payload.week1Start;
            workspace.planData = payload.planData;
            state.planData = workspace.planData;
            syncPlanDatesForActiveYear();
            persistActiveYearWorkspace();
            persistLegacyActiveYear();
            refreshViewsAfterCloudWorkspace(true, false);
            state.account.syncApplyingRemote = false;
            updateSharedPlanEditingControls();
            queueCloudWorkspaceSync();
            showToast('↶ Đã khôi phục bản kế hoạch gần nhất và đang tạo phiên bản mới', 'success');
        }

        async function syncActiveYearToCloud() {
            if (!accountCloudSyncEnabled()) return;
            const academicYear = state.account.syncYear;
            if (!academicYear || academicYear !== state.selectedAcademicYear
                || !state.account.sharedYearLoaded || !state.account.personalYearLoaded) return;
            const { firestoreModule } = state.account.modules;
            const sharedRef = getSharedYearRef(academicYear);
            const personalRef = getPersonalYearRef(state.account.user.uid, academicYear);
            const sharedPayload = buildSharedYearPayload(academicYear);
            const personalPayload = buildPersonalYearPayload(academicYear);
            const sharedHash = cloudPayloadHash(sharedPayload);
            const personalHash = cloudPayloadHash(personalPayload);
            let wrote = false;
            let failure = null;
            setCloudSyncStatus('syncing', `Đang đồng bộ ${academicYear}`);

            if (state.account.profile?.role === 'admin'
                && !state.account.sharedConflict
                && sharedHash !== state.account.lastSharedHash) {
                try {
                    wrote = await writeSharedPlanSafely(sharedRef, sharedPayload, academicYear) || wrote;
                } catch (error) {
                    failure = error;
                    console.error('Không thể đồng bộ kế hoạch tuần dùng chung:', error);
                }
            }

            if (personalHash !== state.account.lastPersonalHash) {
                try {
                    await firestoreModule.setDoc(personalRef, {
                        ...personalPayload,
                        updatedAt: firestoreModule.serverTimestamp(),
                        updatedBy: state.account.user.uid,
                    }, { merge: true });
                    if (state.account.syncYear === academicYear) {
                        state.account.lastPersonalHash = personalHash;
                        state.account.personalYearExists = true;
                    }
                    wrote = true;
                } catch (error) {
                    failure = failure || error;
                    console.error('Không thể đồng bộ dữ liệu riêng của giáo viên:', error);
                }
            }

            if (state.account.syncYear !== academicYear) return;
            if (failure) {
                setCloudSyncStatus('error', translateAccountError(failure));
                return;
            }
            if (state.account.sharedConflict) {
                setCloudSyncStatus('conflict', 'Có thay đổi cần xử lý');
                return;
            }
            setCloudSyncStatus('synced', wrote ? 'Đã lưu lên đám mây' : 'Dữ liệu đã đồng bộ');
        }

        function queueCloudWorkspaceSync() {
            if (!accountCloudSyncEnabled() || state.account.syncApplyingRemote) return;
            if (!state.account.sharedYearLoaded || !state.account.personalYearLoaded) return;
            if (state.account.syncTimer) clearTimeout(state.account.syncTimer);
            setCloudSyncStatus('syncing', 'Đang chờ lưu thay đổi');
            state.account.syncTimer = setTimeout(() => {
                state.account.syncTimer = null;
                syncActiveYearToCloud();
            }, 700);
        }

        function flushCloudWorkspaceSync() {
            if (state.account.syncTimer) clearTimeout(state.account.syncTimer);
            state.account.syncTimer = null;
            return syncActiveYearToCloud();
        }

        let cloudActivationBusy = false;
        async function activateCloudDataSync() {
            if (cloudActivationBusy) return;
            cloudActivationBusy = true;
            try {

                if (!accountCloudSyncEnabled()) {
                    stopCloudWorkspaceSync();
                    return;
                }
                const academicYear = normalizeAcademicYear(state.selectedAcademicYear);
                if (!academicYear) return;
                if (state.account.syncYear === academicYear
                    && state.account.sharedYearUnsubscribe
                    && state.account.personalYearUnsubscribe
                    && state.account.sharedWorkItemsUnsubscribe) return;

                stopCloudWorkspaceSync();
                state.account.syncYear = academicYear;
                if (!await savePreCloudSyncBackupOnce()) {
                    setCloudSyncStatus('error', 'Không tạo được bản sao trước đồng bộ');
                    return;
                }
                setCloudSyncStatus('syncing', `Đang mở dữ liệu ${academicYear}`);
                const { firestoreModule } = state.account.modules;
                const sharedRef = getSharedYearRef(academicYear);
                const personalRef = getPersonalYearRef(state.account.user.uid, academicYear);
                const sharedWorkItemsRef = getSharedWorkItemsRef(academicYear);

                state.account.sharedYearUnsubscribe = firestoreModule.onSnapshot(sharedRef, snapshot => {
                    if (state.account.syncYear !== academicYear) return;
                    state.account.sharedYearLoaded = true;
                    state.account.sharedYearExists = snapshot.exists();
                    if (snapshot.exists()) {
                        handleSharedYearSnapshot(snapshot.data(), academicYear);
                    } else {
                        state.account.lastSharedHash = '';
                        state.account.sharedRevision = 0;
                        state.account.sharedBasePayload = null;
                        state.account.sharedUpdatedAt = null;
                        state.account.sharedUpdatedBy = '';
                        state.account.sharedUpdatedByName = '';
                        state.account.sharedConflict = null;
                        updateSharedPlanEditingControls();
                    }
                    if (state.account.personalYearLoaded) {
                        queueCloudWorkspaceSync();
                        if (state.account.profile?.role !== 'admin' && !snapshot.exists()) {
                            setCloudSyncStatus('synced', 'Đang chờ admin tạo kế hoạch chung');
                        }
                    }
                }, error => {
                    console.error('Không thể nhận kế hoạch tuần dùng chung:', error);
                    setCloudSyncStatus('error', translateAccountError(error));
                });

                state.account.personalYearUnsubscribe = firestoreModule.onSnapshot(personalRef, snapshot => {
                    if (state.account.syncYear !== academicYear) return;
                    state.account.personalYearLoaded = true;
                    state.account.personalYearExists = snapshot.exists();
                    if (snapshot.exists()) {
                        applyPersonalYearSnapshot(snapshot.data(), academicYear);
                    } else {
                        state.account.lastPersonalHash = '';
                    }
                    if (state.account.sharedYearLoaded) queueCloudWorkspaceSync();
                }, error => {
                    console.error('Không thể nhận dữ liệu riêng của giáo viên:', error);
                    setCloudSyncStatus('error', translateAccountError(error));
                });

                state.account.sharedWorkItemsUnsubscribe = firestoreModule.onSnapshot(sharedWorkItemsRef, snapshot => {
                    if (state.account.syncYear !== academicYear) return;
                    state.account.sharedWorkItemsLoaded = true;
                    state.workSyncError = '';
                    state.sharedWorkItems = snapshot.docs
                        .map(itemSnapshot => normalizeWorkItem({
                            id: itemSnapshot.id,
                            ...itemSnapshot.data(),
                            academicYear,
                            scope: 'shared',
                        }, 'shared'))
                        .filter(Boolean);
                    renderWorkWorkspace();
                }, error => {
                    console.error('Không thể nhận sổ công việc nhóm:', error);
                    state.account.sharedWorkItemsLoaded = false;
                    state.workSyncError = translateAccountError(error);
                    renderWorkWorkspace();
                });
            } catch (error) {
                state.account.syncApplyingRemote = false;
                console.error('Không thể kích hoạt đồng bộ cloud:', error);
                window.teacherNotebookRecordError?.('cloud-sync', error, { source: 'Không thể kích hoạt đồng bộ cloud' });
                setCloudSyncStatus('error', translateAccountError(error));
            } finally {
                cloudActivationBusy = false;
            }
        }

        async function ensureAccountMembership(user, preferredName = '') {
            if (!user || !state.account.db || !state.account.modules) return null;
            const { firestoreModule } = state.account.modules;
            const groupRef = getAccountGroupRef();
            const memberRef = getAccountMemberRef(user.uid);
            const displayName = cleanText(preferredName || user.displayName || user.email?.split('@')[0]) || 'Giáo viên';
            await firestoreModule.runTransaction(state.account.db, async transaction => {
                const groupSnapshot = await transaction.get(groupRef);
                const memberSnapshot = await transaction.get(memberRef);
                if (memberSnapshot.exists()) return;
                const baseProfile = {
                    uid: user.uid,
                    email: cleanText(user.email).toLowerCase(),
                    displayName,
                    schoolName: state.teacherProfile.schoolName,
                    subject: state.teacherProfile.subject,
                    phone: '',
                    createdAt: firestoreModule.serverTimestamp(),
                    updatedAt: firestoreModule.serverTimestamp(),
                };
                if (!groupSnapshot.exists()) {
                    transaction.set(groupRef, {
                        name: `Nhóm giáo viên của ${displayName}`,
                        ownerUid: user.uid,
                        createdAt: firestoreModule.serverTimestamp(),
                        updatedAt: firestoreModule.serverTimestamp(),
                        version: 1,
                    });
                    transaction.set(memberRef, {
                        ...baseProfile,
                        role: 'admin',
                        status: 'active',
                        approvedAt: firestoreModule.serverTimestamp(),
                        approvedBy: user.uid,
                    });
                } else {
                    transaction.set(memberRef, {
                        ...baseProfile,
                        role: 'teacher',
                        status: 'pending',
                        approvedAt: null,
                        approvedBy: '',
                    });
                }
            });
            const snapshot = await firestoreModule.getDoc(memberRef);
            return snapshot.exists() ? snapshot.data() : null;
        }

        function syncAccountProfileToTeacherProfile(profile) {
            if (!profile) return;
            state.teacherProfile = normalizeTeacherProfile({
                ...state.teacherProfile,
                schoolName: profile.schoolName || state.teacherProfile.schoolName,
                teacherName: profile.displayName || state.teacherProfile.teacherName,
                subject: profile.subject || state.teacherProfile.subject,
            });
            writeStoredJSON('teacher_profile', state.teacherProfile);
            if (curriculumSubjectInput && !cleanText(curriculumSubjectInput.value)) {
                curriculumSubjectInput.value = state.teacherProfile.subject;
            }
        }

        function subscribeAccountGroup() {
            stopAccountSubscription('groupUnsubscribe');
            const { firestoreModule } = state.account.modules;
            state.account.groupUnsubscribe = firestoreModule.onSnapshot(getAccountGroupRef(), snapshot => {
                state.account.group = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
                updateAccountPresentation();
                if (!teamAdminModal.hidden) renderTeamAdminView();
            }, error => {
                console.warn('Không thể đồng bộ thông tin nhóm:', error);
            });
        }

        function subscribeAdminMembers() {
            if (state.account.profile?.role !== 'admin' || state.account.profile?.status !== 'active') {
                stopAccountSubscription('membersUnsubscribe');
                state.account.members = [];
                return;
            }
            if (state.account.membersUnsubscribe) return;
            const { firestoreModule } = state.account.modules;
            const membersCollection = firestoreModule.collection(getAccountGroupRef(), 'members');
            state.account.membersUnsubscribe = firestoreModule.onSnapshot(membersCollection, snapshot => {
                state.account.members = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
                if (!teamAdminModal.hidden) renderTeamAdminView();
                const pendingCount = state.account.members.filter(item => item.status === 'pending').length;
                teamAdminBtn.textContent = pendingCount > 0
                    ? `🛡️ Quản trị nhóm (${pendingCount})` : '🛡️ Quản trị nhóm';
            }, error => {
                console.warn('Không thể tải danh sách thành viên:', error);
                showToast('Không thể tải danh sách thành viên: ' + translateAccountError(error), 'error');
            });
        }

        function subscribeAccountProfile(user) {
            stopAccountSubscription('profileUnsubscribe');
            const { firestoreModule } = state.account.modules;
            state.account.profileUnsubscribe = firestoreModule.onSnapshot(getAccountMemberRef(user.uid), snapshot => {
                state.account.profile = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
                if (state.account.profile) syncAccountProfileToTeacherProfile(state.account.profile);
                subscribeAdminMembers();
                updateAccountPresentation();
                if (accountCloudSyncEnabled()) activateCloudDataSync();
                else stopCloudWorkspaceSync();
                if (!accountModal.hidden && state.account.user) renderAccountProfileView();
            }, error => {
                console.error('Không thể đồng bộ hồ sơ tài khoản:', error);
                state.account.status = 'error';
                state.account.errorMessage = translateAccountError(error);
                updateAccountPresentation();
            });
        }

        async function handleAccountAuthState(user) {
            stopAllAccountSubscriptions();
            state.account.user = user || null;
            state.account.profile = null;
            state.account.group = null;
            state.account.members = [];
            state.account.errorMessage = '';
            if (!user) {
                state.account.status = 'signed-out';
                updateAccountPresentation();
                return;
            }
            state.account.status = 'loading-profile';
            updateAccountPresentation();
            try {
                state.account.profile = await ensureAccountMembership(user);
                subscribeAccountGroup();
                subscribeAccountProfile(user);
            } catch (error) {
                console.error('Không thể tạo hồ sơ thành viên:', error);
                state.account.status = 'error';
                state.account.errorMessage = translateAccountError(error);
                updateAccountPresentation();
            }
        }

        async function initializeAccountSystem() {
            if (state.account.initialized) return;
            state.account.initialized = true;
            updateAccountPresentation();
            try {
                state.account.config = await discoverFirebaseConfig();
                if (!isValidFirebaseConfig(state.account.config)) {
                    state.account.status = 'config-missing';
                    updateAccountPresentation();
                    return;
                }
                state.account.status = 'connecting';
                updateAccountPresentation();
                const { appModule, authModule, firestoreModule } = await loadFirebaseAccountModules();
                const existingApp = appModule.getApps().find(app => app.name === ACCOUNT_FIREBASE_APP_NAME);
                state.account.app = existingApp
                    || appModule.initializeApp(state.account.config, ACCOUNT_FIREBASE_APP_NAME);
                state.account.auth = authModule.getAuth(state.account.app);
                state.account.db = firestoreModule.getFirestore(state.account.app);
                try {
                    await authModule.setPersistence(state.account.auth, authModule.browserLocalPersistence);
                } catch (error) {
                    console.warn('Không thể lưu phiên đăng nhập lâu dài:', error);
                }
                state.account.firebaseReady = true;
                state.account.status = 'ready';
                authModule.onAuthStateChanged(state.account.auth, handleAccountAuthState, error => {
                    state.account.status = 'error';
                    state.account.errorMessage = translateAccountError(error);
                    updateAccountPresentation();
                });
                updateAccountPresentation();
            } catch (error) {
                console.error('Không thể khởi tạo Firebase:', error);
                state.account.status = 'error';
                state.account.errorMessage = translateAccountError(error);
                updateAccountPresentation();
            }
        }

        async function runAccountTask(task, loadingLabel = 'Đang xử lý...') {
            if (state.account.busy) return;
            state.account.busy = true;
            const submitButtons = accountModalBody.querySelectorAll('button,input,textarea');
            submitButtons.forEach(item => { item.disabled = true; });
            const activeSubmit = accountModalBody.querySelector('button[type="submit"]');
            const previousText = activeSubmit?.textContent;
            if (activeSubmit) activeSubmit.textContent = loadingLabel;
            try {
                await task();
            } catch (error) {
                console.error(error);
                showToast('❌ ' + translateAccountError(error), 'error');
            } finally {
                state.account.busy = false;
                submitButtons.forEach(item => { item.disabled = false; });
                if (activeSubmit && previousText) activeSubmit.textContent = previousText;
            }
        }

        async function submitAccountAuthForm(form) {
            if (!state.account.firebaseReady || !state.account.auth) {
                showToast('Firebase chưa sẵn sàng. Hãy kiểm tra phần thiết lập nhóm.', 'error');
                return;
            }
            const data = new FormData(form);
            const email = cleanText(data.get('email')).toLowerCase();
            const password = String(data.get('password') || '');
            const register = form.dataset.accountForm === 'register';
            if (!email || password.length < 6) {
                showToast('Vui lòng nhập email hợp lệ và mật khẩu từ 6 ký tự', 'error');
                return;
            }
            await runAccountTask(async () => {
                const { authModule, firestoreModule } = state.account.modules;
                if (!register) {
                    await authModule.signInWithEmailAndPassword(state.account.auth, email, password);
                    closeAppModal(accountModal);
                    showToast('✅ Đăng nhập thành công', 'success');
                    return;
                }
                const displayName = cleanText(data.get('displayName'));
                const passwordConfirm = String(data.get('passwordConfirm') || '');
                if (!displayName) throw new Error('Vui lòng nhập họ và tên giáo viên');
                if (password !== passwordConfirm) throw new Error('Hai lần nhập mật khẩu chưa giống nhau');
                const credential = await authModule.createUserWithEmailAndPassword(state.account.auth, email, password);
                await authModule.updateProfile(credential.user, { displayName });
                const profile = await ensureAccountMembership(credential.user, displayName);
                if (profile && profile.displayName !== displayName) {
                    await firestoreModule.updateDoc(getAccountMemberRef(credential.user.uid), {
                        displayName,
                        updatedAt: firestoreModule.serverTimestamp(),
                    });
                }
                closeAppModal(accountModal);
                showToast(profile?.role === 'admin'
                    ? '✅ Đã tạo nhóm và tài khoản admin đầu tiên'
                    : '✅ Đã tạo tài khoản; vui lòng chờ admin duyệt', 'success');
            }, register ? 'Đang tạo tài khoản...' : 'Đang đăng nhập...');
        }

        async function submitAccountProfileForm(form) {
            if (!state.account.user || !state.account.db) return;
            const data = new FormData(form);
            const profile = {
                displayName: cleanText(data.get('displayName')),
                schoolName: cleanText(data.get('schoolName')),
                subject: cleanText(data.get('subject')),
                phone: cleanText(data.get('phone')),
            };
            if (!profile.displayName || !profile.schoolName || !profile.subject) {
                showToast('Vui lòng nhập đầy đủ họ tên, trường và môn giảng dạy', 'error');
                return;
            }
            await runAccountTask(async () => {
                const { authModule, firestoreModule } = state.account.modules;
                await firestoreModule.updateDoc(getAccountMemberRef(state.account.user.uid), {
                    ...profile,
                    updatedAt: firestoreModule.serverTimestamp(),
                });
                await authModule.updateProfile(state.account.user, { displayName: profile.displayName });
                syncAccountProfileToTeacherProfile(profile);
                closeAppModal(accountModal);
                showToast('✅ Đã cập nhật hồ sơ tài khoản', 'success');
            }, 'Đang lưu...');
        }

        async function sendAccountPasswordReset() {
            const email = cleanText($('#accountAuthEmail')?.value).toLowerCase();
            if (!email) {
                showToast('Nhập email trước khi yêu cầu đặt lại mật khẩu', 'error');
                $('#accountAuthEmail')?.focus();
                return;
            }
            await runAccountTask(async () => {
                await state.account.modules.authModule.sendPasswordResetEmail(state.account.auth, email);
                showToast('✅ Đã gửi hướng dẫn đặt lại mật khẩu qua email', 'success');
            }, 'Đang gửi...');
        }

        async function copyTextForAccount(text, successMessage) {
            try {
                await navigator.clipboard.writeText(text);
            } catch (error) {
                const helper = document.createElement('textarea');
                helper.value = text;
                helper.style.position = 'fixed';
                helper.style.opacity = '0';
                document.body.appendChild(helper);
                helper.select();
                document.execCommand('copy');
                helper.remove();
            }
            showToast(successMessage, 'success');
        }

        function saveFirebaseConfigFromModal() {
            const config = parseFirebaseConfigText($('#accountFirebaseConfigInput')?.value);
            if (!config) {
                showToast('Cấu hình chưa đủ apiKey, authDomain, projectId và appId', 'error');
                return;
            }
            writeStoredJSON(ACCOUNT_CONFIG_STORAGE, config);
            localStorage.setItem(ACCOUNT_ACCESS_MODE_STORAGE, 'group');
            showToast('✅ Đã lưu cấu hình Firebase; trang đang kết nối lại', 'success');
            setTimeout(() => location.reload(), 450);
        }

        async function updateTeamMember(uid, changes, successMessage) {
            if (!uid || !accountCanUseGroup() || state.account.profile?.role !== 'admin') return;
            if (uid === state.account.user.uid && ('status' in changes || changes.role !== undefined)) {
                showToast('Không thể tự khóa hoặc tự hạ quyền tài khoản admin đang dùng', 'error');
                renderTeamAdminView();
                return;
            }
            try {
                const { firestoreModule } = state.account.modules;
                await firestoreModule.updateDoc(getAccountMemberRef(uid), {
                    ...changes,
                    updatedAt: firestoreModule.serverTimestamp(),
                    ...(changes.status === 'active' ? {
                        approvedAt: firestoreModule.serverTimestamp(),
                        approvedBy: state.account.user.uid,
                    } : {}),
                });
                showToast('✅ ' + successMessage, 'success');
            } catch (error) {
                console.error(error);
                showToast('❌ ' + translateAccountError(error), 'error');
                renderTeamAdminView();
            }
        }

        async function saveTeamName() {
            const name = cleanText($('#teamNameInput')?.value);
            if (!name) {
                showToast('Tên nhóm không được để trống', 'error');
                return;
            }
            try {
                const { firestoreModule } = state.account.modules;
                await firestoreModule.updateDoc(getAccountGroupRef(), {
                    name,
                    updatedAt: firestoreModule.serverTimestamp(),
                });
                showToast('✅ Đã đổi tên nhóm giáo viên', 'success');
            } catch (error) {
                showToast('❌ ' + translateAccountError(error), 'error');
            }
        }

        accountPrimaryBtn.addEventListener('click', () => {
            if (state.account.accessMode === 'personal') {
                setAccountAccessMode('group', false);
            }
            const view = !isValidFirebaseConfig(state.account.config) || state.account.status === 'error'
                ? 'setup' : state.account.user ? 'profile' : 'signin';
            openAccountModal(view);
        });
        accountProfileBtn.addEventListener('click', () => openAccountModal('profile'));
        teamAdminBtn.addEventListener('click', openTeamAdminModal);
        accountSetupBtn.addEventListener('click', () => {
            if (isValidFirebaseConfig(state.account.config) && !accountCanManageGroup()) {
                showToast('Kiểm tra nhóm chỉ dành cho quản trị viên', 'info');
                return;
            }
            openAccountModal('setup');
        });
        acceptSharedServerBtn.addEventListener('click', acceptSharedServerVersion);
        keepSharedLocalBtn.addEventListener('click', keepSharedLocalVersion);
        restoreSharedPlanBtn.addEventListener('click', restoreLatestSharedPlanVersion);
        accountPersonalModeBtn.addEventListener('click', () => setAccountAccessMode('personal'));
        accountGatePersonalBtn.addEventListener('click', () => setAccountAccessMode('personal'));
        accountGatePrimaryBtn.addEventListener('click', () => {
            if (accountGatePrimaryBtn.disabled) return;
            openAccountModal(!isValidFirebaseConfig(state.account.config) || state.account.status === 'error'
                ? 'setup' : state.account.user ? 'profile' : 'signin');
        });
        accountSignOutBtn.addEventListener('click', async () => {
            if (!state.account.auth || !confirm('Đăng xuất khỏi tài khoản nhóm giáo viên?')) return;
            try {
                await state.account.modules.authModule.signOut(state.account.auth);
                showToast('Đã đăng xuất khỏi nhóm giáo viên', 'info');
            } catch (error) {
                showToast('❌ ' + translateAccountError(error), 'error');
            }
        });

        accountModalBody.addEventListener('submit', event => {
            event.preventDefault();
            if (event.target.dataset.accountForm === 'profile') submitAccountProfileForm(event.target);
            else submitAccountAuthForm(event.target);
        });
        accountModalBody.addEventListener('click', event => {
            const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
            if (!action) return;
            if (action === 'show-signin') renderAccountAuthView('signin');
            if (action === 'show-register') renderAccountAuthView('register');
            if (action === 'show-profile') renderAccountProfileView();
            if (action === 'reset-password') sendAccountPasswordReset();
            if (action === 'copy-rules') copyTextForAccount(FIRESTORE_RULES_TEMPLATE, '✅ Đã sao chép Firestore Rules');
            if (action === 'open-firebase') {
                const firebaseWindow = window.open('https://console.firebase.google.com/', '_blank', 'noopener,noreferrer');
                if (firebaseWindow) firebaseWindow.opener = null;
            }
            if (action === 'retry-connection') retryAccountSetupConnection();
            if (action === 'activate-group') {
                setAccountAccessMode('group', false);
                state.account.setupCheckMessage = '✅ Đã bật chế độ nhóm; hệ thống đang tải dữ liệu.';
                renderAccountSetupView();
            }
            if (action === 'retry-sync') retryAccountCloudSync();
            if (action === 'save-config') saveFirebaseConfigFromModal();
            if (action === 'clear-config') {
                if (!confirm('Xóa cấu hình Firebase đã lưu trên máy này và quay về chế độ cá nhân?')) return;
                localStorage.removeItem(ACCOUNT_CONFIG_STORAGE);
                localStorage.setItem(ACCOUNT_ACCESS_MODE_STORAGE, 'personal');
                location.reload();
            }
            if (action === 'signout-account') {
                closeAppModal(accountModal);
                state.account.modules?.authModule?.signOut?.(state.account.auth)
                    .then(() => showToast('Đã đăng xuất khỏi nhóm giáo viên', 'info'))
                    .catch(error => showToast('❌ ' + translateAccountError(error), 'error'));
            }
            if (action === 'close-account') closeAppModal(accountModal);
        });

        teamAdminModalBody.addEventListener('change', event => {
            const select = event.target.closest('[data-member-role][data-member-uid]');
            if (!select) return;
            updateTeamMember(select.dataset.memberUid, { role: select.value === 'admin' ? 'admin' : 'teacher' }, 'Đã cập nhật vai trò thành viên');
        });
        teamAdminModalBody.addEventListener('click', event => {
            const teamAction = event.target.closest('[data-team-action]')?.dataset.teamAction;
            if (teamAction === 'save-name') saveTeamName();
            if (teamAction === 'check-group') {
                if (!accountCanManageGroup()) return;
                closeAppModal(teamAdminModal);
                openAccountModal('setup');
                return;
            }
            const button = event.target.closest('[data-member-action][data-member-uid]');
            if (!button) return;
            if (button.dataset.memberAction === 'approve') {
                updateTeamMember(button.dataset.memberUid, { status: 'active' }, 'Đã duyệt tài khoản giáo viên');
            }
            if (button.dataset.memberAction === 'disable') {
                if (confirm('Khóa tài khoản thành viên này?')) {
                    updateTeamMember(button.dataset.memberUid, { status: 'disabled' }, 'Đã khóa tài khoản thành viên');
                }
            }
            if (button.dataset.memberAction === 'enable') {
                updateTeamMember(button.dataset.memberUid, { status: 'active' }, 'Đã mở lại tài khoản thành viên');
            }
        });

        function getActiveYearWorkspace() {
            return state.yearWorkspaces[state.selectedAcademicYear];
        }

        function applyYearWorkspaceToRuntime(workspace, options = {}) {
            const source = workspace && typeof workspace === 'object' ? workspace : {};
            if (options.includePlan !== false) state.planData = Array.isArray(source.planData) ? source.planData : [];
            state.timetablesByWeek = source.timetablesByWeek && typeof source.timetablesByWeek === 'object' && !Array.isArray(source.timetablesByWeek)
                ? source.timetablesByWeek : {};
            state.curriculumText = cleanText(source.curriculumText);
            state.curriculumProfiles = Array.isArray(source.curriculumProfiles) ? source.curriculumProfiles : [];
            state.teachingSchedule = source.teachingSchedule && typeof source.teachingSchedule === 'object' && !Array.isArray(source.teachingSchedule)
                ? source.teachingSchedule : {};
            state.scheduleMeta = source.scheduleMeta && typeof source.scheduleMeta === 'object' && !Array.isArray(source.scheduleMeta)
                ? source.scheduleMeta : {};
            state.workItems = Array.isArray(source.workItems) ? source.workItems : [];
            state.selectedTimetableWeek = Number.parseInt(source.selectedTimetableWeek, 10) || 1;
            state.timetableData = state.timetablesByWeek[state.selectedTimetableWeek] || null;
            return source;
        }

        function captureActiveYearWorkspace() {
            const workspace = getActiveYearWorkspace();
            if (!workspace) return;
            workspace.planData = state.planData;
            workspace.timetablesByWeek = state.timetablesByWeek;
            workspace.curriculumText = state.curriculumText;
            workspace.curriculumProfiles = state.curriculumProfiles;
            workspace.teachingSchedule = state.teachingSchedule;
            workspace.scheduleMeta = state.scheduleMeta;
            workspace.workItems = state.workItems;
            workspace.selectedTimetableWeek = state.selectedTimetableWeek;
            const selectedTeachingWeek = getSelectedScheduleWeek();
            if (selectedTeachingWeek) workspace.selectedTeachingWeek = selectedTeachingWeek;
            else if (!workspace.selectedTeachingWeek) {
                workspace.selectedTeachingWeek = Number.parseInt(localStorage.getItem('teacher_selected_week'), 10) || null;
            }
        }

        function persistActiveYearWorkspace() {
            captureActiveYearWorkspace();
            if (window.persistYearWorkspacesHybrid) window.persistYearWorkspacesHybrid(state.yearWorkspaces);
            else writeStoredJSON(YEAR_WORKSPACES_STORAGE, state.yearWorkspaces);
            queueCloudWorkspaceSync();
            try {
                window.dispatchEvent(new CustomEvent('teacher-data-changed', {
                    detail: { academicYear: state.selectedAcademicYear }
                }));
            } catch (error) {
                // Dashboard chỉ là lớp hiển thị; lỗi phát sự kiện không được ảnh hưởng lưu dữ liệu.
            }
        }

        function persistLegacyActiveYear() {
            writeStoredJSON('teacher_plan_data', state.planData);
            writeStoredJSON('teacher_timetables_by_week', state.timetablesByWeek);
            writeStoredJSON('teacher_teaching_schedule', state.teachingSchedule);
            writeStoredJSON('teacher_schedule_meta', state.scheduleMeta);
            writeStoredJSON(CURRICULUM_PROFILES_STORAGE, { version: 2, profiles: state.curriculumProfiles });
            localStorage.setItem('teacher_curriculum_text', state.curriculumText || '');
            localStorage.setItem('teacher_timetable_selected_week', String(state.selectedTimetableWeek || 1));
            if (state.timetableData) writeStoredJSON('teacher_timetable_data', state.timetableData);
            else localStorage.removeItem('teacher_timetable_data');
        }

        function ensureYearWorkspace(academicYear) {
            if (!state.yearWorkspaces[academicYear]) {
                state.yearWorkspaces[academicYear] = normalizeYearWorkspace({
                    week1Start: '',
                    selectedTimetableWeek: 1,
                });
            }
            return state.yearWorkspaces[academicYear];
        }

        function getActiveDataSchemaStorageKey() {
            const academicYear = normalizeAcademicYear(state.selectedAcademicYear) || 'default';
            return `${DATA_SCHEMA_STORAGE_PREFIX}:${academicYear}`;
        }

        function runDataMigrationsForActiveYear() {
            const storageKey = getActiveDataSchemaStorageKey();
            let currentVersion = Number.parseInt(localStorage.getItem(storageKey), 10) || 0;
            if (currentVersion >= DATA_SCHEMA_VERSION) {
                return { migrated: false, changed: false, fromVersion: currentVersion, toVersion: currentVersion };
            }

            const fromVersion = currentVersion;
            let changed = false;
            try {
                // Schema 1: chuẩn hóa dữ liệu lịch cũ một lần thay vì sửa lại ở mỗi lần khởi động/chuyển năm học.
                if (currentVersion < 1) {
                    if (repairExistingMakeupLessonSequences()) changed = true;
                    if (renumberStoredSchedulesFrom(1).length > 0) changed = true;
                    currentVersion = 1;
                }

                localStorage.setItem(storageKey, String(DATA_SCHEMA_VERSION));
                console.info(`✅ Data migration ${state.selectedAcademicYear}: ${fromVersion} → ${DATA_SCHEMA_VERSION}${changed ? ' (có cập nhật dữ liệu)' : ''}`);
                return { migrated: true, changed, fromVersion, toVersion: DATA_SCHEMA_VERSION };
            } catch (error) {
                // Không ghi version nếu migration lỗi để lần sau có thể thử lại; dữ liệu vẫn được cơ chế lưu/backup hiện có bảo vệ.
                console.error('❌ Không thể migration dữ liệu năm học:', state.selectedAcademicYear, error);
                return { migrated: false, changed: false, fromVersion, toVersion: fromVersion, error };
            }
        }

        function formatLocalDate(date) {
            return [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('/');
        }

        function getWeekDateInfo(week, academicYear = state.selectedAcademicYear) {
            const normalizedWeek = Number.parseInt(week, 10);
            const workspace = state.yearWorkspaces[academicYear];
            const startValue = normalizeISODate(workspace?.week1Start);
            if (!startValue || !isValidPlanWeek(normalizedWeek)) return null;
            const [year, month, day] = startValue.split('-').map(Number);
            const start = new Date(year, month - 1, day);
            const weekOffset = normalizedWeek > 0 ? normalizedWeek - 1 : normalizedWeek;
            start.setDate(start.getDate() + weekOffset * 7);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return {
                start,
                end,
                startText: formatLocalDate(start),
                endText: formatLocalDate(end),
                rangeText: `${formatLocalDate(start)} – ${formatLocalDate(end)}`,
            };
        }

        function applyAutomaticDatesToPlan(plan) {
            if (!plan) return plan;
            plan.schoolYear = state.selectedAcademicYear;
            const info = getWeekDateInfo(plan.week);
            if (!info) return plan;
            plan.dateRange = info.rangeText;
            (plan.days || []).forEach(day => {
                const dayIndex = PLAN_DAYS.indexOf(normalizeDayName(day.day));
                if (dayIndex < 0) return;
                const date = new Date(info.start);
                date.setDate(date.getDate() + dayIndex);
                day.date = formatLocalDate(date);
            });
            (plan.days || []).sort((a, b) => planDayOrder(a.day) - planDayOrder(b.day));
            return plan;
        }

        function syncPlanDatesForActiveYear() {
            state.planData.forEach(applyAutomaticDatesToPlan);
            state.planData.sort((a, b) => a.week - b.week);
        }

        function updateSchoolYearWeekInfo() {
            const workspace = getActiveYearWorkspace();
            week1StartDateInput.value = formatISODateForDisplay(workspace?.week1Start);
            const firstAuxiliaryWeek = getWeekDateInfo(-2);
            const lastAuxiliaryWeek = getWeekDateInfo(-1);
            const week1 = getWeekDateInfo(1);
            const lastWeek = getWeekDateInfo(MAX_SCHOOL_WEEKS);
            schoolYearWeekInfo.textContent = week1 && lastWeek
                ? `Lịch năm học tối đa ${TOTAL_ACADEMIC_CALENDAR_WEEKS} tuần = ${MAX_AUXILIARY_WEEKS} tuần phụ trước khai giảng + ${MAX_SCHOOL_WEEKS} tuần chính · 2 tuần phụ: ${firstAuxiliaryWeek?.startText || '—'} – ${lastAuxiliaryWeek?.endText || '—'} · Tuần 1: ${week1.rangeText} · Tuần ${MAX_SCHOOL_WEEKS}: ${lastWeek.rangeText}.`
                : `Nhập ngày Thứ 2 bắt đầu Tuần 1 để hệ thống tự tính lịch tối đa ${TOTAL_ACADEMIC_CALENDAR_WEEKS} tuần (${MAX_AUXILIARY_WEEKS} tuần phụ + ${MAX_SCHOOL_WEEKS} tuần chính).`;
        }

        function activateAcademicYearWorkspace(academicYear, notify = true) {
            const normalizedYear = normalizeAcademicYear(academicYear);
            if (!normalizedYear) return false;
            const previousYear = state.selectedAcademicYear;
            try {
                if (planSyncContext) closePlanSyncPanel();
                if (scheduleValidationContext) closeScheduleValidationPanel();
                // Không để lỗi đồng bộ đám mây chặn thao tác chuyển năm học trên máy.
                try {
                    const pendingSync = flushCloudWorkspaceSync();
                    pendingSync?.catch?.(error => console.warn('Không thể lưu tức thời năm học cũ trước khi chuyển:', error));
                } catch (error) {
                    console.warn('Bỏ qua lỗi đồng bộ trước khi chuyển năm học:', error);
                }
                persistActiveYearWorkspace();
                const workspace = ensureYearWorkspace(normalizedYear);
                state.selectedAcademicYear = normalizedYear;
                applyYearWorkspaceToRuntime(workspace);
                state.sharedWorkItems = [];
                state.workSyncError = '';
                state.teacherProfile.academicYear = normalizedYear;
                Object.keys(scheduleUndoStack).forEach(key => delete scheduleUndoStack[key]);
                localStorage.setItem(SELECTED_ACADEMIC_YEAR_STORAGE, normalizedYear);
                writeStoredJSON('teacher_profile', state.teacherProfile);
                runDataMigrationsForActiveYear();
                syncPlanDatesForActiveYear();
                persistActiveYearWorkspace();
                persistLegacyActiveYear();
                populateAcademicYearSelect(normalizedYear);
                updateSchoolYearWeekInfo();
                if (planWeekSelect) planWeekSelect.value = '';
                renderPlanTable();
                populateTimetableWeekSelect();
                activateTimetableWeek(state.selectedTimetableWeek, false);
                renderCurriculumProfiles();
                populateWeekSelect();
                const selectedTeachingWeek = Number.parseInt(workspace.selectedTeachingWeek, 10) || 0;
                if (selectedTeachingWeek && scheduleWeekSelect?.querySelector(`option[value="${selectedTeachingWeek}"]`)) {
                    scheduleWeekSelect.value = String(selectedTeachingWeek);
                    localStorage.setItem('teacher_selected_week', String(selectedTeachingWeek));
                    if (state.teachingSchedule[selectedTeachingWeek]?.length) renderTeachingSchedule(selectedTeachingWeek);
                    else updateScheduleToolbar(selectedTeachingWeek);
                } else if (scheduleWeekSelect) {
                    scheduleWeekSelect.value = '';
                    localStorage.removeItem('teacher_selected_week');
                    if (scheduleDisplay) scheduleDisplay.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">Chọn tuần và nhấn “Tạo lịch báo giảng”</p>';
                    updateScheduleToolbar(null);
                }
                initializeProgressDashboardControls();
                renderProgressDashboard();
                renderWorkWorkspace();
                updateDataSafetySummary();
                try {
                    activateCloudDataSync();
                } catch (error) {
                    console.warn('Đã chuyển năm học nhưng chưa thể bật đồng bộ đám mây:', error);
                    setCloudSyncStatus?.('error', 'Năm học đã chuyển; đồng bộ đám mây đang tạm lỗi');
                }
                if (notify) showToast(`✅ Đã chuyển sang năm học ${normalizedYear}`, 'success');
                return true;
            } catch (error) {
                console.error(`Không thể kích hoạt năm học ${normalizedYear}:`, error);
                // Không cố hoàn nguyên dữ liệu bằng suy đoán; chỉ khôi phục selector và báo lỗi rõ ràng.
                if (previousYear && previousYear !== normalizedYear) {
                    state.selectedAcademicYear = previousYear;
                    populateAcademicYearSelect(previousYear);
                }
                throw error;
            }
        }
