# Sổ Tay Giáo Viên v50.1.0 — Làm sạch & hợp nhất logic

Bản v50.1 phát triển trực tiếp từ v50.0.0. Đây là bản bảo trì kiến trúc: không thêm nghiệp vụ mới, tập trung giảm logic trùng và ngăn sai lệch giữa Dashboard, Trợ lý tuần, Sổ Công Việc, Báo cáo và các luồng lưu/khôi phục.

## Điểm chính
- Sửa lỗi trạng thái **Đã chốt** trong Overview (`final` / `finalized`).
- Thêm **Shared Core** dùng chung cho trạng thái tuần, tiết dạy hôm nay, nhiệm vụ chưa xong, tải file và in báo cáo.
- Hợp nhất refresh: chỉ còn **1 listener `teacher-data-changed`** điều phối các module.
- Hợp nhất timer: chỉ còn **1 heartbeat 60 giây** cho Overview, Trợ lý tuần, Dashboard và Reminder.
- Hợp nhất thao tác áp dữ liệu workspace khi chuyển năm học, nhận Firebase snapshot hoặc Restore.
- Dọn CSS header responsive bị chồng quy tắc.
- Regression Test được bổ sung kiểm tra quy tắc trạng thái chốt dùng chung.

## Không thay đổi
- Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Reminder, Báo cáo, Hồ sơ tự động.
- Firebase/Firestore và phân quyền.
- IndexedDB/Storage Pro.
- Gemini/OCR.
- `DATA_SCHEMA_VERSION`.

## Cập nhật GitHub Pages
Chép **toàn bộ** gói v50.1 vào repo và Push. Service Worker đã tăng lên `50.1.0` và app-shell có thêm `assets/js/04-shared-core.js`.

Sau khi deploy, nếu PWA báo có phiên bản mới hãy chọn **Cập nhật ngay**, sau đó vào **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** để xác nhận trên trình duyệt đang dùng.
