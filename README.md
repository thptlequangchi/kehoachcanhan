# Sổ Tay Giáo Viên v47.1.0 — Bước 14: IndexedDB & dữ liệu nhiều năm

Bản v47.1 phát triển trực tiếp từ v47.0; giữ nguyên toàn bộ Bước 14 và bổ sung liên kết CSDL ngành GD&ĐT. Toàn bộ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc Pro, Dashboard, Automation, Báo cáo, PWA, Health Check, Liên kết và Ctrl+K được giữ nguyên.

## Điểm mới
- Thêm **Storage Pro** dùng IndexedDB cho dữ liệu dung lượng lớn.
- Tự di chuyển các năm học đã lưu từ LocalStorage sang IndexedDB ở lần mở đầu tiên.
- LocalStorage chỉ giữ bản an toàn của **năm học đang mở** cùng các cấu hình nhỏ; các năm khác vẫn được nạp vào bộ nhớ khi khởi động.
- Cache nhận dạng ảnh Gemini/OCR được chuyển sang IndexedDB, giới hạn 20 kết quả gần nhất.
- Checkpoint trước Restore / trước đồng bộ Firebase được lưu ở IndexedDB khi khả dụng, giảm nguy cơ đầy LocalStorage.
- Có bảng **Bộ nhớ nhiều năm · IndexedDB** trong Cài đặt & an toàn để xem số năm, cache, checkpoint và dung lượng trình duyệt.
- Nút **Tối ưu bộ nhớ** chủ động đồng bộ dữ liệu lớn sang IndexedDB; **Dọn cache OCR** không xóa dữ liệu năm học.
- Health Check có thêm hạng mục IndexedDB.

## Nguyên tắc an toàn
- `DATA_SCHEMA_VERSION` giữ nguyên: đây là thay đổi nơi lưu, không thay đổi cấu trúc nghiệp vụ.
- Nếu IndexedDB không khả dụng hoặc phát sinh lỗi, hệ thống tự quay về LocalStorage.
- Năm học đang mở vẫn có bản local để khởi động an toàn.
- File sao lưu thủ công JSON vẫn là phương án dự phòng độc lập và nên tiếp tục sử dụng định kỳ.

## Cập nhật GitHub Pages
Chép toàn bộ gói v47 vào repo và Push. Service Worker v47 sẽ cập nhật app-shell, gồm thêm `assets/js/01-indexeddb-storage.js`, `assets/js/24-storage-center.js` và `assets/css/storage-pro.css`.


## Cập nhật v47.1
- Thêm liên kết mặc định **CƠ SỞ DỮ LIỆU NGÀNH GIÁO DỤC VÀ ĐÀO TẠO**: `https://csdl.moet.gov.vn/`.
- Xếp vào nhóm **Hành chính** và ghim sẵn trong Trung tâm Liên kết.
- Bổ sung từ khóa tìm kiếm `CSDL ngành`, `MOET`, `cơ sở dữ liệu` trong Ctrl+K.
- APP_VERSION/Service Worker tăng lên **47.1.0**; không đổi schema dữ liệu.
