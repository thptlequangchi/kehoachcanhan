# TESTING — v50.7

## Kiểm tra bắt buộc
- `node --check` toàn bộ JavaScript và Service Worker.
- HTML ID không trùng, DOM reference đầy đủ, app-shell không thiếu tài nguyên.
- Fixture nghiệp vụ cũ vẫn PASS.

## Fixture mới v50.7
1. `MAX_SCHOOL_WEEKS = 37`.
2. `MAX_AUXILIARY_WEEKS = 2`.
3. `TOTAL_ACADEMIC_CALENDAR_WEEKS = 39`.
4. Chuỗi lịch có 39 vị trí: hai tuần phụ trước Tuần 1 và Tuần 1–37.
5. Vị trí cuối cùng của Tuần 37 trong timeline là 39.
6. Quy tắc học kỳ vẫn giữ HKI 1–18, HKII 19–37.

## Kiểm tra trên trình duyệt thật
Sau deploy:
- Nhập Thứ 2 của Tuần 1 và bấm **Áp dụng lịch 39 tuần**.
- Xem phần thông tin năm học: phải hiện 2 tuần phụ trước Tuần 1 và Tuần 37 cuối năm.
- Dashboard phải hiển thị đủ 39 ô.
- Nhấn một ô tuần phụ: phải mở Kế hoạch trường, không mở TKB/Lịch báo giảng.
- Chọn Tuần 18 và Tuần 19 ở Tiến độ: ranh giới học kỳ vẫn đúng như trước.
