# AUDIT REPORT — v45.2.0

## Phạm vi thay đổi
- Thêm 2 nút cố định trên header: **TKB Trường** và **vnEdu**.
- Không đổi schema dữ liệu hay logic nghiệp vụ.
- Tăng APP_VERSION / Service Worker cache lên 45.2.0.
- Sửa một lỗi markup nhỏ còn sót: thẻ `</head>` bị lặp trong bản nguồn.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **371/371 duy nhất**.
- Tài nguyên nội bộ tham chiếu từ HTML: **34**, không thiếu file.
- PWA app-shell: **38 tài nguyên**, không thiếu file.
- HTML có đúng **1 `<head>` và 1 `<body>`** sau khi sửa markup.
- APP_VERSION trong state và Service Worker: **45.2.0**.

## Kiểm tra hai nút nhanh
- `TKB Trường` mở: `https://thptlequangchi.hatinh.edu.vn/thoi-khoa-bieu`.
- `vnEdu` mở đúng URL SSO đã cấu hình trong Trung Tâm Liên Kết.
- Cả hai dùng `target="_blank"` + `rel="noopener noreferrer"`.
- CSS responsive đã có riêng cho desktop/tablet/mobile; khi in, hai nút được ẩn.

## An toàn dữ liệu
- `DATA_SCHEMA_VERSION` không thay đổi.
- Không thêm migration.
- Không thay localStorage/Firestore payload.
- Không thay logic TEMIS/VN ERP/Trung Tâm Liên Kết hiện có.
