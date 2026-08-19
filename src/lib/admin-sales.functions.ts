import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { composeSaleNotes } from "@/lib/sale-notes";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (error) throw error;
  if (!data) throw new Error("forbidden");
}
async function assertSales(ctx: { supabase: any; userId: string }) {
  const [a, b] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "ventas" }),
  ]);
  if (!(a.data || b.data)) throw new Error("forbidden");
}

// ============ CUSTOMERS ============
const customerSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  document: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  location: z.string().trim().max(160).optional().nullable().or(z.literal("")),
  interests: z.string().trim().max(280).optional().nullable().or(z.literal("")),
  source: z.string().trim().max(80).optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().nullable().or(z.literal("")),
});

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => customerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { ...data };
    for (const k of ["email", "phone", "document", "location", "interests", "source", "notes"])
      if (payload[k] === "") payload[k] = null;
    const { data: row, error } = await context.supabase
      .from("customers")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ LEADS ============
export const adminListLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminConvertLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: lead, error } = await context.supabase
      .from("leads")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    const { data: c, error: e2 } = await context.supabase
      .from("customers")
      .insert({
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        source: lead.source ?? "lead-web",
        interests: lead.interest,
        notes: lead.message,
      })
      .select("id")
      .single();
    if (e2) throw e2;
    await context.supabase.from("leads").delete().eq("id", data.id);
    return c;
  });

export const adminDeleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("leads").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ SALES ============
const saleSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid(),
  channel: z.string().trim().max(60).optional().nullable(), // stored in notes prefix
  manual_customer_name: z.string().trim().max(160).optional().nullable().or(z.literal("")),
  discount: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  delivery_status: z.enum(["pendiente", "en_preparacion", "entregado", "enviado", "cancelado"]),
  estimated_completion_at: z.string().datetime().optional().nullable(),
});

export const adminListSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSales(context);
    const { data, error } = await context.supabase
      .from("sales")
      .select(
        "id, quote_number, created_by, status, payment_status, delivery_status, subtotal, discount, total, notes, created_at, confirmed_at, customer:customers(id, full_name), warehouse:warehouses(code, name), receipt:receipts(id, number)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return enrichRecordsWithCreators(context, data ?? []);
  });

export const adminGetSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select(
        "*, customer:customers(*), warehouse:warehouses(*), items:sale_items(*, product:products(name, sku), presentation:material_presentations(id, unit, label, sku)), payments:sale_payments(*), receipt:receipts(*), calendar_events(*, event_type:calendar_event_types(*), responsible:profiles!calendar_events_responsible_user_id_fkey(id,full_name,email))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!sale) return sale;
    return (await enrichRecordsWithCreators(context, [sale]))[0];
  });

export const adminCreateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const notes = composeSaleNotes({
      channel: data.channel,
      notes: data.notes,
      manualCustomerName: data.manual_customer_name,
    });
    const { data: row, error } = await context.supabase
      .from("sales")
      .insert({
        customer_id: data.customer_id ?? null,
        warehouse_id: data.warehouse_id,
        discount: data.discount ?? 0,
        notes,
        delivery_status: data.delivery_status,
        estimated_completion_at: data.estimated_completion_at ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminUpdateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saleSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const notes = composeSaleNotes({
      channel: data.channel,
      notes: data.notes,
      manualCustomerName: data.manual_customer_name,
    });
    const { error } = await context.supabase
      .from("sales")
      .update({
        customer_id: data.customer_id ?? null,
        warehouse_id: data.warehouse_id,
        discount: data.discount ?? 0,
        notes,
        delivery_status: data.delivery_status,
        estimated_completion_at: data.estimated_completion_at ?? null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const saleItemSchema = z
  .object({
    id: z.string().uuid().optional(),
    sale_id: z.string().uuid(),
    product_id: z.string().uuid().optional().nullable(),
    presentation_id: z.string().uuid().optional().nullable(),
    is_manual_item: z.boolean().optional().default(false),
    manual_item_name: z.string().trim().max(160).optional().nullable(),
    provisional_source: z.string().trim().max(80).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
    quantity: z.coerce.number().positive(),
    unit_price: z.coerce.number().nonnegative(),
    discount: z.coerce.number().nonnegative().default(0),
  })
  .superRefine((value, ctx) => {
    if (value.is_manual_item) {
      if (!value.manual_item_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manual_item_name"],
          message: "Ingresa el nombre del articulo manual.",
        });
      }
      return;
    }

    if (!value.product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["product_id"],
        message: "Selecciona una pieza, material o presentacion.",
      });
    }
  });

export const adminAddSaleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saleItemSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const subtotal = Number((data.quantity * data.unit_price - (data.discount ?? 0)).toFixed(2));
    const payload: any = {
      sale_id: data.sale_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      discount: data.discount ?? 0,
      subtotal,
      description: data.description || null,
    };
    if (data.id) payload.id = data.id;

    if (data.is_manual_item) {
      payload.product_id = null;
      payload.presentation_id = null;
      payload.is_manual_item = true;
      payload.manual_item_name = data.manual_item_name?.trim();
      payload.provisional_source = data.provisional_source || "feria_provisional";
      payload.description = data.description || payload.manual_item_name;
    } else {
      payload.product_id = data.product_id;
      payload.presentation_id = data.presentation_id || null;
    }

    const { data: row, error } = await context.supabase
      .from("sale_items")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteSaleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { error } = await context.supabase.from("sale_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const paymentSchema = z.object({
  sale_id: z.string().uuid(),
  method: z.enum(["efectivo", "yape", "plin", "transferencia", "tarjeta", "mixto", "otro"]),
  amount: z.coerce.number().positive(),
  operation_code: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(280).optional().nullable(),
});
export const adminAddPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => paymentSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { error } = await context.supabase.from("sale_payments").insert(data);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { error } = await context.supabase.from("sale_payments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminConfirmSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { data: out, error } = await context.supabase.rpc("confirm_sale", { _sale_id: data.id });
    if (error) throw error;
    return out;
  });

export const adminCancelSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { error } = await context.supabase.rpc("cancel_sale", { _sale_id: data.id });
    if (error) throw error;
    return { ok: true };
  });

// ============ RECEIPTS ============
export const adminListReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSales(context);
    const { data, error } = await context.supabase
      .from("receipts")
      .select(
        "id, number, issued_at, created_by, sale:sales(id, quote_number, created_by, total, customer:customers(full_name), warehouse:warehouses(name))",
      )
      .order("issued_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const sales = rows.flatMap((receipt: any) => (receipt.sale ? [receipt.sale] : []));
    const [enrichedReceipts, enrichedSales] = await Promise.all([
      enrichRecordsWithCreators(context, rows),
      enrichRecordsWithCreators(context, sales),
    ]);
    const creatorsBySale = new Map(enrichedSales.map((sale: any) => [sale.id, sale.creator]));
    return enrichedReceipts.map((receipt: any) => ({
      ...receipt,
      sale: receipt.sale
        ? { ...receipt.sale, creator: creatorsBySale.get(receipt.sale.id) ?? null }
        : null,
    }));
  });

export const adminGetReceipt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { data: r, error } = await context.supabase
      .from("receipts")
      .select(
        "*, sale:sales(*, customer:customers(*), warehouse:warehouses(*), items:sale_items(*, product:products(name, sku), presentation:material_presentations(id, unit, label, sku)), payments:sale_payments(*))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!r?.sale) return r;
    const [[receipt], [sale]] = await Promise.all([
      enrichRecordsWithCreators(context, [r]),
      enrichRecordsWithCreators(context, [r.sale]),
    ]);
    return { ...receipt, sale };
  });

async function enrichRecordsWithCreators(context: any, records: any[]) {
  const creatorIds = [
    ...new Set(records.map((record) => record.created_by).filter((id): id is string => Boolean(id))),
  ];
  if (creatorIds.length === 0) {
    return records.map((record) => ({ ...record, creator: null }));
  }

  const { data: profiles, error } = await context.supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", creatorIds);
  if (error) throw error;
  const profilesById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  return records.map((record) => ({
    ...record,
    creator: profilesById.get(record.created_by) ?? null,
  }));
}
