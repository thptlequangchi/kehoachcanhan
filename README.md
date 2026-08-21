# Sổ Tay Giáo Viên v36.4.0 — sửa lỗi khởi động

- UI lõi (năm học, header, tổng quan) khởi động trước Firebase/migration.
- Mỗi bước init được cô lập lỗi; một module lỗi không làm toàn trang dừng ở “Đang tải năm học…”.
- Firebase chạy bất đồng bộ, lỗi cloud không chặn chế độ cục bộ.
- Giữ nguyên toàn bộ chức năng và dữ liệu v36.3.
