# Sổ Tay Giáo Viên Pro 52.3

Bản v52.3 kế thừa trực tiếp v52.2 và bổ sung **điểm rèn luyện tuần, bảng cộng/trừ điểm, hệ số tái phạm và cờ vi phạm nghiêm trọng** trong Sổ chủ nhiệm. Không xóa hay làm lại các module cũ.

## Nền tảng giữ nguyên
- Kế hoạch trường + so sánh/cập nhật lịch công tác.
- TKB sáng/chiều; PPCT tách riêng theo lớp + môn + buổi.
- Lịch báo giảng, tiến độ PPCT, báo cáo.
- Sổ điểm cá nhân tối đa 5 cột TX.
- Sổ chủ nhiệm, công việc, nhắc việc, dashboard, PWA/offline, backup thường và backup có mật khẩu.

## Mới trong v52.3
- Dashboard theo dõi chuyên cần & nề nếp theo từng học kỳ.
- Đếm số lượt vắng CP/KP, tổng vắng, đi muộn, vi phạm và các ghi nhận chưa xử lý của từng học sinh.
- Ngưỡng nhắc theo dõi có thể chỉnh riêng cho từng lớp; mặc định: tổng vắng 3, vắng KP 2, đi muộn 3, vi phạm 2.
- Danh sách ưu tiên tự sắp các học sinh chạm/vượt ngưỡng lên trên; không dùng điểm số ẩn và không tự xếp loại hạnh kiểm.
- Bộ lọc nhanh và badge V/M/VP ngay trong hồ sơ học sinh.
- Excel có thêm sheet `Tần suất cần chú ý`.

## Cập nhật GitHub Pages
Giải nén gói v52.3, chép toàn bộ nội dung vào repo hiện tại và Replace file cũ. Service Worker dùng APP_VERSION `52.3.0` nên cache PWA sẽ chuyển sang bản mới.

## Dữ liệu
v52.2 thêm trường `monitoringThresholds` vào từng Sổ chủ nhiệm nhưng giữ tương thích ngược: sổ cũ tự nhận ngưỡng mặc định khi mở. Không cần nhập lại học sinh hoặc nhật ký. Nên sao lưu trước khi thay file deploy.
