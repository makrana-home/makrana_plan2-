import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readCart } from "@/lib/cart";
import {
  createCheckoutOrder,
  getCommerceCheckoutConfig,
  getDeliveryQuote,
  priceCart,
} from "@/lib/commerce.functions";

export const Route = createFileRoute("/_public/checkout")({ component: CheckoutPage });
const initial: any = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  document_type: "DNI",
  document_number: "",
  receipt_type: "receipt",
  billing_ruc: "",
  billing_legal_name: "",
  billing_fiscal_address: "",
  delivery_method_id: "",
  address_line: "",
  department: "Lima",
  province: "Lima",
  district: "",
  delivery_zone_district_id: "",
  reference: "",
  recipient_name: "",
  recipient_phone: "",
  additional_instructions: "",
  terms_accepted: false,
  privacy_accepted: false,
};
function CheckoutPage() {
  const configFn = useServerFn(getCommerceCheckoutConfig),
    priceFn = useServerFn(priceCart),
    createFn = useServerFn(createCheckoutOrder),
    quoteFn = useServerFn(getDeliveryQuote),
    navigate = useNavigate();
  const [config, setConfig] = useState<any>(null),
    [priced, setPriced] = useState<any[]>([]),
    [form, setForm] = useState(initial),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [quote, setQuote] = useState<any>(null);
  const cart = useMemo(() => readCart(), []);
  const checkoutKey = useMemo(() => crypto.randomUUID(), []);
  useEffect(() => {
    configFn().then((value: any) => {
      setConfig(value);
      if (value.methods?.[0])
        setForm((current: any) => ({ ...current, delivery_method_id: value.methods[0].id }));
    });
    priceFn({
      data: {
        items: cart.map((item) => ({
          product_id: item.productId,
          presentation_id: item.presentationId,
          quantity: item.quantity,
        })),
      },
    })
      .then(setPriced)
      .catch((reason) => setError(reason.message));
  }, [configFn, priceFn]);
  const method = config?.methods?.find((item: any) => item.id === form.delivery_method_id);
  const hasPhysical = priced.some((item) => item.physical);
  const subtotal = priced.reduce((sum, item) => sum + item.subtotal, 0),
    productSubtotal = priced
      .filter((item) => !["curso", "kit"].includes(item.type))
      .reduce((sum, item) => sum + item.subtotal, 0),
    courseSubtotal = priced
      .filter((item) => item.type === "curso")
      .reduce((sum, item) => sum + item.subtotal, 0),
    kitSubtotal = priced
      .filter((item) => item.type === "kit")
      .reduce((sum, item) => sum + item.subtotal, 0),
    shipping =
      hasPhysical && method?.kind === "lima_delivery" && quote?.available
        ? quote.fee_cents / 100
        : 0,
    total = subtotal + shipping;
  function update(key: string, value: any) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result: any = await createFn({
        data: {
          checkout_key: checkoutKey,
          items: cart.map((item) => ({
            product_id: item.productId,
            presentation_id: item.presentationId,
            quantity: item.quantity,
          })),
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          document_type: form.document_type,
          document_number: form.document_number,
          receipt_type: form.receipt_type,
          billing_ruc: form.billing_ruc,
          billing_legal_name: form.billing_legal_name,
          billing_fiscal_address: form.billing_fiscal_address,
          delivery_method_id: form.delivery_method_id,
          delivery_zone_district_id: form.delivery_zone_district_id || null,
          shipping_address:
            method?.kind === "lima_delivery"
              ? {
                  address_line: form.address_line,
                  department: form.department,
                  province: form.province,
                  district: form.district,
                  reference: form.reference,
                  recipient_name: form.recipient_name || `${form.first_name} ${form.last_name}`,
                  phone: form.recipient_phone || form.phone,
                  additional_instructions: form.additional_instructions,
                }
              : undefined,
          terms_accepted: true,
          privacy_accepted: true,
        },
      });
      if (!result.access_token) throw new Error("No se pudo recuperar el acceso seguro al pedido.");
      sessionStorage.setItem(`makrana:order:${result.code}`, result.access_token);
      navigate({ to: "/checkout/pago", search: { code: result.code, token: result.access_token } });
    } catch (reason: any) {
      setError(reason.message ?? "No se pudo crear el pedido.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="bg-cream/45 px-4 py-10">
      <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.24em] text-brand-terracotta">
              Compra segura
            </p>
            <h1 className="mt-2 font-display text-4xl">Checkout</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>1. Tus datos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombres">
                <Input
                  required
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                />
              </Field>
              <Field label="Apellidos">
                <Input
                  required
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                />
              </Field>
              <Field label="Correo">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="Tipo de documento">
                <Input
                  value={form.document_type}
                  onChange={(e) => update("document_type", e.target.value)}
                />
              </Field>
              <Field label="Número">
                <Input
                  value={form.document_number}
                  onChange={(e) => update("document_number", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Comprobante</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={form.receipt_type}
                onValueChange={(value) => update("receipt_type", value)}
                className="flex gap-6"
              >
                <Choice value="receipt" label="Boleta" />
                <Choice value="invoice" label="Factura" />
              </RadioGroup>
              {form.receipt_type === "invoice" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="RUC">
                    <Input
                      required
                      pattern="[0-9]{11}"
                      value={form.billing_ruc}
                      onChange={(e) => update("billing_ruc", e.target.value)}
                    />
                  </Field>
                  <Field label="Razón social">
                    <Input
                      required
                      value={form.billing_legal_name}
                      onChange={(e) => update("billing_legal_name", e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Domicilio fiscal">
                      <Input
                        required
                        value={form.billing_fiscal_address}
                        onChange={(e) => update("billing_fiscal_address", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasPhysical && (
                <p className="rounded-lg bg-muted p-3 text-sm">
                  Entrega digital · sin dirección ni tarifa.
                </p>
              )}
              {hasPhysical && (
                <RadioGroup
                  value={form.delivery_method_id}
                  onValueChange={(value) => update("delivery_method_id", value)}
                  className="grid gap-3"
                >
                  {config?.methods?.map((item: any) => (
                    <Choice
                      key={item.id}
                      value={item.id}
                      label={item.kind === "pickup" ? `${item.name} · S/ 0.00` : item.name}
                    />
                  ))}
                </RadioGroup>
              )}
              {hasPhysical && method?.kind === "lima_delivery" && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-sm text-muted-foreground">
                    El envío se coordinará contigo por WhatsApp después de confirmar tu compra. Las
                    tarifas comienzan desde S/10 y varían según la zona.
                  </p>
                  <div className="sm:col-span-2">
                    <Field label="Dirección">
                      <Input
                        required
                        value={form.address_line}
                        onChange={(e) => update("address_line", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Distrito configurado">
                    <Select
                      value={form.delivery_zone_district_id}
                      onValueChange={async (districtId) => {
                        update("delivery_zone_district_id", districtId);
                        const nextQuote = await quoteFn({ data: { district_id: districtId } });
                        setQuote(nextQuote);
                        if (nextQuote.available) update("district", nextQuote.district);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un distrito" />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.districts?.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.district} · {item.zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {!config?.districts?.length && (
                    <p className="text-sm text-destructive">
                      Zona no disponible; coordinar por WhatsApp.
                    </p>
                  )}
                  <Field label="Referencia">
                    <Input
                      value={form.reference}
                      onChange={(e) => update("reference", e.target.value)}
                    />
                  </Field>
                  <Field label="Persona que recibe">
                    <Input
                      value={form.recipient_name}
                      onChange={(e) => update("recipient_name", e.target.value)}
                    />
                  </Field>
                  <Field label="Teléfono con WhatsApp">
                    <Input
                      value={form.recipient_phone}
                      onChange={(e) => update("recipient_phone", e.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Indicaciones adicionales">
                      <Input
                        value={form.additional_instructions}
                        onChange={(e) => update("additional_instructions", e.target.value)}
                      />
                    </Field>
                  </div>
                  {quote && (
                    <p
                      className={`sm:col-span-2 text-sm ${quote.available ? "text-emerald-700" : "text-destructive"}`}
                    >
                      {quote.available
                        ? `${quote.zone_name}: S/ ${(quote.fee_cents / 100).toFixed(2)}`
                        : quote.message}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">{method?.instructions}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priced.map((item) => (
                <div
                  key={`${item.product_id}-${item.presentation_id ?? ""}`}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <span>S/ {item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t pt-4 text-sm">
              {productSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Productos</span>
                  <span>S/ {productSubtotal.toFixed(2)}</span>
                </div>
              )}
              {courseSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Cursos</span>
                  <span>S/ {courseSubtotal.toFixed(2)}</span>
                </div>
              )}
              {kitSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Kits</span>
                  <span>S/ {kitSubtotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Descuentos</span>
                <span>S/ 0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega</span>
                <span>S/ {shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>
            <label className="mt-5 flex gap-3 text-xs">
              <Checkbox
                required
                checked={form.terms_accepted}
                onCheckedChange={(value) => update("terms_accepted", value === true)}
              />
              Acepto los términos de compra.
            </label>
            <label className="mt-3 flex gap-3 text-xs">
              <Checkbox
                required
                checked={form.privacy_accepted}
                onCheckedChange={(value) => update("privacy_accepted", value === true)}
              />
              Acepto el tratamiento de mis datos.
            </label>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <Button
              className="mt-5 w-full"
              disabled={
                saving ||
                !form.terms_accepted ||
                !form.privacy_accepted ||
                !priced.length ||
                (hasPhysical && method?.kind === "lima_delivery" && !quote?.available)
              }
            >
              {saving ? "Creando pedido…" : "Crear pedido y continuar"}
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Los precios y el stock se validan nuevamente en el servidor.
            </p>
          </CardContent>
        </Card>
      </form>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Choice({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-sand bg-warm-white px-4 py-3">
      <RadioGroupItem value={value} />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
