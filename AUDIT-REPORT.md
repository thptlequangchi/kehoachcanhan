# AUDIT REPORT — v48.0.0 / Bước 15: Hồ sơ giáo viên tự động

## Phạm vi nâng cấp
- Nền trực tiếp: v47.1.0.
- Thêm `assets/js/25-profile-package.js` và `assets/css/profile-package.css`.
- `APP_VERSION` / Service Worker: **48.0.0**.
- `DATA_SCHEMA_VERSION`: **giữ nguyên 1**.

## Chức năng Bước 15
- Khối **Hồ sơ giáo viên tự động** nằm trong tab Báo cáo & Hồ sơ, dùng trực tiếp phạm vi tuần/tháng/học kỳ/năm/tùy chọn và bộ lọc lớp/môn hiện tại.
- Hiển thị mức sẵn sàng dựa trên độ hoàn thiện hồ sơ của Report Center.
- Theo dõi 7 thành phần: Kế hoạch, Thời khóa biểu, Lịch báo giảng, Tiến độ PPCT, Không học/Học bù, Sổ Công Việc, Tổng hợp.
- Xuất riêng Word `.doc`, workbook Excel `.xlsx` 7 sheet và In/PDF qua hộp thoại in của trình duyệt.
- Một nút **Tạo gói hồ sơ ZIP** tạo: TXT danh mục, 7 HTML riêng, Word, Excel khi XLSX sẵn sàng, HTML bản in để lưu PDF và JSON manifest.
- ZIP dùng bộ writer thuần JavaScript với UTF-8/CRC32, không bổ sung CDN mới.
- Ctrl+K có lệnh **Tạo gói hồ sơ giáo viên**.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **399/399 duy nhất**.
- Literal DOM references (`getElementById` / `byId`): **269**, không thiếu ID.
- Hàm JavaScript có tên: **626/626 duy nhất**.
- Tài nguyên nội bộ được tham chiếu từ HTML: **41**, không thiếu file.
- Service Worker app-shell: **45 tài nguyên**, không thiếu file.
- Toàn bộ **45/45** app-shell resource trả HTTP 200 trong kiểm thử local.
- APP_VERSION trong state và Service Worker cùng **48.0.0**.
- `DATA_SCHEMA_VERSION` giữ nguyên **1**.

## Kiểm tra ZIP
- Bộ ZIP writer mới được chạy unit test bằng 2 tệp UTF-8.
- `unzip -t` xác nhận: **No errors detected in compressed data**.
- Phương thức ZIP là Store (không nén) để không phụ thuộc thư viện ngoài; ưu tiên độ ổn định/offline hơn kích thước tệp.

## An toàn dữ liệu
- Chức năng xuất hồ sơ chỉ đọc snapshot hiện có; không thay đổi Kế hoạch, TKB, PPCT, Lịch báo giảng hay Sổ Công Việc.
- Không phát sinh Firestore write khi tạo hồ sơ.
- Không thay đổi IndexedDB schema hoặc cấu trúc backup.
- Xuất PDF sử dụng hộp thoại **In → Lưu dưới dạng PDF** của trình duyệt; gói ZIP chứa `Ban_in_PDF.html`, không giả lập tệp PDF nhị phân.

## Giới hạn kiểm thử
- Không tuyên bố đã chạy E2E trên trình duyệt thật trong môi trường build.
- Các kiểm tra cú pháp, DOM, tài nguyên, HTTP local và cấu trúc ZIP đều PASS.
- Sau khi deploy GitHub Pages, nên thử một gói theo **Theo tháng** để xác nhận Word/Excel/ZIP tải đúng trên trình duyệt thầy đang dùng.
