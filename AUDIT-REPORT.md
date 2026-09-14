# AUDIT REPORT — v53.3.3 STABLE

Ngày rà soát: 14/09/2026

## Phạm vi nâng cấp
Bản v53.3.3 kế thừa trực tiếp v53.3.2 STABLE. Thay đổi nghiệp vụ duy nhất ở lõi PPCT là nhận diện các nhánh `HĐTN_SHDC`, `HĐTN_SHL` và cách ghi HĐTN tương đương như **một môn HĐTN**, dùng chung chuỗi Tiết PPCT theo lớp. Các môn khác vẫn giữ cơ chế PPCT độc lập theo buổi.

## Tính tương thích dữ liệu
- APP_VERSION / Stable Guard / Service Worker / release manifest đồng bộ `53.3.3`.
- DATA_SCHEMA_VERSION = `5`.
- Migration schema 5 chỉ chạy `renumberStoredSchedulesFrom(1)` để cập nhật lại số PPCT lịch báo giảng cũ theo khóa môn mới; không xóa TKB, PPCT, kế hoạch, sổ điểm hay sổ chủ nhiệm.
- Nhãn hiển thị `HĐTN_SHDC` và `HĐTN_SHL` vẫn được giữ nguyên.

## Kết quả kiểm thử
- PASS: Static audit toàn bộ HTML/CSS/JS và `node --check`.
- PASS: State fixtures.
- PASS: PPCT sáng/chiều môn Toán vẫn độc lập.
- PASS: HĐTN_SHDC + HĐTN_SHL dùng cùng khóa môn HĐTN.
- PASS: HĐTN không tách chuỗi PPCT khi SHDC/SHL nằm khác buổi.
- PASS: Tuần 1: SHDC = PPCT 1, SHL = PPCT 2.
- PASS: Tuần 2 tiếp tục PPCT 3, 4.
- PASS: Homeroom auto-sync fixtures.
- PASS: v53.3.2 quality-patch fixtures tiếp tục qua đầy đủ.

## Kết luận
Bản v53.3.3 đủ điều kiện đóng gói STABLE cho yêu cầu PPCT HĐTN thống nhất.
