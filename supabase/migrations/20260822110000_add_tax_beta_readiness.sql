BEGIN;

ALTER TABLE public.tax_settings
  ADD COLUMN IF NOT EXISTS prices_include_igv boolean,
  ADD COLUMN IF NOT EXISTS tax_email text,
  ADD COLUMN IF NOT EXISTS readiness_statuses jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS xsd_tests_passed_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_authorized_by uuid REFERENCES auth.users(id);

ALTER TABLE public.tax_settings ADD CONSTRAINT tax_settings_readiness_statuses_object
  CHECK (jsonb_typeof(readiness_statuses) = 'object');

CREATE OR REPLACE FUNCTION public.tax_environment_ready(_settings_id uuid, _target text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _target = 'mock' OR EXISTS (
    SELECT 1 FROM public.tax_settings s
    WHERE s.id = _settings_id
      AND s.ruc IS NOT NULL AND s.legal_name IS NOT NULL AND s.fiscal_address IS NOT NULL
      AND s.ubigeo IS NOT NULL AND s.tax_regime IS NOT NULL
      AND s.prices_include_igv IS NOT NULL AND s.tax_email IS NOT NULL
      AND s.certificate_configured AND s.certificate_expires_at > now()
      AND s.xsd_tests_passed_at IS NOT NULL AND s.beta_authorized_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_each_text(s.readiness_statuses) e
        WHERE e.value NOT IN ('owner_validated', 'accountant_validated')
      )
      AND EXISTS (SELECT 1 FROM public.tax_document_series ds WHERE ds.tax_settings_id = s.id AND ds.active AND ds.document_type = '01')
      AND EXISTS (SELECT 1 FROM public.tax_document_series ds WHERE ds.tax_settings_id = s.id AND ds.active AND ds.document_type = '03')
      AND EXISTS (SELECT 1 FROM public.tax_document_series ds WHERE ds.tax_settings_id = s.id AND ds.active AND ds.document_type = '07')
  );
$$;

REVOKE ALL ON FUNCTION public.tax_environment_ready(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tax_environment_ready(uuid, text) TO authenticated;

COMMIT;
