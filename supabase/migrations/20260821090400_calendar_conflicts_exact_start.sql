-- Un evento solo entra en conflicto cuando comparte exactamente la misma fecha y hora
-- de inicio con otro evento activo del mismo responsable o pedido.
DO $$
DECLARE
  function_definition TEXT;
  new_condition TEXT := 'AND e.starts_at = _starts';
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO function_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'save_calendar_event'
    AND oidvectortypes(p.proargtypes) = 'jsonb, boolean, text';

  IF function_definition IS NULL THEN
    RAISE EXCEPTION 'No se encontró public.save_calendar_event(jsonb, boolean, text)';
  END IF;

  -- Es idempotente: si la función ya usa la regla exacta, no necesita otro reemplazo.
  IF position(new_condition IN function_definition) = 0 THEN
    function_definition := regexp_replace(
      function_definition,
      'AND \(e\.starts_at.*?> \(_starts - make_interval\(mins => _prep \+ _travel\)\)',
      new_condition
    );

    IF position(new_condition IN function_definition) = 0 THEN
      RAISE EXCEPTION 'No se pudo actualizar la condición de conflictos del calendario';
    END IF;

    EXECUTE function_definition;
  END IF;
END;
$$;
