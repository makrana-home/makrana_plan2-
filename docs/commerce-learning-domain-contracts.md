# Contratos de dominio: comercio, pagos y Aula Makrana

Estado: diseño de Fase 1A. Este documento no aplica migraciones ni conecta IZYPAY. El proveedor
inicial será manual o enlace básico hasta disponer de documentación oficial, sandbox, API y
webhook.

## Decisiones vigentes

- Se conserva `/cliente`, con nombre visible **Aula Makrana**.
- El acceso inicial es indefinido; `enrollments.expires_at` permitirá vencimiento futuro y será
  `NULL` por defecto.
- La reserva de inventario dura 30 minutos por defecto, calculados por el servidor y
  configurables.
- Un kit opcional se cobra como línea separada.
- Modos de kit: `none`, `optional`, `required_included`, `required_separate`.
- Supabase Auth gestiona invitaciones, creación de contraseña y recuperación.
- No se implementan certificados.
- El checkout admite boleta o factura. El módulo tributario consume una venta confirmada y no
  se acopla al proveedor de pago.

## Contratos y estados

Los importes usan `numeric(12,2)`, moneda ISO 4217 y `PEN` inicialmente. Precios, descuentos,
impuestos y totales se recalculan en servidor; el navegador solo expresa intención de compra.

### Order

Raíz del checkout con instantáneas inmutables de nombre, tipo, SKU, precio y tratamiento
tributario de cada línea.

Flujo normal:

`draft → pending_payment → payment_under_review → paid → processing → ready_for_pickup | shipped → delivered`

Transiciones adicionales:

- `draft | pending_payment | payment_under_review → cancelled`
- `pending_payment → expired | payment_failed`
- `payment_failed → pending_payment` con un intento nuevo sobre el mismo pedido.
- `paid | processing | ready_for_pickup | shipped | delivered → refunded | partially_refunded`

`cancelled` y `refunded` son terminales. Solo el servidor cambia estados de pago. La pantalla de
retorno nunca aprueba un pedido.

### Payment

Estados: `created → pending → approved | rejected | cancelled | expired`; desde `approved` se
permite `partially_refunded → refunded` o `refunded`. `unknown` nunca concede acceso.

`payment_attempts` registra intentos y `payment_events` eventos normalizados. No se guardan PAN,
CVV ni datos bancarios sensibles. Un pago aprobado es inmutable salvo reembolsos y metadatos
sanitizados.

### Sale

`sales` sigue siendo el registro comercial/contable. Se crea una sola vez después de aprobar el
pago o la evidencia manual. `sales.order_id` será único. Comprobantes, reportes y el módulo
tributario continúan consumiendo la venta existente.

El checkout guarda `receipt_type = receipt | invoice`. Factura exige RUC, razón social y
domicilio fiscal. La emisión tributaria ocurre después de confirmar la venta, fuera de la
transacción del proveedor de pago.

### Enrollment

Estados: `pending_payment → active → completed`; `active → suspended → active`;
`pending_payment | active | suspended → cancelled`; `active | suspended | completed → refunded`.
`active → expired` solo será posible con una política futura y `expires_at` vencido.

Solo el servidor activa matrículas. Un pedido solo de kit no crea matrícula. El par
alumno/curso no puede tener más de una matrícula no cancelada. Si el correo pagador no tiene
usuario, se registra la vinculación pendiente y Supabase Auth envía la invitación; nunca se
generan ni envían contraseñas.

### Course

Estados editoriales: `draft → published → archived`; modalidades `virtual`, `in_person`,
`hybrid`; niveles `beginner`, `intermediate`, `advanced`. Recursos privados requieren matrícula
`active` o `completed`, no vencida, y URL firmada temporal.

### Kit

Un kit es un `products.type = kit`; la relación académica no duplica precio ni stock.

- `none`: sin kit vendible.
- `optional`: sugerido y cobrado como línea separada; puede omitirse.
- `required_included`: precio incluido en el curso, con asignación física separada para stock.
- `required_separate`: exige una línea compatible separada antes de crear el pedido.

Las reglas excluyen kits agotados, incompatibles o ya adquiridos, salvo reposición.

### InventoryReservation

Estados: `active → consumed | released | expired`. Se crea atómicamente al pasar a
`pending_payment`; vence a los 30 minutos configurables. Confirmar la venta la consume una sola
vez. Cancelación, rechazo o expiración la libera una sola vez. Disponibilidad = stock físico −
reservas activas no vencidas.

## Relaciones

```text
orders 1 ── n order_items
orders 1 ── n payments 1 ── n payment_attempts 1 ── n payment_events
orders 1 ── 0..1 sales 1 ── n sale_items
order_items 1 ── 0..n inventory_reservations
order_items(course) 1 ── 0..1 enrollments
courses 1 ── n course_kits n ── 1 products(type=kit)
```

El finalizador bloquea pedido y pago, valida estado/importe/moneda, crea o recupera la venta,
consume reservas, crea o recupera matrículas y registra auditoría en una sola transacción.

## Idempotencia

- `orders.checkout_key`: UUID único. Un reintento con la misma huella devuelve el pedido; una
  huella distinta produce conflicto.
- `payments`: único `(provider, provider_payment_id)` cuando existe ID externo.
- `payment_attempts.idempotency_key`: único global y generado en servidor.
- `payment_events`: único `(provider, provider_event_id)`; el modo manual usa UUID de decisión.
- `sales.order_id`: único.
- Matrícula: índice único parcial por alumno/curso para estados no cancelados.
- Reserva: índice único parcial por línea para estados `active` o `consumed`.
- Aprobación manual usa `FOR UPDATE`, registra actor/razón y llama al mismo finalizador futuro
  del webhook.
- Notificación: clave única por tipo, agregado, ID y destinatario.

## Primera migración aditiva propuesta (no aplicada)

Se crearán enums nuevos de pedido, línea, comprobante, entrega, reserva, pago, intento y evento.
No se alteran enums de `sales` ni tablas tributarias.

### `orders`

Columnas: `id uuid PK`, `code text`, `checkout_key uuid`, `cart_fingerprint text`, `user_id uuid
NULL FK auth.users`, `customer_id uuid NULL FK customers`, nombres, apellidos, correo, teléfono,
tipo/número de documento, `status`, `currency char(3) DEFAULT 'PEN'`, `subtotal`,
`discount_total`, `shipping_total`, `tax_total`, `total`, `receipt_type`, RUC/razón social/
domicilio fiscal opcionales, método de entrega, almacén opcional, `reservation_minutes DEFAULT
30`, `expires_at`, aceptaciones legales, `created_by` y timestamps.

Restricciones: códigos/huellas no vacíos; importes no negativos y total consistente; PEN
inicial; factura exige RUC de 11 dígitos, razón social y domicilio fiscal; entrega física exige
dirección; expiración posterior a creación; `UNIQUE(code)`, `UNIQUE(checkout_key)`.

Índices: `(user_id, created_at DESC)`, `(customer_id, created_at DESC)`, `(status, expires_at)`,
`created_at DESC` y parcial para pendientes vencibles.

### `order_items`

Columnas: `id`, `order_id FK CASCADE`, `line_number`, `item_type`, `product_id NULL`,
`presentation_id NULL`, `workshop_id NULL`, `course_id NULL` (FK en migración académica),
`related_course_item_id NULL` self-FK, instantáneas de nombre/SKU/tipo, `quantity`, `unit_price`,
`discount`, `tax_amount`, `subtotal`, `requires_inventory`, `kit_mode`, variante JSONB
sanitizada y timestamps.

Restricciones: una referencia comercial principal; cantidad positiva; importes no negativos y
subtotal consistente; kit opcional/`required_separate` en línea propia; `required_included` a
precio cero vinculado a curso; `UNIQUE(order_id, line_number)`.

Índices: `order_id`, `product_id`, `workshop_id`, `related_course_item_id`.

### `order_addresses`

Columnas: `id`, `order_id`, `kind` (`shipping`/`billing`), nombres, documento, teléfono,
dirección, departamento, provincia, distrito, referencia y timestamps. Restricción
`UNIQUE(order_id, kind)`. Son instantáneas y no cambian al editar el perfil.

### `inventory_reservations`

Columnas: `id`, `order_id`, `order_item_id`, `product_id`, `presentation_id NULL`,
`warehouse_id`, `quantity`, `status`, `expires_at`, `consumed_at`, `released_at`, `created_at`.

Restricciones: cantidad positiva; fechas coherentes con estado; FKs restrictivas a producto y
almacén, cascada desde pedido/línea; único parcial por línea en `active`/`consumed`.

Índices: `(product_id, warehouse_id, status, expires_at)`, presentación/almacén/estado/
expiración, `(order_id, status)` y parcial para activas.

### `payments`, `payment_attempts`, `payment_events`

`payments`: pedido, proveedor (`manual` inicialmente; `izipay` reservado e inactivo), importe,
moneda, estado, referencia, ID externo, fechas de confirmación/reembolso, metadatos sanitizados
y timestamps.

`payment_attempts`: pago, número, idempotency key, estado, URL externa opcional, expiración,
error sanitizado y timestamps. Únicos `(payment_id, attempt_number)` e `idempotency_key`.

`payment_events`: pago/intento, proveedor, ID externo o UUID manual, tipo, payload sanitizado,
validez, procesado, error y timestamps. Único `(provider, provider_event_id)`.

Índices: pedido/estado, proveedor/ID externo, pendientes por fecha y eventos no procesados.

### Enlace con `sales`

Agregar `sales.order_id uuid NULL REFERENCES orders(id) ON DELETE RESTRICT` e índice único
parcial `WHERE order_id IS NOT NULL`. No cambiar estados, RPC ni comprobantes actuales. La
adaptación transaccional de confirmación será una migración posterior revisable.

## RLS propuesta

- Comprador autenticado: lectura solo de sus pedidos, líneas, direcciones y pagos sanitizados;
  sin escritura directa de estados o importes.
- Checkout invitado: exclusivamente función server-side con service role, nunca INSERT anónimo.
- Admin/ventas: gestión operativa. Almacén: lectura de líneas físicas y reservas necesarias.
- Intentos/eventos: sin acceso directo del cliente.
- Escrituras sensibles: funciones server-side/RPC con rol, bloqueo e idempotencia.

## Reversión propuesta

Detener checkouts, liberar reservas activas y verificar que no existan ventas vinculadas.
Eliminar índice/columna `sales.order_id`, políticas y grants; eliminar en orden
`payment_events`, `payment_attempts`, `payments`, `inventory_reservations`, `order_addresses`,
`order_items`, `orders` y luego enums. Si ya existen operaciones reales, usar migración
compensatoria que deshabilite el flujo y conserve datos para auditoría, sin DROP.

## Pendientes antes de escribir SQL

- Fuente de configuración de los 30 minutos: tabla de ajustes o variable server-side.
- Almacén predeterminado para reservas.
- Reglas y alcance inicial de envío/recojo.
- Si una boleta puede iniciar como invitado o exige cuenta antes de pagar.
- Confirmar nombre técnico: el proyecto menciona “EasyPay” e “IZYPAY”; no se activa ninguno sin
  documentación oficial.
