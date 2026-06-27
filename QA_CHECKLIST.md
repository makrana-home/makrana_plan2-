# QA Checklist - Makrana Home Art

Usar esta lista despues de configurar Supabase real, migraciones, buckets,
usuario admin y roles.

## Web publica

- [ ] Home carga sin errores.
- [ ] Catalogo lista productos publicados.
- [ ] Filtros de catalogo funcionan.
- [ ] Detalle de producto muestra imagen, precio y descripcion.
- [ ] Novedades lista publicaciones.
- [ ] Detalle de novedad carga por slug.
- [ ] Talleres lista talleres publicados.
- [ ] Contacto permite enviar lead.
- [ ] Registro permite crear cuenta cliente.

## Admin

- [ ] Login admin real con Supabase Auth.
- [ ] Usuario sin rol admin no entra a `/admin`.
- [ ] Productos: crear, editar, publicar/ocultar y eliminar.
- [ ] Materiales: crear, editar y eliminar.
- [ ] Presentaciones: unidad.
- [ ] Presentaciones: docena.
- [ ] Presentaciones: ciento/100.
- [ ] Presentaciones: combo.
- [ ] Almacenes: crear, editar y eliminar.
- [ ] Movimientos: entrada aumenta stock.
- [ ] Movimientos: salida descuenta stock.
- [ ] Movimientos: no permite stock negativo.
- [ ] Ventas: crear venta borrador.
- [ ] Ventas: agregar productos/materiales.
- [ ] Confirmacion de venta cambia estado.
- [ ] Confirmacion descuenta stock.
- [ ] Anulacion de venta cambia estado.
- [ ] Anulacion revierte stock.
- [ ] Comprobante abre con numero correlativo.
- [ ] Comprobante imprime correctamente.
- [ ] Clientes: crear, editar y consultar historial.
- [ ] Leads: convertir lead a cliente.
- [ ] Novedades: crear, editar, publicar y eliminar.
- [ ] Talleres: crear, editar, publicar y gestionar inscritos.
- [ ] Ferias: crear feria y asignar items.
- [ ] Reportes: ventas, stock bajo, pagos y clientes cargan.

## Cliente

- [ ] Login cliente real.
- [ ] Perfil muestra datos del usuario.
- [ ] Perfil permite actualizar datos permitidos.
- [ ] Compras/pedidos muestra ventas propias.
- [ ] Comprobantes muestra comprobantes propios.
- [ ] Talleres inscritos muestra inscripciones propias.
- [ ] Cursos muestra estado actual sin romper navegacion.

## Seguridad y permisos

- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en el bundle del navegador.
- [ ] RLS bloquea lectura de ventas de otros clientes.
- [ ] RLS bloquea mutaciones admin para usuarios sin rol.
- [ ] Buckets privados no permiten lectura publica.
- [ ] Buckets publicos solo exponen imagenes esperadas.
- [ ] `VITE_ENABLE_DEV_ADMIN=false` en staging/produccion.

## Produccion

- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa.
- [ ] Comando de start de Render funciona.
- [ ] Variables de Render estan completas.
- [ ] Dominio y HTTPS funcionan.
- [ ] Pagina 404/errores no expone detalles internos.
