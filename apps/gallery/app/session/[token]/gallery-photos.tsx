'use client';

import { useEffect, useRef, useState } from 'react';
import DownloadLink from './download-link';

type GalleryPhoto = {
  url: string;
  title: string;
};

export default function GalleryPhotos({ cover, originals }: { cover: GalleryPhoto; originals: GalleryPhoto[] }) {
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  function open(photo: GalleryPhoto, button: HTMLButtonElement) {
    trigger.current = button;
    setSelected(photo);
  }

  function restoreFocus() {
    setSelected(null);
    trigger.current?.focus();
    trigger.current = null;
  }

  const download = (photo: GalleryPhoto) => photo.url + '?download=1';
  return (
    <>
      <section className="feature" aria-labelledby="print-title">
        <button className="photo-trigger print-preview" type="button" aria-label={`Xem lớn ${cover.title}`} onClick={(event) => open(cover, event.currentTarget)}>
          <img src={cover.url} alt={cover.title} />
        </button>
        <div className="feature-copy">
          <h2 id="print-title">Ảnh photobooth</h2>
          <DownloadLink href={download(cover)} label="Tải ảnh thành phẩm" />
        </div>
      </section>
      <section className="section" aria-labelledby="originals-title">
        <h2 id="originals-title">Ảnh gốc <span>{originals.length}</span></h2>
        <div className="photo-grid">{originals.map((photo) => (
          <figure key={photo.url}>
            <button className="photo-trigger" type="button" aria-label={`Xem lớn ${photo.title}`} onClick={(event) => open(photo, event.currentTarget)}>
              <img src={photo.url} alt={photo.title} loading="lazy" />
            </button>
            <figcaption>
              <span>{photo.title}</span>
              <DownloadLink href={download(photo)} label="Tải ảnh" variant="compact" accessibleLabel={`Tải ${photo.title}`} />
            </figcaption>
          </figure>
        ))}</div>
      </section>
      <dialog
        ref={dialog}
        className="photo-dialog"
        aria-labelledby="photo-dialog-title"
        onClose={restoreFocus}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      >
        {selected && (
          <div className="photo-dialog-panel">
            <header className="photo-dialog-header">
              <h2 id="photo-dialog-title">{selected.title}</h2>
              <button className="photo-close" type="button" autoFocus aria-label="Đóng ảnh" onClick={() => dialog.current?.close()}>
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="photo-dialog-image"><img src={selected.url} alt={selected.title} /></div>
            <div className="photo-dialog-actions">
              <DownloadLink href={download(selected)} label="Tải ảnh này" variant="primary" />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
