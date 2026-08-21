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

        async function runOfflineOcr(imageFile, onStage) {
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
                // Tesseract.js v6+ hỗ trợ nhiều ngôn ngữ trong createWorker. Dùng mảng để tránh lỗi phân tích chuỗi ở một số build CDN.
                worker = await window.Tesseract.createWorker(['vie', 'eng'], oem, {
                    logger: message => {
                        if (!onStage) return;
                        const label = progressLabels[message?.status] || cleanText(message?.status) || 'đang xử lý';
                        const percent = Number.isFinite(message?.progress) ? ` ${Math.round(message.progress * 100)}%` : '';
                        onStage(`OCR trên máy: ${label}${percent}`);
                    },
                });
                if (!worker?.recognize) throw new Error('Bộ OCR khởi tạo không đầy đủ');
                if (worker.setParameters) {
                    await worker.setParameters({
                        preserve_interword_spaces: '1',
                        tessedit_pageseg_mode: '3',
                    });
                }
                let result;
                try {
                    // blocks cần cho ghép cột/hàng; nếu build Tesseract không hỗ trợ ổn định thì tự hạ xuống text-only.
                    result = await worker.recognize(imageFile, {}, { text: true, blocks: true });
                } catch (structuredError) {
                    console.warn('OCR blocks không khả dụng, thử lại text-only:', structuredError);
                    if (onStage) onStage('OCR cấu trúc chưa tương thích, đang thử lại chế độ văn bản...');
                    result = await worker.recognize(imageFile);
                }
                const data = result?.data && typeof result.data === 'object' ? result.data : {};
                return {
                    text: cleanText(data.text),
                    words: extractOcrWords(data),
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
            const anchorsByDay = new Map();
            dayColumnLines.forEach(line => {
                const day = detectPlanDayFromOcrLookup(line.text);
                if (day && !anchorsByDay.has(day)) anchorsByDay.set(day, { day, cy: line.cy });
            });
            const anchors = [...anchorsByDay.values()].sort((a, b) => a.cy - b.cy);
            if (anchors.length < 4) return null;

            const medianHeight = medianOcrValue(words.map(word => word.height), 12);
            const maxY = Math.max(...bodyWords.map(word => word.y1), layout.headerBottom + medianHeight);
            const rows = anchors.map((anchor, index) => ({
                ...anchor,
                top: index === 0 ? layout.headerBottom : (anchors[index - 1].cy + anchor.cy) / 2,
                bottom: index === anchors.length - 1 ? maxY + medianHeight : (anchor.cy + anchors[index + 1].cy) / 2,
            }));

            const mappedDays = new Map();
            rows.forEach(row => {
                const rowWords = bodyWords.filter(word => word.cy >= row.top && word.cy < row.bottom);
                const dayWords = rowWords.filter(word => word.cx < dayBoundary);
                const date = ocrWordsToMultilineText(dayWords)
                    .match(/\b\d{1,2}\s*[\/.-]\s*\d{1,2}(?:\s*[\/.-]\s*\d{2,4})?\b/)?.[0]?.replace(/\s+/g, '') || '';
                mappedDays.set(row.day, {
                    day: row.day,
                    date,
                    morning: ocrWordsToMultilineText(rowWords.filter(word => word.cx >= dayBoundary && word.cx < morningBoundary)),
                    afternoon: ocrWordsToMultilineText(rowWords.filter(word => word.cx >= morningBoundary && word.cx < afternoonBoundary)),
                    businessTrip: ocrWordsToMultilineText(rowWords.filter(word => word.cx >= afternoonBoundary)),
                });
            });

            const base = createPlanDraftFromOcr(text, 'offline-spatial', '');
            base.days = PLAN_DAYS.map(day => mappedDays.get(day)
                || { day, date: '', morning: '', afternoon: '', businessTrip: '' });
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

        function createPlanDraftFromOcr(ocrText, sourceMode = 'offline-ocr', sourceError = '') {
            const text = cleanText(ocrText);
            const lines = text.split('\n').map(cleanText).filter(Boolean);
            const weekMatch = text.match(/Tu[ầa]n\s*[:\-]?\s*(\d{1,2})/i);
            let week = Number.parseInt(weekMatch?.[1], 10);
            if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) week = getNextAvailablePlanWeek();
            const title = lines.find(line => /LỊCH\s+CÔNG\s+TÁC/i.test(line)) || 'LỊCH CÔNG TÁC';
            const schoolYear = text.match(/(?:NĂM\s+HỌC\s*)?(20\d{2}\s*[-–]\s*20\d{2})/i)?.[1] || '';
            const dateRange = lines.find(line => /Từ\s+ngày.+đến/i.test(line)) || '';
            const duty = text.match(/Trực\s*:?\s*([^\n]+)/i)?.[1] || '';
            const days = PLAN_DAYS.map(day => {
                const number = day.slice(-1);
                const line = day === 'Chủ nhật'
                    ? lines.find(item => /^(?:CN|Chủ\s*nhật|Chu\s*nhat)\b/i.test(item)) || ''
                    : lines.find(item => new RegExp(`Th[ứu]\\s*${number}\\b`, 'i').test(item)) || '';
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
                : createTimetableDraftFromOcr(ocrResult.text, sourceMode, sourceError);
            const data = normalizeRecognitionSafely(normalize, draft, `${kind} dự phòng`);
            if (!data) throw new Error('Không thể tạo mẫu dữ liệu dự phòng');
            data.sourceMode = cleanText(draft.sourceMode) || sourceMode;
            data.offlineOcrText = cleanText(ocrResult.text);
            data.cacheHash = hash;
            data.cacheHit = false;
            cacheRecognition(kind, hash, data);
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
                if (!window.mammoth) throw new Error('Không tải được thư viện đọc Word');
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                content = result.value;
            } else if (/\.xlsx?$/.test(lowerName)) {
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

        function parseCurriculumWeeksLocally(content) {
            const lines = cleanText(content).split('\n').map(cleanText).filter(Boolean);
            const byWeek = new Map();
            let currentWeek = null;
            let tableHeader = null;
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                if (/^===\s*SHEET:/i.test(line)) {
                    tableHeader = null;
                    continue;
                }
                const separator = line.includes('\t') ? /\t/ : line.includes('|') ? /\|/ : /[,;]/;
                const cells = line.split(separator).map(cell => cleanText(cell).replace(/^"|"$/g, ''));
                const lookupCells = cells.map(normalizeLookupText);
                const headerWeekIndex = lookupCells.findIndex(cell =>
                    cell === 'tuan' || cell.includes('tuanthu') || cell.includes('tuanppct')
                );
                const explicitPpctIndex = lookupCells.findIndex(cell =>
                    cell.includes('tietppct') || cell === 'ppct' || cell.includes('sotietppct')
                );
                const plainPpctIndex = lookupCells.findIndex(cell => cell === 'tiet' || cell === 'sotiet');
                // Trong file phân phối chương trình, cột "Tiết" luôn là Tiết PPCT, không phải Tiết TKB.
                const headerPpctIndex = explicitPpctIndex >= 0 ? explicitPpctIndex : plainPpctIndex;
                const headerTopicIndex = lookupCells.findIndex(cell =>
                    cell.includes('tenbai') || cell.includes('baiday') || cell.includes('chude') || cell.includes('noidung')
                );
                if (headerPpctIndex >= 0 && headerTopicIndex >= 0) {
                    tableHeader = {
                        weekIndex: headerWeekIndex,
                        ppctIndex: headerPpctIndex,
                        topicIndex: headerTopicIndex,
                    };
                    continue;
                }
                if (tableHeader && cells.length > Math.max(tableHeader.ppctIndex, tableHeader.topicIndex)) {
                    let week = tableHeader.weekIndex >= 0
                        ? Number.parseInt(cells[tableHeader.weekIndex], 10)
                        : (currentWeek || 1);
                    if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) week = currentWeek || 1;
                    currentWeek = week;
                    const ppctPeriod = cleanText(cells[tableHeader.ppctIndex]);
                    const topics = cleanText(cells[tableHeader.topicIndex]);
                    if (ppctPeriod || topics) {
                        const previous = byWeek.get(week) || { week, topics: '', lessons: [] };
                        if (topics) previous.topics = [...new Set([previous.topics, topics].filter(Boolean))].join('\n');
                        previous.lessons.push({ ppctPeriod, topic: topics });
                        byWeek.set(week, previous);
                    }
                    continue;
                }
                const weekMatch = line.match(/(?:tu[ầa]n|week)\s*[:.\-]?\s*(\d{1,2})\b/i);
                let week = Number.parseInt(weekMatch?.[1], 10);
                let weekCellIndex = cells.findIndex(cell => /(?:tu[ầa]n|week)\s*[:.\-]?\s*\d{1,2}/i.test(cell));
                if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) {
                    const firstNumber = Number.parseInt(cells[0], 10);
                    if (/^\d{1,2}$/.test(cells[0]) && firstNumber > 0 && firstNumber <= MAX_SCHOOL_WEEKS) {
                        week = firstNumber;
                        weekCellIndex = 0;
                    } else if (!cells[0] && currentWeek) {
                        week = currentWeek;
                    }
                }
                if (!(week > 0 && week <= MAX_SCHOOL_WEEKS)) continue;
                currentWeek = week;

                const ppctMatch = line.match(/(?:ti[ếe]t\s*(?:ppct)?|ppct)\s*[:.\-]?\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/i);
                let ppctPeriod = cleanText(ppctMatch?.[1]);
                let periodCellIndex = cells.findIndex(cell => /(?:ti[ếe]t\s*(?:ppct)?|ppct)\s*[:.\-]?\s*\d/i.test(cell));
                if (!ppctPeriod) {
                    const candidateIndex = cells.findIndex((cell, cellIndex) =>
                        cellIndex !== weekCellIndex && /^\d{1,3}(?:\s*[-–]\s*\d{1,3})?$/.test(cell)
                    );
                    if (candidateIndex >= 0) {
                        ppctPeriod = cells[candidateIndex];
                        periodCellIndex = candidateIndex;
                    }
                }

                let topics = cells.filter((cell, cellIndex) => {
                    if (!cell || cellIndex === weekCellIndex || cellIndex === periodCellIndex) return false;
                    if (/^(?:tu[ầa]n|week|ti[ếe]t(?:\s*ppct)?|ppct)$/i.test(cell)) return false;
                    return true;
                }).join(' - ');
                if (cells.length === 1 && weekMatch) {
                    topics = cleanText(line
                        .replace(weekMatch[0], '')
                        .replace(ppctMatch?.[0] || '', '')
                        .replace(/^[\s,:;|\-]+/, ''));
                }
                if (!topics && !ppctPeriod && lines[index + 1] && !/(?:tu[ầa]n|week)\s*\d/i.test(lines[index + 1])) {
                    topics = lines[index + 1];
                }
                if (!topics && !ppctPeriod) continue;
                const previous = byWeek.get(week) || { week, topics: '', lessons: [] };
                if (topics) previous.topics = [...new Set([previous.topics, topics].filter(Boolean))].join('\n');
                if (ppctPeriod || topics) previous.lessons.push({ ppctPeriod, topic: topics });
                byWeek.set(week, previous);
            }
            return normalizeCurriculumWeeks(Array.from(byWeek.values()));
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
                return { icon: '🧩', title: 'OCR đã tự ghép theo vị trí.', text: `Hệ thống dùng tọa độ chữ để phân vào đúng cột Sáng, Chiều và Đi công tác.${confidence}` };
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
