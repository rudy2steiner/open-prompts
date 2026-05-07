const STORAGE_KEY = 'op_user_id_v1';

function safeUuid() {
  // Browser modern
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();
    const next = safeUuid();
    localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    // If storage is unavailable (private mode), still provide a per-session-ish id.
    return safeUuid();
  }
}

