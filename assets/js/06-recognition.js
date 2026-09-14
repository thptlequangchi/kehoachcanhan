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

        function countRecognizedTimetableCells(data) {
            return Array.isArray(data?.sessions)
                ? data.sessions.flatMap(session => Array.isArray(session?.periods) ? session.periods : [])
                    .reduce((total, period) => total + (Array.isArray(period?.cells) ? period.cells.length : 0), 0)
                : 0;
        }

        function isRecognitionCacheUseful(kind, data) {
            if (!data || cleanText(data.sourceMode) === 'manual') return false;
            if (kind === 'timetable') {
                // Không lưu lại một TKB trắng do OCR lỗi. Nếu lưu, lần sau cùng ảnh sẽ luôn
                // bị trả về từ cache và người dùng không có cơ hội OCR lại sau khi mạng/engine phục hồi.
                return countRecognizedTimetableCells(data) > 0;
            }
            if (kind === 'plan') {
                const hasDayContent = Array.isArray(data.days) && data.days.some(day =>
                    cleanText(day?.morning) || cleanText(day?.afternoon) || cleanText(day?.businessTrip));
                return hasDayContent || cleanText(data.offlineOcrText).length >= 20;
            }
            return true;
        }

        function forgetRecognitionEntry(kind, hash, options = {}) {
            if (!kind || !hash) return false;
            const key = `${kind}:${hash}`;
            delete state.recognitionCache[key];
            if (options.dropRecent !== false) {
                const previewUrl = state.recentRecognitionPreviews?.[key];
                if (previewUrl && window.URL?.revokeObjectURL) {
                    try { window.URL.revokeObjectURL(previewUrl); } catch (_) { /* noop */ }
                }
                if (state.recentRecognitionFiles) delete state.recentRecognitionFiles[key];
                if (state.recentRecognitionPreviews) delete state.recentRecognitionPreviews[key];
            }
            if (window.teacherNotebookIndexedDB?.ready) {
                window.teacherNotebookIndexedDB.deleteRecognitionEntry?.(key);
            } else {
                writeStoredJSON(RECOGNITION_CACHE_KEY, state.recognitionCache);
            }
            return true;
        }

        function getCachedRecognition(kind, hash) {
            const key = `${kind}:${hash}`;
            const entry = state.recognitionCache[key];
            if (!entry || entry.kind !== kind || !entry.data
                || Number(entry.engineVersion) !== RECOGNITION_ENGINE_VERSION) return null;
            if (!isRecognitionCacheUseful(kind, entry.data)) {
                forgetRecognitionEntry(kind, hash, { dropRecent: false });
                return null;
            }
            return cloneRecognitionData(entry.data);
        }

        function cacheRecognition(kind, hash, data) {
            if (!hash || !data || !isRecognitionCacheUseful(kind, data)) {
                if (hash) forgetRecognitionEntry(kind, hash, { dropRecent: false });
                return false;
            }
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
            if (window.teacherNotebookIndexedDB?.ready) {
                window.teacherNotebookIndexedDB.saveRecognitionEntry(`${kind}:${hash}`, state.recognitionCache[`${kind}:${hash}`]);
            } else {
                writeStoredJSON(RECOGNITION_CACHE_KEY, state.recognitionCache);
            }
            return true;
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

        clearRecognitionCacheBtn.addEventListener('click', async () => {
            if (!confirm('Xóa bộ nhớ kết quả nhận dạng của các ảnh đã xử lý?')) return;
            state.recognitionCache = {};
            if (window.teacherNotebookIndexedDB) await window.teacherNotebookIndexedDB.clearRecognitionCache();
            localStorage.removeItem(RECOGNITION_CACHE_KEY);
            setRecognitionRuntime('Đã xóa nhớ ảnh');
            if (typeof renderStorageCenter === 'function') renderStorageCenter();
            showToast('Đã xóa bộ nhớ nhận dạng ảnh', 'info');
        });

        window.teacherNotebookForgetRecognitionEntry = forgetRecognitionEntry;
