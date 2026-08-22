# TESTING — v50.3

## Kiểm tra build-time
Chạy:

```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
```

Static Audit kiểm tra thêm:
- chỉ một listener `teacher-data-changed`;
- chỉ một heartbeat 60 giây;
- PPCT dùng chung suggestion engine;
- tồn tại `getSmartReminderManagedSuggestionKeys()`;
- Reminder chỉ nhận gợi ý `urgent/high`;
- Hệ thống gợi ý loại các key do Reminder quản lý;
- `alert.detail` chỉ render một lần.

## Kiểm tra trên trình duyệt thật sau deploy
1. Mở Sổ Công Việc khi Tuần hiện tại chưa có Kế hoạch/TKB/Lịch báo giảng.
2. Xác nhận 3 cảnh báo quan trọng chỉ xuất hiện trong **Nhắc việc thông minh**.
3. Xác nhận **Hệ thống gợi ý** tự ẩn nếu không có gợi ý bổ sung.
4. Tạo tình huống Lịch báo giảng đã có nhưng chưa chốt (gợi ý mức bình thường) và xác nhận khối **Hệ thống gợi ý** xuất hiện.
5. Bấm **+ Thêm vào sổ** từ Reminder và kiểm tra không tạo bản trùng.
6. Chạy **Kiểm thử hồi quy đầy đủ** và xác nhận 0 lỗi mới.
