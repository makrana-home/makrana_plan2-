import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearCart } from "@/lib/cart";
import {
  createPaymentEvidenceUpload,
  getCommerceCheckoutConfig,
  submitManualPayment,
} from "@/lib/commerce.functions";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/_public/checkout/pago")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: String(s.code ?? ""),
    token: String(s.token ?? ""),
  }),
  component: PaymentPage,
});
function PaymentPage() {
  const { code, token } = Route.useSearch();
  const configFn = useServerFn(getCommerceCheckoutConfig),
    submitFn = useServerFn(submitManualPayment),
    uploadFn = useServerFn(createPaymentEvidenceUpload);
  const [reference, setReference] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [saving, setSaving] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    configFn().then((data: any) => setLink(data.settings?.izipay_easypay_public_url ?? null));
  }, [configFn]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let path: string | undefined;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("La constancia no puede superar 8 MB.");
        const signed: any = await uploadFn({
          data: { code, access_token: token, filename: file.name },
        });
        const { error: uploadError } = await supabase.storage
          .from("payment-evidence")
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        path = signed.path;
      }
      await submitFn({ data: { code, access_token: token, reference, evidence_path: path } });
      clearCart();
      setDone(true);
    } catch (reason: any) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="bg-cream/45 px-4 py-14">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <ShieldCheck className="size-9 text-brand-terracotta" />
            <CardTitle className="font-display text-3xl">
              {done ? "Pago enviado a revisión" : "Completa tu pago"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {done ? (
              <>
                <p>
                  Recibimos la referencia de tu pedido <strong>{code}</strong>. La aprobación es
                  manual; aún no constituye confirmación de pago.
                </p>
                <Button asChild className="mt-5 w-full">
                  <Link to="/pedido/$code" params={{ code }} search={{ token }}>
                    Consultar estado
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-cream p-4 text-sm">
                  <p>Usa este código como referencia:</p>
                  <p className="mt-1 font-mono text-lg font-bold">{code}</p>
                </div>
                {link ? (
                  <Button asChild className="mt-4 w-full">
                    <a href={link} target="_blank" rel="noreferrer">
                      Abrir enlace de EasyPay <ExternalLink />
                    </a>
                  </Button>
                ) : (
                  <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                    El enlace Easy Pay todavía no está configurado. Conserva tu código y contacta a
                    Makrana.
                  </p>
                )}
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Código o referencia de operación</Label>
                    <Input
                      required
                      minLength={3}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Constancia opcional</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      <Upload className="mr-1 inline size-3" />
                      PDF o imagen, máximo 8 MB.
                    </p>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button className="w-full" disabled={saving}>
                    {saving ? "Enviando…" : "Enviar para revisión"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
