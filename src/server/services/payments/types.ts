export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";

export type PaymentRequest = {
  orderId: string;
  orderCode: string;
  attemptId: string;
  amountMinor: number;
  currency: "PEN";
  returnUrl: string;
};

export type PaymentSession = {
  externalId: string;
  status: PaymentStatus;
  paymentUrl: string | null;
  expiresAt: string | null;
};

export type VerifiedPayment = {
  eventId: string;
  externalId: string;
  orderCode: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  signatureValid: boolean;
};

export type InternalCommerceEvent = {
  idempotencyKey: string;
  aggregateId: string;
  occurredAt: string;
  type:
    | "payment_confirmed"
    | "sale_confirmed"
    | "course_enrollment_requested"
    | "tax_document_requested";
  payload: Readonly<Record<string, string | number | boolean | null>>;
};

export type CommerceOrderSnapshot = {
  id: string;
  code: string;
  amountMinor: number;
  currency: "PEN";
  status: "pending_payment" | "paid" | "payment_failed" | "cancelled" | "expired";
  hasCourse: boolean;
  hasPhysicalItems: boolean;
  reservationStatus: "not_required" | "active" | "consumed" | "released" | "expired";
  reservationExpiresAt: string | null;
};

export type PaymentAttemptSnapshot = {
  id: string;
  externalId: string | null;
  status: PaymentStatus;
  processedExternalEvents: Set<string>;
};
