# v42.0.0 — Bước 10: PWA & Hiệu năng

## Mục tiêu
Biến Sổ Tay Giáo Viên từ website GitHub Pages thành một ứng dụng web cài được, mở nhanh và chịu mạng chập chờn tốt hơn mà không thay đổi nghiệp vụ hiện có.

## Thay đổi
- `APP_VERSION` → `42.0.0`; `DATA_SCHEMA_VERSION` giữ nguyên.
- Thêm `manifest.webmanifest` và bộ icon PWA.
- Thêm `service-worker.js` với cache version hóa theo phiên bản.
- App-shell cache toàn bộ CSS/JS/icon nội bộ.
- Runtime cache các thư viện tĩnh từ `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `www.gstatic.com` sau khi tải thành công.
- Navigation dùng network-first và fallback về app-shell khi mất mạng.
- Thêm `assets/js/20-pwa.js` quản lý install prompt, online/offline, update flow, persistent storage và làm mới cache.
- Thêm `assets/css/pwa.css` cho trạng thái mạng, thanh cập nhật và trung tâm PWA.
- Thêm preconnect tới các CDN chính.

## Không thay đổi
- Firebase/Firestore/Auth và dữ liệu cloud.
- Gemini/OCR/cache nhận dạng nghiệp vụ.
- Kế hoạch trường, TKB, PPCT, học bù, lịch báo giảng.
- Dashboard năm học, Trợ lý tuần, Automation Center, Report Center.
- Backup/Restore và schema dữ liệu người dùng.
