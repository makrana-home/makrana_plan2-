
-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'ventas', 'almacen', 'cliente');
CREATE TYPE public.product_type AS ENUM ('producto_terminado','material','kit','curso');
CREATE TYPE public.product_status AS ENUM ('disponible','por_encargo','agotado','reservado');
CREATE TYPE public.movement_type AS ENUM ('entrada','salida','transferencia','ajuste','venta','devolucion');
CREATE TYPE public.payment_method AS ENUM ('efectivo','yape','plin','transferencia','tarjeta','mixto','otro');
CREATE TYPE public.payment_status AS ENUM ('pendiente','parcial','pagado','anulado');
CREATE TYPE public.delivery_status AS ENUM ('pendiente','en_preparacion','entregado','enviado','cancelado');
CREATE TYPE public.sale_status AS ENUM ('borrador','confirmada','anulada');
CREATE TYPE public.news_status AS ENUM ('borrador','publicado','oculto');
CREATE TYPE public.news_category AS ENUM ('evento','feria','taller','curso_nuevo','producto_nuevo','historia','inspiracion','promocion');
CREATE TYPE public.workshop_status AS ENUM ('abierto','lleno','finalizado','cancelado');
CREATE TYPE public.workshop_modality AS ENUM ('presencial','virtual','hibrido');
CREATE TYPE public.workshop_level AS ENUM ('basico','intermedio','avanzado');
CREATE TYPE public.presentation_unit AS ENUM ('unidad','metro','rollo','madeja','paquete','docena','ciento','combo','otro');

-- =====================================================================
-- PROFILES
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- USER ROLES + has_role
-- =====================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','ventas','almacen'))
$$;

-- RLS profiles
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_staff(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- RLS user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Trigger: create profile + default cliente role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- CATEGORIES
-- =====================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'));

-- =====================================================================
-- WAREHOUSES
-- =====================================================================
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read warehouses" ON public.warehouses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin/Almacen manage warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'));

-- =====================================================================
-- PRODUCTS
-- =====================================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.product_type NOT NULL DEFAULT 'producto_terminado',
  sku TEXT UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  main_image_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost NUMERIC(10,2),
  status public.product_status NOT NULL DEFAULT 'disponible',
  measurements TEXT,
  color TEXT,
  material TEXT,
  artisan TEXT,
  supplier TEXT,
  min_stock NUMERIC(10,2) DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible products" ON public.products FOR SELECT TO anon, authenticated
  USING (is_visible = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage product images" ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'));

CREATE TABLE public.material_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit public.presentation_unit NOT NULL,
  label TEXT,
  price NUMERIC(10,2) NOT NULL,
  units_in_presentation NUMERIC(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.material_presentations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_presentations TO authenticated;
GRANT ALL ON public.material_presentations TO service_role;
ALTER TABLE public.material_presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read presentations" ON public.material_presentations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage presentations" ON public.material_presentations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen'));

-- =====================================================================
-- INVENTORY (stock per product+warehouse) and MOVEMENTS
-- =====================================================================
CREATE TABLE public.inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, warehouse_id)
);
GRANT SELECT ON public.inventory_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stock TO authenticated;
GRANT ALL ON public.inventory_stock TO service_role;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read stock" ON public.inventory_stock FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage stock" ON public.inventory_stock FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'almacen') OR public.has_role(auth.uid(),'ventas'));
CREATE TRIGGER inventory_stock_updated BEFORE UPDATE ON public.inventory_stock
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  warehouse_dest_id UUID REFERENCES public.warehouses(id),
  movement_type public.movement_type NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  reason TEXT,
  notes TEXT,
  related_sale_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read movements" ON public.inventory_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert movements" ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- CUSTOMERS + LEADS
-- =====================================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  location TEXT,
  interests TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Customer reads own" ON public.customers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  source TEXT,
  interest TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff manage leads" ON public.leads FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- =====================================================================
-- SALES + ITEMS + PAYMENTS + RECEIPTS
-- =====================================================================
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1;

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  status public.sale_status NOT NULL DEFAULT 'borrador',
  payment_status public.payment_status NOT NULL DEFAULT 'pendiente',
  delivery_status public.delivery_status NOT NULL DEFAULT 'pendiente',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sales" ON public.sales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Customer reads own sales" ON public.sales FOR SELECT TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE TRIGGER sales_updated BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  presentation_id UUID REFERENCES public.material_presentations(id),
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage sale items" ON public.sale_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Customer reads own sale items" ON public.sale_items FOR SELECT TO authenticated
  USING (sale_id IN (SELECT s.id FROM public.sales s JOIN public.customers c ON c.id=s.customer_id WHERE c.user_id = auth.uid()));

CREATE TABLE public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  operation_code TEXT,
  evidence_url TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage payments" ON public.sale_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Customer reads own payments" ON public.sale_payments FOR SELECT TO authenticated
  USING (sale_id IN (SELECT s.id FROM public.sales s JOIN public.customers c ON c.id=s.customer_id WHERE c.user_id = auth.uid()));

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE CASCADE,
  number TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage receipts" ON public.receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Customer reads own receipts" ON public.receipts FOR SELECT TO authenticated
  USING (sale_id IN (SELECT s.id FROM public.sales s JOIN public.customers c ON c.id=s.customer_id WHERE c.user_id = auth.uid()));

-- =====================================================================
-- NEWS POSTS
-- =====================================================================
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category public.news_category NOT NULL DEFAULT 'historia',
  cover_image_url TEXT,
  summary TEXT,
  content TEXT,
  status public.news_status NOT NULL DEFAULT 'borrador',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  cta_type TEXT,
  cta_url TEXT,
  related_product_id UUID REFERENCES public.products(id),
  related_workshop_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published news" ON public.news_posts FOR SELECT TO anon, authenticated
  USING (status = 'publicado' OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage news" ON public.news_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE TRIGGER news_updated BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- WORKSHOPS + ENROLLMENTS
-- =====================================================================
CREATE TABLE public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  modality public.workshop_modality NOT NULL DEFAULT 'presencial',
  level public.workshop_level NOT NULL DEFAULT 'basico',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location TEXT,
  capacity INT NOT NULL DEFAULT 10,
  enrolled_count INT NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  materials_included TEXT,
  status public.workshop_status NOT NULL DEFAULT 'abierto',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workshops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshops TO authenticated;
GRANT ALL ON public.workshops TO service_role;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workshops" ON public.workshops FOR SELECT TO anon, authenticated
  USING (is_visible = true OR public.is_staff(auth.uid()));
CREATE POLICY "Staff manage workshops" ON public.workshops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE TRIGGER workshops_updated BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.workshop_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  payment_status public.payment_status NOT NULL DEFAULT 'pendiente',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.workshop_enrollments TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.workshop_enrollments TO authenticated;
GRANT ALL ON public.workshop_enrollments TO service_role;
ALTER TABLE public.workshop_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can enroll" ON public.workshop_enrollments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read enrollments" ON public.workshop_enrollments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update enrollments" ON public.workshop_enrollments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete enrollments" ON public.workshop_enrollments FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Customer reads own enrollments" ON public.workshop_enrollments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =====================================================================
-- FAIRS
-- =====================================================================
CREATE TABLE public.fairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  warehouse_origin_id UUID REFERENCES public.warehouses(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fairs TO authenticated;
GRANT ALL ON public.fairs TO service_role;
ALTER TABLE public.fairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage fairs" ON public.fairs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.fair_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fair_id UUID NOT NULL REFERENCES public.fairs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty_sent NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty_sold NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty_returned NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fair_items TO authenticated;
GRANT ALL ON public.fair_items TO service_role;
ALTER TABLE public.fair_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage fair items" ON public.fair_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =====================================================================
-- STORAGE POLICIES
-- =====================================================================
-- Public read (signed not required) for images via the buckets we use as "public-ish"
-- Buckets exist as private; we'll serve via signed URLs from the app for now.
-- Allow staff to upload/manage objects in these buckets.
CREATE POLICY "Staff upload product/material/news/workshop images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('product-images','material-images','news-images','workshop-images','payment-evidence','receipt-pdfs')
  AND public.is_staff(auth.uid())
);
CREATE POLICY "Staff read storage objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('product-images','material-images','news-images','workshop-images','payment-evidence','receipt-pdfs')
  AND public.is_staff(auth.uid())
);
CREATE POLICY "Staff update storage objects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('product-images','material-images','news-images','workshop-images','payment-evidence','receipt-pdfs')
  AND public.is_staff(auth.uid())
);
CREATE POLICY "Staff delete storage objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('product-images','material-images','news-images','workshop-images','payment-evidence','receipt-pdfs')
  AND public.is_staff(auth.uid())
);
