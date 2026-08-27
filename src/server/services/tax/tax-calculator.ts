import type { CalculatedTaxDocument, TaxLineInput } from "./types.ts";

function divideRound(numerator: number, denominator: number) {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export function calculateIncludedIgv(
  lines: TaxLineInput[],
  igvBasisPoints = 1800,
): CalculatedTaxDocument {
  if (!Number.isInteger(igvBasisPoints) || igvBasisPoints < 0) throw new Error("Tasa IGV inválida");
  const denominator = 10_000 + igvBasisPoints;
  const calculated = lines.map((line) => {
    if (
      !Number.isInteger(line.unitPriceCents) ||
      line.unitPriceCents < 0 ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0
    )
      throw new Error("Línea tributaria inválida");
    const gross = Math.round(line.unitPriceCents * line.quantity);
    const discountCents = line.discountCents ?? 0;
    if (!Number.isInteger(discountCents) || discountCents < 0 || discountCents > gross)
      throw new Error("Descuento tributario inválido");
    const totalCents = gross - discountCents;
    const saleValueCents = divideRound(totalCents * 10_000, denominator);
    const igvCents = totalCents - saleValueCents;
    return {
      ...line,
      discountCents,
      unitValueCents: divideRound(line.unitPriceCents * 10_000, denominator),
      saleValueCents,
      igvCents,
      totalCents,
    };
  });
  return calculated.reduce(
    (result, line) => ({
      ...result,
      lines: [...result.lines, line],
      taxableCents: result.taxableCents + line.saleValueCents,
      discountCents: result.discountCents + (line.discountCents ?? 0),
      igvCents: result.igvCents + line.igvCents,
      totalCents: result.totalCents + line.totalCents,
    }),
    {
      lines: [],
      taxableCents: 0,
      discountCents: 0,
      igvCents: 0,
      totalCents: 0,
    } as CalculatedTaxDocument,
  );
}

export const centsToAmount = (cents: number) => (cents / 100).toFixed(2);
