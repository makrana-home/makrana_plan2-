-- Track inventory by material presentation when a material has subgroups.

ALTER TABLE public.inventory_stock
  ADD COLUMN IF NOT EXISTS presentation_id uuid REFERENCES public.material_presentations(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS presentation_id uuid REFERENCES public.material_presentations(id) ON DELETE SET NULL;

-- The original constraint only allowed one stock row per product+warehouse.
ALTER TABLE public.inventory_stock
  DROP CONSTRAINT IF EXISTS inventory_stock_product_id_warehouse_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_stock_product_warehouse_base_uidx
  ON public.inventory_stock(product_id, warehouse_id)
  WHERE presentation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_stock_product_warehouse_presentation_uidx
  ON public.inventory_stock(product_id, warehouse_id, presentation_id)
  WHERE presentation_id IS NOT NULL;

-- If a material only has one presentation, the legacy product-level stock belongs to it.
UPDATE public.inventory_stock stock
SET presentation_id = only_presentation.id
FROM (
  SELECT product_id, min(id) AS id
  FROM public.material_presentations
  GROUP BY product_id
  HAVING count(*) = 1
) only_presentation
JOIN public.products product ON product.id = only_presentation.product_id
WHERE stock.product_id = only_presentation.product_id
  AND product.type = 'material'
  AND stock.presentation_id IS NULL;

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
  _is_staff boolean;
BEGIN
  SELECT public.is_staff(_uid) INTO _is_staff;
  IF NOT _is_staff THEN
    RAISE EXCEPTION 'forbidden: solo personal puede registrar movimientos';
  END IF;

  IF _quantity <= 0 THEN
    RAISE EXCEPTION 'la cantidad debe ser mayor a 0';
  END IF;

  IF _presentation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.material_presentations
    WHERE id = _presentation_id
      AND product_id = _product_id
  ) THEN
    RAISE EXCEPTION 'la presentacion no pertenece al material seleccionado';
  END IF;

  IF _movement_type IN ('entrada', 'devolucion') THEN
    IF _warehouse_id IS NULL THEN RAISE EXCEPTION 'almacen destino requerido'; END IF;

    IF _presentation_id IS NULL THEN
      INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
      VALUES (_product_id, _warehouse_id, NULL, _quantity)
      ON CONFLICT (product_id, warehouse_id) WHERE presentation_id IS NULL DO UPDATE
      SET quantity = inventory_stock.quantity + EXCLUDED.quantity,
          updated_at = now();
    ELSE
      INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
      VALUES (_product_id, _warehouse_id, _presentation_id, _quantity)
      ON CONFLICT (product_id, warehouse_id, presentation_id) WHERE presentation_id IS NOT NULL DO UPDATE
      SET quantity = inventory_stock.quantity + EXCLUDED.quantity,
          updated_at = now();
    END IF;

  ELSIF _movement_type IN ('salida', 'venta') THEN
    IF _warehouse_id IS NULL THEN RAISE EXCEPTION 'almacen origen requerido'; END IF;

    UPDATE public.inventory_stock
    SET quantity = quantity - _quantity,
        updated_at = now()
    WHERE product_id = _product_id
      AND warehouse_id = _warehouse_id
      AND ((_presentation_id IS NULL AND presentation_id IS NULL) OR presentation_id = _presentation_id)
      AND quantity >= _quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock insuficiente para descontar';
    END IF;

  ELSIF _movement_type = 'transferencia' THEN
    IF _warehouse_id IS NULL OR _warehouse_dest_id IS NULL THEN
      RAISE EXCEPTION 'origen y destino requeridos';
    END IF;
    IF _warehouse_id = _warehouse_dest_id THEN
      RAISE EXCEPTION 'origen y destino deben ser distintos';
    END IF;

    UPDATE public.inventory_stock
    SET quantity = quantity - _quantity,
        updated_at = now()
    WHERE product_id = _product_id
      AND warehouse_id = _warehouse_id
      AND ((_presentation_id IS NULL AND presentation_id IS NULL) OR presentation_id = _presentation_id)
      AND quantity >= _quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'stock insuficiente para transferir';
    END IF;

    IF _presentation_id IS NULL THEN
      INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
      VALUES (_product_id, _warehouse_dest_id, NULL, _quantity)
      ON CONFLICT (product_id, warehouse_id) WHERE presentation_id IS NULL DO UPDATE
      SET quantity = inventory_stock.quantity + EXCLUDED.quantity,
          updated_at = now();
    ELSE
      INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
      VALUES (_product_id, _warehouse_dest_id, _presentation_id, _quantity)
      ON CONFLICT (product_id, warehouse_id, presentation_id) WHERE presentation_id IS NOT NULL DO UPDATE
      SET quantity = inventory_stock.quantity + EXCLUDED.quantity,
          updated_at = now();
    END IF;

  ELSIF _movement_type = 'ajuste' THEN
    IF _warehouse_id IS NULL THEN RAISE EXCEPTION 'almacen requerido'; END IF;

    IF _presentation_id IS NULL THEN
      INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
      VALUES (_product_id, _warehouse_id, NULL, _quantity)
      ON CONFLICT (product_id, warehouse_id) WHERE presentation_id IS NULL DO UPDATE
      SET quantity = EXCLUDED.quantity,
          updated_at = now();
    ELSE
      INSERT INTO public.inventory_stock(product_id, warehouse_id, presentation_id, quantity)
      VALUES (_product_id, _warehouse_id, _presentation_id, _quantity)
      ON CONFLICT (product_id, warehouse_id, presentation_id) WHERE presentation_id IS NOT NULL DO UPDATE
      SET quantity = EXCLUDED.quantity,
          updated_at = now();
    END IF;

  ELSE
    RAISE EXCEPTION 'tipo de movimiento no soportado: %', _movement_type;
  END IF;

  INSERT INTO public.inventory_movements(
    product_id,
    presentation_id,
    warehouse_id,
    warehouse_dest_id,
    movement_type,
    quantity,
    reason,
    notes,
    created_by
  )
  VALUES (
    _product_id,
    _presentation_id,
    _warehouse_id,
    _warehouse_dest_id,
    _movement_type,
    _quantity,
    _reason,
    _notes,
    _uid
  )
  RETURNING id INTO _movement_id;

  RETURN _movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_inventory_movement(uuid, movement_type, numeric, uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_inventory_movement(uuid, movement_type, numeric, uuid, uuid, text, text, uuid) TO authenticated;

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

  SELECT * INTO _sale FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF _sale.id IS NULL THEN RAISE EXCEPTION 'venta no encontrada'; END IF;
  IF _sale.status <> 'borrador' THEN RAISE EXCEPTION 'la venta ya fue procesada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sale_items WHERE sale_id = _sale_id) THEN
    RAISE EXCEPTION 'la venta no tiene items';
  END IF;

  FOR _item IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id LOOP
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

  UPDATE public.sales
  SET status = 'confirmada',
      confirmed_at = now(),
      updated_at = now()
  WHERE id = _sale_id;

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

  SELECT * INTO _sale FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF _sale.id IS NULL THEN RAISE EXCEPTION 'venta no encontrada'; END IF;

  IF _sale.status = 'anulada' THEN
    RETURN QUERY SELECT _sale_id;
    RETURN;
  END IF;

  IF _sale.status = 'confirmada' THEN
    FOR _item IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id LOOP
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

  UPDATE public.sales
  SET status = 'anulada',
      payment_status = 'anulado',
      delivery_status = 'cancelado',
      updated_at = now()
  WHERE id = _sale_id;

  RETURN QUERY SELECT _sale_id;
END;
$$;
