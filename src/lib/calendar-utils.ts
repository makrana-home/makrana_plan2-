import { addDays, addMinutes, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";

export const CALENDAR_TIMEZONE = "America/Lima";

export function limaLocalToUtc(value: string) {
  if (!value) return "";
  return new Date(`${value}:00-05:00`).toISOString();
}

export function utcToLimaLocal(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function limaDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatCalendarDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: CALENDAR_TIMEZONE,
    ...options,
  }).format(new Date(value));
}

export function calendarMonthDays(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function calendarWeekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function effectiveInterval(event: {
  starts_at: string;
  ends_at: string;
  preparation_minutes?: number | null;
  travel_minutes?: number | null;
}) {
  const preparation = Number(event.preparation_minutes ?? 0);
  const travel = Number(event.travel_minutes ?? 0);
  return {
    start: addMinutes(new Date(event.starts_at), -(preparation + travel)),
    end: addMinutes(new Date(event.ends_at), travel),
  };
}

export function intervalsOverlap(
  left: { start: Date; end: Date },
  right: { start: Date; end: Date },
) {
  return left.start < right.end && left.end > right.start;
}

export function statusLabel(status: string) {
  return (
    {
      pending_confirmation: "Pendiente de confirmación",
      confirmed: "Confirmado",
      rescheduled: "Reprogramado",
      completed: "Completado",
      cancelled: "Cancelado",
    }[status] ?? status
  );
}

export function modalityLabel(modality: string) {
  return (
    { virtual: "Virtual", presencial: "Presencial", entrega: "Entrega", interna: "Interna" }[
      modality
    ] ?? modality
  );
}
