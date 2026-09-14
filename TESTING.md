# TESTING — v53.3.5 STABLE

## Lệnh kiểm tra
```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
node tests/run-homeroom-autosync-fixtures.js
node tests/run-homeroom-live-sync-v53-3-5.js
node tests/run-quality-patch-v53-3-2.js
node tests/run-ocr-resilience-v53-3-4.js
```

## Invariant v53.3
- APP_VERSION state = Service Worker = release manifest = `53.3.5`.
- Toàn bộ HTML ID duy nhất; tài nguyên HTML và APP_SHELL tồn tại.
- Tất cả JavaScript qua `node --check`.
- Dữ liệu v53.2 được normalize sang cấu trúc có `book.competition` mà không phá dữ liệu cũ.
- Công thức tuần tách các khoản tháng để hạn chế cộng trùng.
- Tuần nằm giữa 2 tháng được tính vào tháng sau.
- Điểm tháng chỉ tính khi có ít nhất một tuần đã lưu và hiển thị rõ số tuần còn thiếu.
- Điểm học kỳ chỉ là tổng hợp tham khảo.
- Điểm năm dùng TB tháng + CSVC + lao động.

## Fixture v53.3
- `homeroom competition persistence v53.3`
- `homeroom competition weekly formula v53.3`
- `homeroom competition month rollover v53.3`
- `homeroom competition monthly formula v53.3`
- `homeroom competition yearly formula v53.3`

## Auto-sync Sổ chủ nhiệm v53.3.1
- Một lỗi quy chế mới phải tăng ngay `Lỗi nề nếp` của học sinh trong học kỳ.
- Điểm quy chế phải thay đổi ngay theo mức của lỗi.
- Học sinh có lỗi phải xuất hiện trong Bảng ưu tiên GVCN ngay cả khi chưa chạm các ngưỡng tần suất cũ.
- Lỗi quy chế âm phải có trạng thái Chưa xử lý/Đã xử lý.
- Điện thoại lần 2 phải kích hoạt gợi ý Yếu theo dự thảo đã nhập vào hệ thống.

## Quality Patch v53.3.2
- Fixture ngoại lệ vắng có phép: -2 / 0 / -0,5 / chỉ 3 ngày đầu.
- Fixture lỗi theo số lượng: đơn giá × số lượng, không bị cap ±100.
- Kiểm tra filter “Có lỗi nề nếp” dùng conduct.violationCount.
- Kiểm tra APP_SHELL chứa đầy đủ module lazy quan trọng.

## v53.3.3 — PPCT HĐTN
- Fixture xác nhận HĐTN_SHDC và HĐTN_SHL dùng cùng khóa môn.
- Fixture xác nhận chuỗi PPCT 1,2 ở tuần 1 và tiếp tục 3,4 ở tuần 2, kể cả SHDC/SHL nằm ở hai buổi khác nhau.
- Các môn thông thường (ví dụ Toán) vẫn giữ PPCT sáng/chiều độc lập như v51.3.

## v53.3.4 — OCR ngoại tuyến & xóa bền vững
- TKB OCR dự phòng phải có bộ dựng không gian `createTimetableDraftFromSpatialOcr`, dùng TSV/tọa độ từ Tesseract để gán chữ vào ô buổi × thứ × tiết.
- TKB trắng và kết quả nhập tay không được cache; xóa TKB phải xóa luôn cache ảnh nguồn.
- Engine nhận dạng = 5 để vô hiệu cache trắng của engine cũ.
- Service Worker phải có cơ chế `WARM_OCR_CACHE` và cache Tesseract worker/core + `vie`/`eng` traineddata.
- Khi local có thay đổi chưa đồng bộ, snapshot Firestore cũ không được áp dụng trở lại.
- Ghi dữ liệu cá nhân Firestore theo snapshot đầy đủ, không deep-merge map TKB, để tuần đã xóa không tồn tại ngầm trên cloud.

## v53.3.5 — Live sync Nề nếp học sinh
- Fixture mô phỏng `normalizeHomeroomWorkspace()` tạo object mới mỗi lần để bắt đúng lỗi stale-reference.
- Sau submit, entry phải tồn tại trong `state.homeroom` và workspace năm học đang hoạt động.
- `Lỗi HK` và `Điểm quy chế` phải cập nhật ngay với lỗi quy chế.
- Vi phạm nhập tự do vẫn tăng `Lỗi HK/Chưa xử lý` nhưng không tự sinh điểm quy chế.
