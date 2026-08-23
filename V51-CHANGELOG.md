# v51.0.0 — Professional Workspace UI

## Mục tiêu
Nâng toàn bộ giao diện Sổ Tay Giáo Viên lên một ngôn ngữ thiết kế chuyên nghiệp, gọn, đồng nhất và dễ đọc hơn mà không thay đổi nghiệp vụ, dữ liệu hay phân quyền.

## Thay đổi chính
- Thêm `assets/css/pro-workspace-v51.css`, luôn tải sau toàn bộ stylesheet cũ để làm lớp giao diện cuối cùng.
- Làm lại header theo kiểu **executive command bar**: thương hiệu gọn, ngữ cảnh năm học, Ctrl+K, Nhắc việc, TKB trường, vnEdu, PWA và Cài đặt đồng nhất.
- Nâng Account bar, Cài đặt và thanh Năm học thành các control surface nhỏ gọn, rõ cấp bậc.
- Thanh tab chính đổi thành **professional navigation dock**, active state nhẹ và dễ nhận biết hơn.
- Đồng nhất Dashboard, Tổng quan tuần, Automation và Trợ lý tuần về cùng hệ card/KPI/panel.
- Card nội dung, header card, toolbar, bộ lọc, form, upload zone và nút bấm dùng chung hệ spacing/radius/shadow.
- Bảng dữ liệu có header rõ hơn, sticky header trong vùng cuộn, dòng hover nhẹ và mật độ đọc tốt hơn.
- Đồng nhất giao diện Report, Hồ sơ tự động, Sổ Công Việc, Liên kết, Storage, Health Check và Regression Center.
- Modal, Ctrl+K và toast được tinh chỉnh theo cùng hệ giao diện.
- Responsive mới cho laptop, tablet và điện thoại; tab trên điện thoại cuộn ngang gọn.
- Giữ chế độ in trang trọng, không đưa hiệu ứng giao diện vào bản in.
- Cập nhật màu PWA: theme `#0c2745`, nền `#edf2f8`.

## Không thay đổi
- `DATA_SCHEMA_VERSION`.
- Firebase/Firestore/Auth và Rules.
- IndexedDB/LocalStorage schema.
- Kế hoạch, TKB, PPCT, Lịch báo giảng, Công việc, Nhắc việc, Báo cáo, Hồ sơ, Automation.
- Logic 39 tuần lịch / 37 tuần PPCT và dự báo theo học kỳ.

## Phiên bản
- APP_VERSION: `51.0.0`
- Service Worker: `51.0.0`
