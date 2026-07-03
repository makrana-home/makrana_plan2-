export function formatUnits(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0";
  return String(Math.round(amount));
}
