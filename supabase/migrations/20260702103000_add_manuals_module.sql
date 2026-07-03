-- Manual tecnico por pieza, enlazado a products sin duplicar piezas.

CREATE TABLE IF NOT EXISTS public.manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  measurements TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manuals_piece_id_unique UNIQUE (piece_id)
);

CREATE TABLE IF NOT EXISTS public.manual_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  alt_text TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manual_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.products(id),
  material_presentation_id UUID REFERENCES public.material_presentations(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.tg_manual_piece_must_be_piece()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = NEW.piece_id
      AND type IN ('producto_terminado', 'kit')
  ) THEN
    RAISE EXCEPTION 'El manual debe estar relacionado a una pieza existente';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_manual_material_must_be_material()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = NEW.material_id
      AND type = 'material'
  ) THEN
    RAISE EXCEPTION 'El material usado debe existir en el modulo Materiales';
  END IF;

  IF NEW.material_presentation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.material_presentations
    WHERE id = NEW.material_presentation_id
      AND product_id = NEW.material_id
  ) THEN
    RAISE EXCEPTION 'La presentacion seleccionada no pertenece al material usado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manuals_piece_type ON public.manuals;
CREATE TRIGGER manuals_piece_type
  BEFORE INSERT OR UPDATE OF piece_id ON public.manuals
  FOR EACH ROW EXECUTE FUNCTION public.tg_manual_piece_must_be_piece();

DROP TRIGGER IF EXISTS manual_materials_material_type ON public.manual_materials;
CREATE TRIGGER manual_materials_material_type
  BEFORE INSERT OR UPDATE OF material_id, material_presentation_id ON public.manual_materials
  FOR EACH ROW EXECUTE FUNCTION public.tg_manual_material_must_be_material();

DROP TRIGGER IF EXISTS manuals_updated ON public.manuals;
CREATE TRIGGER manuals_updated
  BEFORE UPDATE ON public.manuals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS manual_images_manual_id_idx ON public.manual_images(manual_id);
CREATE INDEX IF NOT EXISTS manual_materials_manual_id_idx ON public.manual_materials(manual_id);
CREATE INDEX IF NOT EXISTS manual_materials_material_id_idx ON public.manual_materials(material_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manuals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_materials TO authenticated;
GRANT ALL ON public.manuals TO service_role;
GRANT ALL ON public.manual_images TO service_role;
GRANT ALL ON public.manual_materials TO service_role;

ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage manuals" ON public.manuals;
CREATE POLICY "Staff manage manuals" ON public.manuals
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff manage manual images" ON public.manual_images;
CREATE POLICY "Staff manage manual images" ON public.manual_images
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff manage manual materials" ON public.manual_materials;
CREATE POLICY "Staff manage manual materials" ON public.manual_materials
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('manual-images', 'manual-images', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read manual images" ON storage.objects;
CREATE POLICY "Public read manual images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'manual-images');

DROP POLICY IF EXISTS "Staff upload manual images" ON storage.objects;
CREATE POLICY "Staff upload manual images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'manual-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update manual images" ON storage.objects;
CREATE POLICY "Staff update manual images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'manual-images' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'manual-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete manual images" ON storage.objects;
CREATE POLICY "Staff delete manual images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'manual-images' AND public.is_staff(auth.uid()));

COMMENT ON TABLE public.manuals IS 'Manual tecnico principal de una pieza existente en products.';
COMMENT ON COLUMN public.manuals.piece_id IS 'Pieza existente en products. Un manual principal por pieza.';

NOTIFY pgrst, 'reload schema';
