BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.order_status AS ENUM ('draft','pending_payment','payment_under_review','paid','processing','ready_for_pickup','shipped','delivered','cancelled','expired','refunded','partially_refunded','payment_failed');
CREATE TYPE public.order_item_type AS ENUM ('product','material','kit','course','workshop');
CREATE TYPE public.receipt_type AS ENUM ('receipt','invoice');
CREATE TYPE public.delivery_kind AS ENUM ('pickup','lima_delivery');
CREATE TYPE public.delivery_coordination_status AS ENUM ('pending_coordination','contacted','scheduled','dispatched','delivered','pickup_ready','picked_up','cancelled');
CREATE TYPE public.inventory_reservation_status AS ENUM ('active','consumed','released','expired');
CREATE TYPE public.commerce_payment_status AS ENUM ('created','pending','under_review','approved','rejected','cancelled','expired','refunded','partially_refunded','unknown');
CREATE TYPE public.payment_attempt_status AS ENUM ('created','pending','under_review','approved','rejected','cancelled','expired','failed');
CREATE SEQUENCE public.order_code_seq START 1;

CREATE TABLE public.commerce_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  reservation_minutes integer NOT NULL DEFAULT 30 CHECK (reservation_minutes BETWEEN 5 AND 1440),
  order_expiration_minutes integer NOT NULL DEFAULT 30 CHECK (order_expiration_minutes BETWEEN 5 AND 10080),
  default_web_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  pickup_enabled boolean NOT NULL DEFAULT true,
  lima_delivery_enabled boolean NOT NULL DEFAULT true,
  izipay_easypay_public_url text,
  pickup_instructions text,
  pending_payment_message text NOT NULL DEFAULT 'Estamos verificando tu pago.',
  whatsapp_coordination_enabled boolean NOT NULL DEFAULT true,
  whatsapp_coordination_number text,
  whatsapp_coordination_message text NOT NULL DEFAULT 'Hola, Makrana. Quiero coordinar la entrega de mi pedido [CODIGO]. Mi nombre es [NOMBRE] y seleccioné [ENTREGA].',
  whatsapp_service_instructions text,
  whatsapp_service_hours text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (izipay_easypay_public_url IS NULL OR izipay_easypay_public_url ~ '^https://')
  ,CHECK (whatsapp_coordination_number IS NULL OR whatsapp_coordination_number ~ '^[1-9][0-9]{7,14}$')
);
INSERT INTO public.commerce_settings(id) VALUES (true);

CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'lima_metropolitana' CHECK (scope IN ('lima_metropolitana','future_national')),
  districts text[] NOT NULL DEFAULT '{}',
  base_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_fee >= 0),
  estimated_time text,
  notes text,
  requires_coordination boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(code)) > 0 AND length(trim(name)) > 0),
  CHECK (requires_coordination OR base_fee >= 10)
);

CREATE OR REPLACE FUNCTION public.normalize_delivery_place(value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT trim(regexp_replace(translate(lower(coalesce(value,'')),
    'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '\s+', ' ', 'g'))
$$;

CREATE TABLE public.delivery_zone_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_zone_id uuid NOT NULL REFERENCES public.delivery_zones(id) ON DELETE RESTRICT,
  department text NOT NULL DEFAULT 'Lima',
  province text NOT NULL DEFAULT 'Lima',
  district text NOT NULL,
  normalized_district text GENERATED ALWAYS AS (public.normalize_delivery_place(district)) STORED,
  ubigeo text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(department)) >= 2 AND length(trim(province)) >= 2 AND length(trim(district)) >= 2),
  CHECK (ubigeo IS NULL OR ubigeo ~ '^[0-9]{6}$')
);
CREATE UNIQUE INDEX delivery_zone_districts_one_active_name
  ON public.delivery_zone_districts(
    public.normalize_delivery_place(department),
    public.normalize_delivery_place(province),
    normalized_district
  ) WHERE is_active;
CREATE UNIQUE INDEX delivery_zone_districts_one_active_ubigeo
  ON public.delivery_zone_districts(ubigeo) WHERE is_active AND ubigeo IS NOT NULL;
CREATE INDEX delivery_zone_districts_zone_idx
  ON public.delivery_zone_districts(delivery_zone_id,is_active,normalized_district);

CREATE OR REPLACE FUNCTION public.replace_delivery_zone_districts(_zone_id uuid,_districts text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE district_name text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('delivery-districts',0));
  UPDATE public.delivery_zone_districts SET is_active=false
    WHERE delivery_zone_id=_zone_id AND is_active;
  FOREACH district_name IN ARRAY coalesce(_districts,'{}'::text[]) LOOP
    INSERT INTO public.delivery_zone_districts(delivery_zone_id,department,province,district)
    VALUES(_zone_id,'Lima','Lima',trim(district_name));
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.replace_delivery_zone_districts(uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_delivery_zone_districts(uuid,text[]) TO authenticated;

CREATE TABLE public.delivery_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  kind public.delivery_kind NOT NULL,
  zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE RESTRICT,
  fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(code)) > 0 AND length(trim(name)) > 0),
  CHECK ((kind = 'pickup' AND zone_id IS NULL) OR (kind = 'lima_delivery' AND zone_id IS NOT NULL))
);

INSERT INTO public.delivery_zones(code,name,scope,base_fee,is_active) VALUES
  ('lima-metropolitana','Lima Metropolitana','lima_metropolitana',10,true);
INSERT INTO public.delivery_methods(code,name,kind,zone_id,fee,instructions,is_active)
SELECT 'recojo-coordinado','Recojo coordinado','pickup'::public.delivery_kind,NULL,0,'Coordinaremos contigo el lugar y horario de recojo.',true
UNION ALL
SELECT 'envio-lima','Envío en Lima Metropolitana','lima_delivery'::public.delivery_kind,id,base_fee,'La fecha de entrega se coordina después de confirmar el pago.',true
FROM public.delivery_zones WHERE code='lima-metropolitana';

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  checkout_key uuid NOT NULL UNIQUE,
  cart_fingerprint text NOT NULL,
  access_token_hash text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  document_type text,
  document_number text,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  currency char(3) NOT NULL DEFAULT 'PEN' CHECK (currency = 'PEN'),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  discount_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  shipping_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_total >= 0),
  tax_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  receipt_type public.receipt_type NOT NULL DEFAULT 'receipt',
  billing_ruc text,
  billing_legal_name text,
  billing_fiscal_address text,
  delivery_method_id uuid REFERENCES public.delivery_methods(id) ON DELETE RESTRICT,
  delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE RESTRICT,
  delivery_zone_district_id uuid REFERENCES public.delivery_zone_districts(id) ON DELETE RESTRICT,
  delivery_zone_name_snapshot text,
  delivery_method_snapshot text NOT NULL,
  delivery_district_snapshot text,
  delivery_fee_cents integer NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  delivery_coordination_status public.delivery_coordination_status,
  delivery_scheduled_at timestamptz,
  delivery_time_window text,
  delivery_notes text,
  delivery_responsible text,
  delivery_contacted_at timestamptz,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  reservation_minutes integer NOT NULL CHECK (reservation_minutes BETWEEN 5 AND 1440),
  expires_at timestamptz NOT NULL,
  terms_accepted_at timestamptz NOT NULL,
  privacy_accepted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(code)) > 0 AND length(trim(cart_fingerprint)) > 0),
  CHECK (total = round(subtotal - discount_total + shipping_total, 2)),
  CHECK (shipping_total = delivery_fee_cents::numeric / 100),
  CHECK (expires_at > created_at),
  CHECK (receipt_type <> 'invoice' OR (billing_ruc ~ '^[0-9]{11}$' AND length(trim(billing_legal_name)) >= 2 AND length(trim(billing_fiscal_address)) >= 5))
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  line_number integer NOT NULL CHECK (line_number > 0),
  item_type public.order_item_type NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  presentation_id uuid REFERENCES public.material_presentations(id) ON DELETE RESTRICT,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE RESTRICT,
  related_course_item_id uuid REFERENCES public.order_items(id) ON DELETE RESTRICT,
  name_snapshot text NOT NULL,
  sku_snapshot text,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  requires_inventory boolean NOT NULL DEFAULT false,
  kit_mode text CHECK (kit_mode IS NULL OR kit_mode IN ('optional','required_included','required_separate')),
  variant jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,line_number),
  CHECK (subtotal = round(quantity * unit_price - discount, 2)),
  CHECK ((item_type = 'workshop' AND workshop_id IS NOT NULL AND product_id IS NULL) OR (item_type <> 'workshop' AND product_id IS NOT NULL))
);

CREATE TABLE public.order_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('shipping','billing')),
  recipient_name text NOT NULL,
  document_number text,
  phone text,
  address_line text NOT NULL,
  department text NOT NULL,
  province text NOT NULL,
  district text NOT NULL,
  reference text,
  additional_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,kind)
);

CREATE TABLE public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  presentation_id uuid REFERENCES public.material_presentations(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  status public.inventory_reservation_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK ((status <> 'consumed' OR consumed_at IS NOT NULL) AND (status NOT IN ('released','expired') OR released_at IS NOT NULL))
);
CREATE UNIQUE INDEX inventory_reservations_one_live_per_item ON public.inventory_reservations(order_item_id) WHERE status IN ('active','consumed');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'izipay_easypay' CHECK (provider IN ('manual','izipay_easypay')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'PEN' CHECK (currency = 'PEN'),
  status public.commerce_payment_status NOT NULL DEFAULT 'created',
  reference text,
  provider_payment_id text,
  evidence_path text,
  rejection_reason text,
  confirmed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  sanitized_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_provider_external_unique ON public.payments(provider,provider_payment_id) WHERE provider_payment_id IS NOT NULL;

CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  idempotency_key uuid NOT NULL UNIQUE,
  status public.payment_attempt_status NOT NULL DEFAULT 'created',
  external_url text,
  expires_at timestamptz,
  sanitized_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id,attempt_number)
);

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  payment_attempt_id uuid REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_valid boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,provider_event_id)
);

CREATE TABLE public.commerce_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  reason text,
  ip_address inet,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT;
-- Las ventas exclusivamente digitales no requieren almacén. Las ventas físicas siguen
-- recibiendo el almacén web configurado.
ALTER TABLE public.sales ALTER COLUMN warehouse_id DROP NOT NULL;
CREATE UNIQUE INDEX sales_order_id_unique ON public.sales(order_id) WHERE order_id IS NOT NULL;

CREATE INDEX orders_user_created_idx ON public.orders(user_id,created_at DESC);
CREATE INDEX orders_customer_created_idx ON public.orders(customer_id,created_at DESC);
CREATE INDEX orders_status_expiry_idx ON public.orders(status,expires_at);
CREATE INDEX orders_delivery_zone_idx ON public.orders(delivery_zone_id,created_at DESC);
CREATE INDEX orders_delivery_coordination_idx ON public.orders(delivery_coordination_status,delivery_scheduled_at);
CREATE INDEX delivery_zones_districts_idx ON public.delivery_zones USING gin(districts);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
CREATE INDEX reservations_stock_idx ON public.inventory_reservations(product_id,warehouse_id,presentation_id,status,expires_at);
CREATE INDEX reservations_order_idx ON public.inventory_reservations(order_id,status);
CREATE INDEX payments_order_status_idx ON public.payments(order_id,status);
CREATE INDEX payment_events_pending_idx ON public.payment_events(created_at) WHERE processed_at IS NULL;

CREATE TRIGGER commerce_settings_updated BEFORE UPDATE ON public.commerce_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER delivery_zones_updated BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER delivery_zone_districts_updated BEFORE UPDATE ON public.delivery_zone_districts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER delivery_methods_updated BEFORE UPDATE ON public.delivery_methods FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER payment_attempts_updated BEFORE UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.create_checkout_order(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  cfg public.commerce_settings%ROWTYPE;
  method public.delivery_methods%ROWTYPE;
  zone public.delivery_zones%ROWTYPE;
  zone_district public.delivery_zone_districts%ROWTYPE;
  existing public.orders%ROWTYPE;
  ord public.orders%ROWTYPE;
  item jsonb;
  product public.products%ROWTYPE;
  presentation public.material_presentations%ROWTYPE;
  stock_qty numeric;
  reserved_qty numeric;
  qty numeric;
  unit_price numeric;
  item_subtotal numeric;
  subtotal numeric := 0;
  shipping numeric := 0;
  line_no integer := 0;
  order_item_id uuid;
  payment_id uuid;
  raw_token text := encode(extensions.gen_random_bytes(32),'hex');
  fingerprint text := encode(extensions.digest(coalesce(_payload->>'cart_fingerprint',''),'sha256'),'hex');
  requested_user uuid;
  has_physical boolean := false;
BEGIN
  PERFORM public.release_expired_inventory_reservations();
  SELECT * INTO cfg FROM public.commerce_settings WHERE id=true;
  IF cfg.id IS NULL THEN RAISE EXCEPTION 'Configuración comercial inexistente'; END IF;
  IF cfg.reservation_minutes NOT BETWEEN 5 AND 1440 THEN cfg.reservation_minutes := 30; END IF;
  IF jsonb_array_length(coalesce(_payload->'items','[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'El carrito está vacío'; END IF;
  IF coalesce(_payload->>'checkout_key','') !~ '^[0-9a-fA-F-]{36}$' THEN RAISE EXCEPTION 'checkout_key inválida'; END IF;
  SELECT * INTO existing FROM public.orders WHERE checkout_key=(_payload->>'checkout_key')::uuid;
  IF existing.id IS NOT NULL THEN
    IF existing.cart_fingerprint <> fingerprint THEN RAISE EXCEPTION 'La clave de checkout ya fue usada con otro carrito'; END IF;
    RETURN jsonb_build_object('id',existing.id,'code',existing.code,'access_token',NULL,'reused',true);
  END IF;
  IF auth.uid() IS NOT NULL THEN requested_user := auth.uid();
  ELSIF nullif(_payload->>'verified_user_id','') IS NOT NULL THEN requested_user := (_payload->>'verified_user_id')::uuid;
  END IF;
  SELECT * INTO method FROM public.delivery_methods WHERE id=(_payload->>'delivery_method_id')::uuid AND is_active;
  IF method.id IS NULL THEN RAISE EXCEPTION 'Método de entrega no disponible'; END IF;
  IF method.kind='pickup' AND NOT cfg.pickup_enabled THEN RAISE EXCEPTION 'El recojo está deshabilitado'; END IF;
  IF method.kind='lima_delivery' AND NOT cfg.lima_delivery_enabled THEN RAISE EXCEPTION 'Los envíos en Lima están deshabilitados'; END IF;
  shipping := 0;

  FOR item IN SELECT value FROM jsonb_array_elements(_payload->'items') LOOP
    qty := (item->>'quantity')::numeric;
    IF qty <= 0 OR qty > 100 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO product FROM public.products WHERE id=(item->>'product_id')::uuid AND is_visible=true AND status IN ('disponible','por_encargo');
    IF product.id IS NULL THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
    IF item ? 'presentation_id' AND nullif(item->>'presentation_id','') IS NOT NULL THEN
      SELECT * INTO presentation FROM public.material_presentations WHERE id=(item->>'presentation_id')::uuid AND product_id=product.id;
      IF presentation.id IS NULL THEN RAISE EXCEPTION 'Presentación no disponible'; END IF;
      unit_price := presentation.price;
    ELSE
      presentation.id := NULL;
      unit_price := product.price;
    END IF;
    item_subtotal := round(qty*unit_price,2);
    subtotal := subtotal + item_subtotal;
    IF product.type <> 'curso' THEN has_physical := true; END IF;
  END LOOP;

  IF has_physical THEN
    IF cfg.default_web_warehouse_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=cfg.default_web_warehouse_id AND is_active) THEN
      RAISE EXCEPTION 'El checkout físico está temporalmente deshabilitado: configura un almacén web activo';
    END IF;
  END IF;
  IF NOT has_physical OR method.kind='pickup' THEN
    shipping := 0;
  ELSE
    IF (_payload->'shipping_address') IS NULL THEN RAISE EXCEPTION 'La dirección de envío es obligatoria'; END IF;
    SELECT d.* INTO zone_district FROM public.delivery_zone_districts d
      JOIN public.delivery_zones z ON z.id=d.delivery_zone_id
      WHERE d.id=nullif(_payload->>'delivery_zone_district_id','')::uuid
        AND d.is_active AND z.is_active AND NOT z.requires_coordination;
    IF zone_district.id IS NULL THEN RAISE EXCEPTION 'La tarifa para esta zona requiere confirmación. Contáctanos por WhatsApp'; END IF;
    SELECT * INTO zone FROM public.delivery_zones WHERE id=zone_district.delivery_zone_id AND is_active;
    IF zone.base_fee < 10 THEN RAISE EXCEPTION 'La tarifa de envío configurada no puede ser inferior a S/10'; END IF;
    shipping := zone.base_fee;
  END IF;
  IF (_payload->>'receipt_type')='invoice' AND NOT (coalesce(_payload->>'billing_ruc','') ~ '^[0-9]{11}$' AND length(trim(coalesce(_payload->>'billing_legal_name','')))>=2 AND length(trim(coalesce(_payload->>'billing_fiscal_address','')))>=5) THEN
    RAISE EXCEPTION 'Completa RUC, razón social y domicilio fiscal';
  END IF;
  IF has_physical AND method.kind='lima_delivery' AND (_payload->'shipping_address') IS NULL THEN RAISE EXCEPTION 'La dirección de envío es obligatoria'; END IF;

  INSERT INTO public.orders(code,checkout_key,cart_fingerprint,access_token_hash,user_id,first_name,last_name,email,phone,document_type,document_number,subtotal,shipping_total,total,receipt_type,billing_ruc,billing_legal_name,billing_fiscal_address,delivery_method_id,delivery_zone_id,delivery_zone_district_id,delivery_zone_name_snapshot,delivery_method_snapshot,delivery_district_snapshot,delivery_fee_cents,delivery_coordination_status,warehouse_id,reservation_minutes,expires_at,terms_accepted_at,privacy_accepted_at)
  VALUES ('MKR-W-'||lpad(nextval('public.order_code_seq')::text,8,'0'),(_payload->>'checkout_key')::uuid,fingerprint,encode(extensions.digest(raw_token,'sha256'),'hex'),requested_user,trim(_payload->>'first_name'),trim(_payload->>'last_name'),lower(trim(_payload->>'email')),trim(_payload->>'phone'),nullif(_payload->>'document_type',''),nullif(_payload->>'document_number',''),subtotal,shipping,round(subtotal+shipping,2),coalesce((_payload->>'receipt_type')::public.receipt_type,'receipt'),nullif(_payload->>'billing_ruc',''),nullif(_payload->>'billing_legal_name',''),nullif(_payload->>'billing_fiscal_address',''),method.id,zone.id,zone_district.id,zone.name,CASE WHEN has_physical THEN method.name ELSE 'Entrega digital' END,CASE WHEN has_physical AND method.kind='lima_delivery' THEN zone_district.district END,round(shipping*100)::integer,CASE WHEN has_physical THEN 'pending_coordination'::public.delivery_coordination_status END,CASE WHEN has_physical THEN cfg.default_web_warehouse_id ELSE NULL END,cfg.reservation_minutes,now()+make_interval(mins=>least(cfg.order_expiration_minutes,cfg.reservation_minutes)),now(),now())
  RETURNING * INTO ord;

  IF has_physical AND method.kind='lima_delivery' THEN
    INSERT INTO public.order_addresses(order_id,kind,recipient_name,document_number,phone,address_line,department,province,district,reference,additional_instructions)
    VALUES(ord.id,'shipping',coalesce(nullif(trim(_payload#>>'{shipping_address,recipient_name}'),''),trim(_payload->>'first_name')||' '||trim(_payload->>'last_name')),nullif(_payload->>'document_number',''),coalesce(nullif(trim(_payload#>>'{shipping_address,phone}'),''),trim(_payload->>'phone')),trim(_payload#>>'{shipping_address,address_line}'),zone_district.department,zone_district.province,zone_district.district,nullif(_payload#>>'{shipping_address,reference}',''),nullif(_payload#>>'{shipping_address,additional_instructions}',''));
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(_payload->'items') LOOP
    line_no := line_no+1; qty := (item->>'quantity')::numeric;
    SELECT * INTO product FROM public.products WHERE id=(item->>'product_id')::uuid;
    IF item ? 'presentation_id' AND nullif(item->>'presentation_id','') IS NOT NULL THEN
      SELECT * INTO presentation FROM public.material_presentations WHERE id=(item->>'presentation_id')::uuid;
      unit_price := presentation.price;
    ELSE presentation.id := NULL; unit_price := product.price; END IF;
    item_subtotal := round(qty*unit_price,2);
    INSERT INTO public.order_items(order_id,line_number,item_type,product_id,presentation_id,name_snapshot,sku_snapshot,quantity,unit_price,subtotal,requires_inventory,variant)
    VALUES(ord.id,line_no,CASE product.type WHEN 'material' THEN 'material'::public.order_item_type WHEN 'kit' THEN 'kit'::public.order_item_type WHEN 'curso' THEN 'course'::public.order_item_type ELSE 'product'::public.order_item_type END,product.id,presentation.id,product.name,coalesce(presentation.sku,product.sku),qty,unit_price,item_subtotal,product.type<>'curso',jsonb_build_object('presentation_label',presentation.label)) RETURNING id INTO order_item_id;
    IF product.type<>'curso' THEN
      -- Serialize reservations per stock row so concurrent checkouts cannot oversell.
      PERFORM 1 FROM public.inventory_stock
      WHERE product_id=product.id AND warehouse_id=cfg.default_web_warehouse_id
        AND (presentation.id IS NULL OR presentation_id=presentation.id)
      FOR UPDATE;
      SELECT coalesce(sum(quantity),0) INTO stock_qty FROM public.inventory_stock WHERE product_id=product.id AND warehouse_id=cfg.default_web_warehouse_id AND (presentation.id IS NULL OR presentation_id=presentation.id);
      SELECT coalesce(sum(quantity),0) INTO reserved_qty FROM public.inventory_reservations WHERE product_id=product.id AND warehouse_id=cfg.default_web_warehouse_id AND status='active' AND expires_at>now() AND (presentation.id IS NULL OR presentation_id=presentation.id);
      IF stock_qty-reserved_qty < qty THEN RAISE EXCEPTION 'Stock insuficiente para %',product.name; END IF;
      INSERT INTO public.inventory_reservations(order_id,order_item_id,product_id,presentation_id,warehouse_id,quantity,expires_at)
      VALUES(ord.id,order_item_id,product.id,presentation.id,cfg.default_web_warehouse_id,qty,ord.expires_at);
    END IF;
  END LOOP;

  INSERT INTO public.payments(order_id,provider,amount,status) VALUES(ord.id,'izipay_easypay',ord.total,'pending') RETURNING id INTO payment_id;
  INSERT INTO public.payment_attempts(payment_id,attempt_number,idempotency_key,status,external_url,expires_at)
  VALUES(payment_id,1,gen_random_uuid(),'pending',cfg.izipay_easypay_public_url,ord.expires_at);
  RETURN jsonb_build_object('id',ord.id,'code',ord.code,'access_token',raw_token,'payment_id',payment_id,'payment_url',cfg.izipay_easypay_public_url,'expires_at',ord.expires_at,'total',ord.total,'reused',false);
END $$;
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.review_manual_payment(_payment_id uuid,_approve boolean,_reason text,_ip inet DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.payments%ROWTYPE; o public.orders%ROWTYPE; sale_id uuid; receipt_result record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(trim(coalesce(_reason,'')))<3 THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;
  SELECT * INTO p FROM public.payments WHERE id=_payment_id FOR UPDATE;
  SELECT * INTO o FROM public.orders WHERE id=p.order_id FOR UPDATE;
  IF p.id IS NULL OR o.id IS NULL THEN RAISE EXCEPTION 'Pago o pedido inexistente'; END IF;
  IF _approve AND p.status='approved' AND o.status='paid' THEN RETURN jsonb_build_object('order_id',o.id,'sale_id',(SELECT id FROM public.sales WHERE order_id=o.id),'reused',true); END IF;
  IF p.status NOT IN ('pending','under_review') OR o.status NOT IN ('pending_payment','payment_under_review') THEN RAISE EXCEPTION 'El pago ya fue procesado'; END IF;
  IF NOT _approve THEN
    UPDATE public.payments SET status='rejected',rejection_reason=_reason,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p.id;
    UPDATE public.orders SET status='payment_failed' WHERE id=o.id;
    UPDATE public.inventory_reservations SET status='released',released_at=now() WHERE order_id=o.id AND status='active';
    INSERT INTO public.payment_events(payment_id,provider,provider_event_id,event_type,is_valid,processed_at,sanitized_payload) VALUES(p.id,'manual',gen_random_uuid()::text,'manual_rejected',true,now(),jsonb_build_object('reason',_reason));
    INSERT INTO public.commerce_audit_logs(actor_user_id,action,aggregate_type,aggregate_id,reason,ip_address,before_data,after_data) VALUES(auth.uid(),'payment_rejected','payment',p.id,_reason,_ip,jsonb_build_object('status',p.status),jsonb_build_object('status','rejected'));
    RETURN jsonb_build_object('order_id',o.id,'approved',false);
  END IF;
  IF p.amount<>o.total OR p.currency<>o.currency THEN RAISE EXCEPTION 'Importe o moneda no coincide'; END IF;
  INSERT INTO public.customers(user_id,full_name,email,phone,document,source)
  VALUES(o.user_id,trim(o.first_name||' '||o.last_name),o.email,o.phone,o.document_number,'checkout-web')
  ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,document=excluded.document
  RETURNING id INTO o.customer_id;
  INSERT INTO public.sales(order_id,customer_id,warehouse_id,status,payment_status,delivery_status,subtotal,discount,total,notes,created_by)
  VALUES(o.id,o.customer_id,o.warehouse_id,'borrador','pagado','pendiente',o.subtotal,o.discount_total,o.total,'Pedido web '||o.code,auth.uid()) RETURNING id INTO sale_id;
  INSERT INTO public.sale_items(sale_id,product_id,presentation_id,description,quantity,unit_price,discount,subtotal,is_manual_item,manual_item_name,provisional_source)
  SELECT sale_id,CASE WHEN requires_inventory THEN product_id ELSE NULL END,CASE WHEN requires_inventory THEN presentation_id ELSE NULL END,name_snapshot,quantity,unit_price,discount,subtotal,NOT requires_inventory,CASE WHEN NOT requires_inventory THEN name_snapshot ELSE NULL END,CASE WHEN NOT requires_inventory THEN 'curso_digital' ELSE NULL END FROM public.order_items WHERE order_id=o.id;
  SELECT * INTO receipt_result FROM public.confirm_sale(sale_id) LIMIT 1;
  UPDATE public.inventory_reservations SET status='consumed',consumed_at=now() WHERE order_id=o.id AND status='active';
  UPDATE public.payments SET status='approved',confirmed_at=now(),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p.id;
  UPDATE public.orders SET status='paid',customer_id=o.customer_id WHERE id=o.id;
  INSERT INTO public.payment_events(payment_id,provider,provider_event_id,event_type,is_valid,processed_at,sanitized_payload) VALUES(p.id,'manual',gen_random_uuid()::text,'manual_approved',true,now(),jsonb_build_object('reason',_reason,'sale_id',sale_id));
  INSERT INTO public.commerce_audit_logs(actor_user_id,action,aggregate_type,aggregate_id,reason,ip_address,before_data,after_data) VALUES(auth.uid(),'payment_approved','payment',p.id,_reason,_ip,jsonb_build_object('status',p.status),jsonb_build_object('status','approved','sale_id',sale_id));
  RETURN jsonb_build_object('order_id',o.id,'sale_id',sale_id,'receipt_id',receipt_result.receipt_id,'reused',false);
END $$;
REVOKE ALL ON FUNCTION public.review_manual_payment(uuid,boolean,text,inet) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(uuid,boolean,text,inet) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.release_expired_inventory_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.inventory_reservations SET status='expired',released_at=now()
  WHERE status='active' AND expires_at <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.orders SET status='expired'
  WHERE status='pending_payment' AND expires_at <= now();
  RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.release_expired_inventory_reservations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_inventory_reservations() TO service_role;

ALTER TABLE public.commerce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zone_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage commerce settings" ON public.commerce_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read active delivery zones" ON public.delivery_zones FOR SELECT TO anon,authenticated USING (is_active);
CREATE POLICY "Admin read all delivery zones" ON public.delivery_zones FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin insert delivery zones" ON public.delivery_zones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update delivery zones" ON public.delivery_zones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read active delivery districts" ON public.delivery_zone_districts FOR SELECT TO anon,authenticated USING (is_active AND EXISTS(SELECT 1 FROM public.delivery_zones z WHERE z.id=delivery_zone_id AND z.is_active));
CREATE POLICY "Admin read all delivery districts" ON public.delivery_zone_districts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin insert delivery districts" ON public.delivery_zone_districts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update delivery districts" ON public.delivery_zone_districts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read active delivery methods" ON public.delivery_methods FOR SELECT TO anon,authenticated USING (is_active);
CREATE POLICY "Admin manage delivery methods" ON public.delivery_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY "Sales staff manage orders" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Customers read own order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE user_id=auth.uid()));
CREATE POLICY "Sales staff manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Customers read own addresses" ON public.order_addresses FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE user_id=auth.uid()));
CREATE POLICY "Sales staff manage addresses" ON public.order_addresses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Inventory staff read reservations" ON public.inventory_reservations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Customers read own payments" ON public.payments FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE user_id=auth.uid()));
CREATE POLICY "Sales staff manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Sales staff read attempts" ON public.payment_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Sales staff read events" ON public.payment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Admin read commerce audit" ON public.commerce_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

GRANT SELECT ON public.delivery_zones,public.delivery_zone_districts,public.delivery_methods TO anon,authenticated;
GRANT SELECT ON public.orders,public.order_items,public.order_addresses,public.payments TO authenticated;
GRANT SELECT,UPDATE ON public.commerce_settings TO authenticated;
GRANT INSERT,UPDATE ON public.delivery_zones TO authenticated;
GRANT INSERT,UPDATE ON public.delivery_zone_districts TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.delivery_methods TO authenticated;
GRANT SELECT ON public.inventory_reservations,public.payment_attempts,public.payment_events,public.commerce_audit_logs TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.orders,public.order_items,public.order_addresses,public.payments TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

INSERT INTO storage.buckets(id,name,public) VALUES ('payment-evidence','payment-evidence',false)
ON CONFLICT(id) DO UPDATE SET public=false;

COMMENT ON TABLE public.orders IS 'Intención de compra previa a pago y venta confirmada.';
COMMENT ON TABLE public.inventory_reservations IS 'Retenciones temporales; no descuentan stock físico.';
COMMENT ON TABLE public.payments IS 'Pago desacoplado de sale_payments; nunca almacena datos sensibles de tarjeta.';
COMMENT ON TABLE public.delivery_zone_districts IS 'Fuente canónica para resolver distritos y zonas; delivery_zones.districts queda solo como compatibilidad transitoria.';
COMMENT ON COLUMN public.delivery_zones.districts IS 'Compatibilidad transitoria. No usar para cotización ni checkout.';
COMMENT ON COLUMN public.orders.delivery_fee_cents IS 'Snapshot entero e inmutable de la tarifa de entrega al crear el pedido.';
COMMENT ON COLUMN public.sales.order_id IS 'Pedido origen; NULL para ventas históricas o administrativas.';

COMMIT;
