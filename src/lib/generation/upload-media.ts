const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function atlasUploadUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const modelBase = /\/api\/v1\/model$/.test(base)
    ? base
    : /\/api$/.test(base)
      ? `${base}/v1/model`
      : `${base}/api/v1/model`;
  return `${modelBase}/uploadMedia`;
}

export function readUploadUrl(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const data = (body as { data?: { download_url?: unknown; url?: unknown } }).data;
  const url = typeof data?.download_url === 'string' ? data.download_url : typeof data?.url === 'string' ? data.url : '';
  return url.startsWith('https://') ? url : null;
}

export function uploadFileError(file: { type: string; size: number }): 'type' | 'size' | null {
  if (!file.type.startsWith('image/')) return 'type';
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) return 'size';
  return null;
}
