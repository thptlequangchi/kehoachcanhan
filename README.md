# Sổ Tay Giáo Viên v50.0.0 — Bước 17: Kiểm thử hồi quy tự động

Bản v50 phát triển trực tiếp từ v49.0.0. Toàn bộ Kế hoạch, TKB, PPCT, Lịch báo giảng, Sổ Công Việc Pro, Nhắc việc, Dashboard, Automation, Báo cáo/Hồ sơ, IndexedDB, PWA, Health Check, Liên kết và Ctrl+K được giữ nguyên.

## Điểm mới
- Thêm **Trung tâm Kiểm thử hồi quy tự động** trong **Cài đặt & an toàn**.
- Tự chạy **Kiểm thử nhanh** sau khi ứng dụng khởi động để phát hiện lỗi lõi sau nâng cấp.
- Có **Kiểm thử đầy đủ** theo yêu cầu, kiểm tra thêm LocalStorage tạm, IndexedDB tạm, tài nguyên triển khai, PWA và các module báo cáo/nhắc việc.
- Bộ kiểm thử dùng fixture riêng, không ghi đè Kế hoạch/TKB/PPCT/Lịch báo giảng/Sổ Công Việc thật.
- IndexedDB được kiểm thử bằng database tạm có tên riêng rồi xóa ngay sau phép thử.
- Không tự gọi Gemini, không ghi Firestore và không gửi dữ liệu người dùng ra ngoài.
- Lưu kết quả kiểm thử gần nhất trên máy để đánh dấu **hồi quy mới** khi một test trước đây đạt nhưng lần sau bị lỗi.
- Có nút **Sao chép báo cáo** và **Tải báo cáo JSON** để gửi khi cần phân tích lỗi.
- Ctrl+K có lệnh **Kiểm thử hồi quy**.
- Thêm `tests/run-static-audit.py`, `tests/run-state-fixtures.js` và GitHub Actions `.github/workflows/regression.yml` để tự kiểm tra mỗi lần Push/Pull Request.

## Hai chế độ kiểm thử
### Kiểm thử nhanh
Kiểm tra phiên bản, init, lỗi module, ID giao diện, hàm lõi, quy tắc 37 tuần, normalizer Kế hoạch/TKB/Báo giảng/Sổ Công Việc, state, liên kết và phân quyền giao diện hiện tại.

### Kiểm thử đầy đủ
Bao gồm toàn bộ kiểm thử nhanh và thêm: LocalStorage roundtrip bằng key tạm, IndexedDB roundtrip bằng DB tạm, Storage Pro, backup fixture, tài nguyên nội bộ trên server, Service Worker, Notification API, Report Center, Hồ sơ tự động, Reminder Center và Health Check.

## Cập nhật GitHub Pages
Chép toàn bộ gói vào repo rồi Push. Service Worker v50 sẽ nhận thêm `assets/js/27-regression-tests.js` và `assets/css/regression-test.css`.

## Lưu ý
- Kiểm thử tự động làm giảm mạnh nguy cơ lỗi sau nâng cấp nhưng không thay thế hoàn toàn việc thử một vài luồng thật trên trình duyệt đang dùng.
- Kiểm thử đầy đủ không gọi Gemini/Firestore nên không tốn quota AI và không tạo dữ liệu cloud rác.
