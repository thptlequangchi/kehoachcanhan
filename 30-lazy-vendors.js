// ================================================================
//  LAZY VENDOR LOADER — v51.7
//  XLSX, Mammoth và Tesseract chỉ tải khi chức năng thật sự cần dùng.
// ================================================================
(() => {
    const definitions = {
        xlsx: { url: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', ready: () => Boolean(window.XLSX?.utils) },
        mammoth: { url: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', ready: () => Boolean(window.mammoth?.extractRawText) },
        tesseract: { url: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js', ready: () => Boolean(window.Tesseract?.createWorker) },
    };
    const pending = new Map();

    async function ensureVendorLibrary(name) {
        const def = definitions[name];
        if (!def) throw new Error(`Không nhận diện thư viện ${name}`);
        if (def.ready()) return true;
        if (!navigator.onLine && !document.querySelector(`script[data-lazy-vendor="${name}"]`)) {
            // Service Worker vẫn có thể trả từ runtime cache; vì vậy tiếp tục thử nạp script.
        }
        if (pending.has(name)) return pending.get(name);
        const promise = new Promise((resolve, reject) => {
            let script = document.querySelector(`script[data-lazy-vendor="${name}"]`);
            const timeout = setTimeout(() => reject(new Error(`Quá thời gian tải ${name}`)), 30000);
            const done = () => {
                clearTimeout(timeout);
                if (def.ready()) resolve(true);
                else reject(new Error(`Đã tải nhưng ${name} chưa sẵn sàng`));
            };
            const fail = () => { clearTimeout(timeout); reject(new Error(`Không tải được ${name}. Kiểm tra mạng rồi thử lại.`)); };
            if (script) {
                script.addEventListener('load', done, { once: true });
                script.addEventListener('error', fail, { once: true });
                return;
            }
            script = document.createElement('script');
            script.src = def.url;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.dataset.lazyVendor = name;
            script.addEventListener('load', done, { once: true });
            script.addEventListener('error', fail, { once: true });
            document.head.appendChild(script);
        }).finally(() => pending.delete(name));
        pending.set(name, promise);
        return promise;
    }

    window.ensureVendorLibrary = ensureVendorLibrary;
    window.teacherVendorLoader = {
        ensure: ensureVendorLibrary,
        isReady: name => Boolean(definitions[name]?.ready?.()),
        loaded: () => Object.fromEntries(Object.keys(definitions).map(name => [name, definitions[name].ready()])),
    };
})();
