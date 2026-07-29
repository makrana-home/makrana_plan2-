import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUnitsInPresentation, PRESENTATION_UNIT_VALUES } from "@/lib/presentation-units";

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
  cost: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().nonnegative().nullable().optional(),
  ),
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
        "id, type, sku, slug, name, main_image_url, price, cost, status, is_visible, is_featured, category:categories(id, name), presentations:material_presentations(*)",
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
  unit: z.enum(PRESENTATION_UNIT_VALUES),
  label: z.string().trim().max(80).optional().nullable(),
  sku: z.string().trim().max(60).optional().nullable(),
  price: z.coerce.number().nonnegative(),
  cost: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().nonnegative().nullable().optional(),
  ),
  units_in_presentation: z.coerce.number().positive().optional(),
});

function isMissingMaterialPresentationCostColumn(error: any) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    error?.code === "PGRST204" &&
    message.includes("cost") &&
    message.includes("material_presentations")
  );
}

function isUnsupportedPresentationUnit(error: any) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    error?.code === "22P02" &&
    message.includes("presentation_unit") &&
    message.includes("invalid input value")
  );
}

export const adminUpsertPresentation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => presentationSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      ...data,
      label: data.unit === "otro" ? data.label || "otro" : data.unit,
      sku: data.sku || null,
      cost: data.cost ?? null,
      units_in_presentation: getUnitsInPresentation(data.unit, data.units_in_presentation),
    };
    let { data: row, error } = await upsertPresentationPayload(context.supabase, payload);
    if (isUnsupportedPresentationUnit(error)) {
      const retry = await upsertPresentationPayload(context.supabase, {
        ...payload,
        unit: "otro",
        label: data.unit,
      });
      row = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return row;
  });

async function upsertPresentationPayload(supabase: any, payload: Record<string, any>) {
  let { data: row, error } = await supabase
    .from("material_presentations")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();
  if (isMissingMaterialPresentationCostColumn(error)) {
    const { cost: _cost, ...payloadWithoutCost } = payload;
    const retry = await supabase
      .from("material_presentations")
      .upsert(payloadWithoutCost, { onConflict: "id" })
      .select("id")
      .single();
    row = retry.data;
    error = retry.error;
  }
  return { data: row, error };
}

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
      .select("id, slug, name, description, is_active, sort_order")
      .neq("slug", "configuracion-inicio")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map(withCategoryHomeFields);
  });

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  scope: z.enum(["piece", "material"]).optional(),
});

const editableCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  home_description: z.string().trim().max(180).optional().nullable(),
  home_image_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(999),
  show_on_home: z.boolean(),
  is_active: z.boolean(),
});

export const adminUpdateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => editableCategorySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const payload = {
      name: data.name,
      sort_order: data.sort_order,
      is_active: data.is_active,
      description: writeCategoryHomeDescription(
        "scope:piece",
        data.home_description || "",
        data.home_image_url || "",
        data.show_on_home,
      ),
    };
    const { data: row, error } = await context.supabase
      .from("categories")
      .update(payload)
      .eq("id", data.id)
      .select("id, slug, name, description, is_active, sort_order")
      .single();
    if (error) throw error;
    return withCategoryHomeFields(row);
  });

export const adminEnsureHomeCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const defaults = [
      ["arbol-de-la-vida", "Árbol de la vida", "Símbolos de conexión y equilibrio.", 10],
      [
        "murales-inspirados-en-quipus",
        "Murales inspirados en quipus",
        "Texturas, nudos y tradición reinterpretada.",
        20,
      ],
      ["murales", "Murales", "Composiciones que cuentan historias.", 30],
    ] as const;
    for (const [slug, name, homeDescription, sortOrder] of defaults) {
      const { data: existing, error: readError } = await context.supabase
        .from("categories")
        .select("id, description")
        .eq("slug", slug)
        .maybeSingle();
      if (readError) throw readError;
      if (!existing) {
        const { error } = await context.supabase.from("categories").insert({
          slug,
          name,
          description: writeCategoryHomeDescription("scope:piece", homeDescription, "", true),
          sort_order: sortOrder,
          is_active: true,
        });
        if (error) throw error;
      } else if (!String(existing.description ?? "").includes("\nHOME:")) {
        const { error } = await context.supabase
          .from("categories")
          .update({
            description: writeCategoryHomeDescription(
              "scope:piece",
              homeDescription,
              "",
              true,
            ),
            is_active: true,
          })
          .eq("id", existing.id);
        if (error) throw error;
      }
    }
    return { ok: true };
  });

function withCategoryHomeFields(category: any) {
  const marker = "\nHOME:";
  const start = String(category.description ?? "").indexOf(marker);
  let home: any = {};
  if (start >= 0) {
    try {
      home = JSON.parse(String(category.description).slice(start + marker.length));
    } catch {
      home = {};
    }
  }
  return {
    ...category,
    home_description: home.description ?? null,
    home_image_url: home.imageUrl ?? null,
    show_on_home: home.visible === true,
  };
}

function writeCategoryHomeDescription(
  scope: string,
  description: string,
  imageUrl: string,
  visible: boolean,
) {
  return `${scope}\nHOME:${JSON.stringify({ description, imageUrl, visible })}`;
}

export const adminCreateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => categorySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const slug = data.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: row, error } = await context.supabase
      .from("categories")
      .upsert(
        {
          name: data.name,
          slug,
          description: data.scope ? `scope:${data.scope}` : null,
          is_active: true,
        },
        { onConflict: "slug" },
      )
      .select("id, slug, name, description, is_active, sort_order")
      .single();
    if (error) throw error;
    return row;
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
      .eq("is_active", true)
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
    const { error } = await context.supabase
      .from("warehouses")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, archived: true };
  });

// ============ STOCK ============
const stockSelectWithPresentation =
  "id, quantity, updated_at, product:products(id, name, type, sku, min_stock, cost, price, presentations:material_presentations(*)), presentation:material_presentations(id, sku, unit, label, cost, price), warehouse:warehouses(id, code, name)";

const legacyStockSelect =
  "id, quantity, updated_at, product:products(id, name, type, sku, min_stock, cost, price, presentations:material_presentations(*)), warehouse:warehouses(id, code, name)";

const movementSelectWithPresentation =
  "id, movement_type, quantity, reason, notes, created_at, product:products(name, sku), presentation:material_presentations(id, sku, unit, label), warehouse:warehouses!inventory_movements_warehouse_id_fkey(code, name), warehouse_dest:warehouses!inventory_movements_warehouse_dest_id_fkey(code, name)";

const legacyMovementSelect =
  "id, movement_type, quantity, reason, notes, created_at, product:products(name, sku), warehouse:warehouses!inventory_movements_warehouse_id_fkey(code, name), warehouse_dest:warehouses!inventory_movements_warehouse_dest_id_fkey(code, name)";

function isMissingPresentationInventoryRelation(error: any) {
  if (!error) return false;
  const message = String(
    error?.message ?? error?.details ?? error?.hint ?? error ?? "",
  ).toLowerCase();
  return (
    ["PGRST200", "PGRST201", "PGRST204", "42703"].includes(error?.code) &&
    (message.includes("presentation") ||
      message.includes("material_presentations") ||
      message.includes("relationship") ||
      message.includes("schema cache"))
  );
}

function normalizePresentationRows(rows: any[] | null) {
  return (rows ?? []).map((row) => ("presentation" in row ? row : { ...row, presentation: null }));
}

export const adminListStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { warehouseId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    let q = context.supabase
      .from("inventory_stock")
      .select(stockSelectWithPresentation)
      .order("updated_at", { ascending: false });
    if (data.warehouseId) q = q.eq("warehouse_id", data.warehouseId);
    let { data: rows, error } = await q;
    if (isMissingPresentationInventoryRelation(error)) {
      let legacyQ = context.supabase
        .from("inventory_stock")
        .select(legacyStockSelect)
        .order("updated_at", { ascending: false });
      if (data.warehouseId) legacyQ = legacyQ.eq("warehouse_id", data.warehouseId);
      const retry = await legacyQ;
      rows = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return normalizePresentationRows(rows);
  });

// ============ MOVEMENTS ============
const movementSchema = z.object({
  product_id: z.string().uuid(),
  presentation_id: z.string().uuid().optional().nullable(),
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
    let { data: rows, error } = await context.supabase
      .from("inventory_movements")
      .select(movementSelectWithPresentation)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (isMissingPresentationInventoryRelation(error)) {
      const retry = await context.supabase
        .from("inventory_movements")
        .select(legacyMovementSelect)
        .order("created_at", { ascending: false })
        .limit(data.limit ?? 100);
      rows = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return normalizePresentationRows(rows);
  });

export const adminApplyMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => movementSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const movementPayload: Record<string, any> = {
      _product_id: data.product_id,
      _movement_type: data.movement_type,
      _quantity: data.quantity,
      _warehouse_id: data.warehouse_id,
      _warehouse_dest_id: data.warehouse_dest_id ?? undefined,
      _reason: data.reason ?? undefined,
      _notes: data.notes ?? undefined,
    };
    if (data.presentation_id) movementPayload._presentation_id = data.presentation_id;
    const { data: id, error } = await context.supabase.rpc(
      "apply_inventory_movement",
      movementPayload,
    );
    if (error) throw error;
    return { id };
  });
