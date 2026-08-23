# TESTING — v50.4

## Kiểm thử bắt buộc
1. Chạy `python tests/run-static-audit.py`.
2. Chạy `node tests/run-state-fixtures.js`.
3. Sau deploy GitHub Pages, chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ**.

## Fixture mới của v50.4
- Tuần 18 thuộc HKI; Tuần 19 thuộc HKII.
- PPCT mẫu có tiết 54 ở Tuần 18 và tiết 89 ở Tuần 37 phải xác định mốc HKI = 54, cả năm = 89.
- Nếu Tuần 10 đang ở tiết 28, nhịp 3 tiết/tuần và mốc HKI = 52 thì dự kiến hoàn thành đúng Tuần 18.
- Với cùng dữ liệu nhưng mốc HKI = 54 thì phải cảnh báo nguy cơ thiếu 2 tiết ở Tuần 18.

Các test không gọi Gemini và không ghi Firestore.
