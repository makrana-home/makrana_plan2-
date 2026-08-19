-- Colores deliberadamente distintos para reconocer cada tipo de evento de un vistazo.
UPDATE public.calendar_event_types
SET color = CASE slug
  WHEN 'reunion-cliente' THEN '#8F342C'
  WHEN 'presentacion-avance' THEN '#2563EB'
  WHEN 'revision-aprobacion' THEN '#D97706'
  WHEN 'entrega' THEN '#15803D'
  WHEN 'instalacion' THEN '#7E22CE'
  WHEN 'seguimiento-interno' THEN '#0F766E'
  ELSE color
END
WHERE slug IN (
  'reunion-cliente',
  'presentacion-avance',
  'revision-aprobacion',
  'entrega',
  'instalacion',
  'seguimiento-interno'
);
