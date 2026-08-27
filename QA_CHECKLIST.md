# QA Checklist — Makrana Home Art

Estados permitidos: `PENDIENTE MANUAL`, `APROBADO`, `FALLIDO`, `BLOQUEADO` y `NO APLICA`.
Una inspección de código no sustituye una prueba funcional.

| Área         | Verificación                               | Estado           | Fecha      | Entorno           | Evidencia                       | Observación                        | Responsable         |
| ------------ | ------------------------------------------ | ---------------- | ---------- | ----------------- | ------------------------------- | ---------------------------------- | ------------------- |
| Local        | Instalación reproducible con `npm ci`      | BLOQUEADO        | 2026-08-20 | Local             | Error `EPERM` de Windows        | Binario nativo en uso              | Desarrollo          |
| Local        | Prueba editorial                           | APROBADO         | 2026-08-20 | Local             | `npm run test:content`: 6/6     | Sin fallos                         | Desarrollo          |
| Local        | Pruebas editoriales y contractuales        | APROBADO         | 2026-08-20 | Local             | `npm run test:platform`: 26/26  | Sin fallos                         | Desarrollo          |
| Local        | Pruebas tributarias con mocks              | APROBADO         | 2026-08-20 | Local             | `npm run test:tax`: 9/9         | No acredita SUNAT real             | Desarrollo          |
| Local        | Comprobación TypeScript                    | APROBADO         | 2026-08-20 | Local             | `npx tsc --noEmit`              | Sin errores                        | Desarrollo          |
| Local        | Compilación de producción                  | APROBADO         | 2026-08-20 | Local             | `npm run build`                 | Compila con advertencia de chunks  | Desarrollo          |
| Local        | Lint completo                              | APROBADO         | 2026-08-20 | Local             | `npm run lint`                  | 0 errores; 57 advertencias         | Desarrollo          |
| Pública      | Inicio carga sin errores                   | PENDIENTE MANUAL | —          | Producción        | —                               | Prueba manual                      | QA                  |
| Pública      | Catálogo muestra solo productos visibles   | PENDIENTE MANUAL | —          | Producción        | —                               | Probar filtros y detalle           | QA                  |
| Pública      | Novedades ocultan borradores               | PENDIENTE MANUAL | —          | Producción        | —                               | Probar listado y slug              | QA                  |
| Pública      | Talleres respetan visibilidad              | PENDIENTE MANUAL | —          | Producción        | —                               | Probar inscripción                 | QA                  |
| Pública      | Ferias permiten publicar/despublicar       | FALLIDO          | 2026-08-20 | Código/esquema    | Sin estado ni visibilidad       | Requiere decisión y migración      | Producto/Desarrollo |
| Pública      | Contacto crea un lead                      | PENDIENTE MANUAL | —          | Producción        | —                               | Usar datos de prueba identificados | QA                  |
| Acceso       | Administrador autorizado entra             | BLOQUEADO        | —          | Supabase real     | —                               | Requiere usuario de prueba         | Administrador       |
| Acceso       | Cliente no entra al administrador          | BLOQUEADO        | —          | Supabase real     | —                               | Requiere usuario de prueba         | Administrador       |
| Acceso       | Usuario sin rol queda denegado             | BLOQUEADO        | —          | Supabase real     | —                               | Requiere usuario de prueba         | Administrador       |
| Acceso       | Usuario anónimo queda denegado             | PENDIENTE MANUAL | —          | Local/producción  | —                               | Probar rutas y funciones           | QA                  |
| Admin        | Productos y materiales: CRUD y visibilidad | PENDIENTE MANUAL | —          | Staging           | —                               | No usar datos reales               | QA                  |
| Admin        | Categorías, almacenes y manuales           | PENDIENTE MANUAL | —          | Staging           | —                               | Incluir archivos                   | QA                  |
| Inventario   | Entrada aumenta stock                      | BLOQUEADO        | —          | Supabase aislado  | —                               | Requiere datos de prueba           | QA                  |
| Inventario   | Salida descuenta y evita stock negativo    | BLOQUEADO        | —          | Supabase aislado  | —                               | Incluir concurrencia               | QA                  |
| Ventas       | Crear borrador y validar ítems/totales     | BLOQUEADO        | —          | Supabase aislado  | —                               | No operar ventas reales            | QA                  |
| Ventas       | Confirmar descuenta stock una sola vez     | BLOQUEADO        | —          | Supabase aislado  | —                               | Probar reintento                   | QA                  |
| Ventas       | Cancelar revierte stock                    | BLOQUEADO        | —          | Supabase aislado  | —                               | Verificar transición               | QA                  |
| Comprobantes | Numeración correlativa sin duplicados      | BLOQUEADO        | —          | Supabase aislado  | —                               | No equivale a validación SUNAT     | QA                  |
| Comprobantes | Documento abre e imprime                   | PENDIENTE MANUAL | —          | Navegadores       | —                               | Escritorio y móvil                 | QA                  |
| Contenido    | Normalización al guardar/publicar          | APROBADO         | 2026-08-20 | Unitario          | 6 casos aprobados               | Nombres propios quedan manuales    | Desarrollo          |
| Seguridad    | Service role ausente del bundle            | APROBADO         | 2026-08-20 | Build             | 0 referencias en bundle público | La clave permanece server-side     | Seguridad           |
| Seguridad    | RLS impide fuga entre clientes             | BLOQUEADO        | —          | Supabase aislado  | —                               | Requiere identidades separadas     | Seguridad           |
| Storage      | Imágenes públicas previstas                | BLOQUEADO        | —          | Supabase real     | —                               | Revisar MIME y tamaño              | Seguridad           |
| Storage      | Documentos privados protegidos             | BLOQUEADO        | —          | Supabase real     | —                               | Incluir archivos fiscales          | Seguridad           |
| WhatsApp     | Configuración y envío simulado             | APROBADO         | 2026-08-20 | Mock local        | 3/3 casos aprobados             | No se enviaron mensajes reales     | Integraciones       |
| Dominio      | DNS, HTTPS, canónico y HTTP→HTTPS          | APROBADO         | 2026-08-20 | Producción        | HTTP 301; HTTPS 200; www 301    | Sin cambios de DNS                 | Infraestructura     |
| Render       | Health check raíz                          | APROBADO         | 2026-08-20 | Producción        | `/` respondió HTTP 200          | Servido por Render/Cloudflare      | Infraestructura     |
| Render       | Funcionamiento después de reinicio         | PENDIENTE MANUAL | —          | Producción        | —                               | Requiere acceso al panel           | Infraestructura     |
| Supabase     | Comparación de migraciones local/remota    | FALLIDO          | 2026-08-20 | Proyecto enlazado | 26 iguales; 1 solo local        | No aplicar sin revisión            | Administrador       |
| UX           | Vista móvil y escritorio                   | PENDIENTE MANUAL | —          | Navegadores       | —                               | Recorrido completo                 | QA                  |
| Errores      | 404 y errores no filtran detalles          | PENDIENTE MANUAL | —          | Staging           | —                               | Probar casos controlados           | Seguridad           |

## Evidencia mínima requerida

Para aprobar manualmente un punto, registrar fecha, entorno, identificador del caso o captura
sin datos personales, resultado observado y responsable. Las pruebas de producción deben usar
registros identificados como prueba y retirarse mediante el procedimiento autorizado, nunca
con borrados masivos.
