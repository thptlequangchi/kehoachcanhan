# v47.0.0 — Bước 14: IndexedDB & dữ liệu nhiều năm

## Mục tiêu
Giảm áp lực giới hạn LocalStorage khi Sổ Tay tích lũy nhiều năm, nhưng không phá cách khởi động đồng bộ và không thay đổi schema nghiệp vụ.

## Thay đổi chính
- Storage engine IndexedDB với 4 store: workspaces, recognitionCache, backups, meta.
- Migration tự động v46 → v47 cho năm học, cache nhận dạng và checkpoint.
- Cơ chế hybrid: active year local + toàn bộ năm trong IndexedDB.
- Persistence workspace chuyển qua `persistYearWorkspacesHybrid`.
- Recognition cache dùng IndexedDB khi sẵn sàng, local fallback khi lỗi.
- Restore/Undo và pre-cloud checkpoint hỗ trợ IndexedDB.
- Storage Pro UI + thống kê quota.
- Health Check kiểm tra IndexedDB.
- APP_VERSION / Service Worker → 47.0.0.
- DATA_SCHEMA_VERSION giữ nguyên 1.
