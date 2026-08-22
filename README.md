# Sổ Tay Giáo Viên v50.3.0 — Khử trùng lặp Nhắc việc & Gợi ý

Bản v50.3 phát triển trực tiếp từ v50.2 và không thêm nghiệp vụ mới. Mục tiêu là làm giao diện **Sổ Công Việc Pro** gọn hơn: một vấn đề không còn xuất hiện đồng thời ở **Nhắc việc thông minh** và **Hệ thống gợi ý**.

## Quy tắc hiển thị mới
- Gợi ý **Khẩn cấp / Quan trọng** (`urgent`, `high`) được quản lý tại **Nhắc việc thông minh**.
- Gợi ý **Bình thường** tiếp tục hiển thị ở **Hệ thống gợi ý** nếu còn nội dung bổ sung.
- Nếu không còn gợi ý bổ sung, khối **Hệ thống gợi ý** tự ẩn hoàn toàn.
- Hai khu vực vẫn dùng chung `buildWorkSystemSuggestions()` và cùng pipeline `addWorkSystemSuggestion()`, nên không sinh hai hệ thống nghiệp vụ riêng.
- Các thiết lập Snooze / tắt loại cảnh báo của Reminder không làm xuất hiện lại cùng cảnh báo ở khu vực gợi ý phía dưới.

## Sửa lỗi nhỏ
- Loại bỏ một dòng mô tả `alert.detail` bị render lặp hai lần trong markup của Reminder.

## An toàn dữ liệu
- Không đổi `DATA_SCHEMA_VERSION`.
- Không đổi IndexedDB schema.
- Không đổi Firestore Rules.
- Không thay dữ liệu Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc hay Báo cáo.

## Cập nhật GitHub Pages
Chép toàn bộ gói và Push. Service Worker / APP_VERSION đã tăng lên **50.3.0** để PWA nhận mã mới. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
