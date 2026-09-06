# Tests

- `run-static-audit.py`: kiểm tra cú pháp JS, ID HTML, DOM refs, file nội bộ, function trùng, APP_SHELL, version, Sổ điểm cá nhân và các guard nghiệp vụ chính.
- `run-state-fixtures.js`: fixture dữ liệu nền, lịch năm học, Kế hoạch, Sổ điểm, lịch báo giảng, PPCT học kỳ và tương thích dữ liệu.
- `run-session-ppct-fixtures.js`: fixture PPCT độc lập Buổi sáng / Buổi chiều, ưu tiên fallback và đánh số PPCT theo buổi.

Chạy từ thư mục gốc:

```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
```
