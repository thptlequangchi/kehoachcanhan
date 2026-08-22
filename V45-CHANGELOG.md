# v45.0.0 — Bước 12: Trung Tâm Liên Kết & Tích Hợp

## Mục tiêu
Biến Sổ Tay Giáo Viên thành điểm truy cập tập trung tới các hệ thống bên ngoài dùng thường xuyên, nhưng vẫn giữ an toàn dữ liệu và không lưu thông tin đăng nhập.

## Liên kết mặc định đã thêm
1. **Hệ thống quản lý thông tin GV và CBQLCSGD (TEMIS)** — `https://temis.csdl.edu.vn/user/login`
2. **Thời khoá biểu THPT Lê Quảng Chí** — `https://thptlequangchi.hatinh.edu.vn/thoi-khoa-bieu`
3. **UBND tỉnh Hà Tĩnh / VN ERP** — `https://hatinh.vnerp.vn/web/login`

## Nâng cấp
- Thêm tab **🔗 Liên Kết** và nút truy cập nhanh từ Tổng quan giáo viên.
- Thêm khu vực **Truy cập nhanh** với ba hệ thống mặc định được ghim sẵn.
- Cho phép thêm/sửa/xóa liên kết cá nhân, phân nhóm và ghim nhanh.
- Tìm kiếm theo tên, nhóm, mô tả, tên miền hoặc URL.
- Bộ lọc nhóm và chế độ chỉ xem liên kết đã ghim.
- Chỉ chấp nhận URL `http://` hoặc `https://`; chặn scheme nguy hiểm như `javascript:`.
- Mở website bên ngoài trong tab mới với `noopener,noreferrer`.
- Liên kết tùy chỉnh lưu cục bộ trong `localStorage`, không nằm trong dữ liệu năm học và không lưu mật khẩu.
- Thêm `assets/css/links-center.css` và `assets/js/22-links-center.js` vào PWA app-shell.
- `APP_VERSION` → `45.0.0`; `DATA_SCHEMA_VERSION` giữ nguyên.
- Sửa một ID `refreshYearDashboardBtn` bị lặp trong HTML để tăng độ sạch DOM.
