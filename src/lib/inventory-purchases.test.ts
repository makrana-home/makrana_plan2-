import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePurchasedProducts,
  inventoryPurchaseSchema,
  purchaseTotal,
  supplierKey,
  type InventoryPurchase,
} from "./inventory-purchases.ts";

const purchase = (patch: Partial<InventoryPurchase> = {}): InventoryPurchase => ({
  id: "00000000-0000-4000-8000-000000000001",
  supplier_name: "Proveedor Uno",
  supplier_ruc: "20123456789",
  supplier_phone: "999111222",
  supplier_address: "Lima",
  receipt_number: "B001-12",
  purchased_on: "2026-09-27",
  receipt_path: null,
  notes: "",
  stocked_at: null,
  warehouse_id: null,
  total: 20,
  items: [{ name: "Hilo algodón", unit: "rollo 100 m", price: 10, quantity: 2, photo_path: null }],
  ...patch,
});
test("compara el precio unitario sin mezclar distintas presentaciones", () => {
  const a = purchase();
  const b = purchase({
    supplier_name: "Proveedor Dos",
    supplier_ruc: "20987654321",
    items: [{ ...a.items[0], name: "  HILO   ALGODÓN ", price: 8, quantity: 10 }],
  });
  const c = purchase({ items: [{ ...a.items[0], unit: "rollo 50 m", price: 6 }] });
  const groups = comparePurchasedProducts([a, b, c]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].offers[0].purchase.supplier_name, "Proveedor Dos");
  assert.equal(groups[0].offers[0].item.price, 8);
});
test("agrupa proveedores por RUC y usa el nombre normalizado cuando no hay RUC", () => {
  assert.equal(
    supplierKey(purchase()),
    supplierKey(purchase({ supplier_name: "Otro nombre comercial" })),
  );
  assert.equal(
    supplierKey(purchase({ supplier_ruc: "", supplier_name: "  PROVEEDOR   UNO  " })),
    "proveedor uno",
  );
});
test("totaliza con redondeo por línea y rechaza cantidades o datos inválidos", () => {
  assert.equal(
    purchaseTotal([
      { ...purchase().items[0], quantity: 3, price: 0.1 },
      { ...purchase().items[0], quantity: 1, price: 0.2 },
    ]),
    0.5,
  );
  assert.equal(inventoryPurchaseSchema.safeParse(purchase()).success, true);
  for (const patch of [
    { supplier_ruc: "123" },
    { purchased_on: "2026-02-30" },
    { items: [] },
    { items: [{ ...purchase().items[0], quantity: -1 }] },
    { items: [{ ...purchase().items[0], price: Infinity }] },
  ]) {
    assert.equal(inventoryPurchaseSchema.safeParse(purchase(patch)).success, false);
  }
});
