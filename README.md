# Sổ Tay Giáo Viên v38.0.0 — Bước 6: Dashboard năm học chuyên nghiệp

Bản v38 phát triển trực tiếp từ v37 đã được audit. Không thay đổi schema dữ liệu và không viết lại các chức năng cũ.

## Nâng cấp chính

- Dashboard toàn cảnh 37 tuần ngay đầu trang.
- 6 KPI: tuần hiện tại, tiến trình năm học, độ phủ Kế hoạch, độ phủ TKB, số tuần đã chốt, số lớp–môn đúng tiến độ.
- Thanh tiến trình năm học theo 37 tuần.
- Ma trận trạng thái 37 tuần: đã chốt / bản nháp / đủ nguồn / thiếu dữ liệu / cần tạo lại.
- Danh sách tuần còn thiếu Kế hoạch, TKB, Lịch báo giảng hoặc chưa chốt.
- Lịch dạy sắp tới lấy trực tiếp từ TKB trong 14 ngày gần nhất.
- Danh sách lớp–môn đang chậm PPCT, thiếu PPCT hoặc có nguy cơ hoàn thành muộn.
- Nhấn vào tuần hoặc cảnh báo để mở đúng Kế hoạch, TKB hoặc Lịch báo giảng.
- Nút mở thẳng Dashboard tiến độ chi tiết hiện có.
- Tự làm mới khi đổi năm học/tuần và mỗi 60 giây.

## Giữ nguyên

Firebase/Firestore, Gemini, OCR, backup/restore, Kế hoạch trường, TKB, PPCT, học bù, Lịch báo giảng, Sổ công việc và Trợ lý tuần đều được giữ nguyên từ v37.

## Cập nhật GitHub Desktop

Giải nén gói, chép toàn bộ `index.html`, `assets` và các file đi kèm vào thư mục repository, chọn Replace, sau đó Commit và Push origin.
