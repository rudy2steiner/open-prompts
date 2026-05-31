/** Compact MM-DD for gallery card footers (e.g. `05-07`). */
export function formatGalleryCardDate(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/** Card/footer label for gallery attribution when author handle may be missing. */
export function galleryAuthorLabel(
  item: { authorHandle?: string | null; sourceUrl?: string | null },
  fallback: string,
): string {
  const handle = item.authorHandle?.trim();
  if (handle) return handle.startsWith('@') ? handle : `@${handle}`;

  const source = item.sourceUrl?.trim();
  if (!source) return fallback;

  try {
    const u = new URL(source);
    const host = u.hostname.replace(/^www\./, '');
    const match = u.pathname.match(/^\/([^/]+)\/status\//);
    if ((host === 'x.com' || host === 'twitter.com') && match?.[1] && match[1] !== 'i') {
      return `@${match[1]}`;
    }
    return host;
  } catch {
    return fallback;
  }
}

export function galleryAuthorUrl(item: {
  authorHandle?: string | null;
  sourceUrl?: string | null;
}): string | undefined {
  const source = item.sourceUrl?.trim();
  if (source) return source;

  const handle = item.authorHandle?.trim();
  if (!handle) return undefined;
  const name = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!name) return undefined;
  return `https://x.com/${encodeURIComponent(name)}`;
}
