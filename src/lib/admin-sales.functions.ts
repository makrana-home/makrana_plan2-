import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .select("id, full_name, email, phone, location, source, created_at")
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
  discount: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  delivery_status: z
    .enum(["pendiente", "en_preparacion", "entregado", "enviado", "cancelado"])
    .optional(),
});

export const adminListSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSales(context);
    const { data, error } = await context.supabase
      .from("sales")
      .select(
        "id, status, payment_status, delivery_status, subtotal, discount, total, notes, created_at, confirmed_at, customer:customers(id, full_name), warehouse:warehouses(code, name), receipt:receipts(id, number)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminGetSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { data: sale, error } = await context.supabase
      .from("sales")
      .select(
        "*, customer:customers(*), warehouse:warehouses(*), items:sale_items(*, product:products(name, sku)), payments:sale_payments(*), receipt:receipts(*)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return sale;
  });

export const adminCreateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const notes = data.channel
      ? `[${data.channel}] ${data.notes ?? ""}`.trim()
      : (data.notes ?? null);
    const { data: row, error } = await context.supabase
      .from("sales")
      .insert({
        customer_id: data.customer_id ?? null,
        warehouse_id: data.warehouse_id,
        discount: data.discount ?? 0,
        notes,
        delivery_status: data.delivery_status ?? "pendiente",
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
    const { error } = await context.supabase
      .from("sales")
      .update({
        customer_id: data.customer_id ?? null,
        warehouse_id: data.warehouse_id,
        discount: data.discount ?? 0,
        notes: data.notes ?? null,
        delivery_status: data.delivery_status ?? "pendiente",
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const saleItemSchema = z.object({
  id: z.string().uuid().optional(),
  sale_id: z.string().uuid(),
  product_id: z.string().uuid(),
  presentation_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(200).optional().nullable(),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
});

export const adminAddSaleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saleItemSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const subtotal = Number((data.quantity * data.unit_price - (data.discount ?? 0)).toFixed(2));
    const { data: row, error } = await context.supabase
      .from("sale_items")
      .upsert({ ...data, subtotal }, { onConflict: "id" })
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
        "id, number, issued_at, sale:sales(id, total, customer:customers(full_name), warehouse:warehouses(name))",
      )
      .order("issued_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminGetReceipt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSales(context);
    const { data: r, error } = await context.supabase
      .from("receipts")
      .select(
        "*, sale:sales(*, customer:customers(*), warehouse:warehouses(*), items:sale_items(*, product:products(name, sku)), payments:sale_payments(*))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return r;
  });
