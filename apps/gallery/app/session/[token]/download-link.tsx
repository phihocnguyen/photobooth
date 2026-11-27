type DownloadLinkProps = {
  href: string;
  label: string;
  accessibleLabel?: string;
  variant?: 'primary' | 'compact';
};

export default function DownloadLink({ href, label, accessibleLabel, variant }: DownloadLinkProps) {
  return (
    <a className={`download-button${variant ? ` download-${variant}` : ''}`} href={href} aria-label={accessibleLabel}>
      <span className="download-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3" />
        </svg>
      </span>
      <span>{label}</span>
    </a>
  );
}
