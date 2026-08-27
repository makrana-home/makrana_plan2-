import type { PaymentGateway } from "./payment-gateway.ts";
import type { PaymentRequest, PaymentSession, VerifiedPayment } from "./types.ts";

const unavailable = (): never => {
  throw new Error(
    "EasyPay no está conectado: faltan documentación oficial, sandbox, endpoints y esquema de firma.",
  );
};

/**
 * Deliberately non-operational adapter. It prevents guessed EasyPay requests from
 * reaching the network until the official contract and credentials are supplied.
 */
export class EasyPayGateway implements PaymentGateway {
  readonly provider = "easypay";
  createPayment(_request: PaymentRequest): Promise<PaymentSession> {
    return Promise.reject(unavailable());
  }
  getPaymentStatus(_externalId: string): Promise<VerifiedPayment> {
    return Promise.reject(unavailable());
  }
  verifyReturn(_input: unknown): Promise<{ orderCode: string | null; trusted: false }> {
    return Promise.resolve({ orderCode: null, trusted: false });
  }
  verifyWebhook(_input: {
    rawBody: string;
    headers: Readonly<Record<string, string>>;
  }): Promise<VerifiedPayment> {
    return Promise.reject(unavailable());
  }
}
