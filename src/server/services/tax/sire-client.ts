export class MockSireClient {
  async downloadProposal(period: string, type: "RVIE" | "RCE", records: unknown[] = []) {
    return {
      ticket: `MOCK-${type}-${period}`,
      status: "downloaded",
      records,
      warning: "Propuesta simulada; no enviada a SUNAT",
    };
  }
  async submit() {
    throw new Error("Presentación SIRE bloqueada por configuración");
  }
}
