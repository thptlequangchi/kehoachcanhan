# AUDIT REPORT — v53.3.2 STABLE

## Kết luận

Bản v53.3.2 là Quality Patch trên nền v53.3.1. Không có migration phá hủy dữ liệu; entry cũ vẫn được đọc với `quantity=1` và không có ngoại lệ vắng.

## Các điểm đã xử lý

- Ngoại lệ vắng có phép theo dự thảo 2026–2027: thông thường -2; Noel 0; lễ tôn giáo có giấy xác nhận -0,5; vắng dài ngày chỉ trừ 3 ngày đầu.
- Lỗi/khen thưởng theo số lượng hỗ trợ `đơn giá × số lượng` cho loại/lá/ngày/tuần/tiết mục.
- Bộ lọc “Có lỗi nề nếp” đồng bộ với `conduct.violationCount`.
- Bảng thi đua tách số ghi nhận học sinh và tập thể.
- Service Worker precache toàn bộ module lazy quan trọng để có thể mở offline ngay sau lần tải đầu.
- Hồ sơ mới mặc định năm học 2026–2027.
- APP_VERSION / Stable Guard / Service Worker / release manifest đồng bộ 53.3.2.

## Regression

PASS: HTML IDs 617/617 unique
PASS: HTML resources 62 present
PASS: DOM refs 202 resolved
PASS: named functions 1013/1013 unique
PASS: APP_SHELL 74 resources present
PASS: APP_VERSION 53.3.2
PASS: Professional UI + timetable v52.1 + plan revision styles load in safe order
PASS: timetable periods 1–5 protected from zebra/hover overrides and PPCT tooltip wired
PASS: personal gradebook loaded, private workspace persisted, TX columns capped at 5
PASS: personal homeroom notebook loaded and private workspace persisted
PASS: homeroom v52.2 frequency monitoring thresholds + dashboard wired
PASS: homeroom v52.3 weekly conduct points + repeat multiplier + critical flag wired
PASS: homeroom v52.4 resolved-serious history + 4-week trends + GVCN priority wired
PASS: v52.5 Today command center + homeroom attention + focus-mode wiring
PASS: v52.6 optional feature modules load on demand/idle
PASS: v52.7 browser smoke suite + launcher wired
PASS: v52.8 automatic 12h safety snapshots + restore controls wired
PASS: v52.9 offline sync outbox + automatic reconnect flush wired
PASS: v53.0 STABLE safe-boot guard + release manifest wired
PASS: v53.1 homeroom groups + class officers + multi-role organization wired
PASS: v53.2 regulation catalog + conduct assessment + class conduct tracking wired
PASS: v53.3 weekly/monthly/year competition board + persistence wired
PASS: centralized data-change listeners 1
PASS: centralized minute heartbeat 1
PASS: PPCT uses unified suggestion engine
PASS: Reminder/System Suggestions de-duplicated
PASS: semester forecast uses teacher-confirmed HKI boundary
PASS: progress status shows remaining periods by semester
PASS: academic calendar supports 39 weeks (2 auxiliary + 37 main)
PASS: same-week plan uploads use guarded revision comparison
PASS: all JavaScript node --check

## Fixture chuyên biệt v53.3.2

- Vắng có phép thông thường = -2: PASS.
- Noel = 0: PASS.
- Lễ tôn giáo có giấy xác nhận = -0,5: PASS.
- Vắng dài ngày từ ngày thứ 4 = 0: PASS.
- 6 tuần × -20 = -120, không bị giới hạn sai ở -100: PASS.
- 3 tiết mục × +50 = +150: PASS.
- Filter “Có lỗi nề nếp” dựa trên số lỗi quy chế học kỳ: PASS.
