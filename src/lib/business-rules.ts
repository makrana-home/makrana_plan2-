export type InventoryMovementInput = {
  movement_type: "entrada" | "salida" | "transferencia" | "ajuste" | "devolucion";
  quantity: number;
  warehouse_id: string;
  warehouse_dest_id?: string | null;
};

export function calculateSaleItemSubtotal(quantity: number, unitPrice: number, discount = 0) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("El precio unitario no puede ser negativo.");
  }
  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error("El descuento no puede ser negativo.");
  }
  const gross = quantity * unitPrice;
  if (discount > gross) {
    throw new Error("El descuento no puede superar el importe del ítem.");
  }
  return Number((gross - discount).toFixed(2));
}

export function validateInventoryMovement(input: InventoryMovementInput) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }
  if (!input.warehouse_id) throw new Error("El almacén es obligatorio.");
  if (input.movement_type === "transferencia") {
    if (!input.warehouse_dest_id) throw new Error("El almacén de destino es obligatorio.");
    if (input.warehouse_dest_id === input.warehouse_id) {
      throw new Error("Los almacenes de origen y destino deben ser distintos.");
    }
  }
  return input;
}

export type CommercialDocumentIntent =
  | "boleta"
  | "factura"
  | "nota_venta"
  | "pedido_personalizado"
  | "cotizacion";

export function resolveOperationBeforeConfirmation(input: {
  intent: CommercialDocumentIntent;
  total: number;
  paid: number;
  creditSalesEnabled?: boolean;
}) {
  const paid = Number(input.paid.toFixed(2));
  const total = Number(input.total.toFixed(2));
  const paymentConfirmed = total > 0 && paid >= total;
  if (input.intent === "cotizacion" || input.intent === "pedido_personalizado")
    return { action: "keep_draft" as const, paymentConfirmed, resultingDocument: input.intent };
  if (!paymentConfirmed && !input.creditSalesEnabled)
    return {
      action: "convert_to_quote" as const,
      paymentConfirmed: false,
      resultingDocument: "cotizacion" as const,
      message:
        "Como el pago todavía no fue confirmado, la operación se guardó como cotización. Cuando registres el pago podrás convertirla en nota de venta.",
    };
  return {
    action: "confirm_sale" as const,
    paymentConfirmed: true,
    resultingDocument: input.intent,
  };
}
