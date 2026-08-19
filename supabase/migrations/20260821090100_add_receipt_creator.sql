BEGIN;

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.receipts AS receipt
SET created_by = sale.created_by
FROM public.sales AS sale
WHERE receipt.sale_id = sale.id
  AND receipt.created_by IS NULL
  AND sale.created_by IS NOT NULL;

ALTER TABLE public.receipts
  ALTER COLUMN created_by SET DEFAULT auth.uid();

COMMIT;

NOTIFY pgrst, 'reload schema';
