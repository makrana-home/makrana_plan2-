import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { moduleForAdminPath } from "./staff-access.ts";

const root = process.cwd();

async function read(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("no quedan validadores obsoletos de TanStack Start", async () => {
  const lib = path.join(root, "src", "lib");
  const files = (await readdir(lib)).filter((file) => file.endsWith(".ts"));
  const matches: string[] = [];
  for (const file of files.filter((file) => file !== "platform-contracts.test.ts")) {
    if ((await readFile(path.join(lib, file), "utf8")).includes(".inputValidator(")) {
      matches.push(file);
    }
  }
  assert.deepEqual(matches, []);
});

test("la service role no se declara como variable VITE", async () => {
  for (const file of [".env.example", "render.yaml"]) {
    const source = await read(file);
    assert.doesNotMatch(source, /^VITE_SUPABASE_SERVICE_ROLE_KEY=/m);
    assert.doesNotMatch(source, /key:\s*VITE_SUPABASE_SERVICE_ROLE_KEY/);
  }
});

test("Render declara solo los nombres de WhatsApp usados por el servidor", async () => {
  const implementation = await read("src/lib/whatsapp-business.server.ts");
  const render = await read("render.yaml");
  const variables = [
    "WHATSAPP_BUSINESS_PHONE_NUMBER_ID",
    "WHATSAPP_BUSINESS_ACCESS_TOKEN",
    "WHATSAPP_BUSINESS_API_VERSION",
    "WHATSAPP_BUSINESS_FROM_NUMBER",
  ];
  for (const variable of variables) {
    assert.ok(implementation.includes(`process.env.${variable}`), variable);
    assert.ok(render.includes(`key: ${variable}`), variable);
  }
});

test("los nombres de migración son únicos y están ordenados cronológicamente", async () => {
  const migrationDir = path.join(root, "supabase", "migrations");
  const migrations = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql"));
  assert.equal(new Set(migrations).size, migrations.length);
  assert.ok(migrations.length >= 28, "no deben desaparecer migraciones publicadas");
  assert.deepEqual(migrations, [...migrations].sort());
  for (const migration of migrations) assert.match(migration, /^\d{14}_[a-z0-9_-]+\.sql$/i);
});

test("navegación separa ventas, tributos e inventario con etiquetas comprensibles", async () => {
  const menu = await read("src/routes/_authenticated/admin.tsx");
  for (const label of [
    "Ventas",
    "Tributos",
    "Inventario y almacenes",
    "Nueva operación",
    "Ventas de la web",
    "Comprobantes electrónicos",
    "Notas de crédito",
    "Libros SUNAT",
  ])
    assert.ok(menu.includes(label), label);
  assert.doesNotMatch(menu, /label:\s*"Datos y conexión SUNAT"/);
  assert.doesNotMatch(menu, /label:\s*"SIRE"/);
  assert.equal(moduleForAdminPath("/admin/comprobantes"), "receipts");
});

test("la interfaz unifica ventas web y conserva un único origen para emitir comprobantes", async () => {
  const sales = await read("src/routes/_authenticated/admin.ventas.tsx");
  const orders = await read("src/routes/_authenticated/admin.pedidos.tsx");
  const receipts = await read("src/routes/_authenticated/admin.comprobantes.tsx");
  for (const label of [
    "Todos",
    "Ventas de la web",
    "Boletas electrónicas",
    "Facturas electrónicas",
    "Notas de venta",
    "Pedidos personalizados",
    "Cotizaciones",
  ])
    assert.ok(sales.includes(label), label);
  for (const label of [
    "Tipo de compra",
    "Productos",
    "Documento solicitado",
    "Entrega física",
    "Acceso digital",
  ])
    assert.ok(orders.includes(label), label);
  assert.match(receipts, /title="Comprobantes electrónicos"/);
  assert.match(receipts, /<Link to="\/admin\/ventas">/);
  assert.doesNotMatch(receipts, /onClick=\{\(\) => setOpen\(true\)\}/);
});

test("autenticación deriva el usuario de claims verificados y no de datos del cliente", async () => {
  const auth = await read("src/integrations/supabase/auth-middleware.ts");
  assert.match(auth, /supabase\.auth\.getClaims\(token\)/);
  assert.match(auth, /userId:\s*data\.claims\.sub/);
  assert.doesNotMatch(auth, /userId:\s*(request|input)\./);
});

test("operaciones administrativas de escritura exigen middleware y rol en servidor", async () => {
  const products = await read("src/lib/admin.functions.ts");
  const sales = await read("src/lib/admin-sales.functions.ts");
  for (const operation of ["adminUpsertProduct", "adminApplyMovement"]) {
    assert.match(
      products,
      new RegExp(`${operation}[\\s\\S]{0,180}middleware\\(\\[requireSupabaseAuth\\]\\)`),
    );
  }
  for (const operation of ["adminCreateSale", "adminAddSaleItem", "adminConfirmSale"]) {
    assert.match(
      sales,
      new RegExp(`${operation}[\\s\\S]{0,180}middleware\\(\\[requireSupabaseAuth\\]\\)`),
    );
  }
  assert.match(products, /await assertStaff\(context\)/);
  assert.match(sales, /await assertSales\(context\)/);
});

test("inventario SQL evita cantidades inválidas y stock negativo de forma atómica", async () => {
  const inventory = await read(
    "supabase/migrations/20260703124500_add_presentation_inventory_stock.sql",
  );
  assert.match(inventory, /IF _quantity <= 0 THEN/);
  assert.match(inventory, /AND quantity >= _quantity/);
  assert.match(inventory, /stock insuficiente para descontar/);
  assert.match(inventory, /_warehouse_id = _warehouse_dest_id/);
});

test("confirmación de venta bloquea reintentos, exige ítems y numera sin duplicados", async () => {
  const confirmation = await read(
    "supabase/migrations/20260821090200_use_eight_digit_receipt_numbers.sql",
  );
  const base = await read(
    "supabase/migrations/20260624225051_822d053d-1716-4848-9b34-005350407040.sql",
  );
  assert.match(confirmation, /FOR UPDATE/);
  assert.match(confirmation, /_sale\.status <> 'borrador'/);
  assert.match(confirmation, /la venta no tiene items/);
  assert.match(confirmation, /nextval\('public\.receipt_number_seq'\)/);
  assert.match(base, /sale_id UUID NOT NULL UNIQUE/);
  assert.match(base, /number TEXT NOT NULL UNIQUE/);
});

test("consultas públicas filtran productos, novedades y talleres", async () => {
  const source = await read("src/lib/public.functions.ts");
  assert.match(source, /from\("products"\)[\s\S]{0,500}eq\("is_visible", true\)/);
  assert.match(source, /from\("news_posts"\)[\s\S]{0,400}eq\("status", "publicado"\)/);
  assert.match(source, /from\("workshops"\)[\s\S]{0,500}eq\("is_visible", true\)/);
});

test("las políticas públicas de contenido conservan condiciones de publicación", async () => {
  const base = await read(
    "supabase/migrations/20260624225051_822d053d-1716-4848-9b34-005350407040.sql",
  );
  assert.match(base, /status\s*=\s*'publicado'\s+OR\s+public\.is_staff/i);
  assert.match(base, /is_visible\s*=\s*true\s+OR\s+public\.is_staff/i);
});

test("los documentos tributarios se crean como buckets privados", async () => {
  const taxMigration = await read(
    "supabase/migrations/20260821100000_add_tax_purchases_and_sire.sql",
  );
  assert.match(taxMigration, /'tax-documents'[^;]+false/is);
  assert.match(taxMigration, /'purchase-documents'[^;]+false/is);
  assert.match(taxMigration, /'sire-files'[^;]+false/is);
});
