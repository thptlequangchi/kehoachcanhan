# AUDIT REPORT — Sổ Tay Giáo Viên v51.3.0

## Phạm vi
Nâng cấp PPCT để cùng một lớp/môn có thể dùng **hai tiến trình độc lập cho Buổi sáng và Buổi chiều**, đồng thời giữ nguyên toàn bộ nền v51.2.

## Kết quả kiểm tra tĩnh
- HTML IDs: **443/443 duy nhất**.
- HTML resources: **49** tài nguyên tham chiếu đều tồn tại.
- Literal DOM refs: **196/196** hợp lệ.
- Named JavaScript functions: **761/761 không trùng tên**.
- Service Worker APP_SHELL: **52** tài nguyên đều tồn tại.
- APP_VERSION state / Service Worker: **51.3.0 / 51.3.0**.
- `teacher-data-changed`: **1** listener dùng chung.
- Heartbeat 60 giây: **1** timer dùng chung.
- Tất cả JavaScript + Service Worker: `node --check` **PASS**.
- 39 tuần năm học, so sánh lịch công tác v51.2, PPCT học kỳ và các fixture cũ: **PASS**.

## Kiểm tra nghiệp vụ PPCT theo buổi
- Hồ sơ PPCT có trường `session`: **PASS**.
- `curriculumTargetId` phân biệt sáng/chiều: **PASS**.
- PPCT cũ thiếu `session` dùng `all` làm fallback: **PASS**.
- Hồ sơ đúng buổi thắng hồ sơ `all`: **PASS**.
- Đánh số PPCT của lịch báo giảng tách theo `class + subject + session`: **PASS**.
- Tra tên bài theo `class + subject + session + ppctPeriod`: **PASS**.
- Tiến độ, bộ lọc báo cáo, xuất Word/Excel và tìm kiếm toàn cục phân biệt buổi: **đã rà soát cú pháp + luồng dữ liệu**.
- Ledger tự động hóa tiết mất/học bù không còn gộp hai buổi: **PASS theo khóa lớp–môn–buổi**.

## Bảo vệ dữ liệu / tương thích
- Không xóa dữ liệu PPCT cũ.
- Hồ sơ cũ `all` vẫn hoạt động cho cả hai buổi khi chưa có hồ sơ riêng.
- Có thể bổ sung riêng PPCT Buổi chiều mà không phải nhập lại PPCT Buổi sáng.
- Không đổi `DATA_SCHEMA_VERSION` (**1**), IndexedDB schema hoặc Firebase Rules.
- Chức năng so sánh/cập nhật Lịch công tác của v51.2 được giữ nguyên.

## Giới hạn kiểm thử
Đã kiểm tra tĩnh và fixture nghiệp vụ trong gói. Chưa tuyên bố hoàn tất E2E trên trình duyệt thật với Firebase/Gemini thực tế. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** và thử một TKB thật có cùng lớp/môn ở cả sáng và chiều.
