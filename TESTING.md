# TESTING — v50.5

## Kiểm thử bắt buộc
1. `python tests/run-static-audit.py`
2. `node tests/run-state-fixtures.js`
3. Sau deploy GitHub Pages: **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ**.

## Fixture mới của v50.5
- Profile PPCT lưu được `semesterOneEndPpct` qua normalize/backup/workspace.
- Tổng PPCT 105/140 vẫn được hiểu là **tổng cả năm**, không tự chia theo Tuần 18.
- Khi profile có `semesterOneEndPpct = 54`, mốc HKI phải là 54; mốc HKII là tiết cuối cả năm.
- PPCT có `Kiểm tra cuối học kỳ I` ở Tiết 52 và `Trả bài` ở Tiết 53 phải gợi ý mốc HKI = 53.
- Khi mới chỉ có gợi ý 53 nhưng chưa xác nhận, `semesterOneTargetPpct` phải vẫn bằng 0 và dự báo học kỳ phải ở trạng thái chưa xác định.
- Dự báo HKI/HKII cũ vẫn PASS khi đã có mốc HKI xác nhận.

Các test không gọi Gemini và không ghi Firestore.
