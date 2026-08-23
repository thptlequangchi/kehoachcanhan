# AUDIT REPORT — v50.6.0 Trạng thái số tiết còn lại theo học kỳ

## Phạm vi nâng cấp
- Nền trực tiếp: v50.5.0.
- Không thay đổi schema dữ liệu nghiệp vụ, Firestore Rules hoặc IndexedDB schema.
- APP_VERSION / Service Worker: `50.6.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên `1`.

## Quy tắc Trạng thái mới
- HKI: `Còn lại = mốc PPCT kết thúc HKI đã xác nhận - PPCT thực tế`.
- HKII: `Còn lại = tiết PPCT cuối cùng cả năm - PPCT thực tế`.
- HKI chưa xác nhận mốc: hiển thị `Chưa xác nhận mốc HKI`.
- Đạt mốc HKI: `Đã hoàn thành mốc HKI`.
- Đạt tiết cuối năm: `Đã hoàn thành PPCT cả năm`.
- `status` nhanh/chậm/đúng tiến độ vẫn giữ nội bộ để tô màu, cảnh báo và dự báo; cột `Chênh lệch` vẫn cho biết nhanh/chậm.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **430/430 duy nhất**.
- Literal DOM references: **196**, không thiếu ID.
- Hàm JavaScript có tên: **730/730 duy nhất**.
- Tài nguyên nội bộ từ HTML: **46**, không thiếu file.
- Service Worker app-shell: **49 tài nguyên**, không thiếu file.
- 49 app-shell resources: **HTTP 200** trong kiểm thử local.
- APP_VERSION trong state và Service Worker: cùng **50.6.0**.
- `teacher-data-changed`: **1 listener** dùng chung.
- Heartbeat 60 giây: **1 timer** dùng chung.

## Fixture nghiệp vụ
- Năm học / Kế hoạch / TKB / Sổ Công Việc cũ / Lịch báo giảng: PASS.
- Mốc HKI do giáo viên xác nhận: PASS.
- Gợi ý mốc HKI từ Kiểm tra/Trả bài: PASS.
- 140 tiết cả năm, HKI mốc 54, đã học 28 → **Còn 26 tiết HKI**: PASS.
- HKII, cả năm 140, đã học 80 → **Còn 60 tiết đến hết năm**: PASS.
- HKI chưa xác nhận mốc → không tự đoán số còn lại: PASS.
- Dự báo thiếu tiết cuối HKI/HKII vẫn hoạt động độc lập: PASS.

## Lưu ý
- Bản này thay đổi cách hiển thị `statusLabel`, không đổi cách phân loại nội bộ `behind / ahead / ontrack / completed`.
- Vì vậy Dashboard, Reminder và Hệ thống gợi ý vẫn có thể xác định lớp cần chú ý, trong khi giáo viên nhìn thấy số tiết còn phải học ở cột Trạng thái.
