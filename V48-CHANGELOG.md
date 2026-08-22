# v48.0.0 — Bước 15: Hồ sơ giáo viên tự động

## Mục tiêu
Biến Report Center thành nơi tạo trọn bộ hồ sơ giảng dạy theo tuần/tháng/học kỳ/năm học, giảm thao tác xuất từng bảng rời.

## Thay đổi
- Thêm `assets/js/25-profile-package.js`.
- Thêm `assets/css/profile-package.css`.
- Thêm bảng mức sẵn sàng và 7 thành phần hồ sơ trong tab Báo cáo.
- Thêm xuất Word, workbook Excel 7 sheet, In/PDF và gói ZIP.
- ZIP gồm danh mục, 7 HTML mục hồ sơ, Word, Excel (khi XLSX sẵn sàng), bản in PDF-ready và JSON manifest.
- Thêm Ctrl+K: **Tạo gói hồ sơ giáo viên**.
- `APP_VERSION` / Service Worker tăng lên `48.0.0`.
- `DATA_SCHEMA_VERSION` không đổi.

## An toàn
Không thay đổi cấu trúc dữ liệu, không ghi cloud và không tự sửa dữ liệu nguồn khi tạo hồ sơ.
