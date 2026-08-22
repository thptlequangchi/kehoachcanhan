# AUDIT REPORT — v50.3.0 Khử trùng lặp Nhắc việc & Gợi ý

## Phạm vi
- Nền trực tiếp: v50.2.0.
- APP_VERSION / Service Worker: `50.3.0`.
- DATA_SCHEMA_VERSION: giữ nguyên `1`.
- Không thay đổi Firestore Rules hay IndexedDB schema.

## Sửa UX chính
- Gợi ý `urgent/high` được quản lý tại **Nhắc việc thông minh**.
- **Hệ thống gợi ý** loại các `sourceKey` đã do Reminder quản lý.
- Nếu không còn gợi ý bổ sung, `workSuggestionPanel` tự ẩn hoàn toàn.
- Gợi ý `normal` vẫn có thể xuất hiện ở Hệ thống gợi ý, nên hai khu vực vẫn có vai trò riêng thay vì xóa một chức năng.
- Sửa markup Reminder từng render `alert.detail` hai lần.

## Kiểm tra tĩnh
- HTML ID: **427/427 duy nhất**.
- Tài nguyên nội bộ tham chiếu từ HTML: **46**, không thiếu file.
- Literal DOM refs: **196/196 hợp lệ**.
- Hàm JavaScript có tên: **715/715 duy nhất**.
- Service Worker APP_SHELL: **49 tài nguyên**, không thiếu file.
- Toàn bộ **49/49** app-shell resource trả HTTP 200 trong kiểm thử local.
- Toàn bộ JavaScript nội bộ + Service Worker: **PASS `node --check`**.
- APP_VERSION state / Service Worker: cùng **50.3.0**.

## Guard chống tái phát
- `teacher-data-changed`: **1 listener chung**.
- heartbeat 60 giây: **1 timer chung**.
- PPCT vẫn dùng unified suggestion engine; không tái tạo `buildPpctAlerts()`.
- Có `getSmartReminderManagedSuggestionKeys()`.
- `buildSystemAlerts()` lọc qua `isSystemSuggestionReminderWorthy()`.
- `renderWorkSuggestions()` loại key do Reminder quản lý.
- `alert.detail` chỉ có một dòng markup trong Reminder item.
- Regression Test có thêm case **Nhắc việc không lặp Hệ thống gợi ý**.

## Fixture nghiệp vụ
- Năm học: PASS.
- Kế hoạch: PASS.
- TKB: PASS.
- Sổ Công Việc cũ: PASS.
- Lịch báo giảng: PASS.
- final/finalized: PASS.
- PPCT attention: PASS.

## Giới hạn kiểm thử
- Không tuyên bố E2E trình duyệt thật trong container.
- Sau deploy GitHub Pages nên kiểm tra trực tiếp tình huống thiếu Kế hoạch/TKB/LBG và chạy **Kiểm thử hồi quy đầy đủ**.
