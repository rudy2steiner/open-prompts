import { atlasUploadUrl, readUploadUrl, uploadFileError } from '~/lib/generation/upload-media';

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'missing_file' }, { status: 400 });
  const invalid = uploadFileError(file);
  if (invalid) return Response.json({ error: invalid === 'type' ? 'unsupported_type' : 'file_too_large' }, { status: 400 });

  const clientKey = String(form?.get('apiKey') || '').trim();
  const apiKey = clientKey || process.env.ATLASCLOUD_API_KEY || '';
  const baseUrl = process.env.ATLASCLOUD_BASE_URL || '';
  if (!apiKey || !baseUrl) return Response.json({ error: 'upload_unavailable' }, { status: 503 });

  const outbound = new FormData();
  outbound.set('file', file, file.name || 'image');
  const response = await fetch(atlasUploadUrl(baseUrl), {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: outbound,
  }).catch(() => null);
  if (!response?.ok) return Response.json({ error: 'upload_failed' }, { status: 502 });
  const url = readUploadUrl(await response.json().catch(() => null));
  if (!url) return Response.json({ error: 'upload_failed' }, { status: 502 });
  return Response.json({ url });
}
