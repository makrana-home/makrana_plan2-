import { mkdir, readFile, writeFile } from "node:fs/promises";
import { generateTaxPdf } from "../src/server/services/tax/pdf-generator.ts";
const logo = await readFile(new URL("../src/assets/makrana-logo.png", import.meta.url));
const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
const pdf = await generateTaxPdf({
  environment: "mock",
  documentType: "07",
  series: "FC01",
  number: 1,
  issueDate: "2026-08-20",
  issueTime: "15:42:08",
  legalName: "Makrana Home Art S.A.C. - DATOS FICTICIOS",
  tradeName: "Makrana",
  ruc: "20123456789",
  fiscalAddress: "Av. Ficticia 123, Barranco, Lima - dirección de prueba",
  customerName: "Cliente Ficticio para QA",
  customerDocument: "20987654321",
  taxableAmount: 380853.39,
  exemptAmount: 0,
  unaffectedAmount: 0,
  discountAmount: 125.5,
  igvAmount: 68553.61,
  totalAmount: 449407,
  paymentMethod: "Transferencia de prueba",
  hash: "6f96d72730df4df30e19d7b06c298847f530adf18667273f626593bc686bb422",
  qrPayload: "20123456789|07|FC01|1|68553.61|449407.00|2026-08-20|6|20987654321|MOCK",
  relatedDocument: "F001-00000001",
  creditNoteReason: "Devolución parcial",
  logoDataUrl,
  items: Array.from({ length: 48 }, (_, i) => ({
    description: `Pieza ficticia ${i + 1} - macramé artesanal con una descripción larga para verificar saltos de línea, márgenes y caracteres españoles: á, é, í, ó, ú y ñ.`,
    quantity: (i % 3) + 1,
    unitCode: "NIU",
    unitPrice: 3250.75 + i * 18.2,
    discount: i % 4 === 0 ? 25.5 : 0,
    total: (3250.75 + i * 18.2) * ((i % 3) + 1) - (i % 4 === 0 ? 25.5 : 0),
  })),
});
await mkdir(new URL("../output/pdf/", import.meta.url), { recursive: true });
await writeFile(new URL("../output/pdf/comprobante-tributario-mock-qa.pdf", import.meta.url), pdf);
