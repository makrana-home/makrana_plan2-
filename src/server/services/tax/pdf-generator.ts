import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface TaxPdfItem {
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface TaxPdfInput {
  environment: "mock" | "beta" | "production";
  documentType: "01" | "03" | "07";
  series: string;
  number: number;
  issueDate: string;
  issueTime: string;
  legalName: string;
  tradeName?: string | null;
  ruc: string;
  fiscalAddress: string;
  customerName: string;
  customerDocument?: string | null;
  taxableAmount: number;
  exemptAmount?: number;
  unaffectedAmount?: number;
  discountAmount: number;
  igvAmount: number;
  totalAmount: number;
  paymentMethod?: string | null;
  hash: string;
  qrPayload: string;
  items: TaxPdfItem[];
  relatedDocument?: string | null;
  creditNoteReason?: string | null;
  logoDataUrl?: string | null;
}

const typeNames = {
  "01": "FACTURA ELECTRÓNICA",
  "03": "BOLETA DE VENTA ELECTRÓNICA",
  "07": "NOTA DE CRÉDITO ELECTRÓNICA",
} as const;
const money = (value: number) => `S/ ${value.toFixed(2)}`;

export async function generateTaxPdf(input: TaxPdfInput): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const qr = await QRCode.toDataURL(input.qrPayload, {
    margin: 0,
    width: 320,
    errorCorrectionLevel: "M",
  });
  let page = 1;
  let y = 0;
  const drawHeader = () => {
    doc.setFillColor(250, 244, 239);
    doc.rect(0, 0, 210, 35, "F");
    if (input.logoDataUrl) {
      try {
        doc.addImage(input.logoDataUrl, "PNG", 14, 8, 42, 18, undefined, "FAST");
      } catch {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(128, 52, 44);
        doc.text("MAKRANA", 14, 18);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(128, 52, 44);
      doc.text("MAKRANA", 14, 18);
    }
    doc.setDrawColor(128, 52, 44);
    doc.roundedRect(125, 6, 70, 24, 2, 2);
    doc.setTextColor(55, 45, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`RUC ${input.ruc}`, 160, 12, { align: "center" });
    doc.setFontSize(10);
    doc.text(typeNames[input.documentType], 160, 19, { align: "center", maxWidth: 64 });
    doc.setFontSize(11);
    doc.text(`${input.series}-${String(input.number).padStart(8, "0")}`, 160, 26, {
      align: "center",
    });
    y = 42;
    if (input.environment !== "production") {
      doc.setFillColor(255, 245, 214);
      doc.roundedRect(14, y, 181, 8, 1, 1, "F");
      doc.setTextColor(140, 87, 0);
      doc.setFontSize(8);
      doc.text("AMBIENTE DE PRUEBA - NO VÁLIDO PARA EFECTOS TRIBUTARIOS", 104.5, y + 5.3, {
        align: "center",
      });
      y += 13;
    }
  };
  const footer = () => {
    doc.setDrawColor(220);
    doc.line(14, 284, 196, 284);
    doc.setTextColor(110);
    doc.setFontSize(7);
    doc.text("Representación impresa del comprobante electrónico - Makrana Home Art", 14, 289);
    doc.text(`Página ${page}`, 196, 289, { align: "right" });
  };
  const nextPage = () => {
    footer();
    doc.addPage();
    page += 1;
    drawHeader();
  };
  drawHeader();
  doc.setTextColor(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(input.legalName, 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(input.fiscalAddress, 14, y, { maxWidth: 180 });
  y += 9;
  doc.setDrawColor(225);
  doc.roundedRect(14, y, 181, 25, 1, 1);
  doc.setFontSize(8);
  doc.text(`Fecha y hora: ${input.issueDate} ${input.issueTime}`, 18, y + 6);
  doc.text(`Cliente: ${input.customerName}`, 18, y + 12, { maxWidth: 120 });
  doc.text(`Documento: ${input.customerDocument || "Sin documento"}`, 18, y + 18);
  doc.text(`Forma de pago: ${input.paymentMethod || "No especificada"}`, 110, y + 18);
  y += 31;
  if (input.relatedDocument) {
    doc.setFont("helvetica", "bold");
    doc.text(`Comprobante afectado: ${input.relatedDocument}`, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Motivo: ${input.creditNoteReason || "-"}`, 14, y);
    y += 7;
  }
  const columns = [14, 23, 39, 126, 148, 172, 195];
  const tableHeader = () => {
    doc.setFillColor(128, 52, 44);
    doc.rect(14, y, 181, 8, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    ["#", "Cant.", "Descripción", "P. unit.", "Dscto.", "Total"].forEach((v, i) =>
      doc.text(v, columns[i] + 2, y + 5),
    );
    y += 8;
    doc.setTextColor(45);
    doc.setFont("helvetica", "normal");
  };
  tableHeader();
  input.items.forEach((item, index) => {
    const lines = doc.splitTextToSize(item.description, 82);
    const height = Math.max(8, lines.length * 4 + 3);
    if (y + height > 248) {
      nextPage();
      tableHeader();
    }
    if (index % 2 === 0) {
      doc.setFillColor(252, 249, 247);
      doc.rect(14, y, 181, height, "F");
    }
    doc.setFontSize(7);
    doc.text(String(index + 1), columns[0] + 2, y + 5);
    doc.text(`${item.quantity} ${item.unitCode}`, columns[1] + 2, y + 5);
    doc.text(lines, columns[2] + 2, y + 5);
    doc.text(money(item.unitPrice), columns[3] + 2, y + 5);
    doc.text(money(item.discount), columns[4] + 2, y + 5);
    doc.text(money(item.total), columns[5] + 2, y + 5);
    y += height;
  });
  if (y > 220) nextPage();
  y += 5;
  const tx = 135;
  doc.setFontSize(8);
  [
    ["Operaciones gravadas", input.taxableAmount],
    ["Operaciones exoneradas", input.exemptAmount ?? 0],
    ["Operaciones inafectas", input.unaffectedAmount ?? 0],
    ["Descuentos", input.discountAmount],
    ["IGV", input.igvAmount],
  ].forEach(([name, value]) => {
    doc.text(String(name), tx, y);
    doc.text(money(Number(value)), 195, y, { align: "right" });
    y += 5;
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("IMPORTE TOTAL", tx, y + 2);
  doc.text(money(input.totalAmount), 195, y + 2, { align: "right" });
  const qrY = Math.min(y - 20, 238);
  doc.addImage(qr, "PNG", 14, qrY, 34, 34, undefined, "FAST");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Código QR de consulta", 14, qrY + 38);
  doc.text(`Hash: ${input.hash}`, 53, qrY + 8, { maxWidth: 75 });
  footer();
  return new Uint8Array(doc.output("arraybuffer"));
}
