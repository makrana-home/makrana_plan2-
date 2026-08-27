import { createHash, randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  presentation_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().positive().max(100),
});

const checkoutSchema = z.object({
  checkout_key: z.string().uuid(),
  items: z.array(cartItemSchema).min(1).max(50),
  first_name: z.string().trim().min(2).max(100),
  last_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(40),
  document_type: z.string().trim().max(20).optional(),
  document_number: z.string().trim().max(20).optional(),
  receipt_type: z.enum(["receipt", "invoice"]),
  billing_ruc: z.string().trim().optional(),
  billing_legal_name: z.string().trim().optional(),
  billing_fiscal_address: z.string().trim().optional(),
  delivery_method_id: z.string().uuid(),
  delivery_zone_district_id: z.string().uuid().optional().nullable(),
  shipping_address: z
    .object({
      address_line: z.string().trim().min(5).max(240),
      department: z.string().trim().min(2).max(80),
      province: z.string().trim().min(2).max(80),
      district: z.string().trim().min(2).max(80),
      reference: z.string().trim().max(240).optional(),
      recipient_name: z.string().trim().min(2).max(160).optional(),
      phone: z.string().trim().min(6).max(40).optional(),
      additional_instructions: z.string().trim().max(500).optional(),
    })
    .optional(),
  terms_accepted: z.literal(true),
  privacy_accepted: z.literal(true),
});

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function optionalVerifiedUserId() {
  const auth = getRequest().headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const db = await adminDb();
  const { data } = await db.auth.getUser(auth.slice(7));
  return data.user?.id ?? null;
}

export const getCommerceCheckoutConfig = createServerFn({ method: "GET" }).handler(async () => {
  const db = await adminDb();
  const [{ data: settings }, { data: methods }, { data: districts }] = await Promise.all([
    db
      .from("commerce_settings")
      .select(
        "pickup_enabled,lima_delivery_enabled,pickup_instructions,pending_payment_message,whatsapp_coordination_enabled,whatsapp_coordination_number,whatsapp_coordination_message,whatsapp_service_instructions,whatsapp_service_hours",
      )
      .eq("id", true)
      .single(),
    db
      .from("delivery_methods")
      .select("id,code,name,kind,fee,instructions")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("delivery_zone_districts")
      .select(
        "id,department,province,district,zone:delivery_zones!inner(id,name,base_fee,estimated_time,notes,requires_coordination,is_active)",
      )
      .eq("is_active", true)
      .eq("zone.is_active", true)
      .eq("zone.requires_coordination", false)
      .order("district"),
  ]);
  return { settings, methods: methods ?? [], districts: districts ?? [] };
});

export const getDeliveryQuote = createServerFn({ method: "POST" })
  .validator((value) => z.object({ district_id: z.string().uuid() }).parse(value))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { data: district, error } = await db
      .from("delivery_zone_districts")
      .select(
        "id,district,zone:delivery_zones!inner(id,name,base_fee,requires_coordination,is_active)",
      )
      .eq("id", data.district_id)
      .eq("is_active", true)
      .eq("zone.is_active", true)
      .eq("zone.requires_coordination", false)
      .maybeSingle();
    if (error) throw error;
    const zone: any = district?.zone;
    if (!zone)
      return {
        available: false,
        message: "La tarifa para esta zona requiere confirmación. Contáctanos por WhatsApp",
      };
    const feeCents = Math.round(Number(zone.base_fee) * 100);
    if (feeCents < 1000) throw new Error("La tarifa configurada no puede ser inferior a S/10.");
    return {
      available: true,
      district_id: district.id,
      district: district.district,
      zone_id: zone.id,
      zone_name: zone.name,
      fee_cents: feeCents,
    };
  });

export const priceCart = createServerFn({ method: "POST" })
  .validator((value) => z.object({ items: z.array(cartItemSchema).max(50) }).parse(value))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const ids = [...new Set(data.items.map((item) => item.product_id))];
    const { data: products, error } = await db
      .from("products")
      .select(
        "id,name,sku,type,status,is_visible,price,main_image_url,presentations:material_presentations(id,label,sku,price)",
      )
      .in("id", ids);
    if (error) throw error;
    return data.items.map((item) => {
      const product = products?.find((row: any) => row.id === item.product_id);
      if (!product?.is_visible || !["disponible", "por_encargo"].includes(product.status))
        throw new Error("Uno de los productos ya no está disponible.");
      const presentation = item.presentation_id
        ? product.presentations?.find((row: any) => row.id === item.presentation_id)
        : null;
      if (item.presentation_id && !presentation)
        throw new Error("La presentación seleccionada ya no está disponible.");
      const unitPrice = Number(presentation?.price ?? product.price);
      return {
        ...item,
        name: product.name,
        sku: presentation?.sku ?? product.sku,
        type: product.type,
        image_url: product.main_image_url,
        unit_price: unitPrice,
        subtotal: Number((unitPrice * item.quantity).toFixed(2)),
        physical: product.type !== "curso",
        presentation_label: presentation?.label ?? null,
      };
    });
  });

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .validator((value) => checkoutSchema.parse(value))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const cartFingerprint = createHash("sha256").update(JSON.stringify(data.items)).digest("hex");
    const { data: result, error } = await db.rpc("create_checkout_order", {
      _payload: {
        ...data,
        cart_fingerprint: cartFingerprint,
        verified_user_id: await optionalVerifiedUserId(),
      },
    });
    if (error) throw new Error(error.message);
    return result;
  });

const orderAccessSchema = z.object({
  code: z.string().trim().min(4),
  access_token: z.string().min(32),
});
export const getOrderStatus = createServerFn({ method: "POST" })
  .validator((value) => orderAccessSchema.parse(value))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const hash = createHash("sha256").update(data.access_token).digest("hex");
    const { data: order, error } = await db
      .from("orders")
      .select(
        "id,code,status,currency,subtotal,discount_total,shipping_total,total,expires_at,created_at,first_name,phone,delivery_method_snapshot,delivery_zone_name_snapshot,delivery_district_snapshot,delivery_coordination_status,delivery_method:delivery_methods(name,kind,instructions),items:order_items(id,name_snapshot,quantity,unit_price,subtotal,item_type),payments(id,status,reference,evidence_path,rejection_reason)",
      )
      .eq("code", data.code)
      .eq("access_token_hash", hash)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Pedido no encontrado o enlace inválido.");
    const { data: coordination } = await db
      .from("commerce_settings")
      .select(
        "whatsapp_coordination_enabled,whatsapp_coordination_number,whatsapp_coordination_message,whatsapp_service_instructions,whatsapp_service_hours",
      )
      .eq("id", true)
      .single();
    return { ...order, coordination };
  });

export const submitManualPayment = createServerFn({ method: "POST" })
  .validator((value) =>
    orderAccessSchema
      .extend({
        reference: z.string().trim().min(3).max(100),
        evidence_path: z.string().trim().max(500).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const hash = createHash("sha256").update(data.access_token).digest("hex");
    const { data: order } = await db
      .from("orders")
      .select("id,status")
      .eq("code", data.code)
      .eq("access_token_hash", hash)
      .single();
    if (!order || !["pending_payment", "payment_under_review"].includes(order.status))
      throw new Error("El pedido ya no admite comprobantes.");
    const { data: payment, error } = await db
      .from("payments")
      .update({
        reference: data.reference,
        evidence_path: data.evidence_path || null,
        status: "under_review",
      })
      .eq("order_id", order.id)
      .in("status", ["pending", "under_review"])
      .select("id")
      .single();
    if (error) throw error;
    await db.from("orders").update({ status: "payment_under_review" }).eq("id", order.id);
    await db.from("payment_events").upsert(
      {
        payment_id: payment.id,
        provider: "manual",
        provider_event_id: randomUUID(),
        event_type: "evidence_submitted",
        is_valid: true,
        processed_at: new Date().toISOString(),
        sanitized_payload: { has_evidence: Boolean(data.evidence_path) },
      },
      { onConflict: "provider,provider_event_id" },
    );
    return { ok: true };
  });

export const createPaymentEvidenceUpload = createServerFn({ method: "POST" })
  .validator((value) =>
    orderAccessSchema.extend({ filename: z.string().trim().min(1).max(120) }).parse(value),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const hash = createHash("sha256").update(data.access_token).digest("hex");
    const { data: order } = await db
      .from("orders")
      .select("id")
      .eq("code", data.code)
      .eq("access_token_hash", hash)
      .single();
    if (!order) throw new Error("Pedido inválido.");
    const ext = data.filename.toLowerCase().split(".").pop();
    if (!ext || !["pdf", "jpg", "jpeg", "png", "webp"].includes(ext))
      throw new Error("Formato no permitido.");
    const path = `${order.id}/${randomUUID()}.${ext}`;
    const { data: upload, error } = await db.storage
      .from("payment-evidence")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: upload.token };
  });

async function assertSalesStaff(context: any) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("forbidden");
}

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSalesStaff(context);
    const db: any = context.supabase;
    const { data, error } = await db
      .from("orders")
      .select(
        "id,code,first_name,last_name,email,status,total,currency,receipt_type,created_at,expires_at,payments(id,status,reference)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminGetOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((value) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    await assertSalesStaff(context);
    const db: any = context.supabase;
    const { data: order, error } = await db
      .from("orders")
      .select(
        "*,delivery_method:delivery_methods(*),addresses:order_addresses(*),items:order_items(*),payments:payments(*,attempts:payment_attempts(*),events:payment_events(*)),sale:sales(id,status,payment_status)",
      )
      .eq("id", data.id)
      .single();
    if (error) throw error;
    const { data: coordination } = await db
      .from("commerce_settings")
      .select(
        "whatsapp_coordination_enabled,whatsapp_coordination_number,whatsapp_coordination_message",
      )
      .eq("id", true)
      .single();
    return { ...order, coordination };
  });

export const adminGetCommerceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSalesStaff(context);
    const db: any = context.supabase;
    const [{ data: settings }, { data: warehouses }, { data: methods }, { data: zones }] =
      await Promise.all([
        db.from("commerce_settings").select("*").eq("id", true).single(),
        db.from("warehouses").select("id,name,code,is_active").eq("is_active", true).order("name"),
        db.from("delivery_methods").select("*,zone:delivery_zones(*)").order("sort_order"),
        db
          .from("delivery_zones")
          .select("*,district_rows:delivery_zone_districts(*)")
          .order("sort_order"),
      ]);
    return { settings, warehouses: warehouses ?? [], methods: methods ?? [], zones: zones ?? [] };
  });

export const adminUpdateCommerceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        reservation_minutes: z.coerce.number().int().min(5).max(1440),
        order_expiration_minutes: z.coerce.number().int().min(5).max(10080),
        default_web_warehouse_id: z.string().uuid().nullable(),
        pickup_enabled: z.boolean(),
        lima_delivery_enabled: z.boolean(),
        izipay_easypay_public_url: z
          .string()
          .url()
          .startsWith("https://")
          .optional()
          .or(z.literal("")),
        pickup_instructions: z.string().max(1000).optional(),
        pending_payment_message: z.string().min(3).max(1000),
        whatsapp_coordination_enabled: z.boolean(),
        whatsapp_coordination_number: z
          .string()
          .trim()
          .regex(/^[1-9][0-9]{7,14}$/, "Incluye código de país y solo dígitos.")
          .optional()
          .or(z.literal("")),
        whatsapp_coordination_message: z.string().trim().min(3).max(500),
        whatsapp_service_instructions: z.string().trim().max(1000).optional(),
        whatsapp_service_hours: z.string().trim().max(200).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const db: any = context.supabase;
    const { data: isAdmin } = await db.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden");
    if (data.default_web_warehouse_id) {
      const { data: warehouse } = await db
        .from("warehouses")
        .select("id")
        .eq("id", data.default_web_warehouse_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!warehouse) throw new Error("Selecciona un almacén activo.");
    }
    const { data: before } = await db.from("commerce_settings").select("*").eq("id", true).single();
    const payload = {
      ...data,
      izipay_easypay_public_url: data.izipay_easypay_public_url || null,
      whatsapp_coordination_number: data.whatsapp_coordination_number || null,
      updated_by: context.userId,
    };
    const { error } = await db.from("commerce_settings").update(payload).eq("id", true);
    if (error) throw error;
    await db.from("commerce_audit_logs").insert({
      actor_user_id: context.userId,
      action: "commerce_settings_updated",
      aggregate_type: "commerce_settings",
      reason: "Actualización administrativa",
      before_data: before,
      after_data: payload,
    });
    return { ok: true };
  });

export const adminUpdateDeliveryMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        id: z.string().uuid(),
        fee: z.coerce.number().min(0).max(10000),
        instructions: z.string().trim().max(1000).optional(),
        is_active: z.boolean(),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const db: any = context.supabase;
    const { data: isAdmin } = await db.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden");
    const { data: before } = await db
      .from("delivery_methods")
      .select("*")
      .eq("id", data.id)
      .single();
    const { error } = await db.from("delivery_methods").update(data).eq("id", data.id);
    if (error) throw error;
    await db.from("commerce_audit_logs").insert({
      actor_user_id: context.userId,
      action: "delivery_method_updated",
      aggregate_type: "delivery_method",
      aggregate_id: data.id,
      reason: "Actualización administrativa",
      before_data: before,
      after_data: data,
    });
    return { ok: true };
  });

export const adminUpsertDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        id: z.string().uuid().optional(),
        code: z.string().trim().min(2).max(80),
        name: z.string().trim().min(2).max(120),
        districts: z.array(z.string().trim().min(2).max(80)).max(100),
        base_fee: z.coerce.number().min(10).max(10000),
        is_active: z.boolean(),
        sort_order: z.coerce.number().int().min(0).max(10000),
        estimated_time: z.string().trim().max(120).optional(),
        notes: z.string().trim().max(1000).optional(),
        requires_coordination: z.boolean(),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const db: any = context.supabase;
    const { data: isAdmin } = await db.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden");
    const { data: before } = data.id
      ? await db.from("delivery_zones").select("*").eq("id", data.id).maybeSingle()
      : { data: null };
    const query = data.id
      ? db.from("delivery_zones").update(data).eq("id", data.id)
      : db.from("delivery_zones").insert(data);
    const { data: saved, error } = await query.select("*").single();
    if (error) throw error;
    const { error: districtError } = await db.rpc("replace_delivery_zone_districts", {
      _zone_id: saved.id,
      _districts: data.is_active ? data.districts : [],
    });
    if (districtError) throw districtError;
    await db.from("commerce_audit_logs").insert({
      actor_user_id: context.userId,
      action: before ? "delivery_zone_updated" : "delivery_zone_created",
      aggregate_type: "delivery_zone",
      aggregate_id: saved.id,
      reason: "Actualización administrativa de zona y tarifa",
      before_data: before,
      after_data: saved,
    });
    return saved;
  });

export const adminUpdateDeliveryCoordination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum([
          "pending_coordination",
          "contacted",
          "scheduled",
          "dispatched",
          "delivered",
          "pickup_ready",
          "picked_up",
          "cancelled",
        ]),
        scheduled_at: z.string().datetime().nullable(),
        time_window: z.string().trim().max(120).optional(),
        notes: z.string().trim().max(1000).optional(),
        responsible: z.string().trim().max(120).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    await assertSalesStaff(context);
    const db: any = context.supabase;
    const { data: before } = await db.from("orders").select("*").eq("id", data.order_id).single();
    const payload = {
      delivery_coordination_status: data.status,
      delivery_scheduled_at: data.scheduled_at,
      delivery_time_window: data.time_window,
      delivery_notes: data.notes,
      delivery_responsible: data.responsible,
      delivery_contacted_at: ["contacted", "scheduled"].includes(data.status)
        ? new Date().toISOString()
        : before.delivery_contacted_at,
    };
    const { error } = await db.from("orders").update(payload).eq("id", data.order_id);
    if (error) throw error;
    await db.from("commerce_audit_logs").insert({
      actor_user_id: context.userId,
      action: "delivery_coordination_updated",
      aggregate_type: "order",
      aggregate_id: data.order_id,
      reason: "Seguimiento de coordinación",
      before_data: before,
      after_data: payload,
    });
    return { ok: true };
  });

export const adminReviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        payment_id: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    await assertSalesStaff(context);
    const db: any = context.supabase;
    const ip = getRequest().headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { data: result, error } = await db.rpc("review_manual_payment", {
      _payment_id: data.payment_id,
      _approve: data.approve,
      _reason: data.reason,
      _ip: ip,
    });
    if (error) throw new Error(error.message);
    return result;
  });
