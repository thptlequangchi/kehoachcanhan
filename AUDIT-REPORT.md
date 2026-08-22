# AUDIT REPORT — v47.0.0 / Bước 14: IndexedDB & dữ liệu nhiều năm

## Phạm vi nâng cấp
- Nền trực tiếp: v46.0.0.
- Thêm `assets/js/01-indexeddb-storage.js` làm storage engine hybrid.
- Thêm `assets/js/24-storage-center.js` và `assets/css/storage-pro.css`.
- Service Worker / APP_VERSION: 47.0.0.
- `DATA_SCHEMA_VERSION`: giữ nguyên 1.

## Cơ chế lưu mới
- IndexedDB database: `teacher-notebook-storage`, version 1.
- 4 object store: `workspaces`, `recognitionCache`, `backups`, `meta`.
- Năm học đang mở vẫn giữ một bản trong LocalStorage để khởi động an toàn.
- Toàn bộ workspace nhiều năm được giữ trong IndexedDB và nạp vào state khi khởi động.
- Cache nhận dạng ảnh chuyển sang IndexedDB, giữ tối đa 20 kết quả gần nhất.
- Checkpoint trước Restore / trước đồng bộ Firebase / recovery có thể lưu trong IndexedDB.
- Nếu IndexedDB không khả dụng hoặc ghi lỗi, hệ thống fallback về LocalStorage.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **390/390 duy nhất**.
- Literal DOM references (`getElementById` / `byId`): **173**, không thiếu ID.
- Hàm JavaScript có tên: **601/601 duy nhất**.
- Tài nguyên nội bộ từ HTML: **39**, không thiếu file.
- Service Worker app-shell: **43 tài nguyên**, không thiếu file.
- Toàn bộ 43 app-shell resource trả **HTTP 200** khi kiểm thử local.
- HTML parse qua BeautifulSoup: có đầy đủ `html/head/body`.
- APP_VERSION state / Service Worker: cùng **47.0.0**.

## Kiểm tra an toàn dữ liệu
- Không thay đổi cấu trúc nghiệp vụ của backup, workspace, PPCT, TKB, Lịch báo giảng hay Sổ Công Việc.
- Restore nhiều năm dùng `persistAllYearWorkspacesHybrid` để đẩy toàn bộ workspace vào IndexedDB.
- Lưu thường ngày chỉ ghi workspace năm đang mở để giảm số lần ghi không cần thiết.
- Đồng bộ cloud chờ tạo checkpoint an toàn trước khi mở listener Firestore.
- Có khóa `cloudActivationBusy` để tránh tạo listener trùng trong lúc checkpoint IndexedDB đang được ghi.
- Cache OCR có nút dọn riêng; thao tác này không xóa dữ liệu năm học.

## PWA
- App-shell bổ sung `storage-pro.css`, `01-indexeddb-storage.js`, `24-storage-center.js`.
- Cache version đã tăng lên 47.0.0 để GitHub Pages/PWA nhận đúng mã mới.

## Giới hạn kiểm thử trong môi trường build
- Kiểm thử Chromium headless đầy đủ không hoàn tất trong container do tiến trình Chromium/DBus bị treo timeout; vì vậy **không tuyên bố đã test E2E trình duyệt thực**.
- Các kiểm tra cú pháp, liên kết DOM, tài nguyên và HTTP local đều PASS.
- Sau khi deploy GitHub Pages, nên mở **Cài đặt → Bộ nhớ nhiều năm · IndexedDB → Kiểm tra kho dữ liệu** để xác nhận IndexedDB của trình duyệt cụ thể đang hoạt động.
