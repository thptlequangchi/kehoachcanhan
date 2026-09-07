# Sổ Tay Giáo Viên Pro 52.1

Bản v52.1 kế thừa trực tiếp v52.0 và tập trung **hoàn thiện Thời khóa biểu tuần**. Không xóa hay làm lại các module cũ.

## Nền tảng đang có
- Kế hoạch trường và cơ chế so sánh/cập nhật lịch công tác điều chỉnh.
- Thời khóa biểu tuần Buổi sáng / Buổi chiều.
- PPCT tách riêng theo **lớp + môn + buổi**.
- Lịch báo giảng, tiến độ PPCT và báo cáo.
- Sổ điểm cá nhân tối đa 5 cột TX.
- Sổ chủ nhiệm cá nhân.
- Công việc, nhắc việc, dashboard, PWA/offline, backup thường và backup có mật khẩu.

## Mới trong v52.1
- Hiển thị rõ đủ Tiết TKB **1–5**, sửa dứt điểm lỗi Tiết 2/4 bị mờ do CSS zebra.
- Cột Tiết TKB sticky khi cuộn ngang.
- Tối ưu kích thước chữ, căn giữa và tiêu đề Buổi sáng/Buổi chiều.
- Tooltip xem nhanh **PPCT sáng/chiều và tên bài** ngay trên ô TKB mà không phải mở Lịch báo giảng.
- Tooltip ưu tiên dữ liệu lịch báo giảng hợp lệ; nếu chưa có, hệ thống tự suy ra từ PPCT đúng buổi.

## Cập nhật GitHub Pages
Giải nén gói v52.1, chép **toàn bộ** nội dung vào repo hiện tại và Replace các file cũ. Commit/Push như bình thường. Service Worker dùng APP_VERSION `52.1.0`, vì vậy cache PWA sẽ được đổi sang bản mới.

## Dữ liệu
Bản v52.1 **không đổi schema**, vì vậy dữ liệu từ v52.0/v51.x tiếp tục dùng trực tiếp. Tuy nhiên nên sao lưu trước khi thay file deploy.
