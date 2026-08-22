# Hướng dẫn kiểm thử v50

Mở **Cài đặt & an toàn → Kiểm thử hồi quy tự động**.

- **Kiểm thử nhanh**: chạy sau mỗi lần mở trang; có thể bấm lại bất kỳ lúc nào.
- **Kiểm thử đầy đủ**: nên chạy sau khi Push một phiên bản mới lên GitHub Pages.
- Nếu có **LỖI** hoặc **HỒI QUY MỚI**, mở danh sách kết quả và tải báo cáo JSON trước khi tiếp tục sửa code.

## Luồng kiểm tra tay tối thiểu sau một bản nâng cấp lớn
1. Chuyển năm học và tải lại trang.
2. Mở một tuần Kế hoạch, TKB và Lịch báo giảng đã có dữ liệu.
3. Mở Sổ Công Việc, thử Danh sách/Kanban/Lịch.
4. Mở Ctrl+K và tìm `vnEdu`, `Tuần 5`, `Kiểm thử hồi quy`.
5. Mở Storage Pro và Health Check.
6. Nếu dùng nhóm giáo viên, thử 1 tài khoản admin và 1 tài khoản teacher.

Bộ kiểm thử tự động không tự gọi Gemini hoặc ghi Firestore.
