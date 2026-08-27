# Preparación de comercio, cursos y EasyPay

Estado: preparado localmente hasta el límite anterior a integrar la documentación y credenciales
reales de EasyPay. La pasarela real permanece deshabilitada.

## Diagnóstico

El checkout actual calcula precios en servidor, crea `orders`, congela importes y entrega, genera
reservas de inventario y crea `payments` y `payment_attempts`. La aprobación manual registra el
pago en el libro de ventas antes de confirmar la venta y consume la reserva en una transacción.
El retorno del navegador ya comunica que no confirma el pago.

No se encontró SDK, API, sandbox, webhook, esquema de firma ni credenciales reales de EasyPay.
Las migraciones aplicadas usan el identificador histórico `izipay_easypay` y la columna
`izipay_easypay_public_url`. No existe evidencia de que EasyPay e Izipay sean el mismo proveedor.
Esos nombres quedan congelados como compatibilidad de base de datos; no deben propagarse a nuevos
contratos ni a textos visibles. Cambiarlos requiere una migración de compatibilidad independiente.

El pago manual y la carga privada de evidencia continúan disponibles como respaldo.

## Arquitectura separada

- Comercio: carrito, precio servidor, pedido, entrega, reserva y estado comercial.
- Pasarela: `PaymentGateway`, creación, consulta server-side, retorno no confiable, webhook
  verificado y cancelación opcional.
- Cursos: `courseFulfillment` distingue curso digital y curso con kit. El acceso nunca se concede
  desde el retorno ni antes del pago confirmado.
- Tributación: solo recibe el contrato `tax_document_requested`; este trabajo no importa ni modifica
  servicios SUNAT.

`EasyPayGateway` está bloqueado deliberadamente y no realiza llamadas de red. `MockPaymentGateway`
permite probar el flujo sin inventar el contrato del proveedor. `PaymentFlow` valida código, importe
en unidad menor, moneda, identificador externo, firma, estado e idempotencia antes de confirmar.

## Eventos internos

Todos los eventos llevan `idempotencyKey`, `aggregateId`, `occurredAt` y `payload` mínimo sin
secretos:

- `payment_confirmed`: pago verificado server-side.
- `sale_confirmed`: solicita confirmación única de la venta.
- `course_enrollment_requested`: solicita la futura matrícula si el pedido contiene curso.
- `tax_document_requested`: solicita procesamiento tributario posterior, sin emitir comprobante.

Los consumidores académicos y tributarios quedan fuera de alcance. En la integración persistente,
la clave de idempotencia debe tener restricción única y escritura atómica con la transición del pago.

## Variables previstas

- `EASYPAY_ENABLED=false`
- `EASYPAY_ENVIRONMENT=mock`
- `EASYPAY_API_BASE_URL`
- `EASYPAY_MERCHANT_ID`
- `EASYPAY_API_KEY`
- `EASYPAY_WEBHOOK_SECRET`
- `EASYPAY_RETURN_URL`
- `EASYPAY_WEBHOOK_URL`

Los nombres pueden ajustarse cuando EasyPay entregue su nomenclatura oficial. Ninguna variable
privada debe usar prefijo `VITE_`, llegar al navegador o escribirse en logs.

## Información pendiente de EasyPay

1. Confirmación de la razón social y marca exacta del proveedor.
2. Documentación oficial y versión de API.
3. URL y credenciales de sandbox; URL de producción por separado.
4. Método de autenticación y rotación de credenciales.
5. Endpoint y esquema para crear una solicitud o enlace de pago.
6. Estados oficiales y reglas de rechazo, cancelación, expiración y reintento.
7. Unidad del importe, monedas admitidas y reglas de redondeo.
8. Identificador único de pago, evento y comercio.
9. Formato exacto del retorno del navegador y parámetros permitidos.
10. Webhook: cabeceras, cuerpo canónico, algoritmo de firma, tolerancia temporal y replay protection.
11. Consulta server-side del estado y estrategia de conciliación si el webhook no llega.
12. Política de idempotencia y reintentos del proveedor.
13. Lista de IP, TLS/mTLS o claves públicas si corresponde.
14. Capacidad y contrato oficial de cancelación o devolución.
15. Casos de prueba y tarjetas/medios simulados del sandbox.

## Punto de pausa

La integración se detiene antes de implementar transporte HTTP, parsear respuestas EasyPay,
validar su firma real, persistir eventos externos o activar credenciales. El próximo paso manual es
obtener el paquete oficial anterior, revisarlo y mapearlo explícitamente al adaptador sin cambiar el
dominio de pedidos.

Los archivos SUNAT bajo `src/server/services/tax`, `src/lib/admin-tax.functions.ts` y las migraciones
tributarias permanecen congelados.
