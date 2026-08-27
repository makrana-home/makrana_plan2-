import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeEditorialText,
  normalizeEditorialTitle,
  normalizeLiteralText,
  normalizeMeasurementText,
  nullableEditorialText,
} from "./content-normalization.ts";

test("normaliza espacios, puntuación y términos frecuentes de Makrana", () => {
  assert.equal(
    normalizeEditorialText("  artesania en macrame ,hecha con tecnicas manuales. envio incluido "),
    "Artesanía en macramé, hecha con técnicas manuales. Envío incluido",
  );
});

test("respeta saltos de párrafo y capitaliza oraciones", () => {
  assert.equal(
    normalizeEditorialText("primera frase. segunda frase\n\ntercera"),
    "Primera frase. Segunda frase\n\nTercera",
  );
});

test("normaliza títulos sin convertir nombres propios a minúsculas", () => {
  assert.equal(normalizeEditorialTitle("  colección Makrana 2026 "), "Colección Makrana 2026");
});

test("uniformiza medidas y conserva decimales", () => {
  assert.equal(normalizeMeasurementText("120cms x 1,5 metros; 500 gr."), "120 cm × 1,5 m; 500 g");
});

test("convierte contenido vacío en null", () => {
  assert.equal(nullableEditorialText("   "), null);
});

test("preserva nombres propios y términos ambiguos", () => {
  assert.equal(normalizeLiteralText("  MACRAME Studio  "), "MACRAME Studio");
});
