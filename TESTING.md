# TESTING — v53.3.2 STABLE

## Lệnh kiểm tra
```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
node tests/run-homeroom-autosync-fixtures.js
```

## Invariant v53.3
- APP_VERSION state = Service Worker = release manifest = `53.3.2`.
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
