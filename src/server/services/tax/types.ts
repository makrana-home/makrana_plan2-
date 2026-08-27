export type TaxEnvironment = "mock" | "beta" | "production";
export type TaxDocumentType = "01" | "03" | "07" | "08";

export interface TaxLineInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
  internalCode?: string | null;
  productId?: string | null;
}

export interface CalculatedTaxLine extends TaxLineInput {
  unitValueCents: number;
  saleValueCents: number;
  igvCents: number;
  totalCents: number;
}

export interface CalculatedTaxDocument {
  lines: CalculatedTaxLine[];
  taxableCents: number;
  discountCents: number;
  igvCents: number;
  totalCents: number;
}

export interface SignedXmlResult {
  signedXml: string;
  digest: string;
  signature: string;
  hash: string;
}
export interface XmlSigner {
  sign(xml: string): Promise<SignedXmlResult>;
}
export interface SunatSendResult {
  status: "accepted" | "accepted_with_observations" | "rejected" | "connection_error";
  code: string;
  message: string;
  cdr: string | null;
  ticket?: string;
}
