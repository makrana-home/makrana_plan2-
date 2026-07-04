type ProductSkuType = "producto_terminado" | "material" | "kit" | "curso";

const SKU_PREFIX_BY_TYPE: Record<ProductSkuType, string> = {
  producto_terminado: "PZA",
  material: "MAT",
  kit: "KIT",
  curso: "CUR",
};

export function getProductSkuPrefix(type: string | null | undefined) {
  return SKU_PREFIX_BY_TYPE[(type as ProductSkuType) || "producto_terminado"] ?? "SKU";
}

export function generateNextProductSku(items: any[], type: string | null | undefined) {
  const prefix = getProductSkuPrefix(type);
  const maxNumber = items.reduce((max, item) => {
    const parsed = parseSkuNumber(item?.sku, prefix);
    return parsed == null ? max : Math.max(max, parsed);
  }, 0);
  return `${prefix}-${String(maxNumber + 1).padStart(5, "0")}`;
}

export function generatePresentationSku(
  parentSku: string | null | undefined,
  presentations: any[],
) {
  const base = normalizeSku(parentSku) || "MAT-00000";
  const maxVariant = presentations.reduce((max, presentation) => {
    const sku = normalizeSku(presentation?.sku);
    if (!sku.startsWith(`${base}-`)) return max;
    const suffix = sku.slice(base.length + 1);
    if (!/^\d+$/.test(suffix)) return max;
    return Math.max(max, Number(suffix));
  }, 0);
  return `${base}-${String(maxVariant + 1).padStart(2, "0")}`;
}

function parseSkuNumber(value: any, prefix: string) {
  const sku = normalizeSku(value);
  const match = sku.match(new RegExp(`^${escapeRegExp(prefix)}-(\\d{1,})$`));
  return match ? Number(match[1]) : null;
}

function normalizeSku(value: any) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
