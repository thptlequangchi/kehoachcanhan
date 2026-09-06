# TESTING — v51.3.0

## Kiểm thử tự động đã chạy
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node tests/run-session-ppct-fixtures.js`
- `node --check` cho toàn bộ JavaScript và Service Worker

## Fixture mới cho PPCT sáng / chiều
- Chuẩn hóa `morning / afternoon / all`: PASS.
- ID hồ sơ PPCT khác nhau giữa Buổi sáng và Buổi chiều: PASS.
- Dữ liệu PPCT cũ thiếu `session` tự chuyển thành `all`: PASS.
- PPCT Buổi chiều riêng ưu tiên hơn bộ `Cả hai buổi`: PASS.
- Hồ sơ đúng buổi ưu tiên hơn hồ sơ `all` kể cả khi khác phạm vi lớp/khối: PASS.
- Tra tên bài cùng số PPCT nhưng khác buổi trả đúng bài của từng buổi: PASS.
- Tuần 1, cùng lớp/môn: sáng đánh `1,2`, chiều cũng đánh `1,2`: PASS.
- Tuần 2: mỗi buổi tiếp tục độc lập ở `3`: PASS.
- Khóa lớp–môn của lịch báo giảng chứa buổi, không gộp sáng/chiều: PASS.

## Kiểm thử thực tế nên làm sau deploy
1. TKB có 12A2 Toán cả sáng và chiều.
2. Giữ PPCT cũ ở `Cả hai buổi` hoặc tải PPCT `Buổi sáng`.
3. Tải một PPCT khác cho `12A2 · Toán · Buổi chiều`.
4. Tạo Lịch báo giảng Tuần 1: xác nhận PPCT sáng và chiều đều bắt đầu theo dãy riêng.
5. Tạo Tuần 2: xác nhận mỗi dãy tiếp tục độc lập.
6. Mở Dashboard tiến độ: phải có hai dòng `Toán · Buổi sáng` và `Toán · Buổi chiều`.
7. Mở Báo cáo: bộ lọc môn/buổi phải tách hai lựa chọn và file xuất có cột `Buổi`.

## Kết quả build v51.3
- HTML IDs: 443/443 unique.
- Named functions: 761/761 unique.
- HTML resources: 49/49 tồn tại.
- Literal DOM refs: 196/196 hợp lệ.
- APP_SHELL: 52/52 tài nguyên tồn tại.
- APP_VERSION: 51.3.0.
- DATA_SCHEMA_VERSION: 1.
