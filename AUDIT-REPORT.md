# AUDIT REPORT — v43.0.0 Health Check & Diagnostics

## Kiểm tra tĩnh
- Toàn bộ JavaScript nội bộ và `service-worker.js`: **PASS `node --check`**.
- HTML ID: **324/324 duy nhất**, không phát hiện ID trùng.
- Hàm JavaScript có tên: **471/471 duy nhất**, không phát hiện khai báo trùng.
- Tài nguyên nội bộ được tham chiếu từ HTML: **31**, không thiếu file.
- Health Center: toàn bộ ID được `21-health-check.js` tham chiếu đều tồn tại trong HTML.
- App-shell Service Worker: **35 tài nguyên**, không thiếu file.
- Manifest JSON: hợp lệ.
- `APP_VERSION` trong state và Service Worker: cùng **43.0.0**.
- `DATA_SCHEMA_VERSION`: giữ nguyên **1**.
- Thứ tự script cuối: `19-report-center.js` → `20-pwa.js` → `21-health-check.js` → `15-init.js`.
- `00-diagnostics-bootstrap.js` được nạp trước các thư viện CDN để bắt lỗi tài nguyên/khởi động sớm.

## Kiểm tra an toàn dữ liệu
- Health Check mặc định chỉ đọc trạng thái; không tự sửa dữ liệu.
- Không gọi Gemini chỉ để kiểm tra, nên không tiêu hao quota kiểm tra sức khỏe.
- Không tạo Firestore write giả để thử quyền.
- Báo cáo kỹ thuật tự che chuỗi có dạng Gemini API key và không đưa mật khẩu vào báo cáo.
- JSON localStorage lỗi được lưu bản xem trước vào khu cách ly trước khi key lỗi bị bỏ qua.
- Nhật ký kỹ thuật giới hạn tối đa 50 mục.
- Khôi phục an toàn chỉ bật khi có checkpoint hợp lệ và yêu cầu xác nhận; trước khi khôi phục tạo thêm checkpoint khẩn cấp của dữ liệu hiện tại.
- Sao lưu file thành công được ghi thời điểm để Health Center cảnh báo khi lâu chưa backup.

## PWA / triển khai
- Service Worker cache thêm `health-check.css`, `00-diagnostics-bootstrap.js`, `21-health-check.js`.
- Request có `__health` được đi thẳng ra network với `no-store`, nhờ đó Health Check có thể phát hiện file deploy thiếu thay vì bị cache cũ che khuất.
- Cơ chế cache Gemini/Firestore không thay đổi; request ghi dữ liệu không bị Service Worker cache.

## Giới hạn kiểm thử
- Firebase/Auth/Firestore thực tế còn phụ thuộc tài khoản và Rules sau khi deploy. Health Center đánh giá trạng thái kết nối/đồng bộ của phiên thật nhưng không tạo write thử nghiệm.
- Gemini thực tế phụ thuộc API key/quota. Health Center dùng trạng thái xác thực hiện có, không gọi API chỉ để test.
- PWA install/persistent storage phụ thuộc trình duyệt/hệ điều hành.
- Kiểm tra file server sâu chỉ chạy khi người dùng nhấn **Kiểm tra hệ thống** và có mạng.
