# Verificación tributaria fase 3

Fecha: 2026-08-20. No se usaron secretos reales ni se llamó a SUNAT Beta o producción.

## Recorrido administrativo

La ruta `/admin/comprobantes` redirigió a `/auth`; no existía una sesión administrativa autorizada.
De acuerdo con el alcance solicitado, se detuvo el recorrido sin consultar credenciales. Quedan pendientes
las cuatro pantallas, la prueba administrativa mock y las capturas móvil/escritorio hasta que el propietario
inicie sesión manualmente.

## UBL y XSD

Se integró sin modificar el ZIP oficial `Archivo XSD - 2.1`, actualizado por SUNAT al 28/02/2022,
con SHA-256 `5CAC9D9353521340FBC15D23F465A4946B004535B9FF411541C87DA01694DBD5`.
El validador usa libxml2 WebAssembly con red, DTD y XXE deshabilitados; factura, boleta y nota de crédito
generadas por Makrana pasan el esquema UBL 2.1 base. Una segunda capa valida catálogos mínimos, moneda,
unidades, motivo de nota, referencia, fecha, totales, firma y nombre de archivo. Resumen diario y baja
continúan en UBL 2.0 según la guía oficial y requieren una suite XSD específica antes de Beta.

## Firma y SOAP

`Pkcs12XmlSigner` abre el P12 en memoria, valida vigencia e identidad RUC, firma RSA-SHA256 dentro de
`ext:ExtensionContent`, produce digest/hash, no registra el secreto y limpia el buffer. La prueba usa un
certificado autofirmado ficticio. El cliente SOAP incorpora WS-Security, endpoint Beta HTTPS configurable,
`sendBill`, `sendSummary`, `getStatus`, timeout y clasificación de fallas mediante transporte inyectado.
No existe transporte de red habilitado en la fábrica actual.

## Seguridad y base de datos

Se rechazan DTD/entidades, XML mayor a 2 MiB y nombres/rutas inválidos. La migración aditiva
`20260822110000_add_tax_beta_readiness.sql` agrega estados y una función de barrera para Beta/producción.
No fue aplicada al remoto porque existe antes una migración comercial local ajena y `db push` publicaría
ambas; se preservó esa separación deliberadamente.

## Dependencias

Las vulnerabilidades transitivas tenían rutas: `jspdf → dompurify` (moderada),
`eslint/@tanstack → js-yaml` (alta), `vite/postcss → nanoid` (alta),
`lovable-tagger/vite → postcss` (alta) y herramientas ESLint → `brace-expansion` (alta añadida al reauditar).
Todas tenían parches compatibles y `npm audit fix` sin `--force` instaló únicamente revisiones seguras.
Resultado final esperado: 0 vulnerabilidades. El impacto tributario directo era bajo: DOMPurify participa
en PDF; las demás rutas son mayormente build/lint, no procesamiento tributario en producción.
