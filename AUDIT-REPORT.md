# AUDIT REPORT — Sổ Tay Giáo Viên v51.4.0

## Phạm vi
Bổ sung **Sổ điểm cá nhân** trên nền v51.3, với tối đa 5 cột điểm thường xuyên và lưu dữ liệu riêng theo giáo viên/năm học.

## Kết quả kiểm tra tĩnh
- HTML IDs: **472/472 duy nhất**.
- HTML resources: **51** tài nguyên tham chiếu đều tồn tại.
- Literal DOM refs: **196/196** hợp lệ.
- Named JavaScript functions: **801/801 không trùng tên**.
- Service Worker APP_SHELL: **54** tài nguyên đều tồn tại.
- APP_VERSION state / Service Worker: **51.4.0 / 51.4.0**.
- `teacher-data-changed`: **1** listener dùng chung.
- Heartbeat 60 giây: **1** timer dùng chung.
- Tất cả JavaScript + Service Worker: `node --check` **PASS**.

## Kiểm tra nghiệp vụ Sổ điểm
- Tab/stylesheet/module Sổ điểm được nạp đúng thứ tự: **PASS**.
- Tối đa 5 cột TX: **PASS**.
- Mặc định 2 cột TX: **PASS**.
- Chuẩn hóa điểm 0–10: **PASS**.
- Tính ĐTB HK theo số cột TX đang dùng: **PASS**.
- ĐTB chưa tính khi thiếu điểm bắt buộc: **PASS**.
- Workspace theo năm học có trường `gradebook`: **PASS**.
- Personal Firestore payload có `gradebook`: **PASS**.
- Sổ điểm không nằm trong shared plan payload: **PASS theo kiến trúc hiện tại**.
- Backup version tăng lên 5 và backup cũ vẫn được chấp nhận: **PASS theo normalize logic**.

## Kiểm tra hồi quy PPCT sáng/chiều
- PPCT riêng theo `morning / afternoon / all`: **PASS**.
- PPCT chiều ưu tiên fallback `all`: **PASS**.
- Đánh số PPCT tách theo buổi qua nhiều tuần: **PASS**.
- Khóa lớp–môn của Lịch báo giảng vẫn chứa buổi: **PASS**.

## Bảo vệ dữ liệu / tương thích
- Không xóa dữ liệu cũ khi lên schema 2.
- `normalizeGradebookWorkspace(null)` tạo cấu trúc rỗng an toàn cho năm học cũ.
- Sổ điểm được capture/apply cùng personal year workspace nên chuyển năm học không trộn dữ liệu.
- Firestore Rules hiện tại đã giới hạn `yearWorkspaces/{academicYear}` theo chính `uid`, do đó không cần mở thêm quyền cho Sổ điểm.

## Giới hạn kiểm thử
Đã chạy static audit và fixture nghiệp vụ. Chưa tuyên bố E2E đầy đủ trên Firebase thực tế. Sau deploy nên chạy **Cài đặt → Kiểm thử hồi quy → Kiểm thử đầy đủ** và thử một sổ điểm thật trước khi dùng chính thức.
