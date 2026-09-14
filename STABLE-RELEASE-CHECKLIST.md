# Stable Release Checklist — v53.3.5

- [x] APP_VERSION đồng bộ state / Service Worker / release manifest = 53.3.5.
- [x] Giữ nguyên dữ liệu và chức năng v53.2.
- [x] Module bảng thi đua v53.3 tải trước `15-init.js`.
- [x] Service Worker cache CSS/JS v53.3.
- [x] Dữ liệu `book.competition` được normalize và persist.
- [x] Công thức tuần PASS fixture.
- [x] Quy tắc tuần giao 2 tháng → tháng sau PASS fixture.
- [x] Công thức tháng PASS fixture.
- [x] Công thức năm PASS fixture.
- [x] Excel có 3 sheet thi đua mới.
- [x] Static audit PASS.
- [x] State fixtures PASS.
- [x] PPCT fixtures PASS.
- [x] Toàn bộ JavaScript `node --check` PASS.

- [x] HĐTN_SHDC / HĐTN_SHL dùng chung chuỗi PPCT HĐTN.
- [x] Migration schema 5 đánh số lại lịch cũ an toàn.

- [x] OCR TKB ngoại tuyến có dựng ô theo tọa độ TSV.
- [x] Cache TKB trắng/nhập tay bị loại và cache ảnh nguồn được xóa cùng TKB.
- [x] Service Worker làm ấm tài nguyên OCR để hỗ trợ mất mạng sau lần tải online.
- [x] Snapshot Firestore cũ không dựng lại dữ liệu local vừa xóa.
- [x] Personal year workspace ghi đè snapshot đầy đủ để xóa map con trên cloud thật sự.
- [x] Fixture v53.3.4 OCR/sync resilience PASS.

- [x] Fixture v53.3.5 live-sync Nề nếp PASS.
- [x] Ghi lỗi học sinh cập nhật ngay Lỗi HK / Chưa xử lý / Điểm quy chế.
