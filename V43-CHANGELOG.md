# v43.0.0 — Bước 5: Kiểm tra sức khỏe & chẩn đoán hệ thống

## Mục tiêu
Bổ sung một lớp tự kiểm tra để khi website gặp lỗi có thể xác định nhanh lỗi nằm ở ứng dụng, dữ liệu local, PWA, Firebase, Gemini, OCR hay file triển khai, mà không làm gián đoạn các nghiệp vụ đã ổn định ở v42.

## Điểm mới
- Trung tâm **🩺 Kiểm tra sức khỏe & chẩn đoán** trong Cài đặt & an toàn.
- Kiểm tra nhanh sau khởi động; kiểm tra sâu theo yêu cầu gồm cả các file đang deploy trên server.
- Trạng thái ✅ Tốt / ⚠️ Cảnh báo / ❌ Lỗi cho: app/init, localStorage, schema, năm học, mốc Tuần 1, PWA, storage quota, persistent storage, Firebase/Firestore, Gemini, OCR, Word/Excel, backup và runtime errors.
- Nhật ký tối đa **50 lỗi kỹ thuật gần nhất**; bắt lỗi JavaScript, Promise rejection, tài nguyên tải lỗi và lỗi init.
- Tự che chuỗi có dạng API key khỏi nhật ký/báo cáo.
- Khi JSON localStorage bị hỏng, giữ bản xem trước trong **khu cách ly** trước khi bỏ qua dữ liệu lỗi.
- Nút **Sao chép báo cáo** và **Tải báo cáo** để gửi chẩn đoán.
- Nút **Khôi phục an toàn** chỉ hoạt động khi có checkpoint hợp lệ; luôn tạo checkpoint khẩn cấp của dữ liệu hiện tại trước khi phục hồi.
- Ghi nhận thời điểm sao lưu file gần nhất và cảnh báo khi chưa/đã lâu chưa backup.
- Service Worker v43 cache thêm module/CSS chẩn đoán và cho phép Health Check kiểm tra trực tiếp file server, không bị cache cũ che lỗi thiếu file.

## Không thay đổi
- `DATA_SCHEMA_VERSION` giữ nguyên.
- Không tự gọi Gemini để test, tránh tốn quota.
- Không tạo Firestore write chỉ để test quyền.
- Không tự sửa dữ liệu hoặc tự khôi phục nếu người dùng chưa xác nhận.
- Kế hoạch, TKB, PPCT, lịch báo giảng, Automation, Report Center và PWA giữ nguyên nghiệp vụ.
