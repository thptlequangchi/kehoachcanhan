# TESTING — v50.6

## Kiểm tra bắt buộc
- `node --check` toàn bộ JS và Service Worker.
- HTML ID không trùng, DOM reference đầy đủ, app-shell không thiếu tài nguyên.
- Fixture nghiệp vụ cũ vẫn PASS.

## Fixture mới v50.6
1. 140 tiết cả năm, HKI kết thúc tiết 54, đã học 28 → **Còn 26 tiết HKI**.
2. Sang HKII, 140 tiết cả năm, đã học 80 → **Còn 60 tiết đến hết năm**.
3. HKI chưa xác nhận mốc → **Chưa xác nhận mốc HKI** và không tự suy đoán số còn lại.
4. Dự báo nhanh/chậm/thiếu cuối học kỳ vẫn dùng `forecastState`/`forecastShortfall` và không bị thay đổi bởi nhãn Trạng thái mới.

## Kiểm tra trên trình duyệt thật
Sau deploy, chọn một lớp có PPCT đã xác nhận mốc HKI; mở bảng Tiến độ ở một tuần HKI và một tuần HKII để đối chiếu trực tiếp số tiết còn lại.
