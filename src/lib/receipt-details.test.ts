import assert from "node:assert/strict";
import test from "node:test";
import { getReceiptDeliveryDate, hasReceiptDiscount } from "./receipt-details.ts";

const event = (starts_at: string, status = "confirmed", slug = "entrega") => ({
  starts_at,
  status,
  event_type: { slug },
});

test("fecha de entrega: usa la siguiente entrega activa, excluye canceladas y otros eventos", () => {
  const expected = getReceiptDeliveryDate({ calendar_events: [event("2026-09-20T15:00:00Z")] });
  const sale = {
    calendar_events: [
      event("2026-09-18T15:00:00Z", "cancelled"),
      event("2026-09-19T15:00:00Z", "confirmed", "instalacion"),
      event("2026-09-22T15:00:00Z"),
      event("2026-09-20T15:00:00Z", "rescheduled"),
    ],
  };
  assert.equal(getReceiptDeliveryDate(sale), expected);
  assert.equal(sale.calendar_events[0].status, "cancelled");
});

test("fecha de entrega: conserva la última completada y prioriza una nueva entrega agendada", () => {
  const completed = event("2026-09-20T15:00:00Z", "completed");
  const calendar_events = [completed, event("2026-09-18T15:00:00Z", "completed")];
  assert.equal(
    getReceiptDeliveryDate({ calendar_events }),
    getReceiptDeliveryDate({ calendar_events: [completed] }),
  );
  const pending = event("2026-09-25T15:00:00Z", "pending_confirmation");
  assert.equal(
    getReceiptDeliveryDate({ calendar_events: [...calendar_events, pending] }),
    getReceiptDeliveryDate({ calendar_events: [pending] }),
  );
});

test("fecha de entrega: no inventa fechas y siempre muestra el horario de Lima", () => {
  assert.equal(getReceiptDeliveryDate(), null);
  assert.equal(
    getReceiptDeliveryDate({
      calendar_events: [event("invalid"), event("2026-09-20T15:00:00Z", "cancelled")],
    }),
    null,
  );
  const date = getReceiptDeliveryDate({ calendar_events: [event("2026-09-21T02:00:00Z")] });
  assert.match(date!, /20/);
  assert.doesNotMatch(date!, /\d+:\d+/);
  const internalDate = getReceiptDeliveryDate(
    { calendar_events: [event("2026-09-21T02:00:00Z")] },
    true,
  );
  assert.match(internalDate!, /20/);
  assert.match(internalDate!, /9:00 p\. m\./);
});

test("descuento: solo se muestra para importes positivos", () => {
  for (const value of [undefined, null, "", 0, "0", "0.00", -1, NaN, Infinity, "invalid"]) {
    assert.equal(hasReceiptDiscount(value), false);
  }
  for (const value of [0.01, 10, "25.50"]) assert.equal(hasReceiptDiscount(value), true);
});
