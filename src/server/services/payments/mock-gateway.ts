import type { PaymentGateway } from "./payment-gateway.ts";
import type { PaymentRequest, PaymentSession, PaymentStatus, VerifiedPayment } from "./types.ts";

export class MockPaymentGateway implements PaymentGateway {
  readonly provider = "mock";
  private sequence = 0;
  private result: Omit<
    VerifiedPayment,
    "eventId" | "externalId" | "orderCode" | "signatureValid"
  > & {
    orderCode?: string;
    signatureValid?: boolean;
  };
  constructor(result: MockPaymentGateway["result"]) {
    this.result = result;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentSession> {
    this.sequence += 1;
    return {
      externalId: `mock-${request.attemptId}-${this.sequence}`,
      status: "pending",
      paymentUrl: `https://mock.invalid/pay/${request.attemptId}`,
      expiresAt: null,
    };
  }

  async getPaymentStatus(externalId: string): Promise<VerifiedPayment> {
    return this.verified(externalId, `status-${externalId}`);
  }

  async verifyReturn(input: unknown): Promise<{ orderCode: string | null; trusted: false }> {
    const orderCode =
      typeof input === "object" && input !== null && "orderCode" in input
        ? String((input as { orderCode: unknown }).orderCode)
        : null;
    return { orderCode, trusted: false };
  }

  async verifyWebhook(input: {
    rawBody: string;
    headers: Readonly<Record<string, string>>;
  }): Promise<VerifiedPayment> {
    const parsed = JSON.parse(input.rawBody) as { eventId?: string; externalId?: string };
    return this.verified(parsed.externalId ?? "mock-external", parsed.eventId ?? "mock-event");
  }

  async cancelPayment(externalId: string): Promise<PaymentSession> {
    return { externalId, status: "cancelled", paymentUrl: null, expiresAt: null };
  }

  setStatus(status: PaymentStatus): void {
    this.result.status = status;
  }

  private verified(externalId: string, eventId: string): VerifiedPayment {
    return {
      eventId,
      externalId,
      orderCode: this.result.orderCode ?? "MKR-TEST",
      amountMinor: this.result.amountMinor,
      currency: this.result.currency,
      status: this.result.status,
      signatureValid: this.result.signatureValid ?? true,
    };
  }
}
