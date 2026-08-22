# AUDIT REPORT — v50.0.0 / Bước 17: Kiểm thử hồi quy tự động

## Phạm vi nâng cấp
- Nền trực tiếp: v49.0.0.
- Thêm `assets/js/27-regression-tests.js` và `assets/css/regression-test.css`.
- Thêm Trung tâm Kiểm thử hồi quy trong **Cài đặt & an toàn**.
- Service Worker / APP_VERSION: `50.0.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên `1`.

## Bộ kiểm thử tích hợp
- **17 kiểm thử nhanh** tự chạy sau khi init hoàn tất.
- **29 kiểm thử ở chế độ đầy đủ** (17 nhanh + 12 kiểm tra sâu).
- Kiểm tra các nhóm: Khởi động, Giao diện, Nghiệp vụ, Dữ liệu, Phân quyền, Lưu trữ, PWA, Báo cáo, Nhắc việc, Chẩn đoán và Tích hợp.
- Fixture Kế hoạch/TKB/Báo giảng/Sổ Công Việc/Backup chạy trên dữ liệu giả, không áp vào state thật.
- LocalStorage dùng key tạm và tự xóa.
- IndexedDB dùng database tạm riêng và xóa sau khi kiểm thử.
- Kiểm thử đầy đủ không gọi Gemini và không ghi Firestore.
- Baseline trạng thái test được giữ qua các lần chạy để đánh dấu test trước đây đạt nhưng phiên bản sau lỗi là **Hồi quy mới**.
- Có thêm test build-time: `run-static-audit.py` và `run-state-fixtures.js`; workflow GitHub Actions tự chạy trên Push/Pull Request.

## Kiểm tra tĩnh của gói v50
- Toàn bộ JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **427/427 duy nhất**.
- Literal DOM references (`getElementById` / `byId`): **196**, không thiếu ID.
- Hàm JavaScript có tên: **705/705 duy nhất**, không phát hiện khai báo trùng.
- Tài nguyên nội bộ được tham chiếu từ HTML: **45**, không thiếu file.
- Service Worker app-shell: **48 tài nguyên**, không thiếu file.
- Toàn bộ **48/48 app-shell resource trả HTTP 200** trong kiểm thử local.
- APP_VERSION trong state và Service Worker: cùng `50.0.0`.
- Node fixture test cho năm học/Kế hoạch/TKB/Sổ Công Việc/Lịch báo giảng: **5/5 PASS**.
- `tests/run-static-audit.py`: **PASS** trên gói đóng phiên bản.
- `DATA_SCHEMA_VERSION`: `1`.
- Script order cuối: `26-reminder-calendar.js` → `20-pwa.js` → `21-health-check.js` → `22-links-center.js` → `23-global-command.js` → `24-storage-center.js` → `27-regression-tests.js` → `15-init.js`.

## An toàn dữ liệu
- Bộ kiểm thử nhanh chỉ đọc state hoặc chạy normalizer trên fixture riêng.
- Bộ kiểm thử đầy đủ chỉ ghi key/DB tạm thời rồi dọn ngay; không sửa dữ liệu năm học thật.
- Báo cáo regression chỉ lưu tên test, trạng thái và thông báo kỹ thuật; không lưu nội dung Kế hoạch/TKB/PPCT hay API key.
- Không thay Firestore Rules, IndexedDB schema hoặc backup schema.

## PWA
- App-shell bổ sung `regression-test.css` và `27-regression-tests.js`.
- Request kiểm tra tài nguyên có `__regression` được Service Worker chuyển thẳng tới network với `cache: no-store`, tránh báo đạt giả do cache cũ.
- Cache version tăng lên `50.0.0`.

## Giới hạn kiểm thử trong môi trường build
- Chromium headless trong container vẫn treo do môi trường Chromium/DBus và không trả DOM trước timeout; vì vậy **không tuyên bố đã chạy E2E trình duyệt thật trong container**.
- Kiểm tra cú pháp, HTML/DOM tĩnh, tài nguyên, app-shell và HTTP local đều PASS.
- Sau khi deploy GitHub Pages, nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần trên trình duyệt thực; đây chính là mục tiêu của Test Center mới.
