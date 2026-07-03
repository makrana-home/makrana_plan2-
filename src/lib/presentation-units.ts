export const PRESENTATION_UNIT_VALUES = [
  "unidad",
  "metro",
  "centimetro",
  "rollo",
  "madeja",
  "paquete",
  "bolsa",
  "caja",
  "cono",
  "bobina",
  "ovillo",
  "par",
  "media_docena",
  "docena",
  "ciento",
  "gramo",
  "kilogramo",
  "litro",
  "mililitro",
  "set",
  "kit",
  "combo",
  "otro",
] as const;

export type PresentationUnit = (typeof PRESENTATION_UNIT_VALUES)[number];

type PresentationUnitOption = {
  value: PresentationUnit;
  label: string;
  unitsInPresentation: number;
  aliases?: string[];
};

export const PRESENTATION_UNIT_OPTIONS: readonly PresentationUnitOption[] = [
  { value: "unidad", label: "Unidad", unitsInPresentation: 1, aliases: ["pieza", "unidades"] },
  { value: "metro", label: "Metro", unitsInPresentation: 1, aliases: ["m"] },
  { value: "centimetro", label: "Centímetro", unitsInPresentation: 1, aliases: ["cm"] },
  { value: "rollo", label: "Rollo", unitsInPresentation: 1 },
  { value: "madeja", label: "Madeja", unitsInPresentation: 1 },
  { value: "paquete", label: "Paquete", unitsInPresentation: 1, aliases: ["pack"] },
  { value: "bolsa", label: "Bolsa", unitsInPresentation: 1 },
  { value: "caja", label: "Caja", unitsInPresentation: 1 },
  { value: "cono", label: "Cono", unitsInPresentation: 1 },
  { value: "bobina", label: "Bobina", unitsInPresentation: 1 },
  { value: "ovillo", label: "Ovillo", unitsInPresentation: 1 },
  { value: "par", label: "Par", unitsInPresentation: 2, aliases: ["2 unidades"] },
  {
    value: "media_docena",
    label: "Media docena",
    unitsInPresentation: 6,
    aliases: ["media docena", "6 unidades", "seis"],
  },
  {
    value: "docena",
    label: "Docena",
    unitsInPresentation: 12,
    aliases: ["12", "12 unidades", "doce", "por docena"],
  },
  {
    value: "ciento",
    label: "Ciento",
    unitsInPresentation: 100,
    aliases: ["100", "100 unidades", "cien", "centena"],
  },
  { value: "gramo", label: "Gramo", unitsInPresentation: 1, aliases: ["g", "gr"] },
  { value: "kilogramo", label: "Kilogramo", unitsInPresentation: 1, aliases: ["kg", "kilo"] },
  { value: "litro", label: "Litro", unitsInPresentation: 1, aliases: ["l"] },
  { value: "mililitro", label: "Mililitro", unitsInPresentation: 1, aliases: ["ml"] },
  { value: "set", label: "Set", unitsInPresentation: 1 },
  { value: "kit", label: "Kit", unitsInPresentation: 1 },
  { value: "combo", label: "Combo", unitsInPresentation: 1 },
  { value: "otro", label: "Otro", unitsInPresentation: 1 },
];

const UNIT_OPTIONS_BY_VALUE = new Map(
  PRESENTATION_UNIT_OPTIONS.map((option) => [option.value, option]),
);

const UNIT_ALIASES = new Map<string, PresentationUnit>();

for (const option of PRESENTATION_UNIT_OPTIONS) {
  for (const value of [option.value, option.label, ...(option.aliases ?? [])]) {
    UNIT_ALIASES.set(normalizeUnitKey(value), option.value);
  }
}

export function getPresentationUnitLabel(
  unit: string | null | undefined,
  label?: string | null | undefined,
) {
  const normalizedUnit = normalizePresentationUnit(unit);
  if (normalizedUnit === "otro" && label) {
    const normalizedLabel = normalizePresentationUnit(label);
    if (normalizedLabel !== "otro") {
      return UNIT_OPTIONS_BY_VALUE.get(normalizedLabel)?.label ?? humanizeUnitLabel(label);
    }
    const customLabel = humanizeUnitLabel(label);
    if (customLabel && normalizeUnitKey(customLabel) !== "otro") return customLabel;
  }
  const option = UNIT_OPTIONS_BY_VALUE.get(normalizedUnit);
  return option?.label ?? "Unidad";
}

export function getUnitsInPresentation(
  unit: string | null | undefined,
  fallback: number | string | null | undefined = 1,
) {
  const option = UNIT_OPTIONS_BY_VALUE.get(normalizePresentationUnit(unit));
  if (option) return option.unitsInPresentation;
  const value = Number(fallback ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function normalizePresentationUnit(value: string | null | undefined): PresentationUnit {
  const key = normalizeUnitKey(value ?? "");
  return UNIT_ALIASES.get(key) ?? "otro";
}

function normalizeUnitKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function humanizeUnitLabel(value: string) {
  const clean = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}
