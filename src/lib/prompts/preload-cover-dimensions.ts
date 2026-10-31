export type CoverDimensions = { width: number; height: number };

const mem = new Map<string, CoverDimensions>();

export function getCachedCoverDimensions(src: string | undefined): CoverDimensions | undefined {
  if (!src) return undefined;
  return mem.get(src);
}

export function probeImageDimensions(src: string, timeoutMs = 10_000): Promise<CoverDimensions | null> {
  const cached = mem.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const img = new window.Image();
    let settled = false;

    const finish = (value: CoverDimensions | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (value) mem.set(src, value);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      finish(width > 0 && height > 0 ? { width, height } : null);
    };
    img.onerror = () => finish(null);
    img.decoding = 'async';
    img.src = src;
  });
}

export function dimensionsToAspectRatio({ width, height }: CoverDimensions): string {
  if (width <= 0 || height <= 0) return '1.6';
  return String(width / height);
}

/** Probe unique cover URLs in parallel. */
export async function preloadCoverDimensionsByUrl(
  urls: Array<string | undefined>,
): Promise<Map<string, CoverDimensions>> {
  const out = new Map<string, CoverDimensions>();
  const unique = Array.from(new Set(urls.map((u) => u?.trim()).filter(Boolean) as string[]));
  if (!unique.length) return out;

  await Promise.all(
    unique.map(async (url) => {
      const dim = await probeImageDimensions(url);
      if (dim) out.set(url, dim);
    }),
  );

  return out;
}
