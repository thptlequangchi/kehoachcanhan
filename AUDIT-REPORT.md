# AUDIT REPORT — v50.2.0 Hợp nhất engine gợi ý

## Phạm vi
- Nền trực tiếp: v50.1.0.
- APP_VERSION / Service Worker: `50.2.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên 1.
- Không migration dữ liệu, không đổi Firestore Rules hay IndexedDB schema.

## Kiến trúc gợi ý sau làm sạch
- Shared Core có `classifyProgressRows()` và `buildProgressAttentionSnapshot()` làm nguồn phân loại tiến độ PPCT dùng chung.
- Dashboard năm học dùng `buildProgressAttentionSnapshot()` thay vì tự lọc/sắp xếp PPCT riêng.
- `buildWorkSystemSuggestions()` là engine duy nhất phát hiện các gợi ý Kế hoạch, TKB, Báo giảng, Học bù, PPCT và Sao lưu.
- Reminder chỉ đọc `buildWorkSystemSuggestions()`; không còn `buildPpctAlerts()` riêng.
- Mọi cảnh báo hệ thống chuyển thành nhiệm vụ qua `addWorkSystemSuggestion()`; không còn nhánh tạo task PPCT riêng.
- `sourceKey` PPCT tiếp tục dùng dạng `system:<năm học>:ppct:<lớp>:<môn>` để chống trùng với dữ liệu đã tạo từ v49/v50.1.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **427/427 duy nhất**.
- Literal DOM references: **196**, không thiếu ID.
- Hàm JavaScript có tên: **713/713 duy nhất**.
- Tài nguyên nội bộ từ HTML: **46**, không thiếu file.
- Service Worker app-shell: **49 tài nguyên**, không thiếu file.
- Toàn bộ 49 app-shell resource trả **HTTP 200** khi kiểm thử local.
- APP_VERSION state / Service Worker: cùng **50.2.0**.
- `teacher-data-changed`: vẫn chỉ **1 listener dùng chung**.
- Heartbeat UI 60 giây: vẫn chỉ **1 timer dùng chung**.

## Fixture / regression
- Năm học: PASS.
- Kế hoạch: PASS.
- Thời khóa biểu: PASS.
- Tương thích Sổ Công Việc cũ: PASS.
- Lịch báo giảng: PASS.
- Trạng thái `final/finalized`: PASS.
- Phân loại PPCT cần chú ý: PASS.
- Static Audit sẽ FAIL nếu `buildPpctAlerts()` riêng hoặc nhánh fallback PPCT cũ xuất hiện trở lại.

## An toàn nghiệp vụ
- Hệ thống vẫn **không tự tạo nhiệm vụ** từ gợi ý.
- PPCT chỉ xuất hiện như gợi ý/cảnh báo; giáo viên phải bấm “Thêm vào sổ”.
- Khi nhiệm vụ đã tồn tại với cùng `sourceKey`, Sổ Công Việc và Reminder đều không tạo/nhắc cảnh báo hệ thống trùng.
- Sau khi thêm vào sổ, Reminder chuyển sang nhắc chính nhiệm vụ thật theo hạn và thiết lập nhắc việc.

## Giới hạn kiểm thử
- Không tuyên bố E2E trình duyệt thật trong môi trường build.
- Sau khi deploy GitHub Pages, nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ**, đồng thời kiểm tra một lớp chậm PPCT ở Dashboard → Hệ thống gợi ý → Nhắc việc → Thêm vào sổ.
