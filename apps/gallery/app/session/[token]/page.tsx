import { connection } from 'next/server';
import { isOriginal, validToken } from '../../../lib/sessions.js';
import { loadAlbum } from '../../../lib/gallery-session';
import AutoRefresh from './auto-refresh.js';
import DownloadLink from './download-link';
import GalleryPhotos from './gallery-photos';

const date = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' });

export default async function Session({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const { apiBase, state, album } = await loadAlbum(token);
  if (!album) {
    const expired = state === 'expired';
    const unavailable = state === 'unavailable';
    return <main className="shell"><div className="notice">
      {!expired && validToken(token) && <AutoRefresh />}
      <h1>{expired ? 'Buổi chụp đã hết hạn' : unavailable ? 'Chưa kết nối được album' : 'Chưa tìm thấy buổi chụp'}</h1>
      <p>{expired ? 'Các file của buổi chụp này không còn khả dụng.'
        : unavailable ? 'Trang sẽ tự thử kết nối lại.'
        : 'Kiểm tra lại mã QR. Nếu bạn vừa chụp xong, hãy giữ trang mở để chờ máy đồng bộ.'}</p>
    </div></main>;
  }
  if (!album.ready) {
    return <main className="shell"><div className="notice" role="status">
      <AutoRefresh />
      <span className="pulse" aria-hidden="true" />
      <h1>Đang chuyển ảnh của bạn</h1>
      <p>{album.originalCount ? `Đã nhận ${album.originalCount} ảnh gốc. ` : ''}Trang sẽ tự cập nhật khi ảnh sẵn sàng.</p>
    </div></main>;
  }

  const media = (file: string) => `${apiBase}/api/media/${token}/${file}`;
  const originals = album.files.filter(isOriginal);
  const hasVideo = album.files.includes('video.mp4');
  return (
    <main className="shell">
      <div className="album-header">
        <div><p className="date">{date.format(new Date(album.createdAt))}</p><h1>Buổi chụp của bạn</h1></div>
        <DownloadLink href={media('photobooth.zip')} label="Tải tất cả" variant="primary" />
      </div>
      <GalleryPhotos
        cover={{ url: media('photobooth.jpg'), title: 'Ảnh photobooth' }}
        originals={originals.map((filename, index) => ({ url: media(filename), title: `Ảnh gốc ${index + 1}` }))}
      />
      {hasVideo && <section className="section" aria-labelledby="video-title">
        <h2 id="video-title">Video buổi chụp</h2>
        <video controls playsInline preload="metadata" src={media('video.mp4')} />
        <DownloadLink href={media('video.mp4?download=1')} label="Tải video MP4" />
      </section>}
      <footer>Ảnh có thể tải đến {date.format(new Date(album.expiresAt))}.</footer>
    </main>
  );
}
