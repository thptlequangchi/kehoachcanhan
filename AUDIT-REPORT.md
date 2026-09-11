# AUDIT REPORT — v53.2.0 STABLE

**PASS** toàn bộ kiểm tra đóng gói sau nâng cấp Sổ chủ nhiệm theo dự thảo quy chế nề nếp 2026–2027.

## `python tests/run-static-audit.py`

```text
PASS: HTML IDs 582/582 unique
PASS: HTML resources 60 present
PASS: DOM refs 202 resolved
PASS: named functions 961/961 unique
PASS: APP_SHELL 66 resources present
PASS: APP_VERSION 53.2.0
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
PASS: centralized data-change listeners 1
PASS: centralized minute heartbeat 1
PASS: PPCT uses unified suggestion engine
PASS: Reminder/System Suggestions de-duplicated
PASS: semester forecast uses teacher-confirmed HKI boundary
PASS: progress status shows remaining periods by semester
PASS: academic calendar supports 39 weeks (2 auxiliary + 37 main)
PASS: same-week plan uploads use guarded revision comparison
PASS: all JavaScript node --check
```

## `node tests/run-state-fixtures.js`

```text
year PASS
academic calendar 39 weeks PASS
plan PASS
plan revision diff PASS
plan revision selective apply PASS
timetable PASS
work legacy PASS
gradebook max 5 regular columns PASS
gradebook default regular columns PASS
gradebook score validation PASS
gradebook semester average PASS
gradebook incomplete average PASS
gradebook workspace persistence shape PASS
homeroom workspace persistence shape PASS
homeroom organization v53.1 PASS
homeroom regulation catalog v53.2 PASS
homeroom conduct lower one grade v53.2 PASS
homeroom phone second time weak v53.2 PASS
homeroom direct weak violation v53.2 PASS
homeroom class conduct metrics v53.2 PASS
homeroom monitoring thresholds defaults PASS
homeroom frequent behavior monitoring PASS
homeroom serious resolved history PASS
homeroom 4-week improving trend PASS
curriculum boundary persistence PASS
curriculum session normalize PASS
curriculum session target ids PASS
legacy curriculum session fallback PASS
schedule PASS
final status PASS
ppct attention PASS
semester split PASS
semester targets confirmed PASS
semester boundary suggestion PASS
semester remaining status PASS
semester forecast safe PASS
semester forecast risk PASS
semester2 different load PASS
v52.5 today homeroom attention PASS
```

## `node tests/run-session-ppct-fixtures.js`

```text
afternoon profile overrides all PASS
lesson lookup separated by session PASS
exact session beats all fallback across scopes PASS
week 1 ppct restarts by session PASS
week 2 continues each session independently PASS
course key contains session PASS
```

## Phát hành ổn định

- APP_VERSION / Service Worker / release-manifest đều là `53.2.0`.
- Dữ liệu v53.1 về tổ, ban cán sự và chức vụ tùy biến được giữ nguyên.
- Danh mục quy chế 2026–2027 có 48 lỗi chính và nhóm khen thưởng.
- Browser Smoke Suite được đóng gói để chạy sau triển khai.
- Không có migration phá vỡ dữ liệu v53.1/v53.0/v52.x.
- Phần mềm ghi rõ quy chế nguồn hiện là **dự thảo**; kết quả hạnh kiểm/rèn luyện là **gợi ý**, không phải kết luận tự động.
