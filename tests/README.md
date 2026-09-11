# Regression tests

Chạy tại thư mục gốc:

```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
node tests/run-homeroom-autosync-fixtures.js
node tests/run-quality-patch-v53-3-2.js
```

`run-state-fixtures.js` kiểm tra cả Sổ điểm v51.4 và **Sổ chủ nhiệm v51.5** trong year workspace; `run-session-ppct-fixtures.js` giữ các fixture PPCT sáng/chiều độc lập của v51.3.

`run-homeroom-autosync-fixtures.js` kiểm tra chuỗi nhập lỗi → ưu tiên GVCN → gợi ý xếp loại. `run-quality-patch-v53-3-2.js` kiểm tra ngoại lệ vắng có phép, lỗi theo số lượng và bộ lọc lỗi nề nếp.
