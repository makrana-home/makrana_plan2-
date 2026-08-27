import { createHash } from "node:crypto";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import type { SignedXmlResult, XmlSigner } from "./types.ts";
import { assertSafeXml } from "./xml-validator.ts";

export class MockXmlSigner implements XmlSigner {
  async sign(xml: string): Promise<SignedXmlResult> {
    const digest = createHash("sha256").update(xml).digest("base64");
    const signature = `MOCK-${digest}`;
    const signedXml = xml.replace(
      /<([^!?][^ >]*)/,
      `<$1><!-- FIRMA SIMULADA: NO VALIDA PARA SUNAT --><Signature>${signature}</Signature>`,
    );
    return {
      signedXml,
      digest,
      signature,
      hash: createHash("sha256").update(signedXml).digest("hex"),
    };
  }
}

export type Pkcs12SignerOptions = {
  pkcs12Base64: string;
  password: string;
  expectedRuc: string;
  now?: Date;
};

export class Pkcs12XmlSigner implements XmlSigner {
  private readonly options: Pkcs12SignerOptions;
  constructor(options: Pkcs12SignerOptions) {
    this.options = options;
  }

  async sign(xml: string): Promise<SignedXmlResult> {
    assertSafeXml(xml);
    const signableXml = xml.replace("<makrana:PendingSignature/>", "");
    const p12Buffer = Buffer.from(this.options.pkcs12Base64, "base64");
    let privateKeyPem = "";
    try {
      const asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, this.options.password);
      const keyBag =
        p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
          forge.pki.oids.pkcs8ShroudedKeyBag
        ]?.[0] ?? p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
      const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
      if (!keyBag?.key || !certBag?.cert)
        throw new Error("PKCS#12 no contiene certificado y clave privada");
      const now = this.options.now ?? new Date();
      if (now < certBag.cert.validity.notBefore)
        throw new Error("El certificado aún no está vigente");
      if (now > certBag.cert.validity.notAfter) throw new Error("El certificado está vencido");
      const identity = certBag.cert.subject.attributes.map((x) => String(x.value)).join(" ");
      if (!identity.includes(this.options.expectedRuc))
        throw new Error("El certificado no corresponde al RUC configurado");
      privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
      const certificatePem = forge.pki.certificateToPem(certBag.cert);
      const signer = new SignedXml({
        privateKey: privateKeyPem,
        publicCert: certificatePem,
        signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
        canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
      });
      signer.addReference({
        xpath: "/*",
        transforms: [
          "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
          "http://www.w3.org/2001/10/xml-exc-c14n#",
        ],
        digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
      });
      signer.computeSignature(signableXml, {
        location: { reference: "//*[local-name()='ExtensionContent']", action: "append" },
        prefix: "ds",
      });
      const signedXml = signer.getSignedXml();
      const digest = createHash("sha256").update(signableXml).digest("base64");
      return {
        signedXml,
        digest,
        signature: signer.getSignatureXml(),
        hash: createHash("sha256").update(signedXml).digest("hex"),
      };
    } catch (error) {
      const message =
        error instanceof Error && /vigente|vencido|RUC|contiene/.test(error.message)
          ? error.message
          : "Certificado PKCS#12 o contraseña inválidos";
      throw new Error(message);
    } finally {
      p12Buffer.fill(0);
      privateKeyPem = "";
    }
  }
}
