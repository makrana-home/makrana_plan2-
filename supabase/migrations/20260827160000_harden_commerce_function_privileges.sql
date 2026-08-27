BEGIN;

-- Inventory movements are invoked directly by authenticated staff RPCs and by
-- trusted backend workflows. Remove inherited/public access explicitly.
REVOKE ALL ON FUNCTION public.apply_inventory_movement(
  uuid, public.movement_type, numeric, uuid, uuid, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_inventory_movement(
  uuid, public.movement_type, numeric, uuid, uuid, text, text, uuid
) TO authenticated, service_role;

-- This function is only an implementation detail of its trigger. PostgreSQL
-- executes the trigger as the function owner; API roles need no direct access.
REVOKE ALL ON FUNCTION public.guard_paid_sale_confirmation()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
