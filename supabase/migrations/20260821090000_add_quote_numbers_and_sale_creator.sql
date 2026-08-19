BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq
  AS bigint
  MINVALUE 0
  START WITH 0;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS quote_number bigint;

WITH numbered_sales AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS number
  FROM public.sales
  WHERE quote_number IS NULL
)
UPDATE public.sales AS sale
SET quote_number = numbered_sales.number
FROM numbered_sales
WHERE sale.id = numbered_sales.id;

SELECT setval(
  'public.quote_number_seq',
  COALESCE((SELECT max(quote_number) FROM public.sales), 0),
  EXISTS (SELECT 1 FROM public.sales)
);

ALTER TABLE public.sales
  ALTER COLUMN quote_number SET DEFAULT nextval('public.quote_number_seq'),
  ALTER COLUMN quote_number SET NOT NULL,
  ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE UNIQUE INDEX IF NOT EXISTS sales_quote_number_key
  ON public.sales(quote_number);

COMMIT;

NOTIFY pgrst, 'reload schema';
