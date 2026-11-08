export function GenerateCreditButton({ label, credits, byok }: { label: string; credits: number | null; byok: boolean }) {
  const text = byok || credits == null ? label : `${label} · ${credits}`;
  return <button type="button">{text}</button>;
}
