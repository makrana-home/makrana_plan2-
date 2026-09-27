BEGIN;

CREATE TABLE public.inventory_purchases (
  id uuid PRIMARY KEY,
  supplier_name text NOT NULL CHECK (length(trim(supplier_name)) BETWEEN 2 AND 160),
  supplier_phone text NOT NULL DEFAULT '',
  supplier_address text NOT NULL DEFAULT '',
  supplier_ruc text NOT NULL DEFAULT '' CHECK (supplier_ruc ~ '^(\d{11})?$'),
  receipt_number text NOT NULL DEFAULT '',
  purchased_on date NOT NULL,
  receipt_path text,
  notes text NOT NULL DEFAULT '',
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 100),
  total numeric(16,2) NOT NULL CHECK (total >= 0),
  stocked_at timestamptz,
  warehouse_id uuid REFERENCES public.warehouses(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.inventory_purchases TO authenticated;
GRANT ALL ON public.inventory_purchases TO service_role;
CREATE POLICY "Staff read inventory purchases" ON public.inventory_purchases FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create inventory purchases" ON public.inventory_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid() AND stocked_at IS NULL AND warehouse_id IS NULL);
CREATE INDEX inventory_purchases_date ON public.inventory_purchases(purchased_on DESC);

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('purchase-files', 'purchase-files', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Staff read purchase files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'purchase-files' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload purchase files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'purchase-files' AND public.is_staff(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE FUNCTION public.stock_inventory_purchase(_id uuid, _warehouse_id uuid, _mappings jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.inventory_purchases;
  item jsonb;
  mapping jsonb;
  product_id uuid;
  presentation_id uuid;
  item_index integer := 0;
  qty numeric;
  unit_price numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
  SELECT * INTO p FROM public.inventory_purchases WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra no encontrada'; END IF;
  IF p.stocked_at IS NOT NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = _warehouse_id AND is_active) THEN RAISE EXCEPTION 'Selecciona un almacén activo'; END IF;
  IF jsonb_typeof(_mappings) IS DISTINCT FROM 'array' OR jsonb_array_length(_mappings) <> jsonb_array_length(p.items) THEN RAISE EXCEPTION 'Vincula todos los productos'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p.items) LOOP
    mapping := _mappings->item_index;
    qty := (item->>'quantity')::numeric;
    unit_price := (item->>'price')::numeric;
    IF qty IS NULL OR qty <= 0 OR qty > 999999 OR unit_price IS NULL OR unit_price < 0 OR unit_price > 999999 THEN RAISE EXCEPTION 'Cantidad o precio inválido'; END IF;
    product_id := (mapping->>'product_id')::uuid;
    presentation_id := (mapping->>'presentation_id')::uuid;
    IF product_id IS NULL THEN
      IF mapping->>'type' IS NULL OR mapping->>'type' NOT IN ('material','producto_terminado') OR presentation_id IS NOT NULL THEN RAISE EXCEPTION 'Tipo de producto inválido'; END IF;
      product_id := gen_random_uuid();
      INSERT INTO public.products(id, type, slug, name, cost, is_visible, supplier, internal_notes)
      VALUES(product_id, (mapping->>'type')::public.product_type, 'compra-' || product_id::text, item->>'name', unit_price, false, p.supplier_name, 'Unidad de compra: ' || (item->>'unit'));
    ELSIF NOT EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND type IN ('material', 'producto_terminado')) THEN
      RAISE EXCEPTION 'Producto de inventario inválido';
    END IF;
    PERFORM public.apply_inventory_movement(product_id, 'entrada', qty, _warehouse_id, NULL,
      'Compra ' || coalesce(nullif(p.receipt_number,''), p.id::text),
      'Compra ID: ' || p.id::text || ' · ' || p.supplier_name || ' · ' || (item->>'unit') || ' · S/ ' || unit_price::text,
      presentation_id);
    item_index := item_index + 1;
  END LOOP;
  UPDATE public.inventory_purchases SET stocked_at = now(), warehouse_id = _warehouse_id WHERE id = _id;
END;
$$;
REVOKE ALL ON FUNCTION public.stock_inventory_purchase(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stock_inventory_purchase(uuid, uuid, jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
