# Stable Release Checklist — v53.1

- [x] APP_VERSION đồng bộ state / Service Worker / release manifest.
- [x] JavaScript `node --check`.
- [x] HTML ID và DOM references hợp lệ.
- [x] Service Worker APP_SHELL không thiếu file.
- [x] State fixtures PASS.
- [x] PPCT sáng/chiều session fixtures PASS.
- [x] Lazy feature modules được bảo vệ.
- [x] Safety snapshots 12h / 5 bản.
- [x] Offline sync outbox + reconnect.
- [x] Browser Smoke Suite đóng gói sẵn cho kiểm thử sau triển khai.
- [x] Không migration phá vỡ dữ liệu v52.x.
