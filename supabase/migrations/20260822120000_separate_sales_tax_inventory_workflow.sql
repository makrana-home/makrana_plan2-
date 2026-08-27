BEGIN;

CREATE TABLE IF NOT EXISTS public.sale_document_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  source_document text NOT NULL CHECK (source_document IN ('boleta','factura','nota_venta','pedido_personalizado','cotizacion')),
  target_document text NOT NULL CHECK (target_document IN ('boleta','factura','nota_venta','pedido_personalizado','cotizacion')),
  converted_by uuid NOT NULL REFERENCES auth.users(id),
  converted_at timestamptz NOT NULL DEFAULT now(),
  price_snapshot numeric(10,2) NOT NULL,
  warehouse_id uuid REFERENCES public.warehouses(id),
  UNIQUE(sale_id, source_document, target_document)
);

ALTER TABLE public.sale_document_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales staff read conversions" ON public.sale_document_conversions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas'));
CREATE POLICY "Sales staff create conversions" ON public.sale_document_conversions FOR INSERT TO authenticated
  WITH CHECK (converted_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ventas')));

CREATE OR REPLACE FUNCTION public.sale_document_intent(_notes text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE((regexp_match(COALESCE(_notes,''), '\[Documento: (boleta|factura|nota_venta|pedido_personalizado|cotizacion)\]', 'i'))[1], 'cotizacion');
$$;

CREATE OR REPLACE FUNCTION public.guard_paid_sale_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE paid numeric; intent text;
BEGIN
  IF OLD.status = 'borrador' AND NEW.status = 'confirmada' THEN
    intent := public.sale_document_intent(NEW.notes);
    IF intent IN ('cotizacion','pedido_personalizado') THEN
      RAISE EXCEPTION 'la cotización o pedido debe convertirse antes de confirmar la venta';
    END IF;
    SELECT COALESCE(sum(amount),0) INTO paid FROM public.sale_payments WHERE sale_id = NEW.id;
    IF paid < NEW.total THEN RAISE EXCEPTION 'el pago debe estar confirmado antes de registrar la venta'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_paid_sale_confirmation ON public.sales;
CREATE TRIGGER guard_paid_sale_confirmation BEFORE UPDATE OF status ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.guard_paid_sale_confirmation();

CREATE OR REPLACE FUNCTION public.audit_sale_document_conversion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_intent text; new_intent text;
BEGIN
  old_intent := public.sale_document_intent(OLD.notes);
  new_intent := public.sale_document_intent(NEW.notes);
  IF old_intent <> new_intent THEN
    INSERT INTO public.sale_document_conversions(sale_id,source_document,target_document,converted_by,price_snapshot,warehouse_id)
    VALUES (NEW.id,old_intent,new_intent,auth.uid(),NEW.total,NEW.warehouse_id)
    ON CONFLICT (sale_id,source_document,target_document) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_sale_document_conversion AFTER UPDATE OF notes ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.audit_sale_document_conversion();

COMMIT;
