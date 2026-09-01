BEGIN;

ALTER TABLE public.staff_module_permissions DROP CONSTRAINT IF EXISTS staff_module_permissions_module_check;

INSERT INTO public.staff_module_permissions (user_id, module, enabled, updated_at)
SELECT roles.user_id, 'dashboard', true, now()
FROM public.user_roles AS roles
WHERE roles.role IN ('admin', 'ventas')
  AND EXISTS (
    SELECT 1 FROM public.staff_module_permissions configured WHERE configured.user_id = roles.user_id
  )
ON CONFLICT (user_id, module) DO NOTHING;

ALTER TABLE public.staff_module_permissions ADD CONSTRAINT staff_module_permissions_module_check CHECK (module IN (
  'dashboard', 'products', 'materials', 'warehouses', 'inventory_movements', 'manual', 'calendar',
  'sales', 'web_orders', 'customers', 'reports', 'tax_overview', 'receipts',
  'tax_purchases', 'sire', 'web_home', 'news', 'workshops'
));

COMMIT;
NOTIFY pgrst, 'reload schema';
