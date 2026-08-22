# TESTING — v50.2

## Tự động
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node --check` toàn bộ JS và Service Worker

Static Audit buộc: chỉ một listener `teacher-data-changed`, một heartbeat 60 giây, không có `buildPpctAlerts()` riêng, có Shared PPCT snapshot và generic system-suggestion saver.

## Kiểm tra trình duyệt sau deploy
1. Mở Dashboard năm học và xác nhận lớp chậm/thiếu/nguy cơ PPCT vẫn hiển thị.
2. Mở Sổ Công Việc → Hệ thống gợi ý; nếu có PPCT cần chú ý phải xuất hiện tại đây.
3. Mở Nhắc việc; cùng cảnh báo PPCT không được nhân đôi.
4. Bấm “Thêm vào sổ” từ Reminder; nhiệm vụ phải xuất hiện một lần với `sourceKey` PPCT.
5. Chạy Kiểm thử hồi quy đầy đủ và xác nhận 0 lỗi bắt buộc.
