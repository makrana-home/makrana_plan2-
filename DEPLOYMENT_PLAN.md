# Deployment Plan - Makrana Home Art

## A. Render Static Site

No es la opcion recomendada para el estado actual del proyecto.

El proyecto usa TanStack Start, SSR/server entry y server functions. Varias rutas
y acciones leen variables de servidor con `process.env` y dependen de middleware
de autenticacion. Un Static Site de Render serviria archivos estaticos, pero no
ejecutaria correctamente esas server functions.

Solo seria viable como Static Site si el proyecto se refactoriza a SPA estatica
y todas las acciones pasan a Supabase desde el cliente o a otro backend.

## B. Render Web Service

Es la opcion correcta si se decide hospedar en Render, pero requiere una salida
Node-compatible.

El build actual genera Nitro con preset `cloudflare-module` y comandos de
Wrangler. Eso encaja mejor con Cloudflare Workers/Pages que con un proceso Node
directo en Render. Para usar Render Web Service, antes hay que validar o ajustar
la configuracion de TanStack/Nitro para generar un servidor Node.

Configuracion esperada:

- Build command: `npm install && npm run build`
- Start command: definir despues de generar una salida Node-compatible; puede
  ser similar a `node .output/server/index.mjs` solo si ese archivo arranca un
  servidor HTTP Node.
- Runtime: Node.js.
- Branch: `main`.

Antes de crear el servicio en Render, validar localmente:

1. Que el build no use preset `cloudflare-module`.
2. Que el comando de start abra un puerto HTTP.
3. Que server functions respondan con variables de entorno reales.

Si se mantiene el preset actual, la recomendacion tecnica es desplegar en
Cloudflare y dejar Render solo como alternativa futura.

## C. Variables en Render

Variables publicas necesarias tambien durante build:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_NAME=Makrana Home Art
VITE_APP_ENV=production
```

Variables de servidor:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

El acceso local `dev-admin` debe permanecer apagado:

```env
VITE_ENABLE_DEV_ADMIN=false
```

## D. Variables publicas `VITE_`

Las variables `VITE_` se inyectan en el bundle del navegador. Solo deben contener
valores publicos:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`, solo como equivalencia documentada
- `VITE_APP_NAME`
- `VITE_APP_ENV`
- `VITE_ENABLE_DEV_ADMIN=false`

## E. Variables secretas

Nunca deben tener prefijo `VITE_`:

- `SUPABASE_SERVICE_ROLE_KEY`
- claves de Resend futuras
- secretos de webhooks
- credenciales privadas de proveedores

`SUPABASE_SERVICE_ROLE_KEY` debe existir solo en servidor y Render debe guardarla
como secret environment variable.

## F. Backend separado o server functions

No hace falta crear un backend separado ahora. El proyecto ya usa server
functions de TanStack Start y middleware de Supabase.

Si en el futuro se agregan tareas programadas, facturacion electronica, colas,
emails transaccionales o integraciones SUNAT, se puede sumar un servicio backend
separado o workers, pero no es necesario para esta fase.

## G. Servicios recomendados

- GitHub: repositorio fuente y control de cambios.
- Supabase: Postgres, Auth, RLS, Storage y RPCs.
- Render: hosting del Web Service de la app.
- Cloudflare: DNS, dominio, cache y proteccion basica.
- Resend: correos transaccionales futuros.
- MongoDB: no usar por ahora; Supabase cubre la base relacional principal.

## Costos recomendados

Fase pruebas:

- Supabase Free.
- Cloudflare Free/Workers para el preset actual, o Render Web Service de prueba
  solo despues de configurar salida Node-compatible.
- Cloudflare Free para DNS si ya hay dominio.

MVP real:

- Supabase Pro si se necesita mas estabilidad, backups y limites mayores.
- Render Web Service pago si se migra a salida Node-compatible, o Cloudflare
  Workers/Pages si se conserva el preset actual.
- Resend Free/Starter segun volumen.

No agregar MongoDB mientras el dominio principal siga siendo ventas, stock,
clientes, talleres y contenido relacional.
