import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListFilter,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader, FormDialog, formatDate, useDialog } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminGetCalendarAudit,
  adminListCalendarData,
  adminSaveCalendarEvent,
} from "@/lib/admin-calendar.functions";
import {
  calendarMonthDays,
  calendarWeekDays,
  formatCalendarDate,
  limaDateKey,
  limaLocalToUtc,
  modalityLabel,
  statusLabel,
  utcToLimaLocal,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/calendario")({
  component: CalendarPage,
});

type CalendarView = "month" | "week" | "day" | "upcoming";
type CalendarForm = {
  id?: string;
  title: string;
  event_type_id: string;
  notes: string;
  starts_local: string;
  ends_local: string;
  modality: "virtual" | "presencial" | "entrega" | "interna";
  address: string;
  status: "pending_confirmation" | "confirmed" | "rescheduled" | "completed" | "cancelled";
  customer_id: string;
  sale_id: string;
  product_id: string;
  responsible_user_id: string;
  preparation_minutes: string;
  travel_minutes: string;
  cancellation_reason: string;
};

const emptyFilters = {
  from: "",
  to: "",
  type: "all",
  status: "all",
  responsible: "all",
  customer: "all",
  sale: "all",
};

function CalendarPage() {
  const router = useRouter();
  const listData = useServerFn(adminListCalendarData);
  const saveEvent = useServerFn(adminSaveCalendarEvent);
  const getAudit = useServerFn(adminGetCalendarAudit);
  const formDialog = useDialog<any>();
  const detailDialog = useDialog<any>();
  const [data, setData] = useState<any>({
    events: [],
    eventTypes: [],
    customers: [],
    sales: [],
    products: [],
    staff: [],
    roles: [],
    currentUserRoles: [],
  });
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [form, setForm] = useState<CalendarForm>(() => newForm(new Date(), ""));
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [pendingSchedule, setPendingSchedule] = useState<any>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const from = subMonths(startOfMonth(anchor), 1).toISOString();
      const to = addMonths(endOfMonth(anchor), 3).toISOString();
      const next = await listData({ data: { from, to } });
      setData(next);
      const params = new URLSearchParams(window.location.search);
      const linkedSale = params.get("sale");
      const scheduleType = params.get("schedule");
      const pickType = params.get("pick");
      const returnTo = params.get("returnTo");
      const linkedEvent = params.get("event");
      // Al llegar desde una venta mantenemos la agenda completa visible para comparar
      // horarios y evitar que las demás reuniones queden ocultas por un filtro automático.
      if (linkedSale) {
        setFilters(emptyFilters);
        setSearch("");
      }
      if (pickType && linkedSale) {
        const sale = next.sales.find((item: any) => item.id === linkedSale);
        const type = next.eventTypes.find((item: any) => item.slug === pickType);
        setPendingSchedule({ sale, type, returnTo });
        setView("month");
      } else if (scheduleType && linkedSale) {
        const sale = next.sales.find((item: any) => item.id === linkedSale);
        const type = next.eventTypes.find((item: any) => item.slug === scheduleType);
        const draft = newForm(new Date(), next.currentUserId ?? "");
        draft.sale_id = linkedSale;
        draft.customer_id = sale?.customer_id ?? "";
        draft.event_type_id = type?.id ?? next.eventTypes[0]?.id ?? "";
        draft.title = saleEventTitle(sale, type);
        setForm(draft);
        formDialog.openWith(null);
      } else if (linkedEvent) {
        const event = next.events.find((item: any) => item.id === linkedEvent);
        if (event) void openDetail(event);
      }
      if (linkedSale || scheduleType || pickType || linkedEvent) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      if (!form.responsible_user_id && next.currentUserId) {
        setForm((current) => ({ ...current, responsible_user_id: next.currentUserId }));
      }
    } catch (caught: any) {
      setError(caught.message ?? "No se pudo cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [anchor.getFullYear(), anchor.getMonth()]);

  useEffect(() => {
    if (window.innerWidth < 640) setView("day");
  }, []);

  const filteredEvents = useMemo(() => {
    const term = normalize(search);
    return data.events.filter((event: any) => {
      const searchable = normalize(
        `${event.title} ${event.customer?.full_name ?? ""} ${event.product?.name ?? ""} ${event.product?.sku ?? ""} ${event.sale?.quote_number ?? ""} ${event.sale?.receipt?.number ?? ""}`,
      );
      return (
        (!term || searchable.includes(term)) &&
        (filters.type === "all" || event.event_type_id === filters.type) &&
        (filters.status === "all" || event.status === filters.status) &&
        (filters.responsible === "all" || event.responsible_user_id === filters.responsible) &&
        (filters.customer === "all" || event.customer_id === filters.customer) &&
        (filters.sale === "all" || event.sale_id === filters.sale) &&
        (!filters.from || limaDateKey(event.starts_at) >= filters.from) &&
        (!filters.to || limaDateKey(event.starts_at) <= filters.to)
      );
    });
  }, [data.events, search, filters]);

  const stats = useMemo(() => calculateStats(data.events), [data.events]);

  function openCreate(date = anchor) {
    const next = newForm(date, data.currentUserId ?? "");
    if (pendingSchedule?.sale) {
      next.sale_id = pendingSchedule.sale.id;
      next.customer_id = pendingSchedule.sale.customer_id ?? "";
      next.event_type_id = pendingSchedule.type?.id ?? data.eventTypes[0]?.id ?? "";
      next.title = saleEventTitle(pendingSchedule.sale, pendingSchedule.type);
    } else if (data.eventTypes[0]) next.event_type_id = data.eventTypes[0].id;
    setForm(next);
    formDialog.openWith(null);
  }

  function openEdit(event: any) {
    setForm(eventToForm(event));
    detailDialog.close();
    formDialog.openWith(event);
  }

  async function openDetail(event: any) {
    setAudit([]);
    detailDialog.openWith(event);
    try {
      setAudit(await getAudit({ data: { eventId: event.id } }));
    } catch (caught: any) {
      toast.error(caught.message ?? "No se pudo cargar el historial.");
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const result = await saveEvent({
        data: {
          event: payload,
          forceConflict: false,
        },
      });
      if (!result.saved) {
        setConflictResult({ ...result, payload });
        return;
      }
      toast.success(form.id ? "Evento actualizado" : "Evento creado");
      setConflictResult(null);
      formDialog.close();
      await refresh();
      if (pendingSchedule?.returnTo === "ventas" && pendingSchedule.sale?.id) {
        await router.navigate({
          to: "/admin/ventas",
          search: { sale: pendingSchedule.sale.id } as any,
        });
      }
    } catch (caught: any) {
      toast.error(caught.message ?? "No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit();
  }

  function move(direction: -1 | 1) {
    if (view === "month")
      setAnchor((current) => (direction > 0 ? addMonths(current, 1) : subMonths(current, 1)));
    else if (view === "week")
      setAnchor((current) => (direction > 0 ? addWeeks(current, 1) : subWeeks(current, 1)));
    else setAnchor((current) => addDays(current, direction));
  }

  const salesForCustomer = form.customer_id
    ? data.sales.filter((sale: any) => sale.customer_id === form.customer_id)
    : data.sales;
  const selectedSale = data.sales.find((sale: any) => sale.id === form.sale_id);
  const productsForSale = selectedSale
    ? (selectedSale.items?.map((item: any) => item.product).filter(Boolean) ?? [])
    : data.products;

  return (
    <div>
      <PageHeader
        eyebrow="Organización interna"
        title="Calendario y agenda"
        description="Coordina reuniones, avances, entregas e instalaciones sin cruces de horarios. Zona horaria: Lima, Perú."
        actions={
          <Button className="min-h-11 w-full rounded-full sm:w-auto" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> Crear evento
          </Button>
        }
      />

      <StatsGrid stats={stats} />

      {pendingSchedule && (
        <div className="mb-4 mt-4 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              Selecciona una fecha para {pendingSchedule.type?.name?.toLowerCase()}
            </p>
            <p className="text-sm text-muted-foreground">
              Haz clic sobre un día del calendario. Al guardar volverás automáticamente a la venta.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void router.navigate({
                to: "/admin/ventas",
                search: { sale: pendingSchedule.sale.id } as any,
              });
            }}
          >
            Volver a la venta
          </Button>
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-sand/70 bg-warm-white p-3 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 border-b border-sand/70 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => move(-1)}
                aria-label="Periodo anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="min-h-11 rounded-full"
                onClick={() => setAnchor(new Date())}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => move(1)}
                aria-label="Periodo siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="ml-1 font-display text-lg capitalize sm:ml-3 sm:text-2xl">
                {periodLabel(anchor, view)}
              </h2>
            </div>
            <div className="grid w-full grid-cols-4 rounded-xl bg-cream p-1 sm:w-auto">
              {(["month", "week", "day", "upcoming"] as CalendarView[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  className={cn(
                    "min-h-11 rounded-lg px-3 text-xs font-semibold transition sm:text-sm",
                    view === value
                      ? "bg-accent text-warm-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {{ month: "Mes", week: "Semana", day: "Día", upcoming: "Próximos" }[value]}
                </button>
              ))}
            </div>
          </div>
          <Filters
            data={data}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
          />
          <CalendarLegend eventTypes={data.eventTypes} />
        </div>

        {loading ? (
          <CalendarLoading />
        ) : error ? (
          <div className="py-16 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 font-semibold">No se pudo cargar la agenda</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void refresh()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <CalendarViewContent
            view={view}
            anchor={anchor}
            events={filteredEvents}
            onEvent={openDetail}
            onCreate={openCreate}
          />
        )}
      </section>

      <FormDialog
        open={formDialog.open}
        onOpenChange={formDialog.setOpen}
        title={form.id ? "Editar evento" : "Crear evento"}
        description="Las horas se registran y muestran en America/Lima."
        onSubmit={onSubmit}
        submitting={saving}
        contentClassName="max-w-4xl"
      >
        <EventForm
          form={form}
          setForm={setForm}
          data={data}
          sales={salesForCustomer}
          products={productsForSale}
        />
      </FormDialog>

      <EventDetail
        open={detailDialog.open}
        onOpenChange={detailDialog.setOpen}
        event={detailDialog.data}
        audit={audit}
        onEdit={openEdit}
      />

      <ConflictDialog
        result={conflictResult}
        open={Boolean(conflictResult)}
        onOpenChange={(open: boolean) => !open && setConflictResult(null)}
        onSuggestion={(iso: string) => {
          const duration =
            new Date(form.ends_local).getTime() - new Date(form.starts_local).getTime();
          const startsLocal = utcToLimaLocal(iso);
          const endsLocal = utcToLimaLocal(
            new Date(new Date(iso).getTime() + duration).toISOString(),
          );
          setForm((current) => ({ ...current, starts_local: startsLocal, ends_local: endsLocal }));
          setConflictResult(null);
        }}
      />
    </div>
  );
}

function StatsGrid({ stats }: { stats: ReturnType<typeof calculateStats> }) {
  const items = [
    ["Hoy", stats.today, CalendarDays],
    ["Por confirmar", stats.pending, Clock3],
    ["Avances", stats.advances, Users],
    ["Entregas próximas", stats.deliveries, PackageCheck],
    ["Vencidos", stats.overdue, Truck],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([label, value, Icon]) => (
        <div key={label} className="rounded-2xl border border-sand/70 bg-warm-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            <Icon className="h-4 w-4 text-brand-terracotta" />
          </div>
          <div className="mt-2 font-display text-2xl">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Filters({ data, search, setSearch, filters, setFilters }: any) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <label className="relative lg:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cliente, pedido o pieza"
          aria-label="Buscar eventos"
          className="h-11 pl-9"
        />
      </label>
      <FilterSelect
        value={filters.type}
        onChange={(value: string) => setFilters((current: any) => ({ ...current, type: value }))}
        label="Tipo"
        options={data.eventTypes.map((item: any) => [item.id, item.name])}
      />
      <Input
        type="date"
        value={filters.from}
        onChange={(event) =>
          setFilters((current: any) => ({ ...current, from: event.target.value }))
        }
        aria-label="Filtrar desde"
        className="h-11"
      />
      <Input
        type="date"
        value={filters.to}
        min={filters.from || undefined}
        onChange={(event) => setFilters((current: any) => ({ ...current, to: event.target.value }))}
        aria-label="Filtrar hasta"
        className="h-11"
      />
      <FilterSelect
        value={filters.status}
        onChange={(value: string) => setFilters((current: any) => ({ ...current, status: value }))}
        label="Estado"
        options={statusOptions.map(([value, label]) => [value, label])}
      />
      <FilterSelect
        value={filters.responsible}
        onChange={(value: string) =>
          setFilters((current: any) => ({ ...current, responsible: value }))
        }
        label="Responsable"
        options={data.staff.map((item: any) => [item.id, item.full_name || item.email])}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => setFilters(emptyFilters)}
      >
        <ListFilter className="h-4 w-4" /> Limpiar
      </Button>
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }: any) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: todos</SelectItem>
        {options.map(([optionValue, optionLabel]: string[]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CalendarLegend({ eventTypes }: { eventTypes: any[] }) {
  if (!eventTypes.length) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-sand/70 bg-cream/45 px-3 py-2.5"
      aria-label="Leyenda de tipos de evento"
    >
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Leyenda
      </span>
      {eventTypes.map((eventType: any) => (
        <span key={eventType.id} className="inline-flex items-center gap-2 text-xs font-semibold">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-warm-white"
            style={{ backgroundColor: eventType.color }}
            aria-hidden="true"
          />
          {eventType.name}
        </span>
      ))}
    </div>
  );
}

function saleReference(sale: any) {
  if (!sale) return "Pedido sin número";
  const quotation = sale.quote_number ? `Cotización ${sale.quote_number}` : "Pedido";
  const receipt = sale.receipt?.number ? ` · Comprobante ${sale.receipt.number}` : "";
  return `${quotation}${receipt}`;
}

function saleEventTitle(sale: any, eventType: any) {
  const firstItem = sale?.items?.[0];
  const productName =
    firstItem?.manual_item_name?.trim() ||
    firstItem?.product?.name?.trim() ||
    firstItem?.description?.trim();
  const typeName =
    {
      "reunion-cliente": "Reunión",
      "presentacion-avance": "Avance",
      "revision-aprobacion": "Visita",
      entrega: "Entrega",
      instalacion: "Instalación",
      "seguimiento-interno": "Seguimiento",
    }[eventType?.slug as string] ||
    eventType?.name ||
    "Evento";
  return productName ? `${productName} _ ${typeName}` : typeName;
}

function CalendarViewContent({ view, anchor, events, onEvent, onCreate }: any) {
  if (view === "month")
    return <MonthView anchor={anchor} events={events} onEvent={onEvent} onCreate={onCreate} />;
  if (view === "week")
    return <WeekView anchor={anchor} events={events} onEvent={onEvent} onCreate={onCreate} />;
  if (view === "day")
    return (
      <AgendaList
        events={events.filter((event: any) => limaDateKey(event.starts_at) === limaDateKey(anchor))}
        empty="No hay eventos para este día."
        onEvent={onEvent}
      />
    );
  return (
    <AgendaList
      events={events.filter((event: any) => new Date(event.ends_at) >= new Date()).slice(0, 50)}
      empty="No hay próximos eventos."
      onEvent={onEvent}
    />
  );
}

function MonthView({ anchor, events, onEvent, onCreate }: any) {
  const days = calendarMonthDays(anchor);
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <div
              key={day}
              className="border-b border-sand/70 py-2 text-center text-xs font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayEvents = events.filter(
              (event: any) => limaDateKey(event.starts_at) === limaDateKey(day),
            );
            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                aria-label={`Crear evento el ${format(day, "d 'de' MMMM", { locale: es })}`}
                onClick={() => onCreate(day)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onCreate(day);
                  }
                }}
                className={cn(
                  "min-h-36 cursor-pointer border-b border-r border-sand/60 p-1.5 transition-colors hover:bg-sand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                  !isSameMonth(day, anchor) && "bg-cream/45 text-muted-foreground",
                )}
              >
                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                  {format(day, "d")}
                </span>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event: any) => (
                    <EventPill key={event.id} event={event} onClick={() => onEvent(event)} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="block px-1 text-[11px] text-muted-foreground">
                      +{dayEvents.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekView({ anchor, events, onEvent, onCreate }: any) {
  const days = calendarWeekDays(anchor);
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="grid min-w-[840px] grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = events.filter(
            (event: any) => limaDateKey(event.starts_at) === limaDateKey(day),
          );
          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              aria-label={`Crear evento el ${format(day, "d 'de' MMMM", { locale: es })}`}
              onClick={() => onCreate(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onCreate(day);
                }
              }}
              className="min-h-96 cursor-pointer rounded-xl border border-sand/70 bg-cream/25 p-2 transition-colors hover:bg-sand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="border-b border-sand/60 pb-2 text-center">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className="mt-1 font-display text-xl">{format(day, "d")}</div>
              </div>
              <div className="mt-2 space-y-2">
                {dayEvents.map((event: any) => (
                  <EventCard key={event.id} event={event} compact onClick={() => onEvent(event)} />
                ))}
                {dayEvents.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Sin eventos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaList({ events, empty, onEvent }: any) {
  if (!events.length)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <CalendarDays className="mx-auto h-9 w-9 opacity-50" />
        <p className="mt-3">{empty}</p>
      </div>
    );
  return (
    <div className="mt-4 space-y-3">
      {events.map((event: any) => (
        <EventCard key={event.id} event={event} onClick={() => onEvent(event)} />
      ))}
    </div>
  );
}

function EventPill({ event, onClick }: any) {
  const eventColor = event.event_type?.color ?? "#8F342C";
  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onClick();
      }}
      className="block w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-semibold text-foreground shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{
        borderColor: eventColor,
        borderLeftWidth: 5,
        backgroundColor: colorWithAlpha(eventColor, 0.16),
      }}
    >
      <span className="mr-1 tabular-nums">
        {formatCalendarDate(event.starts_at, { hour: "2-digit", minute: "2-digit" })}
      </span>
      {event.title}
    </button>
  );
}

function EventCard({ event, onClick, compact = false }: any) {
  const eventColor = event.event_type?.color ?? "#8F342C";
  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-full rounded-2xl border p-4 text-left shadow-sm transition hover:brightness-[0.98] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        compact && "p-2.5",
      )}
      style={{
        borderColor: eventColor,
        backgroundColor: colorWithAlpha(eventColor, 0.12),
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: eventColor }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={cn("font-semibold", compact ? "text-xs" : "text-sm sm:text-base")}>
              {event.title}
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {statusLabel(event.status)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCalendarDate(event.starts_at, {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            – {formatCalendarDate(event.ends_at, { hour: "2-digit", minute: "2-digit" })}
          </p>
          {!compact && (
            <p className="mt-2 text-xs text-muted-foreground">
              {event.event_type?.name} · {event.customer?.full_name || "Actividad interna"} ·{" "}
              {event.responsible?.full_name || event.responsible?.email || "Sin responsable"}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function colorWithAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(143, 52, 44, ${alpha})`;
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function EventForm({ form, setForm, data, sales, products }: any) {
  const update = (key: string, value: any) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  const linkedSale = form.sale_id ? data.sales.find((sale: any) => sale.id === form.sale_id) : null;
  const linkedCustomer = form.customer_id
    ? data.customers.find((customer: any) => customer.id === form.customer_id)
    : null;
  return (
    <div className="space-y-5">
      {linkedSale && (
        <FormSection
          title="Cliente y solicitud"
          description="Información tomada de la cotización personalizada."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-sand/70 bg-warm-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cliente
              </p>
              <p className="mt-2 font-semibold">
                {linkedCustomer?.full_name || "Cliente pendiente de registrar"}
              </p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {linkedCustomer?.phone && <p>Teléfono: {linkedCustomer.phone}</p>}
                {linkedCustomer?.email && <p>Correo: {linkedCustomer.email}</p>}
                {linkedCustomer?.document && <p>Documento: {linkedCustomer.document}</p>}
                {linkedCustomer?.location && <p>Ubicación: {linkedCustomer.location}</p>}
              </div>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qué está solicitando
              </p>
              <div className="mt-2 space-y-2">
                {(linkedSale.items ?? []).map((item: any, index: number) => (
                  <div key={`${item.product_id ?? "manual"}-${index}`} className="text-sm">
                    <span className="font-semibold">
                      {item.manual_item_name ||
                        item.product?.name ||
                        item.description ||
                        "Pieza personalizada"}
                    </span>
                    {item.quantity && (
                      <span className="text-muted-foreground"> · {item.quantity} unidad(es)</span>
                    )}
                  </div>
                ))}
                {!linkedSale.items?.length && (
                  <p className="text-sm text-muted-foreground">
                    La descripción de la pieza aún no fue agregada.
                  </p>
                )}
              </div>
            </div>
          </div>
        </FormSection>
      )}

      <FormSection title="Información del evento">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cal_title">Título *</Label>
            <Input
              id="cal_title"
              required
              minLength={2}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ej. Presentación del primer avance"
            />
          </div>
          <FormSelect
            label="Tipo *"
            value={form.event_type_id}
            onChange={(value: string) => update("event_type_id", value)}
            options={data.eventTypes.map((item: any) => [item.id, item.name])}
          />
        </div>
      </FormSection>

      <FormSection title="Fecha y horario">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Estado *"
            value={form.status}
            onChange={(value: string) => update("status", value)}
            options={statusOptions}
          />
          <div>
            <Label htmlFor="cal_start">Inicio *</Label>
            <Input
              id="cal_start"
              type="datetime-local"
              required
              value={form.starts_local}
              onChange={(e) => {
                const nextStart = e.target.value;
                const previousDuration =
                  new Date(form.ends_local).getTime() - new Date(form.starts_local).getTime();
                const eventType = data.eventTypes.find(
                  (item: any) => item.id === form.event_type_id,
                );
                const duration =
                  previousDuration > 0
                    ? previousDuration
                    : (eventType?.default_duration_minutes ?? 60) * 60_000;
                setForm((current: any) => ({
                  ...current,
                  starts_local: nextStart,
                  ends_local: format(
                    new Date(new Date(nextStart).getTime() + duration),
                    "yyyy-MM-dd'T'HH:mm",
                  ),
                }));
              }}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Organización">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Modalidad *"
            value={form.modality}
            onChange={(value: string) => update("modality", value)}
            options={[
              ["virtual", "Virtual"],
              ["presencial", "Presencial"],
              ["entrega", "Entrega"],
              ["interna", "Interna"],
            ]}
          />
          <FormSelect
            label="Responsable *"
            value={form.responsible_user_id}
            onChange={(value: string) => update("responsible_user_id", value)}
            options={data.staff.map((item: any) => [item.id, item.full_name || item.email])}
          />
          {(form.modality === "presencial" || form.modality === "entrega") && (
            <div className="sm:col-span-2">
              <Label htmlFor="cal_address">Dirección</Label>
              <Input
                id="cal_address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Dirección de reunión, entrega o instalación"
              />
            </div>
          )}
        </div>
      </FormSection>
      {form.status === "cancelled" && (
        <div className="sm:col-span-2">
          <Label htmlFor="cal_cancel">Motivo de cancelación *</Label>
          <Textarea
            id="cal_cancel"
            required
            value={form.cancellation_reason}
            onChange={(e) => update("cancellation_reason", e.target.value)}
          />
        </div>
      )}
      <FormSection title="Notas">
        <Label htmlFor="cal_notes">Notas</Label>
        <Textarea
          id="cal_notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Acuerdos, indicaciones o información relevante"
          className="min-h-24"
        />
      </FormSection>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-sand/70 bg-cream/25 p-4">
      <div className="mb-4">
        <h3 className="font-display text-lg">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function FormSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]: string[]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EventDetail({ open, onOpenChange, event, audit, onEdit }: any) {
  if (!event) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{event.title}</DialogTitle>
          <DialogDescription>
            {event.event_type?.name} · {statusLabel(event.status)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            label="Horario"
            value={`${formatCalendarDate(event.starts_at, { dateStyle: "medium", timeStyle: "short" })} – ${formatCalendarDate(event.ends_at, { timeStyle: "short" })}`}
          />
          <Detail label="Modalidad" value={modalityLabel(event.modality)} />
          <Detail label="Cliente" value={event.customer?.full_name || "Actividad interna"} />
          <Detail label="Pedido" value={event.sale_id ? saleReference(event.sale) : "Sin pedido"} />
          <Detail label="Pieza" value={event.product?.name || "Sin pieza"} />
          <Detail
            label="Responsable"
            value={event.responsible?.full_name || event.responsible?.email || "—"}
          />
          {event.address && <Detail label="Dirección" value={event.address} />}
          {event.notes && (
            <div className="sm:col-span-2">
              <Detail label="Notas" value={event.notes} />
            </div>
          )}
        </div>
        <div className="border-t border-sand/70 pt-4">
          <h3 className="font-semibold">Historial</h3>
          <div className="mt-3 space-y-2">
            {audit.length ? (
              audit.map((row: any) => (
                <div key={row.id} className="rounded-xl bg-cream/60 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold">{auditLabel(row.action)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(row.performed_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.performer?.full_name || row.performer?.email || "Usuario"}
                    {row.reason ? ` · ${row.reason}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Cargando historial…</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onEdit(event)}>
            <Pencil className="h-4 w-4" /> Editar evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function ConflictDialog({ result, open, onOpenChange, onSuggestion }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Conflicto de horario
          </DialogTitle>
          <DialogDescription>
            El evento no se guardó porque ese horario ya está ocupado. Selecciona otro horario para
            continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {result?.conflicts?.map((conflict: any) => (
            <div
              key={conflict.id}
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <div className="font-semibold">{conflict.title}</div>
              <div className="mt-1 text-xs">
                {formatCalendarDate(conflict.starts_at, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                – {formatCalendarDate(conflict.ends_at, { timeStyle: "short" })} · Cruce por{" "}
                {conflict.reason === "sale" ? "pedido" : "responsable"}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {conflict.responsible_name && <span>Responsable: {conflict.responsible_name}</span>}
                {conflict.customer_name && <span>Cliente: {conflict.customer_name}</span>}
                {conflict.sale_reference && <span>Pedido: #{conflict.sale_reference}</span>}
              </div>
            </div>
          ))}
        </div>
        {result?.suggestions?.length > 0 && (
          <div>
            <Label>Horarios cercanos disponibles</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.suggestions.map((iso: string) => (
                <Button
                  key={iso}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestion(iso)}
                >
                  {formatCalendarDate(iso, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Button>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Volver al formulario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const statusOptions = [
  ["pending_confirmation", "Pendiente de confirmación"],
  ["confirmed", "Confirmado"],
  ["rescheduled", "Reprogramado"],
  ["completed", "Completado"],
  ["cancelled", "Cancelado"],
];

function newForm(date: Date, userId: string): CalendarForm {
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    event_type_id: "",
    notes: "",
    starts_local: utcToLimaLocal(start.toISOString()),
    ends_local: utcToLimaLocal(end.toISOString()),
    modality: "interna",
    address: "",
    status: "pending_confirmation",
    customer_id: "",
    sale_id: "",
    product_id: "",
    responsible_user_id: userId,
    preparation_minutes: "0",
    travel_minutes: "0",
    cancellation_reason: "",
  };
}

function eventToForm(event: any): CalendarForm {
  return {
    id: event.id,
    title: event.title,
    event_type_id: event.event_type_id,
    notes: event.notes ?? "",
    starts_local: utcToLimaLocal(event.starts_at),
    ends_local: utcToLimaLocal(event.ends_at),
    modality: event.modality,
    address: event.address ?? "",
    status: event.status,
    customer_id: event.customer_id ?? "",
    sale_id: event.sale_id ?? "",
    product_id: event.product_id ?? "",
    responsible_user_id: event.responsible_user_id,
    preparation_minutes: String(event.preparation_minutes ?? 0),
    travel_minutes: String(event.travel_minutes ?? 0),
    cancellation_reason: event.cancellation_reason ?? "",
  };
}
function formToPayload(form: CalendarForm) {
  const starts_at = limaLocalToUtc(form.starts_local);
  const ends_at = limaLocalToUtc(form.ends_local);
  if (new Date(ends_at) <= new Date(starts_at))
    throw new Error("La hora final debe ser posterior a la inicial.");
  return {
    id: form.id,
    title: form.title,
    event_type_id: form.event_type_id,
    notes: form.notes || null,
    starts_at,
    ends_at,
    timezone: "America/Lima" as const,
    modality: form.modality,
    address: form.address || null,
    status: form.status,
    customer_id: form.customer_id || null,
    sale_id: form.sale_id || null,
    product_id: form.product_id || null,
    responsible_user_id: form.responsible_user_id,
    preparation_minutes: Number(form.preparation_minutes || 0),
    travel_minutes: Number(form.travel_minutes || 0),
    cancellation_reason: form.cancellation_reason || null,
  };
}
function periodLabel(anchor: Date, view: CalendarView) {
  if (view === "month") return format(anchor, "MMMM yyyy", { locale: es });
  if (view === "week") {
    const days = calendarWeekDays(anchor);
    return `${format(days[0], "d MMM", { locale: es })} – ${format(days[6], "d MMM yyyy", { locale: es })}`;
  }
  return format(anchor, "EEEE d 'de' MMMM", { locale: es });
}
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function calculateStats(events: any[]) {
  const now = new Date();
  const today = limaDateKey(now);
  const nextWeek = addDays(now, 7);
  const active = events.filter((event) => event.status !== "cancelled");
  const conflicts = new Set<string>();
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i],
        b = active[j];
      if (
        (a.responsible_user_id === b.responsible_user_id ||
          (a.sale_id && a.sale_id === b.sale_id)) &&
        new Date(a.starts_at).getTime() === new Date(b.starts_at).getTime()
      ) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  return {
    today: active.filter((event) => limaDateKey(event.starts_at) === today).length,
    pending: active.filter((event) => event.status === "pending_confirmation").length,
    advances: active.filter(
      (event) =>
        event.event_type?.slug === "presentacion-avance" && new Date(event.starts_at) >= now,
    ).length,
    deliveries: active.filter(
      (event) =>
        event.event_type?.slug === "entrega" &&
        new Date(event.starts_at) >= now &&
        new Date(event.starts_at) <= nextWeek,
    ).length,
    conflicts: conflicts.size,
    overdue: active.filter(
      (event) => new Date(event.ends_at) < now && !["completed"].includes(event.status),
    ).length,
  };
}
function auditLabel(action: string) {
  return (
    (
      {
        created: "Creación",
        edited: "Edición",
        rescheduled: "Reprogramación",
        status_changed: "Cambio de estado",
        cancelled: "Cancelación",
        conflict_forced: "Conflicto autorizado",
      } as any
    )[action] ?? action
  );
}
function CalendarLoading() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-3 py-6 sm:grid-cols-4">
      <div className="h-32 rounded-xl bg-sand/40" />
      <div className="h-32 rounded-xl bg-sand/40" />
      <div className="h-32 rounded-xl bg-sand/40" />
      <div className="h-32 rounded-xl bg-sand/40" />
    </div>
  );
}
