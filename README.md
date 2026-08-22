# Sổ Tay Giáo Viên v44.0.0 — Bước 11: Sổ Công Việc Pro

Bản v44 phát triển trực tiếp trên v43 Health Check. Toàn bộ Kế hoạch trường, TKB, PPCT, Lịch báo giảng, Dashboard, Automation, Báo cáo, Firebase/Gemini/OCR, PWA và Health Check được giữ nguyên.

## Điểm mới của Sổ Công Việc Pro
- Dashboard công việc: **Hôm nay, Quá hạn, Tuần này, Đang làm, Đã xong**.
- 4 trạng thái nhiệm vụ: **Chưa làm → Đang làm → Chờ xử lý → Hoàn thành**.
- 4 mức ưu tiên: **Gấp, Cao, Bình thường, Thấp**.
- Chế độ **Danh sách** và **Kanban kéo-thả**.
- Hạn theo ngày + giờ.
- Công việc lặp lại **hàng tuần / hàng tháng**; khi hoàn thành sẽ tạo lần tiếp theo và có cơ chế chống sinh trùng.
- Liên kết công việc với **Kế hoạch, TKB, Lịch báo giảng, Báo cáo, Automation**, kèm Tuần/Lớp/Môn.
- **Hệ thống gợi ý** tự phát hiện việc còn thiếu từ dữ liệu hiện có; chỉ thêm vào Sổ khi giáo viên bấm xác nhận.
- Nút **Chuẩn bị tuần mới** sinh checklist 4 việc cho tuần tiếp theo và không tạo trùng khi bấm lại.
- Bộ lọc nhanh: hôm nay, quá hạn, tuần này, ưu tiên cao; lọc thêm theo loại, trạng thái, ưu tiên, tuần và từ khóa.
- Tương thích dữ liệu cũ: trường `completed` của nhiệm vụ v43 được tự chuyển thành trạng thái `done` khi đọc.

## Chế độ nhóm giáo viên
Sổ Công Việc Pro dùng thêm các trường Firestore cho trạng thái, ưu tiên, lặp lại và liên kết nghiệp vụ. Nếu đang dùng **Nhóm giáo viên**, sau khi nâng v44 hãy vào phần thiết lập nhóm và **sao chép Firestore Rules v44** rồi cập nhật Rules một lần. Dữ liệu cá nhân không cần thao tác này.

## Cập nhật GitHub Pages
Giải nén rồi chép **toàn bộ** nội dung vào repo, gồm `index.html`, `manifest.webmanifest`, `service-worker.js` và thư mục `assets`. Bản v44 có thêm `assets/css/work-pro.css`, vì vậy không chỉ thay riêng `index.html`.

PWA v43 có thể báo có phiên bản mới sau khi Push. Chọn **Cập nhật ngay** hoặc tải lại trang để kích hoạt cache v44.
