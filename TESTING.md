# TESTING — v51.2.0

## Kiểm thử tự động đã chạy
- `python tests/run-static-audit.py`
- `node tests/run-state-fixtures.js`
- `node --check` cho toàn bộ JavaScript và Service Worker
- Parse toàn bộ CSS bằng `tinycss2`
- HTTP local kiểm tra toàn bộ APP_SHELL

## Fixture mới cho lịch điều chỉnh
- Một ô đổi nội dung → `changed`.
- Một ô từ trống thành có nội dung → `added`.
- Một ô từ có nội dung thành trống → `removed`.
- Chọn cập nhật duy nhất một thay đổi → các ô không chọn giữ nguyên.
- Lịch sử điều chỉnh và tên file được giữ qua `normalizePlanWeek`.

## Kiểm thử thực tế nên làm sau deploy
1. Tải ảnh Tuần 1 lần đầu → lưu bình thường.
2. Sửa một nội dung trong ảnh Tuần 1 rồi tải lại → modal so sánh phải mở.
3. Chỉ chọn một thay đổi → sau cập nhật các ô còn lại phải giữ nguyên.
4. Tải lại đúng ảnh hiện tại → báo không có thay đổi.
5. Dùng ảnh OCR kém/có cảnh báo → các dòng `Bỏ` không được chọn mặc định.
6. Nếu Tuần 1 đã có Lịch báo giảng, sau khi đổi ô sáng/chiều liên quan → tuần phải được đánh dấu cần đồng bộ lại đúng các slot ảnh hưởng.

## Kết quả build v51.2
- HTML IDs: 442/442 unique.
- Named functions: 753/753 unique.
- APP_SHELL: 52/52 resource tồn tại và 52/52 HTTP 200 local.
- APP_VERSION: 51.2.0.
- DATA_SCHEMA_VERSION: 1.
