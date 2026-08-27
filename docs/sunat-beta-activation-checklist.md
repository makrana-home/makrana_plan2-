# Checklist de activación SUNAT Beta

Beta y producción permanecen bloqueados. No activar ningún punto sin autorización nueva y explícita.

## Datos que proporciona el propietario

- [ ] RUC, razón social, nombre comercial y domicilio fiscal confirmados.
- [ ] Ubigeo, departamento, provincia, distrito y régimen tributario confirmados.
- [ ] Tasa de IGV y tratamiento de precios confirmados por contador.
- [ ] Series de factura, boleta y nota de crédito confirmadas.
- [ ] Certificado `.p12` entregado por canal seguro.
- [ ] Contraseña del certificado configurada directamente como secreto de servidor.
- [ ] Usuario SOL secundario y Clave SOL configurada directamente como secretos.
- [ ] Correo tributario y vencimiento del certificado confirmados.
- [ ] Autorización explícita de pruebas Beta registrada.

## Validaciones técnicas

- [x] Paquete XSD oficial integrado con checksum reproducible.
- [x] Factura, boleta y nota de crédito pasan el XSD base UBL 2.1 local.
- [x] Catálogos, totales, referencias, fechas, namespaces y nombre de archivo verificados localmente.
- [x] Firma PKCS#12 probada con certificado autofirmado ficticio.
- [x] Cliente SOAP preparado con `sendBill`, `sendSummary`, `getStatus`, timeout y errores sanitizados.
- [x] SOAP probado solo con transporte simulado.
- [ ] CDR y tickets comprobados en Beta (requiere nueva autorización).
- [ ] Pruebas de idempotencia y reconsulta comprobadas en Beta.
- [ ] Revisión administrativa autenticada completada por el propietario.
- [ ] Plan de reversión aprobado.

## Barrera

`tax_environment_ready` exige datos, series, certificado vigente, XSD y autorización. Las variables
`SUNAT_CPE_ENABLED`, `SUNAT_AUTO_ISSUE_ENABLED`, `SUNAT_DAILY_SUMMARY_ENABLED`,
`SIRE_SYNC_ENABLED` y `SIRE_SUBMISSION_ENABLED` deben seguir en `false`.
