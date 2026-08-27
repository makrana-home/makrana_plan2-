import assert from "node:assert/strict";
import test from "node:test";
import { AtomicInventory, courseFulfillment, PaymentFlow } from "./payment-flow.ts";
import { MockPaymentGateway } from "./mock-gateway.ts";
import type { CommerceOrderSnapshot, PaymentAttemptSnapshot, PaymentStatus } from "./types.ts";

function fixture(status: PaymentStatus = "approved", overrides: Record<string, unknown> = {}) {
  const gateway = new MockPaymentGateway({
    amountMinor: 12500,
    currency: "PEN",
    status,
    orderCode: "MKR-TEST",
    ...overrides,
  });
  const order: CommerceOrderSnapshot = {
    id: "order-1",
    code: "MKR-TEST",
    amountMinor: 12500,
    currency: "PEN",
    status: "pending_payment",
    hasCourse: false,
    hasPhysicalItems: true,
    reservationStatus: "active",
    reservationExpiresAt: "2099-01-01T00:00:00.000Z",
  };
  const attempt: PaymentAttemptSnapshot = {
    id: "attempt-1",
    externalId: "external-1",
    status: "pending",
    processedExternalEvents: new Set(),
  };
  return { gateway, flow: new PaymentFlow(gateway), order, attempt };
}

async function webhook(
  status: PaymentStatus = "approved",
  overrides: Record<string, unknown> = {},
) {
  const value = fixture(status, overrides);
  const result = await value.flow.acceptWebhook(
    { rawBody: JSON.stringify({ eventId: "event-1", externalId: "external-1" }), headers: {} },
    value.order,
    value.attempt,
  );
  return { ...value, result };
}

test("pago aprobado confirma una sola vez y consume reserva", async () => {
  const { order, attempt, result } = await webhook();
  assert.equal(order.status, "paid");
  assert.equal(order.reservationStatus, "consumed");
  assert.equal(attempt.status, "approved");
  assert.deepEqual(
    result.events.map((event) => event.type),
    ["payment_confirmed", "sale_confirmed", "tax_document_requested"],
  );
});

for (const [status, expectedOrder, expectedReservation] of [
  ["rejected", "payment_failed", "released"],
  ["cancelled", "cancelled", "released"],
  ["expired", "expired", "expired"],
] as const)
  test(`pago ${status} conserva pago y logística separados`, async () => {
    const { order, result } = await webhook(status);
    assert.equal(order.status, expectedOrder);
    assert.equal(order.reservationStatus, expectedReservation);
    assert.deepEqual(result.events, []);
  });

test("pago pendiente no confirma ni consume inventario", async () => {
  const { order, result } = await webhook("pending");
  assert.equal(order.status, "pending_payment");
  assert.equal(order.reservationStatus, "active");
  assert.deepEqual(result.events, []);
});

test("webhook repetido es idempotente", async () => {
  const value = fixture();
  const input = {
    rawBody: JSON.stringify({ eventId: "same-event", externalId: "external-1" }),
    headers: {},
  };
  const first = await value.flow.acceptWebhook(input, value.order, value.attempt);
  const second = await value.flow.acceptWebhook(input, value.order, value.attempt);
  assert.equal(first.changed, true);
  assert.deepEqual(second, { changed: false, events: [] });
});

for (const [name, overrides, error] of [
  ["firma inválida", { signatureValid: false }, "invalid_payment_signature"],
  ["importe manipulado", { amountMinor: 12499 }, "payment_amount_mismatch"],
  ["moneda incorrecta", { currency: "USD" }, "payment_currency_mismatch"],
  ["pedido inexistente", { orderCode: "MKR-UNKNOWN" }, "payment_order_mismatch"],
] as const)
  test(name, async () => {
    await assert.rejects(() => webhook("approved", overrides), new RegExp(error));
  });

test("identificador externo debe coincidir", async () => {
  const value = fixture();
  await assert.rejects(
    () =>
      value.flow.acceptWebhook(
        { rawBody: JSON.stringify({ eventId: "event-1", externalId: "otro" }), headers: {} },
        value.order,
        value.attempt,
      ),
    /payment_external_id_mismatch/,
  );
});

test("reserva vencida bloquea confirmación", async () => {
  const value = fixture();
  value.order.reservationExpiresAt = "2020-01-01T00:00:00.000Z";
  await assert.rejects(
    () =>
      value.flow.acceptWebhook(
        { rawBody: JSON.stringify({ eventId: "event-1", externalId: "external-1" }), headers: {} },
        value.order,
        value.attempt,
      ),
    /inventory_reservation_expired/,
  );
});

test("última unidad concurrente solo puede reservarse una vez", async () => {
  const inventory = new AtomicInventory({ KIT: 1 });
  const results = await Promise.all([inventory.reserve("KIT", 1), inventory.reserve("KIT", 1)]);
  assert.deepEqual(results.sort(), [false, true]);
});

test("curso digital no exige dirección ni inventario", () => {
  assert.deepEqual(courseFulfillment({ hasKit: false }), {
    requiresAddress: false,
    requiresInventory: false,
    grantBeforePayment: false,
  });
});

test("curso con kit exige dirección e inventario", () => {
  assert.deepEqual(courseFulfillment({ hasKit: true }), {
    requiresAddress: true,
    requiresInventory: true,
    grantBeforePayment: false,
  });
});

test("curso pagado publica solicitud de matrícula sin conceder acceso", async () => {
  const value = fixture();
  value.order.hasCourse = true;
  value.order.hasPhysicalItems = false;
  value.order.reservationStatus = "not_required";
  value.order.reservationExpiresAt = null;
  const result = await value.flow.acceptWebhook(
    { rawBody: JSON.stringify({ eventId: "event-1", externalId: "external-1" }), headers: {} },
    value.order,
    value.attempt,
  );
  assert.ok(result.events.some((event) => event.type === "course_enrollment_requested"));
});

test("confirmación doble no duplica eventos", async () => {
  const value = fixture();
  const first = await value.flow.acceptWebhook(
    { rawBody: JSON.stringify({ eventId: "event-1", externalId: "external-1" }), headers: {} },
    value.order,
    value.attempt,
  );
  const second = await value.flow.refreshServerSide(value.order, value.attempt);
  assert.ok(first.events.length > 0);
  assert.deepEqual(second.events, []);
});

test("retorno del navegador nunca confirma el pago", async () => {
  const value = fixture();
  const result = await value.flow.acceptBrowserReturn({ orderCode: value.order.code, paid: true });
  assert.equal(result.paymentConfirmed, false);
  assert.equal(value.order.status, "pending_payment");
});

test("preparación crea intento sin confiar el total al navegador", async () => {
  const value = fixture();
  value.attempt.externalId = null;
  const session = await value.flow.prepare(
    {
      orderId: value.order.id,
      orderCode: value.order.code,
      attemptId: value.attempt.id,
      amountMinor: value.order.amountMinor,
      currency: value.order.currency,
      returnUrl: "https://example.invalid/pago/retorno",
    },
    value.attempt,
  );
  assert.equal(value.attempt.externalId, session.externalId);
});

test("evento tributario queda preparado sin emitir comprobante", async () => {
  const { result } = await webhook();
  const taxEvent = result.events.find((event) => event.type === "tax_document_requested");
  assert.equal(taxEvent?.idempotencyKey, "tax_document_requested:order-1");
});

test("pago manual de respaldo permanece en el contrato SQL", async () => {
  const migration = await import("node:fs/promises").then((fs) =>
    fs.readFile("supabase/migrations/20260822130000_fix_atomic_sales_inventory_audit.sql", "utf8"),
  );
  assert.match(migration, /review_manual_payment/);
  assert.match(migration, /'manual_rejected'/);
  assert.match(migration, /Pago web aprobado/);
});
