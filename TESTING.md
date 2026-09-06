# TESTING — v51.4.0

## Kiểm thử tự động đã chạy
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node tests/run-session-ppct-fixtures.js`
- `node --check` cho toàn bộ JavaScript và Service Worker

## Fixture Sổ điểm cá nhân
- `GRADEBOOK_MAX_REGULAR_COLUMNS = 5`: PASS.
- Sổ mới mặc định 2 cột TX: PASS.
- Số cột TX lớn hơn 5 được chuẩn hóa về 5: PASS.
- Điểm `9,5` chuẩn hóa thành `9.5`: PASS.
- Điểm ngoài 0–10 bị loại: PASS.
- Công thức ĐTB HK với fixture TX/GK/CK: PASS.
- Thiếu một điểm trong cột TX đang dùng thì ĐTB HK chưa tính: PASS.
- Sổ điểm được giữ trong `normalizeYearWorkspace`: PASS.
- Personal Firestore payload có trường `gradebook`: PASS qua static audit.
- Backup/Restore giữ gradebook theo year workspace: PASS qua static audit + normalize fixtures.

## Fixture kế thừa v51.3
- PPCT Buổi chiều riêng ưu tiên hơn bộ `Cả hai buổi`: PASS.
- Tra tên bài cùng số PPCT nhưng khác buổi trả đúng bài: PASS.
- Tuần 1: sáng và chiều đều có thể bắt đầu PPCT 1,2: PASS.
- Tuần 2: mỗi buổi tiếp tục độc lập: PASS.

## Kết quả build v51.4
- HTML IDs: 472/472 unique.
- Named functions: 801/801 unique.
- HTML resources: 51/51 tồn tại.
- Literal DOM refs: 196/196 hợp lệ.
- APP_SHELL: 54/54 tài nguyên tồn tại.
- APP_VERSION: 51.4.0.
- DATA_SCHEMA_VERSION: 2.

## Kiểm thử thực tế nên làm sau deploy
1. Mở Sổ Điểm, tạo `12A2 · Toán · HKI`.
2. Dán khoảng 40 học sinh từ Excel.
3. Thêm TX3, TX4, TX5; xác nhận nút thêm bị khóa khi đã 5 cột.
4. Nhập đủ TX/GK/CK cho một học sinh và đối chiếu ĐTB HK.
5. Thử nhập 10.5 hoặc -1: hệ thống phải xóa điểm không hợp lệ.
6. Xuất Excel và kiểm tra đủ các cột TX đang dùng.
7. Chuyển năm học rồi quay lại: sổ điểm phải tách đúng theo năm học.
8. Nếu dùng tài khoản nhóm, đăng nhập tài khoản khác: không được nhìn thấy Sổ điểm cá nhân của giáo viên này.
