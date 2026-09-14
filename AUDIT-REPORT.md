# AUDIT REPORT — v53.3.5 STABLE

Ngày rà soát: 14/09/2026

## Phạm vi nâng cấp
Bản v53.3.5 kế thừa trực tiếp v53.3.4 STABLE và sửa lỗi thực tế ở **Nề nếp 2026–2027 & gợi ý xếp loại**: sau khi nhập lỗi học sinh, bản ghi có thể không đi vào state đang render/persist nên tổng **Lỗi HK** vẫn bằng 0.

## Nguyên nhân đã xác định
`homeroomActiveBook()` gọi chuẩn hóa workspace và trả về một `book`. Ngay sau đó `homeroomAddStudentEntry()` lại gọi `homeroomEnsureState()`. Hàm chuẩn hóa tạo object workspace mới, vì vậy biến `book` trước đó trở thành tham chiếu cũ. Bản ghi mới được `push` vào object cũ, còn giao diện và Firestore đọc object mới nên không thấy lỗi vừa nhập.

## Khắc phục v53.3.5
- Lấy `data` và `book` từ **cùng một snapshot đã chuẩn hóa** trong luồng thêm ghi nhận học sinh.
- Commit `state.homeroom` và `activeWorkspace.homeroom` trước khi render/persist.
- Bổ sung tương thích cho ghi nhận tự do `type=violation`: vẫn tính vào `Lỗi HK` và `Chưa xử lý`; không tự sinh điểm/hình thức quy chế nếu chưa gắn điều khoản.
- Giữ nguyên toàn bộ bản vá OCR/offline/xóa bền vững của v53.3.4 và PPCT HĐTN của v53.3.3.

## Tương thích dữ liệu
- APP_VERSION / Stable Guard / Service Worker / release manifest đồng bộ `53.3.5`.
- DATA_SCHEMA_VERSION vẫn là `5`; không migration phá dữ liệu.
- Sổ điểm, TKB, PPCT, kế hoạch tuần, Sổ chủ nhiệm, bảng thi đua và dữ liệu cloud cũ được giữ nguyên.

## Kết luận
Bản v53.3.5 đủ điều kiện STABLE khi static audit, fixtures cũ và fixture live-sync mới đều PASS.
