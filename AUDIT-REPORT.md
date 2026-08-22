# AUDIT REPORT — v45.3.0 Giao diện gọn theo vai trò

## Phạm vi nâng cấp
- Giao diện tài khoản cá nhân / nhóm giáo viên / admin nhóm.
- Ẩn các công cụ quản trị và kỹ thuật không cần thiết đối với giáo viên thường.
- Chuyển “Kiểm tra kết nối nhóm” vào cửa sổ Quản trị nhóm của admin.
- Không thay đổi schema dữ liệu hoặc Firestore Rules.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **371/371 duy nhất**.
- Hàm JavaScript có tên: **531/531 duy nhất**, không phát hiện khai báo trùng.
- Tài nguyên nội bộ tham chiếu từ HTML: **34**, không thiếu file.
- App-shell Service Worker: **38 tài nguyên**, không thiếu file.
- `APP_VERSION` trong state và Service Worker: cùng **45.3.0**.

## Kiểm tra logic theo vai trò
- Chế độ cá nhân: `accountSetupBtn` và `teamAdminBtn` được ẩn; nút chính vẫn dẫn vào luồng dùng nhóm khi cần.
- Role `teacher` đang hoạt động trong chế độ nhóm: ẩn `teamAdminBtn` và `accountSetupBtn` bằng cả JS và CSS dự phòng.
- Role `admin` đang hoạt động: hiện `teamAdminBtn`; không hiện nút “Kiểm tra nhóm” riêng trên thanh tài khoản.
- Admin có nút **Kiểm tra kết nối nhóm** bên trong cửa sổ Quản trị nhóm.
- Màn hình thiết lập/kiểm tra nhóm có guard: giáo viên thường đang hoạt động không được mở màn hình kỹ thuật nhóm.
- Nếu quyền admin bị hạ khi modal quản trị đang mở, modal được đóng ở lần cập nhật giao diện kế tiếp.

## An toàn dữ liệu
- `DATA_SCHEMA_VERSION` giữ nguyên.
- Không đổi cấu trúc workspace, Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ công việc hoặc liên kết.
- Không đổi Firestore Rules hoặc quyền server; đây chỉ là tối ưu giao diện + guard phía client.

## Giới hạn kiểm thử
- Chưa thực hiện đăng nhập Firebase thật với hai tài khoản admin/teacher trong môi trường này. Sau deploy nên kiểm tra nhanh bằng tài khoản thật để xác nhận trạng thái role từ Firestore đúng như cấu hình của nhóm.
