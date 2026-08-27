import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminGetTaxSettings, adminSaveTaxSettings } from "@/lib/admin-tax.functions";
export const Route = createFileRoute("/_authenticated/admin/configuracion/tributaria")({
  component: Page,
});
function Page() {
  const get = useServerFn(adminGetTaxSettings),
    save = useServerFn(adminSaveTaxSettings);
  const [form, setForm] = useState<any>({
    ruc: "",
    legal_name: "",
    trade_name: "",
    fiscal_address: "",
    ubigeo: "",
    department: "",
    province: "",
    district: "",
    tax_regime: "",
    igv_rate: 18,
    prices_include_igv: null,
    tax_email: "",
    certificate_expires_at: "",
  });
  useEffect(() => {
    get().then((x) => x && setForm(x));
  }, [get]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const row = await save({ data: form });
      setForm({ ...form, ...row });
      toast.success("Configuración y series mock guardadas");
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  const fields = [
    ["ruc", "RUC"],
    ["legal_name", "Razón social"],
    ["trade_name", "Nombre comercial"],
    ["fiscal_address", "Dirección fiscal"],
    ["ubigeo", "Ubigeo"],
    ["department", "Departamento"],
    ["province", "Provincia"],
    ["district", "Distrito"],
    ["tax_regime", "Régimen tributario"],
    ["igv_rate", "IGV (%)"],
    ["tax_email", "Correo tributario"],
    ["certificate_expires_at", "Vencimiento del certificado"],
  ];
  const readiness = [
    ...fields.map(([key, label]) => ({ key, label, value: form[key] })),
    { key: "prices_include_igv", label: "Precios incluyen IGV", value: form.prices_include_igv },
    ...(form.series ?? []).map((series: any) => ({
      key: `series-${series.id}`,
      label: `Serie ${series.document_type}`,
      value: series.series,
    })),
  ];
  return (
    <div>
      <PageHeader
        title="Datos y conexión SUNAT"
        description="Datos del emisor. Certificado, Clave SOL y credenciales SIRE permanecen solo en servidor y aún no se conectan."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Ambiente", "MOCK"],
          ["Certificado", form.certificate_configured ? "Configurado" : "Pendiente"],
          ["SUNAT / SIRE", "Desactivado"],
        ].map(([a, b]) => (
          <div key={a} className="rounded-xl border border-sand bg-warm-white p-4">
            <div className="text-xs uppercase text-muted-foreground">{a}</div>
            <div className="mt-1 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              {b}
            </div>
          </div>
        ))}
      </div>
      <section className="mb-5 max-w-3xl rounded-xl border border-sand bg-warm-white p-5">
        <h2 className="font-semibold">Checklist de datos tributarios</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Completar no equivale a autorizar Beta. La validación del propietario y del contador sigue
          pendiente hasta registrarse expresamente.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {readiness.map((item: any) => {
            const saved = item.value !== null && item.value !== undefined && item.value !== "";
            const status =
              form.readiness_statuses?.[item.key] ?? (saved ? "registered" : "pending");
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-sand/70 px-3 py-2 text-sm"
              >
                <span>{item.label}</span>
                <select
                  aria-label={`Estado de ${item.label}`}
                  className="max-w-48 rounded-md border border-input bg-background px-2 py-1"
                  value={status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      readiness_statuses: {
                        ...(form.readiness_statuses ?? {}),
                        [item.key]: e.target.value,
                      },
                    })
                  }
                >
                  <option value="pending">Pendiente</option>
                  <option value="registered">Registrado</option>
                  <option value="owner_validated">Validado por propietario</option>
                  <option value="accountant_validated">Validado por contador</option>
                </select>
              </div>
            );
          })}
        </div>
      </section>
      <form
        onSubmit={submit}
        className="grid max-w-3xl gap-4 rounded-xl border border-sand bg-warm-white p-6 sm:grid-cols-2"
      >
        {fields.map(([key, label]) => (
          <div key={key} className={key === "fiscal_address" ? "sm:col-span-2" : ""}>
            <Label>{label}</Label>
            <Input
              type={
                key === "igv_rate"
                  ? "number"
                  : key === "tax_email"
                    ? "email"
                    : key === "certificate_expires_at"
                      ? "date"
                      : "text"
              }
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={["ruc", "legal_name", "fiscal_address"].includes(key)}
            />
          </div>
        ))}
        <div>
          <Label>¿Los precios incluyen IGV?</Label>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.prices_include_igv === null ? "" : String(form.prices_include_igv)}
            onChange={(e) =>
              setForm({
                ...form,
                prices_include_igv: e.target.value === "" ? null : e.target.value === "true",
              })
            }
          >
            <option value="">Pendiente de confirmar</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <Button className="sm:col-span-2">Guardar y preparar series mock</Button>
      </form>
    </div>
  );
}
