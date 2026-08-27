# Verificación de fase tributaria operativa

Fecha: 2026-08-20. Proyecto remoto verificado: `makrana-home art` (`uvrowpwazvwbwlxuawbc`).

## Base de datos

- La migración `20260821100000_add_tax_purchases_and_sire.sql` fue aplicada y figura en local/remoto.
- Los tipos Supabase fueron regenerados desde el proyecto vinculado.
- Una prueba remota con usuario y datos ficticios confirmó: anónimo sin lectura, vendedor con lectura, vendedor sin borrado, 20 correlativos concurrentes únicos y buckets privados.
- Los datos temporales de la prueba se eliminaron al terminar.

## PDF

El PDF se genera en backend con jsPDF y QRCode. Incluye identidad Makrana, emisor, cliente, líneas, descuentos, gravadas/exoneradas/inafectas, IGV, total, pago, QR, hash, referencia de nota de crédito, leyenda impresa y aviso mock. La muestra de QA tiene cuatro páginas, texto largo, montos grandes y caracteres españoles. Fue renderizada y revisada visualmente página por página.

## Calidad y alcance

- Las pruebas puras cubren cálculos, UBL, firma mock, PDF de los tres tipos, nota de crédito, resumen ZIP y conciliación SIRE.
- El lint específico del módulo no presenta errores ni advertencias de Hooks.
- La navegación local protege correctamente las rutas administrativas y redirige a autenticación. No se usaron credenciales guardadas durante la revisión del navegador.
- Certificado, Clave SOL, CPE real, SIRE real y producción permanecen bloqueados.

## Repetición de verificaciones

```text
npm run test:tax
npm run test:platform
npx tsc --noEmit
npm run build
npx eslint <archivos tributarios>
node --experimental-strip-types scripts/verify-tax-remote.ts
```

El último comando requiere las variables privadas de Supabase y crea únicamente datos ficticios temporales con limpieza automática.
