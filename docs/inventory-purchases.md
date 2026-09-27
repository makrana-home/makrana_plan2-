# Compras y proveedores

Ruta: `/admin/abastecimiento`, dentro de Inventario y almacenes. Comparte el permiso `inventory_movements`. El registro tributario `/admin/compras` conserva su funcionamiento.

## Activación

Aplicar `supabase/migrations/20260927120000_inventory_purchases.sql` antes de publicar el código. Requiere las migraciones anteriores del proyecto. Crea la tabla `inventory_purchases`, el bucket privado `purchase-files` y la función transaccional `stock_inventory_purchase`. No modifica compras tributarias ni agrega stock a compras registradas previamente.

## Uso

1. Registrar proveedor, contacto, dirección, RUC opcional, fecha y número de boleta.
2. Adjuntar la boleta original (JPG, PNG, WebP o PDF de hasta 10 MB).
3. Completar las líneas con nombre, cantidad, unidad/presentación y precio unitario final en soles. Se puede tomar o subir una foto de cada producto. La transcripción de la boleta es manual.
4. Consultar compras por proveedor o comparar precios históricos por producto. La comparación agrupa por nombre normalizado y unidad; no convierte unidades ni interpreta equivalencias entre marcas o presentaciones.
5. Pulsar «Añadir al inventario», elegir almacén activo y vincular cada línea a un producto/presentación existente o crear una nueva pieza/material. Verificar que la cantidad y unidad coincidan con la unidad de stock seleccionada.

El ingreso bloquea la compra durante la transacción, registra movimientos y marca la compra como ingresada. Los reintentos no duplican stock. Si falla alguna línea, se revierte toda la operación. Los productos nuevos quedan ocultos del catálogo público, con costo de compra y sin precio de venta configurado. Las fotos siguen disponibles en el historial privado de compras.

## Validación

- `node --experimental-strip-types --test src/lib/inventory-purchases.test.ts`
- `npm run test:platform`
- `npx tsc --noEmit`
- `npm run build`

La migración también se verificó con PostgreSQL embebido (PGlite), usando la función real de movimientos del proyecto: creación y vinculación de productos, suma de stock, reversión por línea inválida, reintentos y rechazo de usuarios no autorizados. Esta prueba local no sustituye aplicar la migración y comprobar archivos/cámara con una sesión real de Supabase.
