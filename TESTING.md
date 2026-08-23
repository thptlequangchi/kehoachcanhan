# TESTING — v51.1 Form Công Việc Pro

## Kiểm tra bắt buộc
- `node --check` toàn bộ JavaScript và Service Worker.
- HTML ID không trùng, DOM reference đầy đủ, app-shell không thiếu tài nguyên.
- `pro-workspace-v51.css` phải là stylesheet nội bộ tải cuối cùng.
- CSS v51 parse không lỗi.
- Fixture nghiệp vụ v50.7 tiếp tục PASS.

## Kiểm tra giao diện trên trình duyệt thật sau deploy
1. **Desktop 1366/1440px**: header không tràn; Ctrl+K, Nhắc việc, TKB trường, vnEdu, PWA và Cài đặt hiển thị gọn.
2. **Thanh 6 tab**: sticky khi cuộn; active state rõ; không che nội dung.
3. **Dashboard**: KPI/panel thẳng hàng, không cắt chữ ở dữ liệu dài.
4. **Bảng dài**: header bảng sticky trong vùng cuộn; dòng không bị lệch cột.
5. **Form / modal / Ctrl+K**: focus rõ, nút không tràn.
6. **Điện thoại 390–430px**: header xếp 2 cột hợp lý, tab cuộn ngang, không có horizontal overflow toàn trang.
7. **In / Save as PDF**: nền trắng, không shadow/accent UI và header bảng trở về static.

## Kiểm tra nghiệp vụ giữ nguyên
- Lịch năm học: 2 tuần phụ + 37 tuần chính.
- HKI 1–18, HKII 19–37.
- Mốc HKI do giáo viên xác nhận.
- Trạng thái số tiết còn lại theo học kỳ.
- Reminder / Hệ thống gợi ý không lặp.
- IndexedDB / Firebase / Report / Hồ sơ không thay schema.

## Kiểm tra riêng v51.1
- Mở Sổ Công Việc → Thêm/Sửa nhiệm vụ.
- Nhóm Thiết lập nhiệm vụ phải chiếm toàn chiều rộng modal.
- Desktop: 4 trường Trạng thái / Ưu tiên / Hạn ngày / Giờ cùng hàng; Lặp lại / Nhắc trước hạn ở hàng dưới.
- Tablet: 2 cột; mobile: 1 cột.
- Không được cắt chữ trong select và phần mô tả không bị bó thành cột hẹp.
