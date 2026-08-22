# Sổ Tay Giáo Viên v39.0.0 — Bước 7: Tự động hóa công việc giáo viên

Bản v39 phát triển trực tiếp trên v38 Dashboard năm học. Không viết lại ứng dụng và không đổi schema dữ liệu hiện có.

## Nâng cấp chính

- Thêm **Tự động hóa công việc: Kế hoạch → Báo giảng → Học bù** ngay trên màn hình chính.
- Tự quét Kế hoạch trường theo ngày/buổi và đối chiếu với TKB để xác định các tiết có thể bị ảnh hưởng.
- Mở trực tiếp luồng **Đối chiếu & xác nhận** đã có trong Lịch báo giảng; hệ thống không tự đánh dấu Không học khi chưa có xác nhận.
- Mở rộng nhận biết các hoạt động có thể ảnh hưởng việc học: nghỉ/không học, thi tập trung, hoạt động chung, lao động và tập trung học sinh.
- Theo dõi xuyên tuần các tiết đã đánh dấu **Không học** và các **Tiết học bù**; tự xác định số tiết còn thiếu bù theo từng lớp–môn.
- Tìm khung trống kỹ thuật trong TKB tối đa 3 tuần gần nhất, đồng thời tránh khung đã có tiết dạy hoặc tuần đã chốt.
- Nút **Điền gợi ý** mở biểu mẫu Thêm tiết học bù và điền sẵn tuần, thứ, buổi, tiết, lớp, môn và ghi chú nguồn. Giáo viên vẫn phải kiểm tra học sinh có thể học và nhấn lưu.
- Thêm luồng 6 bước cho mỗi tuần: Kế hoạch → TKB → Báo giảng → Đối chiếu Kế hoạch → Kiểm tra tuần → Chốt tuần.
- Tự làm mới khi dữ liệu được lưu/đồng bộ, khi đổi năm học/tuần và sau các thao tác nghiệp vụ.

## Nguyên tắc an toàn

Tự động hóa chỉ **phát hiện, gợi ý và điền trước**. Các thao tác làm thay đổi PPCT như đánh dấu Không học, thêm học bù hoặc chốt tuần vẫn cần giáo viên xác nhận.

## Cập nhật GitHub Desktop

Giải nén gói, chép toàn bộ `index.html`, thư mục `assets` và các file đi kèm vào repository hiện tại, chọn Replace, sau đó Commit và Push origin.
