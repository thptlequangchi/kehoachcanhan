# Sổ Tay Giáo Viên v51.3.0 — PPCT sáng / chiều độc lập

Bản v51.3 phát triển trực tiếp từ v51.2, giữ nguyên toàn bộ chức năng Kế hoạch trường, so sánh lịch công tác điều chỉnh, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Nhắc việc, báo cáo, IndexedDB và Firestore.

Điểm nâng cấp chính: **PPCT được quản lý theo lớp + môn + buổi**. Vì vậy nếu lớp 12A2 học Toán cả buổi sáng và buổi chiều, PPCT chiều không còn nối tiếp PPCT sáng mà có dãy riêng.

## Cách dùng nhanh cho trường hợp Toán sáng / chiều khác PPCT
1. Vào **Phân phối chương trình**.
2. Chọn đúng **Khối / Lớp / Môn**.
3. Ở **Buổi áp dụng**, chọn `Buổi sáng` và tải PPCT sáng nếu cần.
4. Chuyển sang `Buổi chiều` và tải PPCT chiều.
5. Khi tạo Lịch báo giảng, hệ thống tự tra và đánh Tiết PPCT độc lập cho từng buổi.

`Cả hai buổi (dự phòng)` dùng cho dữ liệu cũ hoặc trường hợp thực sự muốn dùng cùng một PPCT cho cả sáng và chiều. Nếu đã có PPCT cũ dạng này, thầy có thể giữ nguyên làm dự phòng và chỉ tải thêm PPCT `Buổi chiều`; bộ chiều riêng sẽ được ưu tiên tự động.

## Ví dụ
- 12A2 · Toán · Buổi sáng, Tuần 1: PPCT 1, 2.
- 12A2 · Toán · Buổi chiều, Tuần 1: PPCT 1, 2.
- Tuần 2: mỗi buổi tiếp tục dãy của chính nó, không cộng chéo sáng ↔ chiều.

## Triển khai GitHub Pages
Giải nén và chép **toàn bộ** thư mục v51.3 vào repo, chọn Replace, Commit và Push. Service Worker đã tăng lên `51.3.0`; PWA sẽ nhận bản cập nhật mới.

Sau khi deploy, nên vào **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
