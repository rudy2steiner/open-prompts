export type SubmitEditorQuery = {
  editId?: number;
  visibility?: 'public' | 'private';
};

export function submitEditorHref(locale: string, opts?: SubmitEditorQuery): string {
  const base = locale === 'en' ? '/submit' : `/${locale}/submit`;
  const q = new URLSearchParams();
  if (opts?.editId) q.set('edit', String(opts.editId));
  if (opts?.visibility === 'public') q.set('visibility', 'public');
  if (opts?.visibility === 'private') q.set('visibility', 'private');
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseSubmitEditId(raw: string | null | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
