BEGIN;

ALTER TABLE public.staff_module_permissions DROP CONSTRAINT IF EXISTS staff_module_permissions_module_check;
ALTER TABLE public.staff_module_permissions ADD CONSTRAINT staff_module_permissions_module_check CHECK (module IN ('inventory','manual','calendar','sales','tax','customers','stock','reports'));

CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc text NOT NULL CHECK (ruc ~ '^[0-9]{11}$'), legal_name text NOT NULL, trade_name text,
  fiscal_address text NOT NULL, ubigeo text, department text, province text, district text,
  country_code text NOT NULL DEFAULT 'PE', currency_code text NOT NULL DEFAULT 'PEN',
  tax_regime text, igv_rate numeric(5,2) NOT NULL DEFAULT 18.00,
  environment text NOT NULL DEFAULT 'mock' CHECK (environment IN ('mock','beta','production')),
  electronic_issuer_enabled boolean NOT NULL DEFAULT false,
  certificate_configured boolean NOT NULL DEFAULT false, certificate_expires_at timestamptz,
  sire_configured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.tax_document_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tax_settings_id uuid NOT NULL REFERENCES public.tax_settings(id),
  document_type text NOT NULL CHECK (document_type IN ('01','03','07','08','RC','RA')),
  series text NOT NULL CHECK (series ~ '^[A-Z0-9]{4}$'), last_number bigint NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  active boolean NOT NULL DEFAULT true, environment text NOT NULL DEFAULT 'mock' CHECK (environment IN ('mock','beta','production')),
  establishment_code text NOT NULL DEFAULT '0000', created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES auth.users(id),
  UNIQUE(tax_settings_id, document_type, series, environment)
);

CREATE TABLE IF NOT EXISTS public.tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid REFERENCES public.sales(id), customer_id uuid REFERENCES public.customers(id),
  tax_settings_id uuid NOT NULL REFERENCES public.tax_settings(id), document_type text NOT NULL CHECK (document_type IN ('01','03','07','08')),
  series text NOT NULL, number bigint NOT NULL, issue_date date NOT NULL, issue_time time NOT NULL,
  currency text NOT NULL DEFAULT 'PEN', operation_type text NOT NULL DEFAULT '0101',
  customer_document_type text NOT NULL, customer_document_number text, customer_name text NOT NULL,
  subtotal numeric(14,2) NOT NULL DEFAULT 0, taxable_amount numeric(14,2) NOT NULL DEFAULT 0,
  exempt_amount numeric(14,2) NOT NULL DEFAULT 0, unaffected_amount numeric(14,2) NOT NULL DEFAULT 0,
  free_amount numeric(14,2) NOT NULL DEFAULT 0, discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  igv_amount numeric(14,2) NOT NULL DEFAULT 0, total_amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text, status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','generated','signed','sent','processing','accepted','accepted_with_observations','rejected','connection_error','void_requested','voided')),
  sunat_status text, sunat_code text, sunat_message text, sunat_ticket text, document_hash text, qr_payload text,
  xml_path text, signed_xml_path text, zip_path text, cdr_path text, pdf_path text,
  environment text NOT NULL DEFAULT 'mock' CHECK (environment IN ('mock','beta','production')),
  idempotency_key text NOT NULL UNIQUE, related_document_id uuid REFERENCES public.tax_documents(id), credit_note_reason_code text,
  credited_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (credited_amount >= 0),
  issued_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz, voided_at timestamptz,
  UNIQUE(tax_settings_id, document_type, series, number)
);
CREATE UNIQUE INDEX IF NOT EXISTS tax_documents_one_active_per_sale_type
  ON public.tax_documents(sale_id, document_type) WHERE sale_id IS NOT NULL AND document_type IN ('01','03') AND status NOT IN ('rejected','voided');

CREATE TABLE IF NOT EXISTS public.tax_document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tax_document_id uuid NOT NULL REFERENCES public.tax_documents(id) ON DELETE RESTRICT,
  line_number integer NOT NULL, product_id uuid REFERENCES public.products(id), description text NOT NULL,
  quantity numeric(14,4) NOT NULL, sunat_unit_code text NOT NULL DEFAULT 'NIU', unit_value numeric(14,6) NOT NULL,
  unit_price numeric(14,6) NOT NULL, discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  sale_value numeric(14,2) NOT NULL, igv_affectation_code text NOT NULL DEFAULT '10', igv_amount numeric(14,2) NOT NULL,
  total_amount numeric(14,2) NOT NULL, internal_code text, sunat_code text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tax_document_id, line_number)
);

CREATE TABLE IF NOT EXISTS public.sunat_transmission_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tax_document_id uuid REFERENCES public.tax_documents(id) ON DELETE CASCADE,
  operation text NOT NULL, environment text NOT NULL, attempt_number integer NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(), transport_code text, sunat_code text, message text,
  status text NOT NULL, duration_ms integer, correlation_id uuid NOT NULL DEFAULT gen_random_uuid(), next_retry_at timestamptz,
  sanitized_response jsonb, idempotency_key text NOT NULL, UNIQUE(idempotency_key, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.sunat_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tax_settings_id uuid NOT NULL REFERENCES public.tax_settings(id),
  issue_date date NOT NULL, summary_identifier text NOT NULL, ticket text, status text NOT NULL DEFAULT 'draft',
  attempt_count integer NOT NULL DEFAULT 0, xml_path text, signed_xml_path text, zip_path text, cdr_path text,
  document_hash text, correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tax_settings_id, issue_date, summary_identifier)
);
CREATE TABLE IF NOT EXISTS public.sunat_daily_summary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), summary_id uuid NOT NULL REFERENCES public.sunat_daily_summaries(id) ON DELETE CASCADE,
  tax_document_id uuid NOT NULL REFERENCES public.tax_documents(id), action text NOT NULL CHECK (action IN ('add','modify','void')),
  status text NOT NULL DEFAULT 'pending', UNIQUE(summary_id, tax_document_id)
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), supplier_name text NOT NULL, supplier_ruc text NOT NULL CHECK (supplier_ruc ~ '^[0-9]{11}$'),
  document_type text NOT NULL, series text NOT NULL, number text NOT NULL, issue_date date NOT NULL, due_date date,
  currency text NOT NULL DEFAULT 'PEN', taxable_amount numeric(14,2) NOT NULL DEFAULT 0, igv_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL, payment_status text NOT NULL DEFAULT 'pending', category text,
  xml_path text, pdf_path text, source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','sire','import')),
  reconciliation_status text NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN ('pending','matched','missing_internal','missing_sunat','duplicate','total_mismatch','igv_mismatch','supplier_mismatch','voided','review')),
  car text, tax_period text NOT NULL CHECK (tax_period ~ '^[0-9]{4}-[0-9]{2}$'), status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','registered','voided')),
  created_by uuid REFERENCES auth.users(id), updated_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_ruc, document_type, series, number)
);
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  description text NOT NULL, quantity numeric(14,4) NOT NULL DEFAULT 1, unit_value numeric(14,6) NOT NULL,
  igv_amount numeric(14,2) NOT NULL DEFAULT 0, total_amount numeric(14,2) NOT NULL, category text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sire_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'), registry_type text NOT NULL CHECK (registry_type IN ('RVIE','RCE')),
  proposal_status text NOT NULL DEFAULT 'not_synced', ticket text, file_path text, file_hash text,
  makrana_total numeric(14,2) NOT NULL DEFAULT 0, sunat_total numeric(14,2) NOT NULL DEFAULT 0,
  review_status text NOT NULL DEFAULT 'pending', approved_by uuid REFERENCES auth.users(id), approved_at timestamptz,
  submission_status text NOT NULL DEFAULT 'blocked', last_synced_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period, registry_type)
);
CREATE TABLE IF NOT EXISTS public.sire_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sire_period_id uuid NOT NULL REFERENCES public.sire_periods(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status text NOT NULL, ticket text,
  records_count integer NOT NULL DEFAULT 0, error_message text, correlation_id uuid NOT NULL DEFAULT gen_random_uuid(), initiated_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.sire_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sire_period_id uuid NOT NULL REFERENCES public.sire_periods(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('makrana','sunat')), external_key text NOT NULL, supplier_or_customer_document text,
  document_type text NOT NULL, series text NOT NULL, number text NOT NULL, issue_date date NOT NULL,
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0, igv_amount numeric(14,2) NOT NULL DEFAULT 0, total_amount numeric(14,2) NOT NULL DEFAULT 0,
  raw_data jsonb, UNIQUE(sire_period_id, source, external_key)
);
CREATE TABLE IF NOT EXISTS public.sire_inconsistencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sire_period_id uuid NOT NULL REFERENCES public.sire_periods(id) ON DELETE CASCADE,
  inconsistency_type text NOT NULL, internal_record_id uuid REFERENCES public.sire_records(id), sunat_record_id uuid REFERENCES public.sire_records(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'pending', reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES auth.users(id), action text NOT NULL,
  entity_type text NOT NULL, entity_id uuid, previous_state jsonb, next_state jsonb, reason text,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.reserve_tax_document_number(_series_id uuid)
RETURNS TABLE(series text, number bigint, document_type text, tax_settings_id uuid, environment text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY UPDATE public.tax_document_series s SET last_number=s.last_number+1, updated_at=now()
    WHERE s.id=_series_id AND s.active RETURNING s.series,s.last_number,s.document_type,s.tax_settings_id,s.environment;
  IF NOT FOUND THEN RAISE EXCEPTION 'serie tributaria inexistente o inactiva'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.reserve_tax_document_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_tax_document_number(uuid) TO authenticated, service_role;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tax_settings','tax_document_series','tax_documents','tax_document_items','sunat_transmission_attempts','sunat_daily_summaries','sunat_daily_summary_items','purchases','purchase_items','sire_periods','sire_sync_runs','sire_records','sire_inconsistencies','tax_audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
    EXECUTE format('DROP POLICY IF EXISTS "Tax staff manage %s" ON public.%I',t,t);
    EXECUTE format('DROP POLICY IF EXISTS "Tax staff read %s" ON public.%I',t,t);
    EXECUTE format('DROP POLICY IF EXISTS "Tax staff insert %s" ON public.%I',t,t);
    EXECUTE format('DROP POLICY IF EXISTS "Tax staff update %s" ON public.%I',t,t);
    EXECUTE format('CREATE POLICY "Tax staff read %s" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''ventas''))',t,t);
    EXECUTE format('CREATE POLICY "Tax staff insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''ventas''))',t,t);
    EXECUTE format('CREATE POLICY "Tax staff update %s" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''ventas'')) WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''ventas''))',t,t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Tax staff insert tax_settings" ON public.tax_settings;
DROP POLICY IF EXISTS "Tax staff update tax_settings" ON public.tax_settings;
CREATE POLICY "Admins insert tax settings" ON public.tax_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update tax settings" ON public.tax_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.prevent_tax_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  RAISE EXCEPTION 'Los snapshots tributarios son inmutables';
END $$;
DROP TRIGGER IF EXISTS tax_document_items_immutable ON public.tax_document_items;
CREATE TRIGGER tax_document_items_immutable BEFORE UPDATE OR DELETE ON public.tax_document_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_tax_snapshot_mutation();

INSERT INTO storage.buckets (id,name,public) VALUES ('tax-documents','tax-documents',false),('purchase-documents','purchase-documents',false),('sire-files','sire-files',false) ON CONFLICT (id) DO UPDATE SET public=false;
DROP POLICY IF EXISTS "Tax staff access tax files" ON storage.objects;
CREATE POLICY "Tax staff access tax files" ON storage.objects FOR ALL TO authenticated USING (bucket_id IN ('tax-documents','purchase-documents','sire-files') AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'))) WITH CHECK (bucket_id IN ('tax-documents','purchase-documents','sire-files') AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')));

COMMIT;
NOTIFY pgrst, 'reload schema';
