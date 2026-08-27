\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(_condition boolean, _message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT coalesce(_condition, false) THEN RAISE EXCEPTION 'ASSERTION FAILED: %', _message; END IF;
END $$;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 5 FROM supabase_migrations.schema_migrations
   WHERE version IN ('20260822100000','20260822110000','20260822120000','20260822130000','20260827160000')),
  'las cinco migraciones comerciales finales deben estar aplicadas'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 12 FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN (
     'commerce_settings','delivery_zones','delivery_zone_districts','delivery_methods',
     'orders','order_items','order_addresses','inventory_reservations','payments',
     'payment_attempts','payment_events','commerce_audit_logs')),
  'faltan tablas comerciales'
);

SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.sale_document_conversions'::regclass),
  'sale_document_conversions debe tener RLS'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_proc
   WHERE pronamespace='public'::regnamespace AND proname='apply_inventory_movement'),
  'debe existir una sola firma vigente de apply_inventory_movement'
);

SELECT pg_temp.assert_true(
  NOT has_function_privilege('anon', 'public.apply_inventory_movement(uuid, public.movement_type, numeric, uuid, uuid, text, text, uuid)', 'EXECUTE'),
  'anon no debe ejecutar apply_inventory_movement'
);
SELECT pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.apply_inventory_movement(uuid, public.movement_type, numeric, uuid, uuid, text, text, uuid)', 'EXECUTE'),
  'authenticated debe ejecutar apply_inventory_movement para operaciones de personal'
);
SELECT pg_temp.assert_true(
  has_function_privilege('service_role', 'public.apply_inventory_movement(uuid, public.movement_type, numeric, uuid, uuid, text, text, uuid)', 'EXECUTE'),
  'service_role debe conservar apply_inventory_movement para flujos internos'
);
SELECT pg_temp.assert_true(
  NOT has_function_privilege('anon', 'public.guard_paid_sale_confirmation()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.guard_paid_sale_confirmation()', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'public.guard_paid_sale_confirmation()', 'EXECUTE'),
  'guard_paid_sale_confirmation solo debe ser ejecutable por su propietario como trigger'
);

INSERT INTO auth.users(id) VALUES
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004');
INSERT INTO public.user_roles(user_id,role) VALUES
  ('10000000-0000-0000-0000-000000000001','admin'),
  ('10000000-0000-0000-0000-000000000002','ventas'),
  ('10000000-0000-0000-0000-000000000003','almacen');

INSERT INTO public.warehouses(id,name,code,is_active)
VALUES ('20000000-0000-0000-0000-000000000001','Almacén QA','QA-01',true);
INSERT INTO public.products(id,type,slug,name,price,status,is_visible,is_featured)
VALUES
  ('30000000-0000-0000-0000-000000000001','producto_terminado','producto-qa','Producto QA',50,'disponible',true,false),
  ('30000000-0000-0000-0000-000000000002','curso','curso-qa','Curso QA',50,'disponible',true,false);
INSERT INTO public.inventory_stock(product_id,warehouse_id,quantity)
VALUES ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',10);

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.apply_inventory_movement(
    '30000000-0000-0000-0000-000000000001', 'ajuste', 10,
    '20000000-0000-0000-0000-000000000001', NULL, 'QA anon', NULL, NULL
  );
  RAISE EXCEPTION 'ASSERTION FAILED: anon ejecutó apply_inventory_movement';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SELECT public.apply_inventory_movement(
  '30000000-0000-0000-0000-000000000001', 'ajuste', 10,
  '20000000-0000-0000-0000-000000000001', NULL, 'QA almacén autorizado', NULL, NULL
);
RESET ROLE;

INSERT INTO public.sales(id,warehouse_id,status,payment_status,delivery_status,subtotal,discount,total,notes,created_by)
VALUES ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','borrador','pendiente','pendiente',100,0,100,'[Documento: boleta] QA sin pago','10000000-0000-0000-0000-000000000001');
INSERT INTO public.sale_items(sale_id,product_id,description,quantity,unit_price,discount,subtotal)
VALUES ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Producto QA',2,50,0,100);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DO $$
BEGIN
  PERFORM public.confirm_sale('40000000-0000-0000-0000-000000000001');
  RAISE EXCEPTION 'ASSERTION FAILED: la venta sin pago fue confirmada';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
  IF SQLERRM NOT LIKE '%pago debe estar confirmado%' THEN RAISE; END IF;
END $$;
RESET ROLE;

SELECT pg_temp.assert_true((SELECT status='borrador' FROM public.sales WHERE id='40000000-0000-0000-0000-000000000001'),'venta sin pago debe seguir en borrador');
SELECT pg_temp.assert_true((SELECT quantity=10 FROM public.inventory_stock WHERE product_id='30000000-0000-0000-0000-000000000001'),'el fallo debe revertir el descuento');

INSERT INTO public.sale_payments(sale_id,method,amount,operation_code)
VALUES ('40000000-0000-0000-0000-000000000001','efectivo',100,'QA-PAGO-1');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SELECT * FROM public.confirm_sale('40000000-0000-0000-0000-000000000001');
DO $$
BEGIN
  PERFORM public.confirm_sale('40000000-0000-0000-0000-000000000001');
  RAISE EXCEPTION 'ASSERTION FAILED: el reintento confirmó dos veces';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'ASSERTION FAILED:%' THEN RAISE; END IF;
  IF SQLERRM NOT LIKE '%ya fue procesada%' THEN RAISE; END IF;
END $$;
RESET ROLE;

SELECT pg_temp.assert_true((SELECT quantity=8 FROM public.inventory_stock WHERE product_id='30000000-0000-0000-0000-000000000001'),'la venta debe descontar stock una sola vez');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.receipts WHERE sale_id='40000000-0000-0000-0000-000000000001'),'debe existir un solo recibo');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.inventory_movements WHERE reason='Venta 40000000-0000-0000-0000-000000000001'),'debe existir un solo movimiento de venta');

INSERT INTO public.sales(id,warehouse_id,status,payment_status,delivery_status,subtotal,discount,total,notes,created_by)
VALUES ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','borrador','pendiente','pendiente',25,0,25,'[Documento: cotizacion] QA conversión','10000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
UPDATE public.sales SET notes='[Documento: boleta] QA conversión' WHERE id='40000000-0000-0000-0000-000000000002';
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT actor_type='authenticated_user' AND converted_by='10000000-0000-0000-0000-000000000001'
   FROM public.sale_document_conversions WHERE sale_id='40000000-0000-0000-0000-000000000002'),
  'la conversión humana debe conservar el actor'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.sale_document_conversions),'ventas debe leer conversiones');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.sale_document_conversions),'almacén no debe leer conversiones tributarias');
DO $$
BEGIN
  INSERT INTO public.sale_document_conversions(sale_id,source_document,target_document,converted_by,actor_type,actor_reference,price_snapshot)
  VALUES ('40000000-0000-0000-0000-000000000002','boleta','factura','10000000-0000-0000-0000-000000000003','authenticated_user','10000000-0000-0000-0000-000000000003',25);
  RAISE EXCEPTION 'ASSERTION FAILED: RLS permitió insertar a almacén';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM count(*) FROM public.sale_document_conversions;
  RAISE EXCEPTION 'ASSERTION FAILED: anon pudo leer conversiones';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','service_role',true);
UPDATE public.sales SET notes='[Documento: factura] QA conversión técnica' WHERE id='40000000-0000-0000-0000-000000000002';
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT actor_type='service_role' AND converted_by IS NULL AND actor_reference='service_role'
   FROM public.sale_document_conversions
   WHERE sale_id='40000000-0000-0000-0000-000000000002' AND target_document='factura'),
  'la conversión técnica debe conservar identidad service_role'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.sale_document_conversions),'un usuario sin rol no debe leer conversiones');
DO $$
BEGIN
  INSERT INTO public.sale_document_conversions(sale_id,source_document,target_document,converted_by,actor_type,actor_reference,price_snapshot)
  VALUES ('40000000-0000-0000-0000-000000000002','factura','boleta','10000000-0000-0000-0000-000000000004','authenticated_user','10000000-0000-0000-0000-000000000004',25);
  RAISE EXCEPTION 'ASSERTION FAILED: RLS permitió insertar al usuario sin rol';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

INSERT INTO public.orders(
  id,code,checkout_key,cart_fingerprint,access_token_hash,user_id,first_name,last_name,email,phone,
  status,subtotal,discount_total,shipping_total,tax_total,total,receipt_type,delivery_method_snapshot,
  delivery_fee_cents,warehouse_id,reservation_minutes,expires_at,terms_accepted_at,privacy_accepted_at
) VALUES (
  '50000000-0000-0000-0000-000000000001','QA-WEB-1','50000000-0000-0000-0000-000000000002','qa','hash',
  '10000000-0000-0000-0000-000000000004','Cliente','QA','qa@example.test','999999999',
  'pending_payment',50,0,0,0,50,'receipt','Digital',0,NULL,30,now()+interval '30 minutes',now(),now()
);
INSERT INTO public.order_items(order_id,line_number,item_type,product_id,name_snapshot,quantity,unit_price,discount,subtotal,requires_inventory)
VALUES ('50000000-0000-0000-0000-000000000001',1,'course','30000000-0000-0000-0000-000000000002','Curso QA',1,50,0,50,false);
INSERT INTO public.payments(id,order_id,provider,amount,status)
VALUES ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','manual',50,'pending');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SELECT public.review_manual_payment('60000000-0000-0000-0000-000000000001',true,'Pago QA',NULL);
SELECT public.review_manual_payment('60000000-0000-0000-0000-000000000001',true,'Reintento QA',NULL);
RESET ROLE;
SELECT pg_temp.assert_true((SELECT status='paid' FROM public.orders WHERE id='50000000-0000-0000-0000-000000000001'),'pedido web debe quedar pagado');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.sales WHERE order_id='50000000-0000-0000-0000-000000000001'),'reintento no debe duplicar venta');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.sale_payments sp JOIN public.sales s ON s.id=sp.sale_id WHERE s.order_id='50000000-0000-0000-0000-000000000001'),'pago web debe registrarse una sola vez');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.receipts r JOIN public.sales s ON s.id=r.sale_id WHERE s.order_id='50000000-0000-0000-0000-000000000001'),'reintento no debe duplicar recibo');

ROLLBACK;

SELECT 'LOCAL_ISOLATED_VALIDATION_OK' AS result;
