# TESTING — v52.5.0

## Bộ kiểm thử đã chạy

### Static audit
- HTML ID duy nhất.
- Tài nguyên HTML và APP_SHELL đầy đủ.
- Literal DOM reference đều tồn tại.
- Không trùng named function.
- Toàn bộ JavaScript và Service Worker qua `node --check`.
- APP_VERSION giữa state và Service Worker đồng bộ `52.5.0`.

### Fixture nghiệp vụ
- 39 tuần lịch: 2 tuần phụ + 37 tuần chính.
- PPCT sáng/chiều độc lập và tiếp nối riêng.
- Sổ điểm tối đa 5 cột TX, kiểm tra điểm và trung bình học kỳ.
- Sổ chủ nhiệm: ngưỡng theo dõi, điểm tuần, vi phạm nghiêm trọng đã xử lý, xu hướng 4 tuần.
- Fixture v52.5: học sinh có vi phạm nghiêm trọng chưa xử lý được xếp đầu Bảng ưu tiên và đủ dữ liệu để hiện trong Bảng Hôm nay.

## Kiểm tra v52.5 riêng
- Có đủ 4 khối: Lịch dạy, Việc cần làm, Học sinh cần chú ý, PPCT.
- `renderHomeroomAttentionCommand()` lấy lại logic Sổ chủ nhiệm, không tạo nguồn dữ liệu song song.
- Bấm học sinh cảnh báo có `bookId + studentId` để mở đúng sổ/lớp và hồ sơ.
- Bảng Hôm nay đăng ký `registerAppDataRefresh`, tự làm mới sau thay đổi dữ liệu.
- Chế độ Tập trung không ẩn `teacherCommandCenter`.
- Responsive 4/2/1 cột.

## Lưu ý
Chưa chạy browser E2E tự động trong môi trường đóng gói; static audit và fixture nghiệp vụ đều PASS.
