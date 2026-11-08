import type { ImageResolution } from '~/lib/generation/types';

export type HistoryEntry = {
  id: string;
  createdAt: number;
  providerJobId: string | null;
  prompt: string;
  model: string;
  provider: string;
  aspectRatio: string;
  resolution: ImageResolution;
  quality: string;
  count: number;
  images: string[];
};

type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const HISTORY_STORAGE_KEY = 'op_create_history';
const HISTORY_LIMIT = 30;

export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x: any) => {
        const createdAt = Number(x.createdAt);
        return {
          id: String(x.id || ''),
          createdAt: Number.isFinite(new Date(createdAt).getTime()) ? createdAt : Date.now(),
          providerJobId: x.providerJobId ? String(x.providerJobId) : null,
          prompt: String(x.prompt || ''),
          model: String(x.model || ''),
          provider: String(x.provider || ''),
          aspectRatio: String(x.aspectRatio || ''),
          resolution: (x.resolution === '2k' || x.resolution === '4k' ? x.resolution : '1k') as ImageResolution,
          quality: String(x.quality || ''),
          count: Number(x.count || 1),
          images: Array.isArray(x.images) ? x.images.filter((u: unknown) => typeof u === 'string') : [],
        };
      })
      .filter((x) => x.id && x.prompt)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function createHistoryStore(
  storage: HistoryStorage | null,
  runExclusive: (update: () => HistoryEntry[]) => Promise<HistoryEntry[]>,
) {
  let memory: HistoryEntry[] = [];
  let unsaved = false;

  const read = () => {
    if (storage && !unsaved) {
      try {
        memory = parseHistory(storage.getItem(HISTORY_STORAGE_KEY));
      } catch {
        // Privacy restrictions can deny reads after a successful write.
      }
    }
    return memory;
  };

  const write = (entries: HistoryEntry[]) => {
    memory = entries.slice(0, HISTORY_LIMIT);
    unsaved = true;
    if (storage) {
      try {
        storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(memory));
        unsaved = false;
      } catch {
        // Preserve unsaved entries for subsequent edits in this tab.
      }
    }
    return memory;
  };

  return {
    read,
    imageSources: (): string[] | null => {
      if (!storage) return null;
      try {
        const persisted = parseHistory(storage.getItem(HISTORY_STORAGE_KEY));
        return Array.from(new Set([...read(), ...persisted].flatMap(entry => entry.images)));
      } catch { return null; }
    },
    add: (entry: HistoryEntry) => runExclusive(() => write([entry, ...read().filter((x) => x.id !== entry.id)])),
    remove: (id: string) => runExclusive(() => write(read().filter((x) => x.id !== id))),
  };
}
