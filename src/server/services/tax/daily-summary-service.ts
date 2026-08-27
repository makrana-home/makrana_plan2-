import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";

export interface DailySummaryItem {
  documentType: "03";
  series: string;
  number: number;
  customerDocumentType: string;
  customerDocumentNumber?: string | null;
  taxableAmount: number;
  igvAmount: number;
  totalAmount: number;
  action: "add" | "modify" | "void";
}
const xmlEscape = (v: string) =>
  v.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
export function buildDailySummaryXml(input: {
  ruc: string;
  legalName: string;
  identifier: string;
  referenceDate: string;
  issueDate: string;
  items: DailySummaryItem[];
}) {
  if (input.items.length === 0) throw new Error("El resumen diario no contiene boletas");
  const lines = input.items
    .map(
      (x, i) =>
        `<sac:SummaryDocumentsLine><cbc:LineID>${i + 1}</cbc:LineID><cbc:DocumentTypeCode>03</cbc:DocumentTypeCode><cbc:ID>${x.series}-${x.number}</cbc:ID><cac:AccountingCustomerParty><cbc:CustomerAssignedAccountID>${xmlEscape(x.customerDocumentNumber || "-")}</cbc:CustomerAssignedAccountID><cbc:AdditionalAccountID>${x.customerDocumentType}</cbc:AdditionalAccountID></cac:AccountingCustomerParty><cac:Status><cbc:ConditionCode>${x.action === "void" ? 3 : x.action === "modify" ? 2 : 1}</cbc:ConditionCode></cac:Status><sac:TotalAmount currencyID="PEN">${x.totalAmount.toFixed(2)}</sac:TotalAmount><sac:BillingPayment><cbc:PaidAmount currencyID="PEN">${x.taxableAmount.toFixed(2)}</cbc:PaidAmount><cbc:InstructionID>01</cbc:InstructionID></sac:BillingPayment><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${x.igvAmount.toFixed(2)}</cbc:TaxAmount></cac:TaxTotal></sac:SummaryDocumentsLine>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><SummaryDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1"><cbc:UBLVersionID>2.0</cbc:UBLVersionID><cbc:CustomizationID>1.1</cbc:CustomizationID><cbc:ID>${input.identifier}</cbc:ID><cbc:ReferenceDate>${input.referenceDate}</cbc:ReferenceDate><cbc:IssueDate>${input.issueDate}</cbc:IssueDate><cac:AccountingSupplierParty><cbc:CustomerAssignedAccountID>${input.ruc}</cbc:CustomerAssignedAccountID><cbc:AdditionalAccountID>6</cbc:AdditionalAccountID><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEscape(input.legalName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>${lines}</SummaryDocuments>`;
}
export function zipDailySummary(fileName: string, signedXml: string) {
  const bytes = zipSync({ [fileName]: strToU8(signedXml) });
  return { bytes, hash: createHash("sha256").update(bytes).digest("hex") };
}
