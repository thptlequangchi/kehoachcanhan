# AUDIT REPORT — v50.1.0 Làm sạch & hợp nhất logic

## Phạm vi
- Nền trực tiếp: v50.0.0.
- APP_VERSION / Service Worker: `50.1.0`.
- `DATA_SCHEMA_VERSION`: giữ nguyên.
- Không migration dữ liệu, không đổi Firestore Rules hay IndexedDB schema.

## Các điểm trùng đã xử lý
- Quy tắc trạng thái tuần: Overview / Command Center / Year Dashboard / Work Suggestions → dùng chung `getWeekOperationalStatus()`.
- Quy tắc chốt: dùng chung `isScheduleFinalized()`; hỗ trợ dữ liệu cũ `finalized` nhưng trạng thái chuẩn vẫn là `final`.
- Tiết dạy hôm nay: dùng chung `getTodayTeachingItems()`.
- Công việc chưa hoàn thành: dùng chung `getPendingWorkTasks()`.
- `teacher-data-changed`: từ 8 listener độc lập → 1 dispatcher dùng chung.
- Timer 60 giây: từ 4 timer độc lập → 1 heartbeat dùng chung.
- Áp workspace vào state/runtime: dùng chung `applyYearWorkspaceToRuntime()`.
- Tải Blob: dùng chung `downloadBlobFile()`.
- In Report/Profile: dùng chung `triggerPrintMode()`.
- CSS header responsive: bỏ quy tắc order chồng nhau và `!important` không cần thiết.

## Lỗi đã sửa
- `15-ux.js` từng kiểm tra `meta.status === 'finalized'`, trong khi lịch báo giảng chuẩn lưu `status: 'final'`. Điều này có thể khiến Overview báo “Bản nháp” cho tuần thực tế đã chốt.

## Kiểm tra tĩnh
- HTML ID: **427/427 duy nhất**.
- Literal DOM refs: **196/196 hợp lệ**.
- Hàm JavaScript có tên: **711/711 duy nhất**.
- Tài nguyên HTML nội bộ: **46**, không thiếu.
- Service Worker app-shell: **49 tài nguyên**, không thiếu.
- APP_VERSION state / Service Worker: cùng **50.1.0**.
- JavaScript nội bộ + Service Worker: **PASS `node --check`**.
- `teacher-data-changed`: **1 listener dùng chung**.
- heartbeat 60 giây: **1 timer dùng chung**.

## Fixture nghiệp vụ
- Năm học: PASS.
- Kế hoạch: PASS.
- TKB: PASS.
- Sổ Công Việc legacy: PASS.
- Lịch báo giảng: PASS.
- Quy tắc `final/finalized`: PASS.

## Kiểm tra app-shell local
- **49/49** tài nguyên app-shell trả HTTP 200 qua local HTTP server.

## Giới hạn
Chưa tuyên bố E2E trình duyệt thật trong môi trường build. Sau deploy GitHub Pages nên chạy **Kiểm thử hồi quy đầy đủ** trực tiếp trên trình duyệt/PWA đang sử dụng.
