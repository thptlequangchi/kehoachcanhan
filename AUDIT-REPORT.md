# AUDIT REPORT — v45.1.0 Bổ sung vnEdu

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **371/371 duy nhất**, không phát hiện ID trùng.
- Tài nguyên nội bộ tham chiếu từ HTML: **34**, thiếu: **0**.
- PWA app-shell: **38 tài nguyên**, thiếu: **0**.
- `APP_VERSION`: **45.1.0** ở state và Service Worker.
- `DATA_SCHEMA_VERSION`: **1**, không thay đổi dữ liệu người dùng.

## Kiểm tra Trung Tâm Liên Kết
- 4 liên kết mặc định có mặt: **PASS**.
  1. TEMIS.
  2. Thời khoá biểu THPT Lê Quảng Chí.
  3. UBND tỉnh Hà Tĩnh — VN ERP.
  4. vnEdu.vn — Mạng giáo dục Việt Nam.
- Render mặc định: **4 link card + 4 quick card**.
- vnEdu được xếp nhóm **Nhà trường**, trạng thái **Mặc định**, và **ghim sẵn**.
- Tìm kiếm `vnEdu`: **PASS**, lọc còn đúng 1 kết quả.
- Nút **Mở** của vnEdu truyền đúng URL người dùng cung cấp: **PASS**.
- Thêm liên kết tùy chỉnh: **PASS**.
- Ghim liên kết tùy chỉnh: **PASS**.
- URL nguy hiểm `javascript:`: **BỊ TỪ CHỐI**.
- Chuyển tab Liên Kết: **PASS**.

## Kiểm tra khởi động
- Full-init headless browser: **PASS**.
- `window.__teacherNotebookInitCompleted`: **true**.
- Init errors: **0**.
- Page errors: **0**.

## PWA / cache
- State và Service Worker cùng phiên bản **45.1.0**.
- Việc tăng phiên bản tạo cache mới, giúp thiết bị đã cài PWA không tiếp tục dùng `22-links-center.js` của v45.0.0.
- Service Worker không cache nội dung từ các website liên kết bên ngoài.
