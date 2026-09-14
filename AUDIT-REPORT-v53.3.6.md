# AUDIT REPORT — v53.3.6 STABLE

Ngày kiểm tra: 14/09/2026

## Mục tiêu nâng cấp
Bổ sung bộ điểm trừ/khen thưởng dành cho GVCN ở phần Theo dõi học sinh, đồng thời tách rõ các mức này khỏi dự thảo quy chế nề nếp chính thức.

## Thay đổi chính
- Thêm 8 mục trừ điểm nội bộ GVCN: bài thu hoạch, nộp chậm, cuộc thi online, nhiệm vụ được giao, chuẩn bị chuyên đề, trực nhật/nhiệm vụ cá nhân và biểu mẫu/minh chứng.
- Thêm 8 mục khen thưởng nội bộ GVCN: văn nghệ, thể thao/CLB/truyền thông, hỗ trợ hoạt động, bài thu hoạch xuất sắc, hoàn thành chương trình online, giải cấp trường, tiến bộ và sáng kiến/hỗ trợ tập thể.
- Các mức điểm là gợi ý mặc định và được phép điều chỉnh trước khi lưu.
- Mục bổ sung được gắn nguồn `Điểm theo dõi nội bộ GVCN`, không được nhận diện là điều khoản chính thức của dự thảo.
- Điểm GVCN được cộng vào điểm nề nếp cá nhân và số lỗi HK; không tự động làm thay đổi bảng thi đua lớp theo quy chế.
- UI đổi nhãn `Điểm quy chế` ở phần theo dõi cá nhân thành `Điểm nề nếp` để phản ánh cả điểm chính thức và điểm GVCN bổ sung.
- Export tách riêng: điểm quy chế chính thức và điểm theo dõi GVCN.

## Kiểm thử
- `node --check`: PASS toàn bộ JavaScript.
- `python tests/run-static-audit.py`: PASS.
- `node tests/run-state-fixtures.js`: PASS.
- `node tests/run-session-ppct-fixtures.js`: PASS.
- `node tests/run-homeroom-autosync-fixtures.js`: PASS.
- `node tests/run-homeroom-live-sync-v53-3-5.js`: PASS.
- `node tests/run-homeroom-supplemental-v53-3-6.js`: PASS.
- `node tests/run-quality-patch-v53-3-2.js`: PASS.
- `node tests/run-ocr-resilience-v53-3-4.js`: PASS.

## Kết luận
v53.3.6 đủ điều kiện STABLE. Không thay đổi schema dữ liệu, không cần migration phá dữ liệu và giữ nguyên toàn bộ chức năng của v53.3.5.
