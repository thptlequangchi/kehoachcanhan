# AUDIT REPORT — v53.3.4 STABLE

Ngày rà soát: 14/09/2026

## Phạm vi nâng cấp
Bản v53.3.4 kế thừa trực tiếp v53.3.3 STABLE và tập trung sửa hai lỗi thực tế: **mất mạng thì OCR thời khóa biểu không dựng được ô** và **xóa thời khóa biểu/ảnh nguồn nhưng dữ liệu cũ có thể xuất hiện lại**.

## Nguyên nhân đã xác định
1. OCR dự phòng trước đây chủ yếu giữ transcript văn bản và cố ý không suy đoán giao điểm buổi × thứ × tiết, vì vậy TKB hiển thị trắng dù OCR có thể đã đọc được chữ.
2. Kết quả TKB trắng có thể bị cache theo hash ảnh; lần tải lại cùng ảnh trả ngay cache trắng.
3. Xóa TKB chưa xóa cache nhận dạng tương ứng.
4. Trong lúc local vừa xóa/sửa nhưng chưa ghi xong, snapshot Firestore cũ có thể được áp dụng lại.
5. Dữ liệu cá nhân trước đây ghi bằng `setDoc(..., {merge:true})`; với cấu trúc map theo tuần, việc bỏ một khóa local có nguy cơ không biểu diễn được thao tác xóa trên cloud.

## Khắc phục v53.3.4
- Thêm OCR không gian từ TSV/tọa độ Tesseract để phát hiện hai vùng sáng/chiều, hàng tiết 1–5 và cột Thứ 2–7, rồi gán chữ vào từng ô.
- Bump Recognition Engine lên 5; cache cũ tự hết hiệu lực.
- Không cache TKB trắng hoặc kết quả `manual`; cache vô dụng gặp lại sẽ tự loại.
- Xóa TKB tuần đồng thời quên cache ảnh nguồn ở RAM/IndexedDB/recent recognition.
- Service Worker làm ấm Tesseract main/worker/core cùng `vie` và `eng` traineddata khi online.
- Bổ sung dirty/pending hash cho personal cloud sync để snapshot cũ không ghi đè thay đổi local chưa đồng bộ.
- Personal year workspace được ghi như snapshot đầy đủ thay vì deep-merge, nên tuần đã xóa được xóa thật trên Firestore.

## Tương thích dữ liệu
- APP_VERSION / Stable Guard / Service Worker / release manifest đồng bộ `53.3.4`.
- DATA_SCHEMA_VERSION vẫn là `5`; không có migration phá dữ liệu.
- Toàn bộ thay đổi v53.3.3 về chuỗi PPCT HĐTN được giữ nguyên.
- Dữ liệu TKB, PPCT, kế hoạch, sổ điểm và sổ chủ nhiệm cũ tiếp tục được normalize như trước.

## Kết luận
Bản v53.3.4 đủ điều kiện STABLE sau khi toàn bộ static audit, fixtures cũ và fixture resilience mới đều PASS. Thiết bị mới cần có ít nhất một lần online để tải sẵn runtime/ngôn ngữ OCR trước khi dùng hoàn toàn ngoại tuyến.
