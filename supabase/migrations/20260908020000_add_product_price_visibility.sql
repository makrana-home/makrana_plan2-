-- NULL preserves the existing site default until a product is explicitly configured.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_price boolean;
COMMENT ON COLUMN public.products.show_price IS
  'Public price visibility override. NULL inherits the site default.';
NOTIFY pgrst, 'reload schema';
