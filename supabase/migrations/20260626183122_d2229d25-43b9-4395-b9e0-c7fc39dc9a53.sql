CREATE OR REPLACE FUNCTION public.confirm_sale(_sale_id uuid)
RETURNS TABLE(sale_id uuid, receipt_id uuid, receipt_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _sale public.sales%ROWTYPE;
  _item public.sale_items%ROWTYPE;
  _next_num int;
  _num text;
  _receipt_id uuid;
BEGIN
  IF NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'ventas')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _sale FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF _sale.id IS NULL THEN RAISE EXCEPTION 'venta no encontrada'; END IF;
  IF _sale.status <> 'borrador' THEN RAISE EXCEPTION 'la venta ya fue procesada'; END IF;

  FOR _item IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id LOOP
    PERFORM public.apply_inventory_movement(
      _item.product_id, 'venta'::movement_type, _item.quantity,
      _sale.warehouse_id, NULL, 'Venta '||_sale_id::text, NULL
    );
  END LOOP;

  UPDATE public.sales SET status='confirmada', confirmed_at=now() WHERE id=_sale_id;

  SELECT COALESCE(MAX( (regexp_replace(number,'^MKR-','') )::int ), 0) + 1
    INTO _next_num FROM public.receipts;
  _num := 'MKR-' || lpad(_next_num::text, 6, '0');

  INSERT INTO public.receipts(sale_id, number) VALUES (_sale_id, _num) RETURNING id INTO _receipt_id;

  RETURN QUERY SELECT _sale_id, _receipt_id, _num;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_sale(uuid) TO authenticated;

-- Trigger: recompute sale totals on item insert/update/delete
CREATE OR REPLACE FUNCTION public.tg_recompute_sale_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _sid uuid;
BEGIN
  _sid := COALESCE(NEW.sale_id, OLD.sale_id);
  UPDATE public.sales s
    SET subtotal = COALESCE((SELECT SUM(subtotal) FROM public.sale_items WHERE sale_id=_sid),0),
        total    = GREATEST(COALESCE((SELECT SUM(subtotal) FROM public.sale_items WHERE sale_id=_sid),0) - s.discount, 0),
        updated_at = now()
  WHERE s.id=_sid;
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS sale_items_recompute ON public.sale_items;
CREATE TRIGGER sale_items_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_sale_totals();

-- Trigger: recompute payment status
CREATE OR REPLACE FUNCTION public.tg_recompute_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _sid uuid; _paid numeric; _total numeric;
BEGIN
  _sid := COALESCE(NEW.sale_id, OLD.sale_id);
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.sale_payments WHERE sale_id=_sid;
  SELECT total INTO _total FROM public.sales WHERE id=_sid;
  UPDATE public.sales SET
    payment_status = CASE
      WHEN _paid <= 0 THEN 'pendiente'::payment_status
      WHEN _paid < _total THEN 'parcial'::payment_status
      ELSE 'pagado'::payment_status END,
    updated_at = now()
  WHERE id=_sid;
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS sale_payments_recompute ON public.sale_payments;
CREATE TRIGGER sale_payments_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_payment_status();

-- Trigger: keep workshops.enrolled_count in sync
CREATE OR REPLACE FUNCTION public.tg_workshop_enrolled_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _wid uuid;
BEGIN
  _wid := COALESCE(NEW.workshop_id, OLD.workshop_id);
  UPDATE public.workshops w
    SET enrolled_count = (SELECT COUNT(*) FROM public.workshop_enrollments WHERE workshop_id=_wid),
        updated_at = now()
  WHERE w.id=_wid;
  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS workshop_enroll_count ON public.workshop_enrollments;
CREATE TRIGGER workshop_enroll_count
AFTER INSERT OR DELETE ON public.workshop_enrollments
FOR EACH ROW EXECUTE FUNCTION public.tg_workshop_enrolled_count();