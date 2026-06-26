import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- helpers ----------
async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (error) throw error;
  if (!data) throw new Error("forbidden");
}

// ============ PRODUCTS / MATERIALS (shared table products) ============
const productSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["producto_terminado", "material", "kit", "curso"]),
  sku: z.string().trim().max(60).optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug en minúsculas, sin espacios"),
  name: z.string().trim().min(2).max(160),
  short_description: z.string().trim().max(280).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  main_image_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(["disponible", "por_encargo", "agotado", "reservado"]),
  measurements: z.string().trim().max(120).optional().nullable(),
  color: z.string().trim().max(60).optional().nullable(),
  material: z.string().trim().max(120).optional().nullable(),
  artisan: z.string().trim().max(120).optional().nullable(),
  supplier: z.string().trim().max(120).optional().nullable(),
  min_stock: z.coerce.number().nonnegative().optional().nullable(),
  is_visible: z.boolean(),
  is_featured: z.boolean(),
  internal_notes: z.string().trim().max(1000).optional().nullable(),
});

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { type?: "producto_terminado" | "material" | "kit" | "curso" } | undefined) => d ?? {},
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    let q = context.supabase
      .from("products")
      .select(
        "id, type, sku, slug, name, price, status, is_visible, is_featured, category:categories(id, name)",
      )
      .order("created_at", { ascending: false });
    if (data.type) q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const adminGetProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase
      .from("products")
      .select("*, presentations:material_presentations(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload: any = { ...data };
    if (payload.main_image_url === "") payload.main_image_url = null;
    const { data: row, error } = await context.supabase
      .from("products")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ PRESENTATIONS ============
const presentationSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  unit: z.enum([
    "unidad",
    "metro",
    "rollo",
    "madeja",
    "paquete",
    "docena",
    "ciento",
    "combo",
    "otro",
  ]),
  label: z.string().trim().max(80).optional().nullable(),
  price: z.coerce.number().nonnegative(),
  units_in_presentation: z.coerce.number().positive(),
});

export const adminUpsertPresentation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => presentationSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row, error } = await context.supabase
      .from("material_presentations")
      .upsert(data, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeletePresentation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("material_presentations")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ CATEGORIES (lookup + edit) ============
export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("categories")
      .select("id, slug, name, is_active, sort_order")
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  });

// ============ WAREHOUSES ============
const warehouseSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(280).optional().nullable(),
  is_active: z.boolean(),
});

export const adminListWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("warehouses")
      .select("id, code, name, address, is_active")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => warehouseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = { ...data, code: data.code.toUpperCase() };
    const { data: row, error } = await context.supabase
      .from("warehouses")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const adminDeleteWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("warehouses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ STOCK ============
export const adminListStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { warehouseId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    let q = context.supabase
      .from("inventory_stock")
      .select(
        "id, quantity, updated_at, product:products(id, name, type, sku, min_stock), warehouse:warehouses(id, code, name)",
      )
      .order("updated_at", { ascending: false });
    if (data.warehouseId) q = q.eq("warehouse_id", data.warehouseId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// ============ MOVEMENTS ============
const movementSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum(["entrada", "salida", "transferencia", "ajuste", "devolucion"]),
  quantity: z.coerce.number().positive(),
  warehouse_id: z.string().uuid(),
  warehouse_dest_id: z.string().uuid().optional().nullable(),
  reason: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const adminListMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("inventory_movements")
      .select(
        "id, movement_type, quantity, reason, notes, created_at, product:products(name, sku), warehouse:warehouses!inventory_movements_warehouse_id_fkey(code, name), warehouse_dest:warehouses!inventory_movements_warehouse_dest_id_fkey(code, name)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw error;
    return rows ?? [];
  });

export const adminApplyMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => movementSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: id, error } = await context.supabase.rpc("apply_inventory_movement", {
      _product_id: data.product_id,
      _movement_type: data.movement_type,
      _quantity: data.quantity,
      _warehouse_id: data.warehouse_id,
      _warehouse_dest_id: data.warehouse_dest_id ?? undefined,
      _reason: data.reason ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw error;
    return { id };
  });
