BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_module_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN (
    'inventory', 'manual', 'calendar', 'sales', 'customers', 'stock', 'reports'
  )),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module)
);

GRANT SELECT ON public.staff_module_permissions TO authenticated;
GRANT ALL ON public.staff_module_permissions TO service_role;
ALTER TABLE public.staff_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own module permissions"
  ON public.staff_module_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

COMMIT;

NOTIFY pgrst, 'reload schema';
