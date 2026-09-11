# Sổ Tay Giáo Viên Pro v53.2 — STABLE

> Gói hiện tại: **v53.2.0 — STABLE**. Các changelog cũ được giữ để truy vết lịch sử.

Bản v53.2 kế thừa trực tiếp v53.1 STABLE, giữ nguyên toàn bộ module cũ và nâng cấp **Sổ chủ nhiệm** theo *Dự thảo Quy chế thực hiện nề nếp năm học 2026–2027* của Đoàn trường THPT Lê Quảng Chí (08/09/2026).

## Điểm mới v53.2
- Danh mục **48 lỗi nề nếp** theo dự thảo, tách rõ lỗi theo học sinh và lỗi theo lớp.
- Tự điền **điểm trừ/điểm thưởng** và hiển thị hình thức xử lý kèm theo quy định.
- Không tự nhân hệ số tái phạm đối với các mục thuộc quy chế 2026–2027; mức điểm được giữ đúng theo bảng quy chế.
- Bảng **Gợi ý hạnh kiểm/rèn luyện** theo học kỳ: số lỗi, số lần vi phạm điện thoại, lỗi hạ 1 bậc, lỗi dẫn tới mức Yếu, điểm thưởng/trừ và lý do cảnh báo.
- Xử lý riêng các trường hợp theo dự thảo: từ 2–4 lỗi, 5–6 lỗi, trên 6 lỗi; lần thứ 2 vi phạm điện thoại trong học kỳ; các lỗi quy định trực tiếp mức Yếu; các lỗi hạ 1 bậc.
- Nhật ký **nề nếp cấp lớp** cho các lỗi như sinh hoạt 15 phút, vệ sinh, xếp xe, trực tuần, xếp hàng, báo cáo, cơ sở vật chất…
- Điểm thi đua nề nếp tổng hợp được cả lỗi cá nhân và lỗi cấp lớp vì các mức điểm trong bảng là tác động tới thi đua của lớp.
- Bổ sung danh mục **khuyến khích/khen thưởng**: hoạt động văn nghệ, bảng tin, tình nguyện, giải thi, thực hiện Quy định 77.
- Xuất Excel có thêm thông tin TT quy chế, phạm vi, hình thức xử lý, nguồn quy định, bảng gợi ý hạnh kiểm, nhật ký nề nếp lớp và danh mục quy chế.
- Giữ nguyên **Cơ cấu lớp v53.1**: tổ học sinh, tổ trưởng/tổ phó, ban cán sự, chức vụ tùy biến và kiêm nhiệm.

> **Lưu ý:** nguồn hiện tại là **dự thảo**. Kết quả xếp loại trên phần mềm là công cụ hỗ trợ GVCN rà soát, không tự thay thế kết luận chính thức của giáo viên/nhà trường. Khi quy chế chính thức thay đổi, danh mục có thể cập nhật mà không làm mất dữ liệu cũ.

## Các mốc hoàn thiện từ v52.5 đến v53.2
- **v52.5:** Bảng điều hành Hôm nay: lịch dạy, việc cần làm, học sinh cần chú ý, tiến độ PPCT.
- **v52.6:** Feature module loader, giảm JavaScript chặn khởi động.
- **v52.7:** Browser Smoke Suite cho kiểm thử trực tiếp sau khi triển khai.
- **v52.8:** 5 điểm an toàn tự động, chu kỳ 12 giờ và phục hồi nhanh.
- **v52.9:** Offline sync outbox, tự đồng bộ lại khi mạng trở về.
- **v53.0:** Safe Boot Guard, release manifest và chốt kênh `stable`.
- **v53.1:** Cơ cấu lớp chủ nhiệm: xếp tổ, tổ trưởng/tổ phó, ban cán sự, kiêm nhiệm chức vụ, chức vụ tùy biến và xuất Excel theo tổ.
- **v53.2:** Quy chế nề nếp 2026–2027: 48 lỗi, điểm thưởng/trừ, xử lý kỷ luật, gợi ý hạnh kiểm và nhật ký thi đua lớp.

## Tương thích dữ liệu
- `DATA_SCHEMA_VERSION = 4` (không migration phá vỡ dữ liệu).
- Workspace Sổ chủ nhiệm được normalize bổ sung metadata quy chế nhưng vẫn đọc dữ liệu v53.1/v53.0/v52.x.
- `BACKUP_VERSION = 7`.
- 37 tuần chính + tối đa 2 tuần phụ trước khai giảng.
- Sổ điểm: tối đa 5 cột đánh giá thường xuyên.
- Sổ chủ nhiệm: cơ cấu lớp, nề nếp, lịch sử xử lý, xu hướng 4 tuần và gợi ý mức rèn luyện/hạnh kiểm.

## Triển khai
Giải nén toàn bộ gói vào thư mục site/repository. Service Worker dùng `APP_VERSION = 53.2.0`, vì vậy cache v53.1/v52.x sẽ tự được thay thế sau khi bản mới kích hoạt.

## Kiểm thử nhanh sau triển khai
Mở phần kiểm thử và bấm **🌐 Smoke test trình duyệt**, hoặc mở `tests/browser-smoke.html`.
