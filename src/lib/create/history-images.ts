import { HISTORY_STORAGE_KEY } from './history';

type ImageJob = {
  source: string;
  controller: AbortController;
  promise: Promise<string>;
  finish: (source: string) => void;
};

const IMAGE_DATABASE = 'open-prompts-create-images';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
export const HISTORY_IMAGE_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function isHistoryImageSource(source: string) {
  return /^https?:\/\//i.test(source) || (source.startsWith('/') && !source.startsWith('//'));
}

async function validateImage(blob: unknown): Promise<Blob> {
  if (!(blob instanceof Blob) || !IMAGE_TYPES.has(blob.type) || !blob.size || blob.size > MAX_IMAGE_BYTES) throw new Error('Invalid image');
  const bitmap = await createImageBitmap(blob);
  bitmap.close();
  return blob;
}

async function fetchImage(source: string, signal: AbortSignal) {
  const response = await fetch(source, { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) });
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!response.ok || !response.body || !IMAGE_TYPES.has(type) || Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new Error('Image unavailable');
  }
  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_IMAGE_BYTES) throw new Error('Image too large');
      chunks.push(value.slice());
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  return validateImage(new Blob(chunks, { type }));
}

export function createHistoryImageCache(
  readSources: () => string[] | null,
  transport: (source: string) => string,
  onChange: (resolved: Record<string, string>) => void,
) {
  let disposed = false;
  let database: IDBDatabase | null = null;
  let desired = new Set<string>();
  const resolved = new Map<string, string>();
  const pending = new Map<string, ImageJob>();
  const queue: ImageJob[] = [];
  let active = 0;

  const opened = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DATABASE, 1);
    let rejected = false;
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onerror = () => reject(request.error);
    request.onblocked = () => { rejected = true; reject(new Error('Image storage blocked')); };
    request.onsuccess = () => {
      if (disposed || rejected) {
        request.result.close();
        reject(new Error('Image storage closed'));
        return;
      }
      database = request.result;
      database.onversionchange = () => database?.close();
      resolve(database);
    };
  }).catch(() => null);

  const publish = () => { if (!disposed) onChange(Object.fromEntries(resolved)); };
  const prune = async () => {
    const db = await opened;
    if (!db || disposed) return;
    await navigator.locks.request(HISTORY_STORAGE_KEY, () => {
      if (disposed) return;
      const sources = readSources();
      if (!sources) return;
      const retained = new Set(sources);
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('images', 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
        const cursor = transaction.objectStore('images').openCursor();
        cursor.onsuccess = () => {
          const item = cursor.result;
          if (!item) return;
          if (!retained.has(String(item.key))) item.delete();
          item.continue();
        };
      });
    });
  };

  const load = async (job: ImageJob) => {
    const { source, controller } = job;
    try {
      const db = await opened;
      if (!db || disposed || controller.signal.aborted) throw new Error('Image storage unavailable');
      let blob: Blob | null = null;
      try {
        const stored = await new Promise<unknown>((resolve, reject) => {
          const request = db.transaction('images').objectStore('images').get(source);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        blob = await validateImage(stored);
      } catch {}
      if (!blob) {
        blob = await fetchImage(transport(source), controller.signal);
        await navigator.locks.request(HISTORY_STORAGE_KEY, () => {
          // A deletion in another tab must win over an in-flight image fetch.
          if (disposed || controller.signal.aborted || !readSources()?.includes(source)) throw new Error('Image no longer retained');
          return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction('images', 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = transaction.onabort = () => reject(transaction.error);
            transaction.objectStore('images').put(blob, source);
          });
        });
      }
      if (!disposed && desired.has(source) && !controller.signal.aborted) resolved.set(source, URL.createObjectURL(blob));
    } catch {
      if (!disposed && desired.has(source) && !controller.signal.aborted) resolved.set(source, transport(source));
    } finally {
      job.finish(resolved.get(source) ?? transport(source));
      if (pending.get(source) === job) pending.delete(source);
      publish();
    }
  };

  const pump = () => {
    while (!disposed && active < 3 && queue.length) {
      const job = queue.shift()!;
      if (pending.get(job.source) !== job || job.controller.signal.aborted) continue;
      active++;
      void load(job).finally(() => { active--; pump(); });
    }
  };

  const enqueue = (source: string) => {
    let finish!: (url: string) => void;
    const promise = new Promise<string>(resolve => { finish = resolve; });
    const job: ImageJob = { source, controller: new AbortController(), promise, finish };
    pending.set(source, job);
    queue.push(job);
    return job;
  };

  return {
    get(source: string) {
      if (!disposed && !resolved.has(source) && !pending.has(source) && isHistoryImageSource(source) && readSources()?.includes(source)) {
        desired.add(source);
        enqueue(source);
        pump();
      }
      return pending.get(source)?.promise ?? Promise.resolve(resolved.get(source) ?? transport(source));
    },
    sync(sources: string[]) {
      desired = new Set(sources.filter(isHistoryImageSource));
      for (const [source, url] of Array.from(resolved)) {
        if (desired.has(source)) continue;
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        resolved.delete(source);
      }
      for (const [source, job] of Array.from(pending)) {
        if (!desired.has(source)) {
          job.controller.abort();
          job.finish(transport(source));
          pending.delete(source);
        }
      }
      for (const source of Array.from(desired)) {
        if (!resolved.has(source) && !pending.has(source)) enqueue(source);
      }
      publish();
      pump();
      void prune().catch(() => {});
    },
    dispose() {
      disposed = true;
      pending.forEach(job => { job.controller.abort(); job.finish(transport(job.source)); });
      resolved.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
      database?.close();
    },
  };
}
