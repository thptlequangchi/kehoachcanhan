# v49.0.0 — Bước 16: Nhắc việc thông minh & Lịch công việc

## Mục tiêu
Biến Sổ Công Việc Pro thành trung tâm chủ động nhắc việc, đồng thời gom nhiệm vụ có hạn và lịch dạy lên cùng một lịch tuần/tháng mà không thay đổi schema dữ liệu nghiệp vụ.

## Điểm mới
- Thêm **Nhắc việc thông minh**: Khẩn cấp, Hôm nay, Sắp tới, Cảnh báo hệ thống.
- Nhắc theo hạn và mức ưu tiên; từng nhiệm vụ có thể chọn: tự động, không nhắc, đúng hạn, 30 phút, 2 giờ, 1 ngày hoặc 2 ngày trước hạn.
- Có **Nhắc lại sau 1 giờ**, **Bỏ qua hôm nay**, **Hoàn thành**, **Mở nơi xử lý**.
- Cảnh báo hệ thống có thể tắt theo loại và bật lại: Kế hoạch, TKB, Báo giảng, Học bù, PPCT, Sao lưu.
- Cảnh báo tự động bổ sung tình trạng lớp–môn chậm/nguy cơ PPCT từ Dashboard năm học.
- Nút 🔔 cố định trên header, có badge số việc/cảnh báo đang cần chú ý.
- Hỗ trợ Notification API sau khi người dùng chủ động cấp quyền; không tự xin quyền.
- Thêm chế độ **📅 Lịch** cho Sổ Công Việc, chuyển **Tuần / Tháng**, hiển thị nhiệm vụ và lịch dạy/Không học.
- Thêm **Xuất lịch .ics** cho các nhiệm vụ đang mở có hạn để nhập Google Calendar/Outlook.
- Ctrl+K có thêm các lệnh: Nhắc việc thông minh, Lịch công việc, Xuất công việc .ics.

## Nguyên tắc an toàn
- `DATA_SCHEMA_VERSION` giữ nguyên 1.
- Thiết lập nhắc việc là dữ liệu cá nhân trên thiết bị (`localStorage`), kể cả khi nhiệm vụ là nhiệm vụ nhóm; không làm thay đổi Firestore Rules.
- Không tự tạo hàng loạt nhiệm vụ từ cảnh báo hệ thống; người dùng vẫn chủ động chọn “Thêm vào sổ”.
- Notification trình duyệt chỉ được gửi khi ứng dụng đang mở/hoạt động. Không tuyên bố hỗ trợ lịch thông báo nền khi ứng dụng đã đóng.
- File `.ics` chỉ xuất nhiệm vụ có hạn; lịch dạy không được xuất giờ tự động để tránh suy đoán khung giờ chưa có dữ liệu chính xác.
