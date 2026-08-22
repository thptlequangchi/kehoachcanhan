# AUDIT REPORT — v42.0.0 PWA & Hiệu năng

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **307/307 duy nhất**, không phát hiện ID trùng.
- Hàm JavaScript có tên: **450/450 duy nhất**, không phát hiện khai báo trùng.
- Tài nguyên nội bộ được tham chiếu từ HTML: **28**, không thiếu file.
- App-shell Service Worker: **32 tài nguyên**, tất cả tồn tại và trả HTTP 200 trong kiểm thử local.
- Manifest JSON: hợp lệ; đủ icon 192, 512 và maskable 512.
- `APP_VERSION` trong state và Service Worker: cùng **42.0.0**.
- Thứ tự script mới: `19-report-center.js` → `20-pwa.js` → `15-init.js`.

## Kiểm tra an toàn dữ liệu
- `DATA_SCHEMA_VERSION` không thay đổi.
- PWA không xóa/chuyển đổi dữ liệu năm học.
- Nút “Làm mới ứng dụng” chỉ xóa cache có tiền tố `teacher-notebook-app-`; không xóa localStorage/sessionStorage/Firestore.
- Service Worker chỉ cache GET request; không can thiệp request ghi dữ liệu.
- Request API Gemini/Firestore không bị Service Worker cache.

## Kiểm tra GitHub Pages
- `start_url`, `scope`, manifest, Service Worker đều dùng đường dẫn tương đối `./`, phù hợp khi website nằm trong repo con như `/education/`.
- Service Worker chỉ hoạt động trong secure context (HTTPS/localhost); GitHub Pages đáp ứng HTTPS.
- Navigation dùng network-first; khi mất mạng fallback về bản app-shell đã cache.

## Giới hạn cần kiểm tra sau khi deploy
- Nút “Cài ứng dụng” phụ thuộc tiêu chí cài PWA của từng trình duyệt/hệ điều hành.
- Gemini và Firestore vẫn cần Internet.
- CDN runtime chỉ dùng offline sau khi tài nguyên đó đã tải thành công ít nhất một lần.
- Việc cấp “lưu trữ bền vững” do trình duyệt quyết định.
