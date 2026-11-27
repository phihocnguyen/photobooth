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

Khi cắm capture card HDMI có đầu ra UVC, ứng dụng quét nguồn video lúc mở và mỗi 3 giây, tự mở live view ở khung bên trái khi nhận diện card sau khi bạn chọn bố cục và mẫu. Webcam tích hợp không tự bật. Chọn một thiết bị trong ô **Nguồn hình** sẽ mở nguồn đó; cũng có thể bấm **Mở nguồn hình** để dùng webcam và **Tắt nguồn hình** để tắt live view. Để chụp ảnh gốc và dùng flash của máy ảnh, cần nối thêm cáp USB từ máy ảnh tới laptop để gPhoto2 ra lệnh chụp và tải ảnh về. Capture card chỉ cung cấp live view; nếu chỉ có capture card, nút chụp sẽ bị khóa. Nếu gPhoto2 chụp lỗi, app báo lỗi thay vì lưu khung HDMI có giao diện máy ảnh. Webcam thông thường vẫn có thể chụp ảnh trực tiếp. Ảnh và video từ capture card giữ đúng chiều; webcam thông thường được lật gương. Với nguồn video UVC, ứng dụng **tự quay video mỗi buổi chụp** từ lúc bắt đầu đếm ngược đến ảnh cuối ở mức mục tiêu 18 fps, tạo nhịp hình hơi giật kiểu photobooth, không chèn số đếm ngược vào file, và lưu dạng MP4 tại `userData/videos`; ảnh tĩnh vẫn lưu riêng trong `userData/captures`. Trên Linux, các thư mục tương ứng là `~/.config/photobooth/videos` và `~/.config/photobooth/captures`. Bấm **Xem video** ở màn chọn ảnh hoặc chọn bố cục để phát lại trong app.

Ứng dụng có sáu mẫu khung dùng chung cho 1×4, 2×2 và 2×3, cùng bảy mẫu Báo Củ Chi. Màn chọn ảnh tách riêng; sau khi chọn, thư viện template nằm ngay cạnh bản xem trước. Dải ảnh 4-cut (1×4) theo tỷ lệ 2×6 inch, tức 1:3. Mọi bố cục đều xuất thêm một file ảnh ghép hoàn chỉnh.

Ảnh đã chọn hiển thị trên bản xem trước. Khi xác nhận, app lưu từng ảnh đã chọn thành JPEG ở độ phân giải ảnh gốc trong `userData/exports`, theo chế độ màu hoặc trắng đen đã chọn. Với Báo Củ Chi, app xuất thêm một file JPEG trang báo 1944×2790 px trong cùng thư mục. Trang báo được vẽ bằng canvas ở kích thước xuất, kết hợp ảnh gốc; không phóng to ảnh chụp màn hình hay ghép ảnh mẫu độ phân giải thấp. Ảnh gốc không bị thay đổi. Khi cấu hình gallery, màn hình kết thúc hiển thị QR dẫn đến album của đúng buổi chụp. Xem hướng dẫn cài và deploy riêng tại [apps/gallery/README.md](apps/gallery/README.md).

Nhóm Báo Củ Chi có mẫu Bản tin Củ Chi ban đầu và sáu mẫu bổ sung. Mỗi mẫu có bố cục, bài viết và ảnh chụp minh họa riêng, hiển thị cả khi không có mạng. Ở màn xem lại, kéo ảnh trong khung để đổi phần hiển thị trước khi xuất.

Để dùng ảnh có sẵn, chọn bố cục và mẫu rồi bấm **Nạp ảnh từ máy** ngay ở màn đầu. Ứng dụng đọc ảnh JPG, PNG hoặc WebP và lưu JPEG xuất ra trong thư mục `userData/exports`. Nếu muốn mở riêng cửa sổ thử không kích hoạt camera, chạy `npm run test:photos` (hoặc `npm.cmd run test:photos` trong PowerShell).

Ảnh chụp minh họa theo chủ đề từ [Pexels](https://www.pexels.com/license/): [lối làng](https://www.pexels.com/photo/rural-village-path-in-central-vietnam-31635543/), [trái cây ở chợ](https://www.pexels.com/photo/vibrant-array-of-fresh-tropical-fruits-in-market-33530774/), [cà phê phin](https://www.pexels.com/photo/vietnamese-coffee-with-phin-filter-on-a-cafe-table-29181080/), [tán lá](https://www.pexels.com/photo/lush-tropical-foliage-in-vietnam-s-urban-jungle-37285972/), [kênh đồng](https://www.pexels.com/photo/aerial-view-of-lush-vietnamese-countryside-35383501/), [hoàng hôn](https://www.pexels.com/photo/palm-trees-under-orange-sky-at-sunset-2563174/) và [lối tre](https://www.pexels.com/photo/serene-bamboo-pathway-in-vietnamese-hamlet-36622653/).

Ảnh mẫu trong thư viện khung từ [Jimmy Elizarraras](https://www.pexels.com/photo/joyful-female-friendship-portrait-in-studio-28638818/), [Mateus Oliveira](https://www.pexels.com/photo/joyful-friends-posing-together-in-studio-32114208/), [Roberto Hund](https://www.pexels.com/photo/delighted-young-ethnic-girlfriends-standing-together-in-studio-and-laughing-5311824/), [Samson Katt](https://www.pexels.com/photo/joyful-young-ethnic-couple-hugging-while-taking-self-portrait-in-sunlight-5225458/), [Mikhail Nilov](https://www.pexels.com/photo/two-girls-standing-close-to-each-other-8669537/) và [Darina Belonogova](https://www.pexels.com/photo/grayscale-photo-of-two-women-laughing-together-9166745/).

Live view ưu tiên webcam hoặc capture card UVC; khi chỉ nối USB máy ảnh, app lấy các khung preview JPEG qua gPhoto2 nên tốc độ cập nhật chậm hơn video HDMI. Linux có thể tự mount máy ảnh và chiếm cổng USB; app sẽ tự bỏ mount này rồi thử lại lệnh gPhoto2 một lần. In trực tiếp chưa được triển khai. Để chụp bằng gPhoto2, hãy đặt camera ở chế độ có thể chụp từ máy tính và dùng định dạng JPEG.

## Cấu trúc

- `src/main.js`: cửa sổ Electron và IPC
- `src/preload.js`: API giới hạn cho giao diện
- `src/gphoto.js`: lệnh gPhoto2
- `src/renderer/`: giao diện
