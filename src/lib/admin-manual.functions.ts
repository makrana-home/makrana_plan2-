import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeEditorialTitle,
  nullableEditorialText,
  nullableMeasurementText,
} from "@/lib/content-normalization";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (error) throw error;
  if (!data) throw new Error("forbidden");
}

const manualImageSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  image_url: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
  storage_path: z.string().trim().max(1000).optional().nullable(),
  alt_text: z.string().trim().max(180).optional().nullable(),
  order_index: z.coerce.number().int().nonnegative().optional().default(0),
  _deleted: z.boolean().optional(),
});

const manualMaterialSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  material_id: z.string().uuid().optional().nullable(),
  material_presentation_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().nonnegative().optional().default(0),
  unit: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  _deleted: z.boolean().optional(),
});

const manualSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  piece_id: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(6000).optional().nullable(),
  measurements: z.string().trim().max(500).optional().nullable(),
  quantity: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional().nullable(),
  images: z.array(manualImageSchema).optional().default([]),
  materials: z.array(manualMaterialSchema).optional().default([]),
});

export const adminListManualSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("manuals")
      .select("id, piece_id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminListManualWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const pieces = await sb
      .from("products")
      .select("id, type, sku, name, measurements, created_at, category:categories(id, name)")
      .in("type", ["producto_terminado", "kit"])
      .order("created_at", { ascending: false });

    if (pieces.error) throw pieces.error;

    const [manuals, materials] = await Promise.all([
      sb.from("manuals").select("id, piece_id, title, updated_at, created_at"),
      sb
        .from("products")
        .select("id, sku, name, presentations:material_presentations(id, sku, label, unit)")
        .eq("type", "material")
        .order("name", { ascending: true }),
    ]);

    const warning = [manuals.error?.message, materials.error?.message].filter(Boolean).join(" ");

    const manualByPiece = new Map(
      (manuals.data ?? []).map((manual: any) => [manual.piece_id, manual]),
    );
    return {
      rows: (pieces.data ?? []).map((piece: any) => ({
        ...piece,
        manual: manualByPiece.get(piece.id) ?? null,
      })),
      materials: materials.error ? [] : (materials.data ?? []),
      warning: warning || null,
    };
  });

export const adminGetManualByPiece = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ piece_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: piece, error: pieceError } = await sb
      .from("products")
      .select("id, type, sku, name, measurements, category:categories(id, name)")
      .eq("id", data.piece_id)
      .in("type", ["producto_terminado", "kit"])
      .maybeSingle();
    if (pieceError) throw pieceError;
    if (!piece)
      throw new Error("Primero crea la pieza en el modulo Piezas y luego vuelve a Manual.");

    const { data: manual, error: manualError } = await sb
      .from("manuals")
      .select("*")
      .eq("piece_id", data.piece_id)
      .maybeSingle();
    if (manualError) throw manualError;
    if (!manual) return { piece, manual: null };

    const [images, materials] = await Promise.all([
      sb
        .from("manual_images")
        .select("*")
        .eq("manual_id", manual.id)
        .order("order_index", { ascending: true }),
      sb
        .from("manual_materials")
        .select(
          "*, material:products(id, sku, name), presentation:material_presentations(id, sku, label, unit)",
        )
        .eq("manual_id", manual.id)
        .order("created_at", { ascending: true }),
    ]);

    if (images.error) throw images.error;
    if (materials.error) throw materials.error;
    return {
      piece,
      manual: {
        ...manual,
        images: images.data ?? [],
        materials: materials.data ?? [],
      },
    };
  });

export const adminUpsertManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => manualSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const sb = context.supabase;

    const { data: piece, error: pieceError } = await sb
      .from("products")
      .select("id")
      .eq("id", data.piece_id)
      .in("type", ["producto_terminado", "kit"])
      .maybeSingle();
    if (pieceError) throw pieceError;
    if (!piece)
      throw new Error("Primero crea la pieza en el modulo Piezas y luego vuelve a Manual.");

    const payload: any = {
      piece_id: data.piece_id,
      title: normalizeEditorialTitle(data.title),
      description: nullableEditorialText(data.description),
      measurements: nullableMeasurementText(data.measurements),
      quantity: data.quantity,
      notes: nullableEditorialText(data.notes),
    };
    if (data.id) payload.id = data.id;

    const { data: manual, error } = await sb
      .from("manuals")
      .upsert(payload, { onConflict: "piece_id" })
      .select("id")
      .single();
    if (error) throw error;

    for (const image of data.images) {
      if (image._deleted) {
        if (image.id) {
          const { error: deleteError } = await sb
            .from("manual_images")
            .delete()
            .eq("id", image.id)
            .eq("manual_id", manual.id);
          if (deleteError) throw deleteError;
        }
        continue;
      }
      if (!image.image_url) continue;
      const imagePayload: any = {
        manual_id: manual.id,
        image_url: image.image_url,
        storage_path: nullableText(image.storage_path),
        alt_text: nullableEditorialText(image.alt_text),
        order_index: image.order_index ?? 0,
      };
      if (image.id) imagePayload.id = image.id;
      const { error: imageError } = await sb
        .from("manual_images")
        .upsert(imagePayload, { onConflict: "id" });
      if (imageError) throw imageError;
    }

    for (const material of data.materials) {
      if (material._deleted) {
        if (material.id) {
          const { error: deleteError } = await sb
            .from("manual_materials")
            .delete()
            .eq("id", material.id)
            .eq("manual_id", manual.id);
          if (deleteError) throw deleteError;
        }
        continue;
      }
      if (!material.material_id) continue;
      const materialPayload: any = {
        manual_id: manual.id,
        material_id: material.material_id,
        material_presentation_id: material.material_presentation_id || null,
        quantity: material.quantity ?? 0,
        unit: nullableMeasurementText(material.unit),
        notes: nullableEditorialText(material.notes),
      };
      if (material.id) materialPayload.id = material.id;
      const { error: materialError } = await sb
        .from("manual_materials")
        .upsert(materialPayload, { onConflict: "id" });
      if (materialError) throw materialError;
    }

    return { id: manual.id };
  });

function nullableText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
