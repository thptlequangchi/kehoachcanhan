# Kiểm thử v50.1

## Build-time
Chạy tại thư mục gốc:

```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
```

`run-static-audit.py` kiểm tra thêm hai bất biến kiến trúc của v50.1:
- chỉ có 1 listener `teacher-data-changed` dùng chung;
- chỉ có 1 timer UI chu kỳ 60 giây.

Fixture hiện gồm: năm học, Kế hoạch, TKB, Sổ Công Việc cũ, tiết báo giảng và quy tắc `final/finalized`.

## Sau khi deploy
1. Mở **Cài đặt → Kiểm thử hồi quy**.
2. Chạy **Kiểm thử đầy đủ**.
3. Xác nhận Overview hiển thị **Đã chốt** với một tuần đã chốt thật.
4. Chuyển năm học rồi quay lại để kiểm tra TKB/PPCT/Lịch báo giảng vẫn giữ đúng dữ liệu.
5. Thử Sao lưu JSON và xuất Word/PDF để xác nhận helper tải/in dùng chung hoạt động trên trình duyệt thực tế.
