import test from "node:test";
import assert from "node:assert/strict";
import { calculateIncludedIgv } from "./tax-calculator.ts";
import { reconcileRecords } from "./reconciliation.ts";
import { buildInvoiceUbl, validateUbl } from "./ubl-builder.ts";
import { MockXmlSigner } from "./xml-signer.ts";
import { calculateCreditNote } from "./credit-note-service.ts";
import { buildDailySummaryXml, zipDailySummary } from "./daily-summary-service.ts";
import { generateTaxPdf } from "./pdf-generator.ts";
test("separa IGV incluido sin perder un céntimo", () => {
  const x = calculateIncludedIgv([{ description: "Pieza", quantity: 1, unitPriceCents: 11800 }]);
  assert.equal(x.taxableCents, 10000);
  assert.equal(x.igvCents, 1800);
  assert.equal(x.totalCents, 11800);
});
test("calcula cantidades, descuentos y redondeo", () => {
  const x = calculateIncludedIgv([
    { description: "Pieza", quantity: 3, unitPriceCents: 999, discountCents: 1 },
  ]);
  assert.equal(x.totalCents, 2996);
  assert.equal(x.taxableCents + x.igvCents, x.totalCents);
});
test("rechaza descuentos mayores al total", () =>
  assert.throws(() =>
    calculateIncludedIgv([
      { description: "X", quantity: 1, unitPriceCents: 100, discountCents: 101 },
    ]),
  ));
test("genera UBL 2.1 y firma simulada", async () => {
  const totals = calculateIncludedIgv([
    { description: "Telar & arte", quantity: 1, unitPriceCents: 11800 },
  ]);
  const xml = buildInvoiceUbl({
    ruc: "20123456789",
    legalName: "Makrana Test",
    type: "01",
    series: "F001",
    number: 1,
    issueDate: "2026-08-20",
    customerDocumentType: "6",
    customerDocumentNumber: "20987654321",
    customerName: "Cliente Test",
    totals,
  });
  assert.equal(validateUbl(xml).valid, true);
  assert.match(xml, /Telar &amp; arte/);
  const signed = await new MockXmlSigner().sign(xml);
  assert.match(signed.signature, /^MOCK-/);
});
test("reconcilia faltantes y diferencias", () => {
  const r = reconcileRecords(
    [
      { key: "A", totalCents: 118, igvCents: 18 },
      { key: "B", totalCents: 200, igvCents: 30 },
    ],
    [
      { key: "A", totalCents: 119, igvCents: 18 },
      { key: "C", totalCents: 100, igvCents: 18 },
    ],
  );
  assert.deepEqual(r.map((x) => x.status).sort(), [
    "missing_internal",
    "missing_sunat",
    "total_mismatch",
  ]);
});
test("impide acreditar más de lo vendido", () => {
  const source = [
    { id: "a", description: "macramé", quantity: 2, unitPriceCents: 11800, discountCents: 0 },
  ];
  assert.throws(() => calculateCreditNote(source, [{ itemId: "a", quantity: 2 }], "07", 1, 23600));
  assert.equal(calculateCreditNote(source, [{ itemId: "a", quantity: 1 }], "07").totalCents, 11800);
});
test("genera y comprime resumen diario", () => {
  const xml = buildDailySummaryXml({
    ruc: "20123456789",
    legalName: "Makrana Test",
    identifier: "RC-20260820-001",
    referenceDate: "2026-08-20",
    issueDate: "2026-08-21",
    items: [
      {
        documentType: "03",
        series: "B001",
        number: 1,
        customerDocumentType: "0",
        taxableAmount: 100,
        igvAmount: 18,
        totalAmount: 118,
        action: "add",
      },
    ],
  });
  assert.match(xml, /SummaryDocumentsLine/);
  const zip = zipDailySummary("summary.xml", xml);
  assert.ok(zip.bytes.length > 100);
  assert.equal(zip.hash.length, 64);
});
test("genera PDF de boleta, factura y nota con varias páginas", async () => {
  for (const documentType of ["01", "03", "07"] as const) {
    const pdf = await generateTaxPdf({
      environment: "mock",
      documentType,
      series: documentType === "01" ? "F001" : documentType === "03" ? "B001" : "FC01",
      number: 99999999,
      issueDate: "2026-08-20",
      issueTime: "13:45:10",
      legalName: "Makrana Home Art S.A.C.",
      ruc: "20123456789",
      fiscalAddress: "Dirección fiscal de prueba, Lima, Perú",
      customerName: "Cliente Ficticio",
      customerDocument: "20987654321",
      taxableAmount: 1000000,
      discountAmount: 10,
      igvAmount: 180000,
      totalAmount: 1180000,
      paymentMethod: "transferencia",
      hash: "abc123",
      qrPayload: "PRUEBA|NO|VALIDO",
      relatedDocument: documentType === "07" ? "F001-00000001" : null,
      creditNoteReason: documentType === "07" ? "Devolución parcial" : null,
      items: Array.from({ length: 45 }, (_, i) => ({
        description: `Producto ficticio ${i + 1}: pieza de macramé con descripción extensa y caracteres españoles áéíóúñ`,
        quantity: i + 1,
        unitCode: "NIU",
        unitPrice: 9999.99,
        discount: i % 2,
        total: 9999.99 * (i + 1),
      })),
    });
    assert.equal(String.fromCharCode(...pdf.slice(0, 4)), "%PDF");
    assert.ok(pdf.length > 10000);
  }
});
test("clasifica duplicados, base, proveedor, anulado y propuesta vacía", () => {
  assert.deepEqual(reconcileRecords([], []), []);
  const result = reconcileRecords(
    [
      { key: "D", totalCents: 118, igvCents: 18 },
      { key: "D", totalCents: 118, igvCents: 18 },
      { key: "B", totalCents: 118, igvCents: 18, taxableCents: 100 },
      { key: "P", totalCents: 118, igvCents: 18, partyDocument: "1" },
      { key: "V", totalCents: 118, igvCents: 18, status: "active" },
    ],
    [
      { key: "D", totalCents: 118, igvCents: 18 },
      { key: "B", totalCents: 118, igvCents: 18, taxableCents: 99 },
      { key: "P", totalCents: 118, igvCents: 18, partyDocument: "2" },
      { key: "V", totalCents: 118, igvCents: 18, status: "voided" },
    ],
  );
  assert.deepEqual(result.map((x) => x.status).sort(), [
    "duplicate",
    "supplier_mismatch",
    "taxable_mismatch",
    "voided",
  ]);
});
