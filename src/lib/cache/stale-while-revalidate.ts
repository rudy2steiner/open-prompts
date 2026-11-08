type CacheEntry<T> = {
  value: T;
  freshUntil: number;
  staleUntil: number;
  refreshing?: Promise<void>;
};

export function createStaleCache<T>({
  freshMs,
  staleMs,
  now = Date.now,
}: {
  freshMs: number;
  staleMs: number;
  now?: () => number;
}) {
  const entries = new Map<string, CacheEntry<T>>();

  const store = (key: string, value: T) => {
    const storedAt = now();
    entries.set(key, {
      value,
      freshUntil: storedAt + freshMs,
      staleUntil: storedAt + freshMs + staleMs,
    });
    return value;
  };

  return {
    async get(key: string, loader: () => Promise<T>): Promise<T> {
      const current = entries.get(key);
      const timestamp = now();
      if (!current) return store(key, await loader());
      if (current.freshUntil >= timestamp) return current.value;
      if (current.staleUntil >= timestamp) {
        if (!current.refreshing) {
          current.refreshing = loader()
            .then((value) => { store(key, value); })
            .catch(() => undefined)
            .finally(() => {
              const latest = entries.get(key);
              if (latest === current) delete current.refreshing;
            });
        }
        return current.value;
      }
      if (current.refreshing) {
        await current.refreshing;
        const refreshed = entries.get(key);
        if (refreshed && refreshed !== current) return refreshed.value;
      }
      return store(key, await loader());
    },
    invalidate(key: string): void {
      entries.delete(key);
    },
    invalidatePrefix(prefix: string): void {
      entries.forEach((_value, key) => {
        if (key.startsWith(prefix)) entries.delete(key);
      });
    },
    clear(): void {
      entries.clear();
    },
  };
}
