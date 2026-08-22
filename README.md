# Sổ Tay Giáo Viên v45.3.0 — Giao diện gọn theo vai trò

Bản v45.3 phát triển trực tiếp trên v45.2. Toàn bộ dữ liệu và nghiệp vụ cũ được giữ nguyên.

## Điểm mới
- Giao diện tài khoản tự thay đổi theo **chế độ cá nhân / giáo viên nhóm / admin nhóm**.
- Giáo viên thường không còn thấy các nút quản trị hoặc kiểm tra kỹ thuật nhóm.
- Ở chế độ cá nhân chỉ giữ hành động **Dùng cùng nhóm**; khi cần, nút này tự mở đúng bước đăng nhập/thiết lập.
- Admin vẫn có **Quản trị nhóm**; chức năng **Kiểm tra kết nối nhóm** được đặt bên trong cửa sổ quản trị để thanh công cụ không bị dài.
- Có lớp CSS dự phòng bảo đảm công cụ admin không hiện với role teacher/personal ngay cả khi trạng thái giao diện cập nhật chậm.

## Cập nhật GitHub Pages
Giải nén và chép toàn bộ nội dung vào repo rồi Commit → Push. PWA sẽ nhận cache v45.3.0 và đề nghị cập nhật.

## Dữ liệu
`DATA_SCHEMA_VERSION` không thay đổi. Không cần chuyển đổi hoặc nhập lại dữ liệu.
