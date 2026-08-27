# Operaciones y seguridad — Makrana Home Art

Fecha de revisión local: 20 de agosto de 2026. Este documento no certifica producción.

## Migraciones Supabase

- Se encontraron 27 archivos SQL con prefijos cronológicos únicos.
- La comparación con el proyecto enlazado encontró 26 migraciones coincidentes y una solo
  local: `20260821100000_add_tax_purchases_and_sire.sql`.
- La migración más reciente es `20260821100000_add_tax_purchases_and_sire.sql` y pertenece a
  cambios existentes del usuario; no fue aplicada ni modificada durante esta auditoría.
- No se ejecutaron migraciones remotas ni operaciones destructivas.

Comprobación autorizada desde un equipo enlazado al proyecto correcto:

```bash
supabase status
supabase migration list
supabase db lint
supabase db push --dry-run
```

Antes de cualquier `db push`, comparar el identificador del proyecto con el panel de Supabase,
guardar la salida de `migration list` y detenerse si hay migraciones remotas que no existan
localmente o cambios destructivos. Nunca usar `db reset` en producción.

## Matriz RLS esperada

| Perfil          | Lectura                                  | Creación                        | Edición                   | Eliminación           |
| --------------- | ---------------------------------------- | ------------------------------- | ------------------------- | --------------------- |
| Administrador   | Operaciones autorizadas                  | Autorizada por módulo           | Autorizada por módulo     | Autorizada por módulo |
| Cliente         | Sus datos y contenido público            | Solo flujos permitidos          | Solo sus datos permitidos | Según negocio         |
| Usuario sin rol | Contenido público y perfil propio mínimo | Denegada                        | Denegada                  | Denegada              |
| Anónimo         | Solo contenido publicado/visible         | Formularios públicos explícitos | Denegada                  | Denegada              |

Hallazgos locales:

- Las tablas principales activan RLS y usan `has_role`, `is_staff`, `auth.uid()` y condiciones
  de publicación.
- Una migración temprana revoca `has_role`/`is_staff` a `anon`, pero la siguiente vuelve a
  concederlas. Debe revisarse en una base aislada si esa concesión sigue siendo necesaria.
- Las funciones de inventario y ventas validan identidad/roles dentro de SQL. Deben probarse
  con cuatro identidades reales antes de operar.
- No se certificó ausencia de filtración entre clientes porque no hay usuarios de prueba ni
  conexión remota verificada.

## Storage

Clasificación observada en las migraciones:

- Públicos: imágenes de productos, materiales, novedades, talleres, categorías y manuales.
- Privados: evidencia de pago, PDF de comprobantes y buckets tributarios/SIRE.

Riesgo: `manual-images` es público y el administrador usa `getPublicUrl`. Si los manuales son
internos, se debe migrar el bucket a privado y sustituir esas URLs por URLs firmadas de corta
duración en una entrega coordinada. También falta una restricción versionada de tamaño y MIME;
la interfaz no reemplaza una política de servidor.

Pruebas manuales: intentar lectura anónima de un objeto de cada bucket, subida con cliente,
sobrescritura de una ruta ajena, MIME no permitido y archivo sobredimensionado.

## WhatsApp Business

Existe un cliente server-side para Meta Graph API en `whatsapp-business.server.ts`, pero la
interfaz de comprobantes actualmente abre `wa.me` en el navegador y no llama ese cliente.
Variables previstas por la implementación server-side:

- `WHATSAPP_BUSINESS_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCESS_TOKEN`
- `WHATSAPP_BUSINESS_API_VERSION`
- `WHATSAPP_BUSINESS_FROM_NUMBER`

Tres pruebas con `fetch` simulado verifican configuración ausente, petición correcta y error
sanitizado. No se encontró webhook entrante, verificación de webhook, validación de firma,
almacenamiento de estados de entrega ni control persistente de idempotencia. El envío real queda bloqueado hasta
definir plantillas aprobadas, política de reintentos, registro sin datos sensibles y autorización.

## Dominio, HTTPS y Render

Sin usar credenciales, ejecutar:

```bash
curl -I https://makranahomeart.com/
curl -I http://makranahomeart.com/
curl -I https://www.makranahomeart.com/
nslookup makranahomeart.com
```

Comprobar certificado, redirección HTTP→HTTPS, decisión canónica con/sin `www`, respuesta del
health check después de reiniciar y URLs de retorno de Supabase Auth. Render debe tener todas
las variables indicadas en `render.yaml`; las marcadas `sync: false` se completan en su panel.

## Respaldo y restauración

1. Responsable: designar propietario técnico y suplente.
2. Alcance: Postgres, configuración Auth exportable, objetos de buckets y configuración de
   integraciones; nunca almacenar tokens en el respaldo documental.
3. Frecuencia propuesta: respaldo diario, semanal retenido 8 semanas y mensual 12 meses.
4. Ubicación: repositorio de respaldos cifrado, separado de producción, con mínimo privilegio.
5. Integridad: registrar fecha, tamaño, checksum, versión de Postgres y responsable.
6. Restauración: crear proyecto aislado, restaurar base y objetos, aplicar secretos de prueba y
   ejecutar `QA_CHECKLIST.md`.
7. Aprobación: conteos críticos conciliados, RLS probado, archivos accesibles según perfil y
   ventas/inventario consistentes.
8. Prohibido restaurar sobre producción durante una prueba.

## Monitoreo mínimo propuesto

- Render: disponibilidad y fallos del health check.
- Servidor: excepciones con identificador de correlación, sin cuerpos, tokens ni datos personales.
- Supabase: errores de RPC, conexiones, autenticación y consultas lentas.
- Negocio: fallos al confirmar/cancelar ventas, inventario negativo, numeración duplicada y
  comprobantes no generados.
- WhatsApp: error HTTP, reintento limitado e identificador del mensaje anonimizado.

La activación de un proveedor externo de monitoreo queda pendiente de elección, cuenta,
credenciales, presupuesto y política de privacidad.
