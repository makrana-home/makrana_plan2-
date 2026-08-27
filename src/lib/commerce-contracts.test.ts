import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  "supabase/migrations/20260822100000_add_commerce_orders_checkout.sql",
  "utf8",
);
const safetyFix = await readFile(
  "supabase/migrations/20260822130000_fix_atomic_sales_inventory_audit.sql",
  "utf8",
);
const privilegeHardening = await readFile(
  "supabase/migrations/20260827160000_harden_commerce_function_privileges.sql",
  "utf8",
);

test("la migración separa pedidos de ventas", () => {
  for (const table of [
    "orders",
    "order_items",
    "order_addresses",
    "inventory_reservations",
    "payments",
    "payment_attempts",
    "payment_events",
    "commerce_settings",
    "delivery_zones",
    "delivery_methods",
  ])
    assert.match(source, new RegExp(`CREATE TABLE public\\.${table}\\b`));
  assert.match(source, /ALTER TABLE public\.sales ADD COLUMN order_id uuid/);
  assert.doesNotMatch(source, /DROP TABLE|DROP TYPE/);
});

test("checkout fija PEN, reserva e idempotencia", () => {
  assert.match(source, /reservation_minutes integer NOT NULL DEFAULT 30/);
  assert.match(source, /checkout_key uuid NOT NULL UNIQUE/);
  assert.match(source, /idempotency_key uuid NOT NULL UNIQUE/);
  assert.match(source, /currency char\(3\) NOT NULL DEFAULT 'PEN'/);
  assert.match(source, /FOR UPDATE/);
});

test("aprobación manual converge en confirm_sale", () => {
  assert.match(source, /CREATE OR REPLACE FUNCTION public\.review_manual_payment/);
  assert.match(source, /p\.status='approved' AND o\.status='paid'/);
  assert.match(source, /public\.confirm_sale\(sale_id\)/);
  assert.match(source, /status='consumed',consumed_at=now\(\)/);
});

test("RLS impide insertar pedidos anónimos directamente", () => {
  assert.match(source, /ALTER TABLE public\.orders ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(source, /POLICY[^;]+orders[^;]+FOR INSERT TO anon/is);
  assert.match(source, /create_checkout_order\(jsonb\) TO service_role/);
});

test("factura exige datos fiscales", () => {
  assert.match(source, /billing_ruc ~ '\^\[0-9\]\{11\}\$'/);
  assert.match(source, /Completa RUC, razón social y domicilio fiscal/);
});

test("el proveedor queda identificado sin API real", () => {
  assert.match(source, /'izipay_easypay'/);
  assert.doesNotMatch(source, /webhook_secret|merchant_id|api_key/i);
});

test("recojo y pedidos digitales tienen envío cero; domicilio exige mínimo S/10", () => {
  assert.match(source, /NOT has_physical OR method\.kind='pickup'[\s\S]+shipping := 0/);
  assert.match(source, /zone\.base_fee < 10/);
  assert.match(source, /requires_coordination OR base_fee >= 10/);
});

test("el distrito debe resolver una zona activa y no se inventan tarifas", () => {
  assert.match(source, /FROM public\.delivery_zone_districts[\s\S]+JOIN public\.delivery_zones/);
  assert.match(source, /La tarifa para esta zona requiere confirmación/);
  assert.match(source, /delivery_zone_district_id/);
});

test("los distritos usan una fuente relacional normalizada y determinista", () => {
  assert.match(source, /CREATE TABLE public\.delivery_zone_districts/);
  assert.match(source, /normalized_district text GENERATED ALWAYS/);
  assert.match(source, /delivery_zone_districts_one_active_name/);
  assert.match(source, /delivery_zone_districts_one_active_ubigeo/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /delivery_zone_district_id uuid REFERENCES/);
  assert.doesNotMatch(source, /lower\(trim\(_payload#>>'\{shipping_address,district\}'\)\)/);
});

test("dinero de entrega conserva céntimos exactos", () => {
  assert.match(source, /delivery_fee_cents integer NOT NULL/);
  assert.match(source, /shipping_total = delivery_fee_cents::numeric \/ 100/);
  assert.match(source, /zone\.base_fee < 10/);
  assert.match(source, /p\.amount<>o\.total/);
});

test("la tarifa y entrega quedan congeladas como snapshots del pedido", () => {
  assert.match(source, /delivery_zone_name_snapshot text/);
  assert.match(source, /delivery_method_snapshot text NOT NULL/);
  assert.match(source, /delivery_district_snapshot text/);
  assert.match(source, /shipping_total = delivery_fee_cents::numeric \/ 100/);
});

test("el pago incluye el envío y rechaza importes manipulados", () => {
  assert.match(source, /round\(subtotal\+shipping,2\)/);
  assert.match(source, /VALUES\(ord\.id,'izipay_easypay',ord\.total,'pending'\)/);
  assert.match(source, /p\.amount<>o\.total OR p\.currency<>o\.currency/);
});

test("zonas no se eliminan y los cambios tienen auditoría", () => {
  assert.doesNotMatch(source, /GRANT[^;]*DELETE[^;]*delivery_zones/);
  assert.match(source, /commerce_audit_logs/);
});

test("WhatsApp se configura sin webhook ni envío automático", async () => {
  const page = await readFile("src/routes/_public.pedido.$code.tsx", "utf8");
  assert.match(source, /whatsapp_coordination_number text/);
  assert.match(page, /Coordinar entrega por WhatsApp/);
  assert.match(page, /data\.code/);
  assert.doesNotMatch(page, /href=\{`[^`]*(access_token|token privado)/s);
});

test("la aprobación web registra el pago antes de confirmar dentro de una transacción", () => {
  const paymentPosition = safetyFix.indexOf("INSERT INTO public.sale_payments");
  const approvalPosition = safetyFix.indexOf("UPDATE public.payments SET status='approved'");
  const confirmationPosition = safetyFix.indexOf("public.confirm_sale(sale_id)");
  assert.ok(paymentPosition > 0);
  assert.ok(approvalPosition > paymentPosition);
  assert.ok(confirmationPosition > approvalPosition);
  assert.match(safetyFix, /\[Documento: '\|\|document_intent\|\|'\]/);
  assert.match(safetyFix, /^BEGIN;[\s\S]+COMMIT;\s*$/);
});

test("el inventario concurrente no depende de ON CONFLICT con índices parciales", () => {
  const inventoryFunction = safetyFix.match(
    /CREATE OR REPLACE FUNCTION public\.apply_inventory_movement[\s\S]+?REVOKE ALL ON FUNCTION public\.apply_inventory_movement/,
  )?.[0];
  assert.ok(inventoryFunction);
  assert.doesNotMatch(inventoryFunction, /ON CONFLICT/);
  assert.match(safetyFix, /pg_advisory_xact_lock/);
  assert.match(inventoryFunction, /AND quantity >= _quantity/);
  assert.match(inventoryFunction, /presentation_id IS NOT DISTINCT FROM _presentation_id/);
});

test("la conversión conserva actor humano o técnico", () => {
  assert.match(safetyFix, /actor_type text/);
  assert.match(safetyFix, /actor_reference text/);
  assert.match(safetyFix, /'authenticated_user', 'service_role', 'database_role'/);
  assert.match(safetyFix, /request\.jwt\.claim\.role/);
  assert.match(safetyFix, /active_role/);
  assert.match(safetyFix, /converted_by IS NOT NULL OR length\(trim\(actor_reference\)\) > 0/);
});

test("las funciones comerciales exponen solo los roles necesarios", () => {
  assert.match(
    privilegeHardening,
    /apply_inventory_movement[\s\S]+FROM PUBLIC, anon;[\s\S]+TO authenticated, service_role;/,
  );
  assert.match(
    privilegeHardening,
    /guard_paid_sale_confirmation\(\)[\s\S]+FROM PUBLIC, anon, authenticated, service_role;/,
  );
  assert.doesNotMatch(
    privilegeHardening,
    /GRANT EXECUTE ON FUNCTION public\.guard_paid_sale_confirmation/,
  );
  assert.doesNotMatch(privilegeHardening, /CREATE OR REPLACE FUNCTION|DROP FUNCTION/);
});
