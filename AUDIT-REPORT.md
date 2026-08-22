# AUDIT REPORT — v47.1.0 / Bổ sung CSDL ngành GD&ĐT

## Kiểm tra tĩnh
- JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **390/390 duy nhất**, không phát hiện ID trùng.
- Hàm JavaScript có tên: **604 khai báo**, không phát hiện thay đổi schema dữ liệu.
- Tài nguyên nội bộ được tham chiếu từ HTML: **39**, tất cả tồn tại.
- App-shell Service Worker: **43 tài nguyên**, không thiếu file.
- `APP_VERSION` state / Service Worker: cùng **47.1.0**.
- `DATA_SCHEMA_VERSION`: giữ nguyên.

## Liên kết mới
- ID: `builtin-moet-csdl`.
- Tên: **CƠ SỞ DỮ LIỆU NGÀNH GIÁO DỤC VÀ ĐÀO TẠO**.
- URL: `https://csdl.moet.gov.vn/`.
- Nhóm: **Hành chính**.
- Ghim mặc định: **Có**.
- Ctrl+K: đã bổ sung từ khóa `csdl`, `ngành giáo dục`, `MOET`.

## An toàn cập nhật
- Không thay đổi IndexedDB/Storage Pro, Firestore, dữ liệu năm học, Kế hoạch, TKB, PPCT hay Lịch báo giảng.
- Service Worker tăng phiên bản cache lên **47.1.0** để GitHub Pages/PWA nhận file liên kết mới.
