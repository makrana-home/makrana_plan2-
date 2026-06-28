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
- Build Command: `npm install && npm run build`.
- Start Command: `npm start`.
- Health Check Path: `/`.

No hay `package-lock.json` en el repo, por eso se documenta `npm install` en vez
de `npm ci`.

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
```

`SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al frontend. El codigo la lee
desde `process.env` en el cliente server-side.

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

Hasta crear el proyecto real, Render puede tener variables vacias o placeholder
solo en documentacion, pero el servicio real necesitara valores validos para
cargar paginas que consultan Supabase.

## Comandos locales de verificacion

```bash
npm run lint
npm run build
npm start
```

Si `npm start` falla por variables Supabase faltantes, configurar las variables
reales en `.env.local` o en Render antes de hacer pruebas funcionales completas.
