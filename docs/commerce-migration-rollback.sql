-- SOLO PARA ENTORNO LOCAL DESECHABLE SIN OPERACIONES REALES.
BEGIN;
DROP FUNCTION IF EXISTS public.release_expired_inventory_reservations();
DROP FUNCTION IF EXISTS public.create_checkout_order(jsonb);
DROP FUNCTION IF EXISTS public.review_manual_payment(uuid,boolean,text,inet);
DROP FUNCTION IF EXISTS public.replace_delivery_zone_districts(uuid,text[]);
ALTER TABLE public.sales DROP COLUMN IF EXISTS order_id;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.sales WHERE warehouse_id IS NULL) THEN
    RAISE EXCEPTION 'No se puede restaurar NOT NULL: existen ventas digitales sin almacén';
  END IF;
  ALTER TABLE public.sales ALTER COLUMN warehouse_id SET NOT NULL;
END $$;
DROP TABLE IF EXISTS public.commerce_audit_logs,public.payment_events,public.payment_attempts,
  public.payments,public.inventory_reservations,public.order_addresses,public.order_items,
  public.orders,public.delivery_methods,public.delivery_zone_districts,public.delivery_zones,public.commerce_settings;
DROP FUNCTION IF EXISTS public.normalize_delivery_place(text);
DROP TYPE IF EXISTS public.payment_attempt_status,public.commerce_payment_status,
  public.inventory_reservation_status,public.delivery_coordination_status,public.delivery_kind,public.receipt_type,
  public.order_item_type,public.order_status;
DROP SEQUENCE IF EXISTS public.order_code_seq;
COMMIT;
