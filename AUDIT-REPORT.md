# AUDIT REPORT — v51.1.0 Form Công Việc Pro

## Phạm vi
- Nền trực tiếp: v50.7.0.
- Chỉ nâng lớp trình bày và PWA theme; không thay nghiệp vụ/schema.
- Thêm `assets/css/pro-workspace-v51.css` và bắt buộc tải cuối cùng.

## Kiểm tra tĩnh
- HTML ID: **430/430 duy nhất**.
- Literal DOM references: **196/196 hợp lệ**.
- Hàm JavaScript có tên: **736/736 duy nhất**.
- Tài nguyên nội bộ tham chiếu từ HTML: **47**, không thiếu file.
- Service Worker app-shell: **50 tài nguyên**, không thiếu file.
- Toàn bộ JavaScript nội bộ + Service Worker: **PASS `node --check`**.
- `APP_VERSION` state / Service Worker: cùng **51.1.0**.
- `pro-workspace-v51.css`: tải sau cùng trong nhóm CSS.
- CSS v51 parse bằng `tinycss2`: **160 rules, 0 parse error**.

## Kiểm tra nghiệp vụ hồi quy
`node tests/run-state-fixtures.js`: toàn bộ fixture PASS, gồm:
- Năm học và lịch 39 tuần.
- Kế hoạch, TKB, Sổ Công Việc, Lịch báo giảng.
- Trạng thái final/finalized.
- PPCT attention và mốc HKI giáo viên xác nhận.
- Số tiết còn lại theo học kỳ.
- Dự báo HKI/HKII với tải tiết khác nhau.

## PWA / tài nguyên
- 50/50 app-shell resource trả HTTP 200 trong kiểm tra local.
- Theme PWA đổi sang `#0c2745`; background `#edf2f8`.
- Cache version tăng lên 51.0.0 để tránh giữ CSS giao diện cũ.

## Kiểm tra giao diện
- CSS v51 không thay DOM ID, event handler hay script order.
- Có breakpoint riêng cho 1320px, 1020px, 700px và 430px.
- Print override giữ header bảng không sticky và loại shadow/accent trang trí.
- Chromium headless trong container tiếp tục bị timeout do môi trường DBus, nên **không tuyên bố đã hoàn tất visual E2E bằng trình duyệt thật**.

## Kết luận
Bản v51 đạt kiểm tra tĩnh, fixture nghiệp vụ và kiểm tra tài nguyên. Sau deploy GitHub Pages nên kiểm tra trực tiếp một vòng giao diện trên desktop + mobile để đánh giá tỷ lệ hiển thị thực tế của trình duyệt đang dùng.

## Kiểm tra bổ sung v51.1
- `workTaskFields.span-all` có rule chiếm `grid-column: 1 / -1`.
- Grid thiết lập nhiệm vụ: 4 cột desktop, 2 cột tablet, 1 cột mobile.
- Lặp lại và Nhắc trước hạn chiếm 2 cột trên desktop.
- Không đổi ID, event handler, cấu trúc dữ liệu hay schema.
