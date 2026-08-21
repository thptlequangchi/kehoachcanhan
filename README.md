# Sổ tay giáo viên v36.3.0

Bản sửa lỗi tải ảnh Kế hoạch tuần.

- Bỏ output `blocks` của Tesseract.js trong luồng OCR để tránh lỗi runtime `Cannot read properties of undefined (reading 'undefined')`.
- Chuẩn hóa ngôn ngữ OCR thành `vie+eng`.
- Tăng phiên bản engine nhận dạng để bỏ cache cũ có thể lỗi.
- Thêm lớp dự phòng: nếu Gemini/OCR vẫn phát sinh lỗi bất ngờ, hệ thống tạo mẫu tuần trống để giáo viên tiếp tục chỉnh thay vì dừng toàn bộ thao tác.
- Giữ nguyên toàn bộ dữ liệu, Firestore, PPCT, TKB và các chức năng hiện có.


## v36.3.0 – Sửa theo ảnh kế hoạch thực tế 17/8–23/8/2026
- Hỗ trợ ảnh có CN 16/8 ở đầu và CN 23/8 ở cuối mà không ghi đè nhau.
- Lọc hàng ngày ngoài khoảng ngày của tuần khi có thể xác định chắc chắn.
- Khởi tạo Tesseract đa ngôn ngữ bằng mảng ['vie','eng'] thay cho chuỗi vie+eng.
- Giữ nguyên toàn bộ chức năng và dữ liệu hiện có.
