# Sổ Tay Giáo Viên v50.7.0 — Lịch năm học tối đa 39 tuần

Bản v50.7 phát triển trực tiếp từ v50.6. Toàn bộ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Nhắc việc, Dashboard, Báo cáo, IndexedDB, PWA và Regression Test được giữ nguyên.

## Điểm mới
Lịch năm học được hiểu rõ thành **39 tuần tối đa = 2 tuần phụ trước khai giảng + 37 tuần chính**.

- Hai tuần phụ tiếp tục dùng cho **Kế hoạch trường / công tác trước khai giảng**.
- Tuần 1–37 vẫn là **37 tuần học chính** dùng cho TKB, PPCT, Lịch báo giảng, học kỳ và dự báo tiến độ.
- Dashboard năm học hiển thị đủ **39 ô thời gian**: 2 tuần phụ + 37 tuần chính.
- Nếu ngày hiện tại rơi vào tuần phụ, Tổng quan và Dashboard nhận biết đúng **Tuần phụ** thay vì báo “Ngoài kỳ”.
- Thanh tiến trình năm học tính theo toàn lịch 39 tuần; còn tiến độ PPCT vẫn tính theo Tuần 1–37.
- Nhấn ô tuần phụ trên Dashboard sẽ mở Kế hoạch trường tương ứng; không tạo TKB/Báo giảng cho tuần phụ.
- Phần cấu hình ngày bắt đầu Tuần 1 tự tính luôn khoảng thời gian của 2 tuần phụ trước đó.

## Nguyên tắc tương thích
- `MAX_SCHOOL_WEEKS` vẫn là **37** để không thay đổi quy tắc PPCT/HKI/HKII.
- Thêm `MAX_AUXILIARY_WEEKS = 2` và `TOTAL_ACADEMIC_CALENDAR_WEEKS = 39`.
- Mã tuần phụ cũ (`-1`, `-2`) được giữ nguyên để không làm lệch dữ liệu đã lưu.
- `DATA_SCHEMA_VERSION` không đổi; không cần migration dữ liệu, không sửa Firestore Rules hay IndexedDB schema.

## Cập nhật GitHub Pages
Chép toàn bộ gói v50.7 vào repo và Push. Service Worker / APP_VERSION đã tăng lên **50.7.0** để PWA nhận giao diện và logic lịch 39 tuần mới.

Sau deploy nên mở **Dashboard năm học** để kiểm tra đủ 39 ô, sau đó chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
