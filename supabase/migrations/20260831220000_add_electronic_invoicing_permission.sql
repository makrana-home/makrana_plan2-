BEGIN;

ALTER TABLE public.staff_module_permissions
  DROP CONSTRAINT IF EXISTS staff_module_permissions_module_check;

ALTER TABLE public.staff_module_permissions
  ADD CONSTRAINT staff_module_permissions_module_check CHECK (module IN (
    'dashboard', 'products', 'materials', 'warehouses', 'inventory_movements',
    'manual', 'calendar', 'sales', 'web_orders', 'customers', 'reports',
    'tax_overview', 'receipts', 'tax_purchases', 'sire',
    'electronic_invoicing', 'web_home', 'news', 'workshops'
  ));

COMMIT;
NOTIFY pgrst, 'reload schema';
