# Sổ Tay Giáo Viên Pro 52

Bản ổn định sau chuỗi v51.6 → v51.9. Giữ nguyên nền tảng cũ và chưa bổ sung liên thông mới giữa Sổ điểm và Sổ chủ nhiệm.

## Điểm chính

- Sao lưu thường và sao lưu mã hóa bằng mật khẩu.
- Tải XLSX/Mammoth/Tesseract theo nhu cầu.
- Sổ điểm Pro: tối đa 5 TX, dán bảng điểm, Enter xuống dòng, undo, lịch sử, khóa sổ.
- Sổ chủ nhiệm Pro: tìm kiếm, lọc theo dõi, ẩn thông tin riêng tư.
- Chế độ Tập trung: ẩn Dashboard năm học/Tự động hóa/Trợ lý tuần, giữ Tổng quan + các tab chính.
- PPCT buổi sáng/buổi chiều vẫn độc lập như v51.3.

# Sổ Tay Giáo Viên v51.5.0 — Sổ chủ nhiệm cá nhân

Bản v51.5 phát triển trực tiếp từ v51.4 và **giữ nguyên toàn bộ chức năng cũ**: Kế hoạch trường, Thời khóa biểu, PPCT sáng/chiều riêng, Lịch báo giảng, Sổ điểm cá nhân, Công việc Pro, Báo cáo, PWA, IndexedDB và Firestore.

## Nâng cấp chính
Thêm tab **🏫 Sổ Chủ Nhiệm** với ba nhóm dữ liệu dùng chung trong một sổ theo lớp/năm học:

1. **Hồ sơ học sinh**: họ tên, ngày sinh, giới tính, thông tin phụ huynh, số điện thoại, địa chỉ, ghi chú.
2. **Theo dõi học sinh**: chuyên cần, nề nếp, khen thưởng, hỗ trợ và trao đổi phụ huynh; tách theo học kỳ và có trạng thái xử lý.
3. **Nhật ký lớp**: sinh hoạt lớp, họp phụ huynh, hoạt động lớp và ghi chú chung.

Có thể dán danh sách từ Excel hoặc lấy nhanh học sinh từ **Sổ điểm cá nhân** cùng lớp. Sổ chủ nhiệm xuất được Excel 4 sheet và được đưa vào hệ thống Backup/Restore.

## Quyền riêng tư
Sổ điểm và Sổ chủ nhiệm là dữ liệu **cá nhân của giáo viên**. Trong chế độ nhóm, chúng được đồng bộ vào tài liệu cá nhân của tài khoản giáo viên và không ghi vào Kế hoạch trường dùng chung.

## Phiên bản dữ liệu
- APP_VERSION: `51.5.0`
- DATA_SCHEMA_VERSION: `3`
- BACKUP_VERSION: `6`

## Cập nhật lên GitHub Pages
Giải nén và chép **toàn bộ** thư mục v51.5 vào repo, chọn Replace, Commit và Push. Service Worker đã đổi version nên trình duyệt/PWA sẽ nhận cache mới.
