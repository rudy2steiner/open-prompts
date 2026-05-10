import { NextResponse } from 'next/server';
import { parseXStatusUrl } from '~/lib/x-import/parse-x-status-url';

export const dynamic = 'force-dynamic';

function safeRequestId() {
  return (
    (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ||
    `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

type FxPhoto = { type?: string; url?: string };
type FxVideo = { type?: string; url?: string; thumbnail_url?: string };
type FxMedia = {
  photos?: FxPhoto[];
  videos?: FxVideo[];
  all?: Array<FxPhoto & FxVideo & { type?: string }>;
};

type FxTweet = {
  url?: string;
  text?: string;
  author?: { screen_name?: string; name?: string };
  media?: FxMedia;
};

type FxResponse = { code?: number; message?: string; tweet?: FxTweet };

function collectImageUrls(media: FxMedia | undefined): string[] {
  const out: string[] = [];
  if (!media) return out;

  if (Array.isArray(media.all)) {
    for (const item of media.all) {
      if (!item) continue;
      if (item.type === 'photo' && item.url) out.push(item.url);
      else if ((item.type === 'video' || item.type === 'gif') && item.thumbnail_url) out.push(item.thumbnail_url);
    }
  }
  if (out.length === 0) {
    for (const p of media.photos ?? []) {
      if (p?.url) out.push(p.url);
    }
    for (const v of media.videos ?? []) {
      if (v?.thumbnail_url) out.push(v.thumbnail_url);
    }
  }
  return Array.from(new Set(out)).slice(0, 8);
}

export async function POST(req: Request) {
  const requestId = safeRequestId();
  const startedAt = Date.now();

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    console.warn('[op:x-import:body]', { requestId, error: 'invalid_json' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    console.info('[op:x-import:reject]', { requestId, reason: 'missing_url' });
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  console.info('[op:x-import:start]', {
    requestId,
    inputChars: url.length,
    inputPreview: url.length > 160 ? `${url.slice(0, 160)}…` : url,
  });

  const parsed = parseXStatusUrl(url);
  if (!parsed) {
    console.info('[op:x-import:parse]', { requestId, ok: false, reason: 'not_tweet_url' });
    return NextResponse.json({ error: 'Not a tweet URL' }, { status: 400 });
  }

  console.info('[op:x-import:parse]', {
    requestId,
    ok: true,
    screenName: parsed.screenName,
    statusId: parsed.statusId,
    isIStatusUrl: parsed.screenName === '_',
  });

  const apiUrl = `https://api.fxtwitter.com/${encodeURIComponent(parsed.screenName)}/status/${parsed.statusId}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  const upstreamStarted = Date.now();
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'open-prompts/x-import/1.0 (+https://github.com/rudy2steiner/open-prompts)',
      },
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } catch (e: unknown) {
    clearTimeout(t);
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[op:x-import:upstream]', {
      requestId,
      ok: false,
      phase: 'fetch',
      elapsedMs: Date.now() - upstreamStarted,
      error: message,
    });
    return NextResponse.json({ error: 'Upstream timeout or network error' }, { status: 502 });
  }
  clearTimeout(t);

  const rawText = await res.text();
  console.info('[op:x-import:upstream]', {
    requestId,
    ok: res.ok,
    httpStatus: res.status,
    bodyChars: rawText.length,
    fetchElapsedMs: Date.now() - upstreamStarted,
  });

  let data: FxResponse;
  try {
    data = JSON.parse(rawText) as FxResponse;
  } catch {
    console.warn('[op:x-import:upstream]', {
      requestId,
      ok: false,
      phase: 'json_parse',
      httpStatus: res.status,
      bodyChars: rawText.length,
      bodyPreview: rawText.length > 200 ? `${rawText.slice(0, 200)}…` : rawText,
    });
    return NextResponse.json({ error: 'Invalid upstream response' }, { status: 502 });
  }

  if (!res.ok) {
    const msg = data.message || `HTTP ${res.status}`;
    console.warn('[op:x-import:fx]', {
      requestId,
      httpStatus: res.status,
      fxCode: data.code,
      message: msg,
    });
    return NextResponse.json({ error: msg }, { status: res.status >= 400 && res.status < 600 ? res.status : 502 });
  }
  if (typeof data.code === 'number' && data.code !== 200) {
    const msg = data.message || 'Tweet unavailable';
    const status = data.code === 404 ? 404 : data.code === 401 ? 403 : 502;
    console.warn('[op:x-import:fx]', {
      requestId,
      httpStatus: res.status,
      fxCode: data.code,
      message: msg,
      responseStatus: status,
    });
    return NextResponse.json({ error: msg }, { status });
  }

  const tweet = data.tweet;
  if (!tweet) {
    console.warn('[op:x-import:fx]', { requestId, reason: 'no_tweet_payload', fxCode: data.code });
    return NextResponse.json({ error: 'No tweet payload' }, { status: 502 });
  }

  const raw = String(tweet.text ?? '').trim();
  const prompt = raw.length > 800 ? `${raw.slice(0, 797)}…` : raw;
  const firstLine = raw.split('\n')[0]?.trim() || raw;
  const titleBase = firstLine.length > 0 ? firstLine : `X ${parsed.statusId}`;
  const title = titleBase.length > 60 ? `${titleBase.slice(0, 57)}…` : titleBase;
  const description = raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;

  const screen = tweet.author?.screen_name;
  const authorHandle = screen ? `@${screen}` : '';

  const imageUrls = collectImageUrls(tweet.media);

  const sourceUrl = tweet.url || url;
  const rawPreview = raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;

  console.info('[op:x-import:result]', {
    requestId,
    result: {
      title,
      description,
      prompt,
      authorHandle,
      sourceUrl,
      imageUrls,
    },
    rawChars: raw.length,
    rawPreview,
    media: {
      hasMedia: Boolean(tweet.media),
      photoCount: tweet.media?.photos?.length ?? 0,
      videoCount: tweet.media?.videos?.length ?? 0,
      allCount: Array.isArray(tweet.media?.all) ? tweet.media!.all!.length : 0,
    },
  });

  console.info('[op:x-import:done]', {
    requestId,
    elapsedMs: Date.now() - startedAt,
    titleChars: title.length,
    descriptionChars: description.length,
    promptChars: prompt.length,
    rawChars: raw.length,
    imageCount: imageUrls.length,
    hasAuthor: Boolean(authorHandle),
    sourceHost: (() => {
      try {
        return new URL(sourceUrl).hostname;
      } catch {
        return null;
      }
    })(),
  });

  return NextResponse.json({
    ok: true,
    title,
    description,
    prompt,
    authorHandle,
    sourceUrl,
    imageUrls,
  });
}
