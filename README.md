# Sổ Tay Giáo Viên v50.4.0 — Dự báo tiến độ theo học kỳ

Bản v50.4 phát triển trực tiếp từ v50.3 và giữ nguyên toàn bộ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Nhắc việc, Dashboard, Báo cáo, IndexedDB, PWA và Regression Test.

## Điểm mới
- Tiến độ PPCT được dự báo theo **học kỳ hiện tại**, không còn lấy tổng tiết cả năm để ngoại suy cho HKI.
- **HKI = Tuần 1–18**: mốc hoàn thành tự lấy **tiết PPCT cuối cùng có nguồn trong HKI**.
- **HKII = Tuần 19–37**: mốc hoàn thành là **tiết PPCT cuối năm**.
- Nhịp dạy ưu tiên 4 tuần gần nhất **trong chính học kỳ đang xét**; nếu đầu học kỳ chưa đủ dữ liệu thực tế thì dùng nhịp kế hoạch của học kỳ làm dự phòng.
- Khi không kịp mốc, hệ thống hiển thị trực tiếp số tiết dự kiến còn thiếu, ví dụ: `HKI: nguy cơ thiếu 2 tiết ở tuần 18`.
- Bảng tiến độ, Dashboard, Trợ lý tuần, Hệ thống gợi ý, Báo cáo, Hồ sơ tự động và Excel đều dùng cùng kết quả dự báo mới.

## Nguyên tắc an toàn
- `DATA_SCHEMA_VERSION` giữ nguyên.
- Không thay Firestore Rules hay IndexedDB schema.
- Không thay cấu trúc dữ liệu Kế hoạch/TKB/PPCT/Lịch báo giảng.
- Có fixture hồi quy cho ranh giới HKI/HKII, mốc PPCT cuối HKI và số tiết thiếu dự kiến.

## Cập nhật GitHub Pages
Chép toàn bộ gói v50.4 vào repo và Push. Service Worker / APP_VERSION đã tăng lên **50.4.0** để PWA nhận đúng mã mới. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
