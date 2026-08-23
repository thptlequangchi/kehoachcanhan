# AUDIT REPORT — v50.5.0 Mốc HKI do giáo viên xác nhận

## Phạm vi
- Nền trực tiếp: v50.4.0.
- APP_VERSION / Service Worker: `50.5.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên.
- Không thay Firestore Rules hay IndexedDB schema.

## Logic nghiệp vụ mới
- Số tiết PPCT lớn nhất, ví dụ **105/140**, được hiểu là **tổng số tiết cả năm học**.
- Mốc kết thúc HKI không còn suy từ `sourceWeek <= 18`.
- Mỗi profile PPCT có trường tùy chọn `semesterOneEndPpct` do giáo viên xác nhận.
- HKI: target = `semesterOneEndPpct`.
- HKII: target = tiết PPCT cuối cả năm; số tiết HKII = tổng năm - mốc HKI.
- Nếu chưa xác nhận mốc HKI, hệ thống không đưa ra dự báo học kỳ để tránh dùng một phép chia sai giữa hai học kỳ.

## Gợi ý mốc HKI
- Nhận diện “Kiểm tra học kỳ I / Kiểm tra cuối học kỳ I” (cả `kỳ/kì`, số `1` hoặc La Mã `I`).
- Nếu tiết ngay sau bài kiểm tra có tên “Trả bài”, ưu tiên gợi ý tiết trả bài.
- Nếu chính tên tiết trả bài có ghi rõ học kỳ I, ưu tiên trực tiếp tiết đó.
- Gợi ý chỉ được điền sẵn vào ô nhập; **không trở thành mốc chính thức cho đến khi giáo viên bấm `Lưu mốc`**.

## Đồng bộ giao diện / engine
- Phần PPCT hiển thị tổng tiết cả năm, mốc HKI đã xác nhận và số tiết HKII còn lại.
- Bảng Tiến độ hiển thị rõ trường hợp chưa xác nhận mốc HKI và mốc gợi ý nếu có.
- Engine gợi ý / Nhắc việc coi “chưa xác nhận mốc HKI” là một mục cần chú ý.
- Report Center và Hồ sơ tự động mang theo `Mốc HKI xác nhận`, `Gợi ý mốc HKI`, `Mốc cuối HK` và `Dự báo cuối HK`.

## Kiểm tra tĩnh
- JavaScript nội bộ + Service Worker: PASS `node --check`.
- HTML ID: **430/430 duy nhất**.
- Literal DOM refs: **196/196 hợp lệ**.
- Named functions: **729/729 duy nhất**.
- HTML resources: **46**, không thiếu file.
- Service Worker APP_SHELL: **49 tài nguyên**, không thiếu file.
- 49/49 APP_SHELL resource trả HTTP 200 trong kiểm thử local.
- APP_VERSION trong state và Service Worker cùng **50.5.0**.
- `teacher-data-changed`: **1 listener** dùng chung.
- Heartbeat 60 giây: **1 timer** dùng chung.

## Regression / fixture
PASS các fixture nền: năm học, kế hoạch, TKB, Sổ Công Việc legacy, lịch báo giảng, trạng thái chốt, PPCT attention.

PASS fixture mới:
- `semesterOneEndPpct` được giữ qua normalize profile.
- Profile xác nhận HKI = 54 + tổng năm = 89 → target HKI = 54, target cả năm = 89.
- “Kiểm tra cuối học kỳ I” Tiết 52 + “Trả bài” Tiết 53 → gợi ý HKI = 53.
- Chỉ có gợi ý 53 nhưng chưa xác nhận → target HKI vẫn bằng 0, không tự dùng gợi ý để dự báo.
- Mẫu 140 tiết cả năm + mốc HKI 54 → hệ thống đọc đúng total = 140, HKI = 54.
- Công thức dự báo HKI/HKII trước đây vẫn PASS khi đã có mốc xác nhận.

## Giới hạn kiểm thử
- Không tuyên bố đã hoàn tất E2E trình duyệt thật trong môi trường build.
- Sau khi deploy GitHub Pages, nên thử một PPCT thật: tải file → xem mốc gợi ý → bấm `Lưu mốc` → đối chiếu Dashboard ở Tuần 18 và Tuần 19 → chạy Kiểm thử hồi quy đầy đủ.
