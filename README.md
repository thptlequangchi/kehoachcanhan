# Sổ Tay Giáo Viên Pro v53.3.6 — STABLE

> Gói hiện tại: **v53.3.6 — STABLE**. Các changelog cũ vẫn được giữ để truy vết lịch sử.

Bản v53.3 kế thừa trực tiếp v53.2 STABLE, giữ nguyên Sổ điểm, PPCT sáng/chiều, kế hoạch tuần, Sổ chủ nhiệm, cơ cấu tổ/ban cán sự và quy chế nề nếp 2026–2027. Nâng cấp trọng tâm là **Bảng thi đua lớp tự động**.




### Bổ sung điểm nề nếp & khen thưởng GVCN v53.3.6
- Thêm nhóm trừ điểm nội bộ: không hoàn thành bài thu hoạch, nộp chậm, không hoàn thành/không tham gia cuộc thi online bắt buộc, không hoàn thành nhiệm vụ được giao, thiếu chuẩn bị chuyên đề, không hoàn thành nhiệm vụ cá nhân, nộp minh chứng/biểu mẫu chậm.
- Thêm nhóm khen thưởng: tham gia đội văn nghệ, thể thao/CLB/truyền thông, hỗ trợ hoạt động, bài thu hoạch xuất sắc, hoàn thành tốt chương trình online, đạt giải cấp trường, tiến bộ rõ rệt, có sáng kiến/hỗ trợ tập thể.
- Mức mặc định do hệ thống gợi ý; GVCN có thể điều chỉnh trước khi lưu. Các mục này được gắn nhãn **GVCN** và không được coi là điểm chính thức của dự thảo nhà trường.
- Điểm bổ sung được cộng vào điểm nề nếp cá nhân và số lỗi theo dõi; không tự động cộng/trừ vào bảng thi đua lớp theo quy chế.

### Đồng bộ lỗi học sinh tức thời v53.3.5
- Sửa lỗi ghi nhận vi phạm xong nhưng cột **Lỗi HK** vẫn bằng `0` do bản ghi bị thêm vào tham chiếu Sổ chủ nhiệm cũ sau bước chuẩn hóa state.
- Ghi nhận mới nay được commit vào đúng workspace năm học trước khi render và lưu Firestore.
- Ghi nhận tự do với nhóm **Vi phạm** vẫn tăng tổng **Lỗi HK/Chưa xử lý**, nhưng không tự sinh điểm quy chế nếu chưa gắn điều khoản chính thức.

### Hotfix v53.3.1
Sổ chủ nhiệm đã được sửa theo cơ chế **nhập một lần – tự cập nhật toàn bộ**: sau khi ghi lỗi, KPI lỗi nề nếp, Bảng ưu tiên GVCN, Nề nếp 2026–2027 & gợi ý xếp loại, trạng thái chưa xử lý và bảng thi đua đều được render lại ngay.



### OCR ngoại tuyến & chống dữ liệu xuất hiện lại v53.3.4
- Khi Gemini không dùng được hoặc mất mạng, OCR trên máy không còn chỉ lấy văn bản: hệ thống dùng tọa độ OCR để dựng lại **buổi × thứ × tiết TKB** và điền các ô nhận diện được.
- Service Worker chủ động làm ấm Tesseract worker/core và bộ ngôn ngữ Việt + Anh khi đang online để lần mất mạng sau có thể dùng OCR ngay trên thiết bị.
- Kết quả TKB trắng hoặc chế độ nhập tay không còn được lưu cache; engine nhận dạng tăng phiên bản nên cache TKB trắng của bản cũ tự hết hiệu lực.
- Khi xóa TKB tuần, cache nhận dạng của ảnh nguồn cũng bị xóa để ảnh cũ không tự dựng lại từ “bộ nhớ ảnh”.
- Đồng bộ Firestore có khóa chống snapshot cũ ghi đè thay đổi local đang chờ lưu; document dữ liệu cá nhân được ghi theo snapshot đầy đủ để các tuần đã xóa cũng bị xóa thật trên cloud.
- Lưu ý: trên thiết bị mới, nên mở v53.3.4+ ít nhất một lần khi có mạng để PWA tải sẵn bộ OCR trước khi cần dùng hoàn toàn ngoại tuyến.

### PPCT HĐTN thống nhất v53.3.3
- `HĐTN_SHDC`, `HĐTN_SHL` và các cách ghi HĐTN tương đương được nhận diện là cùng môn HĐTN.
- Chuỗi Tiết PPCT chạy liên tục theo lớp: nếu SHDC là Tiết 1 thì SHL kế tiếp là Tiết 2, không khởi động lại vì khác nhãn hoặc khác buổi.
- Giữ nguyên nhãn hiển thị SHDC/SHL trên thời khóa biểu và lịch báo giảng; chỉ thống nhất khóa môn dùng để đánh số PPCT.
- Schema 5 tự rà soát/đánh số lại lịch báo giảng cũ khi mở bản mới, không xóa dữ liệu nguồn.

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
Giải nén toàn bộ gói vào thư mục site/repository. Service Worker dùng `APP_VERSION = 53.3.6`; cache của v53.2 và các bản cũ sẽ được thay thế sau khi Service Worker mới kích hoạt.

Xem thêm `V53.3.6-CHANGELOG.md`, `V53.3.5-CHANGELOG.md`, `V53.3-CHANGELOG.md`, `TESTING.md`, `AUDIT-REPORT.md` và `STABLE-RELEASE-CHECKLIST.md`.
