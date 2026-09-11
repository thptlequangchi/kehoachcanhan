# TESTING — v53.3.0 STABLE

## Lệnh kiểm tra
```bash
python tests/run-static-audit.py
node tests/run-state-fixtures.js
node tests/run-session-ppct-fixtures.js
```

## Invariant v53.3
- APP_VERSION state = Service Worker = release manifest = `53.3.0`.
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
