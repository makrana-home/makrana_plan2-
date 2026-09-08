import assert from "node:assert/strict";
import test from "node:test";
import { selectSaleCustomer } from "./sale-customer.ts";
import { getSaleCustomerDisplayName } from "./sale-notes.ts";

const customer = { id: "customer-1", full_name: "Cliente de prueba" };

test("el cliente registrado queda vinculado y su nombre aparece en la tarjeta", () => {
  const draft = { customer_id: null, manual_customer_name: "Nombre rápido", total: 0 };
  const selected = selectSaleCustomer(draft, customer.id, [customer]);
  assert.equal(selected.customer_id, customer.id);
  assert.equal(selected.manual_customer_name, "");
  assert.equal(getSaleCustomerDisplayName(selected, "Sin cliente"), customer.full_name);
  assert.equal(selected.total, 0);
});

test("los eventos vacíos al cargar el selector conservan el cliente", () => {
  const draft = { customer_id: customer.id, customer, manual_customer_name: "" };
  assert.equal(selectSaleCustomer(draft, "", []), draft);
  assert.equal(getSaleCustomerDisplayName(selectSaleCustomer(draft, "", [])), customer.full_name);
});

test("cambiar o quitar el cliente actualiza también el nombre mostrado", () => {
  const draft = {
    customer_id: "old",
    customer: { id: "old", full_name: "Anterior" },
    manual_customer_name: "",
  };
  const selected = selectSaleCustomer(draft, customer.id, [customer]);
  assert.equal(getSaleCustomerDisplayName(selected), customer.full_name);
  const cleared = selectSaleCustomer(selected, "_none", [customer]);
  assert.equal(cleared.customer_id, null);
  assert.equal(getSaleCustomerDisplayName(cleared, "Sin cliente"), "Sin cliente");
});
