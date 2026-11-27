import './styles.css';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';

const displayFont = localFont({
  src: './fonts/fraunces.ttf',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-gallery-display'
});

export const metadata = {
  title: 'Ảnh của bạn | Photobooth Studio',
  robots: { index: false, follow: false }
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={displayFont.variable}>
      <body>
        <header className="topbar"><div className="brand"><span>✦</span> Photobooth Studio</div></header>
        {children}
      </body>
    </html>
  );
}
