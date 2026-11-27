import { redirect } from 'next/navigation';

export default function Home() {
  const demoToken = process.env.GALLERY_DEMO_TOKEN;
  if (process.env.NODE_ENV === 'development' && demoToken && /^[A-Za-z0-9_-]{32}$/.test(demoToken)) {
    redirect(`/session/${demoToken}`);
  }
  return <main className="shell"><div className="notice"><h1>Ảnh từ buổi chụp của bạn</h1><p>Quét mã QR trên màn hình photobooth để mở album.</p></div></main>;
}
