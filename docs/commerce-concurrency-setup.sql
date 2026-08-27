\set ON_ERROR_STOP on
INSERT INTO public.warehouses(id,name,code,is_active)
VALUES('11000000-0000-4000-8000-000000000001','Concurrencia local','CONCURRENCY',true)
ON CONFLICT(id) DO NOTHING;
UPDATE public.commerce_settings
SET default_web_warehouse_id='11000000-0000-4000-8000-000000000001',reservation_minutes=30;
INSERT INTO public.products(id,type,slug,name,price,status,is_visible,is_featured)
VALUES('21000000-0000-4000-8000-000000000001','producto_terminado','concurrency-product','Última unidad',30,'disponible',true,false)
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.inventory_stock(product_id,warehouse_id,quantity)
VALUES('21000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001',1)
ON CONFLICT(product_id,warehouse_id) WHERE presentation_id IS NULL
DO UPDATE SET quantity=excluded.quantity;
