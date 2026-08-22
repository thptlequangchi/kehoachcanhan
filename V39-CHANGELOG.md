# V39 — Bước 7: Tự động hóa công việc giáo viên

## Mới

- `assets/js/18-automation-center.js`.
- Trung tâm tự động hóa theo tuần.
- Đối chiếu Kế hoạch trường với TKB/Lịch báo giảng.
- Sổ theo dõi Không học ↔ Học bù xuyên tuần.
- Gợi ý khung học bù an toàn theo dữ liệu TKB của giáo viên.
- Điền trước biểu mẫu học bù, không tự lưu.
- Checklist hoàn thiện tuần 6 bước.

## Điều chỉnh

- `APP_VERSION` → `39.0.0`.
- Mở rộng tín hiệu kế hoạch cần kiểm tra với lao động/tập trung học sinh.
- `15-init.js` khởi tạo Automation Center độc lập; lỗi module này không chặn các module khác.

## Không thay đổi

- Schema dữ liệu.
- Firebase/Firestore/Auth.
- Gemini/OCR.
- Cấu trúc Kế hoạch, TKB, PPCT, Lịch báo giảng, backup và Sổ công việc.
