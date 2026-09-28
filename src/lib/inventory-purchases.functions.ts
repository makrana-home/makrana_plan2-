import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  inventoryPurchaseSchema,
  purchaseTotal,
  type InventoryPurchase,
} from "./inventory-purchases";

export const listInventoryPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const purchases: InventoryPurchase[] = [];
    // Fetch the complete history so a lower price is not hidden by the API row limit.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await context.supabase
        .from("inventory_purchases" as never)
        .select("*")
        .order("purchased_on", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("No se pudieron cargar las compras: " + error.message);
      purchases.push(...((data ?? []) as unknown as InventoryPurchase[]));
      if (!data || data.length < 500) return purchases;
    }
  });

export const saveInventoryPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => inventoryPurchaseSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (data.receipt_path && !data.receipt_path.startsWith(context.userId + "/"))
      throw new Error("Archivo no válido");
    // Product photos can be reused from purchases recorded by another staff member.
    // A receipt is still specific to the new purchase; arbitrary private paths are not accepted.
    const reusedPhotos = [
      ...new Set(
        data.items
          .map((item) => item.photo_path)
          .filter((path): path is string => !!path && !path.startsWith(context.userId + "/")),
      ),
    ];
    for (const path of reusedPhotos) {
      const { data: references, error: referenceError } = await context.supabase
        .from("inventory_purchases" as never)
        .select("id")
        .contains("items", [{ photo_path: path }])
        .limit(1);
      if (referenceError || !references?.length)
        throw new Error("La foto no pertenece a un producto del historial de compras.");
    }
    const { error } = await context.supabase
      .from("inventory_purchases" as never)
      .insert({ ...data, total: purchaseTotal(data.items), created_by: context.userId } as never);
    // The browser keeps the purchase UUID on retries after an interrupted response.
    if (error) {
      if (error.code !== "23505") throw new Error(error.message);
      const { data: existing, error: readError } = await context.supabase
        .from("inventory_purchases" as never)
        .select("*")
        .eq("id", data.id)
        .single();
      const parsed = inventoryPurchaseSchema.safeParse(existing);
      if (readError || !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(data)) {
        throw new Error(
          "Esta compra ya fue guardada con otros datos. Revisa el listado antes de registrarla nuevamente.",
        );
      }
    }
    return { id: data.id };
  });

export const stockInventoryPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        warehouse_id: z.string().uuid(),
        mappings: z
          .array(
            z.object({
              product_id: z.string().uuid().nullable(),
              presentation_id: z.string().uuid().nullable(),
              type: z.enum(["material", "producto_terminado"]),
            }),
          )
          .min(1)
          .max(100),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc(
      "stock_inventory_purchase" as never,
      { _id: data.id, _warehouse_id: data.warehouse_id, _mappings: data.mappings } as never,
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
