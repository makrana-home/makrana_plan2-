import { z } from "zod";

export const purchaseItemSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del producto").max(160),
  unit: z.string().trim().min(1).max(60),
  quantity: z.coerce.number().finite().positive().max(999999),
  price: z.coerce.number().finite().nonnegative().max(999999),
  photo_path: z.string().max(250).nullable(),
});
export const inventoryPurchaseSchema = z.object({
  id: z.string().uuid(),
  supplier_name: z.string().trim().min(2).max(160),
  supplier_phone: z.string().trim().max(40),
  supplier_address: z.string().trim().max(300),
  supplier_ruc: z
    .string()
    .trim()
    .regex(/^(\d{11})?$/, "El RUC debe tener 11 dígitos"),
  receipt_number: z.string().trim().max(80),
  purchased_on: z.string().date(),
  receipt_path: z.string().max(250).nullable(),
  notes: z.string().trim().max(2000),
  items: z.array(purchaseItemSchema).min(1).max(100),
});
export type PurchaseItem = z.infer<typeof purchaseItemSchema>;
export type InventoryPurchase = z.infer<typeof inventoryPurchaseSchema> & {
  stocked_at: string | null;
  warehouse_id: string | null;
  total: number;
};
export const normalizePurchaseText = (value: string) =>
  value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
export const supplierKey = (p: InventoryPurchase) =>
  p.supplier_ruc || normalizePurchaseText(p.supplier_name);
export const purchaseTotal = (items: PurchaseItem[]) =>
  items.reduce((sum, item) => sum + Math.round(item.quantity * item.price * 100), 0) / 100;
export function comparePurchasedProducts(purchases: InventoryPurchase[]) {
  const groups = new Map<
    string,
    { name: string; unit: string; offers: { purchase: InventoryPurchase; item: PurchaseItem }[] }
  >();
  for (const purchase of purchases)
    for (const item of purchase.items) {
      const key = JSON.stringify([
        normalizePurchaseText(item.name),
        normalizePurchaseText(item.unit),
      ]);
      const group = groups.get(key) ?? { name: item.name, unit: item.unit, offers: [] };
      group.offers.push({ purchase, item });
      groups.set(key, group);
    }
  return [...groups.values()].map((group) => ({
    ...group,
    offers: group.offers.sort(
      (a, b) =>
        a.item.price - b.item.price ||
        b.purchase.purchased_on.localeCompare(a.purchase.purchased_on),
    ),
  }));
}
