# Checklist de activación SUNAT y SIRE

Producción no puede activarse sin aprobación explícita del propietario y validación del contador.

## Antes de Beta

- Confirmar RUC, razón social, domicilio fiscal, ubigeo, régimen, tasa de IGV y si los precios comerciales incluyen IGV.
- Confirmar series autorizadas para boleta, factura y notas.
- Cargar el `.p12` y su contraseña como secretos del servidor; validar RUC, vigencia y rotación.
- Crear usuario SOL secundario y cargar Clave SOL como secreto.
- Cargar credenciales SIRE como secretos.
- Verificar UBL contra los XSD y catálogos oficiales SUNAT vigentes.
- Probar boleta, factura, nota de crédito, resumen diario, timeout, reconsulta y CDR en Beta.

## Autorizaciones manuales obligatorias

1. Autorizar conexión a Beta.
2. Revisar resultados con el contador.
3. Autorizar por separado una única emisión real controlada.
4. Verificar CDR y consulta SUNAT.
5. Autorizar activación progresiva de CPE.
6. Autorizar por separado aceptación, reemplazo o presentación SIRE.

Nunca activar a la vez autoemisión, resumen diario y presentación SIRE. Mantener primero `SUNAT_AUTO_ISSUE_ENABLED=false` y `SIRE_SUBMISSION_ENABLED=false`.

Antes de seleccionar `beta` o `production`, la función `tax_environment_ready` debe devolver `true` y el
propietario debe autorizar explícitamente el cambio. La interfaz nunca debe inferir autorización de campos
completos. La activación Beta y la activación de producción son decisiones separadas.

## Operación mensual

- Revisar ventas aceptadas, observadas, rechazadas y notas de crédito.
- Comparar totales Makrana/SUNAT del RVIE.
- Revisar compras faltantes, duplicadas y con diferencias de base/IGV/total en RCE.
- Resolver inconsistencias una por una; no aceptar propuestas automáticamente.
- Registrar aprobación del contador y descargar archivos finales/CDR.
- Revisar vencimiento del certificado y conservar auditoría.
