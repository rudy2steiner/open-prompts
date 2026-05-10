export const runtime = 'nodejs';

function isHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const UA_GENERIC =
  'Mozilla/5.0 (compatible; open-prompts-image-proxy/1.0; +https://github.com/rudy2steiner/open-prompts)';
/** Twimg often 403s without a normal browser UA + twitter referer. */
const UA_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function upstreamRequestHeaders(targetUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    'user-agent': UA_GENERIC,
    accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };
  try {
    const host = new URL(targetUrl).hostname.toLowerCase();
    if (host.endsWith('twimg.com') || host === 'pbs.twimg.com' || host.endsWith('.twimg.com')) {
      headers['user-agent'] = UA_CHROME;
      headers.referer = 'https://twitter.com/';
      headers.origin = 'https://twitter.com';
    }
  } catch {
    // ignore
  }
  return headers;
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
    headers: upstreamRequestHeaders(url),
    cache: 'no-store',
    redirect: 'follow',
  }).catch((e: any) => ({ ok: false, status: 502, statusText: e?.message || 'fetch failed' } as any));

  if (!upstream?.ok) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', status: upstream?.status || 502 }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rawType = upstream.headers.get('content-type') || '';
  const contentTypeLower = rawType.split(';')[0]?.trim().toLowerCase() || '';
  if (contentTypeLower.includes('text/html')) {
    return new Response(JSON.stringify({ error: 'Upstream returned HTML (likely blocked or login wall)' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const contentType = rawType || 'application/octet-stream';
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

