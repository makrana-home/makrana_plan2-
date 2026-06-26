El alcance que describes equivale a un SaaS completo (web pública + intranet de clientes + ERP interno con productos, materiales, almacenes, stock multi‑sede, ventas, pagos, comprobantes PDF, talleres, ferias, novedades, reportes y RLS por rol). Eso es **mucho más** de lo que se puede entregar bien en una sola iteración: si lo hacemos todo en una pasada, terminamos con módulos a medias, bugs y datos sin RLS correcto. Mejor lo dividimos en fases reales y funcionales, y vamos avanzando fase por fase con tu validación.

Te propongo este plan. **En esta primera iteración construyo la Fase 1 completa** (web pública + diseño + backend base + auth + roles). El resto lo iremos liberando en las siguientes iteraciones.

---

## Fase 1 — Base, diseño y web pública (ESTA iteración)

1. **Lovable Cloud (Supabase)** activado.
2. **Sistema de diseño Makrana** en `src/styles.css`: paleta beige/crema/arena/terracota/cobre, tipografías serif + sans cálidas, tokens semánticos, variantes de botón "hero" y "cobre", cards artesanales.
3. **Auth + roles**:
   - Tablas `profiles`, `user_roles` (enum `admin | ventas | almacen | cliente`), función `has_role`.
   - Trigger de auto‑creación de perfil al registrarse (rol por defecto `cliente`).
   - Layout `_authenticated` administrado, página `/auth` (login/registro email+password).
4. **Web pública** (rutas reales, cada una con su `head()` SEO):
   - `/` Home (hero, historia, destacados, novedades, talleres, beneficios, footer).
   - `/catalogo` y `/catalogo/$slug` (lee productos visibles desde Supabase con cliente publishable + policy `TO anon`).
   - `/novedades` y `/novedades/$slug`.
   - `/talleres`.
   - `/sobre-makrana`.
   - `/registro` (form → tabla `leads`).
   - `/contacto`.
5. **Esquema de BD inicial** (con GRANTs + RLS): `profiles`, `user_roles`, `categories`, `products`, `product_images`, `material_presentations`, `warehouses`, `inventory_stock`, `inventory_movements`, `customers`, `leads`, `sales`, `sale_items`, `sale_payments`, `receipts`, `news_posts`, `workshops`, `workshop_enrollments`, `fairs`, `fair_items`.
6. **Buckets Storage**: `product-images`, `material-images`, `news-images`, `payment-evidence`, `receipt-pdfs`, `workshop-images` con policies.
7. **Seed** mínimo: 3 almacenes (Santa Anita, Pueblo Libre, Feriante), categorías, ~6 productos, ~3 materiales con presentaciones, ~3 novedades, ~2 talleres — para que la web pública se vea con contenido real.
8. **Shell admin** (`/admin`) y **shell cliente** (`/cliente`) con sidebar y dashboard placeholder funcional (solo navegación + métricas básicas leídas de Supabase). Los CRUDs internos llegan en Fase 2.

Resultado de Fase 1: web pública 100% funcional, login/registro real, datos reales en Supabase, base lista para construir los módulos internos encima.

## Fase 2 — Admin: Productos, Materiales, Almacenes, Stock

CRUD completo de productos terminados, materiales con múltiples presentaciones/precios, gestión de almacenes, entradas/salidas/transferencias/ajustes, historial de movimientos, subida de imágenes.

## Fase 3 — Ventas + Comprobantes + Clientes

Flujo de venta (cliente, almacén origen, ítems, descuentos, pagos mixtos), descuento automático de stock con movimiento ligado, anulación con reverso, generación de PDF de nota de venta interna (correlativo `MKR-000001`), enviar por correo / link WhatsApp, módulo de clientes con historial.

## Fase 4 — Novedades, Talleres, Ferias

Admin de novedades (borrador/publicado/oculto, CTA, destacado), talleres y cursos con inscripciones y pago, ferias con stock enviado/retornado y reporte de feria.

## Fase 5 — Intranet del cliente + Reportes

`/cliente/*`: perfil, pedidos, comprobantes descargables, cursos y talleres inscritos, contenido educativo. Reportes con filtros y export CSV/PDF.

---

### Detalles técnicos (Fase 1)

- Stack: TanStack Start + React + TS + Tailwind v4 + shadcn + Lovable Cloud (Supabase).
- Lectura pública del catálogo/novedades/talleres vía cliente publishable del servidor + policies `TO anon` SELECT en columnas seguras.
- Escritura siempre vía `createServerFn` + `requireSupabaseAuth` (Fase 2 en adelante).
- Roles en tabla aparte (`user_roles`) con `has_role` SECURITY DEFINER — nunca en `profiles`.
- Rutas protegidas bajo `_authenticated/` (layout administrado por la integración).
- `/admin/*` y `/cliente/*` viven dentro de `_authenticated/` con verificación de rol en cada ruta vía `has_role`.

### Lo que NO entra en Fase 1 (lo dejo claro para evitar expectativas)

- CRUD de productos/materiales/ventas/comprobantes PDF/movimientos de stock/reportes/intranet de cliente — todo eso son las Fases 2–5.

¿Apruebas que arranque con la **Fase 1** tal cual? Si quieres priorizar otra fase primero (por ejemplo saltar directo a Ventas + Stock antes que la web pública), dímelo y reordeno.
