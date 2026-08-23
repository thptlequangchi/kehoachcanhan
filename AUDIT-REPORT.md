# AUDIT REPORT — v50.4.0 Dự báo tiến độ theo học kỳ

## Phạm vi
- Nền trực tiếp: v50.3.0.
- APP_VERSION / Service Worker: `50.4.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên.
- Không thay Firestore Rules hay IndexedDB schema.

## Logic mới
- Học kỳ I: Tuần 1–18.
- Học kỳ II: Tuần 19–37.
- Mốc HKI lấy từ **tiết PPCT lớn nhất có `sourceWeek <= 18`** của từng lớp–môn.
- Mốc HKII lấy từ tiết PPCT cuối năm của chính lớp–môn đó.
- Nhịp dự báo ưu tiên 4 tuần gần nhất trong học kỳ hiện tại; nếu chưa có nhịp thực tế thì dùng nhịp kế hoạch của học kỳ làm fallback.
- Dự báo rủi ro chuyển từ “vượt Tuần 37” sang **số tiết dự kiến còn thiếu tại cuối học kỳ hiện tại**.

## Kiểm tra tĩnh
- JavaScript nội bộ + Service Worker: PASS `node --check`.
- HTML ID: **427/427 duy nhất**.
- Literal DOM refs: **196/196 hợp lệ**.
- Named functions: **718/718 duy nhất**.
- HTML resources: **46**, không thiếu file.
- Service Worker APP_SHELL: **49 tài nguyên**, không thiếu file.
- 49/49 APP_SHELL resource trả HTTP 200 trong kiểm thử local.
- APP_VERSION trong state và Service Worker cùng **50.4.0**.
- `teacher-data-changed`: 1 listener dùng chung.
- Heartbeat 60 giây: 1 timer dùng chung.

## Regression fixtures
PASS các fixture cũ: năm học, kế hoạch, TKB, Sổ Công Việc legacy, lịch báo giảng, trạng thái chốt, PPCT attention.

PASS fixture mới:
- Tuần 18 → HKI; Tuần 19 → HKII.
- PPCT mẫu: tiết 54 ở Tuần 18 và tiết 89 ở Tuần 37 → mốc HKI = 54, tổng năm = 89.
- HKI an toàn: Tuần 10, thực tế 28, mốc 52, nhịp 3 tiết/tuần → xong Tuần 18.
- HKI rủi ro: Tuần 10, thực tế 28, mốc 54, nhịp 3 tiết/tuần → thiếu 2 tiết ở Tuần 18.
- HKII tải khác HKI: Tuần 25, thực tế 65, mốc 89, nhịp 1,5 tiết/tuần → thiếu 6 tiết ở Tuần 37.

## Phạm vi giao diện được cập nhật
- Tiến độ giảng dạy theo học kỳ.
- Dashboard / Trợ lý tuần / Engine gợi ý dùng `forecastLabel` mới.
- Báo cáo và Hồ sơ tự động thêm mốc cuối HK và dự báo cuối HK.
- Excel tiến độ thêm Học kỳ, Mốc cuối HK, Dự báo cuối HK, Thiếu dự kiến.

## Giới hạn kiểm thử
- Không tuyên bố đã hoàn tất E2E trên trình duyệt thật trong môi trường build.
- Sau khi deploy GitHub Pages, nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** và đối chiếu một lớp có PPCT khác tải tiết giữa HKI/HKII.
