export function formatAspectTag(meta: { w: number; h: number } | undefined): string | null {
  if (!meta || meta.w <= 0 || meta.h <= 0) return null;
  const r = meta.w / meta.h;

  const COMMON: Array<[string, number]> = [
    ['1:1', 1],
    ['4:3', 4 / 3],
    ['3:4', 3 / 4],
    ['16:9', 16 / 9],
    ['9:16', 9 / 16],
    ['3:2', 3 / 2],
    ['2:3', 2 / 3],
    ['5:4', 5 / 4],
    ['4:5', 4 / 5],
  ];

  let best: { label: string; diff: number } | null = null;
  for (const [label, val] of COMMON) {
    const diff = Math.abs(r - val);
    if (!best || diff < best.diff) best = { label, diff };
  }
  if (best && best.diff < 0.03) return `${best.label}`;

  const gcd = (a: number, b: number): number => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  };
  const g = gcd(meta.w, meta.h);
  const sw = Math.round(meta.w / g);
  const sh = Math.round(meta.h / g);
  if (sw <= 30 && sh <= 30) return `${sw}:${sh}`;

  const approx = (() => {
    const maxDen = 30;
    const maxIter = 12;
    let x = r;
    const a0 = Math.floor(x);
    let p0 = 1,
      q0 = 0;
    let p1 = a0,
      q1 = 1;
    for (let i = 0; i < maxIter; i++) {
      const frac = x - Math.floor(x);
      if (frac === 0) break;
      x = 1 / frac;
      const a = Math.floor(x);
      const p2 = a * p1 + p0;
      const q2 = a * q1 + q0;
      if (q2 > maxDen) break;
      p0 = p1;
      q0 = q1;
      p1 = p2;
      q1 = q2;
    }
    const num = Math.max(1, Math.round(p1));
    const den = Math.max(1, Math.round(q1));
    return [num, den] as const;
  })();

  return `${approx[0]}:${approx[1]}`;
}
