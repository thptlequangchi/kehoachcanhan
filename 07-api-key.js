        // ================================================================
        //  API KEY
        // ================================================================
        function setApiStatus(status, label) {
            apiStatus.className = 'status-dot' + (status ? ' ' + status : '');
            apiStatus.setAttribute('aria-label', label);
            apiStatus.title = label;
        }

        function updateApiStatus() {
            const key = apiKeyInput.value.trim();
            if (state.apiValidated && key === state.apiKey) {
                setApiStatus('valid', 'API key đã được kiểm tra và hoạt động');
            } else if (key && key.length > 10) {
                setApiStatus('checking', 'API key chưa được kiểm tra');
            } else {
                setApiStatus('', 'Chưa nhập API key');
            }
        }

        function updateApiKeyNote() {
            const isRemembered = Boolean(localStorage.getItem(API_KEY_PERSISTENT_STORAGE));
            if (state.account.accessMode === 'group' && state.account.profile?.status === 'active') {
                apiKeyNote.textContent = rememberApiKey.checked
                    ? 'Đây là API key riêng của tài khoản này và đang được lưu trên máy hiện tại. Không dùng chung key với các giáo viên khác.'
                    : 'Mỗi giáo viên dùng API key riêng; key này chỉ giữ trong phiên trên thiết bị hiện tại. Khi hết hạn mức, trang tự chuyển sang OCR.';
            } else if (rememberApiKey.checked) {
                apiKeyNote.textContent = isRemembered
                    ? 'API key đang được lưu trên máy này và sẽ tự điền ở lần mở sau. Chỉ nên dùng trên máy tính cá nhân.'
                    : 'API key sẽ được lưu trên máy này sau khi kiểm tra thành công. Chỉ nên bật trên máy tính cá nhân.';
            } else {
                apiKeyNote.textContent = 'API key chỉ được giữ trong phiên hiện tại và sẽ không còn sau khi đóng phiên trình duyệt.';
            }
        }

        function persistAcceptedApiKey(key) {
            sessionStorage.setItem(API_KEY_SESSION_STORAGE, key);
            if (rememberApiKey.checked) {
                localStorage.setItem(API_KEY_PERSISTENT_STORAGE, key);
            } else {
                localStorage.removeItem(API_KEY_PERSISTENT_STORAGE);
            }
            updateApiKeyNote();
        }

        rememberApiKey.checked = Boolean(savedApiKey);
        rememberApiKey.addEventListener('change', () => {
            const key = apiKeyInput.value.trim();
            if (!rememberApiKey.checked) {
                localStorage.removeItem(API_KEY_PERSISTENT_STORAGE);
                showToast('Key vẫn dùng trong phiên này nhưng không còn được lưu lâu dài', 'info');
            } else if (key.length >= 20 && key === state.apiKey) {
                localStorage.setItem(API_KEY_PERSISTENT_STORAGE, key);
                showToast('✅ Đã lưu API key trên máy này', 'success');
            }
            updateApiKeyNote();
        });

        apiKeyInput.addEventListener('input', () => {
            state.apiValidated = false;
            state.dailyQuotaBlocked = false;
            sessionStorage.removeItem('gemini_daily_quota_blocked');
            updateApiStatus();
        });

        saveApiBtn.addEventListener('click', async () => {
            const key = apiKeyInput.value.trim();
            if (!key || key.length < 20) {
                showToast('⚠️ Vui lòng nhập API key Gemini đầy đủ', 'error');
                setApiStatus('invalid', 'API key không hợp lệ');
                return;
            }

            saveApiBtn.disabled = true;
            saveApiBtn.textContent = 'Đang kiểm tra...';
            setApiStatus('checking', 'Đang kiểm tra API key');
            try {
                state.apiKey = key;
                await geminiGenerate([{ text: 'Chỉ trả lời đúng một từ: OK' }], {
                    json: false,
                    timeoutMs: 30000,
                    retries: 1,
                    onRateLimit: stage => {
                        setApiStatus('checking', stage);
                    },
                });
                state.apiValidated = true;
                state.dailyQuotaBlocked = false;
                persistAcceptedApiKey(key);
                sessionStorage.removeItem('gemini_daily_quota_blocked');
                updateApiStatus();
                showToast(rememberApiKey.checked
                    ? '✅ API key hoạt động và đã được lưu trên máy này.'
                    : '✅ API key hoạt động. Key chỉ được giữ trong phiên này.', 'success');
            } catch (error) {
                state.apiValidated = false;
                if (error.isQuota) {
                    state.apiKey = key;
                    state.dailyQuotaBlocked = Boolean(error.isDailyQuota);
                    persistAcceptedApiKey(key);
                    if (error.isDailyQuota) sessionStorage.setItem('gemini_daily_quota_blocked', '1');
                    setApiStatus('checking', 'API key hợp lệ nhưng đang hết hạn mức');
                    setRecognitionRuntime('Gemini hết quota · OCR sẵn sàng', 'offline');
                    showToast('⚠️ Gemini đang hết hạn mức. Trang sẽ dùng OCR trên máy.', 'info');
                } else {
                    state.apiKey = '';
                    sessionStorage.removeItem(API_KEY_SESSION_STORAGE);
                    setApiStatus('invalid', 'API key hoặc mô hình không sử dụng được');
                    showToast('❌ Không thể dùng API: ' + error.message, 'error');
                }
            } finally {
                saveApiBtn.disabled = false;
                saveApiBtn.textContent = 'Kiểm tra & dùng';
            }
        });

        forgetApiBtn.addEventListener('click', () => {
            state.apiKey = '';
            state.apiValidated = false;
            state.dailyQuotaBlocked = false;
            apiKeyInput.value = '';
            rememberApiKey.checked = false;
            sessionStorage.removeItem(API_KEY_SESSION_STORAGE);
            localStorage.removeItem(API_KEY_PERSISTENT_STORAGE);
            sessionStorage.removeItem('gemini_daily_quota_blocked');
            updateApiStatus();
            updateApiKeyNote();
            showToast('Đã quên API key trên thiết bị này', 'info');
        });

        // Khôi phục key trong phiên hoặc từ máy này nếu người dùng đã chọn ghi nhớ.
        if (state.apiKey) {
            apiKeyInput.value = state.apiKey;
        }
        updateApiStatus();
        updateApiKeyNote();
