-- Conecta la agenda con el estado de entrega de la venta.
-- Al programar una entrega en el calendario la venta queda en 'pendiente';
-- cuando ese evento se marca como completado la venta pasa a 'entregado'.
--
-- Reversión manual segura:
--   DROP TRIGGER IF EXISTS calendar_events_sync_sale_delivery ON public.calendar_events;
--   DROP FUNCTION IF EXISTS public.tg_sync_sale_delivery_status();
--   DROP FUNCTION IF EXISTS public.sync_sale_delivery_status(UUID);

CREATE OR REPLACE FUNCTION public.sync_sale_delivery_status(_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current public.delivery_status;
  _total INTEGER;
  _scheduled INTEGER;
  _completed INTEGER;
  _target public.delivery_status;
BEGIN
  IF _sale_id IS NULL THEN
    RETURN;
  END IF;

  SELECT delivery_status INTO _current FROM public.sales WHERE id = _sale_id;
  IF _current IS NULL THEN
    RETURN;
  END IF;

  -- Una venta anulada conserva su estado y no la toca el calendario.
  IF _current = 'cancelado' THEN
    RETURN;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE e.status IN ('pending_confirmation', 'confirmed', 'rescheduled')),
    count(*) FILTER (WHERE e.status = 'completed')
  INTO _total, _scheduled, _completed
  FROM public.calendar_events e
  JOIN public.calendar_event_types t ON t.id = e.event_type_id
  WHERE e.sale_id = _sale_id AND t.slug = 'entrega';

  -- Sin entregas en la agenda el estado sigue siendo manual (por ejemplo, ventas de feria).
  IF _total = 0 THEN
    RETURN;
  END IF;

  IF _scheduled > 0 THEN
    -- Hay una entrega agendada por realizar.
    _target := 'pendiente';
  ELSIF _completed > 0 THEN
    -- La entrega agendada ya se completó.
    _target := 'entregado';
  ELSE
    -- Todas las entregas quedaron canceladas.
    _target := 'pendiente';
  END IF;

  IF _target IS DISTINCT FROM _current THEN
    UPDATE public.sales SET delivery_status = _target WHERE id = _sale_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.sync_sale_delivery_status(UUID) IS
  'Recalcula sales.delivery_status a partir de los eventos de tipo entrega de esa venta.';

REVOKE ALL ON FUNCTION public.sync_sale_delivery_status(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.tg_sync_sale_delivery_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.sale_id IS NOT NULL THEN
    PERFORM public.sync_sale_delivery_status(OLD.sale_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.sale_id IS NOT NULL THEN
    PERFORM public.sync_sale_delivery_status(NEW.sale_id);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_sync_sale_delivery_status() FROM PUBLIC;

DROP TRIGGER IF EXISTS calendar_events_sync_sale_delivery ON public.calendar_events;
CREATE TRIGGER calendar_events_sync_sale_delivery
  AFTER INSERT OR DELETE OR UPDATE OF status, sale_id, event_type_id ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_sale_delivery_status();

-- Deja al día las ventas que ya tienen entregas agendadas.
DO $$
DECLARE
  _sale UUID;
BEGIN
  FOR _sale IN
    SELECT DISTINCT e.sale_id
    FROM public.calendar_events e
    JOIN public.calendar_event_types t ON t.id = e.event_type_id
    WHERE e.sale_id IS NOT NULL AND t.slug = 'entrega'
  LOOP
    PERFORM public.sync_sale_delivery_status(_sale);
  END LOOP;
END;
$$;
