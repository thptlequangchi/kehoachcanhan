# Sổ Tay Giáo Viên v50.5.0 — Mốc HKI do giáo viên xác nhận

Bản v50.5 phát triển trực tiếp từ v50.4. Toàn bộ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc, Nhắc việc, Dashboard, Báo cáo, IndexedDB, PWA và Regression Test được giữ nguyên.

## Điểm mới
- Quy ước rõ: số **140/105 tiết trong PPCT là tổng số tiết của cả năm học**, gồm cả HKI và HKII.
- Mỗi bộ PPCT có thêm trường **Tiết PPCT kết thúc HKI** do giáo viên xác nhận.
- HKI dùng chính mốc đã xác nhận này để dự báo thiếu/thừa tiết; HKII tự lấy phần còn lại từ mốc HKI đến tiết PPCT cuối cả năm.
- Hệ thống không còn suy mốc HKI từ `sourceWeek <= 18`.
- Tự gợi ý mốc HKI bằng tên bài: ưu tiên **Trả bài kiểm tra học kỳ I / cuối học kỳ I**; nếu không có thì lấy **Kiểm tra học kỳ I / cuối học kỳ I**; nếu tiết ngay sau bài kiểm tra có tên **Trả bài** thì gợi ý tiết đó.
- Gợi ý chỉ được điền sẵn để giáo viên kiểm tra; **không dùng để dự báo cho đến khi bấm “Lưu mốc”**.
- Danh sách PPCT hiển thị: tổng tiết cả năm, mốc HKI đã xác nhận, số tiết HKII còn lại hoặc mốc gợi ý cần xác nhận.
- Dashboard, Engine gợi ý, Nhắc việc, Report Center và Hồ sơ tự động đều nhận biết trường hợp **chưa xác nhận mốc HKI**.

## Cách dùng
1. Chọn Khối/Lớp và Môn trong phần **Phân phối chương trình**.
2. Tải PPCT cả năm như trước.
3. Nhập **Tiết PPCT kết thúc HKI**. Nếu hệ thống tìm được “Kiểm tra học kỳ I” hoặc “Trả bài” phù hợp, số gợi ý sẽ được điền sẵn.
4. Kiểm tra mốc và bấm **💾 Lưu mốc**.
5. Bảng **Tiến độ giảng dạy theo học kỳ** sẽ tính lại dự báo HKI/HKII ngay.

## Nguyên tắc an toàn
- `DATA_SCHEMA_VERSION` giữ nguyên.
- Không thay Firestore Rules hay IndexedDB schema.
- Trường `semesterOneEndPpct` là dữ liệu mở rộng tùy chọn trong từng profile PPCT; dữ liệu cũ vẫn đọc bình thường.
- Nếu chưa xác nhận mốc HKI, hệ thống hiển thị cảnh báo và tạm không đưa ra dự báo học kỳ để tránh ngoại suy sai.
- File sao lưu JSON tiếp tục chứa profile PPCT và mốc HKI đã xác nhận.

## Cập nhật GitHub Pages
Chép toàn bộ gói v50.5 vào repo và Push. Service Worker / APP_VERSION đã tăng lên **50.5.0**. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
