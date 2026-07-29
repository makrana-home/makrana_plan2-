const MANUAL_CUSTOMER_LABEL = "Cliente manual";
const CHANNEL_BLOCK_PATTERN = /^\[([^\]]+)\]\s*/;
const MANUAL_CUSTOMER_CAPTURE_PATTERN = /\[Cliente manual:\s*([^\]]+)\]/i;
const MANUAL_CUSTOMER_BLOCK_PATTERN = /\[Cliente manual:\s*[^\]]+\]\s*/gi;

type ComposeSaleNotesInput = {
  channel?: string | null;
  notes?: string | null;
  manualCustomerName?: string | null;
};

export function composeSaleNotes({ channel, notes, manualCustomerName }: ComposeSaleNotesInput) {
  const parts: string[] = [];
  const channelValue = sanitizeNoteBlockValue(channel);
  const manualCustomerValue = sanitizeNoteBlockValue(manualCustomerName);
  const cleanNotes = getCleanSaleNotes(notes);

  if (channelValue) parts.push(`[${channelValue}]`);
  if (manualCustomerValue) parts.push(`[${MANUAL_CUSTOMER_LABEL}: ${manualCustomerValue}]`);
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

  return value.replace(MANUAL_CUSTOMER_BLOCK_PATTERN, "").trim();
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
