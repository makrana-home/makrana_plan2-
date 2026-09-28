import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessAdminPath,
  firstAccessibleAdminPath,
  moduleForAdminPath,
  staffModuleOptions,
} from "./staff-access.ts";

test("compras tiene su propia opción de permisos", () => {
  assert.equal(moduleForAdminPath("/admin/abastecimiento"), "inventory_purchases");
  assert.ok(
    staffModuleOptions.some(
      (option) => option.key === "inventory_purchases" && option.label === "Compras y proveedores",
    ),
  );
});
test("movimientos y compras son independientes y se respeta la revocación", () => {
  assert.equal(
    canAccessAdminPath("/admin/abastecimiento", ["almacen"], ["inventory_movements"]),
    false,
  );
  assert.equal(
    canAccessAdminPath("/admin/abastecimiento", ["ventas"], ["inventory_purchases"]),
    true,
  );
  assert.equal(
    canAccessAdminPath("/admin/movimientos", ["ventas"], ["inventory_purchases"]),
    false,
  );
  assert.equal(canAccessAdminPath("/admin/abastecimiento", ["admin"], []), false);
});
test("un usuario con solo compras tiene una ruta de entrada válida", () => {
  assert.equal(
    firstAccessibleAdminPath(["ventas"], ["inventory_purchases"]),
    "/admin/abastecimiento",
  );
  assert.equal(canAccessAdminPath("/admin/abastecimiento", ["almacen"], null), true);
  assert.equal(canAccessAdminPath("/admin/abastecimiento", ["ventas"], null), false);
});
