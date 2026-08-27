import type { PaymentGateway } from "./payment-gateway.ts";
import type {
  CommerceOrderSnapshot,
  InternalCommerceEvent,
  PaymentAttemptSnapshot,
  PaymentRequest,
  VerifiedPayment,
} from "./types.ts";

export type ConfirmationResult = {
  changed: boolean;
  events: InternalCommerceEvent[];
};

export class PaymentFlow {
  private readonly gateway: PaymentGateway;
  constructor(gateway: PaymentGateway) {
    this.gateway = gateway;
  }

  async prepare(request: PaymentRequest, attempt: PaymentAttemptSnapshot) {
    if (attempt.externalId) throw new Error("payment_attempt_already_prepared");
    const session = await this.gateway.createPayment(request);
    attempt.externalId = session.externalId;
    attempt.status = session.status;
    return session;
  }

  async acceptBrowserReturn(input: unknown) {
    const result = await this.gateway.verifyReturn(input);
    return { ...result, paymentConfirmed: false as const };
  }

  async acceptWebhook(
    input: { rawBody: string; headers: Readonly<Record<string, string>> },
    order: CommerceOrderSnapshot,
    attempt: PaymentAttemptSnapshot,
    now = new Date(),
  ): Promise<ConfirmationResult> {
    return this.applyVerified(await this.gateway.verifyWebhook(input), order, attempt, now);
  }

  async refreshServerSide(
    order: CommerceOrderSnapshot,
    attempt: PaymentAttemptSnapshot,
    now = new Date(),
  ): Promise<ConfirmationResult> {
    if (!attempt.externalId) throw new Error("payment_attempt_not_prepared");
    return this.applyVerified(
      await this.gateway.getPaymentStatus(attempt.externalId),
      order,
      attempt,
      now,
    );
  }

  private applyVerified(
    verified: VerifiedPayment,
    order: CommerceOrderSnapshot,
    attempt: PaymentAttemptSnapshot,
    now: Date,
  ): ConfirmationResult {
    if (!verified.signatureValid) throw new Error("invalid_payment_signature");
    if (verified.orderCode !== order.code) throw new Error("payment_order_mismatch");
    if (verified.amountMinor !== order.amountMinor) throw new Error("payment_amount_mismatch");
    if (verified.currency !== order.currency) throw new Error("payment_currency_mismatch");
    if (attempt.externalId && verified.externalId !== attempt.externalId)
      throw new Error("payment_external_id_mismatch");
    if (attempt.processedExternalEvents.has(verified.eventId))
      return { changed: false, events: [] };

    if (verified.status !== "approved") {
      attempt.status = verified.status;
      if (verified.status === "expired") {
        order.status = "expired";
        if (order.reservationStatus === "active") order.reservationStatus = "expired";
      } else if (verified.status === "cancelled") {
        order.status = "cancelled";
        if (order.reservationStatus === "active") order.reservationStatus = "released";
      } else if (verified.status === "rejected") {
        order.status = "payment_failed";
        if (order.reservationStatus === "active") order.reservationStatus = "released";
      }
      attempt.processedExternalEvents.add(verified.eventId);
      return { changed: true, events: [] };
    }

    if (
      order.reservationStatus === "active" &&
      order.reservationExpiresAt &&
      new Date(order.reservationExpiresAt) <= now
    )
      throw new Error("inventory_reservation_expired");
    if (order.status === "paid") {
      attempt.processedExternalEvents.add(verified.eventId);
      return { changed: false, events: [] };
    }

    order.status = "paid";
    attempt.status = "approved";
    if (order.reservationStatus === "active") order.reservationStatus = "consumed";
    attempt.processedExternalEvents.add(verified.eventId);

    const base = {
      aggregateId: order.id,
      occurredAt: now.toISOString(),
      payload: { orderId: order.id, orderCode: order.code, paymentExternalId: verified.externalId },
    };
    const events: InternalCommerceEvent[] = [
      {
        ...base,
        type: "payment_confirmed",
        idempotencyKey: `payment_confirmed:${verified.eventId}`,
      },
      { ...base, type: "sale_confirmed", idempotencyKey: `sale_confirmed:${order.id}` },
      {
        ...base,
        type: "tax_document_requested",
        idempotencyKey: `tax_document_requested:${order.id}`,
      },
    ];
    if (order.hasCourse)
      events.push({
        ...base,
        type: "course_enrollment_requested",
        idempotencyKey: `course_enrollment_requested:${order.id}`,
      });
    return { changed: true, events };
  }
}

export function courseFulfillment(input: { hasKit: boolean }) {
  return input.hasKit
    ? { requiresAddress: true, requiresInventory: true, grantBeforePayment: false }
    : { requiresAddress: false, requiresInventory: false, grantBeforePayment: false };
}

export class AtomicInventory {
  private locks = new Map<string, Promise<void>>();
  private stock: Record<string, number>;
  constructor(stock: Record<string, number>) {
    this.stock = stock;
  }
  async reserve(sku: string, quantity: number): Promise<boolean> {
    const previous = this.locks.get(sku) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    this.locks.set(
      sku,
      previous.then(() => current),
    );
    await previous;
    try {
      if ((this.stock[sku] ?? 0) < quantity) return false;
      this.stock[sku] -= quantity;
      return true;
    } finally {
      release();
    }
  }
}
