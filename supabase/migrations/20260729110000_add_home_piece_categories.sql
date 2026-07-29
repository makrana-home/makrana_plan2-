ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS home_description TEXT,
  ADD COLUMN IF NOT EXISTS home_image_url TEXT,
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.categories (
  slug,
  name,
  description,
  home_description,
  sort_order,
  is_active,
  show_on_home
)
VALUES
  (
    'arbol-de-la-vida',
    'Árbol de la vida',
    'scope:piece',
    'Símbolos de conexión y equilibrio.',
    10,
    true,
    true
  ),
  (
    'murales-inspirados-en-quipus',
    'Murales inspirados en quipus',
    'scope:piece',
    'Texturas, nudos y tradición reinterpretada.',
    20,
    true,
    true
  ),
  (
    'murales',
    'Murales',
    'scope:piece',
    'Composiciones que cuentan historias.',
    30,
    true,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  home_description = COALESCE(public.categories.home_description, EXCLUDED.home_description),
  show_on_home = true,
  is_active = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read category images" ON storage.objects;
CREATE POLICY "Public read category images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'category-images');

DROP POLICY IF EXISTS "Staff upload category images" ON storage.objects;
CREATE POLICY "Staff upload category images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'category-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update category images" ON storage.objects;
CREATE POLICY "Staff update category images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'category-images' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'category-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete category images" ON storage.objects;
CREATE POLICY "Staff delete category images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'category-images' AND public.is_staff(auth.uid()));
