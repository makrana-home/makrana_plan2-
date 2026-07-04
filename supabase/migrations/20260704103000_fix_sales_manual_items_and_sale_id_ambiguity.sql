BEGIN;

ALTER TABLE public.sale_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS is_manual_item boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_item_name text,
  ADD COLUMN IF NOT EXISTS provisional_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_items_product_or_manual_chk'
      AND conrelid = 'public.sale_items'::regclass
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_product_or_manual_chk
      CHECK (
        (is_manual_item IS TRUE AND manual_item_name IS NOT NULL AND btrim(manual_item_name) <> '')
        OR
        (is_manual_item IS FALSE AND product_id IS NOT NULL)
      )
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.sale_items VALIDATE CONSTRAINT sale_items_product_or_manual_chk;

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
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'ventas')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT s.*
  INTO _sale
  FROM public.sales s
  WHERE s.id = _sale_id
  FOR UPDATE;

  IF _sale.id IS NULL THEN
    RAISE EXCEPTION 'venta no encontrada';
  END IF;

  IF _sale.status <> 'borrador' THEN
    RAISE EXCEPTION 'la venta ya fue procesada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sale_items si
    WHERE si.sale_id = _sale_id
  ) THEN
    RAISE EXCEPTION 'la venta no tiene items';
  END IF;

  FOR _item IN
    SELECT si.*
    FROM public.sale_items si
    WHERE si.sale_id = _sale_id
  LOOP
    IF COALESCE(_item.is_manual_item, false) THEN
      CONTINUE;
    END IF;

    IF _item.product_id IS NULL THEN
      RAISE EXCEPTION 'item de venta sin producto ni marca manual';
    END IF;

    PERFORM public.apply_inventory_movement(
      _item.product_id,
      'venta'::movement_type,
      _item.quantity,
      _sale.warehouse_id,
      NULL,
      'Venta ' || _sale_id::text,
      NULL,
      _item.presentation_id
    );
  END LOOP;

  UPDATE public.sales s
  SET status = 'confirmada',
      confirmed_at = now(),
      updated_at = now()
  WHERE s.id = _sale_id;

  _next_num := nextval('public.receipt_number_seq');
  _num := 'MKR-' || lpad(_next_num::text, 6, '0');

  INSERT INTO public.receipts(sale_id, number)
  VALUES (_sale_id, _num)
  RETURNING id INTO _receipt_id;

  RETURN QUERY SELECT _sale_id, _receipt_id, _num;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid)
RETURNS TABLE(sale_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _sale public.sales%ROWTYPE;
  _item public.sale_items%ROWTYPE;
BEGIN
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'ventas')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT s.*
  INTO _sale
  FROM public.sales s
  WHERE s.id = _sale_id
  FOR UPDATE;

  IF _sale.id IS NULL THEN
    RAISE EXCEPTION 'venta no encontrada';
  END IF;

  IF _sale.status = 'anulada' THEN
    RETURN QUERY SELECT _sale_id;
    RETURN;
  END IF;

  IF _sale.status = 'confirmada' THEN
    FOR _item IN
      SELECT si.*
      FROM public.sale_items si
      WHERE si.sale_id = _sale_id
    LOOP
      IF COALESCE(_item.is_manual_item, false) THEN
        CONTINUE;
      END IF;

      IF _item.product_id IS NULL THEN
        RAISE EXCEPTION 'item de venta sin producto ni marca manual';
      END IF;

      PERFORM public.apply_inventory_movement(
        _item.product_id,
        'devolucion'::movement_type,
        _item.quantity,
        _sale.warehouse_id,
        NULL,
        'Anulacion venta ' || _sale_id::text,
        'Reversa automatica por anulacion de venta confirmada',
        _item.presentation_id
      );
    END LOOP;
  ELSIF _sale.status <> 'borrador' THEN
    RAISE EXCEPTION 'estado de venta no anulable: %', _sale.status;
  END IF;

  UPDATE public.sales s
  SET status = 'anulada',
      payment_status = 'anulado',
      delivery_status = 'cancelado',
      updated_at = now()
  WHERE s.id = _sale_id;

  RETURN QUERY SELECT _sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_sale(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_sale(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_sale(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
