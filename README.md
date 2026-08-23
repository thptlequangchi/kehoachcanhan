# Sổ Tay Giáo Viên v51.1.0 — Form Công Việc Pro

Bản v51.1 phát triển trực tiếp từ v51.0. Toàn bộ nghiệp vụ và dữ liệu được giữ nguyên; bản này sửa và nâng cấp riêng modal **Sổ Công Việc**, đặc biệt nhóm Trạng thái / Ưu tiên / Hạn ngày / Giờ / Lặp lại / Nhắc trước hạn để không còn bị co hẹp, cắt chữ hoặc xuống dòng bất hợp lý.

## Giao diện mới
- Header dạng command bar: năm học hiện tại, Ctrl+K, Nhắc việc, TKB trường, vnEdu, PWA và Cài đặt được tổ chức thành một cụm thao tác rõ ràng.
- Thanh tab chính dạng navigation dock, sticky khi cuộn và tối ưu cho 6 chức năng chính.
- Dashboard, Tổng quan tuần, Automation, Trợ lý tuần, card nội dung và KPI dùng chung một hệ thiết kế.
- Form, nút, toolbar, upload zone, bảng, trạng thái, modal và toast được chuẩn hóa.
- Bảng trong vùng cuộn có header sticky để theo dõi dữ liệu dài dễ hơn.
- Responsive tối ưu lại cho laptop/tablet/điện thoại; không thêm tab hoặc chức năng thừa.

## Nguyên tắc an toàn
- `DATA_SCHEMA_VERSION` giữ nguyên.
- Không thay Firestore Rules, IndexedDB schema hay cấu trúc dữ liệu.
- Không thay logic 39 tuần lịch, 37 tuần PPCT, dự báo học kỳ, Nhắc việc, Hệ thống gợi ý, Báo cáo hay Hồ sơ.
- `pro-workspace-v51.css` tải sau cùng để hạn chế can thiệp vào các module nghiệp vụ.
- Print CSS vẫn ưu tiên nền trắng, không shadow và không dùng hiệu ứng giao diện.

## Cập nhật GitHub Pages
Giải nén và chép **toàn bộ** gói v51 vào repo rồi Commit/Push. Service Worker đã tăng lên `51.1.0` và app-shell có thêm `assets/css/pro-workspace-v51.css`, vì vậy PWA sẽ báo có phiên bản mới.

Sau khi cập nhật, nên mở trang trên máy tính và điện thoại để kiểm tra nhanh: header, 6 tab chính, Dashboard, một bảng dài và một modal.
