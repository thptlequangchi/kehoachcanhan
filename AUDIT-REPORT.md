# AUDIT REPORT — v52.1.0

## Kết quả
- HTML IDs: **530/530 unique**.
- HTML resources: **57** tài nguyên được tham chiếu và đều tồn tại.
- Literal DOM refs: **198/198** hợp lệ.
- Named functions: **882/882 unique**.
- Service Worker APP_SHELL: **60/60** tài nguyên tồn tại.
- APP_VERSION: **52.1.0** đồng bộ giữa state và Service Worker.
- Toàn bộ JavaScript và Service Worker: **PASS `node --check`**.
- PPCT sáng/chiều độc lập: **PASS**.
- 39 tuần năm học: **PASS**.
- Sổ điểm tối đa 5 cột TX: **PASS**.
- Sổ chủ nhiệm/personal workspace: **PASS**.

## Audit riêng Thời khóa biểu v52.1
- Stylesheet `timetable-v52-1.css` được nạp **sau Premium/Pro Workspace** nên có đủ specificity để sửa lỗi hàng chẵn.
- `plan-revision-v51.css` vẫn là stylesheet cuối cùng, giữ nguyên quy tắc hồi quy của bản cũ.
- Selector bảo vệ `tbody tr:nth-child(even) td.period-cell` tồn tại: **PASS**.
- Cột Tiết TKB 1–5 được ép nền xanh/chữ trắng kể cả zebra/hover: **PASS**.
- Sticky cột Tiết TKB trên vùng cuộn ngang: **PASS static audit**.
- Helper tạo preview PPCT từ TKB + PPCT: **PASS**.
- Tooltip `data-tt-detail` được gắn cho ô có tiết học: **PASS**.
- Tooltip ưu tiên Lịch báo giảng không stale, fallback về PPCT đúng buổi: **PASS code-path audit**.
- Nhấp/Enter để sửa ô vẫn giữ nguyên: **PASS code-path audit**.

## Quy mô build
- JavaScript modules: **37** file, 1,125,365 bytes.
- CSS modules: **17** file, 258,989 bytes.
- Không thay đổi DATA_SCHEMA_VERSION/BACKUP schema ở v52.1.

## Lệnh đã chạy
```text
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
```

Tất cả kiểm thử tự động trên đều **PASS**.
