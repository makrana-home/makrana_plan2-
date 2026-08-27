# Arquitectura tributaria de Makrana

La venta comercial existente no se modifica. Una venta confirmada y pagada puede originar, por acción explícita, un `tax_document`. Al emitir se reserva el correlativo en PostgreSQL, se congela el detalle, se calcula el IGV incluido usando céntimos, se genera UBL 2.1, se firma y se entrega al cliente SUNAT configurado.

El flujo es `sales → tax_documents → tax_document_items → UBL → XmlSigner → SunatClient → CDR`. Los recibos de `receipts` siguen siendo notas internas y no acreditan emisión fiscal.

El backend genera y almacena XML original, XML firmado, CDR simulado y PDF en rutas privadas organizadas por RUC/año/mes/comprobante. La interfaz solicita URLs firmadas de 60 segundos; nunca recibe rutas de servidor ni secretos.

## Notas de crédito

Las notas de crédito (`07`) siempre referencian el comprobante original. Los motivos habilitados son 01, 02, 03, 04, 06 y 07. El servicio valida cantidades, total acumulado previamente acreditado e idempotencia, reserva una serie `FC01` o `BC01` y mantiene inmutable el documento original. Un comprobante aceptado no se elimina.

## Resumen diario

El proceso manual selecciona boletas de una sola fecha, excluye las ya incluidas en resúmenes activos, genera `RC-YYYYMMDD-001`, XML, firma mock y ZIP, registra ticket/CDR simulados y deja auditoría. Su ejecución repetida devuelve el mismo resumen. La automatización nocturna queda preparada en el servicio, pero bloqueada por `SUNAT_DAILY_SUMMARY_ENABLED=false`.

## Ambientes y seguridad

- `mock`: habilitado. Muestra una advertencia persistente y genera firma/CDR simuladas.
- `beta`: implementado como límite de interfaz, pero bloqueado hasta incorporar endpoints oficiales, credenciales y autorización.
- `production`: bloqueado por diseño y por `SUNAT_PRODUCTION_UNLOCK=false`.
- Certificado, contraseña, Clave SOL y secretos SIRE solo se leen en el servidor. No existen columnas para guardarlos.
- Los buckets `tax-documents`, `purchase-documents` y `sire-files` son privados.

## Compras y SIRE

Makrana registra compras, pero no las emite. La clave única RUC/tipo/serie/número evita duplicados. `sire_periods`, `sire_records` y `sire_inconsistencies` permiten conciliar RVIE/RCE. Aceptar, reemplazar o presentar está bloqueado.

Cada sincronización mock guarda su ejecución, registros de ambas fuentes, totales y diferencias. La conciliación distingue coincidencias, faltantes, duplicados, base/IGV/total diferentes, proveedor diferente y anulados.

## Recuperación y reversión

Ante timeout no se reserva otro número: la clave de idempotencia identifica RUC/tipo/serie/número/operación. Antes de reintentar deberá consultarse el estado. Un rechazo permanente no se reintenta automáticamente.

El código es aditivo. Para revertir una entrega todavía no aplicada, retirar la migración y las rutas. Si la migración ya se aplicó, conservar las tablas por trazabilidad; ocultar el módulo con `TAX_MODULE_ENABLED=false` y desplegar una migración posterior, nunca editar historia publicada.

## Preparación técnica Beta

Los XSD oficiales están versionados en `resources/sunat`. `validateOfficialXsd` valida con libxml2 local,
sin red, DTD ni entidades; la capa SUNAT verifica además catálogos y consistencia. `Pkcs12XmlSigner`
recibe P12/contraseña únicamente desde secretos del servidor. `SoapSunatClient` depende de un transporte
inyectado y no queda conectado por defecto. `tax_environment_ready` es la barrera de datos, series,
certificado, XSD y autorización anterior a cualquier cambio de ambiente.
