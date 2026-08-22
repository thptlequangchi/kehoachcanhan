# Sổ Tay Giáo Viên v48.0.0 — Bước 15: Hồ sơ giáo viên tự động

Bản v48 phát triển trực tiếp từ v47.1 và giữ nguyên toàn bộ IndexedDB/Storage Pro, Firebase, Gemini/OCR, Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc Pro, Dashboard, Automation, Report Center, PWA, Health Check, Trung tâm Liên kết và Ctrl+K.

## Điểm mới Bước 15
- Thêm khối **Hồ sơ giáo viên tự động** ngay trong tab **Báo cáo & Hồ sơ**.
- Dùng trực tiếp phạm vi báo cáo hiện tại: tuần, tháng, học kỳ, cả năm hoặc khoảng tuần tùy chọn; hỗ trợ lọc lớp/môn.
- Theo dõi mức sẵn sàng hồ sơ và số lượng dữ liệu của 7 thành phần: Kế hoạch, TKB, Lịch báo giảng, Tiến độ PPCT, Không học/Học bù, Sổ công việc, Tổng hợp.
- Một nút **Tạo gói hồ sơ ZIP** tạo bộ hồ sơ theo tên giáo viên/năm học/phạm vi.
- ZIP gồm: danh mục TXT, 7 tệp HTML theo từng mục hồ sơ, 1 Word `.doc`, 1 Excel `.xlsx` khi thư viện XLSX sẵn sàng, bản in HTML để **In → Lưu dưới dạng PDF**, và JSON manifest thống kê.
- Có nút xuất riêng **Word**, **Excel**, **PDF (qua hộp thoại In)**.
- Excel có 7 sheet tương ứng 7 nhóm hồ sơ.
- Bổ sung lệnh **Tạo gói hồ sơ giáo viên** trong Ctrl+K.
- ZIP được tạo bằng bộ đóng gói thuần JavaScript, không thêm CDN mới.

## Nguyên tắc an toàn
- Chức năng chỉ đọc dữ liệu hiện có; không sửa Kế hoạch, TKB, PPCT, Lịch báo giảng hay Sổ Công Việc.
- `DATA_SCHEMA_VERSION` giữ nguyên.
- Không ghi Firestore khi xuất hồ sơ.
- Nếu XLSX CDN chưa tải được, các định dạng còn lại vẫn dùng được; nút Excel sẽ báo rõ.

## Cập nhật GitHub Pages
Chép toàn bộ gói v48 vào repo và Push. Service Worker v48 bổ sung `assets/js/25-profile-package.js` và `assets/css/profile-package.css` vào app-shell.
