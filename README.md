# Sổ Tay Giáo Viên v40.0.0 — Bước 8: Báo cáo & xuất hồ sơ

Bản v40 phát triển trực tiếp trên v39. Không viết lại ứng dụng, không đổi schema dữ liệu và giữ nguyên toàn bộ Kế hoạch trường, TKB, PPCT, Lịch báo giảng, Sổ công việc, Dashboard năm học và Tự động hóa.

## Chức năng mới

- Thêm tab **Báo Cáo & Hồ Sơ**.
- Lập báo cáo theo:
  - tuần hiện tại;
  - tháng;
  - Học kỳ I (Tuần 1–18);
  - Học kỳ II (Tuần 19–37);
  - cả năm học;
  - khoảng tuần tùy chọn.
- Lọc theo lớp và môn.
- Tự tổng hợp từ dữ liệu hiện có:
  - Kế hoạch trường;
  - Thời khóa biểu;
  - Lịch báo giảng;
  - tiến độ PPCT;
  - Không học / học bù;
  - Sổ công việc.
- Hiển thị độ hoàn thiện hồ sơ theo các nguồn dữ liệu đến mốc hiện tại.
- Xuất một workbook Excel nhiều sheet.
- Xuất Word tổng hợp.
- In hoặc lưu PDF qua hộp thoại in của trình duyệt.
- Có xem trước dữ liệu trước khi xuất.

## Cập nhật GitHub Pages

Giải nén gói ZIP rồi chép **toàn bộ** `index.html` và thư mục `assets` vào repo hiện tại, chọn Replace, Commit và Push origin bằng GitHub Desktop.

Không chỉ chép riêng `index.html` vì v40 có thêm `assets/js/19-report-center.js`.
