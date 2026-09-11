# Sổ Tay Giáo Viên Pro v53.3.2 — STABLE

> Gói hiện tại: **v53.3.2 — STABLE**. Các changelog cũ vẫn được giữ để truy vết lịch sử.

Bản v53.3 kế thừa trực tiếp v53.2 STABLE, giữ nguyên Sổ điểm, PPCT sáng/chiều, kế hoạch tuần, Sổ chủ nhiệm, cơ cấu tổ/ban cán sự và quy chế nề nếp 2026–2027. Nâng cấp trọng tâm là **Bảng thi đua lớp tự động**.


### Hotfix v53.3.1
Sổ chủ nhiệm đã được sửa theo cơ chế **nhập một lần – tự cập nhật toàn bộ**: sau khi ghi lỗi, KPI lỗi nề nếp, Bảng ưu tiên GVCN, Nề nếp 2026–2027 & gợi ý xếp loại, trạng thái chưa xử lý và bảng thi đua đều được render lại ngay.

### Quality Patch v53.3.2
- Tự động 4 trường hợp vắng có phép: thông thường, Noel, lễ tôn giáo có xác nhận, vắng dài ngày chỉ trừ 3 ngày đầu.
- Các lỗi theo loại/lá/ngày/tuần/tiết mục có Số lượng và tự tính tổng điểm.
- Bộ lọc “Có lỗi nề nếp” dùng đúng tổng lỗi quy chế học kỳ.
- Thống kê tách ghi nhận học sinh và ghi nhận tập thể.
- Precache các module lazy quan trọng để dùng offline ngay sau lần tải đầu.
- Mặc định hồ sơ mới là năm học 2026-2027; dữ liệu cũ không bị thay đổi.

## Điểm mới v53.3
- Thi đua tuần: cờ đỏ + tổ giám thị + Sổ đầu bài.
- Tự lấy điểm nề nếp đã ghi trong Sổ chủ nhiệm, có thể tắt tự động để tránh cộng trùng.
- Tự chia tuần về tháng sau nếu tuần nằm giữa hai tháng.
- Thi đua tháng: TB các tuần + thưởng/phạt tháng + chăm sóc bồn hoa.
- Theo dõi hai lần chấm bồn hoa, điểm CSVC và lao động.
- Học kỳ: TB tuần tham khảo, có cảnh báo đây không phải công thức chính thức trong dự thảo.
- Năm học: TB tháng + điểm trừ CSVC + lao động.
- Xuất Excel thêm sheet thi đua tuần, tháng, học kỳ/năm.

## Dữ liệu & tương thích
- Dữ liệu v53.0/v53.1/v53.2 được giữ nguyên.
- Không cần nhập lại danh sách học sinh, tổ, chức vụ, nhật ký nề nếp hay xếp loại.
- Dữ liệu bảng thi đua mới nằm trong `book.competition`.

## Triển khai
Giải nén toàn bộ gói vào thư mục site/repository. Service Worker dùng `APP_VERSION = 53.3.2`; cache của v53.2 và các bản cũ sẽ được thay thế sau khi Service Worker mới kích hoạt.

Xem thêm `V53.3-CHANGELOG.md`, `TESTING.md`, `AUDIT-REPORT.md` và `STABLE-RELEASE-CHECKLIST.md`.
