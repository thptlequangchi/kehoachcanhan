# Sổ Tay Giáo Viên v51.2.0 — So sánh lịch công tác điều chỉnh

Bản v51.2 phát triển trực tiếp từ v51.1 và giữ nguyên toàn bộ nghiệp vụ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Nhắc việc, báo cáo, IndexedDB và Firestore.

Điểm nâng cấp chính: khi tải ảnh Lịch công tác mới của một tuần đã có, hệ thống **so sánh trước — cập nhật sau**. Mỗi ô thay đổi được chỉ rõ bản cũ và bản mới; giáo viên tự chọn nội dung cần áp dụng. Dữ liệu cũ không bị ghi đè âm thầm.

### Cách dùng nhanh
- Vào **Kế hoạch trường** và tải ảnh mới.
- Nếu đúng tuần đã có, cửa sổ `🔄 Lịch công tác ... có điều chỉnh` tự mở.
- Kiểm tra các dòng **Thêm mới / Thay đổi / Bỏ**.
- Chọn các thay đổi đúng rồi bấm **Cập nhật**.
- Nếu không muốn đổi, bấm **Hủy · Giữ bản hiện tại**.

Khi ảnh có cảnh báo nhận dạng, các dòng bị xóa/bỏ được để chờ xác nhận thay vì tự chọn, giúp hạn chế xóa nhầm do OCR đọc thiếu.

## Triển khai GitHub Pages
Giải nén và chép **toàn bộ** thư mục v51.2 vào repo, chọn Replace, Commit và Push. Service Worker đã tăng lên `51.2.0`; PWA sẽ nhận bản cập nhật mới.

Sau khi deploy, nên vào **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
