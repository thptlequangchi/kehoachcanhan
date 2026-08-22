# AUDIT REPORT — v44.0.0 Sổ Công Việc Pro

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **346/346 duy nhất**, không có ID trùng.
- Hàm JavaScript có tên: **505/505 duy nhất**, không phát hiện khai báo trùng.
- Tài nguyên nội bộ tham chiếu từ HTML: **32**, không thiếu file.
- DOM selector lõi trong `02-dom.js`: **190**, không thiếu ID.
- App-shell Service Worker: **36 tài nguyên**, không thiếu file.
- `APP_VERSION` trong state và Service Worker: cùng **44.0.0**.
- `DATA_SCHEMA_VERSION` giữ nguyên để không ép migration dữ liệu năm học.

## Smoke test Sổ Công Việc Pro
Đã chạy runtime test trong Chromium với DOM đầy đủ và các dịch vụ mạng được cô lập:
- Render Dashboard công việc: **PASS**.
- Tạo/chuẩn hóa task v44: **PASS**.
- Hiển thị nhiệm vụ đến hạn hôm nay: **PASS**.
- Kanban đủ 4 cột và card draggable: **PASS**.
- Đổi trạng thái task: **PASS**.
- Nhiệm vụ lặp hàng tuần sinh đúng 1 lượt tiếp theo: **PASS**.
- Mở lại rồi hoàn thành lần nữa không sinh trùng: **PASS**.
- “Chuẩn bị tuần mới” tạo 4 việc và bấm lại không nhân bản: **PASS**.
- Gợi ý hệ thống thêm vào Sổ và chống thêm trùng: **PASS**.
- Nhiệm vụ kiểu v43 chỉ có `completed=true` được đọc thành `status=done`: **PASS**.
- Ghi chú cũ vẫn giữ type/pinned: **PASS**.
- Full init với Firebase được cô lập: **PASS**, `window.__teacherNotebookInitErrors = []`.

## An toàn dữ liệu và cloud
- `completed` vẫn được duy trì song song với `status` để các Dashboard/Báo cáo cũ tiếp tục hoạt động.
- Work item mới chỉ thêm trường; không đổi cấu trúc workspace năm học.
- Gợi ý hệ thống không tự tạo task; chỉ tạo khi người dùng bấm **Thêm vào sổ**.
- Kanban chỉ thay đổi trạng thái khi người có quyền kéo card.
- Công việc lặp lại không tạo lượt tiếp theo cho task nhóm của người khác khi admin chỉ đang xử lý hộ.
- Firestore Rules template đã cho phép các trường v44 nhưng giữ quyền: thành viên tạo task của mình; chủ sở hữu hoặc admin được sửa/xóa.

## Giới hạn cần kiểm tra sau deploy
- Chế độ nhóm cần cập nhật Firestore Rules v44 một lần trước khi lưu các trường Pro mới.
- Kéo-thả Kanban trên thiết bị cảm ứng phụ thuộc hỗ trợ drag-and-drop của trình duyệt; các nút đổi trạng thái vẫn hoạt động thay thế.
- Firebase/Gemini/OCR thật vẫn phụ thuộc cấu hình, mạng và quota của tài khoản triển khai.
