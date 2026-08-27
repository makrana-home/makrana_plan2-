import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSaleItemSubtotal,
  resolveOperationBeforeConfirmation,
  validateInventoryMovement,
} from "./business-rules.ts";
import { buildQuotationReceipt } from "./quotation-receipts.ts";
import { canAccessAdminPath } from "./staff-access.ts";
import { composeSaleNotes, getSaleDocumentIntent } from "./sale-notes.ts";

test("permisos: administrador, ventas, almacén, cliente, sin rol y anónimo", () => {
  assert.equal(canAccessAdminPath("/admin/configuracion", ["admin"], null), true);
  assert.equal(canAccessAdminPath("/admin/ventas", ["ventas"], null), true);
  assert.equal(canAccessAdminPath("/admin/almacenes", ["ventas"], null), false);
  assert.equal(canAccessAdminPath("/admin/almacenes", ["almacen"], null), true);
  assert.equal(canAccessAdminPath("/admin/ventas", ["cliente"], null), false);
  assert.equal(canAccessAdminPath("/admin/ventas", [], null), false);
  assert.equal(canAccessAdminPath("/admin/ventas", [], []), false);
});

test("permisos: los módulos enviados por el cliente no conceden una ruta desconocida", () => {
  assert.equal(canAccessAdminPath("/admin/configuracion", ["ventas"], ["sales"]), false);
  assert.equal(canAccessAdminPath("/admin/ventas", ["ventas"], []), false);
});

test("venta: calcula subtotal, descuento y redondeo", () => {
  assert.equal(calculateSaleItemSubtotal(3, 9.99, 1), 28.97);
  assert.equal(calculateSaleItemSubtotal(1, 0, 0), 0);
});

test("venta: rechaza cantidad, precio y descuento inválidos", () => {
  assert.throws(() => calculateSaleItemSubtotal(0, 10));
  assert.throws(() => calculateSaleItemSubtotal(1, -1));
  assert.throws(() => calculateSaleItemSubtotal(1, 10, -1));
  assert.throws(() => calculateSaleItemSubtotal(1, 10, 10.01));
});

test("inventario: valida entradas, salidas y transferencias", () => {
  assert.doesNotThrow(() =>
    validateInventoryMovement({ movement_type: "entrada", quantity: 2, warehouse_id: "a" }),
  );
  assert.doesNotThrow(() =>
    validateInventoryMovement({ movement_type: "salida", quantity: 1, warehouse_id: "a" }),
  );
  assert.doesNotThrow(() =>
    validateInventoryMovement({
      movement_type: "transferencia",
      quantity: 1,
      warehouse_id: "a",
      warehouse_dest_id: "b",
    }),
  );
  assert.throws(() =>
    validateInventoryMovement({ movement_type: "salida", quantity: 0, warehouse_id: "a" }),
  );
  assert.throws(() =>
    validateInventoryMovement({
      movement_type: "transferencia",
      quantity: 1,
      warehouse_id: "a",
      warehouse_dest_id: "a",
    }),
  );
});

test("comprobante: conserva número real y genera fallback de cotización", () => {
  const sale = { quote_number: 42, created_at: "2026-08-20T10:00:00Z", receipt: [] };
  assert.equal(buildQuotationReceipt(sale).number, "COT-00000042");
  assert.equal(
    buildQuotationReceipt({ ...sale, receipt: [{ number: "MKR-00000007" }] }).number,
    "MKR-00000007",
  );
});

test("operación: nota sin pago se conserva como cotización y no afecta stock", () => {
  const result = resolveOperationBeforeConfirmation({ intent: "nota_venta", total: 118, paid: 0 });
  assert.equal(result.action, "convert_to_quote");
  assert.equal(result.resultingDocument, "cotizacion");
});

test("operación: boleta y factura exigen pago; cotización nunca confirma", () => {
  assert.equal(
    resolveOperationBeforeConfirmation({ intent: "boleta", total: 118, paid: 0 }).action,
    "convert_to_quote",
  );
  assert.equal(
    resolveOperationBeforeConfirmation({ intent: "factura", total: 118, paid: 118 }).action,
    "confirm_sale",
  );
  assert.equal(
    resolveOperationBeforeConfirmation({ intent: "cotizacion", total: 118, paid: 118 }).action,
    "keep_draft",
  );
});

test("conversión conserva la intención comercial sin exponer códigos tributarios", () => {
  const notes = composeSaleNotes({ channel: "Feria", documentIntent: "factura", notes: "Entrega" });
  assert.equal(getSaleDocumentIntent(notes), "factura");
  assert.equal(getSaleDocumentIntent("Sin marcador"), "cotizacion");
});
