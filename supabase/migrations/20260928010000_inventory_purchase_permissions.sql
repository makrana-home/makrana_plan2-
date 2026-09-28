BEGIN;
ALTER TABLE public.staff_module_permissions DROP CONSTRAINT IF EXISTS staff_module_permissions_module_check;
ALTER TABLE public.staff_module_permissions ADD CONSTRAINT staff_module_permissions_module_check CHECK (module IN (
  'dashboard', 'products', 'materials', 'warehouses', 'inventory_movements', 'inventory_purchases',
  'manual', 'calendar', 'sales', 'web_orders', 'customers', 'reports',
  'tax_overview', 'receipts', 'tax_purchases', 'sire', 'electronic_invoicing', 'web_home', 'news', 'workshops'
));
-- Preserve existing access when separating purchases from inventory movements.
INSERT INTO public.staff_module_permissions(user_id, module, enabled)
SELECT users.user_id, 'inventory_purchases', coalesce(previous.enabled, false)
FROM (SELECT DISTINCT user_id FROM public.staff_module_permissions) users
LEFT JOIN public.staff_module_permissions previous ON previous.user_id = users.user_id AND previous.module = 'inventory_movements'
ON CONFLICT (user_id, module) DO NOTHING;

CREATE FUNCTION public.can_manage_inventory_purchases() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(auth.uid()) AND CASE
    WHEN EXISTS (SELECT 1 FROM public.staff_module_permissions WHERE user_id = auth.uid())
      THEN EXISTS (SELECT 1 FROM public.staff_module_permissions WHERE user_id = auth.uid() AND module = 'inventory_purchases' AND enabled)
    ELSE public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'almacen') AND NOT public.has_role(auth.uid(), 'ventas'))
  END;
$$;
REVOKE ALL ON FUNCTION public.can_manage_inventory_purchases() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_inventory_purchases() TO authenticated;

ALTER POLICY "Staff read inventory purchases" ON public.inventory_purchases USING (public.can_manage_inventory_purchases());
ALTER POLICY "Staff create inventory purchases" ON public.inventory_purchases WITH CHECK (public.can_manage_inventory_purchases() AND created_by = auth.uid() AND stocked_at IS NULL AND warehouse_id IS NULL);
ALTER POLICY "Staff read purchase files" ON storage.objects USING (bucket_id = 'purchase-files' AND public.can_manage_inventory_purchases());
ALTER POLICY "Staff upload purchase files" ON storage.objects WITH CHECK (bucket_id = 'purchase-files' AND public.can_manage_inventory_purchases() AND (storage.foldername(name))[1] = auth.uid()::text);

-- Gate the existing atomic stock operation, and disallow calling its implementation directly.
ALTER FUNCTION public.stock_inventory_purchase(uuid, uuid, jsonb) RENAME TO stock_inventory_purchase_internal;
REVOKE ALL ON FUNCTION public.stock_inventory_purchase_internal(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.stock_inventory_purchase(_id uuid, _warehouse_id uuid, _mappings jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_inventory_purchases() THEN
    RAISE EXCEPTION 'No tienes permiso para usar Compras y proveedores';
  END IF;
  PERFORM public.stock_inventory_purchase_internal(_id, _warehouse_id, _mappings);
END;
$$;
REVOKE ALL ON FUNCTION public.stock_inventory_purchase(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stock_inventory_purchase(uuid, uuid, jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
