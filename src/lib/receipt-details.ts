type DeliveryEvent = {
  starts_at?: string | null;
  status?: string;
  event_type?: { slug?: string } | null;
};

export function getReceiptDeliveryDate(sale?: { calendar_events?: DeliveryEvent[] } | null) {
  const deliveries = (sale?.calendar_events ?? [])
    .filter(
      (event) =>
        event.event_type?.slug === "entrega" &&
        event.starts_at &&
        Number.isFinite(Date.parse(event.starts_at)),
    )
    .sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!));
  const scheduled = deliveries.find((event) =>
    ["pending_confirmation", "confirmed", "rescheduled"].includes(event.status ?? ""),
  );
  const completed = deliveries.filter((event) => event.status === "completed").at(-1);
  const date = (scheduled ?? completed)?.starts_at;
  if (!date) return null;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(date));
}

export function hasReceiptDiscount(discount: unknown) {
  const amount = Number(discount);
  return Number.isFinite(amount) && amount > 0;
}
