# AUDIT REPORT — v45.0.0 Trung Tâm Liên Kết & Tích Hợp

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **371/371 duy nhất**, không phát hiện ID trùng.
- Hàm JavaScript có tên: **530/530 duy nhất**, không phát hiện khai báo trùng.
- Tài nguyên nội bộ tham chiếu từ HTML: **34**, thiếu: **0**.
- PWA app-shell: **38 tài nguyên**, thiếu: **0**.
- `APP_VERSION`: **45.0.0**; `DATA_SCHEMA_VERSION`: **1** (không đổi schema dữ liệu).

## Kiểm tra Trung Tâm Liên Kết
- Ba URL mặc định người dùng yêu cầu có mặt chính xác: **PASS**.
- Nút ngữ cảnh **TKB trường ↗** trong tab Thời khóa biểu: **PASS**.
- Full-init headless browser: **PASS**, không có `pageerror` và không có init error.
- Render mặc định: **3** link card + **3** quick card.
- Thêm liên kết tùy chỉnh: **PASS**.
- Ghim liên kết tùy chỉnh và hiện ở Truy cập nhanh: **PASS**.
- Tìm kiếm `TEMIS`: **PASS**, lọc còn đúng 1 kết quả.
- URL nguy hiểm `javascript:`: **BỊ TỪ CHỐI**, không ghi vào localStorage.
- Chuyển tab Liên Kết: **PASS**, `aria-selected=true` và panel active.

## An toàn
- Chỉ chấp nhận URL `http:` / `https:`.
- Website ngoài mở trong tab mới với `noopener,noreferrer`.
- Không lưu mật khẩu hoặc phiên đăng nhập website bên ngoài.
- Liên kết tùy chỉnh lưu ở `localStorage` riêng, không thay đổi workspace năm học/PPCT/TKB/Lịch báo giảng.
- Service Worker chỉ cache file nội bộ của Trung Tâm Liên Kết; không cache nội dung các website ngoài.

## Sửa lỗi nhỏ kèm theo
- Loại bỏ một ID `refreshYearDashboardBtn` bị lặp trong HTML của bản nguồn trước khi đóng gói v45.
