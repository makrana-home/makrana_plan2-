-- Calendario interno Makrana (Fases 1 y 2).
-- Reversión manual segura: DROP FUNCTION public.save_calendar_event(jsonb, boolean, text);
-- DROP TABLE public.calendar_event_audit, public.calendar_events, public.calendar_event_types CASCADE;

CREATE TABLE public.calendar_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  default_duration_minutes INTEGER CHECK (default_duration_minutes IS NULL OR default_duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 180),
  event_type_id UUID NOT NULL REFERENCES public.calendar_event_types(id),
  notes TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Lima',
  modality TEXT NOT NULL DEFAULT 'interna' CHECK (modality IN ('virtual','presencial','entrega','interna')),
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation','confirmed','rescheduled','completed','cancelled')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  responsible_user_id UUID NOT NULL REFERENCES public.profiles(id),
  preparation_minutes INTEGER NOT NULL DEFAULT 0 CHECK (preparation_minutes >= 0 AND preparation_minutes <= 1440),
  travel_minutes INTEGER NOT NULL DEFAULT 0 CHECK (travel_minutes >= 0 AND travel_minutes <= 1440),
  conflict_forced BOOLEAN NOT NULL DEFAULT false,
  conflict_force_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  CHECK (ends_at > starts_at),
  CHECK (timezone = 'America/Lima'),
  CHECK (NOT conflict_forced OR nullif(trim(conflict_force_reason), '') IS NOT NULL),
  CHECK (status <> 'cancelled' OR nullif(trim(cancellation_reason), '') IS NOT NULL)
);

CREATE TABLE public.calendar_event_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','edited','rescheduled','status_changed','cancelled','conflict_forced')),
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_values JSONB,
  new_values JSONB,
  reason TEXT
);

CREATE INDEX calendar_events_starts_at_idx ON public.calendar_events(starts_at);
CREATE INDEX calendar_events_responsible_time_idx ON public.calendar_events(responsible_user_id, starts_at, ends_at) WHERE status <> 'cancelled';
CREATE INDEX calendar_events_sale_time_idx ON public.calendar_events(sale_id, starts_at, ends_at) WHERE sale_id IS NOT NULL AND status <> 'cancelled';
CREATE INDEX calendar_events_customer_idx ON public.calendar_events(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX calendar_event_audit_event_idx ON public.calendar_event_audit(event_id, performed_at DESC);

CREATE TRIGGER calendar_event_types_updated BEFORE UPDATE ON public.calendar_event_types
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER calendar_events_updated BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.calendar_event_types (name, slug, color, icon, default_duration_minutes, sort_order) VALUES
  ('Reunión con cliente', 'reunion-cliente', '#9A3B32', 'users', 60, 10),
  ('Presentación de avance', 'presentacion-avance', '#B36A45', 'presentation', 45, 20),
  ('Revisión o aprobación', 'revision-aprobacion', '#8A6A45', 'clipboard-check', 45, 30),
  ('Entrega', 'entrega', '#4F7665', 'package-check', 60, 40),
  ('Instalación', 'instalacion', '#5D667A', 'hammer', 120, 50),
  ('Seguimiento interno', 'seguimiento-interno', '#7B5B72', 'list-checks', 30, 60);

ALTER TABLE public.calendar_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.calendar_event_types, public.calendar_events, public.calendar_event_audit TO authenticated;
GRANT ALL ON public.calendar_event_types, public.calendar_events, public.calendar_event_audit TO service_role;

CREATE POLICY "Staff read calendar event types" ON public.calendar_event_types FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manage calendar event types" ON public.calendar_event_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read calendar events" ON public.calendar_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Authorized staff read calendar audit" ON public.calendar_event_audit FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.calendar_events e
      WHERE e.id = event_id AND (e.created_by = auth.uid() OR e.responsible_user_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.save_calendar_event(
  _event JSONB,
  _force_conflict BOOLEAN DEFAULT false,
  _force_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID := NULLIF(_event->>'id', '')::UUID;
  _old public.calendar_events%ROWTYPE;
  _saved public.calendar_events%ROWTYPE;
  _is_admin BOOLEAN;
  _is_sales BOOLEAN;
  _is_logistics BOOLEAN;
  _type_slug TEXT;
  _starts TIMESTAMPTZ := (_event->>'starts_at')::TIMESTAMPTZ;
  _ends TIMESTAMPTZ := (_event->>'ends_at')::TIMESTAMPTZ;
  _responsible UUID := (_event->>'responsible_user_id')::UUID;
  _sale UUID := NULLIF(_event->>'sale_id', '')::UUID;
  _prep INTEGER := COALESCE((_event->>'preparation_minutes')::INTEGER, 0);
  _travel INTEGER := COALESCE((_event->>'travel_minutes')::INTEGER, 0);
  _status TEXT := COALESCE(_event->>'status', 'pending_confirmation');
  _conflicts JSONB;
  _action TEXT;
BEGIN
  IF _uid IS NULL OR NOT public.is_staff(_uid) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  _is_admin := public.has_role(_uid, 'admin');
  _is_sales := public.has_role(_uid, 'ventas');
  _is_logistics := public.has_role(_uid, 'almacen');

  SELECT slug INTO _type_slug FROM public.calendar_event_types WHERE id = (_event->>'event_type_id')::UUID AND is_active;
  IF _type_slug IS NULL THEN RAISE EXCEPTION 'Tipo de evento inválido'; END IF;
  IF _ends <= _starts THEN RAISE EXCEPTION 'La hora final debe ser posterior a la inicial'; END IF;
  IF COALESCE(_event->>'timezone', 'America/Lima') <> 'America/Lima' THEN RAISE EXCEPTION 'Zona horaria no permitida'; END IF;
  IF _status = 'cancelled' AND NULLIF(trim(_event->>'cancellation_reason'), '') IS NULL THEN
    RAISE EXCEPTION 'El motivo de cancelación es obligatorio';
  END IF;
  IF _force_conflict AND (NOT _is_admin OR NULLIF(trim(_force_reason), '') IS NULL) THEN
    RAISE EXCEPTION 'Solo un administrador puede forzar un conflicto indicando el motivo';
  END IF;
  IF _is_logistics AND NOT _is_admin AND _type_slug NOT IN ('entrega','instalacion') THEN
    RAISE EXCEPTION 'Logística solo puede gestionar entregas e instalaciones';
  END IF;

  IF _id IS NOT NULL THEN
    SELECT * INTO _old FROM public.calendar_events WHERE id = _id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Evento no encontrado'; END IF;
    IF NOT _is_admin AND _old.created_by <> _uid AND _old.responsible_user_id <> _uid THEN
      RAISE EXCEPTION 'Solo puedes editar eventos creados por ti o asignados a ti';
    END IF;
  END IF;

  -- Serializa operaciones concurrentes por responsable y pedido antes de validar.
  PERFORM pg_advisory_xact_lock(hashtextextended(_responsible::TEXT, 8142026));
  IF _sale IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(_sale::TEXT, 8142027)); END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
    'responsible_user_id', e.responsible_user_id, 'sale_id', e.sale_id,
    'customer_id', e.customer_id,
    'responsible_name', (SELECT COALESCE(p.full_name, p.email) FROM public.profiles p WHERE p.id = e.responsible_user_id),
    'customer_name', (SELECT c.full_name FROM public.customers c WHERE c.id = e.customer_id),
    'sale_reference', CASE WHEN e.sale_id IS NULL THEN NULL ELSE LEFT(e.sale_id::TEXT, 8) END,
    'reason', CASE WHEN e.responsible_user_id = _responsible THEN 'responsible' ELSE 'sale' END
  ) ORDER BY e.starts_at), '[]'::JSONB)
  INTO _conflicts
  FROM public.calendar_events e
  WHERE e.status <> 'cancelled'
    AND (_id IS NULL OR e.id <> _id)
    AND (e.responsible_user_id = _responsible OR (_sale IS NOT NULL AND e.sale_id = _sale))
    AND (e.starts_at - make_interval(mins => e.preparation_minutes + e.travel_minutes))
        < (_ends + make_interval(mins => _travel))
    AND (e.ends_at + make_interval(mins => e.travel_minutes))
        > (_starts - make_interval(mins => _prep + _travel));

  IF jsonb_array_length(_conflicts) > 0 AND NOT _force_conflict THEN
    RETURN jsonb_build_object('saved', false, 'conflicts', _conflicts);
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.calendar_events (
      title, event_type_id, notes, starts_at, ends_at, timezone, modality, address, status,
      customer_id, sale_id, product_id, responsible_user_id, preparation_minutes, travel_minutes,
      conflict_forced, conflict_force_reason, created_by, cancelled_at, cancellation_reason
    ) VALUES (
      trim(_event->>'title'), (_event->>'event_type_id')::UUID, NULLIF(trim(_event->>'notes'), ''),
      _starts, _ends, 'America/Lima', COALESCE(_event->>'modality','interna'), NULLIF(trim(_event->>'address'), ''), _status,
      NULLIF(_event->>'customer_id','')::UUID, _sale, NULLIF(_event->>'product_id','')::UUID, _responsible, _prep, _travel,
      _force_conflict AND jsonb_array_length(_conflicts) > 0, CASE WHEN _force_conflict THEN trim(_force_reason) END, _uid,
      CASE WHEN _status = 'cancelled' THEN now() END, NULLIF(trim(_event->>'cancellation_reason'), '')
    ) RETURNING * INTO _saved;
    INSERT INTO public.calendar_event_audit(event_id, action, performed_by, new_values)
      VALUES (_saved.id, 'created', _uid, to_jsonb(_saved));
  ELSE
    UPDATE public.calendar_events SET
      title = trim(_event->>'title'), event_type_id = (_event->>'event_type_id')::UUID,
      notes = NULLIF(trim(_event->>'notes'), ''), starts_at = _starts, ends_at = _ends,
      modality = COALESCE(_event->>'modality','interna'), address = NULLIF(trim(_event->>'address'), ''), status = _status,
      customer_id = NULLIF(_event->>'customer_id','')::UUID, sale_id = _sale,
      product_id = NULLIF(_event->>'product_id','')::UUID, responsible_user_id = _responsible,
      preparation_minutes = _prep, travel_minutes = _travel,
      conflict_forced = _force_conflict AND jsonb_array_length(_conflicts) > 0,
      conflict_force_reason = CASE WHEN _force_conflict THEN trim(_force_reason) END,
      cancelled_at = CASE WHEN _status = 'cancelled' THEN COALESCE(_old.cancelled_at, now()) ELSE NULL END,
      cancellation_reason = CASE WHEN _status = 'cancelled' THEN NULLIF(trim(_event->>'cancellation_reason'), '') ELSE NULL END
    WHERE id = _id RETURNING * INTO _saved;

    _action := CASE
      WHEN _saved.status = 'cancelled' AND _old.status <> 'cancelled' THEN 'cancelled'
      WHEN _saved.starts_at <> _old.starts_at OR _saved.ends_at <> _old.ends_at THEN 'rescheduled'
      WHEN _saved.status <> _old.status THEN 'status_changed'
      ELSE 'edited'
    END;
    INSERT INTO public.calendar_event_audit(event_id, action, performed_by, old_values, new_values, reason)
      VALUES (_saved.id, _action, _uid, to_jsonb(_old), to_jsonb(_saved),
        COALESCE(NULLIF(trim(_event->>'cancellation_reason'), ''), NULLIF(trim(_force_reason), '')));
  END IF;

  IF _force_conflict AND jsonb_array_length(_conflicts) > 0 THEN
    INSERT INTO public.calendar_event_audit(event_id, action, performed_by, old_values, new_values, reason)
      VALUES (_saved.id, 'conflict_forced', _uid, NULL, jsonb_build_object('conflicts', _conflicts), trim(_force_reason));
  END IF;

  RETURN jsonb_build_object('saved', true, 'event_id', _saved.id, 'conflicts', _conflicts);
END;
$$;

REVOKE ALL ON FUNCTION public.save_calendar_event(JSONB, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_calendar_event(JSONB, BOOLEAN, TEXT) TO authenticated;
