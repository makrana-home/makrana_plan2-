# Estructura administrativa: ventas, tributos e inventario

Fecha: 2026-08-20.

## Navegación

- **Ventas**: Nueva operación e historial, pedidos personalizados/web y registro de pagos.
- **Tributos**: resumen tributario, boletas y facturas, registro de compras SUNAT, libros SUNAT y datos/conexión SUNAT.
- **Inventario y almacenes**: piezas, materiales, almacenes/stock y movimientos.

Las rutas históricas se conservan. Solo cambiaron etiquetas visibles y se agregó `/admin/tributos`.

## Nueva operación

El flujo selecciona ubicación real, cliente y uno de cinco documentos comprensibles: boleta, factura,
nota de venta, pedido personalizado o cotización. La intención se conserva en el bloque interno
`[Documento: ...]` de las notas mientras la migración local permanece sin aplicar.

Una cotización o pedido permanece en borrador. Nota de venta, boleta y factura requieren pago total
confirmado. Si no existe, la intención se convierte explícitamente en cotización y no se llama a
`confirm_sale`; por tanto no se descuenta stock ni se crea una nota pagada. La factura además exige
RUC, razón social y domicilio fiscal.

`confirm_sale` sigue siendo la única operación que descuenta inventario mediante
`apply_inventory_movement`, usando `sales.warehouse_id`. Los reintentos tributarios no ejecutan esa
función. Las notas de crédito no devuelven stock automáticamente.

## Migraciones pendientes

1. `20260822100000_add_commerce_orders_checkout.sql`: pedidos web, pagos, reservas de inventario,
   entrega y vínculo opcional `sales.order_id`.
2. `20260822110000_add_tax_beta_readiness.sql`: checklist y barrera de activación Beta/producción.
3. `20260822120000_separate_sales_tax_inventory_workflow.sql`: historial idempotente de conversiones
   y barrera SQL que impide confirmar ventas sin pago o confirmar cotizaciones/pedidos.

Ninguna se aplicó a Supabase. Deben revisarse y autorizarse en ese orden.
