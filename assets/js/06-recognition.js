        // ================================================================
        //  RECOGNITION MODE & CACHE
        // ================================================================
        function setRecognitionRuntime(label, type = '') {
            recognitionRuntimeStatus.textContent = label;
            recognitionRuntimeStatus.className = 'runtime-badge' + (type ? ' ' + type : '');
        }

        function updateRecognitionModeHelp() {
            const descriptions = {
                auto: 'Ưu tiên Gemini 2 lượt. Mọi yêu cầu được xếp hàng tối đa 4 lần/phút; khi hết quota hoặc mất kết nối, trang tự chuyển sang OCR trên thiết bị.',
                accurate: 'Gemini đọc và đối chiếu ảnh lần hai; hai lượt tự cách nhau khoảng 16 giây để bảo vệ giới hạn RPM.',
                economy: 'Gemini chỉ đọc một lượt, giảm khoảng một nửa số yêu cầu API; vẫn qua hàng đợi an toàn và có OCR dự phòng.',
                offline: 'Không gọi Gemini. Tesseract.js đọc tiếng Việt ngay trong trình duyệt; lần đầu cần tải bộ OCR từ CDN.',
            };
            recognitionModeHelp.textContent = descriptions[state.recognitionMode] || descriptions.auto;
        }

        function hasUsableGeminiKey() {
            const key = apiKeyInput.value.trim() || state.apiKey;
            return key.length >= 20;
        }

        function isGeminiDailyBlocked() {
            return state.dailyQuotaBlocked;
        }

        async function hashImageFile(file) {
            if (window.crypto?.subtle && typeof file.arrayBuffer === 'function') {
                const bytes = await file.arrayBuffer();
                const digest = await window.crypto.subtle.digest('SHA-256', bytes);
                return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            }
            return ['fallback', file.name, file.size, file.lastModified, file.type].join(':');
        }

        function cloneRecognitionData(value) {
            return JSON.parse(JSON.stringify(value));
        }

        function getCachedRecognition(kind, hash) {
            const entry = state.recognitionCache[`${kind}:${hash}`];
            if (!entry || entry.kind !== kind || !entry.data
                || Number(entry.engineVersion) !== RECOGNITION_ENGINE_VERSION) return null;
            return cloneRecognitionData(entry.data);
        }

        function cacheRecognition(kind, hash, data) {
            if (!hash || !data) return;
            const cacheData = cloneRecognitionData(data);
            cacheData.cacheHit = false;
            state.recognitionCache[`${kind}:${hash}`] = {
                kind,
                hash,
                engineVersion: RECOGNITION_ENGINE_VERSION,
                savedAt: new Date().toISOString(),
                data: cacheData,
            };
            const entries = Object.entries(state.recognitionCache)
                .sort(([, a], [, b]) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
            state.recognitionCache = Object.fromEntries(entries.slice(0, 20));
            writeStoredJSON(RECOGNITION_CACHE_KEY, state.recognitionCache);
        }

        function refreshRecognitionCache(kind, data) {
            if (data?.cacheHash) cacheRecognition(kind, data.cacheHash, data);
        }

        recognitionModeSelect.value = state.recognitionMode;
        updateRecognitionModeHelp();

        recognitionModeSelect.addEventListener('change', () => {
            state.recognitionMode = RECOGNITION_MODES.includes(recognitionModeSelect.value)
                ? recognitionModeSelect.value
                : 'auto';
            localStorage.setItem('teacher_recognition_mode', state.recognitionMode);
            updateRecognitionModeHelp();
            setRecognitionRuntime('Đã đổi chế độ', state.recognitionMode === 'offline' ? 'offline' : '');
        });

        clearRecognitionCacheBtn.addEventListener('click', () => {
            if (!confirm('Xóa bộ nhớ kết quả nhận dạng của các ảnh đã xử lý?')) return;
            state.recognitionCache = {};
            localStorage.removeItem(RECOGNITION_CACHE_KEY);
            setRecognitionRuntime('Đã xóa nhớ ảnh');
            showToast('Đã xóa bộ nhớ nhận dạng ảnh', 'info');
        });
