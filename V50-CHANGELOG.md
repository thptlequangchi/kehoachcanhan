# v50.0.0 — Bước 17: Kiểm thử hồi quy tự động

## Mục tiêu
Tạo lớp bảo vệ trước các lần nâng cấp tiếp theo, phát hiện sớm chức năng bị hỏng mà không sửa dữ liệu thật.

## Thay đổi
- Thêm `assets/js/27-regression-tests.js`.
- Thêm `assets/css/regression-test.css`.
- Thêm Trung tâm Kiểm thử hồi quy trong Cài đặt & an toàn.
- Tự chạy smoke/quick regression sau `teacher-notebook:init-complete`.
- Kiểm thử đầy đủ theo yêu cầu: LocalStorage tạm, IndexedDB tạm, backup fixture, asset server, PWA và module tích hợp.
- Lưu baseline kết quả gần nhất và đánh dấu hồi quy mới.
- Xuất/copy báo cáo kiểm thử không chứa dữ liệu nghiệp vụ chi tiết.
- Thêm lệnh Ctrl+K: `Kiểm thử hồi quy`.
- Thêm bộ test build-time không phụ thuộc thư viện ngoài và workflow GitHub Actions chạy tự động khi Push/Pull Request.
- Service Worker bypass cache cho request có `__regression` để kiểm tra đúng file thật trên server.
- APP_VERSION/Service Worker tăng lên `50.0.0`.

## Không thay đổi
- DATA_SCHEMA_VERSION = 1.
- Firestore Rules / cấu trúc cloud.
- IndexedDB schema và dữ liệu nhiều năm.
- Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, nhắc việc và báo cáo.
