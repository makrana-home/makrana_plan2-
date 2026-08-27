import { createServerFn } from "@tanstack/react-start";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(180),
  event_type_id: z.string().uuid(),
  notes: z.string().max(3000).optional().nullable(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  timezone: z.literal("America/Lima").default("America/Lima"),
  modality: z.enum(["virtual", "presencial", "entrega", "interna"]),
  address: z.string().max(500).optional().nullable(),
  status: z.enum(["pending_confirmation", "confirmed", "rescheduled", "completed", "cancelled"]),
  customer_id: z.string().uuid().optional().nullable(),
  sale_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  responsible_user_id: z.string().uuid(),
  preparation_minutes: z.number().int().min(0).max(1440),
  travel_minutes: z.number().int().min(0).max(1440),
  cancellation_reason: z.string().max(1000).optional().nullable(),
});

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw error;
  if (!data) throw new Error("No tienes acceso al calendario administrativo.");
}

export const adminListCalendarData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ from: z.string().datetime(), to: z.string().datetime() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const [
      eventsResult,
      typesResult,
      customersResult,
      salesResult,
      productsResult,
      profilesResult,
      rolesResult,
    ] = await Promise.all([
      context.supabase
        .from("calendar_events")
        .select(
          "*, event_type:calendar_event_types(*), customer:customers(id,full_name,email), sale:sales(id,quote_number,status,created_at,customer_id,receipt:receipts(number)), product:products(id,name,sku), responsible:profiles!calendar_events_responsible_user_id_fkey(id,full_name,email), creator:profiles!calendar_events_created_by_fkey(id,full_name,email)",
        )
        .lt("starts_at", data.to)
        .gt("ends_at", data.from)
        .order("starts_at"),
      context.supabase
        .from("calendar_event_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      context.supabase
        .from("customers")
        .select("id,full_name,email,phone,document,location")
        .order("full_name"),
      context.supabase
        .from("sales")
        .select(
          "id,quote_number,status,created_at,customer_id,receipt:receipts(number),items:sale_items(product_id,manual_item_name,description,quantity,product:products(id,name,sku))",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      context.supabase.from("products").select("id,name,sku").order("name").limit(1000),
      context.supabase.from("profiles").select("id,full_name,email").order("full_name"),
      context.supabase.from("user_roles").select("user_id,role"),
    ]);

    for (const result of [
      eventsResult,
      typesResult,
      customersResult,
      salesResult,
      productsResult,
      profilesResult,
      rolesResult,
    ]) {
      if (result.error) throw result.error;
    }
    const staffIds = new Set(
      (rolesResult.data ?? [])
        .filter((row: any) => ["admin", "ventas", "almacen"].includes(row.role))
        .map((row: any) => row.user_id),
    );
    return {
      events: eventsResult.data ?? [],
      eventTypes: typesResult.data ?? [],
      customers: customersResult.data ?? [],
      sales: salesResult.data ?? [],
      products: productsResult.data ?? [],
      staff: (profilesResult.data ?? []).filter((profile: any) => staffIds.has(profile.id)),
      roles: rolesResult.data ?? [],
      currentUserId: context.userId,
      currentUserRoles: (rolesResult.data ?? [])
        .filter((row: any) => row.user_id === context.userId)
        .map((row: any) => row.role),
    };
  });

export const adminSaveCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        event: eventSchema,
        forceConflict: z.boolean().default(false),
        forceReason: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: result, error } = await (context.supabase as any).rpc("save_calendar_event", {
      _event: data.event,
      _force_conflict: false,
      _force_reason: null,
    });
    if (error) throw error;
    if (!result?.saved) {
      return { ...result, suggestions: await suggestSlots(context.supabase, data.event) };
    }
    return result;
  });

export const adminQuickScheduleSaleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        saleId: z.string().uuid(),
        typeSlug: z.enum(["presentacion-avance", "entrega"]),
        startsAt: z.string().datetime(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const [{ data: sale, error: saleError }, { data: type, error: typeError }] = await Promise.all([
      context.supabase
        .from("sales")
        .select(
          "id,customer_id,items:sale_items(manual_item_name,description,product:products(name))",
        )
        .eq("id", data.saleId)
        .single(),
      context.supabase
        .from("calendar_event_types")
        .select("id,name,slug,default_duration_minutes")
        .eq("slug", data.typeSlug)
        .single(),
    ]);
    if (saleError) throw saleError;
    if (typeError) throw typeError;
    const startsAt = new Date(data.startsAt);
    const firstItem = sale.items?.[0];
    const productName =
      firstItem?.manual_item_name?.trim() ||
      firstItem?.product?.name?.trim() ||
      firstItem?.description?.trim();
    const typeTitle = type.slug === "presentacion-avance" ? "Avance" : "Entrega";
    const { data: result, error } = await (context.supabase as any).rpc("save_calendar_event", {
      _event: {
        title: productName ? `${productName} _ ${typeTitle}` : typeTitle,
        event_type_id: type.id,
        notes: null,
        starts_at: startsAt.toISOString(),
        ends_at: addMinutes(startsAt, type.default_duration_minutes ?? 60).toISOString(),
        timezone: "America/Lima",
        modality: data.typeSlug === "entrega" ? "entrega" : "interna",
        address: null,
        status: "pending_confirmation",
        customer_id: sale.customer_id,
        sale_id: sale.id,
        product_id: null,
        responsible_user_id: context.userId,
        preparation_minutes: 0,
        travel_minutes: 0,
        cancellation_reason: null,
      },
      _force_conflict: false,
      _force_reason: null,
    });
    if (error) throw error;
    return result;
  });

export const adminGetCalendarAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("calendar_event_audit")
      .select("*, performer:profiles!calendar_event_audit_performed_by_fkey(id,full_name,email)")
      .eq("event_id", data.eventId)
      .order("performed_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

async function suggestSlots(supabase: any, event: z.infer<typeof eventSchema>) {
  const duration = new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime();
  const rangeStart = new Date(event.starts_at);
  const rangeEnd = addMinutes(rangeStart, 7 * 24 * 60);
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id,starts_at,ends_at,responsible_user_id,sale_id,preparation_minutes,travel_minutes,status",
    )
    .neq("status", "cancelled")
    .lt("starts_at", rangeEnd.toISOString())
    .gt("ends_at", rangeStart.toISOString());
  if (error) throw error;

  const suggestions: string[] = [];
  for (let offset = 30; offset <= 7 * 24 * 60 && suggestions.length < 3; offset += 30) {
    const start = addMinutes(rangeStart, offset);
    const limaHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Lima",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(start),
    );
    if (limaHour < 8 || limaHour >= 19) continue;
    const candidate = {
      ...event,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + duration).toISOString(),
    };
    const conflict = (data ?? []).some((row: any) => {
      if (row.id === event.id) return false;
      const sameResource =
        row.responsible_user_id === event.responsible_user_id ||
        (event.sale_id && row.sale_id === event.sale_id);
      return sameResource && new Date(row.starts_at).getTime() === start.getTime();
    });
    if (!conflict) suggestions.push(start.toISOString());
  }
  return suggestions;
}
