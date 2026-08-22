# Regression tests

Có hai lớp kiểm thử:

1. **Trong ứng dụng**: Cài đặt & an toàn → Kiểm thử hồi quy tự động.
2. **Build-time**:
   - `python tests/run-static-audit.py`
   - `node tests/run-state-fixtures.js`

`run-static-audit.py` kiểm tra cú pháp JS, ID HTML, DOM refs, file nội bộ, function trùng, APP_SHELL và version.
`run-state-fixtures.js` chạy fixture thuần cho năm học, Kế hoạch, TKB, Sổ Công Việc và Lịch báo giảng.

Các test không gọi Gemini và không ghi Firestore.
