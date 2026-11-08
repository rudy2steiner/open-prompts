export function authorizeImageDownload(input: {
  generationOwnerId: string;
  requesterId: string | null;
  isAdmin: boolean;
  status: string;
  images: string[];
  index: number;
}): { ok: true; url: string } | { ok: false; status: 404 } {
  const allowed = input.isAdmin || (input.requesterId != null && input.requesterId === input.generationOwnerId);
  const url = input.images[input.index];
  if (!allowed || input.status !== 'succeeded' || !url) return { ok: false, status: 404 };
  return { ok: true, url };
}

const IMAGE_EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

export function imageDownloadFilename(index: string, contentType: string | null, url: string): string {
  const fromType = IMAGE_EXTENSIONS[(contentType ?? '').split(';')[0].trim().toLowerCase()];
  const fromUrl = /\.(png|jpe?g|webp|gif|avif)$/i.exec(new URL(url).pathname)?.[1].toLowerCase().replace('jpeg', 'jpg');
  return `generation-${index}.${fromType ?? fromUrl ?? 'png'}`;
}
