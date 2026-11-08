import type { PromptGalleryItem } from '~/data/promptGallery';

export type PromptDownloadFormat = 'html' | 'zip';
export type PromptDownloadImageMode = 'embedded' | 'links';
export type DownloadImage = { bytes: Uint8Array; contentType: string; extension: string };
export type DownloadAssets = { css: string; js: string };
const encoder = new TextEncoder();
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function mediaUrl(source: string, origin: string): URL {
  const decoded = decodeURIComponent(source);
  if (decoded.includes('\\') || decoded.split(/[/?#]/).includes('..') || source.startsWith('//')) throw new Error('Unsafe image URL');
  const url = new URL(source, origin);
  if (url.username || url.password) throw new Error('Unsafe image URL');
  const local = url.origin === new URL(origin).origin && /^\/(local_images|uploads|images|creation-references|prompt-images|covers)\//.test(url.pathname);
  const twitter = url.protocol === 'https:' && url.hostname === 'pbs.twimg.com' && (!url.port || url.port === '443') && /^\/(media|amplify_video_thumb|tweet_video_thumb|ext_tw_video_thumb)\//.test(url.pathname);
  if (!local && !twitter) throw new Error('Image host or path is not supported for export');
  return url;
}

function imageType(bytes: Uint8Array): { contentType: string; extension: string } {
  const head = Array.from(bytes.subarray(0, 12));
  if (head.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return {contentType: 'image/png', extension: 'png'};
  if (head[0] === 255 && head[1] === 216 && head[2] === 255) return {contentType: 'image/jpeg', extension: 'jpg'};
  const text = new TextDecoder().decode(bytes.subarray(0, 32));
  if (/^GIF8[79]a/.test(text)) return {contentType: 'image/gif', extension: 'gif'};
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return {contentType: 'image/webp', extension: 'webp'};
  if (text.slice(4, 8) === 'ftyp' && /avif|avis/.test(text.slice(8))) return {contentType: 'image/avif', extension: 'avif'};
  throw new Error('Unsupported or invalid image data');
}

export async function loadPromptDownloadImage(source: string, options: {
  origin: string; fetcher?: typeof fetch; signal?: AbortSignal;
}): Promise<DownloadImage> {
  options.signal?.throwIfAborted();
  if (source.startsWith('data:')) {
    if (source.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 64) throw new Error('Image exceeds 20 MB');
    const encoded = source.match(/^data:image\/(?:png|jpeg|gif|webp|avif);base64,([A-Za-z0-9+/]*={0,2})$/)?.[1];
    if (!encoded) throw new Error('Unsupported embedded image');
    const bytes = new Uint8Array(Buffer.from(encoded, 'base64'));
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 20 MB');
    return {bytes, ...imageType(bytes)};
  }
  let url = mediaUrl(source, options.origin);
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await (options.fetcher ?? fetch)(url, {
      signal, redirect: 'manual', cache: 'no-store',
      headers: { accept: 'image/*', 'user-agent': 'Mozilla/5.0', ...(url.hostname === 'pbs.twimg.com' ? {referer: 'https://twitter.com/'} : {}) },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Image redirect has no location');
      url = mediaUrl(new URL(location, url).toString(), options.origin);
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`Image download failed (${response.status})`);
    }
    if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
      await response.body.cancel();
      throw new Error('Image exceeds 20 MB');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 20 MB');
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return {bytes, ...imageType(bytes)};
  }
  throw new Error('Too many image redirects');
}

export function downloadCatalogItems(items: readonly PromptGalleryItem[]) {
  return items.map(item => ({
    id: item.id, title: item.title, model: item.model,
    previewSrc: item.images.find(src => src.trim()) ?? null,
    imageCount: item.images.filter(src => src.trim()).length,
  }));
}

function safeSourceUrl(source: string | undefined): string | undefined {
  if (!source) return undefined;
  try { const url = new URL(source); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined; }
  catch { return undefined; }
}
function json(value: unknown): string { return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
function folderName(item: PromptGalleryItem, index: number): string {
  const title = item.title.normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\.+/g, '-').trim().slice(0, 72) || 'prompt';
  return `${String(index + 1).padStart(4, '0')}-${title}`;
}
const crcTable = Uint32Array.from({length: 256}, (_, n) => {
  let crc = n;
  for (let i = 0; i < 8; i++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]!) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zipHeader(name: Uint8Array, bytes: Uint8Array, offset: number) {
  const crc = crc32(bytes);
  const local = new Uint8Array(30 + name.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true);
  lv.setUint16(12, 0x21, true); lv.setUint32(14, crc, true);
  lv.setUint32(18, bytes.length, true); lv.setUint32(22, bytes.length, true); lv.setUint16(26, name.length, true);
  local.set(name, 30);
  const central = new Uint8Array(46 + name.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true);
  cv.setUint16(14, 0x21, true); cv.setUint32(16, crc, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true);
  cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); central.set(name, 46);
  return {local, central};
}

type DownloadOptions = {
  items: readonly PromptGalleryItem[]; format: PromptDownloadFormat; locale: string;
  imageMode?: PromptDownloadImageMode; origin?: string;
  messages: unknown; assets: DownloadAssets; loadImage: (source: string) => Promise<DownloadImage>;
  onComplete: () => Promise<void>; signal?: AbortSignal;
};
async function imageLink(source: string, origin: string): Promise<string> {
  if (source.startsWith('data:')) {
    await loadPromptDownloadImage(source, {origin});
    return source;
  }
  return mediaUrl(source, origin).href;
}
async function* zip(options: DownloadOptions): AsyncGenerator<Uint8Array> {
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (let index = 0; index < options.items.length; index++) {
    const item = options.items[index]!;
    const folder = folderName(item, index);
    const sources = item.images.filter(src => src.trim());
    const linked = options.imageMode === 'links';
    for (let imageIndex = -1; imageIndex < (linked ? 1 : sources.length); imageIndex++) {
      options.signal?.throwIfAborted();
      const image = imageIndex < 0 || linked ? null : await options.loadImage(sources[imageIndex]!);
      const links = linked && imageIndex === 0 ? await Promise.all(sources.map(source => imageLink(source, options.origin!))) : null;
      const bytes = links ? encoder.encode(links.join('\n') + (links.length ? '\n' : '')) : image ? image.bytes : encoder.encode(item.prompt);
      const name = encoder.encode(`${folder}/${links ? 'images.txt' : image ? `image-${String(imageIndex + 1).padStart(2, '0')}.${image.extension}` : 'prompt.txt'}`);
      if (offset + bytes.length + name.length + 30 > 0xffffffff || directory.length >= 65535) throw new Error('Export exceeds ZIP size limit; select fewer prompts');
      const {local, central} = zipHeader(name, bytes, offset);
      directory.push(central);
      yield local; yield bytes;
      offset += local.length + bytes.length;
    }
  }
  const start = offset;
  for (const central of directory) { yield central; offset += central.length; }
  if (offset > 0xffffffff) throw new Error('Export exceeds ZIP size limit');
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true); view.setUint16(8, directory.length, true); view.setUint16(10, directory.length, true);
  view.setUint32(12, offset - start, true); view.setUint32(16, start, true);
  yield end;
}
async function* html(options: DownloadOptions): AsyncGenerator<Uint8Array> {
  const lang = /^[a-z]{2}$/.test(options.locale) ? options.locale : 'en';
  yield encoder.encode(`<!doctype html><html lang="${lang}" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Open Prompts</title><style>${options.assets.css}</style></head><body><div id="prompt-download-root"></div><script id="prompt-download-data" type="application/json">{"locale":${json(lang)},"messages":${json(options.messages)},"imageMode":${json(options.imageMode ?? 'embedded')},"items":[`);
  for (let index = 0; index < options.items.length; index++) {
    const item = options.items[index]!;
    yield encoder.encode(`${index ? ',' : ''}${json({...item, sourceUrl: safeSourceUrl(item.sourceUrl), images: undefined}).slice(0, -1)},"images":[`);
    const sources = item.images.filter(src => src.trim());
    for (let imageIndex = 0; imageIndex < sources.length; imageIndex++) {
      options.signal?.throwIfAborted();
      if (options.imageMode === 'links') {
        yield encoder.encode(`${imageIndex ? ',' : ''}${json(await imageLink(sources[imageIndex]!, options.origin!))}`);
        continue;
      }
      const image = await options.loadImage(sources[imageIndex]!);
      yield encoder.encode(`${imageIndex ? ',' : ''}"data:${image.contentType};base64,`);
      yield encoder.encode(Buffer.from(image.bytes).toString('base64'));
      yield encoder.encode('"');
    }
    yield encoder.encode(']}');
  }
  yield encoder.encode(`]}</script><script>${options.assets.js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`);
}

export async function createPromptDownload(options: DownloadOptions): Promise<Response> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  // Keep the completed archive within the Worker's 128 MB memory ceiling.
  const maxBytes = 32 * 1024 * 1024;
  for await (const chunk of options.format === 'zip' ? zip(options) : html(options)) {
    options.signal?.throwIfAborted();
    length += chunk.byteLength;
    if (length > maxBytes) throw new Error('Export exceeds 32 MB; select fewer prompts');
    chunks.push(chunk);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  chunks.length = 0;
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(body); controller.close(); },
  }), {headers: {
    'content-type': options.format === 'zip' ? 'application/zip' : 'text/html; charset=utf-8',
    'content-disposition': `attachment; filename="open-prompts.${options.format}"`,
    'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff',
  }});
  options.signal?.throwIfAborted();
  await options.onComplete();
  return response;
}
