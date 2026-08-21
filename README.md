# Sổ Tay Giáo Viên v33 — Bước 2: Tách cấu trúc code

Bản này giữ nguyên giao diện và nghiệp vụ từ v32, nhưng tách CSS/JavaScript thành các file riêng để dễ bảo trì.

## Cấu trúc
- `index.html`: giao diện HTML
- `assets/css/app.css`: toàn bộ CSS chính
- `assets/js/config.js`: Firebase Web Config
- `assets/js/01-state.js` ... `15-init.js`: mã JavaScript tách theo đúng thứ tự thực thi của bản gốc

## Lưu ý triển khai
Upload **toàn bộ thư mục** lên GitHub Pages, không chỉ riêng `index.html`. Giữ nguyên cấu trúc `assets/`.

Không chuyển sang ES Module ở bước này để tránh thay đổi scope và thứ tự khởi tạo của hệ thống hiện tại.
