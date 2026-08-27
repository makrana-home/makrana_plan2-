import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUnitsInPresentation, normalizePresentationUnit } from "@/lib/presentation-units";

const importTypeSchema = z.enum(["pieces", "materials", "customers"]);
const bulkRowsSchema = z.object({
  type: importTypeSchema,
  rows: z.array(z.record(z.string())).max(500),
});

type ImportType = z.infer<typeof importTypeSchema>;
type RawRow = Record<string, string>;
type PreviewRow = {
  rowNumber: number;
  status: "ok" | "error";
  errors: string[];
  warnings: string[];
  values: Record<string, string>;
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("forbidden: solo administrador puede usar carga masiva");
}

function isMissingMaterialPresentationCostColumn(error: any) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    error?.code === "PGRST204" &&
    message.includes("cost") &&
    message.includes("material_presentations")
  );
}

function isUnsupportedPresentationUnit(error: any) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    error?.code === "22P02" &&
    message.includes("presentation_unit") &&
    message.includes("invalid input value")
  );
}

export const adminValidateBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => bulkRowsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return validateRows(context.supabase, data.type, data.rows);
  });

export const adminConfirmBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => bulkRowsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const validation = await validateRows(context.supabase, data.type, data.rows);
    if (validation.summary.invalid > 0) {
      throw new Error("Corrige errores y duplicados antes de importar.");
    }

    if (data.type === "customers") {
      const inserted = await importCustomers(context.supabase, data.rows);
      return { inserted, type: data.type };
    }

    const inserted = await importProducts(context.supabase, data.type, data.rows);
    return { inserted, type: data.type };
  });

async function validateRows(sb: any, type: ImportType, rows: RawRow[]) {
  const normalizedRows = rows.map(normalizeRowKeys);
  const [existingProducts, existingCustomers, warehouses] = await Promise.all([
    type === "customers"
      ? Promise.resolve([])
      : sb.from("products").select("id, sku, name, type, slug"),
    type === "customers"
      ? sb.from("customers").select("id, email, phone, document, full_name")
      : Promise.resolve({ data: [] }),
    type === "customers"
      ? Promise.resolve({ data: [] })
      : sb.from("warehouses").select("id, code, name, is_active"),
  ]);

  if (existingProducts.error) throw existingProducts.error;
  if (existingCustomers.error) throw existingCustomers.error;
  if (warehouses.error) throw warehouses.error;

  const productSkus: Set<string> = new Set(
    (existingProducts.data ?? []).map((row: any) => normalizeCompare(row.sku)).filter(nonEmpty),
  );
  const productNames: Set<string> = new Set(
    (existingProducts.data ?? []).map((row: any) => normalizeCompare(row.name)).filter(nonEmpty),
  );
  const customerEmails: Set<string> = new Set(
    (existingCustomers.data ?? []).map((row: any) => normalizeCompare(row.email)).filter(nonEmpty),
  );
  const customerDocuments: Set<string> = new Set(
    (existingCustomers.data ?? [])
      .map((row: any) => normalizeCompare(row.document))
      .filter(nonEmpty),
  );
  const customerPhones: Set<string> = new Set(
    (existingCustomers.data ?? []).map((row: any) => normalizeCompare(row.phone)).filter(nonEmpty),
  );
  const warehouseKeys: Set<string> = new Set(
    (warehouses.data ?? [])
      .flatMap((row: any) => [row.code, row.name])
      .map((value: string) => normalizeCompare(value))
      .filter(nonEmpty),
  );

  const fileSkus = countBy(normalizedRows.map((row) => normalizeCompare(row.sku)).filter(nonEmpty));
  const fileNames = countBy(
    normalizedRows.map((row) => normalizeCompare(productNameFor(type, row))).filter(nonEmpty),
  );
  const fileEmails = countBy(
    normalizedRows.map((row) => normalizeCompare(row.email)).filter(nonEmpty),
  );
  const fileDocuments = countBy(
    normalizedRows.map((row) => normalizeCompare(row.numero_documento)).filter(nonEmpty),
  );

  const previewRows = normalizedRows.map((row, index) => {
    if (type === "customers") {
      return validateCustomerRow(row, index + 2, {
        customerEmails,
        customerDocuments,
        customerPhones,
        fileEmails,
        fileDocuments,
      });
    }

    return validateProductRow(row, index + 2, type, {
      productSkus,
      productNames,
      fileSkus,
      fileNames,
      warehouseKeys,
    });
  });

  const invalid = previewRows.filter((row) => row.status === "error").length;
  const duplicateRows = previewRows.filter((row) =>
    row.errors.some((error) => error.toLowerCase().includes("duplic")),
  ).length;

  return {
    type,
    rows: previewRows,
    summary: {
      total: previewRows.length,
      valid: previewRows.length - invalid,
      invalid,
      duplicates: duplicateRows,
    },
  };
}

function validateProductRow(
  row: RawRow,
  rowNumber: number,
  type: "pieces" | "materials",
  context: {
    productSkus: Set<string>;
    productNames: Set<string>;
    fileSkus: Map<string, number>;
    fileNames: Map<string, number>;
    warehouseKeys: Set<string>;
  },
): PreviewRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sku = text(row.sku);
  const name = text(row.nombre);
  const quantity = text(row.cantidad);
  const warehouse = text(row.almacen);
  const price = text(row.precio);
  const cost = text(row.costo);

  if (!sku) errors.push("SKU requerido.");
  if (!name) errors.push("Nombre requerido.");
  if (sku && context.productSkus.has(normalizeCompare(sku))) {
    errors.push("SKU duplicado: ya existe en productos/materiales.");
  }
  if (sku && (context.fileSkus.get(normalizeCompare(sku)) ?? 0) > 1) {
    errors.push("SKU duplicado dentro del archivo.");
  }
  if (name && context.productNames.has(normalizeCompare(name)) && !sku) {
    errors.push("Nombre duplicado: ya existe y la fila no tiene SKU.");
  }
  if (name && (context.fileNames.get(normalizeCompare(name)) ?? 0) > 1 && !sku) {
    errors.push("Nombre duplicado dentro del archivo.");
  }
  if (price && !isNonNegativeNumber(price))
    errors.push("Precio debe ser numerico y mayor o igual a 0.");
  if (cost && !isNonNegativeNumber(cost))
    errors.push("Costo debe ser numerico y mayor o igual a 0.");
  if (quantity && !isNonNegativeNumber(quantity)) {
    errors.push("Cantidad debe ser numerica y mayor o igual a 0.");
  }
  if (quantity && Number(quantity) > 0 && !warehouse) {
    errors.push("Almacen requerido cuando hay cantidad.");
  }
  if (warehouse && !context.warehouseKeys.has(normalizeCompare(warehouse))) {
    errors.push("Almacen no encontrado. Usa codigo o nombre existente.");
  }
  if (type === "pieces" && row.estado && !normalizeProductStatus(row.estado)) {
    errors.push("Estado invalido. Usa disponible, por_encargo, agotado o reservado.");
  }
  if (type === "pieces" && row.visible_catalogo && parseBoolean(row.visible_catalogo) == null) {
    errors.push("visible_catalogo debe ser si/no, true/false o 1/0.");
  }
  if (
    type === "materials" &&
    !text(row.unidad) &&
    text(row.presentacion) &&
    normalizePresentationUnit(row.presentacion) === "otro"
  ) {
    warnings.push("Sin unidad reconocida: se usara otro para la presentacion.");
  }

  return {
    rowNumber,
    status: errors.length ? "error" : "ok",
    errors,
    warnings,
    values: row,
  };
}

function validateCustomerRow(
  row: RawRow,
  rowNumber: number,
  context: {
    customerEmails: Set<string>;
    customerDocuments: Set<string>;
    customerPhones: Set<string>;
    fileEmails: Map<string, number>;
    fileDocuments: Map<string, number>;
  },
): PreviewRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fullName = customerFullName(row);
  const email = text(row.email);
  const document = text(row.numero_documento);
  const phone = text(row.whatsapp) || text(row.telefono);

  if (!fullName) errors.push("Nombre, apellido o razon_social requerido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email invalido.");
  if (email && context.customerEmails.has(normalizeCompare(email))) {
    errors.push("Email duplicado: ya existe en clientes.");
  }
  if (email && (context.fileEmails.get(normalizeCompare(email)) ?? 0) > 1) {
    errors.push("Email duplicado dentro del archivo.");
  }
  if (document && context.customerDocuments.has(normalizeCompare(document))) {
    errors.push("Documento duplicado: ya existe en clientes.");
  }
  if (document && (context.fileDocuments.get(normalizeCompare(document)) ?? 0) > 1) {
    errors.push("Documento duplicado dentro del archivo.");
  }
  if (!email && !phone && !document) {
    warnings.push("Sin email, telefono ni documento: sera dificil detectar duplicados futuros.");
  }
  if (phone && context.customerPhones.has(normalizeCompare(phone))) {
    warnings.push("Telefono ya existe en clientes.");
  }

  return {
    rowNumber,
    status: errors.length ? "error" : "ok",
    errors,
    warnings,
    values: row,
  };
}

async function importProducts(sb: any, type: "pieces" | "materials", rows: RawRow[]) {
  const normalizedRows = rows.map(normalizeRowKeys);
  const { data: warehouses, error: warehouseError } = await sb
    .from("warehouses")
    .select("id, code, name, is_active");
  if (warehouseError) throw warehouseError;

  let inserted = 0;
  for (const row of normalizedRows) {
    const categoryId = await ensureCategory(
      sb,
      row.categoria,
      type === "pieces" ? "piece" : "material",
    );
    const quantity = numberOrZero(row.cantidad);
    const warehouse = findWarehouse(warehouses ?? [], row.almacen);
    const productPayload = buildProductPayload(row, type, categoryId);

    const { data: product, error } = await sb
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();
    if (error) throw error;

    let presentationId: string | null = null;
    if (type === "materials" && (text(row.presentacion) || text(row.unidad))) {
      const presentationUnit = normalizePresentationUnit(row.unidad || row.presentacion);
      const presentationPayload = {
        product_id: product.id,
        unit: presentationUnit,
        label: presentationUnit,
        sku: null,
        cost: numberOrZero(row.costo),
        price: numberOrZero(row.precio),
        units_in_presentation: getUnitsInPresentation(presentationUnit),
      };
      let { data: presentation, error: presentationError } = await insertPresentationPayload(
        sb,
        presentationPayload,
      );
      if (isUnsupportedPresentationUnit(presentationError)) {
        const retry = await insertPresentationPayload(sb, {
          ...presentationPayload,
          unit: "otro",
          label: presentationUnit,
        });
        presentation = retry.data;
        presentationError = retry.error;
      }
      if (presentationError) throw presentationError;
      presentationId = presentation?.id ?? null;
    }

    if (quantity > 0 && warehouse) {
      const { error: movementError } = await sb.rpc("apply_inventory_movement", {
        _product_id: product.id,
        _movement_type: "ajuste",
        _quantity: quantity,
        _warehouse_id: warehouse.id,
        _warehouse_dest_id: undefined,
        _reason: "Carga masiva desde Configuracion",
        _notes: null,
        _presentation_id: presentationId ?? undefined,
      });
      if (movementError) throw movementError;
    }

    inserted += 1;
  }

  return inserted;
}

async function insertPresentationPayload(sb: any, payload: Record<string, any>) {
  let { data, error } = await sb
    .from("material_presentations")
    .insert(payload)
    .select("id")
    .single();
  if (isMissingMaterialPresentationCostColumn(error)) {
    const { cost: _cost, ...payloadWithoutCost } = payload;
    const retry = await sb
      .from("material_presentations")
      .insert(payloadWithoutCost)
      .select("id")
      .single();
    data = retry.data;
    error = retry.error;
  }
  return { data, error };
}

async function importCustomers(sb: any, rows: RawRow[]) {
  const normalizedRows = rows.map(normalizeRowKeys);
  let inserted = 0;

  for (const row of normalizedRows) {
    const payload = {
      full_name: customerFullName(row),
      email: nullable(row.email),
      phone: nullable(row.whatsapp || row.telefono),
      document: nullable(compactDocument(row.tipo_documento, row.numero_documento)),
      location: nullable(
        [row.direccion, row.distrito, row.provincia, row.departamento, row.pais]
          .map(text)
          .filter(nonEmpty)
          .join(", "),
      ),
      source: nullable(row.como_conocio),
      interests: nullable(row.tipo_cliente),
      notes: nullable(customerNotes(row)),
    };
    const { error } = await sb.from("customers").insert(payload);
    if (error) throw error;
    inserted += 1;
  }

  return inserted;
}

function buildProductPayload(row: RawRow, type: "pieces" | "materials", categoryId: string | null) {
  const name = text(row.nombre);
  const sku = text(row.sku);
  const notes =
    type === "materials"
      ? [
          row.grupo_mayor ? `Grupo mayor: ${row.grupo_mayor}` : "",
          row.grosor ? `Grosor: ${row.grosor}` : "",
          row.observaciones,
        ]
          .map(text)
          .filter(nonEmpty)
          .join("\n")
      : text(row.observaciones);

  return {
    type: type === "pieces" ? "producto_terminado" : "material",
    sku,
    slug: slugify(`${name}-${sku}`),
    name,
    description: nullable(row.descripcion),
    short_description: nullable(row.descripcion),
    category_id: categoryId,
    price: numberOrZero(row.precio),
    cost: numberOrZero(row.costo),
    status: type === "pieces" ? (normalizeProductStatus(row.estado) ?? "disponible") : "disponible",
    measurements: nullable(type === "pieces" ? row.medidas : row.grosor),
    color: nullable(row.color),
    material: nullable(type === "pieces" ? row.material_principal : row.presentacion),
    supplier: nullable(row.proveedor),
    internal_notes: nullable(notes),
    is_visible: type === "pieces" ? (parseBoolean(row.visible_catalogo) ?? true) : false,
    is_featured: false,
    min_stock: 0,
  };
}

async function ensureCategory(sb: any, name: string | undefined, scope: "piece" | "material") {
  const cleanName = text(name);
  if (!cleanName) return null;
  const slug = slugify(cleanName);
  const { data, error } = await sb
    .from("categories")
    .upsert(
      {
        slug,
        name: cleanName,
        description: `scope:${scope}`,
        is_active: true,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function findWarehouse(warehouses: any[], value: string | undefined) {
  const key = normalizeCompare(value);
  if (!key) return null;
  return (
    warehouses.find(
      (warehouse) =>
        normalizeCompare(warehouse.code) === key || normalizeCompare(warehouse.name) === key,
    ) ?? null
  );
}

function productNameFor(type: ImportType, row: RawRow) {
  return type === "customers" ? customerFullName(row) : row.nombre;
}

function customerFullName(row: RawRow) {
  const businessName = text(row.razon_social);
  if (businessName) return businessName;
  return [row.nombre, row.apellido].map(text).filter(nonEmpty).join(" ").trim();
}

function customerNotes(row: RawRow) {
  return [
    row.codigo_cliente ? `Codigo cliente: ${row.codigo_cliente}` : "",
    row.tipo_documento ? `Tipo documento: ${row.tipo_documento}` : "",
    row.telefono && row.whatsapp && row.telefono !== row.whatsapp
      ? `Telefono: ${row.telefono}`
      : "",
    row.observaciones,
  ]
    .map(text)
    .filter(nonEmpty)
    .join("\n");
}

function compactDocument(type: string | undefined, value: string | undefined) {
  const documentValue = text(value);
  if (!documentValue) return "";
  const documentType = text(type);
  return documentType ? `${documentType}: ${documentValue}` : documentValue;
}

function normalizeRowKeys(row: RawRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), text(value)]),
  );
}

function normalizeKey(value: string) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCompare(value: string | undefined | null) {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductStatus(value: string | undefined) {
  const key = normalizeCompare(value).replace(/\s+/g, "_");
  if (!key) return null;
  const map: Record<string, string> = {
    disponible: "disponible",
    por_encargo: "por_encargo",
    agotado: "agotado",
    reservado: "reservado",
  };
  return map[key] ?? null;
}

function parseBoolean(value: string | undefined) {
  const key = normalizeCompare(value);
  if (!key) return null;
  if (["si", "sí", "true", "1", "visible", "yes"].includes(key)) return true;
  if (["no", "false", "0", "oculto", "hidden"].includes(key)) return false;
  return null;
}

function countBy(values: string[]) {
  return values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

function isNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function numberOrZero(value: string | undefined) {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nullable(value: string | undefined | null) {
  const clean = text(value);
  return clean ? clean : null;
}

function text(value: string | undefined | null) {
  return String(value ?? "").trim();
}

function nonEmpty(value: string): value is string {
  return value.length > 0;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}
