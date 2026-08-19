UPDATE public.calendar_event_types
SET color = CASE slug
  WHEN 'reunion-cliente' THEN '#8F342C'
  WHEN 'presentacion-avance' THEN '#B85C45'
  WHEN 'revision-aprobacion' THEN '#7A4A35'
  WHEN 'entrega' THEN '#A66A3F'
  WHEN 'instalacion' THEN '#5C3027'
  WHEN 'seguimiento-interno' THEN '#C7866B'
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
