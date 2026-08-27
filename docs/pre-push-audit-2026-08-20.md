# Auditoría previa al push — cierre de fase tributaria

Fecha: 2026-08-20
Proyecto esperado: `makrana-home art`
Referencia enlazada comprobada: `uvrowpwazvwbwlxuawbc`
Decisión: **NO-GO; no ejecutar `supabase db push` todavía.**

Actualización posterior autorizada: se añadió localmente, sin aplicar, la migración correctiva
`20260822130000_fix_atomic_sales_inventory_audit.sql`. La decisión continúa en NO-GO hasta
ejecutar la batería PostgreSQL aislada.

## Evidencia y alcance

- El historial remoto coincide con el local hasta `20260821100000`.
- Permanecen pendientes, en este orden, `20260822100000`, `20260822110000` y `20260822120000`.
- No se ejecutó ningún comando de escritura contra Supabase remoto.
- `supabase db lint --linked --level warning` se ejecutó en modo de lectura y encontró un error existente en `public.apply_inventory_movement`.
- La prueba aislada no pudo ejecutarse: Docker Desktop no pudo iniciar. Por ello no se ha demostrado aún reset desde cero, aplicación sobre clon del esquema, RLS ni concurrencia en PostgreSQL real.

## 1. `20260822100000_add_commerce_orders_checkout.sql`

Objetivo: incorporar pedidos web, entrega, reserva temporal de inventario, pagos desacoplados y auditoría comercial sin sustituir `sales` ni `inventory_stock`.

Cambios:

- Tipos: `order_status`, `order_item_type`, `receipt_type`, `delivery_kind`, `delivery_coordination_status`, `inventory_reservation_status`, `commerce_payment_status` y `payment_attempt_status`.
- Secuencia: `order_code_seq`.
- Tablas: `commerce_settings`, `delivery_zones`, `delivery_zone_districts`, `delivery_methods`, `orders`, `order_items`, `order_addresses`, `inventory_reservations`, `payments`, `payment_attempts`, `payment_events` y `commerce_audit_logs`.
- `sales`: añade `order_id`, índice único parcial y permite `warehouse_id` nulo para ventas digitales.
- Funciones: `normalize_delivery_place`, `replace_delivery_zone_districts`, `create_checkout_order`, `review_manual_payment` y `release_expired_inventory_reservations`.
- Triggers: siete triggers de `updated_at`.
- Índices: índices de distritos, pedidos, reservas, pagos y eventos; unicidad para intento, evento, pago externo y reserva viva.
- RLS: se habilita en las doce tablas. Lectura pública únicamente para zonas, distritos y métodos activos; cliente limitado a sus pedidos; ventas administra pedidos/pagos; inventario lee reservas; auditoría queda para administrador.
- Bucket: asegura `payment-evidence` como privado. El bucket ya figura en migraciones previas, por lo que el `ON CONFLICT` no crea una segunda copia.
- Datos iniciales: una configuración comercial, una zona Lima Metropolitana y métodos de recojo/envío. No inserta clientes, ventas, productos ni stock ficticio.

Dependencias: requiere las tablas y funciones aplicadas hasta `20260821100000`, especialmente `warehouses`, `products`, `material_presentations`, `customers`, `sales`, `sale_items`, `inventory_stock`, `confirm_sale`, `has_role`, `is_staff` y `tg_set_updated_at`.

Riesgo: medio-alto por el tamaño y por integrar aprobación de pagos con confirmación e inventario. No elimina tablas, columnas ni datos y no crea inventario paralelo: `inventory_reservations` es una retención, mientras el descuento físico continúa en `confirm_sale` → `apply_inventory_movement`. Todo está dentro de una transacción.

Reversión: posible pero manual y condicionada. Deben retirarse primero funciones/políticas/tablas en orden inverso; `sales.order_id` solo puede eliminarse tras preservar referencias, y `warehouse_id NOT NULL` solo puede restaurarse si no existen ventas digitales con valor nulo. Se recomienda restauración desde snapshot en vez de rollback improvisado.

## 2. `20260822110000_add_tax_beta_readiness.sql`

Objetivo: guardar requisitos de preparación para una futura habilitación controlada; no conecta SUNAT.

Cambios:

- `tax_settings`: añade `prices_include_igv`, `tax_email`, `readiness_statuses`, `xsd_tests_passed_at`, `beta_authorized_at` y `beta_authorized_by`.
- Restricción: `readiness_statuses` debe ser un objeto JSON.
- Función: `tax_environment_ready(uuid,text)` exige datos fiscales, certificado marcado como configurado y vigente, validaciones, autorización Beta y series 01/03/07; `mock` permanece permitido.
- Permiso: ejecución solo para usuarios autenticados.
- No crea tablas, triggers, índices, políticas ni buckets.

Dependencias: `tax_settings` y `tax_document_series`, creadas por `20260821100000`, y `auth.users`.

Riesgo: bajo. Es aditiva y los campos nuevos, salvo el JSON con valor por defecto, admiten nulos. No activa Beta ni producción. Reversión manual eliminando primero función/restricción y luego columnas; puede perder datos de preparación si ya fueron usados.

## 3. `20260822120000_separate_sales_tax_inventory_workflow.sql`

Objetivo: auditar conversiones comerciales y bloquear la confirmación de ventas sin pago.

Cambios:

- Tabla: `sale_document_conversions`, con referencias restrictivas a venta, usuario y almacén, snapshot de precio y unicidad por venta/origen/destino.
- Funciones: `sale_document_intent`, `guard_paid_sale_confirmation` y `audit_sale_document_conversion`.
- Triggers sobre `sales`: bloqueo antes de confirmar y auditoría después de cambiar notas.
- RLS: lectura e inserción para administrador/ventas; la inserción exige `converted_by = auth.uid()`.
- No crea buckets, no modifica inventario y no llama a SUNAT.

Dependencias: `sales`, `sale_payments`, `warehouses`, `has_role` y el formato `[Documento: ...]`. Debe aplicarse después de la migración comercial.

Riesgo actual: **alto/bloqueante**. `review_manual_payment` de la primera migración llama a `confirm_sale` antes de marcar `payments.status='approved'` y no crea una fila en `sale_payments`. El trigger nuevo suma únicamente `sale_payments`; por tanto, una aprobación web válida se abortaría como no pagada. La transacción evita un descuento parcial de stock, pero el flujo comercial quedaría inutilizable.

Riesgo adicional: el trigger de auditoría inserta `auth.uid()` en una columna no nula. Una actualización legítima ejecutada bajo un contexto sin usuario podría fallar. Debe definirse explícitamente la política para operaciones `service_role` antes del push.

Reversión: retirar ambos triggers, luego las tres funciones y finalmente la tabla. La tabla debe exportarse antes si ya contiene auditoría.

## Hallazgos transversales

1. Ninguna de las tres migraciones elimina o renombra ventas, clientes, productos, stock o pedidos existentes.
2. Ninguna cambia timestamps de migraciones ya aplicadas ni contiene secretos.
3. No existen llamadas a SUNAT, SIRE o Izipay real en las migraciones. La URL Izipay queda como dato configurable y nullable.
4. Las tres migraciones son atómicas (`BEGIN`/`COMMIT`), pero no son totalmente reejecutables; tipos, tablas, políticas y varios triggers usan creación directa.
5. `supabase db lint --linked` reporta en el esquema remoto: `public.apply_inventory_movement` / SQLSTATE `42P10`, “no unique or exclusion constraint matching the ON CONFLICT specification”. Este error es anterior a las tres migraciones, pero afecta la ruta que descontará stock y debe reproducirse y corregirse mediante una migración nueva, nunca editando una ya aplicada.
6. La unicidad de conversiones permite registrar solo una vez cada par origen/destino por venta; una conversión repetida se silencia con `ON CONFLICT DO NOTHING`. Es seguro para idempotencia, aunque no conserva ciclos repetidos como eventos separados.

## Prueba aislada pendiente

No se afirma que las migraciones pasen en PostgreSQL hasta completar:

1. Arranque de Docker/Supabase local.
2. `supabase db reset` desde cero.
3. Ejecución de pruebas de contratos, RLS, roles, concurrencia, correlativos, pago y stock.
4. Segundo escenario construido hasta `20260821100000`, seguido por las tres pendientes en orden.
5. Verificación de rollback sobre una copia desechable.

No se usará Supabase remoto como sustituto de esta prueba.

## 4. `20260822130000_fix_atomic_sales_inventory_audit.sql`

Objetivo: corregir aditivamente los bloqueos encontrados sin editar migraciones históricas ni
las tres migraciones previamente auditadas.

Cambios:

- Añade la función interna `mutate_inventory_stock`, protegida con
  `pg_advisory_xact_lock`, para crear o actualizar una fila lógica de stock sin inferencia de
  índices parciales mediante `ON CONFLICT`.
- Sustituye `apply_inventory_movement` conservando firma, permisos, validaciones y escritura en
  `inventory_movements`. Las salidas continúan usando un `UPDATE ... quantity >= _quantity`
  atómico y las transferencias permanecen dentro de una sola transacción.
- Amplía `sale_document_conversions` con `actor_type` y `actor_reference`; `converted_by` admite
  nulo únicamente cuando queda una identidad técnica explícita. Dos restricciones garantizan
  tipo de actor válido e identidad no vacía.
- Sustituye el trigger de auditoría para registrar `authenticated_user`, `service_role` o el rol
  de base de datos, conservando además el UUID cuando existe.
- Sustituye `review_manual_payment`: crea la venta con intención boleta/factura, registra primero
  el pago en `sale_payments`, marca el pago comercial aprobado y solo después llama a
  `confirm_sale`. Todo está contenido en la transacción de la función; cualquier error revierte
  venta, pago, recibo, reservas y movimientos de stock.

Riesgo: medio hasta completar PostgreSQL aislado. La serialización por clave evita carreras de
creación de stock; operaciones sobre claves diferentes permanecen paralelas. La función interna
no es ejecutable por `anon` ni `authenticated` y solo se alcanza desde la función pública que
valida personal autorizado.

Reversión: restaurar las definiciones anteriores de `review_manual_payment` y
`apply_inventory_movement` mediante una migración inversa; eliminar primero
`mutate_inventory_stock`; restaurar el trigger anterior; retirar restricciones y columnas de
actor solo después de exportar su auditoría. No se recomienda volver a una versión que reactive
los defectos; ante un fallo remoto se prefiere restaurar el snapshot previo.

## Verificaciones locales sin PostgreSQL

- TypeScript (`npx tsc --noEmit`): aprobado.
- Plataforma y comercio: 47/47 pruebas aprobadas, incluidas nuevas verificaciones de orden de
  pago, ausencia del `ON CONFLICT` defectuoso y trazabilidad del actor.
- Tributación mock: 14/14 pruebas aprobadas.
- ESLint sobre archivos afectados: cero errores; cuatro advertencias históricas de hooks en la
  pantalla de ventas.
- Build de producción: aprobado.
- Prueba PostgreSQL, RLS y concurrencia real: pendiente exclusivamente por Docker Desktop.

## Cambios que recibiría Supabase si se autorizara hoy

Recibiría exactamente las doce tablas comerciales, ocho enums, una secuencia,
funciones/políticas/índices comerciales, seis columnas tributarias, una función de preparación,
una tabla de conversiones, dos triggers de venta y la cuarta migración correctiva descrita arriba.
También relajaría `sales.warehouse_id` y añadiría `sales.order_id`. Mientras falte la prueba
PostgreSQL aislada, **no debe autorizarse ni ejecutarse todavía**.

## Copia de seguridad recomendada

Antes de cualquier push futuro:

1. Backup lógico de esquema y datos de `public`, `auth` y metadatos relevantes de `storage`.
2. Exportación específica de `sales`, `sale_items`, `sale_payments`, `receipts`, `inventory_stock`, `inventory_movements`, `customers`, `products`, `warehouses`, `tax_settings` y `tax_document_series`.
3. Registro de conteos, restricciones, secuencias y hash del dump.
4. Confirmación de restauración en una base desechable.

## Plan seguro y comando futuro

Tras pasar la prueba aislada y recibir una autorización explícita distinta de la autorización
local ya concedida:

```text
npx supabase db push --linked --include-all
```

Antes del comando se volverá a comprobar que `supabase/config.toml` y `supabase/.temp/project-ref` contienen `uvrowpwazvwbwlxuawbc`. Si una migración falla, se detendrá el proceso sin reparar producción manualmente.

## Bloqueos externos

Se mantienen exigidos:

```env
SUNAT_ENVIRONMENT=mock
SUNAT_CPE_ENABLED=false
SUNAT_AUTO_ISSUE_ENABLED=false
SUNAT_DAILY_SUMMARY_ENABLED=false
SIRE_SYNC_ENABLED=false
SIRE_SUBMISSION_ENABLED=false
```

No se configuraron certificado, Clave SOL, credenciales SIRE, SUNAT Beta, SUNAT producción ni Izipay real.

## Resultado final de validación aislada — 2026-08-27

Estado técnico local: **GO para solicitar una autorización remota separada; no se realizó push.**

### Aplicación y orden

Se ejecutó satisfactoriamente `supabase db reset` desde cero. Después se ejecutó un segundo
escenario con `supabase db reset --version 20260821100000` y
`supabase migration up --local --include-all`. En ambos casos el orden final fue:

1. `20260822100000_add_commerce_orders_checkout.sql`
2. `20260822110000_add_tax_beta_readiness.sql`
3. `20260822120000_separate_sales_tax_inventory_workflow.sql`
4. `20260822130000_fix_atomic_sales_inventory_audit.sql`

### Defectos comprobados y corregidos localmente

- Se añadieron casts explícitos `delivery_kind` a los dos datos iniciales de métodos de entrega.
  La corrección mínima fue necesaria dentro de `20260822100000`, que nunca fue aplicada al
  remoto, porque PostgreSQL abortaba esa misma migración antes de que una posterior pudiera
  actuar.
- Se concedieron los privilegios SQL base de lectura/inserción sobre conversiones a
  `authenticated`; las políticas RLS continúan imponiendo administrador/ventas.
- La identidad técnica ahora usa rol JWT o rol activo, evitando confundir `service_role` con el
  propietario de una función `SECURITY DEFINER`.
- Se eliminó la sobrecarga histórica de siete argumentos de `apply_inventory_movement`. La firma
  vigente de ocho argumentos conserva compatibilidad mediante el último parámetro opcional. Esto
  eliminó definitivamente el error `42P10`.

### Pruebas PostgreSQL

- Validación transaccional: `LOCAL_ISOLATED_VALIDATION_OK` tanto desde cero como sobre el corte
  equivalente al remoto.
- Venta sin pago: bloqueada; venta, stock y movimientos permanecieron intactos.
- Venta pagada: confirmada y descontó stock una sola vez.
- Reintento de confirmación: bloqueado; no duplicó recibo ni movimiento.
- Pago web: registró primero `sale_payments`, confirmó venta y pedido en una transacción.
- Reintento de pago web: devolvió `reused=true`; una venta, un pago y un recibo.
- Conversión humana: guardó UUID y `authenticated_user`.
- Conversión técnica: guardó `service_role`, referencia técnica y UUID nulo de forma válida.
- RLS: administrador y ventas autorizados; almacén, usuario autenticado sin rol y anónimo
  bloqueados; `service_role` conservó trazabilidad.
- Concurrencia de entradas: veinte sesiones simultáneas produjeron cantidad 20 y veinte
  movimientos, sin fallos ni filas duplicadas.
- Concurrencia de ventas: dos confirmaciones compitieron por una unidad; exactamente una se
  confirmó, una quedó en borrador, el stock terminó en cero y se creó un solo recibo.
- Linter PostgreSQL local: error `42P10` eliminado. Solo queda la advertencia histórica ajena
  `save_calendar_event/_is_sales`.

### Pruebas de aplicación

- TypeScript: aprobado.
- Plataforma/comercio: 47/47.
- Tributación mock: 14/14.
- ESLint acotado: cero errores y cuatro advertencias históricas en `admin.ventas.tsx`.
- Build de producción: aprobado.

### Limpieza

Los escenarios funcionales usan una transacción terminada en `ROLLBACK`. Los datos de la prueba
de concurrencia se eliminaron mediante un `supabase db reset` posterior. La base local final no
contiene clientes, ventas, productos, pagos ni movimientos ficticios de estas pruebas.

### Riesgo restante y reversión

Riesgo residual: medio por el tamaño de la migración comercial y porque `sales.warehouse_id`
pasará a admitir nulos. No quedan errores conocidos de aplicación, RLS, pago o inventario en el
entorno aislado. La advertencia de calendario no pertenece a esta fase.

Antes de un push remoto se mantiene obligatorio el backup lógico y la verificación del proyecto
`uvrowpwazvwbwlxuawbc`. Si la aplicación remota falla, se debe detener el proceso y restaurar el
snapshot; no improvisar DDL. La reversión lógica detallada de cada migración permanece en las
secciones anteriores.
