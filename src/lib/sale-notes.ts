const MANUAL_CUSTOMER_LABEL = "Cliente manual";
const CHANNEL_BLOCK_PATTERN = /^\[([^\]]+)\]\s*/;
const MANUAL_CUSTOMER_CAPTURE_PATTERN = /\[Cliente manual:\s*([^\]]+)\]/i;
const MANUAL_CUSTOMER_BLOCK_PATTERN = /\[Cliente manual:\s*[^\]]+\]\s*/gi;
const DOCUMENT_INTENT_CAPTURE_PATTERN =
  /\[Documento:\s*(boleta|factura|nota_venta|pedido_personalizado|cotizacion)\]/i;
const DOCUMENT_INTENT_BLOCK_PATTERN =
  /\[Documento:\s*(?:boleta|factura|nota_venta|pedido_personalizado|cotizacion)\]\s*/gi;

export type SaleDocumentIntent =
  | "boleta"
  | "factura"
  | "nota_venta"
  | "pedido_personalizado"
  | "cotizacion";

type ComposeSaleNotesInput = {
  channel?: string | null;
  notes?: string | null;
  manualCustomerName?: string | null;
  documentIntent?: SaleDocumentIntent | null;
};

export function composeSaleNotes({
  channel,
  notes,
  manualCustomerName,
  documentIntent,
}: ComposeSaleNotesInput) {
  const parts: string[] = [];
  const channelValue = sanitizeNoteBlockValue(channel);
  const manualCustomerValue = sanitizeNoteBlockValue(manualCustomerName);
  const cleanNotes = getCleanSaleNotes(notes);

  if (channelValue) parts.push(`[${channelValue}]`);
  if (manualCustomerValue) parts.push(`[${MANUAL_CUSTOMER_LABEL}: ${manualCustomerValue}]`);
  if (documentIntent) parts.push(`[Documento: ${documentIntent}]`);
  if (cleanNotes) parts.push(cleanNotes);

  return parts.join(" ").trim() || null;
}

export function getChannelFromSaleNotes(notes?: string | null) {
  const value = String(notes ?? "").trim();
  const match = value.match(CHANNEL_BLOCK_PATTERN);
  const channel = match?.[1]?.trim() ?? "";

  if (channel.toLowerCase().startsWith(`${MANUAL_CUSTOMER_LABEL.toLowerCase()}:`)) {
    return "";
  }

  return channel;
}

export function getManualCustomerNameFromSaleNotes(notes?: string | null) {
  const match = String(notes ?? "").match(MANUAL_CUSTOMER_CAPTURE_PATTERN);
  return match?.[1]?.trim() ?? "";
}

export function getCleanSaleNotes(notes?: string | null) {
  let value = String(notes ?? "").trim();
  const channelMatch = value.match(CHANNEL_BLOCK_PATTERN);
  const channel = channelMatch?.[1]?.trim() ?? "";

  if (channel && !channel.toLowerCase().startsWith(`${MANUAL_CUSTOMER_LABEL.toLowerCase()}:`)) {
    value = value.slice(channelMatch?.[0].length ?? 0).trim();
  }

  return value
    .replace(MANUAL_CUSTOMER_BLOCK_PATTERN, "")
    .replace(DOCUMENT_INTENT_BLOCK_PATTERN, "")
    .trim();
}

export function getSaleDocumentIntent(notes?: string | null): SaleDocumentIntent {
  return (
    (String(notes ?? "").match(DOCUMENT_INTENT_CAPTURE_PATTERN)?.[1] as SaleDocumentIntent) ||
    "cotizacion"
  );
}

export function getSaleChannelDisplayName(sale?: any) {
  return String(sale?.channel ?? "").trim() || getChannelFromSaleNotes(sale?.notes);
}

export function getSaleCustomerDisplayName(sale?: any, fallback = "Cliente no registrado") {
  return (
    String(sale?.customer?.full_name ?? "").trim() ||
    String(sale?.manual_customer_name ?? "").trim() ||
    getManualCustomerNameFromSaleNotes(sale?.notes) ||
    fallback
  );
}

function sanitizeNoteBlockValue(value?: string | null) {
  return String(value ?? "")
    .replace(/[[\]\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
