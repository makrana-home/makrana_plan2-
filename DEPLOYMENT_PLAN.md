# Deployment Plan - Makrana Home Art

## Destino principal

El destino principal de deploy sera Render Web Service.

El proyecto usa TanStack Start con SSR/server functions, por lo que no debe
publicarse como Render Static Site. Static Site no ejecuta server functions ni
middleware de autenticacion.

## Servicio Render

- Type: Web Service.
- Runtime: Node.
- Branch: `main` cuando se haga deploy productivo.
- Build Command: `npm ci && npm run build`.
- Start Command: `npm start`.
- Health Check Path: `/`.

`package-lock.json` está versionado. Render usa `npm ci` para instalar exactamente
las versiones bloqueadas antes de compilar; `render.yaml` ya declara este flujo.

## Preset Nitro/TanStack

El wrapper `@lovable.dev/vite-tanstack-config` usa Cloudflare como fallback por
defecto. Para Render se fija una salida Node-compatible desde `vite.config.ts`:

```ts
nitro: {
  preset: "render-com",
}
```

`render-com` extiende el preset `node-server` de Nitro y genera el servidor en:

```text
.output/server/index.mjs
```

## Variables publicas

Estas variables pueden tener prefijo `VITE_` porque se exponen al bundle del
navegador:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME=Makrana Home Art
VITE_APP_ENV=production
VITE_ENABLE_DEV_ADMIN=false
```

`VITE_SUPABASE_ANON_KEY` queda documentada por compatibilidad con el nombre que
puede mostrar Supabase. El codigo actual usa `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Variables secretas

Estas variables deben configurarse solo como Environment Variables del Web
Service en Render. No deben tener prefijo `VITE_`:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_BUSINESS_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCESS_TOKEN=
WHATSAPP_BUSINESS_API_VERSION=v23.0
WHATSAPP_BUSINESS_FROM_NUMBER=
```

`SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al frontend. El codigo la lee
desde `process.env` en el cliente server-side.

Las variables `WHATSAPP_BUSINESS_PHONE_NUMBER_ID`,
`WHATSAPP_BUSINESS_ACCESS_TOKEN` y `WHATSAPP_BUSINESS_FROM_NUMBER` deben
completarse como secretos en Render. La versión de la API no es secreta. El
repositorio no implementa actualmente un webhook entrante.

## Seguridad

- Nunca configurar `SUPABASE_SERVICE_ROLE_KEY` con prefijo `VITE_`.
- Mantener `VITE_ENABLE_DEV_ADMIN=false` o sin configurar en Render.
- No usar `dev-admin` en produccion.
- Crear usuario admin real en Supabase Auth y asignar rol en `user_roles`.
- No conectar MongoDB en esta fase.

## Supabase

Supabase sera la base principal:

- Postgres.
- Auth.
- RLS.
- Storage.
- RPCs de inventario/ventas.

El estado actual del repositorio contiene 27 migraciones SQL versionadas. La comparación del
20 de agosto de 2026 encontró 26 coincidentes con el proyecto enlazado y una solo local:
`20260821100000_add_tax_purchases_and_sire.sql`. Esta diferencia debe revisarse antes de aplicar
cambios; no se considera desplegada por existir localmente.

Antes de cada despliegue se deben comprobar las variables requeridas y comparar
las migraciones locales con el proyecto Supabase correcto. La existencia de una
migración en el repositorio no demuestra que ya esté aplicada en producción.

## Comandos locales de verificacion

```bash
npm run lint
npm run test:content
npm run build
npm start
```

Si `npm start` falla por variables Supabase faltantes, configurar las variables
reales en `.env.local` o en Render antes de hacer pruebas funcionales completas.
