import { centsToAmount } from "./tax-calculator.ts";
import type { CalculatedTaxDocument, TaxDocumentType } from "./types.ts";

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );

export type UblInput = {
  ruc: string;
  legalName: string;
  type: TaxDocumentType;
  series: string;
  number: number;
  issueDate: string;
  customerDocumentType: string;
  customerDocumentNumber: string;
  customerName: string;
  totals: CalculatedTaxDocument;
  relatedDocument?: string;
  creditReasonCode?: string;
  creditReason?: string;
};

export function buildInvoiceUbl(input: UblInput) {
  const credit = input.type === "07";
  const root = credit ? "CreditNote" : "Invoice";
  const lineName = credit ? "CreditNoteLine" : "InvoiceLine";
  const quantityName = credit ? "CreditedQuantity" : "InvoicedQuantity";
  const lines = input.totals.lines
    .map(
      (line, index) =>
        `<cac:${lineName}><cbc:ID>${index + 1}</cbc:ID><cbc:${quantityName} unitCode="NIU">${line.quantity}</cbc:${quantityName}><cbc:LineExtensionAmount currencyID="PEN">${centsToAmount(line.saleValueCents)}</cbc:LineExtensionAmount><cac:Item><cbc:Description>${escapeXml(line.description)}</cbc:Description></cac:Item><cac:Price><cbc:PriceAmount currencyID="PEN">${centsToAmount(line.unitValueCents)}</cbc:PriceAmount></cac:Price></cac:${lineName}>`,
    )
    .join("");
  const reference = credit
    ? `<cac:DiscrepancyResponse><cbc:ReferenceID>${escapeXml(input.relatedDocument || "")}</cbc:ReferenceID><cbc:ResponseCode>${input.creditReasonCode || ""}</cbc:ResponseCode><cbc:Description>${escapeXml(input.creditReason || "")}</cbc:Description></cac:DiscrepancyResponse><cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${escapeXml(input.relatedDocument || "")}</cbc:ID><cbc:DocumentTypeCode>${input.relatedDocument?.startsWith("F") ? "01" : "03"}</cbc:DocumentTypeCode></cac:InvoiceDocumentReference></cac:BillingReference>`
    : "";
  const typeCode = credit
    ? ""
    : `<cbc:InvoiceTypeCode listID="0101">${input.type}</cbc:InvoiceTypeCode>`;
  return `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:makrana="urn:makrana:tax:pending"><ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><makrana:PendingSignature/></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions><cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>2.0</cbc:CustomizationID><cbc:ID>${input.series}-${input.number}</cbc:ID><cbc:IssueDate>${input.issueDate}</cbc:IssueDate>${typeCode}<cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>${reference}<cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${input.ruc}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.legalName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="${input.customerDocumentType}">${escapeXml(input.customerDocumentNumber)}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.customerName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${centsToAmount(input.totals.igvCents)}</cbc:TaxAmount></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">${centsToAmount(input.totals.taxableCents)}</cbc:LineExtensionAmount><cbc:PayableAmount currencyID="PEN">${centsToAmount(input.totals.totalCents)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</${root}>`;
}

export function validateUbl(xml: string) {
  const errors: string[] = [];
  if (!xml.startsWith("<?xml")) errors.push("Cabecera XML ausente");
  if (!xml.includes("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>")) errors.push("UBL 2.1 ausente");
  if (!xml.includes("<cbc:ID>")) errors.push("Identificador ausente");
  return { valid: errors.length === 0, errors };
}
