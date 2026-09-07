# TESTING — v51.5.0

## Kiểm thử tự động đã chạy
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node tests/run-session-ppct-fixtures.js`
- `node --check` cho toàn bộ JavaScript và Service Worker

## Fixture Sổ chủ nhiệm
- `normalizeHomeroomBook`: PASS.
- Sổ giữ đúng danh sách học sinh + ghi nhận theo học kỳ: PASS.
- Vắng không phép chưa xử lý làm học sinh vào nhóm cần theo dõi: PASS.
- Khen thưởng không làm tăng nhóm cần theo dõi: PASS.
- `normalizeYearWorkspace` giữ `homeroom.selectedBookId`: PASS.
- Personal Firestore payload có trường `homeroom`: PASS qua static audit.
- Backup/Restore có `homeroom`: PASS qua static audit.
- Module và stylesheet Sổ chủ nhiệm được nạp trước init / có trong APP_SHELL: PASS.

## Fixture kế thừa
- Sổ điểm tối đa 5 cột TX và công thức ĐTB: PASS.
- PPCT sáng/chiều độc lập: PASS.
- Lịch năm học 39 tuần (2 tuần phụ + 37 tuần chính): PASS.
- So sánh lịch công tác điều chỉnh có selective apply: PASS.

## Kết quả build v51.5
- HTML IDs: 512/512 unique.
- Named functions: 852/852 unique.
- HTML resources: 53/53 tồn tại.
- Literal DOM refs: 196/196 hợp lệ.
- APP_SHELL: 56/56 tài nguyên tồn tại.
- APP_VERSION: 51.5.0.
- DATA_SCHEMA_VERSION: 3.
- BACKUP_VERSION: 6.

## Kiểm thử thực tế nên làm sau deploy
1. Mở **Sổ Chủ Nhiệm**, tạo lớp `12A2`.
2. Nhấn **Lấy DS từ Sổ điểm** và xác nhận không sinh học sinh trùng khi HKI/HKII đều có sổ điểm.
3. Dán danh sách có STT, ngày sinh, giới tính, phụ huynh, SĐT để kiểm tra parser.
4. Ghi một lượt vắng không phép cho học sinh A; KPI “HS cần theo dõi” phải tăng.
5. Đánh dấu ghi nhận đó “Đã xử lý”; KPI cần theo dõi phải giảm nếu học sinh không còn việc chưa xử lý khác.
6. Chuyển HKI ↔ HKII; nhật ký và KPI phải lọc đúng học kỳ.
7. Thêm Sinh hoạt lớp / Họp phụ huynh vào Nhật ký lớp.
8. Xuất Excel và kiểm tra đủ 4 sheet.
9. Chuyển năm học rồi quay lại; Sổ chủ nhiệm phải tách đúng năm.
10. Nếu dùng tài khoản nhóm, đăng nhập tài khoản giáo viên khác và xác nhận không nhìn thấy dữ liệu Sổ chủ nhiệm của giáo viên này.
