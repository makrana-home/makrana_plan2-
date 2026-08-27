# Informe posterior al push remoto

Fecha: 2026-08-27
Proyecto: `makrana-home art`
Referencia: `uvrowpwazvwbwlxuawbc`

## Migraciones aplicadas

1. `20260822100000_add_commerce_orders_checkout.sql`
2. `20260822110000_add_tax_beta_readiness.sql`
3. `20260822120000_separate_sales_tax_inventory_workflow.sql`
4. `20260822130000_fix_atomic_sales_inventory_audit.sql`

El comando ejecutado fue `npx supabase db push --linked`. Las cuatro migraciones se aplicaron en
el orden autorizado. No se ejecutó `migration repair`, restauración, seed, despliegue ni otra
migración.

El historial local/remoto coincide y termina en `20260822130000`. Cada versión aparece una sola
vez y un `db push --dry-run` posterior respondió `Remote database is up to date`.

## Verificación remota no mutante

- Nuevo dump de esquema público generado correctamente.
- Tablas comerciales y `sale_document_conversions`: presentes.
- RLS de conversiones y política para ventas: presentes.
- Triggers de pago obligatorio y auditoría de conversiones: presentes.
- Unicidad de `orders.checkout_key` y `payment_attempts.idempotency_key`: presente.
- Orden atómico `sale_payments` → pago aprobado → `confirm_sale`: verificado en la función remota.
- Bloqueo advisory de inventario: presente.
- Restricción de identidad del actor: presente.
- Existe una sola firma de `apply_inventory_movement`; la sobrecarga obsoleta desapareció.
- Linter remoto: sin error `42P10`. Solo permanece la advertencia histórica
  `save_calendar_event/_is_sales`, ajena a esta fase.

No se invocaron funciones mutantes ni se insertaron datos de prueba en producción.

## Conservación de datos reales

Comparación de dumps antes/después:

| Tabla | Antes | Después |
|---|---:|---:|
| `sales` | 26 | 26 |
| `sale_items` | 21 | 21 |
| `sale_payments` | 17 | 17 |
| `customers` | 0 | 0 |
| `products` | 52 | 52 |
| `inventory_stock` | 5 | 5 |
| `inventory_movements` | 12 | 12 |
| `receipts` | 4 | 4 |
| `tax_documents` | 0 | 0 |
| `purchases` | 0 | 0 |

Las nuevas filas permanentes son exclusivamente las configuraciones iniciales previstas por la
migración comercial: configuración comercial, zona de Lima y métodos de entrega. No se crearon
ventas, pagos, clientes, productos ni movimientos ficticios.

## Tipos y aplicación

- Tipos TypeScript regenerados desde el proyecto remoto en
  `src/integrations/supabase/types.ts`.
- TypeScript: aprobado.
- Plataforma/comercio: 47/47 pruebas.
- Tributación mock: 14/14 pruebas.
- ESLint acotado: cero errores. Permanecen cuatro advertencias históricas en Ventas y una
  advertencia informativa porque el archivo generado de tipos está ignorado por ESLint.
- Build de producción: aprobado.

## Bloqueos externos

Continúan declarados:

```env
SUNAT_ENVIRONMENT=mock
SUNAT_CPE_ENABLED=false
SUNAT_AUTO_ISSUE_ENABLED=false
SUNAT_DAILY_SUMMARY_ENABLED=false
SIRE_SYNC_ENABLED=false
SIRE_SUBMISSION_ENABLED=false
SUNAT_PRODUCTION_UNLOCK=false
```

No se configuraron certificado, Clave SOL, credenciales SIRE, SUNAT Beta, SUNAT producción ni
Izipay real.

## Estado de cierre

Las migraciones y el esquema remoto quedaron verificados. El respaldo previo continúa disponible
localmente y excluido de Git. No se desplegó la aplicación y no se inició el QA visual autenticado.
Ambos pasos requieren autorización posterior.
