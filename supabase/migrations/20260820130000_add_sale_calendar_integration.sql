-- Integración de agenda con pedidos (Fase 3).
-- Reversa manual segura: ALTER TABLE public.sales DROP COLUMN estimated_completion_at;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sales.estimated_completion_at IS
  'Fecha estimada de finalización del pedido, almacenada en UTC.';

CREATE INDEX IF NOT EXISTS sales_estimated_completion_at_idx
  ON public.sales (estimated_completion_at)
  WHERE estimated_completion_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.calendar_sale_warnings(_event JSONB)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input AS (
    SELECT
      NULLIF(_event->>'sale_id', '')::UUID AS sale_id,
      NULLIF(_event->>'event_type_id', '')::UUID AS event_type_id,
      (_event->>'starts_at')::TIMESTAMPTZ AS starts_at
  ), context AS (
    SELECT i.*, s.estimated_completion_at, t.slug
    FROM input i
    LEFT JOIN public.sales s ON s.id = i.sale_id
    LEFT JOIN public.calendar_event_types t ON t.id = i.event_type_id
  )
  SELECT COALESCE(jsonb_agg(message), '[]'::JSONB)
  FROM (
    SELECT 'La entrega está programada antes de la finalización estimada.' AS message
    FROM context WHERE slug = 'entrega' AND estimated_completion_at IS NOT NULL AND starts_at < estimated_completion_at
    UNION ALL
    SELECT 'La presentación de avance está programada después de una entrega.'
    FROM context c WHERE c.slug = 'presentacion-avance' AND EXISTS (
      SELECT 1 FROM public.calendar_events e JOIN public.calendar_event_types t ON t.id=e.event_type_id
      WHERE e.sale_id=c.sale_id AND t.slug='entrega' AND e.status <> 'cancelled' AND c.starts_at > e.starts_at)
    UNION ALL
    SELECT 'La instalación está programada antes de la entrega.'
    FROM context c WHERE c.slug = 'instalacion' AND EXISTS (
      SELECT 1 FROM public.calendar_events e JOIN public.calendar_event_types t ON t.id=e.event_type_id
      WHERE e.sale_id=c.sale_id AND t.slug='entrega' AND e.status <> 'cancelled' AND c.starts_at < e.starts_at)
  ) warnings;
$$;

REVOKE ALL ON FUNCTION public.calendar_sale_warnings(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calendar_sale_warnings(JSONB) TO authenticated;
