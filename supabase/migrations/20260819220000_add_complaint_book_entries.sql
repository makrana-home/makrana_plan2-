CREATE TABLE IF NOT EXISTS public.complaint_book_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE,
  first_name text NOT NULL,
  first_surname text NOT NULL,
  second_surname text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('DNI', 'RUC', 'CE', 'Pasaporte')),
  document_number text NOT NULL,
  phone text NOT NULL,
  department text NOT NULL,
  province text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  reference text,
  email text NOT NULL,
  claim_type text NOT NULL CHECK (claim_type IN ('Reclamación', 'Queja')),
  consumption_type text NOT NULL CHECK (consumption_type IN ('Producto', 'Servicio')),
  order_number text NOT NULL,
  claim_date date NOT NULL,
  provider text,
  claimed_amount numeric(12, 2),
  product_description text,
  purchase_date date,
  consumption_date date,
  expiration_date date,
  claim_detail text NOT NULL,
  customer_request text NOT NULL,
  sworn_declaration boolean NOT NULL DEFAULT false,
  contact_authorization boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'atendido')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaint_book_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read complaint book entries" ON public.complaint_book_entries;
CREATE POLICY "Staff can read complaint book entries"
ON public.complaint_book_entries FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update complaint book entries" ON public.complaint_book_entries;
CREATE POLICY "Staff can update complaint book entries"
ON public.complaint_book_entries FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

GRANT SELECT, UPDATE ON public.complaint_book_entries TO authenticated;
GRANT ALL ON public.complaint_book_entries TO service_role;

DROP TRIGGER IF EXISTS set_complaint_book_entries_updated_at ON public.complaint_book_entries;
CREATE TRIGGER set_complaint_book_entries_updated_at
BEFORE UPDATE ON public.complaint_book_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

