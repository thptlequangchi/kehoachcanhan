# TESTING — v53.2.0 STABLE

Bộ kiểm thử phát hành gồm:
1. `python tests/run-static-audit.py` — ID/DOM/resource/Service Worker/version/module wiring/JS syntax.
2. `node tests/run-state-fixtures.js` — normalization, gradebook, homeroom, cơ cấu lớp, quy chế nề nếp, PPCT, 39 tuần, forecast.
3. `node tests/run-session-ppct-fixtures.js` — PPCT sáng/chiều độc lập và nối tiết riêng.
4. `tests/browser-smoke.html` — kiểm thử trực tiếp trên trình duyệt sau triển khai.

Các invariant v53.2:
- APP_VERSION state = Service Worker = release manifest = `53.2.0`.
- Danh mục quy chế có 48 lỗi chính và nhóm khen thưởng.
- Vi phạm thuộc quy chế dùng mức điểm cố định, không tự nhân hệ số tái phạm legacy.
- Gợi ý xếp loại xử lý được ngưỡng số lỗi, hạ 1 bậc, lần 2 điện thoại và lỗi trực tiếp mức Yếu.
- Nhật ký nề nếp lớp được lưu trong workspace Sổ chủ nhiệm và tham gia tổng hợp điểm thi đua.
- Dữ liệu v53.1 về tổ/ban cán sự vẫn normalize và hoạt động bình thường.
- Lazy modules không chặn luồng khởi động.
- Safety snapshots: 12 giờ, giữ tối đa 5.
- Offline sync outbox không xóa trước khi sync hoàn tất.
- Safe Boot Guard chạy trước các internal script khác.
