# AUDIT REPORT — Sổ Tay Giáo Viên v51.2.0

## Phạm vi
Nâng cấp chức năng Kế hoạch trường để hỗ trợ **Lịch công tác điều chỉnh**: ảnh mới của tuần đã có được so sánh theo từng ô, duyệt thay đổi rồi mới cập nhật.

## Kết quả kiểm tra tĩnh
- HTML IDs: **442/442 duy nhất**.
- HTML resources: **49** tài nguyên tham chiếu đều tồn tại.
- Literal DOM refs: **196/196** hợp lệ.
- Named JavaScript functions: **753/753 không trùng tên**.
- Service Worker APP_SHELL: **52** tài nguyên, đều tồn tại.
- APP_VERSION state / Service Worker: **51.2.0 / 51.2.0**.
- `teacher-data-changed`: **1** listener dùng chung.
- Heartbeat 60 giây: **1** timer dùng chung.
- Tất cả JavaScript + Service Worker: `node --check` **PASS**.
- Toàn bộ CSS: parse bằng `tinycss2` **PASS**.
- APP_SHELL qua HTTP local: **52/52 trả 200**.

## Fixture nghiệp vụ mới
- Phát hiện đúng **1 thay đổi + 1 thêm + 1 bỏ** giữa hai bản cùng tuần: PASS.
- Áp dụng chọn lọc một thay đổi và giữ nguyên các ô không chọn: PASS.
- `revisionHistory` và tên file ảnh điều chỉnh sống qua `normalizePlanWeek`: PASS.
- Không còn đường ghi đè trực tiếp `state.planData[existingIndex] = plan` trong luồng tải ảnh cùng tuần: PASS.
- Có fingerprint kiểm tra xung đột trước khi ghi bản điều chỉnh: PASS.

## Bảo vệ dữ liệu
- Ảnh cùng tuần luôn đi qua màn hình so sánh trước khi cập nhật.
- Nếu ảnh có cảnh báo nhận dạng hoặc dùng OCR dự phòng, mục **Bỏ** không được chọn mặc định.
- Chế độ `manual/offline-ocr` không cho phép nút **Dùng toàn bộ ảnh mới**.
- Nếu đã có dữ liệu tuần mà nhận dạng ảnh mới lỗi, dữ liệu cũ được giữ nguyên.
- Lịch báo giảng chỉ bị đánh dấu stale ở đúng các source slot ngày/buổi bị ảnh hưởng khi xác định được.

## Dữ liệu / tương thích
- `DATA_SCHEMA_VERSION` giữ nguyên **1**.
- Không thay Firebase Rules.
- Không thay IndexedDB schema.
- Dữ liệu cũ không có `revisionHistory` vẫn chuẩn hóa bình thường.

## Giới hạn kiểm thử
Đã kiểm tra tĩnh, fixture nghiệp vụ, CSS parser và HTTP app-shell. Chưa tuyên bố hoàn tất E2E trên trình duyệt thật với API Gemini/Firestore thực tế. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** và thử một ảnh điều chỉnh thật của cùng tuần.
