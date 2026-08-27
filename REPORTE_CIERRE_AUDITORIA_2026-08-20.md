# Reporte de cierre de auditoría — Makrana Home Art

## A. Resumen ejecutivo

Se mantuvo y amplió la normalización editorial, se preservaron nombres propios ambiguos, se
migraron 64 validadores obsoletos de TanStack Start, se alineó Render con las variables reales
de WhatsApp y se actualizaron despliegue, QA, seguridad y operaciones. Se añadieron pruebas
editoriales, de negocio, seguridad, contratos y mocks: 35 aprobadas y 0 fallidas. TypeScript,
lint y la compilación de producción terminan correctamente.

Continúan pendientes las pruebas que requieren usuarios y datos de un Supabase aislado o real:
RLS por perfil, inventario concurrente, ventas/reversiones y buckets. La comparación remota
encontró 26 migraciones coincidentes y una solo local. No se aplicaron migraciones, no se
enviaron mensajes, no se modificó producción y no se desplegó.

Riesgos antes de ventas reales: falta certificar RLS con identidades separadas, idempotencia de
ventas, consistencia de stock bajo concurrencia, restauración de respaldo, privacidad de
`manual-images`, el flujo real de comprobantes y la ausencia de publicación/despublicación
en ferias. `npm audit --omit=dev` informó 4
vulnerabilidades de producción (1 moderada y 3 altas), pendientes de análisis antes de aplicar
actualizaciones.

## B. Archivos modificados por esta auditoría

| Ruta                                             | Cambio                                                       | Motivo                                         |
| ------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| `src/lib/content-normalization.ts`               | Normalización editorial, medidas y modo literal              | Uniformidad sin alterar nombres propios        |
| `src/lib/content-normalization.test.ts`          | 6 pruebas editoriales                                        | Evitar regresiones de texto y unidades         |
| `src/lib/platform-contracts.test.ts`             | 11 pruebas de configuración/seguridad                        | Validar invariantes sin producción             |
| `src/lib/business-rules.ts`                      | Reglas de ventas e inventario                                | Validación compartida con el servidor          |
| `src/lib/business-rules.test.ts`                 | 6 pruebas de permisos y negocio                              | Casos válidos e inválidos                      |
| `src/lib/whatsapp-business.test.ts`              | 3 pruebas con `fetch` simulado                               | Probar sin enviar mensajes                     |
| `src/lib/whatsapp-business.server.ts`            | Sanitización de errores externos                             | No filtrar respuestas del proveedor            |
| `src/lib/admin.functions.ts`                     | Normalización y `.validator()`                               | Contenido, inventario y API actual             |
| `src/lib/admin-content.functions.ts`             | Normalización y `.validator()`                               | Novedades, talleres y ferias                   |
| `src/lib/admin-manual.functions.ts`              | Normalización y `.validator()`                               | Manuales y textos alternativos                 |
| `src/lib/admin-bulk-import.functions.ts`         | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/admin-calendar.functions.ts`            | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/admin-sales.functions.ts`               | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/admin-users.functions.ts`               | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/complaint-book.functions.ts`            | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/public.functions.ts`                    | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/site-settings.functions.ts`             | `.validator()`                                               | Eliminar API obsoleta                          |
| `src/lib/admin-tax.functions.ts`                 | Solo `.validator()` dentro del archivo existente del usuario | Compatibilidad TanStack                        |
| `src/components/ui/input.tsx` y `textarea.tsx`   | Idioma español y corrector                                   | Ayuda ortográfica visible                      |
| `src/routes/_authenticated/admin.calendario.tsx` | Tipos explícitos de callbacks                                | Cerrar errores TypeScript                      |
| `src/routes/_authenticated/admin.materiales.tsx` | Guardia para cantidad nula                                   | Seguridad de tipos                             |
| `src/routes/_authenticated/admin.productos.tsx`  | Tipo del resultado de categorías                             | Seguridad de tipos                             |
| `render.yaml`                                    | Variables WhatsApp sin valores sensibles                     | Alinear código y despliegue                    |
| `DEPLOYMENT_PLAN.md`                             | `package-lock.json`, `npm ci`, variables y migraciones       | Eliminar contradicciones                       |
| `QA_CHECKLIST.md`                                | Estados, evidencia, fecha, entorno y responsable             | QA verificable                                 |
| `AUDITORIA_PLATAFORMA.md`                        | Estado actualizado                                           | Reflejar 27 migraciones y validadores migrados |
| `OPERACIONES_Y_SEGURIDAD.md`                     | RLS, storage, dominio, respaldo y monitoreo                  | Procedimientos pendientes                      |
| `package.json`                                   | Scripts editoriales, plataforma y tributarios                | Automatizar verificaciones                     |
| `eslint.config.js`                               | Exclusión de temporales locales                              | Evitar falsos fallos fuera del código fuente   |
| `.gitignore`                                     | Temporales locales                                           | Evitar archivos operativos accidentales        |

Los cambios fiscales/SIRE, rutas nuevas, tipos generados y `.env.example` ya estaban presentes
o cambiaron concurrentemente; se conservaron y no se atribuyen a esta auditoría.

## C. Pruebas y comandos

| Comando                                | Resultado                                                      |
| -------------------------------------- | -------------------------------------------------------------- |
| `npm ci`                               | BLOQUEADO: Windows mantuvo abierto un binario nativo (`EPERM`) |
| `npm install`                          | APROBADO para restaurar el entorno                             |
| `npm run test:platform`                | APROBADO: 26/26, 0 fallidas                                    |
| `npm run test:tax`                     | APROBADO: 9/9 con mocks, 0 fallidas                            |
| `npm audit --omit=dev --json`          | FALLIDO: 1 moderada, 3 altas, 0 críticas                       |
| `npx tsc --noEmit`                     | APROBADO: 0 errores                                            |
| `npm run build`                        | APROBADO; 0 advertencias de `.inputValidator()`                |
| `npm run lint`                         | APROBADO: 0 errores; 57 advertencias no bloqueantes            |
| `git diff --check`                     | APROBADO; sin errores de espacios del diff                     |
| Escaneo de patrones sensibles del diff | APROBADO; no se encontraron claves conocidas                   |

La compilación advierte sobre chunks grandes. Es una optimización de rendimiento, no un fallo de
compilación. No se ejecutó `npm audit fix` porque podría cambiar dependencias y comportamiento.

## D. Estado de producción

| Punto                       | Estado           | Evidencia/causa                                              |
| --------------------------- | ---------------- | ------------------------------------------------------------ |
| Dominio raíz HTTPS          | APROBADO         | `https://makranahomeart.com/` respondió 200                  |
| HTTP→HTTPS                  | APROBADO         | HTTP respondió 301 al dominio HTTPS                          |
| Canónico `www`              | APROBADO         | HTTPS con `www` respondió 301 al dominio sin `www`           |
| DNS                         | APROBADO         | Resolución A obtenida el 2026-08-20                          |
| Contenido mixto inicial     | APROBADO         | Referencias HTTP detectadas eran namespaces SVG, no recursos |
| Health check raíz           | APROBADO         | Respuesta 200 servida por Render/Cloudflare                  |
| Reinicio desde panel Render | BLOQUEADO        | Sin acceso autenticado al panel                              |
| Variables reales Render     | BLOQUEADO        | No se inspeccionaron valores ni secretos                     |
| `README.md`                 | NO APLICA        | El repositorio no contiene ese archivo                       |
| Migraciones remotas         | FALLIDO          | 26 coinciden; migración tributaria solo local                |
| RLS con cuatro perfiles     | BLOQUEADO        | Faltan identidades de prueba                                 |
| Storage real                | BLOQUEADO        | Faltan acceso y objetos de prueba                            |
| WhatsApp con mocks          | APROBADO         | 3 casos; ninguna solicitud real                              |
| WhatsApp real               | PENDIENTE MANUAL | Prohibido enviar sin autorización                            |
| SUNAT/homologación          | PENDIENTE MANUAL | No existe evidencia de confirmación real                     |
| Restauración de respaldo    | PENDIENTE MANUAL | Debe hacerse en entorno aislado                              |
| Despliegue de estos cambios | BLOQUEADO        | No autorizado por la solicitud                               |

## E. Variables requeridas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` o `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_BUSINESS_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCESS_TOKEN`
- `WHATSAPP_BUSINESS_API_VERSION`
- `WHATSAPP_BUSINESS_FROM_NUMBER`

## F. Acciones manuales exactas

1. Render: abrir el servicio correcto, completar las variables `sync: false`, confirmar
   `VITE_ENABLE_DEV_ADMIN=false`, desplegar primero a staging y revisar el health check.
2. Supabase: confirmar el project ref, ejecutar `supabase migration list`, `supabase db lint` y
   `supabase db push --dry-run`; detenerse ante divergencias antes de aplicar nada.
3. RLS: crear administrador, cliente, autenticado sin rol y sesión anónima de prueba; ejecutar
   cada fila de `QA_CHECKLIST.md` y guardar evidencia anonimizada.
4. Storage: probar lectura, subida, reemplazo ajeno, MIME y tamaño por bucket. Decidir si
   `manual-images` debe migrarse a privado con URLs firmadas.
5. DNS/Render: tras desplegar, repetir `curl -I` para raíz HTTP/HTTPS y `www`, luego probar un
   reinicio desde el panel.
6. WhatsApp: configurar una cuenta de pruebas, plantilla aprobada y destinatario autorizado;
   definir idempotencia, reintentos y webhook firmado antes de habilitar producción.
7. Respaldos: seguir `OPERACIONES_Y_SEGURIDAD.md` y registrar una restauración satisfactoria en
   un proyecto aislado.
8. Dependencias: ejecutar `npm audit`, revisar cada CVE y actualizar en una rama separada con
   pruebas; no ejecutar correcciones forzadas sin evaluar cambios mayores.

## G. Evidencias y límites

Las evidencias locales se conservan en los comandos de esta tarea y en los documentos citados.
No se imprimieron valores de variables, tokens, contraseñas, datos personales, URLs firmadas ni
credenciales. No se afirma que Supabase, WhatsApp, SUNAT, buckets o respaldos de producción estén
aprobados.
