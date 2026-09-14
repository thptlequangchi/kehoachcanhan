# Regression tests

Chạy tại thư mục gốc:

```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
node tests/run-homeroom-autosync-fixtures.js
node tests/run-homeroom-live-sync-v53-3-5.js
node tests/run-quality-patch-v53-3-2.js
```

`run-state-fixtures.js` kiểm tra cả Sổ điểm v51.4 và **Sổ chủ nhiệm v51.5** trong year workspace; `run-session-ppct-fixtures.js` giữ các fixture PPCT sáng/chiều độc lập của v51.3.

`run-homeroom-autosync-fixtures.js` kiểm tra chuỗi nhập lỗi → ưu tiên GVCN → gợi ý xếp loại. `run-quality-patch-v53-3-2.js` kiểm tra ngoại lệ vắng có phép, lỗi theo số lượng và bộ lọc lỗi nề nếp.

`run-session-ppct-fixtures.js` từ v53.3.3 kiểm tra thêm HĐTN_SHDC/HĐTN_SHL dùng chung chuỗi PPCT, kể cả khi nằm khác buổi.

## v53.3.4 OCR & sync resilience
Chạy `node tests/run-ocr-resilience-v53-3-4.js` để kiểm tra wiring OCR tọa độ, cache tự phục hồi, xóa cache cùng TKB, prewarm OCR và khóa snapshot Firestore cũ.

## v53.3.5 Homeroom live sync
Chạy `node tests/run-homeroom-live-sync-v53-3-5.js` để kiểm tra lỗi stale-reference khi thêm vi phạm, cập nhật tức thời Lỗi HK/Điểm quy chế và ghi nhận vi phạm tự do.

## v53.3.6 GVCN supplemental scoring
Chạy `node tests/run-homeroom-supplemental-v53-3-6.js` để kiểm tra danh mục trừ/thưởng GVCN, khả năng chỉnh điểm, cập nhật Lỗi HK/điểm nề nếp và việc không làm sai điểm thi đua lớp theo quy chế.
