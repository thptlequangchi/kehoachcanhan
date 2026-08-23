# Sổ Tay Giáo Viên v50.6.0 — Trạng thái số tiết còn lại theo học kỳ

Bản v50.6 phát triển trực tiếp từ v50.5. Toàn bộ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Nhắc việc, Dashboard, Báo cáo, IndexedDB, PWA và Regression Test được giữ nguyên.

## Điểm mới
Trong bảng **Tiến độ**, cột **Trạng thái** không còn hiển thị `Chậm x tiết / Nhanh x tiết`. Phần nhanh/chậm đã có ở cột **Chênh lệch**, còn Trạng thái trả lời trực tiếp câu hỏi “còn bao nhiêu tiết?”.

- **HKI:** số tiết còn lại = mốc PPCT kết thúc HKI do giáo viên xác nhận − PPCT thực tế.
- **HKII:** số tiết còn lại = tiết PPCT cuối cùng của cả năm − PPCT thực tế.
- Ví dụ: cả năm 140 tiết, HKI kết thúc tiết 54, đã học đến tiết 28 → **Còn 26 tiết HKI**.
- Sang HKII, đã học đến tiết 80/140 → **Còn 60 tiết đến hết năm**.
- Chưa xác nhận mốc HKI → **Chưa xác nhận mốc HKI**.
- Đạt mốc HKI → **Đã hoàn thành mốc HKI**; đạt tiết cuối năm → **Đã hoàn thành PPCT cả năm**.

Các phân loại `behind / ahead / ontrack` vẫn được giữ nội bộ để tô trạng thái, cảnh báo và dự báo; chỉ phần chữ hiển thị ở **Trạng thái** được đổi theo yêu cầu.

## An toàn dữ liệu
- `DATA_SCHEMA_VERSION` không đổi.
- Không thay Firestore Rules hay IndexedDB schema.
- Không sửa dữ liệu PPCT đã lưu.
- Dự báo thiếu tiết cuối học kỳ vẫn hoạt động độc lập với số tiết còn lại hiện tại.

## Cập nhật GitHub Pages
Chép toàn bộ gói v50.6 vào repo và Push. Service Worker / APP_VERSION đã tăng lên **50.6.0**. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
