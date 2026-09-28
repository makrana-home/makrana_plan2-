# Compras y proveedores

Ruta: `/admin/abastecimiento`, dentro de Inventario y almacenes. Comparte el permiso `inventory_movements`. El registro tributario `/admin/compras` conserva su funcionamiento.

## Activación

Aplicar `supabase/migrations/20260927120000_inventory_purchases.sql` antes de publicar el código. Requiere las migraciones anteriores del proyecto. Crea la tabla `inventory_purchases`, el bucket privado `purchase-files` y la función transaccional `stock_inventory_purchase`. No modifica compras tributarias ni agrega stock a compras registradas previamente.

## Uso

1. Registrar proveedor, contacto, dirección, RUC opcional, fecha y número de boleta.
2. Adjuntar la boleta original (JPG, PNG, WebP o PDF de hasta 10 MB).
3. Completar las líneas con nombre, cantidad, unidad/presentación y precio unitario final en soles. Las lupas junto al proveedor y al producto permiten buscar en todo el historial. Elegir un producto reutiliza su nombre, presentación y precio histórico; revisar el precio y adjuntar su foto para la nueva compra. La cantidad actual se conserva. La transcripción de la boleta es manual.
4. Consultar compras por proveedor o comparar precios históricos por producto. La comparación agrupa por nombre normalizado y unidad; no convierte unidades ni interpreta equivalencias entre marcas o presentaciones.
5. Antes de guardar, activar opcionalmente «Añadir al inventario al guardar», elegir almacén activo y vincular cada línea a un producto/presentación existente o crear una nueva pieza/material. Verificar que la cantidad y unidad coincidan con la unidad de stock seleccionada. «Guardar compra» está disponible arriba y abajo del formulario. Con el interruptor desactivado se guarda solo la compra; se conserva la opción de ingresarla posteriormente desde el historial.

Si la compra se guarda pero el ingreso al stock falla, se muestra claramente que está guardada y se abre el ingreso pendiente para reintentarlo sin crear otra compra.

El buscador usa una vista dentro del mismo diálogo: «Volver a la compra» conserva el formulario. Tocar fuera o presionar Escape no cierra el formulario de compra. Escape dentro del buscador vuelve al formulario. «Volver al listado» conserva el borrador en memoria; «Continuar compra» permite retomarlo durante la misma visita. El borrador no persiste tras recargar la página.

El ingreso bloquea la compra durante la transacción, registra movimientos y marca la compra como ingresada. Los reintentos no duplican stock. Si falla alguna línea, se revierte toda la operación. Los productos nuevos quedan ocultos del catálogo público, con costo de compra y sin precio de venta configurado. Las fotos siguen disponibles en el historial privado de compras.

## Validación

- `node --experimental-strip-types --test src/lib/inventory-purchases.test.ts`
- `npm run test:platform`
- `npx tsc --noEmit`
- `npm run build`

La migración también se verificó con PostgreSQL embebido (PGlite), usando la función real de movimientos del proyecto: creación y vinculación de productos, suma de stock, reversión por línea inválida, reintentos y rechazo de usuarios no autorizados. Esta prueba local no sustituye aplicar la migración y comprobar archivos/cámara con una sesión real de Supabase.
