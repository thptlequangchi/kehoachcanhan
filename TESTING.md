# TESTING — v52.3.0

## Kiểm thử tự động
Chạy:
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node tests/run-session-ppct-fixtures.js`
- `node --check` cho toàn bộ JavaScript và Service Worker

## Kiểm thử riêng Sổ chủ nhiệm v52.2
1. Mở Sổ chủ nhiệm có học sinh; bảng `Theo dõi chuyên cần & nề nếp` phải xuất hiện.
2. Ghi 3 lượt vắng cho một học sinh: học sinh phải chạm ngưỡng `Tổng vắng` mặc định.
3. Ghi 3 lượt đi muộn: học sinh phải chạm ngưỡng `Đi muộn`.
4. Ghi 2 lượt vi phạm: học sinh phải chạm ngưỡng `Vi phạm`.
5. Nếu chạm ngưỡng ở từ 2 nhóm khác nhau, trạng thái phải là `Ưu tiên theo dõi`.
6. Đổi ngưỡng trong thanh cấu hình, reload trang: ngưỡng phải được giữ lại theo đúng lớp.
7. Bộ lọc `Chạm/vượt ngưỡng`, `Có vắng`, `Có đi muộn`, `Có vi phạm` phải lọc đúng.
8. Nút `Xem` trong bảng theo dõi phải chọn đúng học sinh và cuộn đến lịch sử theo dõi.
9. KPI Đi muộn/Vi phạm và số HS cần theo dõi phải cập nhật sau khi thêm/xóa ghi nhận.
10. Xuất Excel phải có sheet `Tần suất cần chú ý` và các ngưỡng trong sheet Tổng quan.

## Hồi quy cần giữ
- TKB v52.1 hiển thị đủ Tiết 1–5 và tooltip PPCT đúng buổi.
- PPCT sáng/chiều độc lập.
- 39 tuần năm học.
- Sổ điểm tối đa 5 cột TX.
- Backup/Restore, dữ liệu cá nhân và PWA/offline.
