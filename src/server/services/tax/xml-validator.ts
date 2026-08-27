import { readFile } from "node:fs/promises";
import path from "node:path";
import { DOMParser, type Document as XmlDomDocument } from "@xmldom/xmldom";
import { ParseOption, XmlDocument, XsdValidator } from "libxml2-wasm";
import { xmlRegisterFsInputProviders } from "libxml2-wasm/lib/nodejs.mjs";

xmlRegisterFsInputProviders();

const MAX_XML_BYTES = 2 * 1024 * 1024;
const allowedDocumentTypes = new Set(["01", "03", "07"]);
const allowedCurrencies = new Set(["PEN", "USD", "EUR"]);
const allowedUnits = new Set(["NIU", "ZZ", "KGM", "MTR", "LTR", "HUR"]);
const allowedCreditReasons = new Set(["01", "02", "03", "04", "06", "07"]);

export type UblValidationResult = { valid: boolean; errors: string[] };

export function assertSafeXml(xml: string) {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) throw new Error("XML excede 2 MiB");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DTD y entidades XML no están permitidas");
  if (/\.\.[\\/]/.test(xml)) throw new Error("Rutas relativas no están permitidas");
}

function text(doc: XmlDomDocument, localName: string) {
  const nodes = doc.getElementsByTagNameNS("*", localName);
  return nodes.item(0)?.textContent?.trim() || "";
}

export function validateSunatCatalogsAndTotals(xml: string): UblValidationResult {
  const errors: string[] = [];
  try {
    assertSafeXml(xml);
  } catch (error) {
    return { valid: false, errors: [(error as Error).message] };
  }
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) errors.push("XML mal formado");
  const root = doc.documentElement;
  if (!root) return { valid: false, errors: ["XML sin elemento raíz"] };
  const expectedNs = `urn:oasis:names:specification:ubl:schema:xsd:${root.localName}-2`;
  if (root.namespaceURI !== expectedNs) errors.push("Namespace raíz UBL incorrecto");
  const issueDate = text(doc, "IssueDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || Number.isNaN(Date.parse(`${issueDate}T00:00:00Z`)))
    errors.push("Fecha de emisión inválida");
  const type = root.localName === "CreditNote" ? "07" : text(doc, "InvoiceTypeCode");
  if (!allowedDocumentTypes.has(type)) errors.push("Tipo de documento fuera del catálogo 01");
  if (!allowedCurrencies.has(text(doc, "DocumentCurrencyCode")))
    errors.push("Moneda fuera del catálogo 02");
  for (const element of Array.from(doc.getElementsByTagNameNS("*", "InvoicedQuantity")))
    if (!allowedUnits.has(element.getAttribute("unitCode") || ""))
      errors.push("Unidad fuera del catálogo 03");
  for (const element of Array.from(doc.getElementsByTagNameNS("*", "CreditedQuantity")))
    if (!allowedUnits.has(element.getAttribute("unitCode") || ""))
      errors.push("Unidad fuera del catálogo 03");
  if (type === "07") {
    if (!allowedCreditReasons.has(text(doc, "ResponseCode")))
      errors.push("Motivo fuera del catálogo 09");
    const related = text(doc, "ReferenceID");
    if (!/^[FB][A-Z0-9]{3}-\d+$/.test(related)) errors.push("Documento original mal referenciado");
    if (related !== text(doc, "ID") && !xml.includes(`<cbc:ID>${related}</cbc:ID>`))
      errors.push("La referencia al documento original no coincide");
  }
  const payable = Number(text(doc, "PayableAmount"));
  const lineSum = Array.from(doc.getElementsByTagNameNS("*", "LineExtensionAmount"))
    .slice(1)
    .reduce((sum, node) => sum + Number(node.textContent || 0), 0);
  const igv = Number(text(doc, "TaxAmount"));
  if (![payable, lineSum, igv].every(Number.isFinite) || Math.abs(lineSum + igv - payable) > 0.02)
    errors.push("Totales inconsistentes");
  const signature = doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature");
  if (signature.length && signature.item(0)?.parentNode?.localName !== "ExtensionContent")
    errors.push("Firma XMLDSig mal ubicada");
  return { valid: errors.length === 0, errors };
}

export async function validateOfficialXsd(xml: string): Promise<UblValidationResult> {
  const structural = validateSunatCatalogsAndTotals(xml);
  if (!structural.valid) return structural;
  const rootElement = new DOMParser().parseFromString(xml, "application/xml").documentElement;
  if (!rootElement) return { valid: false, errors: ["XML sin elemento raíz"] };
  const root = rootElement.localName;
  const schemaName = root === "CreditNote" ? "UBL-CreditNote-2.1.xsd" : "UBL-Invoice-2.1.xsd";
  const schemaPath = path.resolve(
    "resources",
    "sunat",
    "xsd-2.1-2022-02-28",
    "Archivos XSD",
    "2.1",
    "maindoc",
    schemaName,
  );
  const safeOptions =
    ParseOption.XML_PARSE_NONET |
    ParseOption.XML_PARSE_NO_XXE |
    ParseOption.XML_PARSE_NO_SYS_CATALOG;
  let schemaDoc: XmlDocument | undefined;
  let xmlDoc: XmlDocument | undefined;
  let validator: XsdValidator | undefined;
  try {
    const schemaUrl = path.relative(process.cwd(), schemaPath).replaceAll("\\", "/");
    schemaDoc = XmlDocument.fromBuffer(await readFile(schemaPath), {
      url: schemaUrl,
      option: safeOptions,
    });
    validator = XsdValidator.fromDoc(schemaDoc);
    xmlDoc = XmlDocument.fromString(xml, { option: safeOptions });
    validator.validate(xmlDoc);
    return structural;
  } catch (error) {
    return { valid: false, errors: [...structural.errors, `XSD: ${(error as Error).message}`] };
  } finally {
    xmlDoc?.dispose();
    validator?.dispose();
    schemaDoc?.dispose();
  }
}

export function validateSunatFileName(name: string) {
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  return /^\d{11}-(?:01|03|07)-[FB][A-Z0-9]{3}-\d+\.xml$/.test(name);
}
