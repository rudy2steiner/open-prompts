export function PromoBanner({ text, href }: { text: string; href?: string }) {
  const banner = text.trim();
  if (!banner) return null;
  const content = href?.trim() ? (
    <a href={href.trim()} className="inline-flex max-w-full items-center gap-1.5 underline-offset-4 hover:underline">
      <span className="truncate">{banner}</span>
    </a>
  ) : banner;
  return (
    <div
      role="status"
      className="sticky top-0 z-[70] flex h-9 shrink-0 items-center justify-center border-b border-[color-mix(in_oklab,var(--amber)_18%,var(--border))] bg-[color-mix(in_oklab,var(--amber)_12%,var(--bg))] px-4 text-center text-sm font-medium text-[var(--text)]"
    >
      {content}
    </div>
  );
}
