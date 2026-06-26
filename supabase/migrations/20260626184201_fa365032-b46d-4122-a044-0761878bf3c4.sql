-- Customers
INSERT INTO public.customers(full_name, email, phone, location, source) VALUES
  ('Lucía Ramírez', 'lucia@example.com', '+51 999 111 222', 'Lima · Miraflores', 'instagram'),
  ('Mariana Vega',  'mariana@example.com','+51 988 333 444','Lima · San Isidro','feria'),
  ('Camila Torres', 'camila@example.com', '+51 977 555 666','Lima · Barranco', 'web')
ON CONFLICT DO NOTHING;

-- Leads
INSERT INTO public.leads(full_name, email, phone, location, source, interest, message) VALUES
  ('Ana Quispe', 'ana@example.com', '+51 944 100 200', 'Arequipa', 'web', 'Tapices a medida', 'Hola, ¿hacen tapices por encargo de 1.20m?'),
  ('Daniela Cruz', 'daniela@example.com', '+51 955 700 800', 'Lima', 'web', 'Talleres', 'Quisiera saber el cronograma de talleres iniciales.')
ON CONFLICT DO NOTHING;

-- Inicializar stock en los 3 almacenes para los productos sembrados
WITH p AS (SELECT id, type FROM products), w AS (SELECT id, code FROM warehouses)
INSERT INTO public.inventory_stock(product_id, warehouse_id, quantity)
SELECT p.id, w.id,
  CASE WHEN p.type = 'material' THEN 100
       WHEN w.code = 'SA' THEN 8
       WHEN w.code = 'PL' THEN 5
       ELSE 3 END
FROM p, w
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- Una venta demo confirmada con comprobante
DO $$
DECLARE
  _sale_id uuid;
  _customer_id uuid;
  _warehouse_id uuid;
  _product_id uuid;
  _num int; _number text;
BEGIN
  SELECT id INTO _customer_id FROM public.customers WHERE email='lucia@example.com';
  SELECT id INTO _warehouse_id FROM public.warehouses WHERE code='SA';
  SELECT id INTO _product_id FROM public.products WHERE slug='tapiz-luna-blanca';

  IF _customer_id IS NULL OR _warehouse_id IS NULL OR _product_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.sales WHERE customer_id=_customer_id AND status='confirmada') THEN RETURN; END IF;

  INSERT INTO public.sales(customer_id, warehouse_id, notes, status, confirmed_at)
  VALUES (_customer_id, _warehouse_id, '[Instagram] Pedido vía DM', 'confirmada', now())
  RETURNING id INTO _sale_id;

  INSERT INTO public.sale_items(sale_id, product_id, quantity, unit_price, subtotal)
  VALUES (_sale_id, _product_id, 1, 180, 180);

  INSERT INTO public.sale_payments(sale_id, method, amount) VALUES (_sale_id, 'yape', 180);

  -- descuento de stock
  UPDATE public.inventory_stock SET quantity = quantity - 1 WHERE product_id=_product_id AND warehouse_id=_warehouse_id;
  INSERT INTO public.inventory_movements(product_id, warehouse_id, movement_type, quantity, reason)
  VALUES (_product_id, _warehouse_id, 'venta', 1, 'Venta '||_sale_id::text);

  SELECT COALESCE(MAX( (regexp_replace(number,'^MKR-','') )::int ), 0) + 1 INTO _num FROM public.receipts;
  _number := 'MKR-' || lpad(_num::text, 6, '0');
  INSERT INTO public.receipts(sale_id, number) VALUES (_sale_id, _number);
END $$;