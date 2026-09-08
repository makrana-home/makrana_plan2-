INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipt-shares', 'receipt-shares', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Sales staff upload receipt shares"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipt-shares' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ventas')));

CREATE POLICY "Sales staff sign receipt shares"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipt-shares' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ventas')));
