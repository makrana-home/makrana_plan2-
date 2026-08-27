# Auditoría de configuración y calidad editorial

Fecha: 20 de agosto de 2026

## Implementado en esta revisión

- Normalización editorial en el servidor para productos, materiales, categorías, talleres,
  novedades, ferias, almacenes y manuales.
- Corrección segura de espacios, signos de puntuación, capitalización inicial, codificación
  Unicode y vocabulario frecuente de Makrana (por ejemplo, «macramé», «artesanía» y
  «diseño»).
- Formato uniforme de medidas: `120 cm × 80 cm`, `1,5 m`, `500 g`, `2 kg`, `250 ml`.
- Corrector ortográfico del navegador activado en entradas de texto y áreas de texto, con
  idioma español.
- Pruebas automáticas específicas para la normalización editorial.
- Exclusión de carpetas temporales locales de Codex y Supabase del repositorio.

La normalización ocurre en las funciones del servidor. Por eso también se aplica si en el
futuro otro formulario o cliente consume esas mismas operaciones. SKU, códigos, slugs,
correos, teléfonos, enlaces, precios y estados no se modifican.

## Correcto en el repositorio

- Existe `package-lock.json`; Render puede usar de forma reproducible `npm ci`.
- Existe `.env.example` sin secretos y separa claves públicas y privadas.
- `render.yaml` define servicio Node, compilación, arranque, health check y variables base.
- El acceso administrativo comprobado usa autenticación y una validación de rol en el
  servidor.
- Hay 27 migraciones de Supabase versionadas en el estado actual del repositorio.
- El modo de administrador de desarrollo está desactivado en la configuración de producción.

## Pendiente de comprobar en producción

Estos puntos dependen de Render, Supabase, DNS o datos reales y no pueden certificarse solo
desde el código local:

1. Confirmar en Render que todas las variables `SUPABASE_*` y `VITE_SUPABASE_*` tengan los
   valores del mismo proyecto y que `SUPABASE_SERVICE_ROLE_KEY` sea secreta.
2. Confirmar que las 27 migraciones estén aplicadas en el proyecto Supabase de producción.
3. Revisar políticas RLS con un usuario administrador, un cliente y un usuario sin permisos.
4. Revisar permisos de buckets: imágenes públicas previstas y documentos privados.
5. Ejecutar el recorrido funcional completo descrito en `QA_CHECKLIST.md` con datos reales.
6. Verificar dominio, HTTPS, redirección canónica y health check en Render.
7. Comprobar la configuración y entrega real de WhatsApp Business; sus variables están en
   `.env.example`, pero no aparecen declaradas en `render.yaml`.
8. Crear copias de seguridad y probar una restauración de Supabase antes de operar ventas
   reales.

## Detalles técnicos sueltos

- `DEPLOYMENT_PLAN.md` fue actualizado: confirma que `package-lock.json` está versionado y que
  `render.yaml` usa `npm ci`.
- Los 64 usos de `.inputValidator()` fueron migrados a `.validator()` conservando sus
  esquemas y reglas.
- La suite local cubre 26 casos de plataforma y 9 tributarios. Las pruebas transaccionales con
  identidades reales, concurrencia y servicios externos siguen pendientes.
- `QA_CHECKLIST.md` separa evidencia local de verificaciones manuales; los puntos bloqueados no
  deben aprobarse por inspección de código.
- Conviene añadir monitoreo de errores y alertas de disponibilidad en producción.

## Criterio editorial recomendado

- Títulos: mayúscula inicial, no todas las palabras en mayúscula.
- Párrafos: oración completa, puntuación final y máximo un espacio entre palabras.
- Marca: «Makrana Home Art» y «macramé».
- Decimales visibles en español: coma (`1,5 m`).
- Símbolo de multiplicación para dimensiones: `120 cm × 80 cm`.
- Símbolos de unidad en minúscula, sin punto y separados del número: `cm`, `m`, `g`, `kg`,
  `ml`, `l`.
- Los nombres propios deben revisarse manualmente; una regla automática no puede garantizar
  todas las tildes sin riesgo de alterar nombres o términos artesanales.
