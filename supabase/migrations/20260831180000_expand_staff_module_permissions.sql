BEGIN;

ALTER TABLE public.staff_module_permissions DROP CONSTRAINT IF EXISTS staff_module_permissions_module_check;

WITH legacy_map(old_module, new_module) AS (VALUES
  ('inventory', 'products'), ('inventory', 'materials'),
  ('stock', 'warehouses'), ('stock', 'inventory_movements'),
  ('manual', 'manual'), ('calendar', 'calendar'),
  ('sales', 'sales'), ('sales', 'web_orders'),
  ('customers', 'customers'), ('reports', 'reports'),
  ('tax', 'tax_overview'), ('tax', 'receipts'), ('tax', 'tax_purchases'), ('tax', 'sire')
)
INSERT INTO public.staff_module_permissions (user_id, module, enabled, updated_at)
SELECT permission.user_id, legacy_map.new_module, permission.enabled, now()
FROM public.staff_module_permissions AS permission
JOIN legacy_map ON legacy_map.old_module = permission.module
ON CONFLICT (user_id, module) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = EXCLUDED.updated_at;

INSERT INTO public.staff_module_permissions (user_id, module, enabled, updated_at)
SELECT roles.user_id, web_module.module, true, now()
FROM public.user_roles AS roles
CROSS JOIN (VALUES ('web_home'), ('news'), ('workshops')) AS web_module(module)
WHERE roles.role = 'admin' AND EXISTS (
  SELECT 1 FROM public.staff_module_permissions configured WHERE configured.user_id = roles.user_id
)
ON CONFLICT (user_id, module) DO NOTHING;

DELETE FROM public.staff_module_permissions WHERE module IN ('inventory', 'stock', 'tax');

ALTER TABLE public.staff_module_permissions ADD CONSTRAINT staff_module_permissions_module_check CHECK (module IN (
  'products', 'materials', 'warehouses', 'inventory_movements', 'manual', 'calendar',
  'sales', 'web_orders', 'customers', 'reports', 'tax_overview', 'receipts',
  'tax_purchases', 'sire', 'web_home', 'news', 'workshops'
));

COMMIT;
NOTIFY pgrst, 'reload schema';
