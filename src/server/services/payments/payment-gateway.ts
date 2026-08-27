import type { PaymentRequest, PaymentSession, VerifiedPayment } from "./types.ts";

/** Provider-neutral boundary. Browser return data must never confirm a payment. */
export interface PaymentGateway {
  readonly provider: string;
  createPayment(request: PaymentRequest): Promise<PaymentSession>;
  getPaymentStatus(externalId: string): Promise<VerifiedPayment>;
  verifyReturn(input: unknown): Promise<{ orderCode: string | null; trusted: false }>;
  verifyWebhook(input: {
    rawBody: string;
    headers: Readonly<Record<string, string>>;
  }): Promise<VerifiedPayment>;
  cancelPayment?(externalId: string): Promise<PaymentSession>;
}
