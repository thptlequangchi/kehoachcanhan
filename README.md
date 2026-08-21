# Sổ Tay Giáo Viên v36.0.0 — Bản sửa lỗi toàn diện

Bản này kế thừa v35, không viết lại nghiệp vụ.

## Các lỗi đã sửa

1. Khôi phục `assets/js/config.js` vào đúng thứ tự tải trước `01-state.js`.
   - Đây là lỗi hồi quy do bước tách module: file cấu hình Firebase tồn tại nhưng `index.html` v35 không nạp file này.
2. Gia cố chức năng chọn năm học:
   - selector luôn có năm đang chọn;
   - không lỗi nếu một control chưa tồn tại;
   - lỗi đồng bộ Firestore không còn chặn chuyển năm học cục bộ;
   - chuẩn hóa workspace trước khi render;
   - nếu chuyển năm học lỗi sẽ phục hồi selector và báo nguyên nhân.
3. Gia cố nhận dạng ảnh kế hoạch:
   - kiểm tra dữ liệu trả về trước khi ghi;
   - validate `days` an toàn;
   - chuẩn hóa dữ liệu Gemini/OCR trong lớp bảo vệ lỗi;
   - Tesseract.js dùng danh sách ngôn ngữ `['vie','eng']`;
   - nếu OCR dạng `blocks` lỗi sẽ tự thử lại text-only;
   - lỗi OCR được bọc lại với thông báo rõ hơn;
   - bảng kế hoạch không còn giả định `days` luôn tồn tại.
4. Giữ nguyên fallback Gemini → OCR → nhập thủ công.
5. APP_VERSION = 36.0.0.

## Kiểm tra tĩnh đã chạy

- 19 đường dẫn tài nguyên nội bộ: đầy đủ 19/19.
- 357 hàm có tên: 357 hàm duy nhất, không trùng khai báo.
- Toàn bộ JavaScript: `node --check` đạt.
- 228 DOM id; các tham chiếu thiếu còn lại đều là id được tạo động trong modal hoặc chuỗi selector động.

## Cập nhật GitHub Desktop

Giải nén ZIP, chép `index.html`, `README.md` và nguyên thư mục `assets` vào thư mục repo cũ, chọn Replace, sau đó Commit và Push origin.


## v36.1 - Sửa chọn năm học
- Danh sách năm học được đặt sẵn trong HTML, không còn phụ thuộc hoàn toàn vào JavaScript.
- Nạp `assets/js/config.js` trước các module ứng dụng.
- Khởi tạo danh sách năm học trước Firebase/tài khoản và có fallback nếu module khác lỗi.
- Phiên bản: 36.1.0.
