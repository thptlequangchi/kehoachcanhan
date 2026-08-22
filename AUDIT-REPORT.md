# Báo cáo kiểm tra v39.0.0 — Bước 7 Tự động hóa công việc giáo viên

## Phạm vi thay đổi

Bản v39 phát triển trực tiếp trên v38. Không đổi schema dữ liệu. Bổ sung `18-automation-center.js`, giao diện Automation Center, mở rộng tín hiệu Kế hoạch trường và thêm khởi tạo độc lập trong `15-init.js`.

## Kiểm tra đã chạy

- Cú pháp toàn bộ JavaScript: **PASS**.
- Tài nguyên nội bộ HTML/CSS/JS: **21/21 tồn tại**.
- HTML ID: **263/263 duy nhất**, không trùng ID.
- Hàm JavaScript có tên: **401/401 duy nhất**, không khai báo trùng.
- Thứ tự nạp module: `18-automation-center.js` nằm sau các module nghiệp vụ và trước `15-init.js`: **PASS**.
- Automation VM smoke test: **PASS**.
- Ghép một tiết Không học với tiết học bù ở tuần sau: **PASS**.
- Giữ lại đúng tiết Không học chưa được bù: **PASS**.
- Không gợi ý khung học bù thuộc tuần đã chốt: **PASS**.
- Không gợi ý khung TKB đã có tiết: **PASS**.
- Tìm khung trống trong 3 tuần gần nhất: **PASS**.
- Đối chiếu ảnh hưởng Kế hoạch trường với TKB theo ngày/buổi: **PASS**.
- Nhận biết mẫu thực tế “Học sinh ... lao động”, “HS LĐ”, “Tập trung học sinh”: **PASS**.

## Cơ chế an toàn

- Không tự đánh dấu `notTeaching`.
- Không tự tạo/lưu tiết `makeupLesson`.
- Nút “Điền gợi ý” chỉ mở và điền sẵn biểu mẫu học bù; giáo viên phải xác nhận lịch học sinh và nhấn lưu.
- Tuần đã chốt không được dùng làm đích gợi ý học bù.
- Gợi ý khung trống chỉ dựa trên TKB/lịch dạy hiện có của giáo viên; không khẳng định học sinh rảnh.

## Giới hạn kiểm thử

Firebase/Firestore, Gemini và Tesseract cần kiểm thử trực tiếp sau khi deploy với mạng, tài khoản và API key thật. Bước 7 không thay đổi các API/cloud flow này.
