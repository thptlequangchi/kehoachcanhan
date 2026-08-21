# Sổ tay giáo viên v36.2.0

Bản sửa lỗi tải ảnh Kế hoạch tuần.

- Bỏ output `blocks` của Tesseract.js trong luồng OCR để tránh lỗi runtime `Cannot read properties of undefined (reading 'undefined')`.
- Chuẩn hóa ngôn ngữ OCR thành `vie+eng`.
- Tăng phiên bản engine nhận dạng để bỏ cache cũ có thể lỗi.
- Thêm lớp dự phòng: nếu Gemini/OCR vẫn phát sinh lỗi bất ngờ, hệ thống tạo mẫu tuần trống để giáo viên tiếp tục chỉnh thay vì dừng toàn bộ thao tác.
- Giữ nguyên toàn bộ dữ liệu, Firestore, PPCT, TKB và các chức năng hiện có.
