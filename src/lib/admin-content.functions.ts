import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (error) throw error;
  if (!data) throw new Error("forbidden");
}

// ============ NEWS ============
const newsSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().max(160).optional().nullable(),
  title: z.string().trim().min(2).max(200),
  category: z.enum([
    "evento",
    "feria",
    "taller",
    "curso_nuevo",
    "producto_nuevo",
    "historia",
    "inspiracion",
    "promocion",
  ]),
  cover_image_url: z.string().url().optional().nullable().or(z.literal("")),
  summary: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().max(20000).optional().nullable(),
  status: z.enum(["borrador", "publicado", "oculto"]),
  is_featured: z.boolean().default(false),
  cta_type: z.string().trim().max(40).optional().nullable(),
  cta_url: z.string().trim().max(500).optional().nullable(),
  published_at: z.string().optional().nullable(),
});

export const adminListNews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => newsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { ...data };
    payload.slug = await uniqueNewsSlug(context.supabase, data.slug, data.title, data.id);
    if (payload.cover_image_url === "") payload.cover_image_url = null;
    if (payload.status === "publicado" && !payload.published_at)
      payload.published_at = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("news_posts")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

async function uniqueNewsSlug(
  supabase: any,
  rawSlug: string | null | undefined,
  title: string,
  id?: string,
) {
  const base = safeSlug(rawSlug || title || "publicacion");
  const { data, error } = await supabase
    .from("news_posts")
    .select("id, slug")
    .like("slug", `${base}%`);
  if (error) throw error;

  const existing = new Set(
    (data ?? []).filter((row: any) => row.id !== id).map((row: any) => row.slug),
  );
  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function safeSlug(value: string) {
  const slug = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 150);
  return slug.length >= 2 ? slug : `publicacion-${Date.now()}`;
}

export const adminDeleteNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("news_posts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ WORKSHOPS ============
const workshopSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal("")),
  modality: z.enum(["presencial", "virtual", "hibrido"]),
  level: z.enum(["basico", "intermedio", "avanzado"]),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  capacity: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
  materials_included: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["abierto", "lleno", "finalizado", "cancelado"]),
  is_visible: z.boolean(),
});

export const adminListWorkshops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("workshops")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertWorkshop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => workshopSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { ...data };
    if (payload.cover_image_url === "") payload.cover_image_url = null;
    const { data: row, error } = await context.supabase
      .from("workshops")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteWorkshop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("workshops").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminListEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workshopId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    let q = context.supabase
      .from("workshop_enrollments")
      .select(
        "id, full_name, email, phone, payment_status, amount, notes, created_at, workshop:workshops(id, title, slug, starts_at)",
      )
      .order("created_at", { ascending: false });
    if (data.workshopId) q = q.eq("workshop_id", data.workshopId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const adminUpdateEnrollmentPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        payment_status: z.enum(["pendiente", "parcial", "pagado", "anulado"]),
        amount: z.coerce.number().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { payment_status: data.payment_status };
    if (typeof data.amount === "number") payload.amount = data.amount;
    const { error } = await context.supabase
      .from("workshop_enrollments")
      .update(payload)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("workshop_enrollments")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Public enrollment
export const enrollWorkshop = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(160),
        email: z.string().email().max(160).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        notes: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabasePublicKey) {
      throw new Error("Missing Supabase public environment variables.");
    }
    const sb = createClient(supabaseUrl, supabasePublicKey, {
      auth: { persistSession: false },
    });
    const { error } = await sb.from("workshop_enrollments").insert({
      workshop_id: data.workshop_id,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
    });
    if (error) throw error;
    return { ok: true };
  });

// ============ FAIRS ============
const fairSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  location: z.string().trim().max(200).optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  warehouse_origin_id: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const adminListFairs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("fairs")
      .select(
        "*, warehouse:warehouses(code, name), items:fair_items(id, qty_sent, qty_sold, qty_returned, product:products(name, sku))",
      )
      .order("starts_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertFair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fairSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase
      .from("fairs")
      .upsert(data, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteFair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("fairs").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminUpsertFairItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        fair_id: z.string().uuid(),
        product_id: z.string().uuid(),
        qty_sent: z.coerce.number().nonnegative(),
        qty_sold: z.coerce.number().nonnegative(),
        qty_returned: z.coerce.number().nonnegative(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase
      .from("fair_items")
      .upsert(data, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteFairItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("fair_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ REPORTS ============
export const adminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const startDay = today.toISOString();

    const [
      salesMonth,
      salesDay,
      lowStock,
      paymentsByMethod,
      leadsCount,
      customersCount,
      salesRows,
      returnRows,
    ] = await Promise.all([
      sb
        .from("sales")
        .select("total, status")
        .gte("created_at", startMonth)
        .eq("status", "confirmada")
        .eq("payment_status", "pagado"),
      sb
        .from("sales")
        .select("total, status")
        .gte("created_at", startDay)
        .eq("status", "confirmada")
        .eq("payment_status", "pagado"),
      sb
        .from("inventory_stock")
        .select(
          "quantity, product:products(id, name, sku, min_stock), warehouse:warehouses(code, name)",
        )
        .limit(500),
      sb.from("sale_payments").select("method, amount").gte("paid_at", startMonth),
      sb.from("leads").select("id", { count: "exact", head: true }),
      sb.from("customers").select("id", { count: "exact", head: true }),
      sb
        .from("sales")
        .select(
          "id, created_at, confirmed_at, status, payment_status, delivery_status, subtotal, discount, total, notes, customer:customers(full_name, email, phone), warehouse:warehouses(code, name), receipt:receipts(number), items:sale_items(quantity, subtotal, product:products(id, name, sku)), payments:sale_payments(method, amount, paid_at)",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      sb
        .from("inventory_movements")
        .select(
          "id, created_at, quantity, reason, notes, product:products(name, sku), warehouse:warehouses!inventory_movements_warehouse_id_fkey(code, name)",
        )
        .eq("movement_type", "devolucion")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const sumMonth = (salesMonth.data ?? []).reduce((a: number, r: any) => a + Number(r.total), 0);
    const sumDay = (salesDay.data ?? []).reduce((a: number, r: any) => a + Number(r.total), 0);

    const lowStockList = (lowStock.data ?? [])
      .filter(
        (r: any) =>
          r.product?.min_stock != null && Number(r.quantity) <= Number(r.product.min_stock),
      )
      .slice(0, 50);

    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const sale of (salesRows.data ?? []) as any[]) {
      if (sale.status !== "confirmada" || sale.payment_status !== "pagado") continue;
      for (const it of sale.items ?? []) {
        const id = it.product?.id;
        if (!id) continue;
        const cur = map.get(id) ?? { name: it.product.name, qty: 0, revenue: 0 };
        cur.qty += Number(it.quantity);
        cur.revenue += Number(it.subtotal);
        map.set(id, cur);
      }
    }
    const top = [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

    const byMethod: Record<string, number> = {};
    for (const p of (paymentsByMethod.data ?? []) as any[])
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);

    return {
      sales: {
        today: sumDay,
        month: sumMonth,
        todayCount: salesDay.data?.length ?? 0,
        monthCount: salesMonth.data?.length ?? 0,
      },
      lowStock: lowStockList,
      topProducts: top,
      paymentsByMethod: byMethod,
      saleRows: salesRows.data ?? [],
      returnRows: returnRows.data ?? [],
      counts: { leads: leadsCount.count ?? 0, customers: customersCount.count ?? 0 },
    };
  });

// ============ CLIENT (self) ============
export const clientGetProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [{ data: profile }, { data: customer }, { data: enrollments }, { data: sales }] =
      await Promise.all([
        sb.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
        sb.from("customers").select("*").eq("user_id", context.userId).maybeSingle(),
        sb
          .from("workshop_enrollments")
          .select("*, workshop:workshops(*)")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false }),
        sb
          .from("sales")
          .select(
            "*, items:sale_items(*, product:products(name)), payments:sale_payments(*), receipt:receipts(id, number)",
          )
          .order("created_at", { ascending: false }),
      ]);
    return { profile, customer, enrollments: enrollments ?? [], sales: sales ?? [] };
  });

export const clientUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(160),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        location: z.string().trim().max(160).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await sb
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone || null })
      .eq("id", context.userId);
    await sb.from("customers").upsert(
      {
        user_id: context.userId,
        full_name: data.full_name,
        phone: data.phone || null,
        location: data.location || null,
      },
      { onConflict: "user_id" },
    );
    return { ok: true };
  });
