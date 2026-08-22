# Sổ Tay Giáo Viên v45.0.0 — Bước 12: Trung Tâm Liên Kết & Tích Hợp

Bản v45 phát triển trực tiếp trên v44 Sổ Công Việc Pro. Toàn bộ Kế hoạch trường, TKB, PPCT, Lịch báo giảng, Dashboard, Automation, Báo cáo, Sổ Công Việc Pro, Firebase/Gemini/OCR, PWA và Health Check được giữ nguyên.

## Điểm mới
- Tab **🔗 Liên Kết** làm trung tâm truy cập website bên ngoài.
- Ba liên kết mặc định: TEMIS, Thời khoá biểu THPT Lê Quảng Chí, UBND tỉnh Hà Tĩnh / VN ERP.
- Có Truy cập nhanh, tìm kiếm, lọc nhóm, ghim liên kết.
- Có thể thêm/sửa/xóa liên kết cá nhân trên thiết bị.
- URL được kiểm tra chỉ cho phép HTTP/HTTPS và được mở trong tab mới an toàn.
- Không lưu mật khẩu hay thông tin đăng nhập của website bên ngoài.

## Cập nhật GitHub Pages
Giải nén rồi chép **toàn bộ** nội dung vào repo: `index.html`, `manifest.webmanifest`, `service-worker.js` và thư mục `assets`. Bản v45 có thêm `assets/css/links-center.css` và `assets/js/22-links-center.js`.

PWA bản cũ có thể báo có phiên bản mới sau khi Push. Chọn **Cập nhật ngay** hoặc tải lại trang để kích hoạt cache v45.
