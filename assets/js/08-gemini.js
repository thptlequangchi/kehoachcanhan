        // ================================================================
        //  GEMINI HELPERS
        // ================================================================
        function getGeminiCredentials() {
            const key = apiKeyInput.value.trim() || state.apiKey;
            if (!key || key.length < 20) {
                throw new Error('Vui lòng nhập API key Gemini hợp lệ');
            }
            return { key, model: GEMINI_MODEL };
        }

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        const storedGeminiNextRequestAt = Number.parseInt(localStorage.getItem(GEMINI_RATE_NEXT_STORAGE), 10) || 0;
        const geminiRateState = {
            tail: Promise.resolve(),
            nextAllowedAt: storedGeminiNextRequestAt > Date.now()
                && storedGeminiNextRequestAt < Date.now() + 60000
                ? storedGeminiNextRequestAt
                : 0,
            queued: 0,
            active: 0,
            retrying: 0,
        };

        function notifyGeminiProgress(callback, message) {
            if (typeof callback !== 'function') return;
            try {
                callback(message);
            } catch (error) {
                console.warn('Không thể cập nhật trạng thái hàng đợi Gemini:', error);
            }
        }

        function setGeminiQueueStatus(mode = 'ready', detail = '') {
            const presentations = {
                ready: { icon: '🛡️', title: 'Bảo vệ hạn mức Gemini đang bật' },
                queued: { icon: '🕒', title: 'Yêu cầu đã vào hàng đợi an toàn' },
                waiting: { icon: '⏳', title: 'Đang giãn cách để không vượt RPM' },
                active: { icon: '✨', title: 'Gemini đang xử lý yêu cầu' },
                retrying: { icon: '🔄', title: 'Tự phục hồi sau lỗi giới hạn' },
            };
            const view = presentations[mode] || presentations.ready;
            geminiQueuePanel.className = `gemini-queue-panel ${mode}`;
            geminiQueueIcon.textContent = view.icon;
            geminiQueueTitle.textContent = view.title;
            geminiQueueDetail.textContent = detail
                || `Tối đa ${GEMINI_SAFE_REQUESTS_PER_MINUTE} yêu cầu/phút; mọi yêu cầu được tự động xếp hàng.`;
            if (geminiRateState.retrying > 0) {
                geminiQueueCount.textContent = `${geminiRateState.retrying} thử lại`;
            } else if (geminiRateState.queued > 0) {
                geminiQueueCount.textContent = `${geminiRateState.queued} chờ`;
            } else if (geminiRateState.active > 0) {
                geminiQueueCount.textContent = `${geminiRateState.active} đang gọi`;
            } else {
                geminiQueueCount.textContent = '0 chờ';
            }
        }

        function refreshGeminiQueueStatus(detail = '') {
            if (geminiRateState.retrying > 0) {
                setGeminiQueueStatus('retrying', detail || 'Gemini sẽ tự thử lại, không cần tải ảnh lên lần nữa.');
            } else if (geminiRateState.queued > 0) {
                setGeminiQueueStatus('waiting', detail || 'Đang chờ đến lượt gửi yêu cầu tiếp theo.');
            } else if (geminiRateState.active > 0) {
                setGeminiQueueStatus('active', detail || 'Yêu cầu đã được gửi và đang chờ Gemini phản hồi.');
            } else {
                setGeminiQueueStatus('ready', detail);
            }
        }

        async function acquireGeminiRequestSlot(onProgress) {
            geminiRateState.queued += 1;
            setGeminiQueueStatus('queued', `Có ${geminiRateState.queued} yêu cầu đang chờ; hệ thống sẽ tự gửi lần lượt.`);
            notifyGeminiProgress(onProgress, 'Đã đưa yêu cầu vào hàng đợi bảo vệ hạn mức API...');

            const previousTurn = geminiRateState.tail;
            let releaseTurn;
            const currentTurn = new Promise(resolve => { releaseTurn = resolve; });
            geminiRateState.tail = previousTurn.then(() => currentTurn);
            await previousTurn;

            try {
                const storedNext = Number.parseInt(localStorage.getItem(GEMINI_RATE_NEXT_STORAGE), 10) || 0;
                const safeStoredNext = storedNext > Date.now() && storedNext < Date.now() + 60000 ? storedNext : 0;
                const waitUntil = Math.max(geminiRateState.nextAllowedAt, safeStoredNext);
                while (Date.now() < waitUntil) {
                    const seconds = Math.max(1, Math.ceil((waitUntil - Date.now()) / 1000));
                    const message = `Đang chờ giới hạn API: còn ${seconds} giây; dữ liệu của thầy vẫn được giữ nguyên.`;
                    setGeminiQueueStatus('waiting', message);
                    notifyGeminiProgress(onProgress, message);
                    await delay(Math.min(1000, Math.max(1, waitUntil - Date.now())));
                }

                geminiRateState.nextAllowedAt = Date.now() + GEMINI_REQUEST_INTERVAL_MS;
                try {
                    localStorage.setItem(GEMINI_RATE_NEXT_STORAGE, String(geminiRateState.nextAllowedAt));
                } catch (error) {
                    console.warn('Không thể lưu mốc bảo vệ RPM:', error);
                }
                geminiRateState.queued = Math.max(0, geminiRateState.queued - 1);
                geminiRateState.active += 1;
                setGeminiQueueStatus('active', `Đã gửi yêu cầu; lần gọi tiếp theo sẽ cách tối thiểu ${Math.round(GEMINI_REQUEST_INTERVAL_MS / 1000)} giây.`);
                notifyGeminiProgress(onProgress, 'Đang gửi yêu cầu Gemini an toàn...');
            } finally {
                releaseTurn();
            }

            let finished = false;
            return () => {
                if (finished) return;
                finished = true;
                geminiRateState.active = Math.max(0, geminiRateState.active - 1);
                refreshGeminiQueueStatus();
            };
        }

        function getRetryAfterMilliseconds(response) {
            const rawValue = cleanText(response?.headers?.get?.('retry-after'));
            if (!rawValue) return 0;
            const seconds = Number(rawValue);
            if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 120000);
            const retryDate = Date.parse(rawValue);
            return Number.isFinite(retryDate) ? Math.min(Math.max(0, retryDate - Date.now()), 120000) : 0;
        }

        async function waitBeforeGeminiRetry(waitMs, attempt, retries, onProgress, isRateLimit = false) {
            geminiRateState.retrying += 1;
            try {
                const waitUntil = Date.now() + waitMs;
                while (Date.now() < waitUntil) {
                    const seconds = Math.max(1, Math.ceil((waitUntil - Date.now()) / 1000));
                    const reason = isRateLimit ? 'Gemini đang giới hạn số yêu cầu' : 'Kết nối Gemini chưa ổn định';
                    const message = `${reason}; tự thử lại lần ${attempt + 2}/${retries + 1} sau ${seconds} giây.`;
                    setGeminiQueueStatus('retrying', message);
                    notifyGeminiProgress(onProgress, message);
                    await delay(Math.min(1000, Math.max(1, waitUntil - Date.now())));
                }
            } finally {
                geminiRateState.retrying = Math.max(0, geminiRateState.retrying - 1);
                refreshGeminiQueueStatus();
            }
        }

        function makeGeminiError(message, status = 0, payload = null) {
            const error = new Error(cleanText(message) || 'Gemini không hoàn thành yêu cầu');
            error.name = 'GeminiApiError';
            error.status = status;
            error.code = payload?.error?.status || (status ? `HTTP_${status}` : 'GEMINI_ERROR');
            error.isQuota = status === 429 || /resource_exhausted|quota|rate.?limit/i.test(error.message);
            error.isDailyQuota = error.isQuota && /per.?day|daily|requests.?per.?day|\brpd\b/i.test(error.message);
            return error;
        }

        function shouldUseOfflineFallback(error) {
            return error?.isQuota
                || [408, 429, 500, 502, 503, 504].includes(error?.status)
                || /gemini|api key|network|fetch|kết nối|phản hồi quá lâu|không trả về|lược đồ|nhận dạng/i.test(error?.message || '');
        }

        function getGeminiInteractionText(payload) {
            const interaction = payload?.interaction || payload || {};
            if (interaction.status === 'failed') {
                throw new Error(interaction.error?.message || 'Gemini không hoàn thành yêu cầu');
            }
            const text = cleanText(interaction.output_text || (interaction.steps || [])
                .filter(step => step?.type === 'model_output')
                .flatMap(step => step.content || [])
                .map(content => content.text || '')
                .join('')
            );
            if (!text) throw new Error('Gemini không trả về nội dung');
            return text;
        }

        async function geminiGenerate(parts, options = {}) {
            const credentials = getGeminiCredentials();
            const json = options.json !== false;
            const timeoutMs = options.timeoutMs || 90000;
            const retries = Number.isInteger(options.retries) ? options.retries : 3;
            const onRateLimit = options.onRateLimit;
            const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
            const input = parts.map(part => {
                if (typeof part === 'string') return { type: 'text', text: part };
                if (part?.text !== undefined) return { type: 'text', text: String(part.text) };
                if (part?.inlineData) {
                    return {
                        type: 'image',
                        data: part.inlineData.data,
                        mime_type: part.inlineData.mimeType,
                        resolution: options.mediaResolution || 'high',
                    };
                }
                return part;
            });
            const body = {
                model: credentials.model,
                input,
                store: false,
                generation_config: {
                    thinking_level: options.thinkingLevel || (json ? 'medium' : 'low'),
                },
            };
            if (options.systemInstruction) body.system_instruction = options.systemInstruction;
            if (json) {
                body.response_format = {
                    type: 'text',
                    mime_type: 'application/json',
                    ...(options.schema ? { schema: options.schema } : {}),
                };
            }

            for (let attempt = 0; attempt <= retries; attempt++) {
                const finishRateSlot = await acquireGeminiRequestSlot(onRateLimit);
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                let retryPlan = null;
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': credentials.key,
                        },
                        body: JSON.stringify(body),
                        signal: controller.signal,
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        const message = payload?.error?.message || `HTTP ${response.status}`;
                        const geminiError = makeGeminiError(message, response.status, payload);
                        const canRetry = (response.status === 429 || response.status >= 500)
                            && !geminiError.isDailyQuota
                            && attempt < retries;
                        if (canRetry) {
                            const defaultBackoff = response.status === 429
                                ? GEMINI_429_RETRY_DELAYS[Math.min(attempt, GEMINI_429_RETRY_DELAYS.length - 1)]
                                : Math.min(2000 * (2 ** attempt), 15000);
                            retryPlan = {
                                waitMs: Math.max(defaultBackoff, getRetryAfterMilliseconds(response)),
                                isRateLimit: response.status === 429,
                            };
                        } else {
                            throw geminiError;
                        }
                    } else {
                        return getGeminiInteractionText(payload);
                    }
                } catch (error) {
                    if (error.name === 'AbortError') throw makeGeminiError('Gemini phản hồi quá lâu, đã chuyển sang OCR trên máy', 408);
                    const canRetryNetwork = attempt < retries
                        && error.name !== 'GeminiApiError'
                        && /network|fetch|failed to fetch/i.test(error.message);
                    if (!canRetryNetwork) throw error;
                    retryPlan = {
                        waitMs: Math.min(2000 * (2 ** attempt), 15000),
                        isRateLimit: false,
                    };
                } finally {
                    clearTimeout(timer);
                    finishRateSlot();
                }
                if (retryPlan) {
                    await waitBeforeGeminiRetry(
                        retryPlan.waitMs,
                        attempt,
                        retries,
                        onRateLimit,
                        retryPlan.isRateLimit
                    );
                }
            }
            throw new Error('Không thể kết nối Gemini');
        }

        async function imageFileToPart(imageFile) {
            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
            return {
                inlineData: {
                    mimeType: imageFile.type,
                    data: dataUrl.split(',')[1],
                },
            };
        }

        async function geminiExtractVerified(imageFile, prompt, schema, onStage, verifySecondPass = true) {
            const imagePart = await imageFileToPart(imageFile);
            if (onStage) onStage('Đang nhận dạng cấu trúc và từng ô...');
            const firstText = await geminiGenerate([
                { text: prompt },
                imagePart,
            ], {
                schema,
                thinkingLevel: 'high',
                mediaResolution: 'ultra_high',
                timeoutMs: 120000,
                onRateLimit: onStage,
            });
            const firstJson = parseAIJson(firstText);
            if (!firstJson) throw new Error('Lượt nhận dạng đầu không tạo được dữ liệu hợp lệ');
            if (!verifySecondPass) {
                if (onStage) onStage('Đã hoàn tất một lượt để tiết kiệm API');
                return firstJson;
            }

            if (onStage) onStage('Đang đối chiếu lần 2 với ảnh gốc...');
            const verifyPrompt = `
Bạn là kiểm soát viên OCR tiếng Việt. Hãy đối chiếu dữ liệu JSON bên dưới với ẢNH GỐC theo từng hàng và từng ô.

QUY TẮC BẮT BUỘC:
- Sửa mọi lỗi đọc sai ngày, tiết, lớp, môn, thời gian, dấu tiếng Việt và nội dung ô.
- Giữ đúng xuống dòng có ý nghĩa trong cùng một ô.
- Ô trống phải để chuỗi rỗng; tuyệt đối không suy đoán hoặc tự thêm nội dung không nhìn thấy.
- Không chuyển nội dung sang ô khác. Kiểm tra kỹ ranh giới buổi sáng/buổi chiều và Thứ 2–Thứ 7.
- Nếu chữ thực sự không đọc được, giữ phần chắc chắn và thêm mô tả ngắn vào warnings.
- Chỉ trả về JSON đúng lược đồ đã yêu cầu.

DỮ LIỆU LƯỢT 1:
${JSON.stringify(firstJson)}
            `;
            const verifiedText = await geminiGenerate([
                { text: verifyPrompt },
                imagePart,
            ], {
                schema,
                thinkingLevel: 'high',
                mediaResolution: 'ultra_high',
                timeoutMs: 120000,
                onRateLimit: onStage,
            });
            return parseAIJson(verifiedText) || firstJson;
        }

        async function geminiRecoverStructuredImage(imageFile, prompt, schema, onStage) {
            const imagePart = await imageFileToPart(imageFile);
            if (onStage) onStage('Dữ liệu còn thiếu, Gemini đang tự cứu cấu trúc bảng...');
            const recoveryPrompt = `${prompt}

LƯỢT TRƯỚC CHƯA DỰNG ĐƯỢC BẢNG. Hãy đọc lại ẢNH GỐC theo từng đường kẻ và thực hiện bắt buộc:
- Xác định đủ các cột từ trái sang phải; không trả mảng ngày rỗng.
- Mỗi hàng Thứ/ngày phải là một phần tử riêng, kể cả khi các ô nội dung đang trống.
- Với lịch công tác, phải tách riêng morning, afternoon và businessTrip theo đúng vị trí cột.
- Ưu tiên cấu trúc nhìn thấy trong ảnh; không suy đoán nội dung.
- Chỉ trả JSON đúng lược đồ.`;
            const recoveredText = await geminiGenerate([
                { text: recoveryPrompt },
                imagePart,
            ], {
                schema,
                thinkingLevel: 'high',
                mediaResolution: 'ultra_high',
                timeoutMs: 120000,
                onRateLimit: onStage,
            });
            return parseAIJson(recoveredText);
        }

        const OFFLINE_OCR_ASSETS = Object.freeze({
            workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
            corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js',
            langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
        });

        function parseOcrTsvWords(tsvText) {
            const rows = String(tsvText || '').split(/\r?\n/);
            if (rows.length < 2) return [];
            const header = rows[0].split('\t');
            const index = Object.fromEntries(header.map((name, i) => [name, i]));
            const required = ['left', 'top', 'width', 'height', 'conf', 'text'];
            if (!required.every(key => Number.isInteger(index[key]))) return [];
            return rows.slice(1).map(row => {
                const cols = row.split('\t');
                const text = cleanText(cols[index.text]);
                const confidence = Number(cols[index.conf]);
                if (!text || !Number.isFinite(confidence) || confidence < 0) return null;
                const left = Number(cols[index.left]);
                const top = Number(cols[index.top]);
                const width = Number(cols[index.width]);
                const height = Number(cols[index.height]);
                if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
                return normalizeOcrWord({ text, confidence, bbox: { x0:left, y0:top, x1:left + width, y1:top + height } });
            }).filter(Boolean);
        }

        async function runOfflineOcr(imageFile, onStage) {
            await ensureVendorLibrary('tesseract');
            if (!window.Tesseract?.createWorker) {
                throw new Error('Không tải được bộ OCR Tesseract.js');
            }
            if (!imageFile || typeof imageFile !== 'object') {
                throw new Error('Ảnh OCR không hợp lệ');
            }
            const progressLabels = {
                'loading tesseract core': 'đang nạp bộ máy OCR',
                'initializing tesseract': 'đang khởi tạo OCR',
                'loading language traineddata': 'đang nạp tiếng Việt',
                'initializing api': 'đang chuẩn bị nhận dạng',
                'recognizing text': 'đang đọc chữ trong ảnh',
            };
            let worker = null;
            try {
                const oem = window.Tesseract.OEM?.LSTM_ONLY ?? 1;
                const logger = message => {
                    if (!onStage) return;
                    const label = progressLabels[message?.status] || cleanText(message?.status) || 'đang xử lý';
                    const percent = Number.isFinite(message?.progress) ? ` ${Math.round(message.progress * 100)}%` : '';
                    onStage(`OCR trên máy: ${label}${percent}`);
                };
                // Chỉ định rõ worker/core/lang để Service Worker có thể chuẩn bị trước các tài nguyên này.
                // Nếu đang online mà đường dẫn tối ưu gặp lỗi, thử lại cấu hình mặc định của Tesseract.
                try {
                    worker = await window.Tesseract.createWorker(['vie', 'eng'], oem, {
                        ...OFFLINE_OCR_ASSETS,
                        logger,
                    });
                } catch (firstError) {
                    if (!navigator.onLine) throw firstError;
                    if (onStage) onStage('OCR: đang thử lại bộ máy dự phòng...');
                    worker = await window.Tesseract.createWorker(['vie', 'eng'], oem, { logger });
                }
                if (!worker?.recognize) throw new Error('Bộ OCR khởi tạo không đầy đủ');
                if (worker.setParameters) {
                    await worker.setParameters({
                        preserve_interword_spaces: '1',
                        tessedit_pageseg_mode: '3',
                        user_defined_dpi: '300',
                    });
                }
                // TSV cho tọa độ từng từ ổn định hơn blocks và giúp dựng lại đúng ô TKB khi mất mạng.
                let result;
                try {
                    result = await worker.recognize(imageFile, {}, { text: true, tsv: true });
                } catch (tsvError) {
                    console.warn('OCR TSV không khả dụng, quay về text-only:', tsvError);
                    result = await worker.recognize(imageFile);
                }
                const data = result?.data && typeof result.data === 'object' ? result.data : {};
                const tsvWords = parseOcrTsvWords(data.tsv);
                return {
                    text: cleanText(data.text),
                    words: tsvWords.length ? tsvWords : extractOcrWords(data),
                };
            } catch (error) {
                const message = cleanText(error?.message) || 'OCR trên máy gặp lỗi không xác định';
                throw new Error(`OCR trên máy: ${message}`);
            } finally {
                if (worker?.terminate) await worker.terminate().catch(() => {});
            }
        }

        function normalizeOcrWord(value) {
            if (!value || typeof value !== 'object') return null;
            const box = value.bbox || value.boundingBox || value;
            const x0 = Number(box.x0 ?? box.left ?? box.x);
            const y0 = Number(box.y0 ?? box.top ?? box.y);
            const x1 = Number(box.x1 ?? box.right ?? (Number.isFinite(x0) ? x0 + Number(box.width) : NaN));
            const y1 = Number(box.y1 ?? box.bottom ?? (Number.isFinite(y0) ? y0 + Number(box.height) : NaN));
            const text = cleanText(value.text || value.symbol || value.value);
            if (!text || ![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return null;
            return {
                text,
                x0,
                y0,
                x1,
                y1,
                cx: (x0 + x1) / 2,
                cy: (y0 + y1) / 2,
                height: y1 - y0,
                confidence: Number(value.confidence ?? value.conf ?? 100),
            };
        }

        function extractOcrWords(data) {
            const collected = [];
            const seen = new Set();
            const addWord = value => {
                const word = normalizeOcrWord(value);
                if (!word) return;
                const key = `${word.text}|${Math.round(word.x0)}|${Math.round(word.y0)}|${Math.round(word.x1)}|${Math.round(word.y1)}`;
                if (seen.has(key)) return;
                seen.add(key);
                collected.push(word);
            };
            const visit = node => {
                if (!node) return;
                if (Array.isArray(node)) {
                    node.forEach(visit);
                    return;
                }
                if (typeof node !== 'object') return;
                if (Array.isArray(node.words) && node.words.length) {
                    node.words.forEach(addWord);
                    return;
                }
                if (Array.isArray(node.lines) && node.lines.length) {
                    node.lines.forEach(visit);
                    return;
                }
                if (Array.isArray(node.paragraphs) && node.paragraphs.length) {
                    node.paragraphs.forEach(visit);
                    return;
                }
                if (Array.isArray(node.blocks) && node.blocks.length) {
                    node.blocks.forEach(visit);
                    return;
                }
                addWord(node);
            };
            if (Array.isArray(data?.words)) data.words.forEach(addWord);
            if (Array.isArray(data?.blocks)) data.blocks.forEach(visit);
            return collected.sort((a, b) => a.cy - b.cy || a.x0 - b.x0);
        }

        function medianOcrValue(values, fallback = 12) {
            const numbers = values.filter(Number.isFinite).sort((a, b) => a - b);
            if (!numbers.length) return fallback;
            const middle = Math.floor(numbers.length / 2);
            return numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
        }

        function groupOcrWordsIntoLines(words) {
            const tolerance = Math.max(5, medianOcrValue(words.map(word => word.height), 12) * 0.72);
            const lines = [];
            [...words].sort((a, b) => a.cy - b.cy || a.x0 - b.x0).forEach(word => {
                let line = lines.find(candidate => Math.abs(candidate.cy - word.cy) <= tolerance);
                if (!line) {
                    line = { words: [], cy: word.cy };
                    lines.push(line);
                }
                line.words.push(word);
                line.cy = line.words.reduce((total, item) => total + item.cy, 0) / line.words.length;
            });
            return lines.map(line => {
                line.words.sort((a, b) => a.x0 - b.x0);
                line.text = line.words.map(word => word.text).join(' ');
                line.lookup = normalizeLookupText(line.text);
                line.y0 = Math.min(...line.words.map(word => word.y0));
                line.y1 = Math.max(...line.words.map(word => word.y1));
                return line;
            }).sort((a, b) => a.cy - b.cy);
        }

        function ocrWordsToMultilineText(words) {
            return groupOcrWordsIntoLines(words)
                .map(line => cleanText(line.text))
                .filter(Boolean)
                .join('\n');
        }

        function detectPlanDayFromOcrLookup(value) {
            const lookup = normalizeLookupText(value);
            const weekday = lookup.match(/thu([2-7])/i)?.[1];
            if (weekday) return `Thứ ${weekday}`;
            if (lookup.includes('chunhat') || /^cn(?:\d|$)/.test(lookup)) return 'Chủ nhật';
            return '';
        }

        function detectPlanOcrLayout(words) {
            if (!Array.isArray(words) || words.length < 8) return null;
            const lines = groupOcrWordsIntoLines(words);
            const candidates = lines.map(line => {
                const lookup = line.lookup;
                const score = Number(lookup.includes('ngay') || lookup.includes('thu'))
                    + Number(lookup.includes('sang'))
                    + Number(lookup.includes('chieu'))
                    + Number(lookup.includes('congtac'));
                return { line, score };
            }).filter(item => item.score >= 2).sort((a, b) => b.score - a.score || a.line.cy - b.line.cy);
            const header = candidates[0];
            if (!header) return null;

            const minX = Math.min(...words.map(word => word.x0));
            const maxX = Math.max(...words.map(word => word.x1));
            const width = Math.max(1, maxX - minX);
            const centerFor = (matcher, fallbackRatio) => {
                const matches = header.line.words.filter(word => matcher(normalizeLookupText(word.text)));
                return matches.length
                    ? matches.reduce((total, word) => total + word.cx, 0) / matches.length
                    : minX + width * fallbackRatio;
            };
            let centers = [
                centerFor(value => value.includes('ngay') || value === 'thu', 0.07),
                centerFor(value => value.includes('sang'), 0.32),
                centerFor(value => value.includes('chieu'), 0.63),
                centerFor(value => value.includes('cong') || value.includes('tac'), 0.88),
            ];
            let estimatedColumns = header.score < 4 || centers.some((center, index) => index > 0 && center <= centers[index - 1]);
            if (estimatedColumns) {
                centers = [0.07, 0.32, 0.63, 0.88].map(ratio => minX + width * ratio);
            }
            return {
                headerBottom: header.line.y1,
                boundaries: [
                    (centers[0] + centers[1]) / 2,
                    (centers[1] + centers[2]) / 2,
                    (centers[2] + centers[3]) / 2,
                ],
                headerScore: header.score,
                estimatedColumns,
            };
        }

        function createPlanDraftFromSpatialOcr(ocrResult, sourceError = '') {
            const text = cleanText(ocrResult?.text);
            const words = Array.isArray(ocrResult?.words) ? ocrResult.words.map(normalizeOcrWord).filter(Boolean) : [];
            const layout = detectPlanOcrLayout(words);
            if (!layout) return null;

            const [dayBoundary, morningBoundary, afternoonBoundary] = layout.boundaries;
            const bodyWords = words.filter(word => word.cy > layout.headerBottom);
            const dayColumnLines = groupOcrWordsIntoLines(bodyWords.filter(word => word.cx < dayBoundary));
            const anchors = [];
            dayColumnLines.forEach(line => {
                const day = detectPlanDayFromOcrLookup(line.text);
                if (!day) return;
                // Không dùng Map theo tên thứ: một số lịch công tác có CN của tuần trước ở đầu
                // và CN của tuần hiện tại ở cuối (hai dòng "Chủ nhật" trong cùng một ảnh).
                const tooClose = anchors.some(item => item.day === day && Math.abs(item.cy - line.cy) < 18);
                if (!tooClose) anchors.push({ day, cy: line.cy });
            });
            anchors.sort((a, b) => a.cy - b.cy);
            if (anchors.length < 4) return null;

            const medianHeight = medianOcrValue(words.map(word => word.height), 12);
            const maxY = Math.max(...bodyWords.map(word => word.y1), layout.headerBottom + medianHeight);
            const rows = anchors.map((anchor, index) => ({
                ...anchor,
                top: index === 0 ? layout.headerBottom : (anchors[index - 1].cy + anchor.cy) / 2,
                bottom: index === anchors.length - 1 ? maxY + medianHeight : (anchor.cy + anchors[index + 1].cy) / 2,
            }));

            const mappedRows = [];
            rows.forEach(row => {
                const rowWords = bodyWords.filter(word => word.cy >= row.top && word.cy < row.bottom);
                const dayWords = rowWords.filter(word => word.cx < dayBoundary);
                const date = ocrWordsToMultilineText(dayWords)
                    .match(/\b\d{1,2}\s*[\/.-]\s*\d{1,2}(?:\s*[\/.-]\s*\d{2,4})?\b/)?.[0]?.replace(/\s+/g, '') || '';
                mappedRows.push({
                    day: row.day,
                    date,
                    morning: ocrWordsToMultilineText(rowWords.filter(word => word.cx >= dayBoundary && word.cx < morningBoundary)),
                    afternoon: ocrWordsToMultilineText(rowWords.filter(word => word.cx >= morningBoundary && word.cx < afternoonBoundary)),
                    businessTrip: ocrWordsToMultilineText(rowWords.filter(word => word.cx >= afternoonBoundary)),
                });
            });

            const base = createPlanDraftFromOcr(text, 'offline-spatial', '');
            base.days = canonicalizePlanDays(mappedRows, base.dateRange);
            PLAN_DAYS.forEach(day => {
                if (!base.days.some(item => item.day === day)) {
                    base.days.push({ day, date: '', morning: '', afternoon: '', businessTrip: '' });
                }
            });
            base.days.sort((a, b) => planDayOrder(a.day) - planDayOrder(b.day));
            base.sourceMode = 'offline-spatial';
            base.fallbackReason = cleanText(sourceError);
            const headerConfidence = Math.min(1, layout.headerScore / 4);
            base.ocrLayoutConfidence = Math.round((anchors.length / PLAN_DAYS.length * 0.65
                + headerConfidence * 0.25
                + (layout.estimatedColumns ? 0.03 : 0.1)) * 100);
            base.warnings = [];
            if (anchors.length < PLAN_DAYS.length) {
                base.warnings.push(`OCR định vị được ${anchors.length}/${PLAN_DAYS.length} hàng ngày; các hàng còn thiếu được để trống để thầy kiểm tra.`);
            }
            if (layout.estimatedColumns) {
                base.warnings.push('Ranh giới một số cột được ước lượng từ độ rộng bảng; nên kiểm tra các ô sát đường phân cột.');
            }
            const lowConfidenceCount = bodyWords.filter(word => Number.isFinite(word.confidence) && word.confidence < 45).length;
            if (lowConfidenceCount >= 4) {
                base.warnings.push(`Có ${lowConfidenceCount} cụm chữ mờ có độ tin cậy OCR thấp; các ô chứa chữ mờ nên được đối chiếu ảnh gốc.`);
            }
            return base;
        }

        function getNextAvailablePlanWeek() {
            for (let week = 1; week <= MAX_SCHOOL_WEEKS; week++) {
                if (!state.planData.some(item => item.week === week)) return week;
            }
            return MAX_SCHOOL_WEEKS;
        }

        function getLatestPlanWeek() {
            const plans = [...state.planData];
            if (!plans.length) return null;
            plans.sort((a, b) => {
                const timeDifference = (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
                return timeDifference || b.week - a.week;
            });
            return plans[0].week;
        }

        function inferPlanWeekFromDateRange(dateRange) {
            try {
                const range = parsePlanDateRange(dateRange);
                const workspace = typeof getActiveYearWorkspace === 'function' ? getActiveYearWorkspace() : null;
                const week1Start = normalizeISODate(workspace?.week1Start);
                if (!range?.start || !week1Start) return null;
                const [year, month, day] = week1Start.split('-').map(Number);
                const base = new Date(year, month - 1, day);
                const start = new Date(range.start);
                const days = Math.round((start - base) / 86400000);
                if (days % 7 !== 0) return null;
                const week = days >= 0 ? (days / 7) + 1 : days / 7;
                return isValidPlanWeek(week) ? week : null;
            } catch (error) {
                return null;
            }
        }

        function selectPlanOcrDayLine(lines, day, dateRange) {
            const number = day.slice(-1);
            const matcher = day === 'Chủ nhật'
                ? /^(?:CN|Chủ\s*nhật|Chu\s*nhat)\b/i
                : new RegExp(`Th[ứu]\\s*${number}\\b`, 'i');
            const candidates = lines.filter(item => matcher.test(item));
            if (candidates.length <= 1) return candidates[0] || '';

            const range = parsePlanDateRange(dateRange);
            const dayIndex = PLAN_DAYS.indexOf(day);
            if (!range?.start || dayIndex < 0) return candidates[0];
            const expected = new Date(range.start);
            expected.setDate(expected.getDate() + dayIndex);
            const expectedTime = new Date(expected.getFullYear(), expected.getMonth(), expected.getDate()).getTime();
            const startTime = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate()).getTime();
            const endTime = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate()).getTime();

            const ranked = candidates.map((line, order) => {
                const rawDate = line.match(/\b\d{1,2}\s*[\/.-]\s*\d{1,2}(?:\s*[\/.-]\s*\d{2,4})?\b/)?.[0] || '';
                const parts = parsePlanDateParts(rawDate);
                if (!parts) return { line, order, exact: false, inRange: false, diff: Number.MAX_SAFE_INTEGER };
                const year = parts.year || expected.getFullYear();
                const date = new Date(year, parts.month - 1, parts.day);
                if (Number.isNaN(date.getTime())) return { line, order, exact: false, inRange: false, diff: Number.MAX_SAFE_INTEGER };
                const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                return {
                    line,
                    order,
                    exact: time === expectedTime,
                    inRange: time >= startTime && time <= endTime,
                    diff: Math.abs(time - expectedTime),
                };
            });
            ranked.sort((a, b) => Number(b.exact) - Number(a.exact)
                || Number(b.inRange) - Number(a.inRange)
                || a.diff - b.diff
                || a.order - b.order);
            return ranked[0]?.line || candidates[0];
        }

        function createPlanDraftFromOcr(ocrText, sourceMode = 'offline-ocr', sourceError = '') {
            const text = cleanText(ocrText);
            const lines = text.split('\n').map(cleanText).filter(Boolean);
            const weekMatch = text.match(/Tu[ầa]n\s*[:\-]?\s*(\d{1,2})/i);
            const title = lines.find(line => /LỊCH\s+CÔNG\s+TÁC/i.test(line)) || 'LỊCH CÔNG TÁC';
            const schoolYear = text.match(/(?:NĂM\s+HỌC\s*)?(20\d{2}\s*[-–]\s*20\d{2})/i)?.[1] || '';
            const dateRange = lines.find(line => /Từ\s+ngày.+đến/i.test(line)) || '';
            let week = Number.parseInt(weekMatch?.[1], 10);
            if (!isValidPlanWeek(week)) week = inferPlanWeekFromDateRange(dateRange) || getNextAvailablePlanWeek();
            const duty = text.match(/Trực\s*:?\s*([^\n]+)/i)?.[1] || '';
            const days = PLAN_DAYS.map(day => {
                const line = selectPlanOcrDayLine(lines, day, dateRange);
                const date = line.match(/\b\d{1,2}\s*[\/.-]\s*\d{1,2}(?:\s*[\/.-]\s*\d{2,4})?\b/)?.[0]?.replace(/\s+/g, '') || '';
                return { day, date, morning: '', afternoon: '', businessTrip: '' };
            });
            const warnings = sourceMode === 'manual'
                ? ['Không thể chạy Gemini hoặc OCR trên máy. Đã tạo mẫu trống để nhập thủ công.']
                : ['OCR trên máy đã lấy văn bản nhưng không tự đoán vị trí các cột sáng, chiều và đi công tác. Hãy đối chiếu phần văn bản OCR rồi sửa từng hàng.'];
            if (sourceError) warnings.push(`Nguyên nhân chuyển chế độ: ${cleanText(sourceError).slice(0, 240)}`);
            return {
                title,
                schoolYear: cleanText(schoolYear),
                week,
                dateRange,
                duty: cleanText(duty),
                days,
                warnings,
                sourceMode,
                offlineOcrText: text,
            };
        }

        function detectTimetableHeaderCandidates(words) {
            const lines = groupOcrWordsIntoLines(words);
            return lines.map(line => {
                const centers = new Map();
                line.words.forEach((word, index) => {
                    const lookup = normalizeLookupText(word.text);
                    const combined = lookup.match(/^thu([2-7])$/i)?.[1];
                    if (combined) centers.set(Number(combined), word.cx);
                    if (/^[2-7]$/.test(lookup)) {
                        const previous = normalizeLookupText(line.words[index - 1]?.text || '');
                        if (previous.includes('thu') || line.lookup.includes('thu')) centers.set(Number(lookup), word.cx);
                    }
                });
                const dayCount = centers.size;
                const hasPeriodHeader = line.lookup.includes('tiet') || line.lookup.includes('tkb');
                return { line, centers, score: dayCount * 2 + Number(hasPeriodHeader) };
            }).filter(item => item.centers.size >= 4)
                .sort((a, b) => a.line.cy - b.line.cy);
        }

        function completeTimetableDayCenters(candidate, minX, maxX) {
            const known = [...candidate.centers.entries()].sort((a, b) => a[0] - b[0]);
            let step = 0;
            if (known.length >= 2) {
                const slopes = [];
                for (let i = 1; i < known.length; i++) {
                    const deltaDay = known[i][0] - known[i - 1][0];
                    if (deltaDay > 0) slopes.push((known[i][1] - known[i - 1][1]) / deltaDay);
                }
                step = medianOcrValue(slopes.filter(value => value > 0), 0);
            }
            if (!(step > 0)) step = Math.max(1, (maxX - minX) / 6.7);
            const anchor = known[0] || [2, minX + step * 0.85];
            const centers = SCHOOL_DAYS.map((day, index) => {
                const number = index + 2;
                return candidate.centers.get(number) ?? (anchor[1] + (number - anchor[0]) * step);
            });
            // Bảo đảm tăng dần; OCR đôi khi đặt nhầm một chữ số của tiêu đề.
            for (let i = 1; i < centers.length; i++) {
                if (!(centers[i] > centers[i - 1])) centers[i] = centers[i - 1] + step;
            }
            return { centers, step };
        }

        function inferTimetablePeriodCenters(words, headerBottom, sectionBottom, leftBoundary) {
            const candidates = words.filter(word => word.cy > headerBottom && word.cy < sectionBottom && word.cx < leftBoundary)
                .map(word => ({ word, period: Number.parseInt(normalizeLookupText(word.text), 10) }))
                .filter(item => item.period >= 1 && item.period <= 5);
            const byPeriod = new Map();
            candidates.forEach(item => {
                const current = byPeriod.get(item.period);
                if (!current || item.word.confidence > current.confidence) byPeriod.set(item.period, item.word);
            });
            const known = [...byPeriod.entries()].sort((a, b) => a[0] - b[0]);
            let rowStep = 0;
            if (known.length >= 2) {
                const slopes = [];
                for (let i = 1; i < known.length; i++) {
                    const delta = known[i][0] - known[i - 1][0];
                    if (delta > 0) slopes.push((known[i][1].cy - known[i - 1][1].cy) / delta);
                }
                rowStep = medianOcrValue(slopes.filter(value => value > 0), 0);
            }
            const available = Math.max(30, sectionBottom - headerBottom);
            if (!(rowStep > 0)) rowStep = available / 5.4;
            const firstKnown = known[0];
            const firstCenter = firstKnown
                ? firstKnown[1].cy - (firstKnown[0] - 1) * rowStep
                : headerBottom + rowStep * 0.65;
            const centers = [1,2,3,4,5].map(period => byPeriod.get(period)?.cy ?? (firstCenter + (period - 1) * rowStep));
            for (let i = 1; i < centers.length; i++) {
                if (!(centers[i] > centers[i - 1])) centers[i] = centers[i - 1] + rowStep;
            }
            return { centers, anchorCount: byPeriod.size, rowStep };
        }

        function parseTimetableOcrCell(cellText) {
            const content = cleanText(cellText);
            if (!content) return null;
            const classMatch = content.match(/\b(?:6|7|8|9|10|11|12)\s*[A-ZĐ]\s*\d{1,2}\b/i);
            const className = classMatch ? classMatch[0].replace(/\s+/g, '').toUpperCase() : '';
            let subject = content;
            if (classMatch) subject = cleanText(content.replace(classMatch[0], ' ').replace(/^[-–—:|]+|[-–—:|]+$/g, ''));
            // Các ô chỉ còn số thứ/tiết không phải tiết học.
            if (!className && /^(?:[1-7]|thu\s*[2-7]|tiet\s*[1-5])$/i.test(normalizeLookupText(content))) return null;
            return {
                className,
                subject,
                content,
            };
        }

        function createTimetableDraftFromSpatialOcr(ocrResult, sourceError = '') {
            const text = cleanText(ocrResult?.text);
            const words = Array.isArray(ocrResult?.words) ? ocrResult.words.map(normalizeOcrWord).filter(Boolean) : [];
            if (words.length < 12) return null;
            const headers = detectTimetableHeaderCandidates(words);
            if (!headers.length) return null;
            const minX = Math.min(...words.map(word => word.x0));
            const maxX = Math.max(...words.map(word => word.x1));
            const maxY = Math.max(...words.map(word => word.y1));
            // Giữ tối đa hai tiêu đề ngày cách nhau đủ xa: sáng và chiều.
            const selectedHeaders = [];
            headers.forEach(candidate => {
                if (!selectedHeaders.some(item => Math.abs(item.line.cy - candidate.line.cy) < 24)) selectedHeaders.push(candidate);
            });
            const sessionHeaders = selectedHeaders.slice(0, 2);
            if (!sessionHeaders.length) return null;

            const base = createTimetableDraftFromOcr(text, 'offline-spatial', sourceError);
            let totalCells = 0;
            let totalPeriodAnchors = 0;
            let detectedHeaderDays = 0;

            sessionHeaders.forEach((candidate, sessionIndex) => {
                const sessionKey = sessionIndex === 0 ? 'morning' : 'afternoon';
                const targetSession = base.sessions.find(session => session.key === sessionKey);
                if (!targetSession) return;
                const { centers: dayCenters, step: dayStep } = completeTimetableDayCenters(candidate, minX, maxX);
                detectedHeaderDays += candidate.centers.size;
                const leftBoundary = dayCenters[0] - dayStep * 0.52;
                const nextHeader = sessionHeaders[sessionIndex + 1];
                let sectionBottom = nextHeader ? nextHeader.line.y0 - 4 : maxY + medianOcrValue(words.map(word => word.height), 12);
                const periodLayout = inferTimetablePeriodCenters(words, candidate.line.y1, sectionBottom, leftBoundary);
                totalPeriodAnchors += periodLayout.anchorCount;
                // Nếu có đủ mốc tiết, thu hẹp đáy phần để chữ “BUỔI CHIỀU” không bị kéo vào tiết 5 sáng.
                if (periodLayout.anchorCount >= 3) {
                    sectionBottom = Math.min(sectionBottom, periodLayout.centers[4] + periodLayout.rowStep * 0.55);
                }
                const xBounds = dayCenters.map((center, index) => ({
                    left: index === 0 ? leftBoundary : (dayCenters[index - 1] + center) / 2,
                    right: index === dayCenters.length - 1 ? center + dayStep * 0.52 : (center + dayCenters[index + 1]) / 2,
                }));
                const yBounds = periodLayout.centers.map((center, index) => ({
                    top: index === 0 ? candidate.line.y1 : (periodLayout.centers[index - 1] + center) / 2,
                    bottom: index === 4 ? sectionBottom : (center + periodLayout.centers[index + 1]) / 2,
                }));

                targetSession.periods.forEach((period, periodIndex) => {
                    const yBand = yBounds[periodIndex];
                    SCHOOL_DAYS.forEach((day, dayIndex) => {
                        const xBand = xBounds[dayIndex];
                        const cellWords = words.filter(word =>
                            word.cx >= xBand.left && word.cx < xBand.right
                            && word.cy >= yBand.top && word.cy < yBand.bottom
                            && word.confidence >= 10);
                        const parsed = parseTimetableOcrCell(ocrWordsToMultilineText(cellWords));
                        if (!parsed) return;
                        period.cells.push({ day, ...parsed });
                        totalCells += 1;
                    });
                });
            });

            if (!totalCells) return null;
            base.sourceMode = 'offline-spatial';
            base.fallbackReason = cleanText(sourceError);
            base.ocrLayoutConfidence = Math.max(30, Math.min(98, Math.round(
                (Math.min(1, detectedHeaderDays / 12) * 0.42
                + Math.min(1, totalPeriodAnchors / 10) * 0.33
                + Math.min(1, totalCells / 12) * 0.25) * 100
            )));
            base.warnings = [];
            if (sessionHeaders.length < 2) base.warnings.push('OCR chỉ xác định chắc chắn một phần của thời khóa biểu; hãy kiểm tra lại buổi còn lại.');
            if (totalPeriodAnchors < 8) base.warnings.push('Một số số tiết không đọc rõ nên vị trí hàng được ước lượng theo khoảng cách đều.');
            if (detectedHeaderDays < 10) base.warnings.push('Một số tiêu đề Thứ bị mờ; hệ thống đã nội suy vị trí cột từ các Thứ đọc được.');
            const lowConfidence = words.filter(word => Number.isFinite(word.confidence) && word.confidence < 45).length;
            if (lowConfidence >= 6) base.warnings.push(`Có ${lowConfidence} cụm chữ mờ; nên đối chiếu lại các ô quan trọng.`);
            return base;
        }

        function createTimetableDraftFromOcr(ocrText, sourceMode = 'offline-ocr', sourceError = '') {
            const text = cleanText(ocrText);
            const warnings = sourceMode === 'manual'
                ? ['Không thể chạy Gemini hoặc OCR trên máy. Đã tạo thời khóa biểu trống để nhập thủ công.']
                : ['OCR trên máy đã lấy văn bản nhưng không tự suy đoán giao điểm buổi × thứ × tiết. Hãy xem văn bản OCR và nhấp vào từng ô để điền chính xác.'];
            if (sourceError) warnings.push(`Nguyên nhân chuyển chế độ: ${cleanText(sourceError).slice(0, 240)}`);
            return {
                title: 'THỜI KHÓA BIỂU TUẦN',
                days: [...SCHOOL_DAYS],
                sessions: ['morning', 'afternoon'].map(key => ({
                    key,
                    label: key === 'morning' ? 'BUỔI SÁNG' : 'BUỔI CHIỀU',
                    periods: [1, 2, 3, 4, 5].map(period => ({ period, cells: [] })),
                })),
                warnings,
                sourceMode,
                offlineOcrText: text,
            };
        }

        function rememberRecentRecognitionFile(kind, hash, file) {
            if (!kind || !hash || !file) return;
            const key = `${kind}:${hash}`;
            state.recentRecognitionFiles[key] = file;
            if (window.URL?.createObjectURL) {
                const previousUrl = state.recentRecognitionPreviews[key];
                if (previousUrl && window.URL?.revokeObjectURL) window.URL.revokeObjectURL(previousUrl);
                try {
                    state.recentRecognitionPreviews[key] = window.URL.createObjectURL(file);
                } catch (error) {
                    console.warn('Không thể tạo ảnh xem trước:', error);
                }
            }
            const keys = Object.keys(state.recentRecognitionFiles);
            while (keys.length > 8) {
                const oldestKey = keys.shift();
                const previewUrl = state.recentRecognitionPreviews[oldestKey];
                if (previewUrl && window.URL?.revokeObjectURL) window.URL.revokeObjectURL(previewUrl);
                delete state.recentRecognitionFiles[oldestKey];
                delete state.recentRecognitionPreviews[oldestKey];
            }
        }

        function normalizeRecognitionSafely(normalize, value, context = 'dữ liệu nhận dạng') {
            if (typeof normalize !== 'function') throw new Error(`Thiếu hàm chuẩn hóa ${context}`);
            try {
                return normalize(value);
            } catch (error) {
                console.error(`Lỗi chuẩn hóa ${context}:`, error, value);
                throw new Error(`Không thể chuẩn hóa ${context}: ${cleanText(error?.message) || 'lỗi dữ liệu'}`);
            }
        }

        function validateRecognitionSafely(validate, value) {
            if (typeof validate !== 'function') return true;
            try {
                return Boolean(validate(value));
            } catch (error) {
                console.warn('Hàm kiểm tra dữ liệu nhận dạng phát sinh lỗi:', error, value);
                return false;
            }
        }

        async function recognizeStructuredImage({ file, kind, prompt, schema, normalize, validateGemini, onStage }) {
            if (onStage) onStage('Đang kiểm tra bộ nhớ ảnh...');
            const hash = await hashImageFile(file);
            rememberRecentRecognitionFile(kind, hash, file);
            const cached = getCachedRecognition(kind, hash);
            if (cached) {
                const cachedData = normalizeRecognitionSafely(normalize, cached, `${kind} từ bộ nhớ`);
                if (cachedData) {
                    cachedData.cacheHash = hash;
                    cachedData.cacheHit = true;
                    setRecognitionRuntime('Dùng kết quả đã lưu', 'cache');
                    if (onStage) onStage('Đã tìm thấy ảnh này, không gọi API');
                    return cachedData;
                }
            }

            const mode = state.recognitionMode;
            let geminiError = null;
            if (mode !== 'offline' && hasUsableGeminiKey() && !isGeminiDailyBlocked()) {
                try {
                    const verifySecondPass = mode !== 'economy';
                    let json = await geminiExtractVerified(file, prompt, schema, onStage, verifySecondPass);
                    let data = normalizeRecognitionSafely(normalize, json, `${kind} từ Gemini`);
                    let recoveredStructure = false;
                    if (!data || !validateRecognitionSafely(validateGemini, data)) {
                        json = await geminiRecoverStructuredImage(file, prompt, schema, onStage);
                        data = normalizeRecognitionSafely(normalize, json, `${kind} sau cứu cấu trúc`);
                        recoveredStructure = true;
                    }
                    if (!data || !validateRecognitionSafely(validateGemini, data)) {
                        throw new Error('Dữ liệu Gemini vẫn chưa đủ để dựng bảng sau lượt cứu cấu trúc');
                    }
                    data.sourceMode = recoveredStructure
                        ? 'gemini-recovered'
                        : verifySecondPass ? 'gemini-verified' : 'gemini-economy';
                    data.offlineOcrText = '';
                    data.cacheHash = hash;
                    data.cacheHit = false;
                    cacheRecognition(kind, hash, data);
                    setRecognitionRuntime(recoveredStructure
                        ? 'Gemini · đã cứu cấu trúc'
                        : verifySecondPass ? 'Gemini · 2 lượt' : 'Gemini · tiết kiệm', 'gemini');
                    return data;
                } catch (error) {
                    geminiError = error;
                    if (error.isDailyQuota) {
                        state.dailyQuotaBlocked = true;
                        sessionStorage.setItem('gemini_daily_quota_blocked', '1');
                    }
                    console.warn('Chuyển sang OCR trên máy:', error);
                    const reason = error.isQuota
                        ? 'Gemini hết hạn mức'
                        : /chưa đủ|cứu cấu trúc/i.test(error.message) ? 'Gemini chưa dựng đủ bảng' : 'Gemini không dùng được';
                    if (onStage) onStage(`${reason}, đang chuyển sang OCR trên máy...`);
                    setRecognitionRuntime(`${reason} · đang dự phòng`, 'offline');
                }
            } else if (mode !== 'offline') {
                geminiError = makeGeminiError(
                    isGeminiDailyBlocked() ? 'Hạn mức Gemini theo ngày đã hết trong phiên này' : 'Chưa có API key Gemini hợp lệ',
                    isGeminiDailyBlocked() ? 429 : 0
                );
                geminiError.isQuota = isGeminiDailyBlocked();
                geminiError.isDailyQuota = isGeminiDailyBlocked();
                if (onStage) onStage(isGeminiDailyBlocked()
                    ? 'Hạn mức ngày đã hết, bỏ qua Gemini và dùng OCR trên máy...'
                    : 'Chưa có API key, đang dùng OCR trên máy...');
            }

            let ocrResult = { text: '', words: [] };
            let sourceMode = 'offline-ocr';
            let offlineError = null;
            try {
                ocrResult = await runOfflineOcr(file, onStage);
                if (!cleanText(ocrResult?.text)) throw new Error('OCR trên máy không đọc được chữ');
            } catch (error) {
                offlineError = error;
                sourceMode = 'manual';
                console.warn('OCR trên máy không khả dụng, tạo mẫu nhập tay:', error);
                if (onStage) onStage('OCR trên máy không khả dụng, đang tạo mẫu nhập thủ công...');
            }

            const sourceError = [geminiError?.message, offlineError?.message].filter(Boolean).join(' · ');
            const draft = kind === 'plan'
                ? (sourceMode === 'offline-ocr' ? createPlanDraftFromSpatialOcr(ocrResult, sourceError) : null)
                    || createPlanDraftFromOcr(ocrResult.text, sourceMode, sourceError)
                : (sourceMode === 'offline-ocr' ? createTimetableDraftFromSpatialOcr(ocrResult, sourceError) : null)
                    || createTimetableDraftFromOcr(ocrResult.text, sourceMode, sourceError);
            const data = normalizeRecognitionSafely(normalize, draft, `${kind} dự phòng`);
            if (!data) throw new Error('Không thể tạo mẫu dữ liệu dự phòng');
            data.sourceMode = cleanText(draft.sourceMode) || sourceMode;
            data.offlineOcrText = cleanText(ocrResult.text);
            data.cacheHash = hash;
            data.cacheHit = false;
            const cachedOffline = cacheRecognition(kind, hash, data);
            if (!cachedOffline && sourceMode === 'manual') data.cacheHash = '';
            setRecognitionRuntime(data.sourceMode === 'offline-spatial'
                ? 'OCR · đã tự ghép bảng'
                : sourceMode === 'offline-ocr' ? 'OCR trên máy' : 'Nhập thủ công',
            sourceMode === 'manual' ? 'error' : 'offline');
            return data;
        }

        async function extractDocumentText(file) {
            let content = '';
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.docx')) {
                await ensureVendorLibrary('mammoth');
                if (!window.mammoth) throw new Error('Không tải được thư viện đọc Word');
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                content = result.value;
            } else if (/\.xlsx?$/.test(lowerName)) {
                await ensureVendorLibrary('xlsx');
                if (!window.XLSX) throw new Error('Không tải được thư viện đọc Excel');
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                content = workbook.SheetNames.map(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, {
                        header: 1,
                        raw: false,
                        defval: '',
                        blankrows: false,
                    });
                    const tabSeparatedRows = rows.map(row => row
                        .map(cell => cleanText(cell).replace(/[\t\n]+/g, ' '))
                        .join('\t')).join('\n');
                    return `\n=== SHEET: ${sheetName} ===\n${tabSeparatedRows}`;
                }).join('\n');
            } else {
                throw new Error('Định dạng file chưa được hỗ trợ');
            }
            return cleanText(content);
        }

        async function geminiTextFromFile(file, prompt, extractedContent = '', onStage = null) {
            const content = extractedContent || await extractDocumentText(file);
            const maxChars = 50000;
            const truncated = content.length > maxChars;
            const documentText = content.slice(0, maxChars) + (truncated ? '\n[ĐÃ RÚT GỌN VÌ FILE QUÁ DÀI]' : '');
            return geminiGenerate([{ text: prompt + '\n\nNội dung file:\n' + documentText }], {
                onRateLimit: onStage,
            });
        }
        function parseAIJson(text) {
            const cleaned = String(text || '')
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();
            try {
                return JSON.parse(cleaned);
            } catch (error) {
                const firstBrace = cleaned.indexOf('{');
                const lastBrace = cleaned.lastIndexOf('}');
                if (firstBrace >= 0 && lastBrace > firstBrace) {
                    try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)); } catch (ignored) {}
                }
                return null;
            }
        }

        function escapeHTML(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
            })[char]);
        }

        function getRecognitionSourceInfo(data) {
            if (data?.cacheHit) {
                return { icon: '⚡', title: 'Đã dùng bộ nhớ ảnh.', text: 'Ảnh này đã được xử lý trước đó nên trang không gọi lại Gemini hoặc OCR.' };
            }
            const source = data?.sourceMode;
            if (source === 'revision-merge') {
                return { icon: '🔄', title: 'Đã hợp nhất lịch công tác điều chỉnh.', text: 'Hệ thống chỉ cập nhật các thay đổi đã được giáo viên chọn; các nội dung còn lại của tuần được giữ nguyên.' };
            }
            if (source === 'gemini-verified') {
                return { icon: '✅', title: 'Gemini nhận dạng hai lượt.', text: 'Ảnh được đọc ở độ phân giải cao rồi đối chiếu lại từng hàng và từng ô.' };
            }
            if (source === 'gemini-economy') {
                return { icon: '🌿', title: 'Gemini chế độ tiết kiệm.', text: 'Ảnh được đọc một lượt để giảm số yêu cầu API; nên kiểm tra lại các ô quan trọng.' };
            }
            if (source === 'gemini-recovered') {
                return { icon: '🛠️', title: 'Gemini đã tự cứu cấu trúc.', text: 'Lượt đầu còn thiếu dữ liệu; hệ thống đã đọc lại ảnh và dựng đủ cấu trúc bảng trước khi lưu.' };
            }
            if (source === 'offline-spatial') {
                const confidence = Number.isFinite(Number(data?.ocrLayoutConfidence))
                    ? ` Mức tự tin ghép bảng: ${Math.round(Number(data.ocrLayoutConfidence))}%.` : '';
                const isTimetable = Array.isArray(data?.sessions);
                return {
                    icon: '🧩',
                    title: 'OCR đã tự ghép theo vị trí.',
                    text: isTimetable
                        ? `Hệ thống dùng tọa độ chữ để phân vào đúng buổi, Thứ và tiết TKB.${confidence}`
                        : `Hệ thống dùng tọa độ chữ để phân vào đúng cột Sáng, Chiều và Đi công tác.${confidence}`
                };
            }
            if (source === 'offline-ocr') {
                return { icon: '🖥️', title: 'Đang dùng OCR trên máy.', text: 'Không dùng Gemini. Văn bản tiếng Việt được đọc trên thiết bị và mẫu được mở để hiệu chỉnh thủ công.' };
            }
            if (source === 'manual') {
                return { icon: '✍️', title: 'Mẫu nhập thủ công.', text: 'Cả Gemini và OCR trên máy đều không khả dụng; trang vẫn giữ mẫu để nhập dữ liệu.' };
            }
            if (source === 'copied-week') {
                return {
                    icon: '📋',
                    title: `Đã giữ nguyên từ tuần ${data?.copiedFromWeek || 'trước'}.`,
                    text: 'Các tiết đã được sao chép sang tuần này; có thể nhấp vào từng ô để điều chỉnh phần thay đổi.'
                };
            }
            return { icon: 'ℹ️', title: 'Dữ liệu đã lưu.', text: 'Có thể chỉnh sửa trực tiếp nếu cần.' };
        }

        function renderOcrTranscript(text, actionAttributes) {
            if (!cleanText(text)) return '';
            return `
                <details class="ocr-transcript">
                    <summary>📝 Văn bản OCR trên máy — mở để đối chiếu</summary>
                    <div class="ocr-transcript-body">
                        <textarea readonly aria-label="Văn bản OCR trên máy">${escapeHTML(text)}</textarea>
                        <button class="btn btn-outline btn-sm" type="button" style="color:#1e3a5f;border-color:#93c5fd;margin-top:8px;" ${actionAttributes}>📋 Sao chép văn bản</button>
                    </div>
                </details>`;
        }

        async function copyRecognitionText(text) {
            if (!cleanText(text)) return;
            try {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                    showToast('✅ Đã sao chép văn bản OCR', 'success');
                } else {
                    prompt('Sao chép văn bản OCR:', text);
                }
            } catch (error) {
                prompt('Sao chép văn bản OCR:', text);
            }
        }

        function validateUpload(file, kind) {
            if (!file) throw new Error('Chưa chọn file');
            if (kind === 'image') {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) throw new Error(`File ${file.name} không phải JPG, PNG hoặc WebP`);
                if (file.size > 8 * 1024 * 1024) throw new Error(`Ảnh ${file.name} vượt quá 8 MB`);
            } else {
                const lowerName = file.name.toLowerCase();
                if (!/\.(xlsx|xls|docx)$/.test(lowerName)) throw new Error(`File ${file.name} không đúng định dạng Word/Excel`);
                if (file.size > 15 * 1024 * 1024) throw new Error(`File ${file.name} vượt quá 15 MB`);
            }
            return true;
        }

        function invalidateTeachingSchedules(reason, targetWeek = null, affectedSourceSlots = null) {
            const weeks = targetWeek ? [String(targetWeek)] : Object.keys(state.teachingSchedule);
            weeks.forEach(week => {
                if (!state.teachingSchedule[week]) return;
                const current = state.scheduleMeta[week] || {};
                const hasSpecificSlots = Array.isArray(affectedSourceSlots) && affectedSourceSlots.length > 0;
                const keepAllAffected = current.stale && current.affectedScope === 'all';
                state.scheduleMeta[week] = {
                    ...current,
                    stale: true,
                    staleReason: reason,
                    status: 'draft',
                    finalizedAt: '',
                    affectedScope: keepAllAffected || !hasSpecificSlots ? 'all' : 'slots',
                    affectedSourceSlots: keepAllAffected || !hasSpecificSlots
                        ? []
                        : [...new Set([...(current.affectedSourceSlots || []), ...affectedSourceSlots.map(cleanText).filter(Boolean)])],
                };
            });
            if (scheduleValidationContext
                && weeks.includes(String(scheduleValidationContext.week))) closeScheduleValidationPanel();
            persistTeachingScheduleState();
        }
