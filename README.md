# Sổ Tay Giáo Viên v51.4.0 — Sổ điểm cá nhân

Bản v51.4 phát triển trực tiếp từ v51.3 và **giữ nguyên toàn bộ nền cũ**. Nâng cấp chính là thêm **Sổ điểm cá nhân** theo lớp, môn và học kỳ.

## Cách dùng Sổ điểm
1. Mở tab **📒 Sổ Điểm**.
2. Chọn/nhập **Lớp**, **Môn**, **Học kỳ** rồi nhấn **Mở / Tạo sổ**.
3. Thêm học sinh từng người hoặc dùng **📋 Dán danh sách** để dán cột Họ và tên từ Excel.
4. Sổ mặc định có `TX1`, `TX2`. Dùng **＋ Cột TX** để thêm đến tối đa `TX5`; dùng **− Cột TX** để giảm.
5. Nhập điểm TX, GK, CK; ĐTB học kỳ được tính tự động khi đủ dữ liệu.
6. Có thể **Xuất Excel** sổ đang mở.

## Quy tắc điểm
- Điểm hợp lệ: 0–10, tối đa 1 chữ số thập phân.
- ĐTB HK: `(tổng điểm TX + 2×GK + 3×CK) / (số điểm TX + 5)`, làm tròn 1 chữ số thập phân.
- Nếu một trong các cột TX đang dùng, GK hoặc CK còn trống thì ĐTB hiển thị `—`.

## Dữ liệu cá nhân
Sổ điểm được lưu theo **năm học hiện tại** trong workspace cá nhân. Nếu dùng tài khoản nhóm, dữ liệu này chỉ đồng bộ vào vùng riêng của tài khoản giáo viên, không đưa vào Kế hoạch trường dùng chung.

## PPCT sáng / chiều
Chức năng v51.3 vẫn giữ nguyên: PPCT được quản lý theo **lớp + môn + buổi**, nên PPCT buổi chiều không nối tiếp PPCT buổi sáng.

## Triển khai GitHub Pages
Giải nén và chép **toàn bộ** thư mục v51.4 vào repo, chọn Replace, Commit và Push. Service Worker đã tăng lên `51.4.0` nên PWA sẽ nhận bản cập nhật mới.

Sau khi deploy, nên vào **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** một lần.
