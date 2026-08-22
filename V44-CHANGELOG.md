# v44.0.0 — Bước 11: Sổ Công Việc Pro

## Mục tiêu
Biến Sổ công việc từ nơi lưu ghi chú/bài soạn/nhiệm vụ thành trung tâm quản lý việc làm hằng ngày của giáo viên, nhưng không tự ý thay đổi dữ liệu nghiệp vụ.

## Thay đổi chính
- `APP_VERSION` → `44.0.0`; `DATA_SCHEMA_VERSION` giữ nguyên.
- Nâng `normalizeWorkItem()` theo hướng tương thích ngược với dữ liệu v43.
- Thêm status, priority, dueTime, recurrence, linkedWeek, className, subject, linkTarget, sourceKey.
- Dashboard công việc theo thời hạn và trạng thái.
- Kanban 4 cột, hỗ trợ kéo-thả đổi trạng thái.
- Recurrence weekly/monthly với chống tạo lượt tiếp theo trùng khi mở lại/hoàn thành lại nhiệm vụ.
- Gợi ý hệ thống từ Kế hoạch/TKB/Lịch báo giảng/học bù/backup; chỉ tạo nhiệm vụ sau khi người dùng xác nhận.
- Checklist “Chuẩn bị tuần mới” chống nhân bản trùng.
- Liên kết 1 chạm sang đúng khu vực nghiệp vụ.
- Cập nhật Firestore Rules template để chấp nhận trường v44 của work item; quyền chủ sở hữu/admin cũ được giữ nguyên.
- Thêm `assets/css/work-pro.css` và cache trong Service Worker v44.

## Không thay đổi
- Schema dữ liệu năm học tổng thể.
- Kế hoạch trường, TKB, PPCT, Lịch báo giảng, học bù.
- Firebase/Auth cấu trúc nhóm, Gemini/OCR.
- Dashboard năm học, Automation Center, Report Center, Health Check.
- Backup/Restore hiện có.
