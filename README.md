# Photobooth

Ứng dụng photobooth chạy local bằng Electron và gPhoto2.

## Yêu cầu

- Node.js 20 trở lên
- `gphoto2` có trong `PATH`
- Máy ảnh tương thích gPhoto2, kết nối USB

Trên Ubuntu/Debian, cài gPhoto2 bằng `sudo apt install gphoto2`.

## Chạy ứng dụng

```bash
npm install
npm start
```

`npm run check` kiểm tra cú pháp JavaScript.

Ứng dụng mở toàn màn hình, không có thanh điều hướng hoặc khung cửa sổ. Nhấn `Alt+F4` để đóng trên Linux/Windows.

Lệnh `npm start` dùng `--no-sandbox` vì môi trường Linux hiện tại không hỗ trợ Chromium sandbox. Chỉ mở nội dung local đáng tin cậy trong ứng dụng.

Ứng dụng tự dò camera khi mở và quét lại mỗi 4 giây. Khi cắm USB, bật camera và gPhoto2 nhận diện được máy, nút **Bắt đầu chụp** sẽ tự bật. Có thể bấm **Quét lại camera** để kiểm tra ngay.

Luồng sử dụng: **chọn bố cục → chọn mẫu trong bố cục → live preview → chụp 8 ảnh → chọn ảnh → xem thành phẩm**. Bố cục gồm Báo Củ Chi (1 ảnh), dải 1×4, lưới 2×2 và nhóm 2×3. Mẫu được chọn sau khi chọn bố cục. Màn chọn bố cục xuất hiện trước khi nguồn video được mở. Số lần chụp cố định là 8; mặc định đếm ngược 10 giây và chụp cách nhau 3 giây, có thể sửa hai khoảng thời gian này. Khi chụp, vùng camera mở rộng toàn màn hình. Ảnh gốc được lưu tại thư mục dữ liệu ứng dụng (`userData/captures`).

Khi cắm capture card HDMI có đầu ra UVC, ứng dụng quét nguồn video lúc mở và mỗi 3 giây, tự mở live view ở khung bên trái khi nhận diện card sau khi bạn chọn bố cục và mẫu. Webcam tích hợp không tự bật. Chọn một thiết bị trong ô **Nguồn hình** sẽ mở nguồn đó; cũng có thể bấm **Mở nguồn hình** để dùng webcam và **Tắt nguồn hình** để tắt live view. Để chụp ảnh gốc và dùng flash của máy ảnh, cần nối thêm cáp USB từ máy ảnh tới laptop để gPhoto2 ra lệnh chụp và tải ảnh về. Capture card chỉ cung cấp live view; nếu chỉ có capture card, nút chụp sẽ bị khóa. Nếu gPhoto2 chụp lỗi, app báo lỗi thay vì lưu khung HDMI có giao diện máy ảnh. Webcam thông thường vẫn có thể chụp ảnh trực tiếp. Ảnh và video từ capture card giữ đúng chiều; webcam thông thường được lật gương. Với nguồn video UVC, ứng dụng **tự quay video mỗi buổi chụp** từ lúc bắt đầu đếm ngược đến ảnh cuối ở mức mục tiêu 18 fps, tạo nhịp hình hơi giật kiểu photobooth, không chèn số đếm ngược vào file, và lưu dạng WebM tại `userData/videos`; ảnh tĩnh vẫn lưu riêng trong `userData/captures`. Trên Linux, các thư mục tương ứng là `~/.config/photobooth/videos` và `~/.config/photobooth/captures`. Bấm **Xem video** ở màn chọn ảnh hoặc chọn bố cục để phát lại trong app.

Ứng dụng có 29 template trong 5 nhóm, gồm Báo Củ Chi, 5 mẫu Noel và frame Phong thư đỏ. Màn chọn ảnh tách riêng; sau khi chọn, thư viện template nằm ngay cạnh bản xem trước. Danh sách cuộn được nhưng thanh cuộn được ẩn. Dải ảnh 4-cut (1×4) theo tỷ lệ 2×6 inch, tức 1:3; bản xem trước tương ứng với tỷ lệ file in 600×1800 px ở 300 dpi. Đây là tỷ lệ thiết kế; hiện chỉ Báo Củ Chi được xuất thành trang hoàn chỉnh.

Ảnh đã chọn hiển thị trên bản xem trước. Khi xác nhận, app lưu từng ảnh đã chọn thành JPEG ở độ phân giải ảnh gốc trong `userData/exports`, theo chế độ màu hoặc trắng đen đã chọn. Với Báo Củ Chi, app xuất thêm một file JPEG trang báo 1944×2790 px trong cùng thư mục. Trang báo được vẽ bằng canvas ở kích thước xuất, kết hợp ảnh gốc; không phóng to ảnh chụp màn hình hay ghép ảnh mẫu độ phân giải thấp. Ảnh gốc không bị thay đổi. Màn QR hiện chỉ là minh họa và chưa liên kết tới ảnh. Màn này tự đóng sau 20 giây.

Ảnh tư liệu nhỏ trong trang báo được lưu cục bộ tại `src/renderer/assets/`, nên vẫn hiển thị và xuất được khi không có mạng: [lối vào địa đạo Củ Chi](https://www.pexels.com/photo/cu-chi-tunnels-entrance-in-ho-chi-minh-city-31832778/) (manvinder social), theo [Pexels License](https://www.pexels.com/license/).

Live view ưu tiên webcam hoặc capture card UVC; khi chỉ nối USB máy ảnh, app lấy các khung preview JPEG qua gPhoto2 nên tốc độ cập nhật chậm hơn video HDMI. Linux có thể tự mount máy ảnh và chiếm cổng USB; app sẽ tự bỏ mount này rồi thử lại lệnh gPhoto2 một lần. In trực tiếp và xuất cả dải ảnh có template chưa được triển khai. Để chụp bằng gPhoto2, hãy đặt camera ở chế độ có thể chụp từ máy tính và dùng định dạng JPEG.

## Cấu trúc

- `src/main.js`: cửa sổ Electron và IPC
- `src/preload.js`: API giới hạn cho giao diện
- `src/gphoto.js`: lệnh gPhoto2
- `src/renderer/`: giao diện
