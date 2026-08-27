\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  warehouse_id uuid := '10000000-0000-4000-8000-000000000001';
  physical_id uuid := '20000000-0000-4000-8000-000000000001';
  course_id uuid := '20000000-0000-4000-8000-000000000002';
  zone_id uuid; district_id uuid; pickup_id uuid; delivery_id uuid;
  pickup_order jsonb; delivery_order jsonb; digital_order jsonb; duplicate_order jsonb;
  caught boolean;
BEGIN
  INSERT INTO public.warehouses(id,name,code,is_active)
  VALUES(warehouse_id,'Validación local','VALIDATION',true);
  UPDATE public.commerce_settings SET default_web_warehouse_id=warehouse_id,reservation_minutes=30;
  SELECT id INTO zone_id FROM public.delivery_zones WHERE code='lima-metropolitana';
  UPDATE public.delivery_zones SET base_fee=10,is_active=true,requires_coordination=false WHERE id=zone_id;
  INSERT INTO public.delivery_zone_districts(delivery_zone_id,department,province,district,ubigeo)
  VALUES(zone_id,'Lima','Lima','Miraflores','150122') RETURNING id INTO district_id;
  IF (SELECT normalized_district FROM public.delivery_zone_districts WHERE id=district_id) <> 'miraflores' THEN
    RAISE EXCEPTION 'falló normalización de distrito';
  END IF;

  caught := false;
  BEGIN
    INSERT INTO public.delivery_zones(code,name,base_fee) VALUES('validation-2','Validación 2',15) RETURNING id INTO zone_id;
    INSERT INTO public.delivery_zone_districts(delivery_zone_id,department,province,district)
    VALUES(zone_id,' LIMA ','Lima','  MÍRAFLORES  ');
  EXCEPTION WHEN unique_violation THEN caught := true;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'se permitió distrito activo ambiguo'; END IF;

  caught := false;
  BEGIN
    UPDATE public.delivery_zones SET base_fee=9.99 WHERE code='lima-metropolitana';
  EXCEPTION WHEN check_violation THEN caught := true;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'se permitió tarifa inferior a 1000 céntimos'; END IF;

  INSERT INTO public.products(id,type,slug,name,price,status,is_visible,is_featured) VALUES
    (physical_id,'producto_terminado','validation-physical','Producto validación',25,'disponible',true,false),
    (course_id,'curso','validation-course','Curso validación',40,'disponible',true,false);
  INSERT INTO public.inventory_stock(product_id,warehouse_id,quantity) VALUES(physical_id,warehouse_id,3);
  SELECT id INTO pickup_id FROM public.delivery_methods WHERE kind='pickup' AND is_active LIMIT 1;
  SELECT id INTO delivery_id FROM public.delivery_methods WHERE kind='lima_delivery' AND is_active LIMIT 1;

  pickup_order := public.create_checkout_order(jsonb_build_object(
    'checkout_key','30000000-0000-4000-8000-000000000001','cart_fingerprint','pickup',
    'items',jsonb_build_array(jsonb_build_object('product_id',physical_id,'quantity',1)),
    'first_name','Prueba','last_name','Local','email','local@example.test','phone','51999999999',
    'receipt_type','receipt','delivery_method_id',pickup_id,'terms_accepted',true,'privacy_accepted',true));
  IF (pickup_order->>'total')::numeric <> 25 THEN RAISE EXCEPTION 'recojo no quedó en S/0'; END IF;

  delivery_order := public.create_checkout_order(jsonb_build_object(
    'checkout_key','30000000-0000-4000-8000-000000000002','cart_fingerprint','delivery',
    'items',jsonb_build_array(jsonb_build_object('product_id',physical_id,'quantity',1)),
    'first_name','Prueba','last_name','Local','email','local@example.test','phone','51999999999',
    'receipt_type','receipt','delivery_method_id',delivery_id,'delivery_zone_district_id',district_id,
    'shipping_address',jsonb_build_object('address_line','Av. Prueba 123','recipient_name','Prueba Local','phone','51999999999'),
    'terms_accepted',true,'privacy_accepted',true));
  IF (delivery_order->>'total')::numeric <> 35 THEN RAISE EXCEPTION 'total no incluyó S/10'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=(delivery_order->>'id')::uuid
    AND delivery_fee_cents=1000 AND shipping_total=10 AND total=35 AND delivery_district_snapshot='Miraflores') THEN
    RAISE EXCEPTION 'snapshots monetarios o de distrito incorrectos';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.payments p JOIN public.orders o ON o.id=p.order_id
    WHERE o.id=(delivery_order->>'id')::uuid AND p.amount=o.total) THEN RAISE EXCEPTION 'pago no coincide con total'; END IF;

  UPDATE public.delivery_zones SET base_fee=18 WHERE code='lima-metropolitana';
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=(delivery_order->>'id')::uuid
    AND delivery_fee_cents=1000 AND shipping_total=10) THEN RAISE EXCEPTION 'cambio de tarifa alteró snapshot'; END IF;

  digital_order := public.create_checkout_order(jsonb_build_object(
    'checkout_key','30000000-0000-4000-8000-000000000003','cart_fingerprint','digital',
    'items',jsonb_build_array(jsonb_build_object('product_id',course_id,'quantity',1)),
    'first_name','Prueba','last_name','Digital','email','digital@example.test','phone','51999999999',
    'receipt_type','receipt','delivery_method_id',delivery_id,'terms_accepted',true,'privacy_accepted',true));
  IF (digital_order->>'total')::numeric <> 40 OR EXISTS(
    SELECT 1 FROM public.inventory_reservations WHERE order_id=(digital_order->>'id')::uuid
  ) THEN RAISE EXCEPTION 'pedido digital reservó o cobró envío'; END IF;

  duplicate_order := public.create_checkout_order(jsonb_build_object(
    'checkout_key','30000000-0000-4000-8000-000000000003','cart_fingerprint','digital',
    'items',jsonb_build_array(jsonb_build_object('product_id',course_id,'quantity',1)),
    'first_name','Prueba','last_name','Digital','email','digital@example.test','phone','51999999999',
    'receipt_type','receipt','delivery_method_id',delivery_id,'terms_accepted',true,'privacy_accepted',true));
  IF duplicate_order->>'id' <> digital_order->>'id' OR (duplicate_order->>'reused')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'idempotencia de checkout falló';
  END IF;

  UPDATE public.inventory_reservations
    SET created_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute'
    WHERE order_id=(pickup_order->>'id')::uuid;
  PERFORM public.release_expired_inventory_reservations();
  IF EXISTS(SELECT 1 FROM public.inventory_reservations WHERE order_id=(pickup_order->>'id')::uuid AND status='active') THEN
    RAISE EXCEPTION 'reserva vencida no se liberó';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders'
    AND roles @> ARRAY['anon'::name] AND cmd='INSERT') THEN RAISE EXCEPTION 'RLS permite insertar orders a anon'; END IF;
  IF has_table_privilege('anon','public.orders','INSERT') THEN RAISE EXCEPTION 'anon conserva INSERT en orders'; END IF;
END $$;

ROLLBACK;
SELECT 'commerce-local-validation: ok' AS result;
