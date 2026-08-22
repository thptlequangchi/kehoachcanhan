# Sổ Tay Giáo Viên v42.0.0 — Bước 10: PWA & Hiệu năng

Bản v42 phát triển trực tiếp trên v41 Premium UI. Toàn bộ nghiệp vụ, dữ liệu năm học, Firebase, Gemini, OCR, PPCT, lịch báo giảng, Dashboard, Tự động hóa và Báo cáo được giữ nguyên.

## Điểm mới
- Có thể cài website như một ứng dụng trên máy tính/điện thoại khi chạy qua HTTPS (GitHub Pages).
- Thêm Service Worker và bộ nhớ app-shell để mở lại nhanh hơn và dùng được phần lõi khi mạng chập chờn.
- Cache runtime cho các thư viện tĩnh từ jsDelivr, cdnjs và gstatic sau lần tải thành công đầu tiên.
- Hiển thị trạng thái Online / Ngoại tuyến ngay trên header.
- Tự phát hiện phiên bản mới và cho phép bấm **Cập nhật ngay** mà không đụng dữ liệu người dùng.
- Có trung tâm PWA trong **Cài đặt & an toàn**: kiểm tra cập nhật, yêu cầu lưu trữ bền vững, làm mới cache ứng dụng.
- Thêm manifest, icon 192/512, icon maskable và Apple Touch Icon.
- Thêm preconnect tới CDN để cải thiện thời gian tải lần đầu.

## Cập nhật GitHub Pages
Giải nén và chép **toàn bộ** nội dung vào repo: `index.html`, `manifest.webmanifest`, `service-worker.js` và thư mục `assets`.

Sau khi Push, mở website qua HTTPS. Lần đầu trang sẽ cài Service Worker; từ lần sau phần lõi sẽ được cache. Nếu trình duyệt hỗ trợ, nút **Cài ứng dụng** sẽ xuất hiện tự động.

## Lưu ý
- Chế độ ngoại tuyến không thể gọi Gemini/Firestore vì các dịch vụ này cần Internet.
- Dữ liệu local, kế hoạch/TKB/PPCT đã lưu và các chức năng không cần mạng vẫn tiếp tục dùng được.
- Nút **Làm mới ứng dụng** chỉ xóa cache file giao diện/JS, không xóa dữ liệu năm học hay API key.
