import { calculateIncludedIgv } from "./tax-calculator.ts";
import type { CalculatedTaxDocument } from "./types.ts";

export const creditNoteReasons = {
  "01": "Anulación de la operación",
  "02": "Anulación por error en el RUC",
  "03": "Corrección por error en la descripción",
  "04": "Descuento global",
  "06": "Devolución total",
  "07": "Devolución parcial",
} as const;
export type CreditNoteReason = keyof typeof creditNoteReasons;

export interface CreditSourceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  productId?: string | null;
  internalCode?: string | null;
}
export interface CreditQuantity {
  itemId: string;
  quantity: number;
}

export function calculateCreditNote(
  source: CreditSourceItem[],
  requested: CreditQuantity[],
  reason: CreditNoteReason,
  alreadyCreditedCents = 0,
  originalTotalCents?: number,
): CalculatedTaxDocument {
  if (!creditNoteReasons[reason]) throw new Error("Motivo de nota de crédito inválido");
  const quantities = new Map(requested.map((x) => [x.itemId, x.quantity]));
  const selected = source.flatMap((item) => {
    const quantity =
      quantities.get(item.id) ??
      (reason === "01" || reason === "02" || reason === "06" ? item.quantity : 0);
    if (quantity <= 0) return [];
    if (quantity > item.quantity)
      throw new Error(`La devolución de ${item.description} supera la cantidad vendida`);
    const proportionalDiscount = Math.round(item.discountCents * (quantity / item.quantity));
    return [
      {
        description: item.description,
        quantity,
        unitPriceCents: item.unitPriceCents,
        discountCents: proportionalDiscount,
        productId: item.productId,
        internalCode: item.internalCode,
      },
    ];
  });
  if (selected.length === 0) throw new Error("La nota de crédito debe afectar al menos una línea");
  const totals = calculateIncludedIgv(selected);
  const limit =
    originalTotalCents ??
    source.reduce((sum, x) => sum + Math.round(x.unitPriceCents * x.quantity) - x.discountCents, 0);
  if (totals.totalCents + alreadyCreditedCents > limit)
    throw new Error("El importe acumulado de notas de crédito supera el comprobante original");
  return totals;
}
