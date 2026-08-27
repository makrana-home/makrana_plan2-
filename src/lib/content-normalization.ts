const SPANISH_ORTHOGRAPHY: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bmacrame\b/giu, "macramé"],
  [/\bartesania\b/giu, "artesanía"],
  [/\bartesanias\b/giu, "artesanías"],
  [/\bdescripcion\b/giu, "descripción"],
  [/\bdescripciones\b/giu, "descripciones"],
  [/\bcategoria\b/giu, "categoría"],
  [/\bcategorias\b/giu, "categorías"],
  [/\btecnica\b/giu, "técnica"],
  [/\btecnicas\b/giu, "técnicas"],
  [/\bdiseno\b/giu, "diseño"],
  [/\bdisenos\b/giu, "diseños"],
  [/\benvio\b/giu, "envío"],
  [/\benvios\b/giu, "envíos"],
  [/\bmedicion\b/giu, "medición"],
  [/\bmediciones\b/giu, "mediciones"],
];

const UNIT_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bmilimetros?\b|(?<!\p{L})mms?\b/giu, "mm"],
  [/\bcentimetros?\b|(?<!\p{L})cms?\b/giu, "cm"],
  [/\bkilometros?\b|(?<!\p{L})kms?\b/giu, "km"],
  [/\bmetros?\b|(?<!\p{L})mts?\b/giu, "m"],
  [/\bkilogramos?\b|(?<!\p{L})kgr?s?\b/giu, "kg"],
  [/\bgramos?\b|(?<!\p{L})grs?\b/giu, "g"],
  [/\bmililitros?\b/giu, "ml"],
  [/\blitros?\b|\blts?\b/giu, "l"],
];

function preserveInitialCase(original: string, replacement: string) {
  return /^\p{Lu}/u.test(original)
    ? replacement.charAt(0).toLocaleUpperCase("es-PE") + replacement.slice(1)
    : replacement;
}

function replaceKeepingCase(value: string, rules: ReadonlyArray<readonly [RegExp, string]>) {
  return rules.reduce(
    (text, [pattern, replacement]) =>
      text.replace(pattern, (match) => preserveInitialCase(match, replacement)),
    value,
  );
}

function capitalizeSentences(value: string) {
  return value.replace(
    /(^|[.!?…]\s+|\n+)([¿¡"“”'‘’(]*)(\p{Ll})/gu,
    (_match, prefix: string, opening: string, letter: string) =>
      `${prefix}${opening}${letter.toLocaleUpperCase("es-PE")}`,
  );
}

export function normalizeLiteralText(value: string): string;
export function normalizeLiteralText(value: null): null;
export function normalizeLiteralText(value: undefined): undefined;
export function normalizeLiteralText(value: string | null | undefined): string | null | undefined;
export function normalizeLiteralText(value: string | null | undefined) {
  if (value == null) return value;
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0 ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export function normalizeEditorialText(value: string | null | undefined) {
  if (value == null) return value;

  let text = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0 ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:!?])(?=\p{L})/gu, "$1 ")
    .trim();

  text = replaceKeepingCase(text, SPANISH_ORTHOGRAPHY);
  return capitalizeSentences(text);
}

export function normalizeEditorialTitle(value: string): string;
export function normalizeEditorialTitle(value: null): null;
export function normalizeEditorialTitle(value: undefined): undefined;
export function normalizeEditorialTitle(
  value: string | null | undefined,
): string | null | undefined;
export function normalizeEditorialTitle(value: string | null | undefined) {
  const text = normalizeEditorialText(value);
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase("es-PE") + text.slice(1);
}

export function normalizeMeasurementText(value: string | null | undefined) {
  let text = normalizeEditorialText(value);
  if (!text) return text;

  text = replaceKeepingCase(text, UNIT_ALIASES)
    .replace(/(\d|mm|cm|km|m|kg|g|ml|l)\s*[x×]\s*(?=\d)/giu, "$1 × ")
    .replace(/(\d(?:[.,]\d+)?)\s*(mm|cm|km|m|kg|g|ml|l)\b/giu, "$1 $2")
    .replace(/\b(mm|cm|km|m|kg|g|ml|l)\./giu, "$1");

  return text;
}

export function nullableEditorialText(value: string | null | undefined) {
  const text = normalizeEditorialText(value);
  return text || null;
}

export function nullableMeasurementText(value: string | null | undefined) {
  const text = normalizeMeasurementText(value);
  return text || null;
}
