# AUDIT REPORT — v50.7.0 Lịch năm học tối đa 39 tuần

## Phạm vi nâng cấp
- Nền trực tiếp: v50.6.0.
- APP_VERSION / Service Worker: `50.7.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên `1`.
- Không thay Firestore Rules hoặc IndexedDB schema.

## Quy tắc năm học
- **2 tuần phụ trước khai giảng + 37 tuần chính = tối đa 39 tuần lịch**.
- PPCT, TKB, Lịch báo giảng, học kỳ và dự báo tiến độ vẫn dùng **Tuần 1–37**.
- Timeline Dashboard mở rộng lên 39 vị trí và nhận biết tuần phụ.
- Tuần phụ chỉ kiểm tra Kế hoạch trường, không bị coi là thiếu TKB/Báo giảng.
- Mã tuần phụ `-1/-2` được giữ nguyên để tương thích dữ liệu cũ.

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ + `service-worker.js`: **PASS `node --check`**.
- HTML ID: **430/430 duy nhất**.
- Literal DOM references: **196**, không thiếu ID.
- Hàm JavaScript có tên: **736/736 duy nhất**.
- Tài nguyên nội bộ từ HTML: **46**, không thiếu file.
- Service Worker app-shell: **49 tài nguyên**, không thiếu file.
- 49/49 app-shell resources trả **HTTP 200** trong kiểm thử local.
- APP_VERSION trong state và Service Worker: cùng **50.7.0**.
- `teacher-data-changed`: **1 listener** dùng chung.
- Heartbeat 60 giây: **1 timer** dùng chung.

## Fixture nghiệp vụ
- Quy tắc lịch 39 tuần: PASS.
- Chuỗi tuần phụ + Tuần 1–37: PASS.
- Ranh giới HKI/HKII 18/19: PASS.
- Năm học / Kế hoạch / TKB / Sổ Công Việc / Lịch báo giảng: PASS.
- Mốc HKI, số tiết còn lại và dự báo theo học kỳ: PASS.

## Lưu ý
- Bản này mở rộng **timeline lịch năm học**, không biến tuần phụ thành tuần PPCT.
- Vì vậy số tuần chuyên môn vẫn là 37; tổng thời gian quản lý trên Dashboard có thể đạt 39 tuần.
