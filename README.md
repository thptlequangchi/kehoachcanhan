# Sổ Tay Giáo Viên v50.2.0 — Hợp nhất engine gợi ý

Bản v50.2 phát triển trực tiếp từ v50.1, không thêm một hệ thống cảnh báo mới. Mục tiêu là làm sạch kiến trúc: **Hệ thống gợi ý** trở thành nguồn duy nhất cho các vấn đề Kế hoạch, TKB, Báo giảng, Học bù, PPCT và Sao lưu; **Nhắc việc thông minh** chỉ quyết định vấn đề nào cần nhắc lúc này.

## Luồng mới
`Shared Core → buildWorkSystemSuggestions() → Sổ Công Việc / Nhắc việc thông minh → addWorkSystemSuggestion()`

PPCT chậm, thiếu PPCT hoặc có nguy cơ hoàn thành muộn được phân loại chung trong Shared Core; Dashboard năm học cũng dùng cùng quy tắc này. Khi bấm “Thêm vào sổ” từ Reminder hay Hệ thống gợi ý, cả hai đi qua một pipeline chống trùng duy nhất.

## An toàn
- `DATA_SCHEMA_VERSION` giữ nguyên 1.
- Không migration dữ liệu.
- Không sửa Firestore Rules hay IndexedDB schema.
- Không tự tạo công việc; hệ thống vẫn chỉ gợi ý/nhắc và chờ giáo viên chọn thêm vào Sổ.

## Cập nhật GitHub Pages
Chép toàn bộ gói và Push. Service Worker đã tăng lên 50.2.0 để PWA nhận mã mới. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
