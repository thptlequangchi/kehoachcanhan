# Báo cáo kiểm tra v40.0.0 — Bước 8 Báo cáo & xuất hồ sơ

## Phạm vi

Bản v40 phát triển trực tiếp trên v39. Thay đổi chính gồm giao diện tab Báo Cáo & Hồ Sơ, CSS báo cáo, module `19-report-center.js`, khởi tạo module trong `15-init.js` và refresh tab trong `10-tabs.js`.

## Kiểm tra đã thực hiện

- Cú pháp toàn bộ JavaScript bằng `node --check`: PASS.
- Kiểm tra tất cả file CSS/JS nội bộ được `index.html` tham chiếu: PASS.
- Kiểm tra ID HTML trùng: không có.
- Kiểm tra khai báo hàm có tên trùng trên toàn bộ các module JS: không có.
- Kiểm tra tất cả button/input/select/textarea có ID đều được JavaScript tham chiếu: PASS.
- Smoke test module Báo cáo với dữ liệu mô phỏng:
  - đếm tuần;
  - độ phủ Kế hoạch;
  - độ phủ TKB;
  - tuần đã chốt;
  - số tiết báo giảng;
  - tiến độ PPCT;
  - xem trước báo cáo: PASS.
- Kiểm tra phạm vi theo tháng với tuần giao nhau qua ranh giới tháng: PASS.

## Giới hạn kiểm thử

Các thao tác tải thực tế Firebase/Auth/Firestore, Gemini/OCR CDN và hộp thoại in của trình duyệt phụ thuộc môi trường mạng/trình duyệt khi triển khai. V40 không thay đổi các luồng đó so với v39.
