# Supabase Setup - Makrana Home Art

Esta guia prepara el proyecto para conectar Supabase real. No uses el acceso
`dev-admin` como sustituto de Supabase Auth: solo sirve para desarrollo visual
local mientras no existe el proyecto real.

## A. Crear cuenta Supabase

1. Entra a https://supabase.com.
2. Crea una cuenta o inicia sesion.
3. Confirma el correo de la cuenta.

## B. Crear proyecto Supabase para Makrana

1. Crea un proyecto nuevo.
2. Nombre sugerido: `makrana-home-art`.
3. Guarda la contrasena de base de datos en un gestor seguro.
4. Selecciona la region mas cercana a los usuarios principales.

## C. Copiar URL y anon/publishable key

En Supabase, abre `Project Settings > API` y copia:

- Project URL
- Publishable key o anon key
- Service role key, solo para servidor

El codigo actual usa estas variables principales:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Si Supabase muestra el nombre `anon key`, usa ese mismo valor en las variables
`*_PUBLISHABLE_KEY`. Las variables `*_ANON_KEY` quedan documentadas como
equivalencia.

## D. Configurar `.env.local`

Crea o actualiza `.env.local` a partir de `.env.example`.

Variables minimas para desarrollo real:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_O_ANON_KEY
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_O_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

No subas `.env.local` a GitHub. `SUPABASE_SERVICE_ROLE_KEY` nunca debe llevar
prefijo `VITE_`.

## E. Aplicar migraciones SQL

Cuando el proyecto Supabase exista, aplica las migraciones en orden desde:

```text
supabase/migrations/
```

Archivos actuales:

- `20260624225051_822d053d-1716-4848-9b34-005350407040.sql`
- `20260624225110_d8ec130e-e4f2-4732-950b-2a8bdf13d6c5.sql`
- `20260624225902_d65cd339-601c-444f-80ae-bd1cc39b4f3c.sql`
- `20260626182813_39d70811-861a-4151-8fd5-1556327ad6e8.sql`
- `20260626183122_d2229d25-43b9-4395-b9e0-c7fc39dc9a53.sql`
- `20260626184201_fa365032-b46d-4122-a044-0761878bf3c4.sql`
- `20260626193000_fix_inventory_and_sale_cancellation.sql`

No ejecutes migraciones remotas hasta tener proyecto Supabase real y backup del
estado esperado.

## F. Crear buckets Storage

La migracion final declara estos buckets:

- `product-images`
- `material-images`
- `news-images`
- `payment-evidence`
- `receipt-pdfs`
- `workshop-images`

Los buckets de imagenes son publicos. `payment-evidence` y `receipt-pdfs` deben
mantenerse privados.

## G. Crear usuario admin real

1. Ve a `Authentication > Users`.
2. Crea el usuario admin real con correo de Makrana.
3. Define una contrasena fuerte.
4. Confirma el correo si el proyecto lo requiere.

## H. Insertar rol admin

Despues de crear el usuario, toma su `id` de Auth y agrega el rol en
`public.user_roles`.

Ejemplo:

```sql
insert into public.user_roles (user_id, role)
values ('UUID_DEL_USUARIO_AUTH', 'admin')
on conflict (user_id, role) do nothing;
```

Roles esperados:

- `admin`
- `ventas`
- `almacen`
- `cliente`

## I. Verificar RPC `cancel_sale`

Confirma que existe la funcion:

```sql
select proname
from pg_proc
where proname = 'cancel_sale';
```

Debe existir tambien:

- `apply_inventory_movement`
- `confirm_sale`

La anulacion de venta debe marcar la venta como anulada y devolver stock usando
movimientos de tipo devolucion.

## J. Pruebas funcionales iniciales

Probar en este orden:

1. Login admin real.
2. Crear categoria o usar categorias seed.
3. Crear producto.
4. Crear material.
5. Crear almacen.
6. Registrar entrada de stock.
7. Crear venta en borrador.
8. Agregar items a la venta.
9. Confirmar venta.
10. Verificar descuento de stock.
11. Anular venta.
12. Verificar reversion de stock.
13. Abrir comprobante.
14. Probar cliente, talleres y reportes.

## K. Advertencia sobre `dev-admin`

`dev-admin` esta apagado por defecto y solo funciona si:

- `import.meta.env.DEV === true`
- `import.meta.env.PROD !== true`
- `VITE_ENABLE_DEV_ADMIN=true`
- existen `VITE_DEV_ADMIN_EMAIL` y `VITE_DEV_ADMIN_PASSWORD`

Ese acceso solo permite desarrollo visual/local. No genera JWT real, no valida
RLS real y no reemplaza Supabase Auth.
