# Sổ Tay Giáo Viên v37.0.0 — bản ổn định sau kiểm thử toàn diện

Bản v37 giữ nguyên nền tảng và dữ liệu của v36.4, tập trung sửa lỗi khởi tạo và gia cố các luồng nghiệp vụ chính.

## Sửa lỗi quan trọng

- Sửa lỗi phụ thuộc chéo giữa các module: `01-state.js` trước đây gọi `normalizeScheduleMetaBackup`, `normalizeTeachingScheduleBackup` và parser PPCT trước khi các hàm đó được nạp. Đây là nguyên nhân có thể làm toàn trang dừng ngay khi khởi động.
- Các hàm chuẩn hóa dữ liệu bắt buộc khi khởi động đã được chuyển về đúng module `01-state.js`.
- Sửa parser PPCT dạng văn bản phổ biến: `Tuần N` rồi các dòng `Tiết X: Tên bài`.
- Sửa OCR dự phòng của Kế hoạch tuần khi ảnh có hai dòng Chủ nhật (ví dụ CN 16/8 và CN 23/8): ưu tiên ngày thuộc đúng khoảng tuần.
- Có thể suy ra số tuần từ khoảng ngày nếu ảnh không ghi rõ `Tuần N` và đã cấu hình ngày bắt đầu Tuần 1.
- Gia cố validator ảnh TKB để dữ liệu AI thiếu `sessions/periods/cells` không làm phát sinh TypeError.
- Tăng phiên bản engine nhận dạng lên 4 để không tái sử dụng cache nhận dạng cũ có cấu trúc lỗi.
- Đồng bộ nhãn phiên bản giao diện thành v37.

## Kiểm thử đã chạy

- Tất cả file JavaScript qua `node --check`.
- 228 ID HTML, không trùng ID.
- 19 tài nguyên nội bộ CSS/JS đều tồn tại.
- 51/51 nút và 46/46 input/select/textarea có tham chiếu trong JavaScript.
- 365 hàm có tên, không có hàm khai báo trùng.
- 120 listener sự kiện được rà trong mã nguồn.
- Nạp toàn bộ 19 module theo đúng thứ tự trang: đạt.
- Khởi tạo ứng dụng trong môi trường DOM mô phỏng: đạt, không có lỗi init nội bộ.
- Danh sách năm học: tạo đủ và chuyển năm học thành công.
- Dữ liệu legacy PPCT/lịch báo giảng: nạp được mà không lỗi phụ thuộc module.
- Parser PPCT: nhận đúng tuần, Tiết PPCT và tên bài.
- OCR kế hoạch có CN 16/8 + CN 23/8: chọn đúng CN 23/8 trong tuần 17/8–23/8.
- Tạo lịch báo giảng dự phòng từ TKB + PPCT: ánh xạ đúng Tiết PPCT và bài dạy.
- Backup chuẩn hóa/round-trip: giữ đúng năm học hiện hành.

## Lưu ý kiểm thử

Firebase/Auth/Firestore và Gemini là dịch vụ mạng cần tài khoản/quyền/API thực tế. Các nhánh xử lý, fallback và cú pháp đã được audit; việc xác nhận end-to-end với dữ liệu đám mây thật cần chạy trên website đã deploy với tài khoản của thầy.
