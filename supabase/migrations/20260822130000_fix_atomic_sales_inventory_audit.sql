BEGIN;

-- Serialize stock creation/update by the logical stock key. This avoids relying on
-- partial-index inference in ON CONFLICT while preserving one stock row per key.
CREATE OR REPLACE FUNCTION public.mutate_inventory_stock(
  _product_id uuid,
  _warehouse_id uuid,
  _presentation_id uuid,
  _quantity numeric,
  _replace boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _warehouse_id IS NULL THEN RAISE EXCEPTION 'almacen requerido'; END IF;
  IF _quantity < 0 THEN RAISE EXCEPTION 'la cantidad no puede ser negativa'; END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      _product_id::text || ':' || _warehouse_id::text || ':' || coalesce(_presentation_id::text, 'base'),
      0
    )
  );

  UPDATE public.inventory_stock
  SET quantity = CASE WHEN _replace THEN _quantity ELSE quantity + _quantity END,
      updated_at = now()
  WHERE product_id = _product_id
    AND warehouse_id = _warehouse_id
    AND presentation_id IS NOT DISTINCT FROM _presentation_id;

  IF NOT FOUND THEN
    INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
    VALUES (_product_id, _warehouse_id, _presentation_id, _quantity);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_inventory_stock(uuid, uuid, uuid, numeric, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_inventory_stock(uuid, uuid, uuid, numeric, boolean) TO service_role;

DROP FUNCTION IF EXISTS public.apply_inventory_movement(uuid, movement_type, numeric, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.apply_inventory_movement(
  _product_id uuid,
  _movement_type movement_type,
  _quantity numeric,
  _warehouse_id uuid,
  _warehouse_dest_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _presentation_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _movement_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_staff(_uid) THEN
    RAISE EXCEPTION 'forbidden: solo personal puede registrar movimientos';
  END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'la cantidad debe ser mayor a 0'; END IF;
  IF _presentation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.material_presentations
    WHERE id = _presentation_id AND product_id = _product_id
  ) THEN
    RAISE EXCEPTION 'la presentacion no pertenece al material seleccionado';
  END IF;

  IF _movement_type IN ('entrada', 'devolucion') THEN
    PERFORM public.mutate_inventory_stock(_product_id, _warehouse_id, _presentation_id, _quantity, false);
  ELSIF _movement_type IN ('salida', 'venta') THEN
    IF _warehouse_id IS NULL THEN RAISE EXCEPTION 'almacen origen requerido'; END IF;
    UPDATE public.inventory_stock
    SET quantity = quantity - _quantity, updated_at = now()
    WHERE product_id = _product_id
      AND warehouse_id = _warehouse_id
      AND presentation_id IS NOT DISTINCT FROM _presentation_id
      AND quantity >= _quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'stock insuficiente para descontar'; END IF;
  ELSIF _movement_type = 'transferencia' THEN
    IF _warehouse_id IS NULL OR _warehouse_dest_id IS NULL THEN RAISE EXCEPTION 'origen y destino requeridos'; END IF;
    IF _warehouse_id = _warehouse_dest_id THEN RAISE EXCEPTION 'origen y destino deben ser distintos'; END IF;
    UPDATE public.inventory_stock
    SET quantity = quantity - _quantity, updated_at = now()
    WHERE product_id = _product_id
      AND warehouse_id = _warehouse_id
      AND presentation_id IS NOT DISTINCT FROM _presentation_id
      AND quantity >= _quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'stock insuficiente para transferir'; END IF;
    PERFORM public.mutate_inventory_stock(_product_id, _warehouse_dest_id, _presentation_id, _quantity, false);
  ELSIF _movement_type = 'ajuste' THEN
    PERFORM public.mutate_inventory_stock(_product_id, _warehouse_id, _presentation_id, _quantity, true);
  ELSE
    RAISE EXCEPTION 'tipo de movimiento no soportado: %', _movement_type;
  END IF;

  INSERT INTO public.inventory_movements(
    product_id, presentation_id, warehouse_id, warehouse_dest_id,
    movement_type, quantity, reason, notes, created_by
  ) VALUES (
    _product_id, _presentation_id, _warehouse_id, _warehouse_dest_id,
    _movement_type, _quantity, _reason, _notes, _uid
  ) RETURNING id INTO _movement_id;
  RETURN _movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_inventory_movement(uuid, movement_type, numeric, uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_inventory_movement(uuid, movement_type, numeric, uuid, uuid, text, text, uuid) TO authenticated, service_role;

-- Keep a durable identity for both authenticated and service-role conversions.
ALTER TABLE public.sale_document_conversions
  ALTER COLUMN converted_by DROP NOT NULL,
  ADD COLUMN actor_type text,
  ADD COLUMN actor_reference text;

UPDATE public.sale_document_conversions
SET actor_type = 'authenticated_user',
    actor_reference = converted_by::text
WHERE actor_type IS NULL OR actor_reference IS NULL;

ALTER TABLE public.sale_document_conversions
  ALTER COLUMN actor_type SET NOT NULL,
  ALTER COLUMN actor_reference SET NOT NULL,
  ADD CONSTRAINT sale_document_conversions_actor_type_check
    CHECK (actor_type IN ('authenticated_user', 'service_role', 'database_role')),
  ADD CONSTRAINT sale_document_conversions_actor_identity_check
    CHECK (converted_by IS NOT NULL OR length(trim(actor_reference)) > 0);

GRANT SELECT, INSERT ON public.sale_document_conversions TO authenticated;
GRANT ALL ON public.sale_document_conversions TO service_role;

CREATE OR REPLACE FUNCTION public.audit_sale_document_conversion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  old_intent text;
  new_intent text;
  actor_id uuid := auth.uid();
  actor_kind text;
  actor_ref text;
  jwt_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  active_role text := nullif(current_setting('role', true), '');
BEGIN
  old_intent := public.sale_document_intent(OLD.notes);
  new_intent := public.sale_document_intent(NEW.notes);
  IF old_intent <> new_intent THEN
    actor_kind := CASE
      WHEN actor_id IS NOT NULL THEN 'authenticated_user'
      WHEN jwt_role = 'service_role' OR active_role = 'service_role' THEN 'service_role'
      ELSE 'database_role'
    END;
    actor_ref := coalesce(
      actor_id::text,
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      jwt_role,
      active_role,
      session_user
    );

    INSERT INTO public.sale_document_conversions(
      sale_id, source_document, target_document, converted_by,
      actor_type, actor_reference, price_snapshot, warehouse_id
    ) VALUES (
      NEW.id, old_intent, new_intent, actor_id,
      actor_kind, actor_ref, NEW.total, NEW.warehouse_id
    ) ON CONFLICT (sale_id, source_document, target_document) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- A web payment is recorded in the canonical sale ledger before confirmation.
-- Every statement remains in the same transaction and rolls back as a unit.
CREATE OR REPLACE FUNCTION public.review_manual_payment(_payment_id uuid,_approve boolean,_reason text,_ip inet DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.payments%ROWTYPE; o public.orders%ROWTYPE; sale_id uuid; receipt_result record; document_intent text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;
  SELECT * INTO p FROM public.payments WHERE id=_payment_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Pago o pedido inexistente'; END IF;
  SELECT * INTO o FROM public.orders WHERE id=p.order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Pago o pedido inexistente'; END IF;
  IF _approve AND p.status='approved' AND o.status='paid' THEN RETURN jsonb_build_object('order_id',o.id,'sale_id',(SELECT id FROM public.sales WHERE order_id=o.id),'reused',true); END IF;
  IF p.status NOT IN ('pending','under_review') OR o.status NOT IN ('pending_payment','payment_under_review') THEN RAISE EXCEPTION 'El pago ya fue procesado'; END IF;
  IF NOT _approve THEN
    UPDATE public.payments SET status='rejected',rejection_reason=_reason,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p.id;
    UPDATE public.orders SET status='payment_failed' WHERE id=o.id;
    UPDATE public.inventory_reservations SET status='released',released_at=now() WHERE order_id=o.id AND status='active';
    INSERT INTO public.payment_events(payment_id,provider,provider_event_id,event_type,is_valid,processed_at,sanitized_payload) VALUES(p.id,'manual',gen_random_uuid()::text,'manual_rejected',true,now(),jsonb_build_object('reason',_reason));
    INSERT INTO public.commerce_audit_logs(actor_user_id,action,aggregate_type,aggregate_id,reason,ip_address,before_data,after_data) VALUES(auth.uid(),'payment_rejected','payment',p.id,_reason,_ip,jsonb_build_object('status',p.status),jsonb_build_object('status','rejected'));
    RETURN jsonb_build_object('order_id',o.id,'approved',false);
  END IF;
  IF p.amount<>o.total OR p.currency<>o.currency THEN RAISE EXCEPTION 'Importe o moneda no coincide'; END IF;
  INSERT INTO public.customers(user_id,full_name,email,phone,document,source)
  VALUES(o.user_id,trim(o.first_name||' '||o.last_name),o.email,o.phone,o.document_number,'checkout-web')
  ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,document=excluded.document
  RETURNING id INTO o.customer_id;
  document_intent := CASE WHEN o.receipt_type = 'invoice' THEN 'factura' ELSE 'boleta' END;
  INSERT INTO public.sales(order_id,customer_id,warehouse_id,status,payment_status,delivery_status,subtotal,discount,total,notes,created_by)
  VALUES(o.id,o.customer_id,o.warehouse_id,'borrador','pagado','pendiente',o.subtotal,o.discount_total,o.total,'[Documento: '||document_intent||'] Pedido web '||o.code,auth.uid()) RETURNING id INTO sale_id;
  INSERT INTO public.sale_items(sale_id,product_id,presentation_id,description,quantity,unit_price,discount,subtotal,is_manual_item,manual_item_name,provisional_source)
  SELECT sale_id,CASE WHEN requires_inventory THEN product_id ELSE NULL END,CASE WHEN requires_inventory THEN presentation_id ELSE NULL END,name_snapshot,quantity,unit_price,discount,subtotal,NOT requires_inventory,CASE WHEN NOT requires_inventory THEN name_snapshot ELSE NULL END,CASE WHEN NOT requires_inventory THEN 'curso_digital' ELSE NULL END FROM public.order_items WHERE order_id=o.id;
  INSERT INTO public.sale_payments(sale_id,method,amount,operation_code,notes,paid_at)
  VALUES(sale_id,'otro',p.amount,p.id::text,'Pago web aprobado: '||p.provider,now());
  UPDATE public.payments SET status='approved',confirmed_at=now(),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p.id;
  SELECT * INTO receipt_result FROM public.confirm_sale(sale_id) LIMIT 1;
  UPDATE public.inventory_reservations SET status='consumed',consumed_at=now() WHERE order_id=o.id AND status='active';
  UPDATE public.orders SET status='paid',customer_id=o.customer_id WHERE id=o.id;
  INSERT INTO public.payment_events(payment_id,provider,provider_event_id,event_type,is_valid,processed_at,sanitized_payload) VALUES(p.id,'manual',gen_random_uuid()::text,'manual_approved',true,now(),jsonb_build_object('reason',_reason,'sale_id',sale_id));
  INSERT INTO public.commerce_audit_logs(actor_user_id,action,aggregate_type,aggregate_id,reason,ip_address,before_data,after_data) VALUES(auth.uid(),'payment_approved','payment',p.id,_reason,_ip,jsonb_build_object('status',p.status),jsonb_build_object('status','approved','sale_id',sale_id));
  RETURN jsonb_build_object('order_id',o.id,'sale_id',sale_id,'receipt_id',receipt_result.receipt_id,'reused',false);
END $$;

REVOKE ALL ON FUNCTION public.review_manual_payment(uuid,boolean,text,inet) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(uuid,boolean,text,inet) TO authenticated,service_role;

COMMIT;
