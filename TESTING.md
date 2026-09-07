# TESTING — v52.1.0

## Kiểm thử tự động
Chạy:
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node tests/run-session-ppct-fixtures.js`
- `node --check` cho toàn bộ JavaScript và Service Worker

## Kiểm thử riêng Thời khóa biểu v52.1
1. Mở TKB có đủ 5 dòng; cột Tiết TKB phải nhìn rõ **1, 2, 3, 4, 5** ở cả hai buổi.
2. Rê chuột vào `12A2 - Toán` buổi sáng: tooltip phải ghi **PPCT sáng**.
3. Rê chuột vào `12A2 - Toán` buổi chiều: tooltip phải ghi **PPCT chiều** và không cộng nối PPCT sáng.
4. Nếu đã có Lịch báo giảng hợp lệ, tooltip dùng PPCT/tên bài hiện tại của lịch đó.
5. Nếu chưa có Lịch báo giảng, tooltip vẫn suy ra PPCT/tên bài từ PPCT tương ứng.
6. Nhấp ô vẫn mở luồng sửa thủ công như bản cũ.
7. Thu nhỏ màn hình và kéo ngang: cột Tiết TKB phải bám bên trái.
8. Kiểm tra hover hàng chẵn: số Tiết 2/4 không được đổi sang chữ trắng trên nền trắng.

## Hồi quy cần giữ
- PPCT sáng/chiều độc lập.
- 39 tuần năm học (2 tuần phụ + 37 tuần chính).
- Sổ điểm tối đa 5 cột TX.
- Sổ chủ nhiệm và dữ liệu cá nhân.
- Backup/Restore và PWA/offline.
