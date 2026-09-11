# TESTING — v53.1.0 STABLE

Bộ kiểm thử phát hành gồm:
1. `python tests/run-static-audit.py` — ID/DOM/resource/Service Worker/version/module wiring/JS syntax.
2. `node tests/run-state-fixtures.js` — normalization, gradebook, homeroom, PPCT, 39 tuần, forecast.
3. `node tests/run-session-ppct-fixtures.js` — PPCT sáng/chiều độc lập và nối tiết riêng.
4. `tests/browser-smoke.html` — kiểm thử trực tiếp trên trình duyệt sau triển khai.

Các invariant v53:
- APP_VERSION state = Service Worker = release manifest = `53.1.0`.
- Lazy modules không chặn luồng khởi động.
- Safety snapshots: 12 giờ, giữ tối đa 5.
- Offline sync outbox không xóa trước khi sync hoàn tất.
- Safe Boot Guard chạy trước các internal script khác.
