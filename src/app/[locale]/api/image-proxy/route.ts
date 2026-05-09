export const runtime = 'nodejs';

function isHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = String(searchParams.get('url') || '').trim();
  if (!url || !isHttpUrl(url)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid url' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Best-effort proxy for hotlink-protected images.
  // If the upstream still requires auth/signatures, this will still fail.
  const upstream = await fetch(url, {
    headers: {
      // Some hosts block requests with no/unknown UA.
      'user-agent': 'open-prompts-image-proxy/1.0',
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    cache: 'no-store',
  }).catch((e: any) => ({ ok: false, status: 502, statusText: e?.message || 'fetch failed' } as any));

  if (!upstream?.ok) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', status: upstream?.status || 502 }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const buf = await upstream.arrayBuffer();

  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': contentType,
      // Cache a bit to reduce repeated upstream hits.
      'cache-control': 'public, max-age=3600',
    },
  });
}

