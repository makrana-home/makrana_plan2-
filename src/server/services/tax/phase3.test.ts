import assert from "node:assert/strict";
import test from "node:test";
import forge from "node-forge";
import { calculateIncludedIgv } from "./tax-calculator.ts";
import { buildInvoiceUbl } from "./ubl-builder.ts";
import { Pkcs12XmlSigner } from "./xml-signer.ts";
import { SoapSunatClient, SUNAT_BETA_ENDPOINT } from "./sunat-client.ts";
import {
  assertSafeXml,
  validateOfficialXsd,
  validateSunatCatalogsAndTotals,
  validateSunatFileName,
} from "./xml-validator.ts";

function fixture(type: "01" | "03" | "07" = "01") {
  return buildInvoiceUbl({
    ruc: "20123456789",
    legalName: "Makrana Ficticia",
    type,
    series: type === "01" ? "F001" : type === "03" ? "B001" : "FC01",
    number: 1,
    issueDate: "2026-08-20",
    customerDocumentType: type === "03" ? "1" : "6",
    customerDocumentNumber: type === "03" ? "12345678" : "20987654321",
    customerName: "Cliente Ficticio",
    totals: calculateIncludedIgv([
      { description: "Macramé ficticio", quantity: 1, unitPriceCents: 11800 },
    ]),
    relatedDocument: type === "07" ? "F001-1" : undefined,
    creditReasonCode: type === "07" ? "07" : undefined,
    creditReason: type === "07" ? "Devolución ficticia" : undefined,
  });
}

test("rechaza XXE, tamaño y nombres con traversal", () => {
  assert.throws(() =>
    assertSafeXml("<!DOCTYPE x [<!ENTITY e SYSTEM 'file:///etc/passwd'>]><x>&e;</x>"),
  );
  assert.throws(() => assertSafeXml(`<x>${"a".repeat(2 * 1024 * 1024)}</x>`));
  assert.equal(validateSunatFileName("20123456789-01-F001-1.xml"), true);
  assert.equal(validateSunatFileName("../20123456789-01-F001-1.xml"), false);
});

test("valida catálogos, namespace, fecha, total, referencia y ubicación de firma", () => {
  const valid = fixture();
  assert.equal(validateSunatCatalogsAndTotals(valid).valid, true);
  for (const invalid of [
    valid.replace("Invoice-2", "Invoice-X"),
    valid.replace("2026-08-20", "2026-99-99"),
    valid.replace("<cbc:DocumentCurrencyCode>PEN", "<cbc:DocumentCurrencyCode>XXX"),
    valid.replace('unitCode="NIU"', 'unitCode="BAD"'),
    valid.replace(
      '<cbc:PayableAmount currencyID="PEN">118.00',
      '<cbc:PayableAmount currencyID="PEN">999.00',
    ),
  ])
    assert.equal(validateSunatCatalogsAndTotals(invalid).valid, false);
  assert.equal(validateSunatCatalogsAndTotals(fixture("07").replace("F001-1", "MAL")).valid, false);
});

test("valida factura contra el XSD UBL 2.1 oficial y rechaza obligatorio ausente", async () => {
  assert.equal((await validateOfficialXsd(fixture())).valid, true);
  const missingId = fixture().replace(/<cbc:ID>F001-1<\/cbc:ID>/, "");
  const result = await validateOfficialXsd(missingId);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /XSD|ID/);
});

test("firma PKCS#12 ficticia en UBLExtensions y rechaza identidad incorrecta", async () => {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-01-01T00:00:00Z");
  cert.validity.notAfter = new Date("2027-01-01T00:00:00Z");
  cert.setSubject([{ name: "commonName", value: "RUC 20123456789 CERTIFICADO FICTICIO" }]);
  cert.setIssuer(cert.subject.attributes);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const password = "solo-testing";
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: "3des" });
  const base64 = forge.util.encode64(forge.asn1.toDer(p12).getBytes());
  const signed = await new Pkcs12XmlSigner({
    pkcs12Base64: base64,
    password,
    expectedRuc: "20123456789",
    now: new Date("2026-08-20T00:00:00Z"),
  }).sign(fixture());
  assert.match(signed.signedXml, /<ds:Signature/);
  assert.match(signed.signedXml, /<ext:ExtensionContent><ds:Signature/);
  await assert.rejects(
    () =>
      new Pkcs12XmlSigner({ pkcs12Base64: base64, password, expectedRuc: "20999999999" }).sign(
        fixture(),
      ),
    /RUC/,
  );
});

test("prepara SOAP con WS-Security, tickets, timeout y errores sin llamada real", async () => {
  const requests: Array<{ operation: string; body: string }> = [];
  const client = new SoapSunatClient({
    endpoint: SUNAT_BETA_ENDPOINT,
    username: "USUARIO_FICTICIO",
    password: "CLAVE_FICTICIA",
    transport: async (request) => {
      requests.push(request);
      return { status: 200, body: "<ticket>FICTICIO</ticket>" };
    },
  });
  assert.equal((await client.sendBill("f.zip", "RklDVElDSU8=")).kind, "ok");
  assert.equal((await client.sendSummary("r.zip", "RklDVElDSU8=")).kind, "ok");
  assert.equal((await client.getStatus("TICKET-FICTICIO")).kind, "ok");
  assert.equal(requests.length, 3);
  assert.match(requests[0]!.body, /UsernameToken/);
  assert.equal(requests[0]!.body.includes("CLAVE_FICTICIA"), true);
  const timeout = new SoapSunatClient({
    endpoint: SUNAT_BETA_ENDPOINT,
    username: "x",
    password: "x",
    transport: async () => {
      const error = new Error("timeout") as NodeJS.ErrnoException;
      error.code = "ETIMEDOUT";
      throw error;
    },
  });
  assert.equal((await timeout.sendBill("x.zip", "eA==")).code, "TIMEOUT");
});
