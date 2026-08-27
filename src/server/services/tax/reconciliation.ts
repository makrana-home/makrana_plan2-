export interface ReconciliationRecord {
  key: string;
  totalCents: number;
  igvCents: number;
  taxableCents?: number;
  partyDocument?: string;
  documentType?: string;
  status?: "active" | "voided";
}
export function reconcileRecords(internal: ReconciliationRecord[], sunat: ReconciliationRecord[]) {
  const duplicateKeys = new Set<string>();
  for (const group of [internal, sunat]) {
    const seen = new Set<string>();
    for (const row of group) {
      if (seen.has(row.key)) duplicateKeys.add(row.key);
      seen.add(row.key);
    }
  }
  const a = new Map(internal.map((x) => [x.key, x])),
    b = new Map(sunat.map((x) => [x.key, x])),
    keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys].map((key) => {
    const i = a.get(key),
      s = b.get(key);
    let status = "matched";
    if (duplicateKeys.has(key)) status = "duplicate";
    else if (!i) status = "missing_internal";
    else if (!s) status = "missing_sunat";
    else if (i.status === "voided" || s.status === "voided") status = "voided";
    else if (i.partyDocument && s.partyDocument && i.partyDocument !== s.partyDocument)
      status = "supplier_mismatch";
    else if ((i.taxableCents ?? 0) !== (s.taxableCents ?? 0)) status = "taxable_mismatch";
    else if (i.totalCents !== s.totalCents) status = "total_mismatch";
    else if (i.igvCents !== s.igvCents) status = "igv_mismatch";
    return { key, status, internal: i, sunat: s };
  });
}
