/** 同名组统一追加来源 ID，不让导入顺序决定 URL 指向。 */
export function buildMotionSlugs(records: readonly { id: string; title: string }[]) {
  const baseFor = (record: { id: string; title: string }) => /^\d+$/.test(record.id)
    ? record.title.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '') || `motion-${record.id}`
    : record.id;
  const counts = new Map<string, number>();
  const reserved = new Set(records.filter(record => !/^\d+$/.test(record.id)).map(record => record.id));
  for (const record of records) counts.set(baseFor(record), (counts.get(baseFor(record)) || 0) + 1);
  return new Map(records.map(record => {
    const base = baseFor(record);
    const collision = /^\d+$/.test(record.id) && ((counts.get(base) || 0) > 1 || reserved.has(base));
    return [record.id, collision ? `${base}-${record.id}` : base];
  }));
}
