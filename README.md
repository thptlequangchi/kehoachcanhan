# Sổ Tay Giáo Viên v43.0.0 — Bước 5: Health Check & Diagnostics

Bản v43 phát triển trực tiếp từ v42 PWA & Hiệu năng. Toàn bộ nghiệp vụ giáo viên, Firebase, Gemini, OCR, PPCT, lịch báo giảng, Dashboard, Tự động hóa, Báo cáo và PWA được giữ nguyên.

## Điểm mới
- Mở **Cài đặt & an toàn → Kiểm tra sức khỏe & chẩn đoán** để xem trạng thái hệ thống.
- Tự kiểm tra nhanh sau khi khởi động; nút **Kiểm tra hệ thống** thực hiện kiểm tra sâu cả các tài nguyên đang triển khai.
- Ghi tối đa 50 lỗi kỹ thuật gần nhất và hỗ trợ sao chép/tải báo cáo chẩn đoán.
- JSON localStorage lỗi được lưu bản xem trước trong khu cách ly trước khi bỏ qua.
- Có khôi phục an toàn từ checkpoint sẵn có, nhưng chỉ thực hiện sau khi người dùng xác nhận.
- Báo cáo chẩn đoán tự che mẫu API key và không chứa mật khẩu.

## Cập nhật GitHub Pages
Giải nén rồi chép **toàn bộ** nội dung vào repo, bao gồm `index.html`, `manifest.webmanifest`, `service-worker.js` và toàn bộ thư mục `assets`. Sau khi Push, nếu v42 đang chạy PWA, trang có thể báo có phiên bản mới; chọn **Cập nhật ngay** hoặc tải lại để kích hoạt v43.
