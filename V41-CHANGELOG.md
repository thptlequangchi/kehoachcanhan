# v41.0.0 — Bước 9: Premium UI

## Mục tiêu
Nâng cấp mạnh trải nghiệm thị giác mà không thay đổi nghiệp vụ, cấu trúc dữ liệu hoặc các luồng Firebase/Gemini/OCR.

## Thay đổi chính
- Thêm lớp giao diện độc lập `assets/css/premium-ui.css`, tải sau `app.css` để dễ bảo trì và rollback.
- Làm mới Header theo phong cách Teacher Workspace cao cấp, giữ nguyên các ID và điều khiển cũ.
- Chuẩn hóa hệ màu, radius, shadow, spacing, focus state và typography toàn ứng dụng.
- Nâng cấp Dashboard năm học, Trợ lý tuần, Tự động hóa, Báo cáo, Sổ công việc, bảng biểu và upload zone.
- Thanh tab sticky dạng glass-navigation, trạng thái active rõ hơn.
- Tối ưu laptop/tablet/mobile và `prefers-reduced-motion`.
- Giữ giao diện in/PDF trang trọng, không để hiệu ứng premium ảnh hưởng bản in.
- `APP_VERSION` nâng thành `41.0.0`; `DATA_SCHEMA_VERSION` giữ nguyên.

## Không thay đổi
- Firebase / Firestore / Authentication.
- Gemini / OCR / cache nhận dạng.
- Kế hoạch trường, TKB, PPCT, học bù, Lịch báo giảng.
- Dashboard logic, Automation logic, Report Center logic.
- Backup / Restore và dữ liệu hiện có.
