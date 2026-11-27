# Photobooth Gallery

Next.js app dùng cùng repo với Electron. Khách quét QR để xem và tải thành phẩm, toàn bộ ảnh gốc và video MP4 của đúng buổi chụp. Neon chỉ lưu metadata. File nằm trong thư mục riêng của VPS theo cấu trúc:

```text
$GALLERY_MEDIA_DIR/<session-token>/
  photobooth.jpg
  original-01.jpg
  original-02.jpg
  …
  video.mp4
```

## Chạy thử trên cùng máy

1. Chép `apps/gallery/.env.example` thành `apps/gallery/.env.local` và điền `GALLERY_UPLOAD_KEY`.
2. Chép `.env.booth.example` ở gốc repo thành `.env.booth`. Dùng cùng khóa, để `GALLERY_API_URL` và `GALLERY_PUBLIC_URL` đều trỏ tới `http://127.0.0.1:3000`.
3. Mở hai terminal trong thư mục gốc repo.

   ```powershell
   npm.cmd ci --prefix apps/gallery
   npm.cmd run dev --prefix apps/gallery
   ```

   ```powershell
   npm.cmd ci
   npm.cmd run test:photos
   ```

4. Trong chế độ thử, chọn mẫu và bấm **Chọn ảnh thử**. Để chụp bằng camera, chạy app bằng `npm start`. Xác nhận thành phẩm rồi mở URL session từ QR. Muốn quét bằng điện thoại cùng Wi-Fi, chạy Next với `--hostname 0.0.0.0` và dùng địa chỉ LAN của máy cho `GALLERY_PUBLIC_URL`.

Chế độ dev dùng PostgreSQL cục bộ nhúng khi bật `GALLERY_LOCAL_DB=1`. File thử nằm trong `apps/gallery/.gallery-data` nếu chưa đổi `GALLERY_MEDIA_DIR`.

Nếu đã tạo một album mẫu, đặt `GALLERY_DEMO_TOKEN` trong `.env.local` bằng token của album đó để trang chủ bản dev mở thẳng album. Đường dẫn của khách trên bản deploy vẫn lấy từ mã QR của từng buổi chụp.

## Deploy website trên Vercel và API trên VPS

### Website Vercel

Tạo project Vercel với **Root Directory** là `apps/gallery` và framework là Next.js. Đặt:

```dotenv
GALLERY_ROLE=web
GALLERY_API_URL=https://vixoaidanloi.com/photobooth
```

Website đọc JSON phiên chụp từ VPS. Trình duyệt tải ảnh, MP4 và ZIP trực tiếp từ địa chỉ API. Các route lưu trữ được tắt ở chế độ web. Thông tin kết nối Neon và khóa upload chỉ cần cấu hình ở VPS hoặc Electron theo bảng bên dưới.

### API và file trên VPS bằng Docker Compose

Clone repo hoặc cập nhật bằng `git pull --ff-only`, rồi chạy các lệnh sau từ `apps/gallery`:

```bash
sudo install -d -m 0750 -o 1000 -g 1000 /var/lib/photobooth/media
cp -n .env.example .env.local
chmod 600 .env.local
nano .env.local
```

Đặt `DATABASE_URL` và `GALLERY_UPLOAD_KEY` thực tế trong `.env.local`. Compose đọc file này lúc khởi chạy và gắn `/var/lib/photobooth/media` vào container. Container chạy dưới UID/GID `1000:1000` và tự khởi động lại sau khi VPS reboot.

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

API nghe ở `127.0.0.1:3180` trên VPS. Khi cập nhật code, pull repo rồi chạy lại `docker compose up -d --build`. Các file ảnh và video nằm trong thư mục trên VPS nên vẫn còn sau khi thay container.

| Biến | Nơi cấu hình | Giá trị |
| --- | --- | --- |
| `DATABASE_URL` | VPS | Connection string Neon có TLS. Lần kết nối đầu tạo bảng session và bảng file, nên tài khoản cần quyền tạo bảng. |
| `GALLERY_MEDIA_DIR` | VPS | Compose đặt `/data/media` trong container, ánh xạ tới `/var/lib/photobooth/media` trên VPS. |
| `GALLERY_UPLOAD_KEY` | Cả hai | Khóa ngẫu nhiên dài, giống nhau ở VPS và Electron. |
| `GALLERY_RETENTION_DAYS` | VPS | Thời gian khách có thể tải file, mặc định 30 ngày. |
| `GALLERY_API_URL` | Vercel, Electron | `https://vixoaidanloi.com/photobooth`. |
| `GALLERY_PUBLIC_URL` | Electron | `https://photobooth-liard-theta.vercel.app`. Đây là địa chỉ ghi trong QR. |
| `PHOTOBOOTH_FFMPEG` | Electron | Đường dẫn FFmpeg tùy chọn. Khi Electron không hỗ trợ thu H.264 trực tiếp, máy chụp cần FFmpeg có `libx264` để xuất MP4. |

Trong khối HTTPS `server` hiện có của `vixoaidanloi.com`, thêm riêng khối `location` dưới đây. Dấu gạch chéo cuối trong `proxy_pass` để Nginx ánh xạ `/photobooth/api/...` bên ngoài thành `/api/...` bên trong Next.js.

```nginx
location ^~ /photobooth/api/ {
    client_max_body_size 300m;
    proxy_request_buffering off;
    proxy_http_version 1.1;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:3180/api/;
}
```

Sau khi reload Nginx, kiểm tra đường dẫn công khai:

```bash
curl -i https://vixoaidanloi.com/photobooth/api/session/00000000000000000000000000000000
```

API đúng sẽ trả HTTP `404` với JSON `{"error":"Session not found"}`.

Chạy định kỳ `POST http://127.0.0.1:3180/api/booth/cleanup` từ VPS với header `Authorization: Bearer <GALLERY_UPLOAD_KEY>` để dọn file và metadata của tối đa 100 session đã hết hạn mỗi lượt. Lưu khóa trong môi trường của service dọn dẹp. Link hết hạn ngừng phục vụ file ngay cả trước khi lượt dọn chạy.

Electron lưu ảnh, video và hàng đợi vào thư mục `userData`. Khi mất mạng, máy sẽ thử đồng bộ lại mỗi 20 giây, kể cả sau khi mở lại ứng dụng. QR là link chia sẻ riêng của session, nên người nhận link cũng có thể tải file trong thời hạn lưu.

Ảnh chụp từ webcam hoặc máy ảnh USB mang mã session trong tên file cục bộ và được ghi vào danh sách của buổi chụp ngay khi lưu. Bộ đếm trên web tính các ảnh gốc riêng với ảnh thành phẩm và MP4.
