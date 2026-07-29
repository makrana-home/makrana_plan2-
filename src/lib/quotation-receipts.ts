export function buildQuotationReceipt(sale: any) {
  const receipt = getSaleReceipt(sale);
  return {
    ...(receipt ?? {}),
    number:
      receipt?.number ??
      `COT-${String(sale?.id ?? "")
        .slice(0, 8)
        .toUpperCase()}`,
    issued_at: receipt?.issued_at ?? sale?.confirmed_at ?? sale?.created_at,
    sale,
  };
}

function getSaleReceipt(sale: any) {
  const receipt = sale?.receipt;
  return Array.isArray(receipt) ? receipt[0] : receipt;
}
