# Báo cáo kiểm tra v38.0.0 — Bước 6 Dashboard năm học

## Phạm vi thay đổi

Bản v38 phát triển trực tiếp trên v37 đã được audit. Không đổi schema dữ liệu và không thay thế các module nghiệp vụ cũ. Bổ sung `17-year-dashboard.js`, giao diện Dashboard và các hook làm mới sau khi dữ liệu được lưu, khôi phục hoặc đồng bộ.

## Kiểm tra đã chạy

- Cú pháp toàn bộ JavaScript: PASS.
- Thứ tự nạp module: PASS; Dashboard được nạp sau các hàm nghiệp vụ và trước `15-init.js`.
- Tài nguyên nội bộ: 20/20 tồn tại.
- HTML ID: 249/249 duy nhất.
- Hàm JavaScript có tên: 382/382 duy nhất, không khai báo trùng.
- Nút có ID: 53/53 có tham chiếu JavaScript.
- Input/select/textarea có ID: 46/46 có tham chiếu JavaScript.
- VM smoke test Dashboard với dữ liệu giả lập: PASS.
- Tính tuần hiện tại: PASS.
- Đếm độ phủ Kế hoạch/TKB: PASS.
- Đếm tuần đã chốt: PASS.
- Tổng hợp lớp–môn đúng tiến độ: PASS.
- Các module Firebase, OCR, Gemini, Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ công việc và Trợ lý tuần của v37 vẫn được giữ nguyên trong `index.html`.

## Chức năng Dashboard v38

- 6 KPI toàn năm học.
- Thanh tiến trình 37 tuần.
- Ma trận trạng thái 37 tuần.
- Danh sách tuần cần hoàn thiện.
- Lịch dạy sắp tới trong 14 ngày.
- Cảnh báo lớp–môn chậm/thiếu PPCT/nguy cơ hoàn thành muộn.
- Điều hướng trực tiếp từ Dashboard tới Kế hoạch, TKB, Lịch báo giảng và bảng tiến độ.
- Tự làm mới sau lưu dữ liệu, khôi phục backup, đồng bộ cloud, đổi năm học/tuần và mỗi 60 giây.

## Giới hạn kiểm thử

Firebase/Firestore, Gemini và tải language data của Tesseract vẫn cần kiểm thử trực tiếp trên website đã deploy với mạng, tài khoản và API key thật. Bước 6 không thay đổi các luồng này.
