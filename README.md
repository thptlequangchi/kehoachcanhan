# Sổ Tay Giáo Viên Pro 53.0 — STABLE

> Gói hiện tại: **v53.1 — STABLE**. Các changelog cũ được giữ để truy vết lịch sử.

Bản v53.1 kế thừa trực tiếp v53.0 STABLE, giữ nguyên toàn bộ module cũ và bổ sung Cơ cấu lớp chủ nhiệm: tổ học sinh, tổ trưởng/tổ phó, ban cán sự, chức vụ tùy biến và thống kê theo tổ.

## Các mốc hoàn thiện từ v52.5 đến v53.1
- **v52.5:** Bảng điều hành Hôm nay: lịch dạy, việc cần làm, học sinh cần chú ý, tiến độ PPCT.
- **v52.6:** Feature module loader, giảm JavaScript chặn khởi động.
- **v52.7:** Browser Smoke Suite cho kiểm thử trực tiếp sau khi triển khai.
- **v52.8:** 5 điểm an toàn tự động, chu kỳ 12 giờ và phục hồi nhanh.
- **v52.9:** Offline sync outbox, tự đồng bộ lại khi mạng trở về.
- **v53.0:** Safe Boot Guard, release manifest và chốt kênh `stable`.
- **v53.1:** Cơ cấu lớp chủ nhiệm: xếp tổ, tổ trưởng/tổ phó, ban cán sự, kiêm nhiệm chức vụ, chức vụ tùy biến và xuất Excel theo tổ.

## Tương thích dữ liệu
- `DATA_SCHEMA_VERSION = 4`.
- `BACKUP_VERSION = 7`.
- Không có migration phá vỡ tương thích từ v52.x.
- 37 tuần chính + tối đa 2 tuần phụ trước khai giảng.
- Sổ điểm: tối đa 5 cột đánh giá thường xuyên.
- Sổ chủ nhiệm: theo dõi vi phạm, điểm rèn luyện tuần, xử lý/lịch sử vi phạm nghiêm trọng và xu hướng 4 tuần.

## Triển khai
Giải nén toàn bộ gói vào thư mục site/repository. Service Worker dùng `APP_VERSION = 53.1.0`, vì vậy cache v52.x sẽ tự được thay thế sau khi bản mới kích hoạt.

## Kiểm thử nhanh sau triển khai
Mở phần kiểm thử và bấm **🌐 Smoke test trình duyệt**, hoặc mở `tests/browser-smoke.html`.
