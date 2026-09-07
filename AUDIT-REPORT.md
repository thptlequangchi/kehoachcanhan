# AUDIT REPORT — v52.0.0

- JavaScript: 1,118,471 bytes
- CSS: 255,279 bytes
- Mốc nâng cấp: Stable Release + Focus Mode + sticky navigation
- Kết quả: PASS toàn bộ static audit + state fixtures + PPCT sáng/chiều fixtures.

## Kiểm thử

```text
$ python3 tests/run-static-audit.py
PASS: HTML IDs 530/530 unique
PASS: HTML resources 56 present
PASS: DOM refs 198 resolved
PASS: named functions 875/875 unique
PASS: APP_SHELL 59 resources present
PASS: APP_VERSION 52.0.0
PASS: Professional UI + plan revision styles load in safe order
PASS: personal gradebook loaded, private workspace persisted, TX columns capped at 5
PASS: personal homeroom notebook loaded and private workspace persisted
PASS: centralized data-change listeners 1
PASS: centralized minute heartbeat 1
PASS: PPCT uses unified suggestion engine
PASS: Reminder/System Suggestions de-duplicated
PASS: semester forecast uses teacher-confirmed HKI boundary
PASS: progress status shows remaining periods by semester
PASS: academic calendar supports 39 weeks (2 auxiliary + 37 main)
PASS: same-week plan uploads use guarded revision comparison
PASS: all JavaScript node --check
$ node tests/run-state-fixtures.js
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
$ node tests/run-session-ppct-fixtures.js
afternoon profile overrides all PASS
lesson lookup separated by session PASS
exact session beats all fallback across scopes PASS
week 1 ppct restarts by session PASS
week 2 continues each session independently PASS
course key contains session PASS
```
